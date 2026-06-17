from fastapi import FastAPI, File, UploadFile, Form
import uvicorn
import cv2
import numpy as np
import easyocr
import re
import warnings
from ultralytics import YOLO

# Tắt cảnh báo màu đỏ (pin_memory) của PyTorch khi chạy bằng CPU
warnings.filterwarnings("ignore", category=UserWarning)

app = FastAPI()

print("Đang tải các mô hình AI vào bộ nhớ, vui lòng đợi vài giây...")

reader = easyocr.Reader(['en'], gpu=False)

try:
    yolo_model = YOLO('plate_model.pt') 
    print("AI đã sẵn sàng hoạt động!")
except Exception as e:
    print(f"LỖI: Không tìm thấy file model YOLO. {e}")


# ==========================================
# CÁC THUẬT TOÁN XỬ LÝ ẢNH CAO CẤP
# ==========================================

def adjust_gamma(image, gamma=1.0):
    """Bù sáng hoặc Cắt lóa sáng (Overexposure/Underexposure)"""
    invGamma = 1.0 / gamma
    table = np.array([((i / 255.0) ** invGamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
    return cv2.LUT(image, table)

def order_points(pts):
    """Sắp xếp 4 điểm tọa độ theo thứ tự: Trái-Trên, Phải-Trên, Phải-Dưới, Trái-Dưới"""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

def fix_perspective(img):
    """Thuật toán nắn phẳng biển số bị méo góc (Perspective Transform)"""
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edged = cv2.Canny(blurred, 30, 200) # Nhận diện cạnh
        
        # Tìm các khung viền bao quanh
        contours, _ = cv2.findContours(edged, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]
        
        plate_contour = None
        for c in contours:
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.04 * peri, True)
            if len(approx) == 4: # Nếu tìm thấy hình tứ giác
                plate_contour = approx
                break
                
        if plate_contour is not None:
            pts = plate_contour.reshape(4, 2)
            rect = order_points(pts)
            (tl, tr, br, bl) = rect
            
            # Tính toán chiều rộng, chiều cao tối đa của biển số mới
            widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
            widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
            maxWidth = max(int(widthA), int(widthB))
            
            heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
            heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
            maxHeight = max(int(heightA), int(heightB))
            
            # Bản đồ ma trận đích
            dst = np.array([
                [0, 0],
                [maxWidth - 1, 0],
                [maxWidth - 1, maxHeight - 1],
                [0, maxHeight - 1]], dtype="float32")
            
            # Nắn ảnh
            M = cv2.getPerspectiveTransform(rect, dst)
            warped = cv2.warpPerspective(img, M, (maxWidth, maxHeight))
            return warped
        return img # Trả về ảnh gốc nếu không tìm thấy rõ 4 góc
    except Exception:
        return img

def enhance_image_for_ocr(img):
    """
    Tiền xử lý ảnh Đa Lớp (Chống lóa, chống nhòe, chống nhiễu, nắn méo)
    """
    # 1. Nắn thẳng ảnh nếu bị chụp góc chéo
    warped_img = fix_perspective(img)
    
    # 2. Chuyển xám (Grayscale)
    gray = cv2.cvtColor(warped_img, cv2.COLOR_BGR2GRAY)
    
    # 3. Tự động khắc phục Lóa sáng đèn pha hoặc Thiếu sáng ban đêm
    mean_brightness = np.mean(gray)
    if mean_brightness < 80:  
        gray = adjust_gamma(gray, gamma=1.5) # Tối quá -> Tăng sáng
    elif mean_brightness > 180: 
        gray = adjust_gamma(gray, gamma=0.6) # Chói quá -> Giảm lóa
        
    # 4. Khử nhiễu hột (Do trời mưa, sương mù hoặc ISO camera cao)
    denoised = cv2.fastNlMeansDenoising(gray, None, h=10, templateWindowSize=7, searchWindowSize=21)
    
    # 5. Cân bằng tương phản cục bộ (CLAHE) -> Khắc phục bóng râm, bùn đất bám một phần
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    contrast = clahe.apply(denoised)
    
    # 6. Upscale (Phóng to chất lượng cao) để OCR đọc nét nhỏ tốt hơn
    resized = cv2.resize(contrast, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
    
    # 7. Unsharp Masking -> Sửa lỗi nhòe do xe chạy nhanh (Motion Blur)
    gaussian_blur = cv2.GaussianBlur(resized, (0, 0), 2.0)
    sharpened = cv2.addWeighted(resized, 1.5, gaussian_blur, -0.5, 0)
    
    return sharpened

# ==========================================
# CÁC HÀM POST-PROCESSING TỪ CŨ
# ==========================================

def sort_ocr_results(ocr_results):
    if not ocr_results: return []
    boxes = []
    for res in ocr_results:
        bbox, text, conf = res
        y_min = min([p[1] for p in bbox])
        x_min = min([p[0] for p in bbox])
        height = max([p[1] for p in bbox]) - y_min
        boxes.append({'y': y_min, 'x': x_min, 'h': height, 'text': text, 'conf': conf})

    boxes.sort(key=lambda b: b['y'])
    lines = []
    current_line = [boxes[0]]

    for b in boxes[1:]:
        if abs(b['y'] - current_line[-1]['y']) < current_line[-1]['h'] * 0.5:
            current_line.append(b)
        else:
            lines.append(current_line)
            current_line = [b]
    lines.append(current_line)

    sorted_texts = []
    for line in lines:
        line.sort(key=lambda b: b['x'])
        for b in line:
            sorted_texts.append((b['text'], b['conf']))
            
    return sorted_texts

def process_and_format_plate(raw_text, vehicle_type):
    raw_text = str(raw_text).upper().replace('O', '0').replace('Q', '0').replace('I', '1')
    cleaned = re.sub(r'[^A-Z0-9]', '', raw_text)
    if len(cleaned) < 5: return cleaned

    chars = list(cleaned)
    for i in range(min(2, len(chars))):
        if chars[i] in {'D':'0','L':'1','S':'5','G':'6','B':'8','P':'9','A':'4','T':'7','Z':'2'}:
            chars[i] = {'D':'0','L':'1','S':'5','G':'6','B':'8','P':'9','A':'4','T':'7','Z':'2'}[chars[i]]

    if str(vehicle_type) == "2": # Logic định dạng biển số cho Ô tô
        if chars[2] in {'0':'D','1':'L','2':'Z','4':'A','5':'S','6':'G','7':'T','8':'B','9':'P'}:
            chars[2] = {'0':'D','1':'L','2':'Z','4':'A','5':'S','6':'G','7':'T','8':'B','9':'P'}[chars[2]]
        text_str = "".join(chars)
        match = re.search(r'^(\d{2})([A-Z]{1,2})(.*)$', text_str)
        if match:
            prov, seri, tail = match.group(1), match.group(2), match.group(3)
            tail_chars = list(tail)
            for i in range(len(tail_chars)):
                if tail_chars[i] in {'D':'0','L':'1','S':'5','G':'6','B':'8','P':'9','A':'4','T':'7','Z':'2'}:
                    tail_chars[i] = {'D':'0','L':'1','S':'5','G':'6','B':'8','P':'9','A':'4','T':'7','Z':'2'}[tail_chars[i]]
            nums = "".join(tail_chars)
            nums = re.sub(r'[^0-9]', '', nums) 
            if len(nums) > 5: nums = nums[:5] 
            
            if len(nums) == 5: return f"{prov}{seri}-{nums[:3]}.{nums[3:]}"
            elif len(nums) == 4: return f"{prov}{seri}-{nums}"
            else: return f"{prov}{seri}-{nums}"
        return text_str
    else:
        if chars[2] in {'0':'D','1':'L','2':'Z','4':'A','5':'S','6':'G','7':'T','8':'B','9':'P'}:
            chars[2] = {'0':'D','1':'L','2':'Z','4':'A','5':'S','6':'G','7':'T','8':'B','9':'P'}[chars[2]]
        text_str = "".join(chars)
        match = re.search(r'^(\d{2})([A-Z])([A-Z0-9])(.*)$', text_str)
        if match:
            prov, seri1, seri2, tail = match.group(1), match.group(2), match.group(3), match.group(4)
            tail_chars = list(tail)
            for i in range(len(tail_chars)):
                if tail_chars[i] in {'D':'0','L':'1','S':'5','G':'6','B':'8','P':'9','A':'4','T':'7','Z':'2'}:
                    tail_chars[i] = {'D':'0','L':'1','S':'5','G':'6','B':'8','P':'9','A':'4','T':'7','Z':'2'}[tail_chars[i]]
            nums = "".join(tail_chars)
            nums = re.sub(r'[^0-9]', '', nums)
            if len(nums) > 5: nums = nums[:5]
            if len(nums) == 5: return f"{prov}-{seri1}{seri2}-{nums[:3]}.{nums[3:]}"
            elif len(nums) == 4: return f"{prov}-{seri1}{seri2}-{nums}"
            else: return f"{prov}-{seri1}{seri2}-{nums}"
        return text_str

# ==========================================
# API ENDPOINT
# ==========================================

@app.get("/")
def read_root():
    return {"message": "Hệ thống AI nhận diện biển số VisionPark đang hoạt động bình thường!", "status": "Running"}

@app.post("/api/recognize-plate")
async def recognize_plate(
    image: UploadFile = File(...), 
    vehicleType: str = Form("1") 
):
    try:
        image_bytes = await image.read()
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        print(f"\n--- BẮT ĐẦU PHÂN TÍCH ẢNH (Loại xe: {'Ô tô' if str(vehicleType) == '2' else 'Xe máy'}) ---")
        
        results = yolo_model(img, verbose=False)
        boxes = results[0].boxes

        if len(boxes) == 0:
            return {"success": False, "error": "YOLO không tìm thấy khung biển số xe."}

        best_box = boxes[0] 
        x1, y1, x2, y2 = map(int, best_box.xyxy[0])

        pad_x = 6
        pad_y = 12 
        h, w = img.shape[:2]
        x1 = max(0, x1 - pad_x)
        y1 = max(0, y1 - pad_y)
        x2 = min(w, x2 + pad_x)
        y2 = min(h, y2 + pad_y)

        cropped_plate = img[y1:y2, x1:x2]

        # ÁP DỤNG HÀM TIỀN XỬ LÝ CHUYÊN SÂU MỚI
        enhanced_plate = enhance_image_for_ocr(cropped_plate)

        ai_results = reader.readtext(
            enhanced_plate,
            detail=1,
            paragraph=False,
            allowlist='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-.' 
        )

        if len(ai_results) == 0:
            return {"success": False, "error": "Đã cắt được biển số nhưng ảnh mờ/nhiễu, AI không đọc được."}

        sorted_results = sort_ocr_results(ai_results)

        detected_texts = []
        total_confidence = 0

        for text_line, conf in sorted_results:
            text_line = text_line.upper().replace("VIE", "").replace("VN", "").replace("HONDA", "").strip()

            if len(text_line) > 0 and conf > 0.1: 
                detected_texts.append(text_line)
                total_confidence += conf

        if not detected_texts:
            return {"success": False, "error": "Nhiễu quá lớn."}

        raw_text = "".join(detected_texts)
        avg_confidence = float(total_confidence / len(detected_texts))

        final_plate = process_and_format_plate(raw_text, vehicleType)

        print(f"-> KẾT QUẢ: {final_plate} | CONF: {avg_confidence:.2f}")

        return {
            "success": True,
            "plateNumber": final_plate,
            "confidence": avg_confidence,
            "raw_ai_output": raw_text
        }

    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
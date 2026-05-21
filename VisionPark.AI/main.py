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


def enhance_image_for_ocr(img):
    """Tiền xử lý ảnh đơn giản, mượt mà"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    resized = cv2.resize(gray, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_LINEAR)
    return resized

def sort_ocr_results(ocr_results):
    """Sắp xếp chữ thông minh dựa trên chiều cao thực tế của khối chữ"""
    if not ocr_results:
        return []

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
    """
    Thuật toán định dạng chuẩn biển số VN: Không bao giờ bị nhầm lẫn Sê-ri và Đuôi số.
    """
    # 1. Chuyển thành chữ in hoa và sửa lỗi OCR cơ bản
    raw_text = str(raw_text).upper().replace('O', '0').replace('Q', '0').replace('I', '1')
    
    # 2. Xóa mọi dấu câu rác (Kể cả dấu - và . do AI đọc được từ ảnh) để lấy chuỗi lõi
    cleaned = re.sub(r'[^A-Z0-9]', '', raw_text)
    if len(cleaned) < 5: 
        return cleaned

    chars = list(cleaned)

    # 3. Ép kiểu 2 ký tự đầu LUÔN LUÔN LÀ SỐ (Mã tỉnh)
    for i in range(min(2, len(chars))):
        if chars[i] in {'D':'0','L':'1','S':'5','G':'6','B':'8','P':'9','A':'4','T':'7','Z':'2'}:
            chars[i] = {'D':'0','L':'1','S':'5','G':'6','B':'8','P':'9','A':'4','T':'7','Z':'2'}[chars[i]]

    # ==========================================
    # LUẬT DÀNH CHO Ô TÔ (VehicleType == 1)
    # ==========================================
    if str(vehicle_type) == "1":
        # Ký tự thứ 3 LUÔN LÀ CHỮ (Sê-ri)
        if chars[2] in {'0':'D','1':'L','2':'Z','4':'A','5':'S','6':'G','7':'T','8':'B','9':'P'}:
            chars[2] = {'0':'D','1':'L','2':'Z','4':'A','5':'S','6':'G','7':'T','8':'B','9':'P'}[chars[2]]
            
        text_str = "".join(chars)
        
        # Cắt chuỗi thành 3 phần: [Mã tỉnh 2 số] + [Sê-ri 1-2 chữ] + [Đuôi số]
        match = re.search(r'^(\d{2})([A-Z]{1,2})(.*)$', text_str)
        if match:
            prov = match.group(1)
            seri = match.group(2)
            tail = match.group(3)
            
            # Ép phần đuôi bắt buộc phải là Số
            tail_chars = list(tail)
            for i in range(len(tail_chars)):
                if tail_chars[i] in {'D':'0','L':'1','S':'5','G':'6','B':'8','P':'9','A':'4','T':'7','Z':'2'}:
                    tail_chars[i] = {'D':'0','L':'1','S':'5','G':'6','B':'8','P':'9','A':'4','T':'7','Z':'2'}[tail_chars[i]]
            
            nums = "".join(tail_chars)
            nums = re.sub(r'[^0-9]', '', nums) # Xóa sạch chữ lọt vào phần số
            
            if len(nums) > 5: nums = nums[:5] # Cắt dư nếu có ốc vít
            
            if len(nums) == 5: return f"{prov}{seri}-{nums[:3]}.{nums[3:]}"
            elif len(nums) == 4: return f"{prov}{seri}-{nums}"
            else: return f"{prov}{seri}-{nums}"
        return text_str

    # ==========================================
    # LUẬT DÀNH CHO XE MÁY (VehicleType == 2)
    # ==========================================
    else:
        # Ký tự thứ 3 LUÔN LÀ CHỮ (Sê-ri)
        if chars[2] in {'0':'D','1':'L','2':'Z','4':'A','5':'S','6':'G','7':'T','8':'B','9':'P'}:
            chars[2] = {'0':'D','1':'L','2':'Z','4':'A','5':'S','6':'G','7':'T','8':'B','9':'P'}[chars[2]]
            
        text_str = "".join(chars)
        
        # Cắt chuỗi: [Mã tỉnh 2 số] + [Sê-ri chữ] + [Ký tự 2 của Sê-ri] + [Đuôi số]
        match = re.search(r'^(\d{2})([A-Z])([A-Z0-9])(.*)$', text_str)
        if match:
            prov = match.group(1)
            seri1 = match.group(2)
            seri2 = match.group(3)
            tail = match.group(4)
            
            # Ép phần đuôi bắt buộc phải là Số
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

@app.post("/api/recognize-plate")
async def recognize_plate(
    image: UploadFile = File(...), 
    vehicleType: str = Form("1") 
):
    try:
        image_bytes = await image.read()
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        print(f"\n--- BẮT ĐẦU PHÂN TÍCH ẢNH (Loại xe: {'Ô tô' if str(vehicleType) == '1' else 'Xe máy'}) ---")
        
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

        enhanced_plate = enhance_image_for_ocr(cropped_plate)

        # FIX QUAN TRỌNG: Trả lại dấu (-) và (.) vào allowlist để AI không sinh ảo giác
        ai_results = reader.readtext(
            enhanced_plate,
            detail=1,
            paragraph=False,
            allowlist='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-.' 
        )

        if len(ai_results) == 0:
            return {"success": False, "error": "Đã cắt được biển số nhưng ảnh mờ, AI không đọc được."}

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
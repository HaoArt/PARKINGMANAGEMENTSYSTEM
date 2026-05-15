from fastapi import FastAPI, File, UploadFile
import uvicorn
import cv2
import numpy as np
import easyocr
import re
from ultralytics import YOLO

app = FastAPI()

print("Đang tải các mô hình AI vào bộ nhớ, vui lòng đợi vài giây...")

reader = easyocr.Reader(['en'], gpu=False)


try:
    yolo_model = YOLO('plate_model.pt') 
    print("AI đã sẵn sàng hoạt động!")
except Exception as e:
    print(f"LỖI: Không tìm thấy file model YOLO. {e}")


import re

def clean_plate_text(raw_text):
    # Bước 1: Xóa mọi dấu câu rác, khoảng trắng. Chỉ giữ lại Chữ và Số
    clean_text = re.sub(r'[^A-Z0-9]', '', str(raw_text).upper())
    
    # Bước 2: Chặn lỗi nhầm ốc vít thành số 1 (Cắt đuôi nếu vượt 9 ký tự)
    if len(clean_text) > 9:
        clean_text = clean_text[:9]
        
    # Bước 3: Tự động bóc tách thành phần để nhận biết Ô tô hay Xe máy
    # Nhóm 1: Mã tỉnh (2 số)
    # Nhóm 2: Sê-ri (Chữ cái kèm số hoặc 2 chữ cái)
    # Nhóm 3: Đuôi số (4 hoặc 5 số)
    match = re.match(r'^(\d{2})([A-Z]+[0-9]?)(\d{4,5})$', clean_text)
    
    if match:
        province = match.group(1) # VD: '75'
        series = match.group(2)   # VD: 'A', 'B1', 'LD'
        tail = match.group(3)     # VD: '12345', '2588'
        
        # --- Format phần Đuôi ---
        if len(tail) == 5:
            tail_formatted = f"{tail[:3]}.{tail[3:]}" # 5 số thì chèn dấu chấm
        else:
            tail_formatted = tail # 4 số cũ thì viết liền
            
        # --- Format phần Đầu ---
        # Ô tô thường có Sê-ri 1 chữ cái (A, B, C...) hoặc mã đặc biệt (LD, KT, R...)
        if len(series) == 1 or series in ['LD', 'KT', 'DA', 'R', 'RM', 'MK']:
            prefix = f"{province}{series}"   # Chuẩn ô tô: 75A
        else:
            prefix = f"{province}-{series}"  # Chuẩn xe máy: 75-B1
            
        # Ghép lại hoàn chỉnh
        return f"{prefix}-{tail_formatted}"
        
    # Nếu AI đọc thiếu nét quá nặng không ra form biển số, thì trả về chuỗi liền
    return clean_text

def enhance_image_for_ocr(img):
    """Tiền xử lý ảnh chuyên sâu để EasyOCR đọc chính xác hơn"""
    # 1. Chuyển sang ảnh xám
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 2. Phóng to ảnh gấp 2 lần bằng nội suy (Cubic) giúp chữ rõ nét hơn
    gray = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    
    # 3. CLAHE: Cân bằng độ tương phản cục bộ (Cực kỳ hiệu quả cho biển số bị chói/tối)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    gray = clahe.apply(gray)
    
    # 4. Bilateral Filter: Khử nhiễu nhưng vẫn giữ được độ sắc nét của viền chữ
    gray = cv2.bilateralFilter(gray, 11, 17, 17)
    
    return gray

def sort_ocr_results(ocr_results):
    """Sắp xếp chữ theo tọa độ: Dòng trên đọc trước, từ trái qua phải (Chuẩn xe máy VN)"""
    boxes = []
    for res in ocr_results:
        bbox, text, conf = res
        # Tính tọa độ tâm Y và tâm X của từng khối chữ
        cy = sum([p[1] for p in bbox]) / 4
        cx = sum([p[0] for p in bbox]) / 4
        boxes.append((cy, cx, text, conf))
    
    # Nhóm các chữ trên cùng 1 dòng (sai số Y khoảng 15 pixel) rồi sắp xếp theo X
    boxes.sort(key=lambda b: (b[0] // 15, b[1]))
    return boxes

def clean_vietnam_plate(text):
    """Ép luật Biển số Việt Nam cực mạnh để chống đọc sai số/chữ"""
    cleaned = re.sub(r'[^A-Z0-9]', '', text.upper())
    
    # Sửa lỗi kinh điển của AI
    cleaned = cleaned.replace('I', '1').replace('Z', '2').replace('O', '0').replace('Q', '0')

    if len(cleaned) >= 7:
        chars = list(cleaned)
        
        # Từ điển ép kiểu
        char_to_num = {'D':'0', 'L':'1', 'S':'5', 'G':'6', 'B':'8', 'P':'9', 'A':'4', 'T':'7'}
        num_to_char = {'1':'L', '0':'D', '5':'S', '6':'G', '8':'B', '9':'P', '4':'A', '2':'Z', '7':'T'}

        # Vị trí 0, 1 BẮT BUỘC LÀ SỐ (Mã tỉnh)
        for i in range(2):
            if chars[i] in char_to_num: chars[i] = char_to_num[chars[i]]

        # Vị trí 2 BẮT BUỘC LÀ CHỮ (Seri đăng ký)
        if chars[2] in num_to_char: chars[2] = num_to_char[chars[2]]

        # Vị trí 4 trở đi BẮT BUỘC LÀ SỐ (Đuôi biển số)
        for i in range(4, len(chars)):
            if chars[i] in char_to_num: chars[i] = char_to_num[chars[i]]

        cleaned = "".join(chars)
    return cleaned

def format_plate(text):
    text = text.replace("-", "").replace(".", "")
    # Form xe máy: 75F1-123.45 hoặc 75F1-1234
    match_moto = re.match(r'^(\d{2})([A-Z])([A-Z0-9])(\d{4,5})$', text)
    if match_moto:
        tail = match_moto.group(4)
        if len(tail) == 5:
            return f"{match_moto.group(1)}-{match_moto.group(2)}{match_moto.group(3)}-{tail[:3]}.{tail[3:]}"
        else:
            return f"{match_moto.group(1)}-{match_moto.group(2)}{match_moto.group(3)}-{tail}"

    # Form ô tô: 75A-123.45
    match_car = re.match(r'^(\d{2})([A-Z])(\d{3})(\d{2})$', text)
    if match_car:
        return f"{match_car.group(1)}{match_car.group(2)}-{match_car.group(3)}.{match_car.group(4)}"
    
    return text

# ==========================================
# API ENDPOINT
# ==========================================

@app.post("/api/recognize-plate")
async def recognize_plate(image: UploadFile = File(...)):
    try:
        image_bytes = await image.read()
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        print("\n--- BẮT ĐẦU PHÂN TÍCH ẢNH ---")
        
        # 1. YOLO Dò tìm biển số
        results = yolo_model(img, verbose=False)
        boxes = results[0].boxes

        if len(boxes) == 0:
            return {"success": False, "error": "YOLO không tìm thấy khung biển số xe."}

        # Lấy biển số có độ tin cậy cao nhất
        best_box = boxes[0] 
        x1, y1, x2, y2 = map(int, best_box.xyxy[0])

        # Padding (Mở rộng vùng cắt để không lẹm chữ)
        padding = 8
        h, w = img.shape[:2]
        x1 = max(0, x1 - padding)
        y1 = max(0, y1 - padding)
        x2 = min(w, x2 + padding)
        y2 = min(h, y2 + padding)

        cropped_plate = img[y1:y2, x1:x2]

        # 2. Nâng cấp ảnh (Siêu nét) trước khi cho OCR đọc
        enhanced_plate = enhance_image_for_ocr(cropped_plate)

        # 3. EasyOCR đọc chữ
        ai_results = reader.readtext(
            enhanced_plate,
            detail=1,
            paragraph=False, # Tắt paragraph để tự sắp xếp thủ công chuẩn hơn
            allowlist='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-.'
        )

        if len(ai_results) == 0:
            return {"success": False, "error": "Đã cắt được biển số nhưng ảnh mờ, AI không đọc được."}

        # 4. Sắp xếp lại tọa độ chữ (Fix lỗi đọc ngược dòng)
        sorted_results = sort_ocr_results(ai_results)

        detected_texts = []
        total_confidence = 0

        for res in sorted_results:
            cy, cx, text_line, conf = res
            text_line = text_line.upper().replace("VIE", "").replace("VN", "").replace("HONDA", "").strip()

            if len(text_line) > 0 and conf > 0.1: 
                detected_texts.append(text_line)
                total_confidence += conf

        if not detected_texts:
            return {"success": False, "error": "Nhiễu quá lớn."}

        # Nối chuỗi đã sắp xếp
        raw_text = "".join(detected_texts)
        avg_confidence = float(total_confidence / len(detected_texts))

        # 5. Ép luật Biển số VN
        final_plate = clean_vietnam_plate(raw_text) 
        final_plate = format_plate(final_plate)     
        final_plate = clean_plate_text(final_plate)

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
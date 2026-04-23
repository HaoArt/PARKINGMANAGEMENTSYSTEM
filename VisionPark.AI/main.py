from fastapi import FastAPI, File, UploadFile
import uvicorn
import cv2
import numpy as np
import easyocr
import re

app = FastAPI()

print("Đang tải mô hình AI vào bộ nhớ, vui lòng đợi vài giây...")
reader = easyocr.Reader(['en'], gpu=False)
print("AI đã sẵn sàng hoạt động!")


def clean_vietnam_plate(text):
    cleaned = re.sub(r'[^A-Z0-9]', '', text.upper())

    # 2. Thay thế I và Z
    cleaned = cleaned.replace('I', '1').replace('Z', '2')

    # Biển số VN (cả xe máy và ô tô) khi gộp lại thường có từ 7-9 ký tự
    if len(cleaned) >= 7:
        chars = list(cleaned)

        char_to_num = {'O':'0', 'D':'0', 'Q':'0', 'L':'1', 'S':'5', 'G':'6', 'B':'8', 'P':'9'}
        num_to_char = {'1':'L', '0':'D', '5':'S', '6':'G', '8':'B', '9':'P', '4':'A', '2':'Z'}

        # Vị trí 0 và 1 BẮT BUỘC là số (Mã tỉnh)
        for i in range(2):
            if chars[i] in char_to_num: 
                chars[i] = char_to_num[chars[i]]

        # Vị trí 2 BẮT BUỘC là chữ (Seri đăng ký)
        if chars[2] in num_to_char: 
            chars[2] = num_to_char[chars[2]]

        # Từ vị trí thứ 4 trở đi (đuôi biển số) BẮT BUỘC phải là số 
        # (Giúp chống lỗi AI đọc số 8 thành chữ B, số 5 thành chữ S ở đuôi biển)
        for i in range(4, len(chars)):
            if chars[i] in char_to_num: 
                chars[i] = char_to_num[chars[i]]

        cleaned = "".join(chars)

    return cleaned
def extract_plate(text):
    pattern = r'(\d{2}-[A-Z]-\d{3}\.\d{2})|(\d{2}-[A-Z][A-Z0-9]-\d{5})'
    match = re.search(pattern, text)
    return match.group() if match else text
def format_plate(text):
    text = text.replace("-", "").replace(".", "")
    match_moto = re.match(r'^(\d{2})([A-Z])([A-Z0-9])(\d{4,5})$', text)
    if match_moto:
        tail = match_moto.group(4)
        if len(tail) == 5:
            # Biển 5 số (59V254411 -> 59-V2-544.11)
            return f"{match_moto.group(1)}-{match_moto.group(2)}{match_moto.group(3)}-{tail[:3]}.{tail[3:]}"
        else:
            # Biển 4 số đời tống (59V25441 -> 59-V2-5441)
            return f"{match_moto.group(1)}-{match_moto.group(2)}{match_moto.group(3)}-{tail}"

    match_car = re.match(r'^(\d{2})([A-Z])(\d{3})(\d{2})$', text)
    if match_car:
        # Ô tô (30G53507 -> 30-G-535.07)
        return f"{match_car.group(1)}-{match_car.group(2)}-{match_car.group(3)}.{match_car.group(4)}"

    return text
@app.post("/api/recognize-plate")
async def recognize_plate(image: UploadFile = File(...)):
    try:
        image_bytes = await image.read()
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # KHÔNG DÙNG THRESHOLD NỮA. EasyOCR đọc ảnh màu hoặc xám chuẩn xác hơn rất nhiều.
        # Chỉ chuyển sang ảnh xám để model chạy nhanh hơn một chút.
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        ai_results = reader.readtext(
            gray,  # <--- Truyền ảnh xám hoặc ảnh gốc vào đây
            detail=1,
            mag_ratio=2.0,
            allowlist='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-.'
        )

        if len(ai_results) == 0:
            return {"success": False, "error": "Không tìm thấy chữ nào trong ảnh."}

        detected_texts = []
        total_confidence = 0

        print("\n--- BẮT ĐẦU ĐỌC ẢNH ---")

        for res in ai_results:
            text_line = res[1].upper()
            conf = res[2]

            print(f"-> '{text_line}' | conf: {conf:.2f}")

            # Loại bỏ chữ rác
            text_line = text_line.replace("VIE", "").replace("VN", "").replace("HONDA", "").strip()

            if len(text_line) > 0 and conf > 0.1: # Có thể cân nhắc tăng conf > 0.3 nếu muốn chặt chẽ hơn
                detected_texts.append(text_line)
                total_confidence += conf

        if not detected_texts:
            return {"success": False, "error": "Ảnh quá nhiễu hoặc mờ."}

        # Nối tất cả các dòng AI đọc được lại với nhau
        raw_text = "".join(detected_texts)
        avg_confidence = float(total_confidence / len(detected_texts))


        # Bước 1: Làm sạch và ép kiểu theo vị trí (đã gỡ bỏ gạch ngang)
        final_plate = clean_vietnam_plate(raw_text) 
        
        # Bước 2: Nhét lại dấu gạch ngang và dấu chấm cho chuẩn form VN
        final_plate = format_plate(final_plate)     

        print(f"KẾT QUẢ: {final_plate} | CONF: {avg_confidence:.2f}")

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
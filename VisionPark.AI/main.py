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
    # 1. Loại bỏ rác
    cleaned = re.sub(r'[^A-Z0-9\-\.]', '', text.upper())

    # 2. LUẬT TOÀN CỤC: Trị dứt điểm các chữ CẤM trong biển số VN
    # Vì biển VN không dùng I và Z, nên hễ thấy I là 1, thấy Z là 2.
    cleaned = cleaned.replace('I', '1').replace('Z', '2')

    parts = cleaned.split('-')
    if len(parts) > 0:
        head = parts[0]
        head_chars = list(head)  

        if len(head) in [3, 4]:
            char_to_num = {'O':'0', 'D':'0', 'Q':'0', 'L':'1', 'S':'5', 'G':'6', 'B':'8', 'P':'9'}
            if head_chars[0] in char_to_num: head_chars[0] = char_to_num[head_chars[0]]
            if head_chars[1] in char_to_num: head_chars[1] = char_to_num[head_chars[1]]

            num_to_char = {'1':'L', '0':'D', '5':'S', '6':'G', '8':'B', '9':'P', '4':'A'}
            if len(head_chars) >= 3 and head_chars[2] in num_to_char:
                head_chars[2] = num_to_char[head_chars[2]]

        parts[0] = "".join(head_chars)
        cleaned = "-".join(parts)

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
        # Đọc ảnh
        image_bytes = await image.read()
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.convertScaleAbs(gray, alpha=1.5, beta=0)

        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        thresh = cv2.threshold(
            blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
        )[1]

        ai_results = reader.readtext(
            thresh,
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

            # Loại bỏ chữ không cần
            text_line = text_line.replace("VIE", "").replace("VN", "").replace("HONDA", "").strip()

            # GIỮ dấu - .
            text_line = re.sub(r'[^A-Z0-9\-\.]', '', text_line)

            if len(text_line) > 0 and conf > 0.1:
                detected_texts.append(text_line)
                total_confidence += conf

        print("TEXT GIỮ LẠI:", detected_texts)

        if not detected_texts:
            return {"success": False, "error": "Ảnh quá nhiễu hoặc mờ."}

        raw_text = "-".join(detected_texts)
        avg_confidence = float(total_confidence / len(detected_texts))

        # ============================
        # POST PROCESS
        # ============================
        final_plate = clean_vietnam_plate(raw_text)
        final_plate = format_plate(final_plate)
        final_plate = extract_plate(final_plate)

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
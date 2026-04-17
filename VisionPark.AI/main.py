from fastapi import FastAPI, File, UploadFile
import uvicorn

app = FastAPI()

@app.post("/api/recognize-plate")
async def recognize_plate(image: UploadFile = File(...)):
    try:
        # 1. Đọc dữ liệu ảnh gửi từ C# sang
        image_bytes = await image.read()
        
        # ---------------------------------------------------------
        # CHỖ NÀY DÀNH CHO AI CỦA BẠN (TƯƠNG LAI)
        # - Đưa image_bytes vào OpenCV / YOLOv8 để tìm vị trí biển số.
        # - Đưa vùng cắt được vào EasyOCR để đọc ra chữ.
        # ---------------------------------------------------------
        
        # TẠM THỜI MOCK (GIẢ LẬP) KẾT QUẢ ĐỂ TEST LUỒNG C#
        ai_result = "59X1-12345" 
        confidence_score = 0.98

        # 2. Trả kết quả về cho C#
        return {
            "success": True,
            "plateNumber": ai_result,
            "confidence": confidence_score
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# Lệnh để chạy Server ở port 8000
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
﻿﻿﻿using Microsoft.AspNetCore.Mvc;
using OpenCvSharp;
using System;
using System.Linq;
using VisionPark.API.Data;
using VisionPark.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

namespace VisionPark.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FaceScanController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public FaceScanController(ApplicationDbContext context)
        {
            _context = context;
        }

        public class ImageData
        {
            public string? Base64Image { get; set; }
        }

        public class RegisterFaceRequest
        {
            [System.ComponentModel.DataAnnotations.Required]
            public int UserId { get; set; }
            [System.ComponentModel.DataAnnotations.Required]
            public string Base64Image { get; set; }
        }

        [HttpPost("detect")]
        public IActionResult DetectFace([FromBody] ImageData data)
        {
            try
            {
                if (string.IsNullOrEmpty(data.Base64Image))
                {
                    return BadRequest("Dữ liệu ảnh (Base64) không được để trống.");
                }

                var base64Data = data.Base64Image.Substring(data.Base64Image.IndexOf(",") + 1);
                byte[] imageBytes = Convert.FromBase64String(base64Data);

                using var mat = Cv2.ImDecode(imageBytes, ImreadModes.Color);
                if (mat.Empty()) return BadRequest("Không thể đọc ảnh.");

                // Đảm bảo đường dẫn này trỏ tới đúng file XML đã copy
                string cascadePath = "Models/haarcascade_frontalface_default.xml";
                using var cascade = new CascadeClassifier(cascadePath);

                using var grayMat = new Mat();
                Cv2.CvtColor(mat, grayMat, ColorConversionCodes.BGR2GRAY);
                Cv2.EqualizeHist(grayMat, grayMat);

                Rect[] faces = cascade.DetectMultiScale(
                     image: grayMat,
                     scaleFactor: 1.1,
                     minNeighbors: 5,
                     flags: HaarDetectionTypes.ScaleImage,
                     minSize: new Size(30, 30)
                 );

                if (faces.Length > 0)
                {
                    foreach (var rect in faces)
                    {
                        // Vẽ hình chữ nhật màu đỏ
                        mat.Rectangle(rect, Scalar.Red, 2);
                    }

                    // Chuyển ảnh đã vẽ khung thành Base64
                    byte[] finalImageBytes = mat.ToBytes(".jpg");
                    string base64WithBox = "data:image/jpeg;base64," + Convert.ToBase64String(finalImageBytes);

                    var record = new FaceRecord
                    {
                        ImageData = base64WithBox, // Lưu ảnh ĐÃ CÓ KHUNG vào DB
                        FaceCount = faces.Length,
                        ScanTime = DateTime.Now
                    };
                    _context.FaceRecords.Add(record);
                    _context.SaveChanges();

                    // Trả về ảnh đã vẽ khung để UI có thể hiển thị ngay lập tức
                    return Ok(new { 
                        FaceCount = faces.Length, 
                        ImageWithBox = base64WithBox 
                    });
                }

                return Ok(new { FaceCount = faces.Length, ImageWithBox = (string?)null });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi server: {ex.Message}");
            }
        }

        [HttpPost("register")]
        public async Task<IActionResult> RegisterFace([FromBody] RegisterFaceRequest request)
        {
            try
            {
                var user = await _context.Users.FindAsync(request.UserId);
                if (user == null)
                {
                    return NotFound(new { message = "Không tìm thấy người dùng với ID này." });
                }

                var base64Data = request.Base64Image.Substring(request.Base64Image.IndexOf(",") + 1);
                byte[] imageBytes = Convert.FromBase64String(base64Data);
                using var mat = Cv2.ImDecode(imageBytes, ImreadModes.Color);
                if (mat.Empty()) return BadRequest("Dữ liệu ảnh không hợp lệ.");

                // Dùng detection để đảm bảo có đúng 1 khuôn mặt trong ảnh
                string cascadePath = "Models/haarcascade_frontalface_default.xml";
                using var cascade = new CascadeClassifier(cascadePath);
                using var grayMat = new Mat();
                Cv2.CvtColor(mat, grayMat, ColorConversionCodes.BGR2GRAY);
                Rect[] faces = cascade.DetectMultiScale(grayMat, 1.1, 5, HaarDetectionTypes.ScaleImage, new Size(80, 80));

                if (faces.Length == 0)
                {
                    return BadRequest(new { message = "Không tìm thấy khuôn mặt nào trong ảnh. Vui lòng chụp lại." });
                }
                if (faces.Length > 1)
                {
                    return BadRequest(new { message = "Phát hiện nhiều hơn 1 khuôn mặt. Vui lòng chỉ chụp một người." });
                }

                // Lưu ảnh vào cột FaceImageUrl của User
                user.FaceImageUrl = request.Base64Image;
                await _context.SaveChangesAsync();

                return Ok(new { message = $"Đã đăng ký khuôn mặt thành công cho {user.FullName}." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi server: {ex.Message}");
            }
        }

        [HttpPost("recognize")]
        public async Task<IActionResult> RecognizeFace([FromBody] ImageData data)
        {
            // CẢNH BÁO: Đây là phần NHẬN DIỆN GIẢ LẬP để minh họa luồng hoạt động.
            // Nhận diện ngoài đời thực yêu cầu thư viện AI chuyên dụng (vd: FaceNet, ArcFace)
            // để tạo vector đặc trưng và so sánh chúng.
            try
            {
                if (string.IsNullOrEmpty(data.Base64Image)) return BadRequest("Dữ liệu ảnh không được để trống.");

                var base64Data = data.Base64Image.Substring(data.Base64Image.IndexOf(",") + 1);
                byte[] imageBytes = Convert.FromBase64String(base64Data);
                using var mat = Cv2.ImDecode(imageBytes, ImreadModes.Color);
                if (mat.Empty()) return BadRequest("Không thể đọc ảnh.");

                string cascadePath = "Models/haarcascade_frontalface_default.xml";
                using var cascade = new CascadeClassifier(cascadePath);
                using var grayMat = new Mat();
                Cv2.CvtColor(mat, grayMat, ColorConversionCodes.BGR2GRAY);
                Rect[] faces = cascade.DetectMultiScale(grayMat, 1.1, 5, HaarDetectionTypes.ScaleImage, new Size(30, 30));

                if (faces.Length > 0)
                {
                    // --- LOGIC NHẬN DIỆN GIẢ LẬP ---
                    // Lấy ngẫu nhiên người dùng đầu tiên đã đăng ký khuôn mặt để giả lập là "tìm thấy".
                    var recognizedUser = await _context.Users
                        .Where(u => u.FaceImageUrl != null)
                        .Select(u => new { u.UserID, u.FullName, u.Role, u.FaceImageUrl })
                        .FirstOrDefaultAsync();

                    if (recognizedUser != null)
                        return Ok(new { success = true, message = "Nhận diện thành công!", user = recognizedUser });
                }
                return Ok(new { success = false, message = "Không nhận diện được." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi server: {ex.Message}");
            }
        }

        [HttpPost("detect-live")]
        public IActionResult DetectFaceLive([FromBody] ImageData data)
        {
            try
            {
                var base64Data = data.Base64Image.Substring(data.Base64Image.IndexOf(",") + 1);
                byte[] imageBytes = Convert.FromBase64String(base64Data);

                using var mat = Cv2.ImDecode(imageBytes, ImreadModes.Color);
                if (mat.Empty()) return BadRequest("Không thể đọc ảnh.");

                string cascadePath = "Models/haarcascade_frontalface_default.xml";
                using var cascade = new CascadeClassifier(cascadePath);

                using var grayMat = new Mat();
                Cv2.CvtColor(mat, grayMat, ColorConversionCodes.BGR2GRAY);
                Cv2.EqualizeHist(grayMat, grayMat);

                Rect[] faces = cascade.DetectMultiScale(grayMat, 1.1, 5, HaarDetectionTypes.ScaleImage, new Size(30, 30));

                return Ok(new { FaceCount = faces.Length, Faces = faces });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi server: {ex.Message}");
            }
        }

        [HttpGet("history")]
        public IActionResult GetHistory()
        {
            var records = _context.FaceRecords
                                  .OrderByDescending(x => x.ScanTime)
                                  .ToList();
            return Ok(records);
        }
    }
}

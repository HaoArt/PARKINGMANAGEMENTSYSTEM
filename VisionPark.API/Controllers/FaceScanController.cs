using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc;
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
        private readonly IHttpClientFactory _httpClientFactory;

            // Tối ưu AI: Lưu instance tĩnh để nạp mô hình vào RAM 1 lần duy nhất (Singleton)
            private static FaceRecognitionDotNet.FaceRecognition _fr;
            private static readonly object _aiLock = new object();

        public FaceScanController(ApplicationDbContext context, IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
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

                if (string.IsNullOrEmpty(request.Base64Image)) return BadRequest(new { message = "Dữ liệu ảnh không được để trống." });

                var base64Data = request.Base64Image.Substring(request.Base64Image.IndexOf(",") + 1);
                byte[] imageBytes = Convert.FromBase64String(base64Data);

                // Khởi tạo AI nếu chưa có
                if (_fr == null)
                {
                    lock (_aiLock)
                    {
                        if (_fr == null) _fr = FaceRecognitionDotNet.FaceRecognition.Create("Models");
                    }
                }

                using var ms = new System.IO.MemoryStream(imageBytes);
                using var bmp = new System.Drawing.Bitmap(ms);
                using var img = FaceRecognitionDotNet.FaceRecognition.LoadImage(bmp);
                
                // Dùng chính Dlib để đếm số lượng khuôn mặt, đảm bảo tính nhất quán dữ liệu lúc recognize
                var faceLocations = _fr.FaceLocations(img).ToArray();

                if (faceLocations.Length == 0)
                {
                    return BadRequest(new { message = "Không tìm thấy khuôn mặt nào trong ảnh. Vui lòng chụp lại." });
                }
                if (faceLocations.Length > 1)
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

                var base64Data = data.Base64Image;
                if (base64Data.Contains(",")) base64Data = base64Data.Substring(base64Data.IndexOf(",") + 1);
                
                byte[] imageBytes = Convert.FromBase64String(base64Data);

                // --- NHẬN DIỆN KHUÔN MẶT TRỰC TIẾP BẰNG C# (.NET) ---
                int? recognizedUserId = null;
                try 
                {
                        var registeredUsers = await _context.Users
                            .Where(u => u.FaceImageUrl != null)
                            .Select(u => new { userId = u.UserID, image = u.FaceImageUrl })
                            .ToListAsync();

                        // Khởi tạo mô hình AI duy nhất 1 lần
                        if (_fr == null)
                        {
                            lock (_aiLock)
                            {
                                if (_fr == null) _fr = FaceRecognitionDotNet.FaceRecognition.Create("Models");
                            }
                        }

                        // Phân tích ảnh vừa quét
                        using var scanMs = new System.IO.MemoryStream(imageBytes);
                        using var scanBmp = new System.Drawing.Bitmap(scanMs);
                        using var scanImg = FaceRecognitionDotNet.FaceRecognition.LoadImage(scanBmp);
                        var scanEncodings = _fr.FaceEncodings(scanImg).ToArray();

                        if (scanEncodings.Length == 0)
                        {
                            return Ok(new { success = false, message = "Không tìm thấy khuôn mặt rõ nét trong ảnh vừa chụp." });
                        }

                        if (scanEncodings.Length > 0)
                        {
                            var scanEncoding = scanEncodings[0];
                            double minDistance = 0.5; // Ngưỡng khắt khe (0.4 - 0.5 là an toàn)
                            double closestDistance = 1.0; // Biến lưu lại sai số thấp nhất để xem trên UI

                            foreach (var user in registeredUsers)
                            {
                                try
                                {
                                    if (string.IsNullOrEmpty(user.image)) continue;
                                    
                                    var dbBase64 = user.image;
                                    if (dbBase64.Contains(",")) dbBase64 = dbBase64.Substring(dbBase64.IndexOf(",") + 1);
                                    
                                    byte[] dbImageBytes = Convert.FromBase64String(dbBase64);
                                    
                                    using var dbMs = new System.IO.MemoryStream(dbImageBytes);
                                    using var dbBmp = new System.Drawing.Bitmap(dbMs);
                                    using var dbImg = FaceRecognitionDotNet.FaceRecognition.LoadImage(dbBmp);
                                    var dbEncodings = _fr.FaceEncodings(dbImg).ToArray();

                                    if (dbEncodings.Length > 0)
                                    {
                                        // Tính tỷ lệ sai lệch giữa 2 khuôn mặt
                                        double distance = FaceRecognitionDotNet.FaceRecognition.FaceDistance(dbEncodings[0], scanEncoding);
                                        if (distance < closestDistance) closestDistance = distance;

                                        if (distance < minDistance)
                                        {
                                            minDistance = distance;
                                            recognizedUserId = user.userId;
                                        }
                                    }
                                }
                                catch (Exception)
                                {
                                    // Bỏ qua user này nếu dữ liệu Base64 trong Database bị hỏng (không thể tạo thành Bitmap)
                                    continue;
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        return Ok(new { success = false, message = "Lỗi xử lý AI C#: " + ex.Message });
                    }

                    if (recognizedUserId.HasValue)
                    {
                        var recognizedUser = await _context.Users
                            .Where(u => u.UserID == recognizedUserId.Value)
                            .Select(u => new { u.UserID, u.FullName, u.Role, u.FaceImageUrl })
                            .FirstOrDefaultAsync();
                            
                        if (recognizedUser != null)
                        {
                        // --- GHI NHẬN CHẤM CÔNG THẬT (REAL DATA INSERT) ---
                        var today = DateTime.Now.Date;
                        var existingAttendance = await _context.Attendances
                            .FirstOrDefaultAsync(a => a.UserId == recognizedUser.UserID && a.CheckInTime.Date == today);

                        if (existingAttendance == null)
                        {
                            // Check-in (Vào làm)
                            _context.Attendances.Add(new Attendance {
                                UserId = recognizedUser.UserID,
                                CheckInTime = DateTime.Now
                            });
                        }
                        else if (existingAttendance.CheckOutTime == null)
                        {
                            // Check-out (Tan làm)
                            existingAttendance.CheckOutTime = DateTime.Now;
                        }
                        
                        await _context.SaveChangesAsync();

                        return Ok(new { success = true, message = "Nhận diện thành công!", user = recognizedUser });
                        }
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
                if (string.IsNullOrEmpty(data.Base64Image)) return BadRequest(new { message = "Dữ liệu ảnh không được để trống." });

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
                Console.WriteLine($"[LỖI REGISTER]: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[CHI TIẾT LỖI]: {ex.InnerException.Message}");
                }
                return StatusCode(500, $"Lỗi server: {ex.Message} {(ex.InnerException != null ? "- " + ex.InnerException.Message : "")}");
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

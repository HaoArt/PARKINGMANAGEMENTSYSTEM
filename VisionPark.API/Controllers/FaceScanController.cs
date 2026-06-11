﻿using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpenCvSharp;
using Microsoft.AspNetCore.Hosting;
using System.IO;
using VisionPark.API.Data;
using VisionPark.API.Models;

namespace VisionPark.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FaceScanController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IWebHostEnvironment _env;

            // Tối ưu AI: Lưu instance tĩnh để nạp mô hình vào RAM 1 lần duy nhất (Singleton)
            private static FaceRecognitionDotNet.FaceRecognition _fr;
            private static readonly object _aiLock = new object();

        public FaceScanController(ApplicationDbContext context, IHttpClientFactory httpClientFactory, IWebHostEnvironment env)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _env = env;
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
                    string base64WithBox = "data:image/jpeg;base64," + Convert.ToBase64String(finalImageBytes); // Vẫn trả Base64 về cho UI hiển thị

                    // Lưu thành file vật lý
                    string webRootPath = _env.WebRootPath;
                    if (string.IsNullOrWhiteSpace(webRootPath))
                    {
                        webRootPath = Path.Combine(_env.ContentRootPath, "wwwroot");
                    }
                    string recordsFolder = Path.Combine(webRootPath, "images", "records");
                    if (!Directory.Exists(recordsFolder)) Directory.CreateDirectory(recordsFolder);
                    
                    string fileName = $"record_{DateTime.Now.Ticks}.jpg";
                    System.IO.File.WriteAllBytes(Path.Combine(recordsFolder, fileName), finalImageBytes);

                    var record = new FaceRecord
                    {
                        ImageData = $"/images/records/{fileName}", // CHỈ LƯU ĐƯỜNG DẪN URL VÀO DB
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

                var base64Data = request.Base64Image;
                if (base64Data.Contains(",")) base64Data = base64Data.Substring(base64Data.IndexOf(",") + 1);

                byte[] imageBytes = Convert.FromBase64String(base64Data);

                // Khởi tạo AI nếu chưa có
                string modelPath = Path.Combine(_env.ContentRootPath, "Models");
                if (_fr == null)
                {
                    if (!Directory.Exists(modelPath))
                    {
                        return StatusCode(500, new { message = "Thư mục Models của AI không tồn tại trên Server!" });
                    }
                    lock (_aiLock)
                    {
                        if (_fr == null) _fr = FaceRecognitionDotNet.FaceRecognition.Create(modelPath);
                    }
                }

                // --- TỐI ƯU HÓA: LƯU ẢNH THÀNH FILE VẬT LÝ TRÁNH PHÌNH DATABASE ---
                string webRootPath = _env.WebRootPath;
                if (string.IsNullOrWhiteSpace(webRootPath))
                {
                    webRootPath = Path.Combine(_env.ContentRootPath, "wwwroot");
                }

                string uploadsFolder = Path.Combine(webRootPath, "images", "faces");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                string fileName = $"user_{user.UserID}_{DateTime.Now.Ticks}.jpg";
                string filePath = Path.Combine(uploadsFolder, fileName);

                // 1. Lưu file xuống ổ cứng trước để dùng hàm LoadImageFile cực kỳ an toàn
                await System.IO.File.WriteAllBytesAsync(filePath, imageBytes);

                // 2. Load ảnh thẳng từ file vật lý (Tránh lỗi Crash Bitmap)
                using var img = FaceRecognitionDotNet.FaceRecognition.LoadImageFile(filePath);
                var faceLocations = _fr.FaceLocations(img).ToArray();

                if (faceLocations.Length != 1)
                {
                    // AI từ chối -> Xóa file rác vừa lưu và báo lỗi
                    System.IO.File.Delete(filePath);
                    string msg = faceLocations.Length == 0 ? "Không tìm thấy khuôn mặt nào trong ảnh. Vui lòng chụp lại." : "Phát hiện nhiều hơn 1 khuôn mặt. Vui lòng chỉ chụp một người.";
                    return BadRequest(new { message = msg });
                }

                // Chỉ lưu đường dẫn (URL) vào Database
                user.FaceImageUrl = $"/images/faces/{fileName}";
                
                // Ép Entity Framework phải ghi nhận sự thay đổi này xuống CSDL
                _context.Users.Update(user); 
                await _context.SaveChangesAsync();

                return Ok(new 
                { 
                    message = $"Đã đăng ký khuôn mặt thành công cho {user.FullName}.",
                    savedDbUrl = user.FaceImageUrl,
                    physicalPath = filePath // Trả về đường dẫn thật để bạn dễ dàng tìm ảnh trên máy tính
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Lỗi hệ thống đăng ký: {ex.Message}" });
            }
        }

        [HttpPost("recognize")]
        [Authorize]
        public async Task<IActionResult> RecognizeFace([FromBody] ImageData data)
        {
            try
            {
                if (string.IsNullOrEmpty(data.Base64Image)) return BadRequest(new { message = "Dữ liệu ảnh không được để trống." });

                var base64Data = data.Base64Image;
                if (base64Data.Contains(",")) base64Data = base64Data.Substring(base64Data.IndexOf(",") + 1);

                byte[] imageBytes = Convert.FromBase64String(base64Data);

                // --- NHẬN DIỆN KHUÔN MẶT TRỰC TIẾP BẰNG C# (.NET) ---
                // 1. Xác thực người dùng từ Token trước để thu hẹp phạm vi
                var loggedInUserIdStr = User.FindFirst("UserID")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!int.TryParse(loggedInUserIdStr, out int loggedInUserId))
                {
                    return Unauthorized(new { success = false, message = "Không thể xác thực danh tính từ Token!" });
                }

                // 2. Chỉ tải duy nhất 1 bản ghi của người đang đăng nhập
                var recognizedUser = await _context.Users
                    .Where(u => u.UserID == loggedInUserId)
                    .Select(u => new { u.UserID, u.FullName, u.Role, u.FaceImageUrl })
                    .FirstOrDefaultAsync();

                if (recognizedUser == null)
                {
                    return Ok(new { success = false, message = "Không tìm thấy tài khoản nhân viên đang đăng nhập!" });
                }
                if (string.IsNullOrEmpty(recognizedUser.FaceImageUrl))
                {
                    return Ok(new { success = false, message = "Tài khoản này chưa được đăng ký khuôn mặt!" });
                }

                try
                {
                    // Khởi tạo mô hình AI duy nhất 1 lần
                    if (_fr == null)
                    {
                        string modelPath = Path.Combine(_env.ContentRootPath, "Models");
                        if (!Directory.Exists(modelPath)) return StatusCode(500, new { message = "Thiếu thư mục Models!" });
                        
                        lock (_aiLock)
                        {
                            if (_fr == null) _fr = FaceRecognitionDotNet.FaceRecognition.Create(modelPath);
                        }
                    }

                    // Phân tích ảnh vừa quét
                    // Tạo một file Temp để AI đọc, xử lý xong sẽ xóa ngay
                    string tempScanFile = Path.GetTempFileName() + ".jpg";
                    await System.IO.File.WriteAllBytesAsync(tempScanFile, imageBytes);

                    using var scanImg = FaceRecognitionDotNet.FaceRecognition.LoadImageFile(tempScanFile);
                    var scanEncodings = _fr.FaceEncodings(scanImg).ToArray();
                    
                    // Xóa file temp rác
                    if (System.IO.File.Exists(tempScanFile)) System.IO.File.Delete(tempScanFile);

                    if (scanEncodings.Length == 0)
                    {
                        return Ok(new { success = false, message = "Không tìm thấy khuôn mặt rõ nét trong ảnh vừa chụp." });
                    }

                    var scanEncoding = scanEncodings[0];

                    // Lấy đường dẫn file ảnh trong DB
                    string webRootPath = _env.WebRootPath;
                    if (string.IsNullOrWhiteSpace(webRootPath)) webRootPath = Path.Combine(_env.ContentRootPath, "wwwroot");

                    string dbFilePath = Path.Combine(webRootPath, recognizedUser.FaceImageUrl.TrimStart('/'));
                    
                    if (!System.IO.File.Exists(dbFilePath))
                    {
                        return Ok(new { success = false, message = "Lỗi: Không tìm thấy file gốc của người dùng trên máy chủ." });
                    }

                    // Đọc trực tiếp từ file vật lý
                    using var dbImg = FaceRecognitionDotNet.FaceRecognition.LoadImageFile(dbFilePath);
                    var dbEncodings = _fr.FaceEncodings(dbImg).ToArray();

                    if (dbEncodings.Length == 0)
                    {
                        return Ok(new { success = false, message = "Dữ liệu khuôn mặt trong hệ thống bị lỗi, vui lòng đăng ký lại!" });
                    }

                    // 3. Tiến hành đối chiếu (1 - 1)
                    double distance = FaceRecognitionDotNet.FaceRecognition.FaceDistance(dbEncodings[0], scanEncoding);
                    
                    if (distance >= 0.45) // Ngưỡng an toàn chống False Positive (Lớn hơn 0.45 là không khớp)
                    {
                        return Ok(new { success = false, message = "Khuôn mặt không khớp với tài khoản đang đăng nhập!" });
                    }
                }
                catch (Exception ex)
                {
                    return Ok(new { success = false, message = "Lỗi xử lý AI C#: " + ex.Message });
                }

                // --- MATCH THÀNH CÔNG: GHI NHẬN CHẤM CÔNG CÓ COOLDOWN CHỐNG SPAM ---
                var today = DateTime.Now.Date;
                var currentTime = DateTime.Now;

                        var attendancesToday = await _context.Attendances
                            .Where(a => a.UserId == recognizedUser.UserID && a.Date == today)
                            .OrderByDescending(a => a.CheckInTime)
                            .ToListAsync();

                        var latestAttendance = attendancesToday.FirstOrDefault();

                        // Đặt thời gian chống spam (Ví dụ: 1 phút)
                        double cooldownMinutes = 1.0;
                        string actionMessage = "Nhận diện thành công!";

                        if (latestAttendance == null)
                        {
                            // Chưa có lần nào -> Check-in ca mới
                            _context.Attendances.Add(new Attendance
                            {
                                UserId = recognizedUser.UserID,
                                Date = today,
                                CheckInTime = currentTime,
                                Status = "Thành công"
                            });
                            actionMessage = "Đã điểm danh VÀO CA thành công!";
                        }
                        else
                        {
                            // Tính toán thời gian thao tác gần nhất của nhân viên này
                            var lastActionTime = latestAttendance.CheckOutTime ?? latestAttendance.CheckInTime;
                            var timeSinceLastAction = currentTime - lastActionTime;

                            // Chặn spam nếu quét liên tục dưới 1 phút
                            if (timeSinceLastAction.TotalMinutes < cooldownMinutes)
                            {
                                return Ok(new
                                {
                                    success = true,
                                    message = $"Thao tác quá nhanh. Vui lòng thử lại sau {cooldownMinutes} phút!",
                                    user = recognizedUser
                                });
                            }

                            if (latestAttendance.CheckOutTime == null)
                            {
                                // Đã hết cooldown và đang trong ca -> Check-out
                                latestAttendance.CheckOutTime = currentTime;
                                actionMessage = "Đã điểm danh TAN CA thành công!";
                            }
                            else if (attendancesToday.Count < 3)
                            {
                                // Đã check-out trước đó -> Mở ca mới (Ví dụ: Nghỉ trưa xong quay lại)
                                _context.Attendances.Add(new Attendance
                                {
                                    UserId = recognizedUser.UserID,
                                    Date = today,
                                    CheckInTime = currentTime,
                                    Status = "Thành công"
                                });
                                actionMessage = "Đã điểm danh VÀO CA (Mới) thành công!";
                            }
                            else
                            {
                                // Đã đạt tối đa ca trong ngày -> Chỉ cập nhật giờ ra của ca cuối
                                latestAttendance.CheckOutTime = currentTime;
                                actionMessage = "Đã cập nhật giờ TAN CA thành công!";
                            }
                        }

                        await _context.SaveChangesAsync();

                        return Ok(new { success = true, message = actionMessage, user = recognizedUser });
            }
            catch (Exception ex)
            {
                // 👉 Đã sửa: Trả về Object JSON thay vì String để Angular đọc được lỗi chính xác
                string errorMsg = ex.InnerException != null ? ex.InnerException.Message : ex.Message;
                return StatusCode(500, new { success = false, message = $"Lỗi DB/Server: {errorMsg}" });
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

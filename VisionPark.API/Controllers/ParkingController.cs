using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;
using System.IO;
using Microsoft.AspNetCore.Hosting;
using System.Net.Http;
using Microsoft.Extensions.Configuration;
using VisionPark.API.Data;
using VisionPark.API.DTOs.Requests;
using VisionPark.API.Models;

namespace VisionPark.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ParkingController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        private static readonly ConcurrentDictionary<string, SemaphoreSlim> _cardLocks = new();
        private readonly IWebHostEnvironment _env;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private static FaceRecognitionDotNet.FaceRecognition? _fr;
        private static readonly object _aiLock = new object();

        public ParkingController(ApplicationDbContext context, IWebHostEnvironment env, IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            _context = context;
            _env = env;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        [HttpPost("scan-card")]
        public async Task<IActionResult> ScanCard([FromBody] ScanCardRequest request)
        {
            if (string.IsNullOrEmpty(request.CardUID))
                return BadRequest("Mã thẻ không hợp lệ");

            var cardLock = _cardLocks.GetOrAdd(request.CardUID, _ => new SemaphoreSlim(1, 1));
            await cardLock.WaitAsync();

            try
            {
                var card = await _context.NfcCards.FirstOrDefaultAsync(c => c.CardUID == request.CardUID);

                if (card == null) return BadRequest("Thẻ này chưa được khởi tạo trên hệ thống!");

                // KIỂM TRA THẺ BỊ KHÓA TỪ KHO THẺ
                if (card.Status != "Active")
                {
                    return BadRequest(new { Message = "Thẻ này đã bị KHÓA trên hệ thống, không thể sử dụng!" });
                }

                // --- KIỂM TRA CHỐNG SAO CHÉP THẺ (ANTI-CLONING) ---
                // Nếu thẻ trong DB có mã bảo mật, nhưng thiết bị quét lên không gửi kèm hoặc không khớp -> Thẻ giả
                // if (!string.IsNullOrEmpty(card.CardToken) && request.CardToken != card.CardToken && !request.ForcePass)
                // {
                //     return BadRequest(new { Message = "Cảnh báo: Phát hiện thẻ giả mạo (Không có Token ẩn)!", RequiresForcePass = true });
                // }

                string plateNumber = "N/A";
                string customerName = "Khách vãng lai";
                string ticketStatus = "Hợp lệ";
                string expiryDate = "---";
                int aiVehicleTypeId = request.VehicleTypeID ?? 1; // Lấy trực tiếp từ Frontend (1: Xe máy, 2: Ô tô)
                int finalVehicleTypeId = aiVehicleTypeId; // Mã dùng để lưu CSDL
                string vehicleType = aiVehicleTypeId == 2 ? "Ô tô" : "Xe máy";

                var activeSession = await _context.ParkingSessions
                    .FirstOrDefaultAsync(s => s.CardID == card.CardID && s.CheckOutTime == null);

                bool isCurrentlyExpired = false;

                if (card.CardType != "Guest")
                {
                    var ticket = await _context.MonthlyTickets.Include(t => t.VehicleType).FirstOrDefaultAsync(t => t.CardID == card.CardID);
                    if (ticket == null) return BadRequest(new { Message = "Thẻ này chưa được đăng ký vé tháng hoặc đã bị khóa!" });

                    isCurrentlyExpired = DateTime.Now > ticket.EndDate;
                    var daysRemaining = (ticket.EndDate - DateTime.Now).TotalDays;
                    
                    ticketStatus = isCurrentlyExpired ? "Đã hết hạn" : (daysRemaining <= 7 ? $"Sắp hết hạn ({Math.Floor(daysRemaining)} ngày)" : "Hợp lệ");
                    customerName = ticket.CustomerName;
                    plateNumber = ticket.RegisterPlate;
                    vehicleType = ticket.VehicleType != null ? ticket.VehicleType.TypeName : (ticket.VehicleTypeID == 2 ? "Ô tô" : "Xe máy");
                    expiryDate = ticket.EndDate.ToString("dd/MM/yyyy");
                    finalVehicleTypeId = ticket.VehicleTypeID;

                    // Chỉ chặn (BLOCK) nếu xe ĐANG Ở NGOÀI BÃI muốn đi VÀO (Check-in)
                    if (activeSession == null)
                    {
                        if (isCurrentlyExpired)
                        {
                            return Ok(new 
                            { 
                                Action = "BLOCK", 
                                Message = "Vé tháng đã hết hạn, bạn cần gia hạn!",
                                Data = new
                                {
                                    CustomerName = customerName,
                                    PlateNumber = plateNumber,
                                    VehicleType = vehicleType,
                                    ExpiryDate = expiryDate,
                                    Status = ticketStatus,
                                    CardType = card.CardType
                                }
                            });
                        }
                        
                        if (!ticket.IsActive)
                        {
                            return Ok(new 
                            { 
                                Action = "BLOCK", 
                                Message = "Vé tháng đã bị khóa!",
                                Data = new
                                {
                                    CustomerName = customerName,
                                    PlateNumber = plateNumber,
                                    VehicleType = vehicleType,
                                    ExpiryDate = expiryDate,
                                    Status = ticketStatus,
                                    CardType = card.CardType
                                }
                            });
                        }
                    }
                }

                if (card.CardType == "Guest" && string.IsNullOrEmpty(request.PlateImageBase64))
                {
                    return BadRequest(new { Message = "Thẻ vãng lai (vé lượt) bắt buộc phải có ảnh chụp BIỂN SỐ xe!" });
                }

                string recognizedPlate = string.Empty;
                if (!string.IsNullOrEmpty(request.PlateImageBase64))
                {
                    recognizedPlate = await RecognizePlateFromBase64(request.PlateImageBase64, aiVehicleTypeId);
                    if (string.IsNullOrEmpty(recognizedPlate))
                        return BadRequest(new { Message = "AI không đọc được biển số, vui lòng chụp lại cho rõ nét!" });
                }

                object displayInfo = new
                {
                    CustomerName = customerName,
                    PlateNumber = plateNumber,
                    VehicleType = vehicleType,
                    ExpiryDate = expiryDate,
                    Status = ticketStatus,
                    TotalCost = 0m,
                    CardType = card.CardType
                };

                // XỬ LÝ CHECK-IN (VÀO BÃI)
                if (activeSession == null)
                {
                    if (card.CardType == "Guest")
                    {
                        plateNumber = recognizedPlate;
                        
                        displayInfo = new
                        {
                            CustomerName = customerName,
                            PlateNumber = plateNumber,
                            VehicleType = vehicleType,
                            ExpiryDate = expiryDate,
                            Status = ticketStatus,
                            TotalCost = 0m,
                            CardType = card.CardType
                        };
                    }
                    else // Vé tháng
                    {
                        if (!string.IsNullOrEmpty(recognizedPlate) && !request.ForcePass)
                        {
                            string cleanRecognized = new string(recognizedPlate.Where(char.IsLetterOrDigit).ToArray());
                            string cleanRegistered = new string(plateNumber.Where(char.IsLetterOrDigit).ToArray());

                            if (!string.IsNullOrEmpty(cleanRegistered) && !cleanRecognized.Contains(cleanRegistered) && !cleanRegistered.Contains(cleanRecognized))
                            {
                                return BadRequest(new { Message = $"CẢNH BÁO: Biển số xe vào ({recognizedPlate}) KHÔNG KHỚP với biển đăng ký vé tháng ({plateNumber})!", RequiresForcePass = true });
                            }
                        }
                    }

                    string? faceImageIn = null; // Đã lược bỏ quét khuôn mặt khi vào
                    string? plateImageIn = await SaveFaceImageAsync(request.PlateImageBase64, "plate_in");

                    var newSession = new ParkingSession
                    {
                        CardID = card.CardID,
                        LicensePlateIn = plateNumber,
                        CheckInTime = DateTime.Now,
                        VehicleTypeID = finalVehicleTypeId,
                        
                        FaceImageUrlIn = faceImageIn, 
                        VehicleImageUrlIn = plateImageIn 
                    };

                    _context.ParkingSessions.Add(newSession);
                    await _context.SaveChangesAsync();

                    return Ok(new
                    {
                        Action = "CHECK_IN",
                        Message = "Xe VÀO bãi thành công. Mở Barie!",
                        Data = displayInfo
                    });
                }
                else
                {
                    // KIỂM TRA BIỂN SỐ LÚC RA
                    if (!string.IsNullOrEmpty(recognizedPlate) && !request.ForcePass)
                    {
                        string cleanRecognized = new string(recognizedPlate.Where(char.IsLetterOrDigit).ToArray());
                        string cleanIn = new string(activeSession.LicensePlateIn.Where(char.IsLetterOrDigit).ToArray());

                        if (!string.IsNullOrEmpty(cleanIn) && !cleanRecognized.Contains(cleanIn) && !cleanIn.Contains(cleanRecognized))
                        {
                            return BadRequest(new { Message = $"CẢNH BÁO AN NINH: Biển số xe ra ({recognizedPlate}) KHÔNG KHỚP với xe lúc vào ({activeSession.LicensePlateIn})!", RequiresForcePass = true });
                        }
                    }

                    string? faceImageOut = null; // Đã lược bỏ quét khuôn mặt khi ra
                    string? plateImageOut = null;

                    // TỐI ƯU HÓA Ổ CỨNG: Nếu là thẻ lượt, xóa ảnh lúc vào và không lưu ảnh lúc ra sau khi Checkout thành công
                    if (card.CardType == "Guest")
                    {
                        if (!string.IsNullOrEmpty(activeSession.VehicleImageUrlIn))
                        {
                            string webRootPath = _env.WebRootPath;
                            if (string.IsNullOrWhiteSpace(webRootPath)) webRootPath = Path.Combine(_env.ContentRootPath, "wwwroot");
                            string inImagePath = Path.Combine(webRootPath, activeSession.VehicleImageUrlIn.TrimStart('/'));
                            if (System.IO.File.Exists(inImagePath))
                            {
                                System.IO.File.Delete(inImagePath);
                            }
                            activeSession.VehicleImageUrlIn = null; // Cập nhật lại CSDL để UI không hiển thị ảnh lỗi
                        }
                    }
                    else
                    {
                        plateImageOut = await SaveFaceImageAsync(request.PlateImageBase64, "plate_out");
                    }

                    activeSession.CheckOutTime = DateTime.Now;
                    activeSession.LicensePlateOut = card.CardType == "Guest" ? activeSession.LicensePlateIn : plateNumber;
                    activeSession.FaceImageUrlOut = faceImageOut;
                    activeSession.ImageOutPath = plateImageOut; // Lưu tạm ảnh biển số ra vào ImageOutPath

                    decimal cost = 0;
                    if (card.CardType == "Guest")
                    {
                        var duration = activeSession.CheckOutTime.Value - activeSession.CheckInTime;
                        int totalHours = (int)Math.Ceiling(duration.TotalHours);
                        if (totalHours <= 0) totalHours = 1;

                        // LOGIC TÍNH GIÁ VÉ THEO GIỜ LŨY TIẾN
                        // Lấy cấu hình từ Database (Bảng SystemConfigs) để đảm bảo đồng bộ Real-time
                        var sysConfigs = await _context.SystemConfigs.Where(c => c.ConfigKey.StartsWith("GuestPrice_")).ToListAsync();
                        string GetConfig(string key, string def) => sysConfigs.FirstOrDefault(c => c.ConfigKey == key)?.ConfigValue ?? def;

                        decimal basePriceCar = decimal.TryParse(GetConfig("GuestPrice_CarBasePrice", "15000"), out var cbp) ? cbp : 15000m;
                        decimal extraPerHourCar = decimal.TryParse(GetConfig("GuestPrice_CarExtraPerHour", "5000"), out var ceph) ? ceph : 5000m;
                        decimal basePriceBike = decimal.TryParse(GetConfig("GuestPrice_BikeBasePrice", "5000"), out var bbp) ? bbp : 5000m;
                        decimal extraPerHourBike = decimal.TryParse(GetConfig("GuestPrice_BikeExtraPerHour", "2000"), out var beph) ? beph : 2000m;

                        decimal basePrice = activeSession.VehicleTypeID == 2 ? basePriceCar : basePriceBike;
                        decimal extraPerHour = activeSession.VehicleTypeID == 2 ? extraPerHourCar : extraPerHourBike;

                        if (totalHours <= 4)
                        {
                            cost = basePrice;
                        }
                        else
                        {
                            cost = basePrice + (totalHours - 4) * extraPerHour;
                        }
                        
                        activeSession.TotalCost = cost;
                    }
                    else
                    {
                        activeSession.TotalCost = 0;
                    }

                    await _context.SaveChangesAsync();

                    // Phục hồi lại đúng loại xe lúc vào của khách vãng lai để hiển thị lên thông báo thay vì lấy Toggle hiện tại trên màn hình
                    if (card.CardType == "Guest")
                    {
                        vehicleType = activeSession.VehicleTypeID == 2 ? "Ô tô" : "Xe máy";
                    }

                    displayInfo = new
                    {
                        CustomerName = customerName,
                        PlateNumber = activeSession.LicensePlateOut,
                        VehicleType = vehicleType,
                        ExpiryDate = expiryDate,
                        Status = ticketStatus,
                        TotalCost = cost,
                        CardType = card.CardType
                    };

                    return Ok(new
                    {
                        Action = "CHECK_OUT",
                        Message = isCurrentlyExpired ? "Xe RA bãi thành công. LƯU Ý: Vé tháng đã hết hạn!" : (card.CardType == "Guest" ? $"Thu tiền vé: {cost:N0} VNĐ. Mở Barie!" : "Xe RA bãi thành công. Mở Barie!"),
                        Data = displayInfo
                    });
                }
            }
            finally
            {
                cardLock.Release();
                // Dọn dẹp RAM: Nếu không còn request nào đang chờ quẹt thẻ này, hãy xóa Lock khỏi Dictionary
                if (cardLock.CurrentCount == 1)
                {
                    _cardLocks.TryRemove(request.CardUID, out _);
                }
            }
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetParkingHistory(string? searchTerm, string? status, int pageNumber = 1, int pageSize = 50)
        {
          
            var query = _context.ParkingSessions.AsQueryable();

           
            if (!string.IsNullOrEmpty(status) && status != "all")
            {
                query = query.Where(s => (status == "In" ? s.CheckOutTime == null : s.CheckOutTime != null));
            }

           
            if (!string.IsNullOrEmpty(searchTerm))
            {
                searchTerm = searchTerm.ToLower();
                query = query.Where(s => s.LicensePlateIn.Contains(searchTerm) ||
                                         (s.LicensePlateOut != null && s.LicensePlateOut.Contains(searchTerm)) ||
                                         s.CardID.ToString().Contains(searchTerm));
            }

            int totalCount = await query.CountAsync();

          
            var pagedData = await query
                .OrderByDescending(s => s.CheckInTime)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new
                {
                    NfcId = s.Card != null ? s.Card.CardUID : "---",
                    CardType = s.Card != null ? s.Card.CardType : "Guest",
                    PlateNumberIn = s.LicensePlateIn ?? "---",
                    PlateNumberOut = s.LicensePlateOut ?? "---",
                    VehicleType = s.VehicleType != null ? s.VehicleType.TypeName : (s.VehicleTypeID == 2 ? "Ô tô" : "Xe máy"),
                    CheckInTime = s.CheckInTime,
                    CheckOutTime = s.CheckOutTime,
                    FaceImageUrlIn = s.FaceImageUrlIn,
                    FaceImageUrlOut = s.FaceImageUrlOut,
                    VehicleImageUrlIn = s.VehicleImageUrlIn,
                    ImageOutPath = s.ImageOutPath
                }).ToListAsync();

            var sessions = pagedData.Select(s => new
            {
                NfcId = s.NfcId.Contains("_deleted_") ? s.NfcId.Substring(0, s.NfcId.IndexOf("_deleted_")) : s.NfcId,
                CardType = s.CardType,
                PlateNumberIn = s.PlateNumberIn,
                PlateNumberOut = s.PlateNumberOut,
                VehicleType = s.VehicleType,
                CheckInTime = s.CheckInTime.ToString("dd/MM/yyyy HH:mm:ss"),
                CheckOutTime = s.CheckOutTime.HasValue
                        ? s.CheckOutTime.Value.ToString("dd/MM/yyyy HH:mm:ss")
                        : "---",
                Status = s.CheckOutTime == null ? "In" : "Out",
                FaceImageUrlIn = s.FaceImageUrlIn,
                FaceImageUrlOut = s.FaceImageUrlOut,
                VehicleImageUrlIn = s.VehicleImageUrlIn,
                VehicleImageUrlOut = s.ImageOutPath
            });

            return Ok(new
            {
                Message = "Lấy lịch sử thành công!",
                TotalCount = totalCount,
                Data = sessions
            });
        }

        private async Task<string> RecognizePlateFromBase64(string base64Image, int vehicleTypeID)
        {
            try
            {
                var base64Data = base64Image.Contains(",") ? base64Image.Substring(base64Image.IndexOf(",") + 1) : base64Image;
                byte[] imageBytes = Convert.FromBase64String(base64Data);

                using var client = _httpClientFactory.CreateClient();
                using var content = new MultipartFormDataContent();
                using var stream = new MemoryStream(imageBytes);
                content.Add(new StreamContent(stream), "image", "plate.jpg");
                content.Add(new StringContent(vehicleTypeID.ToString()), "vehicleType");

                string aiBaseUrl = _configuration["AiServiceUrl"] ?? "http://localhost:8000";
                string endpoint = $"{aiBaseUrl.TrimEnd('/')}/api/recognize-plate";

                var aiResponse = await client.PostAsync(endpoint, content);
                if (aiResponse.IsSuccessStatusCode)
                {
                    var resultString = await aiResponse.Content.ReadAsStringAsync();
                    using var resultDoc = System.Text.Json.JsonDocument.Parse(resultString);
                    if (resultDoc.RootElement.GetProperty("success").GetBoolean())
                    {
                        return resultDoc.RootElement.GetProperty("plateNumber").GetString() ?? "";
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi AI Biển số: {ex.Message}");
            }
            return "";
        }

        private bool VerifyFaceMatch(string dbFaceUrl, string currentBase64)
        {
            if (string.IsNullOrEmpty(dbFaceUrl) || string.IsNullOrEmpty(currentBase64)) return false;

            try
            {
                if (_fr == null)
                {
                    string modelPath = Path.Combine(_env.ContentRootPath, "Models");
                    lock (_aiLock) { if (_fr == null) _fr = FaceRecognitionDotNet.FaceRecognition.Create(modelPath); }
                }

                string webRootPath = _env.WebRootPath;
                if (string.IsNullOrWhiteSpace(webRootPath)) webRootPath = Path.Combine(_env.ContentRootPath, "wwwroot");
                string dbFilePath = Path.Combine(webRootPath, dbFaceUrl.TrimStart('/'));

                if (!System.IO.File.Exists(dbFilePath)) return false;

                using var dbImg = FaceRecognitionDotNet.FaceRecognition.LoadImageFile(dbFilePath);
                var dbEncodings = _fr.FaceEncodings(dbImg).ToArray();
                if (dbEncodings.Length == 0) return false;

                var base64Data = currentBase64.Contains(",") ? currentBase64.Substring(currentBase64.IndexOf(",") + 1) : currentBase64;
                byte[] imageBytes = Convert.FromBase64String(base64Data);
                string tempScanFile = Path.GetTempFileName() + ".jpg";
                System.IO.File.WriteAllBytes(tempScanFile, imageBytes);

                using var scanImg = FaceRecognitionDotNet.FaceRecognition.LoadImageFile(tempScanFile);
                var scanEncodings = _fr.FaceEncodings(scanImg).ToArray();
                
                if (System.IO.File.Exists(tempScanFile)) System.IO.File.Delete(tempScanFile);

                if (scanEncodings.Length == 0) return false;

                double distance = FaceRecognitionDotNet.FaceRecognition.FaceDistance(dbEncodings[0], scanEncodings[0]);
                return distance < 0.45; // Dưới 0.45 là 1 người
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi Face Match: {ex.Message}");
                return false;
            }
        }

        [HttpPost("find-by-face")]
        public async Task<IActionResult> FindTicketByFace([FromBody] ScanCardRequest request)
        {
            if (string.IsNullOrEmpty(request.FaceImageBase64)) return BadRequest(new { Message = "Vui lòng cung cấp ảnh khuôn mặt!" });

            try
            {
                if (_fr == null)
                {
                    string modelPath = Path.Combine(_env.ContentRootPath, "Models");
                    lock (_aiLock) { if (_fr == null) _fr = FaceRecognitionDotNet.FaceRecognition.Create(modelPath); }
                }

                var base64Data = request.FaceImageBase64.Contains(",") ? request.FaceImageBase64.Substring(request.FaceImageBase64.IndexOf(",") + 1) : request.FaceImageBase64;
                byte[] imageBytes = Convert.FromBase64String(base64Data);
                string tempScanFile = Path.GetTempFileName() + ".jpg";
                FaceRecognitionDotNet.FaceEncoding[] scanEncodings;

                try
                {
                    await System.IO.File.WriteAllBytesAsync(tempScanFile, imageBytes);
                    using var scanImg = FaceRecognitionDotNet.FaceRecognition.LoadImageFile(tempScanFile);
                    scanEncodings = _fr.FaceEncodings(scanImg).ToArray();
                }
                finally
                {
                    if (System.IO.File.Exists(tempScanFile)) System.IO.File.Delete(tempScanFile);
                }

                if (scanEncodings.Length == 0) return BadRequest(new { Message = "Không nhận diện được khuôn mặt trong ảnh!" });

                var scanEncoding = scanEncodings[0];

                var tickets = await _context.MonthlyTickets.Include(t => t.Card).Where(t => t.IsActive).ToListAsync();
                string webRootPath = _env.WebRootPath;
                if (string.IsNullOrWhiteSpace(webRootPath)) webRootPath = Path.Combine(_env.ContentRootPath, "wwwroot");

                foreach (var ticket in tickets)
                {
                    // Bỏ qua không quét khuôn mặt nếu thẻ NFC gốc đã bị khóa
                    if (ticket.Card == null || ticket.Card.Status != "Active") continue;

                    var prop = ticket.GetType().GetProperty("FaceImageUrl");
                    if (prop != null)
                    {
                        string faceUrl = prop.GetValue(ticket) as string;
                        if (!string.IsNullOrEmpty(faceUrl))
                        {
                            string dbFilePath = Path.Combine(webRootPath, faceUrl.TrimStart('/'));
                            if (System.IO.File.Exists(dbFilePath))
                            {
                                using var dbImg = FaceRecognitionDotNet.FaceRecognition.LoadImageFile(dbFilePath);
                                var dbEncodings = _fr.FaceEncodings(dbImg).ToArray();
                                if (dbEncodings.Length > 0 && FaceRecognitionDotNet.FaceRecognition.FaceDistance(dbEncodings[0], scanEncoding) < 0.45)
                                {
                                    return Ok(new { CardUID = ticket.Card?.CardUID, CustomerName = ticket.CustomerName });
                                }
                            }
                        }
                    }
                }

                return BadRequest(new { Message = "Khuôn mặt này chưa được đăng ký vé tháng!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        // Hàm tiện ích: Lưu ảnh Base64 thành file vật lý
        private async Task<string?> SaveFaceImageAsync(string? base64Image, string prefix)
        {
            if (string.IsNullOrEmpty(base64Image)) return null;

            try
            {
                var base64Data = base64Image.Contains(",") ? base64Image.Substring(base64Image.IndexOf(",") + 1) : base64Image;
                byte[] imageBytes = Convert.FromBase64String(base64Data);

                string webRootPath = _env.WebRootPath;
                if (string.IsNullOrWhiteSpace(webRootPath)) webRootPath = Path.Combine(_env.ContentRootPath, "wwwroot");

                string recordsFolder = Path.Combine(webRootPath, "images", "records");
                if (!Directory.Exists(recordsFolder)) Directory.CreateDirectory(recordsFolder);

                string fileName = $"{prefix}_{DateTime.Now.Ticks}.jpg";
                string filePath = Path.Combine(recordsFolder, fileName);

                await System.IO.File.WriteAllBytesAsync(filePath, imageBytes);
                return $"/images/records/{fileName}";
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi lưu ảnh: {ex.Message}");
                return null;
            }
        }
    }
}
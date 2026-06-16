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

                // --- KIỂM TRA CHỐNG SAO CHÉP THẺ (ANTI-CLONING) ---
                // Nếu thẻ trong DB có mã bảo mật, nhưng thiết bị quét lên không gửi kèm hoặc không khớp -> Thẻ giả
                if (!string.IsNullOrEmpty(card.CardToken) && request.CardToken != card.CardToken)
                    return BadRequest(new { Message = "Cảnh báo: Phát hiện thẻ giả mạo (Cloned Card)!" });

                string plateNumber = "N/A";
                string customerName = "Khách vãng lai";
                string ticketStatus = "Hợp lệ";
                string expiryDate = "---";
                int aiVehicleTypeId = request.VehicleTypeID ?? 2; // Lấy trực tiếp từ Frontend để đảm bảo AI đọc đúng thuật toán
                int finalVehicleTypeId = aiVehicleTypeId; // Mã dùng để lưu CSDL
                string vehicleType = aiVehicleTypeId == 1 ? "Ô tô" : "Xe máy";

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
                    vehicleType = ticket.VehicleType?.TypeName ?? "Ô tô";
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
                                    Status = ticketStatus
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
                                    Status = ticketStatus
                                }
                            });
                        }
                    }
                }

                string recognizedPlate = string.Empty;
                if (!string.IsNullOrEmpty(request.PlateImageBase64))
                {
                    recognizedPlate = await RecognizePlateFromBase64(request.PlateImageBase64, aiVehicleTypeId);
                    if (string.IsNullOrEmpty(recognizedPlate))
                        return BadRequest(new { Message = "AI không đọc được biển số, vui lòng chụp lại cho rõ nét!" });
                }

                var displayInfo = new
                {
                    CustomerName = customerName,
                    PlateNumber = plateNumber,
                    VehicleType = vehicleType,
                    ExpiryDate = expiryDate,
                    Status = ticketStatus
                };

                // XỬ LÝ CHECK-IN (VÀO BÃI)
                if (activeSession == null)
                {
                    if (card.CardType == "Guest")
                    {
                        if (string.IsNullOrEmpty(recognizedPlate))
                            return BadRequest(new { Message = "Thẻ vãng lai yêu cầu chụp ảnh BIỂN SỐ xe để nhận diện vào bãi!" });

                        plateNumber = recognizedPlate;
                        
                        displayInfo = new
                        {
                            CustomerName = customerName,
                            PlateNumber = plateNumber,
                            VehicleType = vehicleType,
                            ExpiryDate = expiryDate,
                            Status = ticketStatus
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

                    string? faceImageIn = await SaveFaceImageAsync(request.FaceImageBase64, "face_in");
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

                    // KIỂM TRA KHUÔN MẶT ĐỐI CHIẾU LÚC RA
                    if (!string.IsNullOrEmpty(request.FaceImageBase64) && !string.IsNullOrEmpty(activeSession.FaceImageUrlIn) && !request.ForcePass)
                    {
                        bool isMatch = VerifyFaceMatch(activeSession.FaceImageUrlIn, request.FaceImageBase64);
                        if (!isMatch)
                        {
                            return BadRequest(new { Message = "CẢNH BÁO AN NINH: Khuôn mặt lấy xe KHÔNG KHỚP với người lúc gửi!", RequiresForcePass = true });
                        }
                    }

                    string? faceImageOut = await SaveFaceImageAsync(request.FaceImageBase64, "face_out");
                    string? plateImageOut = await SaveFaceImageAsync(request.PlateImageBase64, "plate_out");

                    activeSession.CheckOutTime = DateTime.Now;
                    activeSession.LicensePlateOut = card.CardType == "Guest" ? activeSession.LicensePlateIn : plateNumber;
                    activeSession.FaceImageUrlOut = faceImageOut;
                    activeSession.ImageOutPath = plateImageOut; // Lưu tạm ảnh biển số ra vào ImageOutPath

                    await _context.SaveChangesAsync();

                    displayInfo = new
                    {
                        CustomerName = customerName,
                        PlateNumber = activeSession.LicensePlateOut,
                        VehicleType = vehicleType,
                        ExpiryDate = expiryDate,
                        Status = ticketStatus
                    };

                    return Ok(new
                    {
                        Action = "CHECK_OUT",
                        Message = isCurrentlyExpired ? "Xe RA bãi thành công. LƯU Ý: Vé tháng đã hết hạn!" : "Xe RA bãi thành công. Mở Barie!",
                        Data = displayInfo
                    });
                }
            }
            finally
            {
                cardLock.Release();
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

          
            var sessions = await query
                .OrderByDescending(s => s.CheckInTime)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new
                {
                    NfcId = s.Card != null ? s.Card.CardUID : "---",
                    PlateNumberIn = s.LicensePlateIn ?? "---",
                    PlateNumberOut = s.LicensePlateOut ?? "---",
                    VehicleType = s.VehicleType != null ? s.VehicleType.TypeName : (s.VehicleTypeID == 1 ? "Ô tô" : "Xe máy"),
                    CheckInTime = s.CheckInTime.ToString("dd/MM/yyyy HH:mm:ss"),
                    CheckOutTime = s.CheckOutTime.HasValue
                            ? s.CheckOutTime.Value.ToString("dd/MM/yyyy HH:mm:ss")
                            : "---",
                    Status = s.CheckOutTime == null ? "In" : "Out",
                    FaceImageUrlIn = s.FaceImageUrlIn,
                    FaceImageUrlOut = s.FaceImageUrlOut,
                    VehicleImageUrlIn = s.VehicleImageUrlIn,
                    VehicleImageUrlOut = s.ImageOutPath
                }).ToListAsync();

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
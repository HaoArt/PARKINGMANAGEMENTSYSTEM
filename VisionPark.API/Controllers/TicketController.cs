﻿﻿﻿﻿﻿using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VisionPark.API.Data;
using VisionPark.API.Models;
using VisionPark.API.DTOs.Requests;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Hosting;
using System.IO;
using System.Text.Json;

namespace VisionPark.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TicketController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly IWebHostEnvironment _env;

        private static FaceRecognitionDotNet.FaceRecognition? _fr;
        private static readonly object _aiLock = new object();

        public TicketController(ApplicationDbContext context, IHttpClientFactory httpClientFactory, IConfiguration configuration, IWebHostEnvironment env)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _env = env;
        }

        [HttpPost("register-monthly")]
        public async Task<IActionResult> RegisterMonthly([FromForm] MonthlyTicketRequest request)
        {
            string detectedPlate = "";
            if (request.VehicleImage == null || request.VehicleImage.Length == 0)
                return BadRequest("Vui lòng tải lên ảnh chụp xe để AI đọc biển số!");

            // --- 1. GỌI PYTHON ĐỂ NHẬN DIỆN BIỂN SỐ ---
            using (var client = _httpClientFactory.CreateClient())
            {
                using var content = new MultipartFormDataContent();
                using var stream = request.VehicleImage.OpenReadStream();
                content.Add(new StreamContent(stream), "image", request.VehicleImage.FileName);
                content.Add(new StringContent(request.VehicleTypeID.ToString()), "vehicleType");

                // Lấy URL từ appsettings.json hoặc Render Environment Variables. Nếu không có thì fallback về localhost
                string aiBaseUrl = _configuration["AiServiceUrl"] ?? "http://localhost:8000";
                string endpoint = $"{aiBaseUrl.TrimEnd('/')}/api/recognize-plate";

                var aiResponse = await client.PostAsync(endpoint, content);
                if (aiResponse.IsSuccessStatusCode)
                {
                    var resultString = await aiResponse.Content.ReadAsStringAsync();
                    var resultDoc = JsonDocument.Parse(resultString);
                    if (resultDoc.RootElement.GetProperty("success").GetBoolean())
                    {
                        detectedPlate = resultDoc.RootElement.GetProperty("plateNumber").GetString() ?? "";
                    }
                }
                else
                {
                    return StatusCode(500, "Không thể kết nối đến AI Service để đọc biển số.");
                }
            }

            if (string.IsNullOrEmpty(detectedPlate))
                return BadRequest("AI không thể nhận diện được biển số từ bức ảnh này!");

            // --- 2. KIỂM TRA THẺ VÀ BIỂN SỐ ---
            var card = await _context.NfcCards.FirstOrDefaultAsync(c => c.CardUID == request.CardUID);
            if (card == null) return BadRequest("Thẻ này chưa được khởi tạo trong hệ thống!");
            // KIỂM TRA THẺ BỊ KHÓA
            if (card.Status != "Active") return BadRequest("Thẻ này đã bị KHÓA trong kho, không thể dùng để đăng ký vé tháng!");

            var cardAlreadyUsed = await _context.MonthlyTickets.AnyAsync(t => t.CardID == card.CardID && t.IsActive && t.EndDate >= DateTime.Now);
            if (cardAlreadyUsed) return BadRequest("Thẻ NFC này đang được sử dụng cho một vé tháng khác chưa hết hạn!");

            var isExist = await _context.MonthlyTickets.AnyAsync(t => t.RegisterPlate == detectedPlate && t.IsActive && t.EndDate >= DateTime.Now);
            if (isExist) return BadRequest($"Biển số {detectedPlate} đã có vé tháng đang hoạt động!");

            // --- 3. CẬP NHẬT LOẠI THẺ (NĂM/QUÝ/THÁNG) ---
            // --- 3. CẬP NHẬT LOẠI THẺ VÀ TẠO TOKEN BẢO MẬT CHỐNG SAO CHÉP ---
            if (request.DurationMonths >= 12) card.CardType = "Year";
            else if (request.DurationMonths >= 3) card.CardType = "Quarterly";
            else card.CardType = "Monthly";

            // Tự động sinh ra một Token bảo mật ngẫu nhiên
            string secureToken = $"VisionPark_{Guid.NewGuid().ToString("N").Substring(0, 10)}";
            card.CardToken = secureToken;

            _context.NfcCards.Update(card);

            // --- 4. TÍNH TOÁN DOANH THU TỪ BẢNG PRICING RULES ---
            var rule = await _context.PricingRules.FirstOrDefaultAsync(r => r.VehicleTypeID == request.VehicleTypeID);
            decimal finalAmount = 0;
            if (rule != null)
            {
                if (request.DurationMonths >= 12) finalAmount = rule.PricePerYear;
                else if (request.DurationMonths >= 3) finalAmount = rule.PricePerQuarter;
                else finalAmount = rule.PricePerMonth;
            }

            // --- 4.5. LƯU KHUÔN MẶT NẾU CÓ ---
            string faceImageUrl = "";
            if (Request.Form.ContainsKey("FaceImageBase64"))
            {
                string base64 = Request.Form["FaceImageBase64"];
                if (!string.IsNullOrEmpty(base64))
                {
                    var base64Data = base64.Contains(",") ? base64.Substring(base64.IndexOf(",") + 1) : base64;
                    byte[] imageBytes = Convert.FromBase64String(base64Data);
                    string webRootPath = _configuration.GetValue<string>("WebRootPath") ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

                    // --- KIỂM TRA KHUÔN MẶT ĐÃ TỒN TẠI TRONG HỆ THỐNG HAY CHƯA ---
                    if (_fr == null)
                    {
                        string modelPath = Path.Combine(_env.ContentRootPath, "Models");
                        lock (_aiLock) { if (_fr == null) _fr = FaceRecognitionDotNet.FaceRecognition.Create(modelPath); }
                    }

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

                    if (scanEncodings.Length == 0) return BadRequest("Không nhận diện được khuôn mặt trong ảnh dự phòng!");

                    var scanEncoding = scanEncodings[0];
                    var activeTickets = await _context.MonthlyTickets.Where(t => t.IsActive).ToListAsync();

                    foreach (var t in activeTickets)
                    {
                        var p = t.GetType().GetProperty("FaceImageUrl");
                        if (p != null)
                        {
                            string existingFaceUrl = p.GetValue(t) as string;
                            if (!string.IsNullOrEmpty(existingFaceUrl))
                            {
                                string dbFilePath = Path.Combine(webRootPath, existingFaceUrl.TrimStart('/'));
                                if (System.IO.File.Exists(dbFilePath))
                                {
                                    using var dbImg = FaceRecognitionDotNet.FaceRecognition.LoadImageFile(dbFilePath);
                                    var dbEncodings = _fr.FaceEncodings(dbImg).ToArray();
                                    if (dbEncodings.Length > 0 && FaceRecognitionDotNet.FaceRecognition.FaceDistance(dbEncodings[0], scanEncoding) < 0.45)
                                    {
                                        return BadRequest($"Khuôn mặt này đã được đăng ký cho vé tháng của khách hàng: {t.CustomerName}!");
                                    }
                                }
                            }
                        }
                    }
                    // --- END KIỂM TRA ---

                    string recordsFolder = Path.Combine(webRootPath, "images", "faces");
                    if (!Directory.Exists(recordsFolder)) Directory.CreateDirectory(recordsFolder);
                    string fileName = $"customer_{DateTime.Now.Ticks}.jpg";
                    string filePath = Path.Combine(recordsFolder, fileName);
                    await System.IO.File.WriteAllBytesAsync(filePath, imageBytes);
                    faceImageUrl = $"/images/faces/{fileName}";
                }
            }

            // --- 5. LƯU VÉ MỚI VÀ TRẢ KẾT QUẢ VỀ ---
            var newTicket = new MonthlyTicket
            {
                CardID = card.CardID,
                VehicleTypeID = request.VehicleTypeID,
                CustomerName = request.CustomerName,
                PhoneNumber = request.PhoneNumber,
                RegisterPlate = detectedPlate,
                StartDate = DateTime.Now,
                EndDate = DateTime.Now.AddMonths(request.DurationMonths),
                IsActive = true,
                TicketPrice = finalAmount
            };

            // Gán FaceImageUrl nếu Model có hỗ trợ. 
            // YÊU CẦU: Thêm thuộc tính `public string? FaceImageUrl { get; set; }` vào class MonthlyTicket trong CSDL.
            var ticketType = newTicket.GetType();
            var prop = ticketType.GetProperty("FaceImageUrl");
            if (prop != null && !string.IsNullOrEmpty(faceImageUrl))
            {
                prop.SetValue(newTicket, faceImageUrl);
            }

            _context.MonthlyTickets.Add(newTicket);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "Đăng ký vé thành công!",
                DetectedPlate = detectedPlate,
                Amount = finalAmount, 
                CardToken = secureToken, // Trả Token về cho điện thoại để ghi lên thẻ
                Data = newTicket
            });
        }
        [HttpGet("monthly-tickets")]
        public async Task<IActionResult> GetAllMonthlyTicket(string? searchTerm, string? status, int pageNumber = 1, int pageSize = 5)
        {
            var query = _context.MonthlyTickets
                .Include(t => t.Card)
                .Include(t => t.VehicleType)
                .AsQueryable();

            if (!string.IsNullOrEmpty(status) && status != "all")
            {
                var now = DateTime.Now;
                if (status == "active")
                    query = query.Where(t => t.IsActive && t.EndDate >= now);
                else if (status == "inactive")
                    query = query.Where(t => !t.IsActive || t.EndDate < now);
            }

            if (!string.IsNullOrEmpty(searchTerm))
            {
                searchTerm = searchTerm.ToLower();
                query = query.Where(t => t.RegisterPlate.ToLower().Contains(searchTerm) || 
                                         t.CustomerName.ToLower().Contains(searchTerm) ||
                                         (t.Card != null && t.Card.CardUID.ToLower().Contains(searchTerm)));
            }

            int totalCount = await query.CountAsync();

            var pagedData = await query
                .OrderByDescending(t => t.StartDate)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new
                {
                    TicketId = t.TicketId,
                    CustomerName = t.CustomerName,
                    PhoneNumber = t.PhoneNumber,
                    RegisterPlate = t.RegisterPlate,
                    VehicleType = t.VehicleType != null ? t.VehicleType.TypeName : "Không xác định",
                    CardUID = t.Card != null ? t.Card.CardUID : "Không có thẻ",
                    StartDate = t.StartDate,
                    EndDate = t.EndDate,
                    IsActive = t.IsActive
                })
                .ToListAsync();

            var tickets = pagedData.Select(t => new
            {
                TicketId = t.TicketId,
                CustomerName = t.CustomerName,
                PhoneNumber = t.PhoneNumber,
                RegisterPlate = t.RegisterPlate,
                VehicleType = t.VehicleType,
                CardUID = t.CardUID.Contains("_deleted_") ? t.CardUID.Substring(0, t.CardUID.IndexOf("_deleted_")) : t.CardUID,
                StartDate = t.StartDate.ToString("dd/MM/yyyy HH:mm"),
                EndDate = t.EndDate.ToString("dd/MM/yyyy HH:mm"),
                IsActive = t.IsActive,
                Status = DateTime.Now > t.EndDate ? "Đã hết hạn" : (t.IsActive ? "Đang hoạt động" : "Đã khóa")
            });

            return Ok(new { Message = "Lấy danh sách vé tháng thành công!", TotalCount = totalCount, Data = tickets });
        }
    }
}
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VisionPark.API.Data;
using VisionPark.API.Models;
using VisionPark.API.DTOs.Requests;
using Microsoft.Extensions.Configuration;
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

        public TicketController(ApplicationDbContext context, IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
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
            };

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
        public async Task<IActionResult> GetAllMonthlyTicket()
        {
            var tickets = await _context.MonthlyTickets
                .Include(t => t.Card)
                .Include(t => t.VehicleType)
                .Select(t => new
                {
                    TicketId = t.TicketId,
                    CustomerName = t.CustomerName,
                    PhoneNumber = t.PhoneNumber,
                    RegisterPlate = t.RegisterPlate,
                    VehicleType = t.VehicleType != null ? t.VehicleType.TypeName : "Không xác định",
                    CardUID = t.Card != null ? t.Card.CardUID : "Không có thẻ",
                    StartDate = t.StartDate.ToString("dd/MM/yyyy HH:mm"),
                    EndDate = t.EndDate.ToString("dd/MM/yyyy HH:mm"),
                    IsActive = t.IsActive,
                    Status = DateTime.Now > t.EndDate ? "Đã hết hạn" : (t.IsActive ? "Đang hoạt động" : "Đã khóa")
                })
                .ToListAsync();

            if (tickets.Count == 0)
            {
                return Ok(new { Message = "Chưa có vé tháng nào được đăng ký.", TotalCount = 0, Data = tickets });
            }
            return Ok(new { Message = "Lấy danh sách vé tháng thành công!", TotalCount = tickets.Count, Data = tickets });
        }
    }
}
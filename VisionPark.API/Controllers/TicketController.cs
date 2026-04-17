using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VisionPark.API.Data;
using VisionPark.API.Models;
using VisionPark.API.DTOs.Requests;
using System.Text.Json;

namespace VisionPark.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TicketController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory; // Khai báo công cụ gọi API ngoài

        public TicketController(ApplicationDbContext context, IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
        }

        [HttpPost("register-monthly")]
        public async Task<IActionResult> RegisterMonthly([FromForm] MonthlyTicketRequest request)
        {
            // 1. GỬI ẢNH SANG PYTHON ĐỂ NHẬN DIỆN BIỂN SỐ
            string detectedPlate = "";
            if (request.VehicleImage == null || request.VehicleImage.Length == 0)
                return BadRequest("Vui lòng tải lên ảnh chụp xe để AI đọc biển số!");

            using (var client = _httpClientFactory.CreateClient())
            {
                using var content = new MultipartFormDataContent();
                using var stream = request.VehicleImage.OpenReadStream();
                content.Add(new StreamContent(stream), "image", request.VehicleImage.FileName);

                // Gọi sang trạm AI Python (cửa sổ đen CMD)
                var aiResponse = await client.PostAsync("http://localhost:8000/api/recognize-plate", content);
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

            // ==============================================
            // 2. LƯU THÔNG TIN VÀO DATABASE
            // ==============================================

            var card = await _context.NfcCards.FirstOrDefaultAsync(c => c.CardUID == request.CardUID);
            if (card == null) return BadRequest("Thẻ này chưa được khởi tạo trong hệ thống!");

            var isExist = await _context.MonthlyTickets.AnyAsync(t => t.RegisterPlate == detectedPlate && t.IsActive);
            if (isExist) return BadRequest($"Biển số {detectedPlate} đã có vé tháng đang hoạt động!");

            var newTicket = new MonthlyTicket
            {
                CardID = card.CardID,
                VehicleTypeID = request.VehicleTypeID,
                CustomerName = request.CustomerName,
                PhoneNumber = request.PhoneNumber,
                RegisterPlate = detectedPlate, // Dùng kết quả do AI đọc được!
                StartDate = DateTime.Now,
                EndDate = DateTime.Now.AddMonths(request.DurationMonths),
                IsActive = true,
            };

            _context.MonthlyTickets.Add(newTicket);
            card.CardType = "Monthly";

            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "Đăng ký vé tháng thành công!",
                DetectedPlate = detectedPlate, // Trả về biển số AI đọc được cho Frontend xem
                Data = newTicket
            });
        }
    }
}
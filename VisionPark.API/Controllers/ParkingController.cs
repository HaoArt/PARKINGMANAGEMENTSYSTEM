using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VisionPark.API.Data;
using System.Text.Json;

namespace VisionPark.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ParkingController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        // Sử dụng IHttpClientFactory để gọi API ngoài (Best Practice của C#)
        private readonly IHttpClientFactory _httpClientFactory;

        public ParkingController(ApplicationDbContext context, IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
        }

        [HttpPost("check-in-monthly")]
        public async Task<IActionResult> CheckInMonthly(IFormFile vehicleImage, [FromForm] string cardUID)
        {
            if (vehicleImage == null || vehicleImage.Length == 0)
                return BadRequest("Vui lòng cung cấp ảnh xe!");

            // ==========================================
            // 1. GỬI ẢNH SANG PYTHON ĐỂ NHẬN DIỆN BIỂN SỐ
            // ==========================================
            string plateFromAI = "";

            using (var client = _httpClientFactory.CreateClient())
            {
                using var content = new MultipartFormDataContent();

                // Đọc file ảnh thành luồng byte
                using var stream = vehicleImage.OpenReadStream();
                var streamContent = new StreamContent(stream);
                content.Add(streamContent, "image", vehicleImage.FileName);

                // Gửi POST Request sang Python (Port 8000)
                var aiResponse = await client.PostAsync("http://localhost:8000/api/recognize-plate", content);

                if (aiResponse.IsSuccessStatusCode)
                {
                    var resultString = await aiResponse.Content.ReadAsStringAsync();
                    // Đọc file JSON từ Python trả về
                    var resultDoc = JsonDocument.Parse(resultString);
                    if (resultDoc.RootElement.GetProperty("success").GetBoolean())
                    {
                        plateFromAI = resultDoc.RootElement.GetProperty("plateNumber").GetString() ?? "";
                    }
                }
                else
                {
                    return StatusCode(500, "Không thể kết nối đến AI Service.");
                }
            }

            // ==========================================
            // 2. XỬ LÝ LOGIC NGHIỆP VỤ (VÉ THÁNG)
            // ==========================================

            // Tìm thẻ trong kho
            var card = await _context.NfcCards.FirstOrDefaultAsync(c => c.CardUID == cardUID);
            if (card == null) return BadRequest("Thẻ không hợp lệ!");

            // Tìm vé tháng tương ứng với thẻ này
            var monthlyTicket = await _context.MonthlyTickets.FirstOrDefaultAsync(t => t.CardID == card.CardID && t.IsActive);
            if (monthlyTicket == null) return BadRequest("Thẻ này chưa đăng ký vé tháng hoặc đã hết hạn!");

            // ĐỐI CHIẾU AI: Biển số AI đọc được CÓ KHỚP với biển số đăng ký không?
            if (monthlyTicket.RegisterPlate.Replace("-", "").Replace(".", "") != plateFromAI.Replace("-", "").Replace(".", ""))
            {
                return BadRequest(new
                {
                    Message = "CẢNH BÁO: Biển số không khớp!",
                    RegisteredPlate = monthlyTicket.RegisterPlate,
                    DetectedPlate = plateFromAI
                });
            }

            // Nếu khớp 100%, tiến hành mở Barie (Lưu dữ liệu vào bảng ParkingSession...)
            // ... (Code lưu lịch sử vào đây) ...

            return Ok(new
            {
                Message = "Check-in vé tháng thành công! Mở Barie.",
                Customer = monthlyTicket.CustomerName,
                Plate = plateFromAI
            });
        }
    }
}
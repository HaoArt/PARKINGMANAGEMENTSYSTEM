using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using VisionPark.API.Data;

namespace VisionPark.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DashboardController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            try
            {
                // 1. Tính tổng doanh thu từ vé lượt (Sử dụng SQL SUM để cực kỳ tối ưu tốc độ)
                // Lưu ý: Đổi trường 'TotalCost' theo đúng tên bạn đặt trong model ParkingSession
                decimal totalHistoryRevenue = await _context.ParkingSessions
                    .SumAsync(p => (decimal)p.TotalCost);

                // 2. Tính tổng doanh thu vé tháng toàn thời gian
                var monthlyTickets = await _context.MonthlyTickets.ToListAsync();
                var pricingRules = await _context.PricingRules.ToListAsync();
                
                decimal totalMonthlyRevenue = 0;

                // Thực hiện tính toán nội bộ trên máy chủ thay vì đẩy về Frontend
                foreach (var ticket in monthlyTickets)
                {
                    var rule = pricingRules.FirstOrDefault(r => r.VehicleTypeID == ticket.VehicleTypeID);
                    if (rule != null)
                    {
                        // Phỏng đoán công thức tính số tháng của Frontend
                        int months = ((ticket.EndDate.Year - ticket.StartDate.Year) * 12) + ticket.EndDate.Month - ticket.StartDate.Month;
                        if (months <= 0) months = 1;

                        if (months >= 12)
                        {
                            totalMonthlyRevenue += rule.PricePerYear;
                        }
                        else if (months >= 3)
                        {
                            totalMonthlyRevenue += rule.PricePerQuarter;
                        }
                        else
                        {
                            totalMonthlyRevenue += rule.PricePerMonth * months;
                        }
                    }
                }

                return Ok(new
                {
                    Message = "Lấy dữ liệu thống kê thành công",
                    Data = new
                    {
                        totalHistoryRevenue = totalHistoryRevenue,
                        totalMonthlyRevenue = totalMonthlyRevenue,
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Lỗi xử lý dữ liệu: " + ex.Message });
            }
        }
    }
}
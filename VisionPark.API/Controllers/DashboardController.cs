using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using VisionPark.API.Data;

namespace VisionPark.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DashboardController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("summary")]
        [Authorize]
        public async Task<IActionResult> GetDashboardSummary()
        {
            // TỐI ƯU HÓA: Dùng trực tiếp SUM của SQL Server thay vì tải List về bộ nhớ RAM của Web Server
            
            decimal tongDoanhThuLuot = await _context.ParkingSessions.SumAsync(x => x.TotalCost);

            // Vé tháng hiện tại chưa lưu trực tiếp cột Giá tiền trong DB. 
            // Để có tính chính xác cao nhất, sau này bạn nên thêm cột 'Amount' vào bảng MonthlyTickets.
            decimal tongDoanhThuVeThang = 0; 

            // TỐI ƯU HÓA: Đếm số lượng xe đang trong bãi trực tiếp bằng Database thay vì kéo dữ liệu về Frontend
            int xeTrongKho = await _context.ParkingSessions.CountAsync(s => s.CheckOutTime == null);

            return Ok(new
            {
                success = true,
                data = new {
                    totalHistoryRevenue = tongDoanhThuLuot,
                    totalMonthlyRevenue = tongDoanhThuVeThang,
                    vehiclesInParking = xeTrongKho
                }
            });
        }
    }
}
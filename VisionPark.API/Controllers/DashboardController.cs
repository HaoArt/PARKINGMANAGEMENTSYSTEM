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
            
            var today = DateTime.Today;

            // Tính toán CHÍNH XÁC doanh thu HÔM NAY (Các lượt đỗ xe đã ra khỏi bãi trong hôm nay)
            decimal revenueToday = await _context.ParkingSessions
                .Where(s => s.CheckOutTime != null && s.CheckOutTime.Value.Date == today)
                .SumAsync(x => x.TotalCost);

            decimal tongDoanhThuLuot = await _context.ParkingSessions.SumAsync(x => x.TotalCost);

            // TÍNH TOÁN DOANH THU VÉ THÁNG (Phục hồi logic cũ của Frontend)
            var tickets = await _context.MonthlyTickets.ToListAsync();
            var pricingRules = await _context.PricingRules.ToListAsync();

            decimal tongDoanhThuVeThang = 0;
            foreach (var ticket in tickets)
            {
                var rule = pricingRules.FirstOrDefault(r => r.VehicleTypeID == ticket.VehicleTypeID);
                if (rule != null)
                {
                    int durationMonths = ((ticket.EndDate.Year - ticket.StartDate.Year) * 12) + ticket.EndDate.Month - ticket.StartDate.Month;
                    
                    if (durationMonths >= 12) tongDoanhThuVeThang += rule.PricePerYear;
                    else if (durationMonths >= 3) tongDoanhThuVeThang += rule.PricePerQuarter;
                    else tongDoanhThuVeThang += rule.PricePerMonth;
                }
            }

            // TỐI ƯU HÓA: Đếm số lượng xe đang trong bãi trực tiếp bằng Database thay vì kéo dữ liệu về Frontend
            int xeTrongKho = await _context.ParkingSessions.CountAsync(s => s.CheckOutTime == null);

            return Ok(new
            {
                success = true,
                data = new {
                    revenueToday = revenueToday,
                    totalHistoryRevenue = tongDoanhThuLuot,
                    totalMonthlyRevenue = tongDoanhThuVeThang,
                    vehiclesInParking = xeTrongKho
                }
            });
        }

        [HttpGet("records")]
        [Authorize]
        public async Task<IActionResult> GetDashboardRecords(string? searchTerm, string? status, int pageNumber = 1, int pageSize = 5)
        {
            var query = _context.ParkingSessions
                .Include(p => p.Card)
                .Include(p => p.VehicleType)
                .AsQueryable();

            if (!string.IsNullOrEmpty(searchTerm))
            {
                query = query.Where(p => p.LicensePlateIn.Contains(searchTerm) || p.LicensePlateOut.Contains(searchTerm));
            }

            if (!string.IsNullOrEmpty(status) && status != "all")
            {
                if (status == "In" || status == "Đang đỗ")
                    query = query.Where(p => p.CheckOutTime == null);
                else if (status == "Out" || status == "Đã ra")
                    query = query.Where(p => p.CheckOutTime != null);
            }

            int totalCount = await query.CountAsync();

            var pagedData = await query
                .OrderByDescending(p => p.CheckInTime)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new
                {
                    id = p.Card != null ? p.Card.CardUID : $"ID-{p.SessionID}",
                    plateNumber = p.LicensePlateIn ?? "---",
                    vehicleType = p.VehicleType != null ? p.VehicleType.TypeName : (p.VehicleTypeID == 1 ? "Ô tô" : "Xe máy"),
                    checkInTime = p.CheckInTime,
                    status = p.CheckOutTime == null ? "In" : "Out"
                })
                .ToListAsync();

            var records = pagedData.Select(p => new
            {
                id = p.id,
                plateNumber = p.plateNumber,
                vehicleType = p.vehicleType,
                timeIn = p.checkInTime.ToString("HH:mm - dd/MM/yyyy"),
                status = p.status
            });

            return Ok(new
            {
                success = true,
                totalCount = totalCount,
                data = records
            });
        }

        [HttpGet("export")]
        [Authorize]
        public async Task<IActionResult> ExportDashboardCsv(string? searchTerm, string? status)
        {
            var query = _context.ParkingSessions
                .Include(p => p.Card)
                .Include(p => p.VehicleType)
                .AsQueryable();

            if (!string.IsNullOrEmpty(searchTerm))
                query = query.Where(p => p.LicensePlateIn.Contains(searchTerm) || p.LicensePlateOut.Contains(searchTerm));

            if (!string.IsNullOrEmpty(status) && status != "all")
            {
                if (status == "In" || status == "Đang đỗ") query = query.Where(p => p.CheckOutTime == null);
                else if (status == "Out" || status == "Đã ra") query = query.Where(p => p.CheckOutTime != null);
            }

            var data = await query.OrderByDescending(p => p.CheckInTime).ToListAsync();
            var builder = new System.Text.StringBuilder();
            builder.AppendLine("Mã thẻ/ID,Biển số,Loại xe,Thời gian vào,Thời gian ra,Trạng thái,Doanh thu (VNĐ)");

            foreach (var item in data)
            {
                var id = item.Card != null ? item.Card.CardUID : $"ID-{item.SessionID}";
                var plate = item.LicensePlateIn ?? "---";
                var type = item.VehicleType != null ? item.VehicleType.TypeName : (item.VehicleTypeID == 1 ? "Ô tô" : "Xe máy");
                var timeIn = item.CheckInTime.ToString("dd/MM/yyyy HH:mm:ss");
                var timeOut = item.CheckOutTime?.ToString("dd/MM/yyyy HH:mm:ss") ?? "---";
                var st = item.CheckOutTime == null ? "Đang đỗ" : "Đã ra";
                var cost = item.TotalCost.ToString("N0");
                builder.AppendLine($"{id},{plate},{type},{timeIn},{timeOut},{st},{cost}");
            }

            var bom = new byte[] { 0xEF, 0xBB, 0xBF }; // UTF-8 BOM chống lỗi font tiếng Việt trong Excel
            var finalBytes = bom.Concat(System.Text.Encoding.UTF8.GetBytes(builder.ToString())).ToArray();
            return File(finalBytes, "text/csv", $"BaoCao_VisionPark_{DateTime.Now:dd-MM-yyyy}.csv");
        }
    }
}
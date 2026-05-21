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
    public class AttendanceController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AttendanceController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("summary")]
        [Authorize]
        public async Task<IActionResult> GetSummary()
        {
            try
            {
                // BẮT CHÍNH XÁC "UserID" TỪ TOKEN, KHÔNG DÙNG CONTAINS!
                var loggedInUserIdStr = User.FindFirst("UserID")?.Value;

                if (!int.TryParse(loggedInUserIdStr, out int loggedInUserId))
                    return Unauthorized(new { Message = "Không thể xác thực Token. Vui lòng đăng nhập lại." });

                var records = await _context.Attendances
                    .Include(a => a.User)
                    .Where(a => a.UserId == loggedInUserId)
                    .OrderByDescending(a => a.CheckInTime)
                    .ToListAsync();

                var currentMonth = DateTime.Now.Month;
                var currentYear = DateTime.Now.Year;
                var recordsThisMonth = records.Where(a => a.CheckInTime.Month == currentMonth && a.CheckInTime.Year == currentYear).ToList();
                int totalShifts = recordsThisMonth.Count(a => a.CheckOutTime.HasValue);
                double totalWorkDays = totalShifts / 2.0;

                var groupedData = records
                    .GroupBy(a => a.CheckInTime.Date)
                    .Select(g => new
                    {
                        date = g.Key.ToString("yyyy-MM-ddTHH:mm:ss"),
                        records = g.Select(a => new
                        {
                            fullName = a.User != null ? a.User.FullName : "Không xác định",
                            faceImageUrl = a.User?.FaceImageUrl,
                            checkInTime = a.CheckInTime,
                            checkOutTime = a.CheckOutTime,
                            workDuration = a.CheckOutTime.HasValue
                                ? $"{(a.CheckOutTime.Value - a.CheckInTime).Hours}h {(a.CheckOutTime.Value - a.CheckInTime).Minutes}m"
                                : null
                        }).ToList()
                    })
                    .ToList();

                return Ok(new
                {
                    Message = "Lấy dữ liệu chấm công thành công",
                    TotalShifts = totalShifts,
                    TotalWorkDays = totalWorkDays,
                    Data = groupedData
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Lỗi server khi tải dữ liệu", Error = ex.Message });
            }
        }
    }
}
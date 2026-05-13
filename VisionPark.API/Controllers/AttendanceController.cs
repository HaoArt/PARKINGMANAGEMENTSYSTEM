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
        public async Task<IActionResult> GetSummary()
        {
            try
            {
                var records = await _context.Attendances
                    .Include(a => a.User)
                    .OrderByDescending(a => a.CheckInTime)
                    .ToListAsync();

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
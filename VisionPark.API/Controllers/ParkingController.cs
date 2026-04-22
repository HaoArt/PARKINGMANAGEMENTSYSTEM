using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
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

        public ParkingController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost("scan-card")]
        public async Task<IActionResult> ScanCard([FromBody] ScanCardRequest request)
        {
            var card = await _context.NfcCards.FirstOrDefaultAsync(c => c.CardUID == request.CardUID);

            if (card == null) return BadRequest("Thẻ này chưa được khởi tạo trên hệ thống!");

            var ticket = await _context.MonthlyTickets.Include(t => t.VehicleType).FirstOrDefaultAsync(t => t.CardID == card.CardID);
            if (ticket == null) return BadRequest(new { Message = "Thẻ này chưa được đăng ký vé tháng!" });

            var isExpired = DateTime.Now > ticket.EndDate;
            var ticketStatus = isExpired ? "Đã hết hạn" : "Hợp lệ";

            var displayInfo = new
            {
                CustomerName = ticket.CustomerName,
                PlateNumber = ticket.RegisterPlate,
                VehicleType = ticket.VehicleType,
                ExpiryDate = ticket.EndDate.ToString("dd/MM/yyyy"),
                Status = ticketStatus
            };

            if (isExpired && !ticket.IsActive)
            {
                return Ok(new
                {
                    Action = "BLOCK",
                    Message = "Vé tháng đã hết hạn, vui lòng gia hạn"
                });
            }

            var activeSession = await _context.ParkingSessions
                .FirstOrDefaultAsync(s => s.CardID == card.CardID && s.CheckOutTime == null);

            // XỬ LÝ CHECK-IN (VÀO BÃI)
            if (activeSession == null)
            {
                var newSession = new ParkingSession
                {
                    CardID = card.CardID,
                    LicensePlateIn = ticket.RegisterPlate,
                    CheckInTime = DateTime.Now,
                    VehicleTypeID = ticket.VehicleTypeID
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
                activeSession.CheckOutTime = DateTime.Now;
                activeSession.LicensePlateOut = ticket.RegisterPlate;

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    Action = "CHECK_OUT",
                    Message = "Xe RA bãi thành công. Mở Barie!",
                    Data = displayInfo
                });
            }
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetParkingHistory(string? searchTerm, string? status)
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

          
            var sessions = await query
                .OrderByDescending(s => s.CheckInTime)
                .Select(s => new
                {
                    SessionID = s.SessionID,
                    CardID = s.CardID,
                    VehicleTypeID = s.VehicleTypeID,
                    LicensePlateIn = s.LicensePlateIn,
                    LicensePlateOut = s.LicensePlateOut ?? "N/A",
                    CheckInTime = s.CheckInTime.ToString("dd/MM/yyyy HH:mm:ss"),
                    CheckOutTime = s.CheckOutTime.HasValue
                            ? s.CheckOutTime.Value.ToString("dd/MM/yyyy HH:mm:ss")
                            : "Chưa ra khỏi bãi",
                    Status = s.CheckOutTime == null ? "In" : "Out"
                }).ToListAsync();

            return Ok(new
            {
                Message = "Lấy lịch sử thành công!",
                TotalCount = sessions.Count,
                Data = sessions
            });
        }
    }
}
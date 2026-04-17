using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VisionPark.API.Models
{
    [Table("ParkingSessions")]
    public class ParkingSession
    {
        [Key]
        public long SessionID { get; set; }

        public int CardID { get; set; }
        [ForeignKey("CardID")]
        public NfcCard Card { get; set; }

        public int VehicleTypeID { get; set; }
        [ForeignKey("VehicleTypeID")]
        public VehicleType VehicleType { get; set; }

        public int? TicketID { get; set; }
        [ForeignKey("TicketID")]
        public MonthlyTicket? MonthlyTicket { get; set; } // Dấu ? vì có thể là khách lẻ (không có vé tháng)

        // --- Thông tin Check-in ---
        public DateTime TimeIn { get; set; } = DateTime.Now;
        public string? PlateNumberIn { get; set; }
        public string? ImageInPath { get; set; }

        public int UserInID { get; set; }
        [ForeignKey("UserInID")]
        public User UserIn { get; set; }

        // --- Thông tin Check-out ---
        public DateTime? TimeOut { get; set; } // Dấu ? vì lúc mới vào chưa có giờ ra
        public string? PlateNumberOut { get; set; }
        public string? ImageOutPath { get; set; }

        public int? UserOutID { get; set; }
        [ForeignKey("UserOutID")]
        public User? UserOut { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalCost { get; set; } = 0;

        public string Status { get; set; } = "In";
        public bool? IsPlateMatch { get; set; }
    }
}
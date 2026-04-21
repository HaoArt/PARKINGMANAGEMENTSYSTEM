using System;
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
        public NfcCard? Card { get; set; }

        public int VehicleTypeID { get; set; }
        [ForeignKey("VehicleTypeID")]
        public VehicleType? VehicleType { get; set; }

        public int? TicketID { get; set; }
        [ForeignKey("TicketID")]
        public MonthlyTicket? MonthlyTicket { get; set; }

        // ==========================================
        // DỮ LIỆU ĐẦU VÀO (IN)
        // ==========================================
        [Column("TimeIn")]
        public DateTime CheckInTime { get; set; } = DateTime.Now;

        [Column("PlateNumberIn")]
        public string? LicensePlateIn { get; set; }

        public string? ImageInPath { get; set; }

        public int? UserInID { get; set; }
        [ForeignKey("UserInID")]
        public User? UserIn { get; set; }

        // ==========================================
        // DỮ LIỆU ĐẦU RA (OUT)
        // ==========================================
        [Column("TimeOut")]
        public DateTime? CheckOutTime { get; set; }

        [Column("PlateNumberOut")]
        public string? LicensePlateOut { get; set; }

        public string? ImageOutPath { get; set; }

        public int? UserOutID { get; set; }
        [ForeignKey("UserOutID")]
        public User? UserOut { get; set; }

        // ==========================================
        // THÔNG TIN THANH TOÁN & TRẠNG THÁI
        // ==========================================
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalCost { get; set; } = 0;

        public string Status { get; set; } = "In";

        public bool? IsPlateMatch { get; set; }
    }
}
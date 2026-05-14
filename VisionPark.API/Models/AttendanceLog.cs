using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VisionPark.API.Models
{
    [Table("AttendanceLogs")]
    public class AttendanceLog
    {
        [Key]
        public int LogID { get; set; }

        public int UserID { get; set; }

        [ForeignKey("UserID")]
        public User User { get; set; }

        public DateTime CheckInTime { get; set; }

        // Lưu độ chính xác AI nhận diện được (VD: 95.5%)
        public double SimilarityPercentage { get; set; }

        public string Status { get; set; } = string.Empty; // VD: "Thành công", "Thất bại"
    }
}
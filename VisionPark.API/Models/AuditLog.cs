using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VisionPark.API.Models
{
    [Table("AuditLogs")]
    public class AuditLog
    {
        [Key]
        public long LogID { get; set; }

        public int UserID { get; set; }
        [ForeignKey("UserID")]
        public User User { get; set; }

        [Required]
        public string ActionType { get; set; } = string.Empty;

        [Required]
        public string TableName { get; set; } = string.Empty;

        [Required]
        public string RecordID { get; set; } = string.Empty;

        public string? OldValues { get; set; } // Chuỗi JSON
        public string? NewValues { get; set; } // Chuỗi JSON

        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public string? IpAddress { get; set; }
    }
}
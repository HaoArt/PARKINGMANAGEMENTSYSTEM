using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VisionPark.API.Models
{
    [Table("Users")]
    public class User
    {
        [Key]
        public int UserID { get; set; } // Đổi thành UserID cho chuẩn SQL

        [Required]
        public string Username { get; set; } = string.Empty; // Sửa UserName thành Username

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        public string FullName { get; set; } = string.Empty;

        public string Role { get; set; } = "Security";

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.Now; // Đã thêm chữ 'd' vào CreatedAt
    }
}
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VisionPark.API.Models
{
    [Table("Users")]
    public class User
    {
        [Key]
        public int UserId { get; set; }

        [Required]
        public String UserName { get; set; } = String.Empty;

        [Required]
        public string PasswordHash { get; set; } = String.Empty;

        [Required]
        public string FullName {  get; set; } = String.Empty;

        public string Role { get; set; } = "Security";

        public bool IsActive { get; set; } = true;

        public DateTime CreateAt { get; set; }= DateTime.Now;

    }
}

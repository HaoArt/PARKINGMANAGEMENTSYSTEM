using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VisionPark.API.Models
{
    [Table("Users")]
    public class User
    {
        [Key]
        public int UsertId { get; set; }

        [Required]
        public String UserName { get; set; }

        [Required]


    }
}

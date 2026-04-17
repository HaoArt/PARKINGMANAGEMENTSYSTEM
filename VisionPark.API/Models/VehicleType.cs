using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VisionPark.API.Models
{
    [Table("VerhicleTypes")]
    public class VehicleType
    {
        [Key]
        public int TypeID { get; set; }
        
        [Required]
        public string TypeName { get; set; }= string.Empty;

        public string Description {  get; set; } 
    }
}

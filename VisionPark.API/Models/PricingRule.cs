using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VisionPark.API.Models
{
    [Table("PricingRules")]
    public class PricingRule
    {
        [Key]
        public int RuleID { get; set; }
         public int VehicleTypeID { get; set; }
        [ForeignKey("VehicleTypeID")]


        public  VehicleType VehicleType { get; set; }

        [Required]
        public string RuleType {  get; set; } = string.Empty;
        [Column(TypeName = "decimal(18,2)")]
        public decimal BasePrice { get; set; }

        public int? BlockMinutes { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal PricePerBlock { get; set; }

        public TimeSpan? ApplyFromTime { get; set; }
        public DateTime? ApplyToTime { get; set; }

    }
}

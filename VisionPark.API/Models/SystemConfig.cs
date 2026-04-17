using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VisionPark.API.Models
{
    [Table("SystemConfigs")]
    public class SystemConfig
    {
        [Key]
        public string ConfigKey { get; set; } = string.Empty;

        [Required]
        public string ConfigValue { get; set; } = string.Empty;

        public string DataType { get; set; } = "String";

        public string ConfigGrpup { get; set; } = "General";
        public string? Description {  get; set; }
    }
}

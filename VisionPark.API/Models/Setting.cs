using System.ComponentModel.DataAnnotations;

namespace VisionPark.API.Models
{
    public class Setting
    {
        [Key]
        public string SettingKey { get; set; }
        public string SettingValue { get; set; }
    }
}
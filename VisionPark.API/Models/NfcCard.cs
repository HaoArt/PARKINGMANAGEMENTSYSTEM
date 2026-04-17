using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VisionPark.API.Models
{
    [Table("NFCCards")]
    public class NfcCard
    {
        [Key]
        public int CardID { get; set; }

        public string CardUID { get; set; } = string.Empty;
        public string CardType { get; set; } = "Guest";

        public string Status { get; set; } = "Active";
    }
}

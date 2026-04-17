using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VisionPark.API.Models
{
    [Table("MonthlyTickets")]
    public class MonthlyTicket
    {
        [Key]
        public int TicketId { get; set; }

        public int CardID { get; set; }
        [ForeignKey("CardID")]
        public required NfcCard Card { get; set; }

        public int VehicleTypeID { get; set; }
        [ForeignKey("VehicleTypeID")]
        public required VehicleType VehicleType { get; set; }

        [Required]
        public string CustomerName { get; set; } = string.Empty;
        
        public string? PhoneNumber {  get; set; }

        [Required]

        public string RegisterPlate { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsActive { get; set; } = true;
    }
}

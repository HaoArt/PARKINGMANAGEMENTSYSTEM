namespace VisionPark.API.DTOs.Requests
{
    public class MonthlyTicketRequest
    {
        public string CardUID { get; set; } = string.Empty; 
        public int VehicleTypeID { get; set; }            
        public string CustomerName { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public int DurationMonths { get; set; } = 1;
        public IFormFile? VehicleImage { get; set; } = null!;
    }
}
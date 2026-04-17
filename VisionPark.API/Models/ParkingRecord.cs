namespace VisionPark.API.Models
{
    public class ParkingRecord
    {
        public int Id { get; set; }
        public string NfcId { get; set; } = string.Empty;
        public string PlateNumber { get; set; } = string.Empty;

        public string VehicleType { get; set; } = string.Empty;

        public DateTime CheckInTime { get; set; }
        public DateTime CheckOutTime { get; set; }

        public decimal TotalCost { get; set; }

        public string Status { get; set; } = "In";

    }
}

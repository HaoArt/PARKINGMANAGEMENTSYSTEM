namespace VisionPark.API.DTOs.Requests
{
    public class SystemConfigDto
    {
        public string ParkingName { get; set; } = string.Empty;
        public int MaxCapacity { get; set; }
        public string OpenTime { get; set; } = string.Empty;
        public string CloseTime { get; set; } = string.Empty;
        public string Hotline { get; set; } = string.Empty;
    }
}
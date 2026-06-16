namespace VisionPark.API.DTOs.Requests
{
    public class ScanCardRequest
    {
        public string CardUID { get; set; } = string.Empty;
        public string? CardToken { get; set; }
        public string? FaceImageBase64 { get; set; }
        public string? PlateImageBase64 { get; set; }
        public int? VehicleTypeID { get; set; }
        public bool ForcePass { get; set; } = false;
    }
}

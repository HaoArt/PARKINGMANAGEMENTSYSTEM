namespace VisionPark.API.DTOs.Requests
{
    public class NfcCardRequest
    {
        public string CardUID { get; set; } = string.Empty;
        public string CardType { get; set; } = "Guest";
        public string Status { get; set; } = "Active";
    }
}

namespace VisionPark.API.DTOs.Requests
{
    public class UpdateUserRequest
    {
        public string FullName { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public bool IsActive { get; set; } 
    }
}
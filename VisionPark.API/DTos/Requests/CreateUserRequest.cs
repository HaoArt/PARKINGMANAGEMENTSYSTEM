namespace VisionPark.API.DTOs.Requests
{
    public class CreateUserRequest
    {
        public string UserName { get; set; } = string.Empty;

        public string Password { get; set; } = string.Empty;

        public string FullName { get; set; } = string.Empty;

        public string Role { get; set; } = "Security";
    }
}
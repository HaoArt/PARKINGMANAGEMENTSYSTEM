using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using VisionPark.API.Data;
using VisionPark.API.DTOs.Requests;
namespace VisionPark.API.Controllers
{

    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _config;

        public AuthController(ApplicationDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrEmpty(request.UserName) || string.IsNullOrEmpty(request.Password))
            {
                return BadRequest(new { Message = "Vui lòng nhập đầy đủ tài khoản và mật khẩu." });
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserName == request.UserName);

            if (user == null)
            {
                return Unauthorized(new { Message = "Tài khoản không tồn tại trên hệ thống!" });
            }

            bool isPasswordValid = false;
            try
            {
                isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
            }
            catch (Exception)
            {
                // Fallback: Bắt mọi lỗi (FormatException, SaltParseException) nếu chuỗi trong DB không phải là mã Hash hợp lệ
                if (user.PasswordHash != null && user.PasswordHash.Trim() == request.Password.Trim())
                {
                    isPasswordValid = true;
                    
                    // Mã hóa lại và lưu xuống DB để các lần sau chuẩn định dạng
                    user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
                    await _context.SaveChangesAsync();
                }
            }

            if (!isPasswordValid)
            {
                // Tạm thời hiển thị chi tiết để Debug (Sẽ thấy rõ nếu có dấu cách thừa hoặc sai mật khẩu)
                return Unauthorized(new { Message = $"Sai mật khẩu! Bạn vừa nhập!!!" });
            }

            if (!user.IsActive)
            {
                return StatusCode(403, new { Message = "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin!" });
            }

            var tokenString = GenerateJwtToken(user);

            return Ok(new
            {
                Message = "Đăng nhập thành công!",
                FullName = user.FullName,
                Role = user.Role,
                Token = tokenString
            });
        }

        private string GenerateJwtToken(Models.User user)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.UserName),
                new Claim(ClaimTypes.Name, user.FullName),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("UserID", user.UserID.ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddHours(8),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
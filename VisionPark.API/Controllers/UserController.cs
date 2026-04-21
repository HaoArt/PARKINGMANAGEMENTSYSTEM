using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VisionPark.API.Data;
using VisionPark.API.Models;
using System.Security.Cryptography;
using System.Text;

namespace VisionPark.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public UserController(ApplicationDbContext context)
        {
            _context = context;
        }

        // --- CÁC HÀM GET, PUT, DELETE CŨ CỦA BẠN GIỮ NGUYÊN ---
        [HttpGet]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _context.Users.ToListAsync();
            return Ok(new { Data = users });
        }

        // --- THÊM HÀM ĐĂNG NHẬP (POST) NÀY VÀO ---
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            // Tìm người dùng theo Username
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == request.Username);

            if (user == null)
                return Unauthorized("Tài khoản không tồn tại!");

            if (!user.IsActive)
                return BadRequest("Tài khoản đã bị khóa!");

            // So sánh mật khẩu (Chuyển mật khẩu nhập vào sang MD5 để so khớp với DB)
            string hashedInput = CreateMD5(request.Password);
            if (user.PasswordHash != hashedInput && user.PasswordHash != request.Password) // Kiểm tra cả hash và text thô để test
            {
                return Unauthorized("Mật khẩu không chính xác!");
            }

            return Ok(new
            {
                Message = "Đăng nhập thành công",
                UserId = user.UserID,
                FullName = user.FullName,
                Role = user.Role
            });
        }

        // Hàm hỗ trợ mã hóa MD5 để khớp với dữ liệu SQL của bạn
        private static string CreateMD5(string input)
        {
            using (MD5 md5 = MD5.Create())
            {
                byte[] inputBytes = Encoding.ASCII.GetBytes(input);
                byte[] hashBytes = md5.ComputeHash(inputBytes);
                return Convert.ToHexString(hashBytes);
            }
        }
    }

    // Class nhận dữ liệu từ Ionic gửi sang
    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
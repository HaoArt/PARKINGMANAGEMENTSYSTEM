using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VisionPark.API.Data;
using VisionPark.API.DTOs.Requests;
using VisionPark.API.Models; 

namespace VisionPark.API.Controllers
{
    
    [Authorize(Roles = "Admin")]
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public UsersController(ApplicationDbContext context)
        {
            _context = context;
        }

      
        [HttpGet]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _context.Users
                .OrderByDescending(u => u.CreateAt)
              
                .Select(u => new
                {
                    u.UserId,
                    u.UserName,
                    u.FullName,
                    u.Role,
                    u.IsActive,
                    CreateAt = u.CreateAt.ToString("dd/MM/yyyy HH:mm")
                })
                .ToListAsync();

            return Ok(new
            {
                Message = "Lấy danh sách thành công",
                TotalCount = users.Count,
                Data = users
            });
        }

       
        [HttpPost("create")]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
        {
     
            if (string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { Message = "Tên đăng nhập và mật khẩu không được để trống!" });
            }

          
            var isExist = await _context.Users.AnyAsync(u => u.UserName == request.UserName);
            if (isExist)
            {
                return BadRequest(new { Message = $"Tên đăng nhập '{request.UserName}' đã tồn tại!" });
            }

          
            var newUser = new User
            {
                UserName = request.UserName,
                PasswordHash = request.Password, 
                FullName = request.FullName,
                Role = request.Role,
                IsActive = true,
                CreateAt = DateTime.Now
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "Tạo tài khoản nhân viên thành công!",
                Data = new
                {
                    newUser.UserId,
                    newUser.UserName,
                    newUser.FullName,
                    newUser.Role
                }
            });
        }
    }
}
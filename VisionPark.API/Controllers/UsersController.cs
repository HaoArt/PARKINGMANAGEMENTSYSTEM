﻿using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using VisionPark.API.Data;
using VisionPark.API.DTOs.Requests;
using VisionPark.API.Models;

namespace VisionPark.API.Controllers
{
    //[Authorize(Roles = "Admin")]
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
        public async Task<IActionResult> GetAllUsers(string? searchTerm, string? role, string? status, int pageNumber = 1, int pageSize = 5)
        {
            var query = _context.Users.Where(u => u.Role != "Admin").AsQueryable();

            if (!string.IsNullOrEmpty(searchTerm))
            {
                searchTerm = searchTerm.ToLower();
                query = query.Where(u => u.FullName.ToLower().Contains(searchTerm) || u.UserName.ToLower().Contains(searchTerm));
            }

            if (!string.IsNullOrEmpty(role) && role != "all")
                query = query.Where(u => u.Role == role);

            if (!string.IsNullOrEmpty(status) && status != "all")
            {
                bool isActive = status == "active";
                query = query.Where(u => u.IsActive == isActive);
            }

            int totalCount = await query.CountAsync();

            var users = await query
                .OrderByDescending(u => u.CreatedAt) // Hoặc order tuỳ ý
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new
                {
                    u.UserID,
                    u.UserName,
                    u.FullName,
                    u.Role,
                    u.IsActive,
                    u.FaceImageUrl,
                    CreateAt = u.CreatedAt.ToString("dd/MM/yyyy HH:mm")
                })
                .ToListAsync();

            return Ok(new
            {
                Message = "Lấy danh sách thành công",
                TotalCount = totalCount,
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
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                FullName = request.FullName,
                Role = request.Role,
                IsActive = true,
                CreatedAt = DateTime.Now
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "Tạo tài khoản nhân viên thành công!",
                Data = new
                {
                    newUser.UserID,
                    newUser.UserName,
                    newUser.FullName,
                    newUser.Role
                }
            });
        }

        [HttpPut("update/{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest request)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound(new { Message = "Không tìm thấy nhân viên!" });

            // 1. Cập nhật UserName (kiểm tra trùng lặp)
            if (!string.IsNullOrWhiteSpace(request.UserName) && request.UserName != user.UserName)
            {
                var isExist = await _context.Users.AnyAsync(u => u.UserName == request.UserName);
                if (isExist)
                    return BadRequest(new { Message = $"Tên đăng nhập '{request.UserName}' đã tồn tại!" });

                user.UserName = request.UserName;
            }

            // 2. Cập nhật Họ và tên
            if (!string.IsNullOrWhiteSpace(request.FullName))
            {
                user.FullName = request.FullName;
            }

            // 3. Giữ nguyên hoặc cập nhật Vai trò
            if (!string.IsNullOrWhiteSpace(request.Role))
            {
                user.Role = request.Role;
            }

            // 4. Nếu có nhập Mật khẩu mới -> Mã hóa và lưu lại
            if (!string.IsNullOrWhiteSpace(request.Password))
            {
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
            }

            // 5. Cập nhật trạng thái Hoạt động / Khóa
            user.IsActive = request.IsActive;

            await _context.SaveChangesAsync();
            return Ok(new { Message = "Cập nhật thông tin nhân viên thành công!" });
        }

        [HttpDelete("delete/{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound(new { Message = "Không tìm thấy nhân viên!" });
            }

            
            if (user.Role == "Admin")
            {
                return BadRequest(new { Message = "Không được phép xóa tài khoản Admin!" });
            }

            // --- BẢO VỆ TÀI KHOẢN ĐANG ĐĂNG NHẬP ---
            var currentUserIdStr = User.FindFirst("UserID")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(currentUserIdStr, out int currentUserId))
            {
                if (currentUserId == id)
                {
                    return BadRequest(new { Message = "Không thể tự xóa tài khoản của chính bạn đang đăng nhập!" });
                }
            }

            try
            {
                _context.Users.Remove(user);
                await _context.SaveChangesAsync();
                return Ok(new { Message = "Đã xóa nhân viên thành công!" });
            }
            catch (DbUpdateException)
            {
                return BadRequest(new { Message = "Không thể xóa nhân viên này vì họ đã có lịch sử làm việc! Vui lòng dùng tính năng Chỉnh sửa để Khóa tài khoản." });
            }
        }
    }
}
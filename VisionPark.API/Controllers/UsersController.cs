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
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _context.Users
                .Where(u => u.Role != "Admin")
                .OrderByDescending(u => u.CreatedAt)
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
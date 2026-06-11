﻿using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using VisionPark.API.Data;
using VisionPark.API.DTOs.Requests;
using VisionPark.API.Models;

namespace VisionPark.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SettingsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SettingsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("public")]
        [AllowAnonymous] // Chỉ trả về thông tin cơ bản công khai cho các màn hình LED hiển thị ngoài cổng
        public async Task<IActionResult> GetPublicSettings()
        {
            var configs = await _context.SystemConfigs.ToListAsync();
            string GetValue(string key, string def) => configs.FirstOrDefault(c => c.ConfigKey == key)?.ConfigValue ?? def;

            int.TryParse(GetValue("MaxCapacity", "1500"), out int maxCapacity);

            var sysConfig = new SystemConfigDto
            {
                ParkingName = GetValue("ParkingName", "VisionPark Central"),
                MaxCapacity = maxCapacity > 0 ? maxCapacity : 1500,
                OpenTime = GetValue("OpenTime", "06:00"),
                CloseTime = GetValue("CloseTime", "23:30"),
                Hotline = GetValue("Hotline", "1900 8888")
            };

            return Ok(new { SystemConfig = sysConfig });
        }

        [HttpGet]
        [Authorize] // Bảo vệ cấu hình và bảng giá, bắt buộc phải có Token đăng nhập
        public async Task<IActionResult> GetSettings()
        {
            
            var configs = await _context.SystemConfigs.ToListAsync();
            string GetValue(string key, string def) => configs.FirstOrDefault(c => c.ConfigKey == key)?.ConfigValue ?? def;

            int.TryParse(GetValue("MaxCapacity", "1500"), out int maxCapacity);

            var sysConfig = new SystemConfigDto
            {
                ParkingName = GetValue("ParkingName", "VisionPark Central"),
                MaxCapacity = maxCapacity > 0 ? maxCapacity : 1500,
                OpenTime = GetValue("OpenTime", "06:00"),
                CloseTime = GetValue("CloseTime", "23:30"),
                Hotline = GetValue("Hotline", "1900 8888")
            };

            
            var pricing = await _context.PricingRules
                .Include(p => p.VehicleType)
                .Select(p => new
                {
                    RuleId = p.RuleID,
                    VehicleType = p.VehicleType.TypeName,
                    PricePerEntry = p.BasePrice,
                    PricePerMonth = p.PricePerMonth,
                    PricePerQuarter = p.PricePerQuarter,
                    PricePerYear = p.PricePerYear
                }).ToListAsync();

            return Ok(new { SystemConfig = sysConfig, PricingRules = pricing });
        }

        [Authorize(Roles = "Admin")] // Chỉ tài khoản Admin mới được phép lưu/sửa cấu hình
        [HttpPost("update")]
        [HttpPost("save")]
        public async Task<IActionResult> UpdateSettings([FromBody] UpdateSettingsRequest request)
        {
            if (request == null || request.SystemConfig == null || request.PricingRules == null)
            {
                return BadRequest(new { Message = "Dữ liệu gửi lên không hợp lệ hoặc bị thiếu!" });
            }
            
            async Task UpdateConfig(string key, string value)
            {
                var safeValue = value ?? "";
                var conf = await _context.SystemConfigs.FirstOrDefaultAsync(c => c.ConfigKey == key);
                if (conf != null) conf.ConfigValue = safeValue;
                else _context.SystemConfigs.Add(new SystemConfig 
                { 
                    ConfigKey = key, 
                    ConfigValue = safeValue, 
                    DataType = key == "MaxCapacity" ? "number" : "string", 
                    ConfigGrpup = "General" 
                });
            }

            await UpdateConfig("ParkingName", request.SystemConfig.ParkingName);
            await UpdateConfig("MaxCapacity", request.SystemConfig.MaxCapacity.ToString());
            await UpdateConfig("OpenTime", request.SystemConfig.OpenTime);
            await UpdateConfig("CloseTime", request.SystemConfig.CloseTime);
            await UpdateConfig("Hotline", request.SystemConfig.Hotline);

            
            foreach (var ruleReq in request.PricingRules)
            {
                var rule = await _context.PricingRules.FindAsync(ruleReq.RuleId);
                if (rule != null)
                {
                    rule.BasePrice = ruleReq.PricePerEntry;
                    rule.PricePerMonth = ruleReq.PricePerMonth;
                    rule.PricePerQuarter = ruleReq.PricePerQuarter;
                    rule.PricePerYear = ruleReq.PricePerYear;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { Message = "Đã lưu cấu hình hệ thống thành công!" });
        }
    }
}
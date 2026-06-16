﻿using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using VisionPark.API.Data;
using VisionPark.API.DTOs.Requests;
using VisionPark.API.Models;
using Microsoft.Extensions.Configuration;
using System.IO;
using System.Text.Json.Nodes;

namespace VisionPark.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SettingsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public SettingsController(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
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

            var guestPrices = new
            {
                CarBasePrice = decimal.TryParse(GetValue("GuestPrice_CarBasePrice", "15000"), out var cbp) ? cbp : 15000m,
                CarExtraPerHour = decimal.TryParse(GetValue("GuestPrice_CarExtraPerHour", "5000"), out var ceph) ? ceph : 5000m,
                BikeBasePrice = decimal.TryParse(GetValue("GuestPrice_BikeBasePrice", "5000"), out var bbp) ? bbp : 5000m,
                BikeExtraPerHour = decimal.TryParse(GetValue("GuestPrice_BikeExtraPerHour", "2000"), out var beph) ? beph : 2000m
            };

            return Ok(new { SystemConfig = sysConfig, PricingRules = pricing, GuestPrices = guestPrices });
        }

        [Authorize(Roles = "Admin")] // Chỉ tài khoản Admin mới được phép lưu/sửa cấu hình
        [HttpPost("update")]
        [HttpPost("save")]
        public async Task<IActionResult> UpdateSettings([FromBody] System.Text.Json.JsonElement rawRequest)
        {
            // Tự động phân tích các thuộc tính cũ vào DTO
            var request = System.Text.Json.JsonSerializer.Deserialize<UpdateSettingsRequest>(
                rawRequest.GetRawText(), 
                new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            );

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

            // --- LƯU GUEST PRICES VÀO DATABASE THAY VÌ APPSETTINGS ---
            if (rawRequest.TryGetProperty("guestPrices", out var guestPricesElement) || 
                rawRequest.TryGetProperty("GuestPrices", out guestPricesElement))
            {
                if (guestPricesElement.TryGetProperty("carBasePrice", out var cbp) || guestPricesElement.TryGetProperty("CarBasePrice", out cbp))
                    await UpdateConfig("GuestPrice_CarBasePrice", cbp.ToString());

                if (guestPricesElement.TryGetProperty("carExtraPerHour", out var ceph) || guestPricesElement.TryGetProperty("CarExtraPerHour", out ceph))
                    await UpdateConfig("GuestPrice_CarExtraPerHour", ceph.ToString());

                if (guestPricesElement.TryGetProperty("bikeBasePrice", out var bbp) || guestPricesElement.TryGetProperty("BikeBasePrice", out bbp))
                    await UpdateConfig("GuestPrice_BikeBasePrice", bbp.ToString());

                if (guestPricesElement.TryGetProperty("bikeExtraPerHour", out var beph) || guestPricesElement.TryGetProperty("BikeExtraPerHour", out beph))
                    await UpdateConfig("GuestPrice_BikeExtraPerHour", beph.ToString());
            }

            await _context.SaveChangesAsync();

            return Ok(new { Message = "Đã lưu cấu hình hệ thống thành công!" });
        }
    }
}
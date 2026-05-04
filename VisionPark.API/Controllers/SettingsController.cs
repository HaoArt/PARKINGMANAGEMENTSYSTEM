using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using VisionPark.API.Data;
using VisionPark.API.DTOs.Requests;
using VisionPark.API.Models;

namespace VisionPark.API.Controllers
{

    [Authorize(Roles = "Admin")]

    [Route("api/[controller]")]
    [ApiController]
    public class SettingsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SettingsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetSettings()
        {
            
            var configs = await _context.SystemConfigs.ToListAsync();
            string GetValue(string key, string def) => configs.FirstOrDefault(c => c.ConfigKey == key)?.ConfigValue ?? def;

            var sysConfig = new SystemConfigDto
            {
                ParkingName = GetValue("ParkingName", "VisionPark Central"),
                MaxCapacity = int.TryParse(GetValue("MaxCapacity", "1500"), out int max) ? max : 1500,
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

        [HttpPost("update")]
        public async Task<IActionResult> UpdateSettings([FromBody] UpdateSettingsRequest request)
        {
            
            async Task UpdateConfig(string key, string value)
            {
                var conf = await _context.SystemConfigs.FirstOrDefaultAsync(c => c.ConfigKey == key);
                if (conf != null) conf.ConfigValue = value;
                else _context.SystemConfigs.Add(new SystemConfig { ConfigKey = key, ConfigValue = value, DataType = "string", ConfigGrpup = "General" });
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
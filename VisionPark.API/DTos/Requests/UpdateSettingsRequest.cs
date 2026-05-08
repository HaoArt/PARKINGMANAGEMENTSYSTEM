﻿using VisionPark.API.Models;

namespace VisionPark.API.DTOs.Requests
{
    public class UpdateSettingsRequest
    {
        public SystemConfigDto SystemConfig { get; set; }
        public List<PricingRuleDto> PricingRules { get; set; }
    }

    public class PricingRuleDto
    {
        public int RuleId { get; set; }
        public decimal PricePerEntry { get; set; }
        public decimal PricePerMonth { get; set; }
        public decimal PricePerQuarter { get; set; }
        public decimal PricePerYear { get; set; }
    }
}
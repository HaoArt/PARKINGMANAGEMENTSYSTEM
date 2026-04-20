
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VisionPark.API.Data;
using VisionPark.API.Models;

namespace VisionPark.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VehicleTypesController : ControllerBase
    {
        private readonly ApplicationDbContext _context ;
        public VehicleTypesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> Create(String typeName,string description)
        {
            var newType = new VehicleType
            {
                TypeName = typeName,
                Description= description
            };
            _context.VehicleTypes.Add(newType);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Tạo loại xe thành công!", Data = newType });
        }
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var types = await _context.VehicleTypes.ToListAsync();
            return Ok(types);
        }
    }
}

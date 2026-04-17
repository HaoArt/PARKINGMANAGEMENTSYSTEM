
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VisionPark.API.Data;
using VisionPark.API.DTOs.Requests;
using VisionPark.API.Models;

namespace VisionPark.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CardController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CardController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllCards()
        {
            var cards = await _context.NfcCards.ToListAsync();
            return Ok(cards);
        }
        [HttpPost]

        public async Task<IActionResult> AddCard([FromBody] NfcCardRequest request)
        {
            var isExist = await _context.NfcCards.AnyAsync(c => c.CardUID == request.CardUID);
            if (isExist)
            {
                return BadRequest("Mã thẻ này đã tồn tại trong hệ thống!");
            }
            var newCard = new NfcCard
            {
                CardUID = request.CardUID,
                CardType = request.CardType,
                Status = request.Status,

            };
            _context.NfcCards.Add(newCard);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Thêm thẻ thành công!", Data = newCard });
        }

    }
}

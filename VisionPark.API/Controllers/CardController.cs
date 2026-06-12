﻿using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VisionPark.API.Data;
using VisionPark.API.DTOs.Requests;
using VisionPark.API.Models;

namespace VisionPark.API.Controllers
{
    [Route("api/Cards")]
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

            // Tự động sinh CardToken bảo mật cho thẻ mới
            string secureToken = $"VisionPark_{Guid.NewGuid().ToString("N").Substring(0, 10)}";

            var newCard = new NfcCard
            {
                CardUID = request.CardUID,
                CardType = request.CardType,
                Status = request.Status,
                CardToken = secureToken // Gán CardToken để lưu vào DB
            };
            _context.NfcCards.Add(newCard);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Thêm thẻ thành công!", Data = newCard });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCard(int id, [FromBody] NfcCardRequest request)
        {
            var card = await _context.NfcCards.FindAsync(id);
            if (card == null)
            {
                return NotFound(new { Message = "Không tìm thấy thẻ!" });
            }

            card.CardType = request.CardType;
            card.Status = request.Status;


            await _context.SaveChangesAsync();
            return Ok(new { Message = "Cập nhật thông tin thẻ thành công!" });
        }

        [HttpPost("{id}/regenerate-token")]
        public async Task<IActionResult> RegenerateToken(int id)
        {
            var card = await _context.NfcCards.FindAsync(id);
            if (card == null)
            {
                return NotFound(new { Message = "Không tìm thấy thẻ!" });
            }

            // Tự động sinh CardToken bảo mật mới
            card.CardToken = $"VisionPark_{Guid.NewGuid().ToString("N").Substring(0, 10)}";

            await _context.SaveChangesAsync();
            return Ok(new { Message = "Cập nhật Token mới thành công!", CardToken = card.CardToken });
        }

        [HttpPost("regenerate-missing-tokens")]
        public async Task<IActionResult> RegenerateMissingTokens()
        {
            // Tìm tất cả các thẻ chưa có Token
            var oldCards = await _context.NfcCards.Where(c => string.IsNullOrEmpty(c.CardToken)).ToListAsync();
            
            if (oldCards.Count == 0)
            {
                return Ok(new { Message = "Tất cả các thẻ trong hệ thống đều đã có Token bảo mật." });
            }

            foreach (var card in oldCards)
            {
                card.CardToken = $"VisionPark_{Guid.NewGuid().ToString("N").Substring(0, 10)}";
            }

            await _context.SaveChangesAsync();
            return Ok(new { Message = $"Đã sinh Token thành công cho {oldCards.Count} thẻ cũ!" });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCard(int id)
        {
            var card = await _context.NfcCards.FindAsync(id);
            if (card == null)
            {
                return NotFound(new { Message = "Không tìm thấy thẻ!" });
            }

            _context.NfcCards.Remove(card);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Đã xóa thẻ khỏi hệ thống!" });
        }
    }
}
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using VisionPark.API.Data;
using iTextSharp.text;
using iTextSharp.text.pdf;

namespace VisionPark.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ReportController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ReportController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("export-pdf")]
        public async Task<IActionResult> ExportParkingHistoryPdf([FromQuery] string? searchTerm, [FromQuery] string? status)
        {
            try
            {
                var query = _context.ParkingSessions.AsQueryable();

                if (!string.IsNullOrEmpty(searchTerm))
                {
                    query = query.Where(p => 
                        (p.LicensePlateIn != null && p.LicensePlateIn.Contains(searchTerm)) || 
                        (p.LicensePlateOut != null && p.LicensePlateOut.Contains(searchTerm)));
                }

                if (!string.IsNullOrEmpty(status) && status != "all")
                {
                    if (status == "In")
                        query = query.Where(p => p.Status == "In" || p.Status == "Đang đỗ");
                    else if (status == "Out")
                        query = query.Where(p => p.Status == "Out");
                }

                // Trích xuất toàn bộ dữ liệu khớp với bộ lọc (Không bị giới hạn)
                var records = await query.OrderByDescending(p => p.CheckInTime).ToListAsync();

                using (var ms = new MemoryStream())
                {
                    Document document = new Document(PageSize.A4, 25, 25, 30, 30);
                    PdfWriter writer = PdfWriter.GetInstance(document, ms);
                    document.Open();

                    var titleFont = FontFactory.GetFont(FontFactory.HELVETICA_BOLD, 16);
                    Paragraph title = new Paragraph("BAO CAO LICH SU GIAO DICH - VISIONPARK", titleFont)
                    {
                        Alignment = Element.ALIGN_CENTER,
                        SpacingAfter = 10
                    };
                    document.Add(title);

                    var normalFont = FontFactory.GetFont(FontFactory.HELVETICA, 11);
                    document.Add(new Paragraph($"Thoi gian xuat: {DateTime.Now:dd/MM/yyyy HH:mm}", normalFont));
                    document.Add(new Paragraph($"Tong so giao dich: {records.Count} luot xe", normalFont) { SpacingAfter = 15 });

                    PdfPTable table = new PdfPTable(5) { WidthPercentage = 100 };
                    table.SetWidths(new float[] { 15f, 20f, 25f, 25f, 15f });

                    var headerFont = FontFactory.GetFont(FontFactory.HELVETICA_BOLD, 10, new BaseColor(255, 255, 255));
                    var headerBgColor = new BaseColor(41, 128, 185); 

                    string[] headers = { "Loai xe", "Bien so", "Thoi gian Vao", "Thoi gian Ra", "Trang thai" };
                    foreach (var h in headers)
                    {
                        table.AddCell(new PdfPCell(new Phrase(h, headerFont)) { BackgroundColor = headerBgColor, HorizontalAlignment = Element.ALIGN_CENTER, Padding = 6 });
                    }

                    var cellFont = FontFactory.GetFont(FontFactory.HELVETICA, 10);
                    foreach (var item in records)
                    {
                        string vType = item.VehicleTypeID == 1 ? "O to" : "Xe may";
                        string plate = item.LicensePlateIn ?? "---";
                        string timeIn = item.CheckInTime.ToString("dd/MM/yyyy HH:mm");
                        string timeOut = item.CheckOutTime?.ToString("dd/MM/yyyy HH:mm") ?? "---";
                        string stat = (item.Status == "In" || item.Status == "Đang đỗ") ? "Trong bai" : "Da ra";

                        table.AddCell(new PdfPCell(new Phrase(vType, cellFont)) { HorizontalAlignment = Element.ALIGN_CENTER, Padding = 5 });
                        table.AddCell(new PdfPCell(new Phrase(plate, cellFont)) { HorizontalAlignment = Element.ALIGN_CENTER, Padding = 5 });
                        table.AddCell(new PdfPCell(new Phrase(timeIn, cellFont)) { HorizontalAlignment = Element.ALIGN_CENTER, Padding = 5 });
                        table.AddCell(new PdfPCell(new Phrase(timeOut, cellFont)) { HorizontalAlignment = Element.ALIGN_CENTER, Padding = 5 });
                        table.AddCell(new PdfPCell(new Phrase(stat, cellFont)) { HorizontalAlignment = Element.ALIGN_CENTER, Padding = 5 });
                    }

                    document.Add(table);
                    document.Close();

                    // Trả file PDF về dưới dạng mảng byte
                    return File(ms.ToArray(), "application/pdf", $"Bao_Cao_Lich_Su_{DateTime.Now:yyyyMMddHHmmss}.pdf");
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Lỗi khi tạo PDF: " + ex.Message });
            }
        }
    }
}
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
    public class ReportController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ReportController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("export-dashboard-pdf")]
        [Authorize]
        public async Task<IActionResult> ExportDashboardPdf()
        {
            try
            {
                // 1. TÍNH TOÁN CÁC CHỈ SỐ THỐNG KÊ (Được thực thi siêu nhanh bằng các lệnh Count của EF Core)
                int xeTrongKho = await _context.ParkingSessions.CountAsync(x => x.Status == "In" || x.Status == "Đang đỗ");
                int xeVaoHomNay = await _context.ParkingSessions.CountAsync(x => x.CheckInTime.Date == DateTime.Today);
                int xeRaHomNay = await _context.ParkingSessions.CountAsync(x => x.CheckOutTime != null && x.CheckOutTime.Value.Date == DateTime.Today);
                
                int sucChuaToiDa = 1500; // Bạn có thể truy vấn từ Settings/SystemConfigs nếu có
                double tileLapDay = sucChuaToiDa > 0 ? Math.Round((double)xeTrongKho / sucChuaToiDa * 100, 1) : 0;
                decimal doanhThuTong = await _context.ParkingSessions.SumAsync(x => x.TotalCost);

                // 2. LẤY DANH SÁCH CHI TIẾT (Lấy 100 xe mới nhất đang trong bãi để không làm tràn file PDF)
                var danhSachXe = await _context.ParkingSessions
                    .Where(x => x.Status == "In" || x.Status == "Đang đỗ")
                    .OrderByDescending(x => x.CheckInTime)
                    .Take(100)
                    .Select(x => new 
                    {
                        Plate = string.IsNullOrEmpty(x.LicensePlateIn) ? "Chưa nhận diện" : x.LicensePlateIn,
                        Type = x.VehicleTypeID == 1 ? "Ô tô" : "Xe máy",
                        TimeIn = x.CheckInTime.ToString("HH:mm - dd/MM/yyyy"),
                        Status = "Đang trong bãi"
                    })
                    .ToListAsync();

                // 3. TIẾN HÀNH VẼ FILE PDF BẰNG iTextSharp
                using (MemoryStream ms = new MemoryStream())
                {
                    // Cấu hình khổ giấy A4
                    Document doc = new Document(PageSize.A4, 25, 25, 30, 30);
                    PdfWriter writer = PdfWriter.GetInstance(doc, ms);
                    doc.Open();

                    // Tiêu đề
                    Font titleFont = FontFactory.GetFont(FontFactory.HELVETICA_BOLD, 18, BaseColor.Blue);
                    Paragraph title = new Paragraph("BAO CAO THONG KE HE THONG VISIONPARK\n", titleFont);
                    title.Alignment = Element.ALIGN_CENTER;
                    doc.Add(title);

                    Font subFont = FontFactory.GetFont(FontFactory.HELVETICA, 10, BaseColor.Gray);
                    Paragraph subtitle = new Paragraph($"Ngay xuat: {DateTime.Now:dd/MM/yyyy} - Gio: {DateTime.Now:HH:mm:ss}\n\n", subFont);
                    subtitle.Alignment = Element.ALIGN_CENTER;
                    doc.Add(subtitle);

                    // Nội dung thống kê tổng quan
                    Font textFont = FontFactory.GetFont(FontFactory.HELVETICA, 12, BaseColor.Black);
                    doc.Add(new Paragraph($"1. Tong doanh thu: {doanhThuTong:N0} VND", textFont));
                    doc.Add(new Paragraph($"2. Luu luong phuong tien ra vao trong ngay:", textFont));
                    doc.Add(new Paragraph($"   - Tong so luot xe da vao bai: {xeVaoHomNay} luot", textFont));
                    doc.Add(new Paragraph($"   - So luot xe da xuat ben (ra): {xeRaHomNay} luot", textFont));
                    doc.Add(new Paragraph($"3. Tinh trang kho chua: {xeTrongKho} / {sucChuaToiDa} xe (Dat {tileLapDay}% suc chua)\n\n", textFont));

                    // Bảng lưới danh sách
                    doc.Add(new Paragraph("DANH SACH CHI TIET CAC XE DANG TRONG BAI\n\n", FontFactory.GetFont(FontFactory.HELVETICA_BOLD, 12)));

                    PdfPTable table = new PdfPTable(4);
                    table.WidthPercentage = 100;
                    table.SetWidths(new float[] { 25f, 20f, 30f, 25f });

                    // Vẽ Tiêu đề bảng
                    Font headerFont = FontFactory.GetFont(FontFactory.HELVETICA_BOLD, 10, BaseColor.White);
                    string[] headers = { "Bien so xe", "Loai xe", "Thoi gian vao", "Trang thai" };
                    foreach (var head in headers)
                    {
                        PdfPCell cell = new PdfPCell(new Phrase(head, headerFont));
                        cell.BackgroundColor = new BaseColor(41, 128, 185);
                        cell.HorizontalAlignment = Element.ALIGN_CENTER;
                        cell.Padding = 6;
                        table.AddCell(cell);
                    }

                    // Điền dữ liệu vào bảng
                    Font rowFont = FontFactory.GetFont(FontFactory.HELVETICA, 10, BaseColor.Black);
                    foreach (var xe in danhSachXe)
                    {
                        table.AddCell(new PdfPCell(new Phrase(xe.Plate, rowFont)) { Padding = 5, HorizontalAlignment = Element.ALIGN_CENTER });
                        table.AddCell(new PdfPCell(new Phrase(xe.Type, rowFont)) { Padding = 5, HorizontalAlignment = Element.ALIGN_CENTER });
                        table.AddCell(new PdfPCell(new Phrase(xe.TimeIn, rowFont)) { Padding = 5, HorizontalAlignment = Element.ALIGN_CENTER });
                        table.AddCell(new PdfPCell(new Phrase(xe.Status, rowFont)) { Padding = 5, HorizontalAlignment = Element.ALIGN_CENTER });
                    }

                    doc.Add(table);
                    doc.Close(); // Kết thúc ghi PDF

                    // Trả File MimeType về cho Client
                    return File(ms.ToArray(), "application/pdf", $"Bao_Cao_Thong_Ke_{DateTime.Now:dd_MM_yyyy}.pdf");
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi server: {ex.Message}");
            }
        }

        [HttpGet("export-pdf")]
        [Authorize]
        public async Task<IActionResult> ExportParkingHistoryPdf(string? searchTerm, string? status)
        {
            try
            {
                var query = _context.ParkingSessions.AsQueryable();

                if (!string.IsNullOrEmpty(status) && status != "all")
                {
                    query = query.Where(s => (status == "In" ? s.CheckOutTime == null : s.CheckOutTime != null));
                }

                if (!string.IsNullOrEmpty(searchTerm))
                {
                    searchTerm = searchTerm.ToLower();
                    query = query.Where(s => s.LicensePlateIn.Contains(searchTerm) ||
                                             (s.LicensePlateOut != null && s.LicensePlateOut.Contains(searchTerm)) ||
                                             s.CardID.ToString().Contains(searchTerm));
                }

                var danhSachXe = await query
                    .OrderByDescending(x => x.CheckInTime)
                    .Take(200) // Giới hạn 200 dòng để tránh file PDF quá nặng
                    .Select(x => new 
                    {
                        Plate = string.IsNullOrEmpty(x.LicensePlateIn) ? "Chưa nhận diện" : x.LicensePlateIn,
                        Type = x.VehicleTypeID == 1 ? "Ô tô" : "Xe máy",
                        TimeIn = x.CheckInTime.ToString("HH:mm - dd/MM/yyyy"),
                        Status = x.CheckOutTime == null ? "Đang trong bãi" : "Đã xuất bến"
                    })
                    .ToListAsync();

                using (MemoryStream ms = new MemoryStream())
                {
                    Document doc = new Document(PageSize.A4, 25, 25, 30, 30);
                    PdfWriter writer = PdfWriter.GetInstance(doc, ms);
                    doc.Open();

                    Font titleFont = FontFactory.GetFont(FontFactory.HELVETICA_BOLD, 18, BaseColor.Blue);
                    Paragraph title = new Paragraph("BAO CAO LICH SU DO XE\n", titleFont);
                    title.Alignment = Element.ALIGN_CENTER;
                    doc.Add(title);

                    Font subFont = FontFactory.GetFont(FontFactory.HELVETICA, 10, BaseColor.Gray);
                    Paragraph subtitle = new Paragraph($"Ngay xuat: {DateTime.Now:dd/MM/yyyy} - Gio: {DateTime.Now:HH:mm:ss}\n\n", subFont);
                    subtitle.Alignment = Element.ALIGN_CENTER;
                    doc.Add(subtitle);

                    PdfPTable table = new PdfPTable(4);
                    table.WidthPercentage = 100;
                    table.SetWidths(new float[] { 25f, 20f, 30f, 25f });

                    Font headerFont = FontFactory.GetFont(FontFactory.HELVETICA_BOLD, 10, BaseColor.White);
                    string[] headers = { "Bien so xe", "Loai xe", "Thoi gian vao", "Trang thai" };
                    foreach (var head in headers)
                    {
                        PdfPCell cell = new PdfPCell(new Phrase(head, headerFont));
                        cell.BackgroundColor = new BaseColor(41, 128, 185);
                        cell.HorizontalAlignment = Element.ALIGN_CENTER;
                        cell.Padding = 6;
                        table.AddCell(cell);
                    }

                    Font rowFont = FontFactory.GetFont(FontFactory.HELVETICA, 10, BaseColor.Black);
                    foreach (var xe in danhSachXe)
                    {
                        table.AddCell(new PdfPCell(new Phrase(xe.Plate, rowFont)) { Padding = 5, HorizontalAlignment = Element.ALIGN_CENTER });
                        table.AddCell(new PdfPCell(new Phrase(xe.Type, rowFont)) { Padding = 5, HorizontalAlignment = Element.ALIGN_CENTER });
                        table.AddCell(new PdfPCell(new Phrase(xe.TimeIn, rowFont)) { Padding = 5, HorizontalAlignment = Element.ALIGN_CENTER });
                        table.AddCell(new PdfPCell(new Phrase(xe.Status, rowFont)) { Padding = 5, HorizontalAlignment = Element.ALIGN_CENTER });
                    }

                    doc.Add(table);
                    doc.Close();
                    return File(ms.ToArray(), "application/pdf", $"Lich_Su_Do_Xe_{DateTime.Now:dd_MM_yyyy}.pdf");
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi server: {ex.Message}");
            }
        }
    }
}
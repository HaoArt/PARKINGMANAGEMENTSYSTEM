# BÁO CÁO PHÂN TÍCH VÀ KIỂM TRA LOGIC NGHIỆP VỤ - HỆ THỐNG VISIONPARK

Dựa trên việc phân tích mã nguồn toàn bộ dự án, dưới đây là các đánh giá về điểm chưa hợp lý, lỗi logic (bugs) và các thiếu sót trong luồng nghiệp vụ của hệ thống:

## 1. Lỗi logic tính toán doanh thu trên Dashboard (`dashboard.page.ts`)

- **Vấn đề:** Biến `revenueToday` được sử dụng để hiển thị "Doanh thu hôm nay". Tuy nhiên, logic trong hàm `loadDataFromDatabase()` và `loadMonthlyTicketsRevenue()` lại đang gọi API để tải **toàn bộ dữ liệu từ trước đến nay** (lịch sử lượt xe và danh sách toàn bộ vé tháng), sau đó dùng vòng lặp cộng dồn tại Client (Frontend).
- **Hệ quả:**
  - Con số hiển thị thực chất là "Tổng doanh thu toàn thời gian" chứ không phải doanh thu riêng lẻ của ngày hôm nay.
  - Khi bãi xe có lượng dữ liệu lớn (hàng trăm nghìn lượt xe sau vài tháng), việc gọi toàn bộ danh sách về Client để tính toán sẽ làm treo trình duyệt (Out of memory) và gây nghẽn băng thông.
- **Đề xuất:** Cần viết một API riêng biệt ở Backend (ví dụ `GET /api/Dashboard/summary?date=...`) để sử dụng SQL (hàm `SUM()`, `COUNT()`) tính toán và chỉ trả về các con số tổng.

## 2. Logic nhận diện khuôn mặt chấm công lãng phí tài nguyên và rủi ro (`FaceScanController.cs`)

- **Vấn đề:** Trong hàm `RecognizeFace`, hệ thống thực hiện truy vấn `var registeredUsers = await _context.Users...ToListAsync();`. Sau đó dùng AI (FaceRecognitionDotNet) để so sánh khuôn mặt vừa quét với **tất cả nhân viên trong hệ thống (So sánh 1-N)**. Sau khi tính toán xong, hệ thống mới kiểm tra xem ID tìm được có khớp với `loggedInUserId` (Lấy từ Token) hay không.
- **Hệ quả:**
  - Cực kỳ lãng phí tài nguyên CPU của Server. Nếu có 100 nhân viên, AI phải tính `FaceDistance` 100 lần.
  - Rủi ro sinh ra sai số (False Positive) rất cao khi số lượng nhân viên tăng lên.
- **Đề xuất:** Vì request gọi API đã gắn Token (`loggedInUserId`), hệ thống đã biết chính xác tài khoản nào đang thao tác. Chỉ cần truy vấn đúng 1 bản ghi `User` đó từ Database và so sánh khuôn mặt 1-1. Thuật toán sẽ chạy nhanh hơn gấp nhiều lần.

## 3. Lỗi Deadlock trong quản lý gia hạn Vé tháng (`TicketController.cs`)

- **Vấn đề:** Trong hàm `RegisterMonthly`, hệ thống chặn thẻ bị trùng lặp thông qua câu lệnh: `_context.MonthlyTickets.AnyAsync(t => t.CardID == card.CardID && t.IsActive)`.
- **Hệ quả:** Nếu một vé tháng đã **hết hạn** (`EndDate < DateTime.Now`) nhưng trường `IsActive` vẫn lưu giá trị `true` trong DB (do hệ thống thiếu Background Service định kỳ dọn dẹp data), thì thẻ NFC đó sẽ bị khóa cứng (deadlock). Khách hàng không thể tái sử dụng thẻ này để gia hạn vé mới, dù vé cũ đã vô giá trị.
- **Đề xuất:** Logic chặn trùng lặp cần tính đến ngày hết hạn: `AnyAsync(t => t.CardID == card.CardID && t.IsActive && t.EndDate >= DateTime.Now)`.

## 4. Xóa tài khoản nhân viên thiếu logic tự bảo vệ (`UsersController.cs`)

- **Vấn đề:** API `DeleteUser` có kiểm tra chặn không cho xóa tài khoản mang Role "Admin" (`if (user.Role == "Admin") return BadRequest...`).
- **Hệ quả:** Tuy nhiên, hệ thống lại thiếu logic kiểm tra **người dùng có đang tự xóa chính tài khoản của mình hay không**. Nếu một user (hoặc Admin bị đổi role) lỡ tay ấn xóa tài khoản đang đăng nhập, nó sẽ dẫn tới lỗi Session và bị văng khỏi hệ thống.
- **Đề xuất:** Cần lấy `UserID` từ JWT Token của người gửi Request và chặn hành động: `if (user.UserID == currentUserId) return BadRequest("Không thể tự xóa tài khoản của chính bạn!");`.

## 5. Xuất báo cáo PDF không phản ánh đúng tổng thể (`dashboard.page.ts`)

- **Vấn đề:** Hàm `exportReport()` render báo cáo PDF bằng dữ liệu từ mảng `this.filteredRecords` của Client.
- **Hệ quả:** Frontend của bạn (trong `history.page.ts`) đang giới hạn gọi `pageSize: 1000`. Điều này có nghĩa file PDF tải về sẽ luôn bị giới hạn ở 1000 lượt xe đầu tiên. Những lượt xe vượt quá con số này sẽ bị bỏ sót, làm báo cáo trở nên vô nghĩa với hệ thống lớn.
- **Đề xuất:** Thay vì vẽ PDF ở Client, luồng xuất báo cáo nên được di chuyển về `.NET Backend` (sử dụng các thư viện như iTextSharp/QuestPDF). Client chỉ gọi API và nhận về file `.pdf` hoàn chỉnh dựa trên khoảng thời gian lọc (FromDate -> ToDate).

## 6. Lộ lọt thông tin Cấu hình và Bảng giá (`SettingsController.cs`)

- **Vấn đề:** API `GetSettings` đang được gắn cờ `[AllowAnonymous]`.
- **Hệ quả:** Mọi đối tượng trên internet, ngay cả khi không có tài khoản, đều có thể truy cập đường dẫn này và biết được toàn bộ "Bảng giá gửi xe" (`PricingRules`), sức chứa của bãi và các thông tin cấu hình nội bộ khác.
- **Đề xuất:** Nên chia API này thành 2 hàm: Một hàm `[AllowAnonymous]` chỉ trả về những thứ công khai (như chỗ trống hiện tại), và một hàm yêu cầu `[Authorize]` để lấy bảng giá và các thông tin quản trị.

## 7. Các hạn chế và rủi ro tiềm ẩn khác (Cần khắc phục cho bản Production)

### 7.1. Lưu trữ hình ảnh Base64 trực tiếp vào Database (Rất nghiêm trọng)
- **Vấn đề:** Trong `FaceScanController.cs`, toàn bộ chuỗi Base64 của hình ảnh được lưu trực tiếp vào CSDL SQL (cột `FaceImageUrl` và `ImageData`).
- **Hệ quả:** Làm phình to dung lượng Database cực kỳ nhanh chóng. Gây nghẽn cổ chai (Bottleneck) băng thông mạng và cạn kiệt RAM của máy chủ khi thực hiện các truy vấn danh sách (VD: `ToListAsync()`).
- **Đề xuất:** Phải lưu hình ảnh dưới dạng file vật lý (vào thư mục `wwwroot/images` hoặc Cloud Storage như AWS S3), sau đó chỉ lưu **đường dẫn (URL)** vào Database.

### 7.2. Hardcode URL và các tham số môi trường
- **Vấn đề:** Trong `TicketController.cs`, đường dẫn gọi sang dịch vụ Python AI đang bị gán cứng: `http://localhost:8000/api/recognize-plate`.
- **Hệ quả:** Khi deploy lên Server thực tế (môi trường Production), IP hoặc Port thay đổi sẽ khiến luồng này thất bại, buộc phải sửa code và build lại toàn bộ dự án.
- **Đề xuất:** Cần chuyển các cấu hình này vào file `appsettings.json` và gọi thông qua Dependency Injection (`IConfiguration`).

### 7.3. Rủi ro bảo mật sao chép thẻ NFC
- **Vấn đề:** Hệ thống chỉ đang định danh thẻ thông qua `CardUID` (Mã định danh phần cứng vật lý) trong `ParkingController.cs`.
- **Hệ quả:** Kẻ gian có thể dễ dàng dùng các thiết bị giá rẻ hoặc điện thoại Android đã root để sao chép (Clone) UID sang một thẻ trắng, từ đó lấy cắp xe trong bãi.
- **Đề xuất:** Cần triển khai ghi dữ liệu mã hóa (Mật khẩu Sector / Block) trực tiếp lên chip của thẻ Mifare thay vì chỉ đọc mỗi UID.

### 7.4. Nút thắt cổ chai AI tại CPU Server
- **Vấn đề:** Các thuật toán nặng như Face Recognition đang được xử lý 100% bằng CPU của máy chủ Backend.
- **Hệ quả:** Nếu có nhiều nhân viên quẹt khuôn mặt cùng lúc, CPU sẽ đạt đỉnh (100%), gây Timeout cho toàn bộ các API khác (kể cả API quẹt thẻ xe).
- **Đề xuất:** Nên đưa luồng AI lên Cloud có hỗ trợ GPU, hoặc cấu hình xử lý bất đồng bộ (Message Queue) cho các tác vụ không yêu cầu thời gian thực.

### 7.5. Thiếu cơ chế Database Lock (Transaction) khi Check-in/Check-out
- **Vấn đề:** Hàm `ScanCard` đọc và ghi `ParkingSession` mà không có cơ chế khóa.
- **Hệ quả (Race Condition):** Nếu mạng bị lag và thiết bị gửi 2 request cùng lúc, hệ thống có thể tạo ra 2 bản ghi Check-in cho cùng 1 xe gây xung đột.
- **Đề xuất:** Cần sử dụng Database Transaction hoặc Semaphore để khóa luồng xử lý theo `CardID`.

---

**TỔNG KẾT:**
Kiến trúc của VisionPark được thiết kế khá tốt khi tách bạch xử lý AI (Python) và Backend (.NET). Các công nghệ Front-End (Angular/Ionic) rất phù hợp cho ứng dụng di động máy quét.
Tuy nhiên, bạn đang mắc một lỗi thiết kế phổ biến: **"Dịch chuyển quá nhiều logic xử lý dữ liệu và tính toán lên Client"**. Cần quy hoạch lại việc tính toán doanh thu, render file PDF và đối chiếu dữ liệu vào tay của Database / Backend API để đảm bảo sự ổn định, an toàn và bảo mật cho hệ thống thực tế.

**LƯU Ý KHI ĐƯA VÀO VẬN HÀNH THỰC TẾ (PRODUCTION):** 
Hãy ưu tiên giải quyết ngay vấn đề **lưu ảnh Base64 vào Database** và **thiết kế lại cơ chế bảo mật thẻ NFC (Mật khẩu Sector)** để tránh rủi ro sập hệ thống và mất an toàn tài sản.

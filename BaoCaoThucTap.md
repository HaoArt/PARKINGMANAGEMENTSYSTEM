# PHẦN: BÁO CÁO THỰC TẬP HỆ THỐNG QUẢN LÝ BÃI GIỮ XE VISIONPARK

## CHƯƠNG 1: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

### 1.1 Tổng quan kiến trúc hệ thống

Hệ thống quản lý bãi giữ xe thông minh VisionPark được thiết kế theo mô hình Client-Server hiện đại, phân tách rõ ràng giữa giao diện người dùng và xử lý nghiệp vụ:

- **Frontend (Ứng dụng Client):** Được xây dựng bằng framework Angular kết hợp với thư viện UI Ionic, cho phép triển khai hệ thống đa nền tảng (Web App, Android, iOS). Đặc biệt, hệ thống tận dụng các plugin của Capacitor/Cordova (như `@awesome-cordova-plugins/nfc`) để biến điện thoại di động thành máy quét thẻ từ NFC, tiết kiệm chi phí đầu tư phần cứng chuyên dụng.
- **Backend (API Server):** Xây dựng trên nền tảng .NET Core (C#) áp dụng chuẩn kiến trúc RESTful API, giao tiếp với cơ sở dữ liệu SQL thông qua Entity Framework Core. Hệ thống bảo mật các phiên làm việc bằng JSON Web Token (JWT) và mã hóa mật khẩu bằng thuật toán BCrypt.
- **Microservices AI:** Để tối ưu hóa hiệu năng, tính năng nhận diện biển số xe bằng AI được tách riêng thành một dịch vụ độc lập viết bằng Python, giao tiếp với .NET Backend thông qua các luồng gọi HTTP API.

### 1.2 Chi tiết các lớp kiến trúc (Architecture Layers)

Để đảm bảo tính mở rộng, dễ bảo trì và hiệu suất cao, hệ thống được thiết kế theo kiến trúc đa tầng (N-Tier Architecture) kết hợp Microservices cho các tác vụ nặng:

- **Lớp trình diễn (Presentation Layer):** Bao gồm ứng dụng phát triển trên nền tảng **Angular** và **Ionic**. Lớp này quản lý giao diện tương tác (như Dashboard, Timekeeping, Check-in), hiển thị số liệu thống kê realtime, và giao tiếp trực tiếp với phần cứng máy khách (Camera, cảm biến NFC).
- **Lớp nghiệp vụ (Business Logic Layer):** Xây dựng bằng **C# .NET Core Web API**. Lớp này đóng vai trò trung tâm điều phối, xử lý logic kiểm tra thẻ từ, tính toán doanh thu, chốt phiên đỗ xe (Parking Session), và bảo mật phân quyền.
- **Lớp dịch vụ AI (AI Services Layer):** Được phân chia thành 2 luồng xử lý độc lập:
  - _Microservice AI Python (FastAPI):_ Xử lý chuyên sâu nhận diện biển số xe. Sử dụng mô hình **YOLO** để cắt khung biển số, **EasyOCR** để đọc ký tự, kết hợp thuật toán Regex xử lý logic định dạng biển số xe Việt Nam.
  - _Module AI .NET:_ Tích hợp trong Backend qua **OpenCV** (Haar Cascade) để phát hiện khuôn mặt realtime và **FaceRecognitionDotNet** (dựa trên nhân Dlib) để đối chiếu danh tính.
- **Lớp dữ liệu (Data Access Layer):** Sử dụng **Entity Framework Core** làm cầu nối ORM (Object-Relational Mapping) tương tác với cơ sở dữ liệu SQL. Lớp này thực hiện truy vấn và quản lý các bảng thực thể cốt lõi bao gồm: `Users`, `NfcCards`, `MonthlyTickets`, `ParkingSessions`, và `Attendances`.

### 1.3 Phân tích chi tiết kỹ thuật Frontend & Backend

Dựa trên thực tế mã nguồn triển khai, hệ thống áp dụng nhiều kỹ thuật lập trình nâng cao để tối ưu hiệu năng và trải nghiệm người dùng:

**a. Phía Frontend (Angular & Ionic):**

- **Kiến trúc Standalone Components:** Tận dụng tối đa tính năng Standalone Component của Angular, giảm thiểu sự phụ thuộc vào các module cồng kềnh, giúp ứng dụng nhẹ, load nhanh hơn và dễ bảo trì.
- **Bảo mật & Phân quyền phía Client:** Sử dụng cơ chế Route Guards (`CanActivateFn`) kết hợp đọc Token/Role từ LocalStorage. Tự động kiểm tra quyền truy cập của người dùng đối với từng trang, nếu không hợp lệ sẽ chặn luồng và điều hướng an toàn.
- **Tối ưu hóa UI/UX:** Tích hợp Tailwind CSS cùng các tùy chỉnh CSS sâu (`global.scss`). Giao diện đồng bộ font chữ `Inter` hiện đại, thanh cuộn (Scrollbar) được ẩn tinh tế tạo cảm giác trải nghiệm như Native App. Các thông báo (Toast) được thiết kế nổi bật với bóng đổ 3D, z-index cao, khắc phục hoàn toàn tình trạng mờ/chìm thông báo trên các thiết bị mobile.
- **Xử lý tác vụ nặng tại Client:** Trực tiếp truy xuất phần cứng Camera thông qua `navigator.mediaDevices`, sử dụng `Canvas API` để vẽ khung nhận diện khuôn mặt (Bounding Box) realtime ngay trên trình duyệt. Các báo cáo PDF phức tạp cũng được kết xuất ngay tại thiết bị của người dùng thông qua `jsPDF`, giảm tải đáng kể cho Server.

**b. Phía Backend (.NET Core API):**

- **Bảo mật xác thực & Băm mật khẩu:** Các luồng API được bảo vệ bằng JSON Web Token (JWT). Mật khẩu của người dùng được mã hóa một chiều an toàn qua thuật toán `BCrypt`. Hệ thống còn tích hợp cơ chế Fallback thông minh để tự động mã hóa lại nếu phát hiện mật khẩu cũ trong DB chưa đúng định dạng an toàn.
- **Quản lý bộ nhớ với Singleton Pattern:** Để giải quyết bài toán tràn RAM do khởi tạo mô hình AI liên tục, Backend áp dụng triệt để design pattern Singleton kết hợp cơ chế khóa luồng đa nhiệm (`lock (_aiLock)`). Mô hình `FaceRecognitionDotNet` chỉ được nạp vào bộ nhớ duy nhất một lần, giúp tốc độ trích xuất đặc trưng khuôn mặt diễn ra trong tíc tắc.
- **Logic chống Spam thông minh:** Thuật toán ghi nhận điểm danh có kết hợp kiểm tra thời gian làm mát (Cooldown time). Nếu nhân viên quét khuôn mặt liên tục dưới ngưỡng quy định (ví dụ 1 phút), hệ thống sẽ chặn ghi nhận bản ghi rác nhưng vẫn trả về luồng thông báo thân thiện, đảm bảo dữ liệu chấm công tuyệt đối chính xác.

### 1.4 Phân tích quy trình nghiệp vụ hệ thống

Hệ thống VisionPark tự động hóa và quản lý khép kín 3 luồng nghiệp vụ chính:

**a. Quy trình kiểm soát phương tiện ra/vào (Parking Management)**

- **Lượt vào (Check-in):** Khi xe tiến vào, nhân viên dùng thiết bị di động quét thẻ NFC. Mã thẻ (UID) được gửi lên API. Hệ thống xác thực thẻ, kiểm tra thông tin vé tháng gắn với thẻ (nếu có). Trạng thái phiên đỗ xe (Parking Session) mới được tạo để ghi nhận thời gian vào, biển số xe và loại phương tiện, đồng thời ra lệnh mở Barie.
- **Lượt ra (Check-out):** Khi xe ra khỏi bãi, thao tác quét thẻ được lặp lại. Hệ thống tìm kiếm phiên đỗ xe đang mở (Active Session) của thẻ đó, tính toán chi phí dựa trên bảng giá quy định (Pricing Rules) và chốt thời gian xuất bến.

**b. Quy trình đăng ký vé tháng (Monthly Ticket Registration)**

- Khách hàng đăng ký vé tháng bằng cách nhập thông tin cơ bản và chụp ảnh phương tiện.
- Ứng dụng Client sẽ đóng gói thông tin và ảnh chụp gửi lên .NET Backend. Tại đây, Backend (thông qua `HttpClient`) sẽ gọi giao tiếp sang dịch vụ Python xử lý AI để bóc tách biển số xe tự động. Sau đó, Backend nhận kết quả trả về, liên kết thông tin biển số và định mức thời gian với mã thẻ NFC, cuối cùng lưu trữ vào cơ sở dữ liệu SQL.

**c. Quy trình nhận diện khuôn mặt và chấm công nhân sự**

- Nhân viên chụp ảnh thực tế qua ứng dụng. Ảnh dạng Base64 được gửi về Server C#.
- Thuật toán phát hiện khuôn mặt và so sánh với kho dữ liệu mẫu. Nếu độ sai số (Face Distance) nằm trong ngưỡng an toàn, hệ thống ghi nhận danh tính và tạo bản ghi chấm công. Hệ thống có thiết lập khoảng thời gian chờ (Cooldown time 1 phút) nhằm ngăn chặn tình trạng chấm công rác/spam.

### 1.5 Ứng dụng công nghệ Trí tuệ nhân tạo (AI)

Hệ thống tích hợp sâu AI tại Backend để tăng cường tính tự động hóa:

- **Nhận diện khuôn mặt (.NET):** Sử dụng `CascadeClassifier` của thư viện OpenCV để xác định tọa độ khung mặt trong ảnh (Face Detection). Quá trình đối chiếu danh tính được thực hiện thông qua mô hình Deep Learning từ thư viện `FaceRecognitionDotNet` (nhân lõi Dlib). Để tránh tình trạng tràn RAM và chậm phản hồi, mô hình AI được thiết kế theo pattern Singleton, chỉ khởi tạo một lần duy nhất.
- **Nhận diện biển số:** Frontend chỉ đóng vai trò thu thập hình ảnh. Ảnh phương tiện thực tế được .NET Backend tiếp nhận, sau đó gọi API chuyển tiếp dạng luồng (Stream FormData) sang dịch vụ AI Python tại cổng localhost:8000. Dịch vụ Python sẽ xử lý nhận dạng ký tự quang học (OCR) và trả JSON kết quả về lại cho C# xử lý nghiệp vụ.

---

## CHƯƠNG 2: TRIỂN KHAI, KẾT QUẢ ĐẠT ĐƯỢC VÀ ĐÁNH GIÁ

### 2.1 Quá trình triển khai thực tế

- **Môi trường Server:** Mã nguồn .NET Web API được cấu hình kết nối với CSDL, chạy đồng thời với dịch vụ nhận diện ảnh Python. Các mô hình máy học (như file xml Haar Cascade và Dlib models) được nạp trực tiếp vào thư mục Models trên Server.
- **Môi trường thiết bị trạm (Client):** Ứng dụng Angular/Ionic được biên dịch sang định dạng APK để cài đặt trên điện thoại Android của bảo vệ. Ứng dụng yêu cầu quyền truy cập NFC phần cứng và Camera để thực thi các tác vụ kiểm soát xe và chấm công nhân viên.

### 2.2 Kết quả đạt được

Dự án đã hoàn thiện và đáp ứng đúng các yêu cầu nghiệp vụ đặt ra ban đầu:

- **Giao diện Dashboard trực quan:** Xây dựng thành công màn hình Tổng quan thống kê tự động các chỉ số theo thời gian thực (Lưu lượng xe trong bãi, Tổng doanh thu vé lượt và vé tháng, Tỷ lệ lấp đầy bãi đỗ).
- **Kiểm soát thẻ NFC ổn định:** Logic đọc thẻ NFC hoạt động mượt mà. Hệ thống có cơ chế kiểm soát chống nhiễu/quét đúp (thời gian khóa quẹt thẻ 2000ms), giúp bảo vệ không bị lỗi khi người dùng giữ thẻ quá lâu ở mặt lưng điện thoại.
- **Xuất báo cáo PDF linh hoạt:** Tích hợp thư viện `jspdf` và `jspdf-autotable` để tự động khởi tạo và kết xuất báo cáo thống kê giao dịch theo ngày trực tiếp trên máy khách, tiết kiệm tài nguyên Server.
- **Trải nghiệm người dùng:** Giao diện ứng dụng bám sát nguyên tắc thiết kế hiện đại, phối hợp font chữ Inter, hiển thị các thông báo (Toast) dạng nổi 3D, cung cấp trải nghiệm sử dụng mượt mà, chuyên nghiệp.

### 2.3 Đánh giá hệ thống

**a. Ưu điểm nổi bật:**

- **Tối ưu chi phí hạ tầng:** Bằng cách biến các smartphone có NFC thành máy quét thẻ, hệ thống giảm thiểu tối đa chi phí mua sắm đầu đọc thẻ từ và máy tính trạm truyền thống.
- **Kiến trúc bền vững:** Việc tách riêng biệt dịch vụ AI Python và Server C# giúp giảm tải cho Server chính, không gây sập hệ thống quản lý dữ liệu khi dịch vụ xử lý ảnh bị nghẽn.
- **Độ an toàn cao:** Có cơ chế liên kết khuôn mặt với tài khoản đăng nhập (Token JWT), ngăn chặn triệt để tình trạng nhân viên chấm công hộ hoặc mượn tài khoản.

**b. Hạn chế còn tồn tại:**

- Thuật toán nhận diện khuôn mặt và nhận diện biển số vẫn chịu ảnh hưởng nhiều từ điều kiện môi trường như: góc chụp, thiếu sáng hoặc lóa camera.
- Xử lý AI trên Backend thông qua CPU của máy chủ sẽ chậm hơn đáng kể so với máy chủ được trang bị Card đồ họa (GPU) chuyên dụng, đặc biệt khi lượng truy cập tăng đột biến.

**c. Hướng phát triển trong tương lai:**

- **Nâng cấp Camera tự động (LPR/ANPR):** Kết nối trực tiếp hệ thống với các IP Camera gắn tại cổng Barie để tự động bắt biển số xe không cần người dùng thao tác chụp ảnh, nâng cao tốc độ lưu thông xe.
- **Tích hợp thanh toán số:** Bổ sung phương thức hiển thị mã QR Code chuyển khoản tự động hoặc liên kết Ví điện tử vào màn hình Check-out để khách hàng thanh toán linh hoạt hơn.
- **Tối ưu AI bằng Cloud Computing:** Đẩy các dịch vụ nhận diện khuôn mặt và biển số lên hệ thống Cloud Server hỗ trợ GPU để giảm thời gian trễ xuống mức mili-giây (ms).

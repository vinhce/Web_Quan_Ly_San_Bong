# TÀI LIỆU TOÀN DIỆN DỰ ÁN SÂN BÓNG PRO (SANBONGPRO.VN)
### HỆ THỐNG QUẢN LÝ ĐẶT SÂN VÀ VẬN HÀNH TỔ HỢP THỂ THAO THÔNG MINH

---

## 📌 MỤC LỤC TỔNG QUAN

1. [GIỚI THIỆU TỔNG QUAN & MÔ HÌNH VẬN HÀNH](#1-giới-thiệu-tổng-quan--mô-hình-vận-hành)
2. [YÊU CẦU NGHIỆP VỤ & TÍNH NĂNG NGƯỜI DÙNG (PRD)](#2-yêu-cầu-nghiệp-vụ--tính-năng-người-dùng-prd)
3. [KIẾN TRÚC HỆ THỐNG & CÔNG NGHỆ (SYSTEM ARCHITECTURE)](#3-kiến-trúc-hệ-thống--công-nghệ-system-architecture)
4. [PHÂN HỆ QUẢN TRỊ TRUNG TÂM (PORTAL ADMIN - 11 PHÂN HỆ)](#4-phân-hệ-quản-trị-trung-tâm-portal-admin---11-phân-hệ)
5. [CHUYÊN ĐỀ: CHUẨN HÓA CRM HỘI VIÊN & QUY CHUẨN XÓA BỎ CÔNG NỢ](#5-chuyên-đề-chuẩn-hóa-crm-hội-viên--quy-chuẩn-xóa-bỏ-công-nợ)
6. [HỆ THỐNG AN TOÀN THÔNG TIN, BẢO MẬT & PHÂN QUYỀN (RBAC & SECURITY)](#6-hệ-thống-an-toàn-thông-tin-bảo-mật--phân-quyền-rbac--security)
7. [QUY CHUẨN THIẾT KẾ & TRẢI NGHIỆM NGƯỜI DÙNG (DESIGN SYSTEM & UI/UX)](#7-quy-chuẩn-thiết-kế--trải-nghiệm-người-dùng-design-system--uiux)
8. [DANH MỤC TÀI KHOẢN HỆ THỐNG & HƯỚNG DẪN VẬN HÀNH](#8-danh-mục-tài-khoản-hệ-thống--hướng-dẫn-vận-hành)

---

## 1. GIỚI THIỆU TỔNG QUAN & MÔ HÌNH VẬN HÀNH

### 1.1. Bối Cảnh & Thông Tin Dự Án
**Sân Bóng Pro** là giải pháp phần mềm quản lý vận hành tổ hợp thể thao toàn diện, được thiết kế chuyên biệt cho các cụm sân bóng đá cỏ nhân tạo quy mô lớn tại Việt Nam. Hệ thống kết hợp giữa nền tảng đặt sân trực tuyến thời gian thực dành cho khách hàng và cổng quản trị vận hành đa phân hệ (Portal Admin) dành cho đội ngũ quản lý, thu ngân và điều hành sân.

- **Đơn vị chủ quản:** Tổ hợp thể thao Sân Bóng Pro Mỹ Đình.
- **Địa chỉ thực tế:** Số 18 Lê Đức Thọ, Phường Mỹ Đình 1, Quận Nam Từ Liêm, TP. Hà Nội.
- **Hotline hỗ trợ:** `0352.313.548` | **Email:** `hotro@sanbongpro.vn`.
- **Hạ tầng cơ sở:** 17 sân bóng đá cỏ nhân tạo chuẩn FIFA (bao gồm các loại sân 5 người, 7 người và 11 người đạt tiêu chuẩn quốc tế).
- **Khung giờ vận hành:** 18 khung giờ mỗi ngày, liên tục từ `05:30` sáng đến `23:00` đêm.
- **Tên miền hoạt động chính thức:**
  - Cổng thông tin khách hàng & đặt sân: `https://fxzioyr.id.vn/`
  - Cổng quản trị vận hành tập trung: `https://fxzioyr.id.vn/portal-admin/`

### 1.2. Tuyên Ngôn Sứ Mệnh & Vấn Đề Giải Quyết
Trước khi triển khai Sân Bóng Pro, việc vận hành cụm sân truyền thống gặp phải nhiều thách thức:
1. **Trùng lịch thi đấu (Double Booking):** Nhân viên ghi chép sổ sách hoặc tin nhắn Zalo dẫn đến việc hai đội bóng đến cùng một khung giờ.
2. **Khách đặt ảo và bùng sân (No-Show):** Khách đặt miệng nhưng không đến, gây thiệt hại doanh thu trong các khung giờ cao điểm (giờ vàng).
3. **Thất thoát tài chính & Công nợ dây dưa:** Không kiểm soát được dòng tiền mặt, thanh toán chuyển khoản thủ công chậm trễ, nợ tiền sân kéo dài khó thu hồi.
4. **Quy trình check-in thủ công rườm rà:** Khách phải chờ đợi đối soát giấy tờ hoặc lịch sử tin nhắn tại quầy lễ tân.

**Sứ mệnh của Sân Bóng Pro:**
Tự động hóa 100% quy trình từ khi khách hàng tìm sân, đặt cọc VietQR trực tuyến, nhận vé điện tử QR Code, đến lúc check-in tại quầy, sử dụng dịch vụ phụ trợ và đánh giá sau trận đấu; đồng thời trao quyền kiểm soát minh bạch, chặt chẽ cho ban quản lý cụm sân.

### 1.3. Mô Hình Kinh Doanh Cốt Lõi
Hệ thống áp dụng chính sách dòng tiền thông minh và triệt tiêu rủi ro tài chính:
- **Chính sách đặt cọc 30% trực tuyến:** Khách hàng bắt buộc chuyển khoản đặt cọc 30% giá trị ca đá qua mã VietQR động có chứa mã hóa đơn tự động. Hệ thống SePay webhook đối soát tự động ghi nhận giữ chỗ trong vòng 3 giây.
- **Thanh toán 70% còn lại tại quầy:** Khi đến nhận sân thi đấu, khách hàng quét vé QR hoặc đọc số điện thoại để thanh toán nốt phần tiền còn lại (bằng tiền mặt hoặc quét mã VietQR quầy) và được nhân viên đóng đơn.
- **Quy tắc Vận Hành Tuyệt Đối — KHÔNG CÓ CÔNG NỢ:** Sân Bóng Pro vận hành theo tôn chỉ *"Thanh toán dứt điểm khi nhận sân"*. Hệ thống loại bỏ hoàn toàn khái niệm công nợ đọng, không cho phép khách rời sân khi chưa hoàn tất 100% chi phí. Đơn chỉ được chuyển trạng thái "Hoàn thành" khi đã thu đủ tiền.

---

## 2. YÊU CẦU NGHIỆP VỤ & TÍNH NĂNG NGƯỜI DÙNG (PRD)

### 2.1. Đối Tượng Người Dùng & Phân Quyền
1. **Khách hàng vãng lai & Hội viên (Players / Teams):** Đặt sân trực tuyến, quản lý lịch sử thi đấu, quét vé check-in, tích điểm đổi quà, ghép kèo tìm đối thủ.
2. **Nhân viên trực quầy / Lễ tân (Staff):** Quét mã QR check-in vào sân, tạo đơn đặt sân nhanh tại quầy (POS Quick Booking), bán nước/phụ kiện, thu tiền mặt và chốt ca trực.
3. **Quản lý vận hành (Manager):** Điều phối ca đá trên Timeline Gantt Chart, xử lý bù giờ, đổi sân, kiểm duyệt bài đăng ghép kèo, giám sát lịch bảo trì mặt cỏ.
4. **Quản trị viên cấp cao (Admin / Super Admin):** Toàn quyền cấu hình giá theo giờ vàng, thiết lập tài khoản nhân viên, xem báo cáo tài chính chuyên sâu và tra cứu nhật ký kiểm toán (Audit Log).

### 2.2. Chi Tiết Tính Năng Phân Hệ Khách Hàng

#### 2.2.1. Đặt Sân Trực Tuyến & Ma Trận Khung Giờ Realtime
- Khách hàng xem lịch trống trực quan của 17 sân bóng theo ngày được chọn.
- Mỗi ngày chia làm 18 khung giờ (từ 05:30 đến 23:00, mỗi ca kéo dài 60 - 90 phút).
- Hệ thống hiển thị minh bạch 4 trạng thái theo màu sắc: *Trống (Available)*, *Đang chọn*, *Đã có người đặt cọc (Booked)*, *Đang thi đấu (In-Play)*, *Bảo trì (Maintenance)*.
- Hỗ trợ tính năng **Đặt Gói Tháng (Recurring Booking)**: Cho phép các đội bóng cố định khung giờ hàng tuần trong suốt 1 tháng đến 6 tháng, tự động tính tổng tiền và áp dụng chiết khấu hội viên.

#### 2.2.2. Cổng Thanh Toán VietQR Tự Động (Tích Hợp SePay API v2)
- Khi khách hàng xác nhận đặt ca, hệ thống tạo mã giao dịch chuẩn hóa theo loại sân:
  - Sân 5 người: Mã tiền tố `ASFF` + 6 chữ số ngẫu nhiên (Ví dụ: `ASFF892145`).
  - Sân 7 người: Mã tiền tố `ASFS` + 6 chữ số ngẫu nhiên (Ví dụ: `ASFS482103`).
  - Sân 11 người: Mã tiền tố `ASFE` + 6 chữ số ngẫu nhiên (Ví dụ: `ASFE129481`).
- Hiển thị Popup mã VietQR động chứa chính xác số tiền cọc 30% và cú pháp chuyển khoản.
- Tích hợp SePay Webhook nhận tín hiệu biến động số dư ngân hàng qua kết nối bảo mật HMAC SHA256:
  - Tự động xác thực số tiền và mã đơn hàng trong nội dung chuyển khoản.
  - Tự động chuyển trạng thái đơn sang **Đã cọc (Confirmed)** chỉ trong 1 - 3 giây mà không cần con người can thiệp.
  - Tự động hoàn tiền hoặc gửi thông báo cảnh báo nếu khách chuyển thiếu hoặc chuyển sai mã đơn.

#### 2.2.3. Vé Điện Tử QR Code & Check-in Không Chạm
- Ngay sau khi cọc thành công, hệ thống cấp một Vé Điện Tử kèm mã QR động độc bản được mã hóa bảo mật.
- Vé hiển thị đầy đủ thông tin: Mã đặt sân, Tên khách hàng, Sân số, Khung giờ đá, Tiền đã cọc (30%), Số tiền cần thanh toán nốt tại quầy (70%).
- Khách hàng có thể lưu vé vào điện thoại hoặc nhận vé qua Zalo/Email.
- Khi đến sân, khách chỉ cần đưa mã QR trước camera tại quầy lễ tân để quét qua module `jsQR`, hệ thống tự động hoàn tất thủ tục check-in trong 1 giây.

#### 2.2.4. Tính Năng Chia Tiền Nhóm Thông Minh (Team Split)
- Giải quyết bài toán "đau đầu" của các đội trưởng khi thu tiền sân từ đồng đội.
- Cho phép tạo liên kết chia tiền trận đấu:
  - Hỗ trợ chia đều cho N thành viên.
  - Hỗ trợ chia tùy chỉnh (Ví dụ: Thủ môn miễn phí, cầu thủ ghi bàn được giảm 50%).
- Mỗi thành viên có một mã QR VietQR riêng để chuyển khoản phần tiền của mình thẳng vào hóa đơn chung, cập nhật tiến độ nộp tiền theo thời gian thực.

#### 2.2.5. Hub Ghép Kèo & Tìm Đối Thủ (Matchmaking Community)
- Nơi các đội bóng thiếu người hoặc cần tìm đối thủ giao hữu đăng tin cáp kèo.
- Phân loại rõ ràng theo: Trình độ (Yếu / Trung bình / Bán chuyên / Lão tướng), Độ tuổi, Loại sân (5-7-11), Kèo nước hay Kèo sân chia đôi.
- Hệ thống đánh giá uy tín đội bóng: Tỉ lệ thi đấu đúng hẹn, điểm phong cách fair-play, số lần bùng kèo.

#### 2.2.6. Tích Điểm Hội Viên & Đổi Quà (Loyalty Program)
- Cơ chế tích điểm: Cứ mỗi `10.000 VNĐ` chi tiêu thực tế, khách hàng được tích lũy `1 điểm`.
- Hạng thành viên tự động nâng cấp:
  - **Hội Viên Tiêu Chuẩn:** Dưới 200 điểm.
  - **Khách Quen (Silver/Gold):** Từ 200 đến 499 điểm (Ưu đãi giữ chỗ giờ vàng trước 3 ngày).
  - **Hội Viên VIP (Platinum):** Từ 500 điểm trở lên (Giảm 10% dịch vụ nước uống, tặng bóng thi đấu, ưu tiên đặt lịch tháng).
- Điểm thưởng có thể dùng để khấu trừ tiền thuê sân hoặc đổi lấy nước uống, áo tập tại quầy.

#### 2.2.7. Tích Hợp Dự Báo Thời Tiết Realtime (Open-Meteo API)
- Tự động lấy tọa độ sân bóng (Mỹ Đình, Hà Nội) để dự báo thời tiết theo từng khung giờ thi đấu.
- Hiển thị nhiệt độ, khả năng có mưa, vận tốc gió và chỉ số UV trên giao diện đặt sân, giúp đội trưởng đưa ra quyết định đặt sân có mái che hay sân ngoài trời phù hợp.

---

## 3. KIẾN TRÚC HỆ THỐNG & CÔNG NGHỆ (SYSTEM ARCHITECTURE)

### 3.1. Ngăn Xếp Công Nghệ (Technology Stack)
| Thành phần | Công nghệ / Thư viện | Vai trò & Lý do lựa chọn |
| :--- | :--- | :--- |
| **Backend Core** | PHP 8.1+ (Native OOP / Clean Architecture) | Tối ưu hiệu năng, độ trễ xử lý cực thấp (< 50ms), tương thích hoàn hảo mọi hosting/VPS cPanel. |
| **Cơ sở dữ liệu** | MySQL 8.0 / MariaDB 10.6+ | Đảm bảo tính toàn vẹn giao dịch ACID, hỗ trợ cơ chế khóa dòng `SELECT ... FOR UPDATE` chống race condition. |
| **Frontend Framework** | Vanilla JavaScript (ES6+ Native Modules) | Không sử dụng React/Vue để tránh phình to bundle; tải trang siêu tốc dưới 1 giây. |
| **Giao diện & CSS** | Tailwind CSS v3.4+ (Custom Build) | Thiết kế linh hoạt, tiện ích hóa tối đa, đồng bộ màu sắc thương hiệu và chuẩn responsive mobile-first. |
| **Thanh toán tự động** | VietQR Standard + SePay Webhook API v2 | Tự động hóa gạch nợ ngân hàng không cần thẻ tín dụng, chi phí vận hành 0đ. |
| **Quét mã QR** | `jsQR.js` (WebAssembly/HTML5 Canvas Camera) | Quét mã vé điện tử siêu nhạy trực tiếp trên trình duyệt, không cần đầu đọc barcode chuyên dụng. |
| **Thời tiết Realtime** | Open-Meteo REST API | Dữ liệu khí tượng vệ tinh miễn phí, chính xác đến từng giờ không cần API Key. |
| **Trực quan hóa dữ liệu**| Pure Inline SVG Vector Engine | Thay thế Chart.js cồng kềnh, vẽ biểu đồ tài chính sắc nét 4K/Retina bằng mã SVG thuần, tải 0ms. |

### 3.2. Mô Hình Kiến Trúc Phân Tầng (Layered Architecture)
Hệ thống được tổ chức thành 4 phân tầng độc lập, tuân thủ nguyên tắc trách nhiệm duy nhất (Single Responsibility Principle):
```
┌───────────────────────────────────────────────────────────────────┐
│ Client Devices (Mobile Safari / Chrome / Desktop PWA)             │
└─────────────────────────────────┬─────────────────────────────────┘
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│ Nginx / Apache Web Server                                         │
└─────────────────────────────────┬─────────────────────────────────┘
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│ Security & Auth Middleware (CSRF, RateLimit, 2FA TOTP, RBAC)      │
└─────────────────────────────────┬─────────────────────────────────┘
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│ API Router & Controllers (/api/*.php, /portal-admin/*.php)        │
└─────────────────────────────────┬─────────────────────────────────┘
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│ Service Layer (BookingService, PaymentService, AdminLogService)   │
└───────────────┬───────────────────────────────────┬───────────────┘
                ▼                                   ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│ External APIs (SePay Webhook, │   │ Data Access Layer             │
│ Open-Meteo, Telegram Bot)     │   │ (PDO Prepared Statements, TX) │
└───────────────────────────────┘   └───────────────┬───────────────┘
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │ MySQL / MariaDB Database      │
                                    └───────────────────────────────┘
```

1. **Tầng Trình Diễn (Presentation Layer):**
   - Phía khách hàng: Các trang HTML5 ngữ nghĩa chuẩn SEO kết hợp các module JavaScript nhỏ gọn (`js/booking.js`, `js/team_split.js`, `js/weather.js`).
   - Phía quản trị: Cổng Portal Admin chia thành 11 Partials độc lập nạp bất đồng bộ (`portal-admin/partials/tab*.php`) cùng hệ thống script điều hành tương ứng (`js/admin_*.js`).
2. **Tầng Trung Gian Bảo Mật (Middleware Layer):**
   - Kiểm tra phiên làm việc (Session Hijacking check qua User-Agent & IP).
   - Kiểm tra mã xác thực CSRF Token trên mọi request có tính chất thay đổi trạng thái (`POST/PUT/DELETE`).
   - Phân quyền RBAC 3 cấp (`staff`, `manager`, `admin`).
   - Chặn brute-force thông qua bộ đệm Rate Limiter dựa trên IP.
3. **Tầng Nghiệp Vụ & Dịch Vụ (Business Logic & Service Layer):**
   - `BookingService`: Quản lý vòng đời đơn đặt sân, tính tiền theo khung giờ vàng, áp mã giảm giá, kiểm tra slot trống.
   - `PaymentService`: Xử lý cọc VietQR, xác thực chữ ký Webhook SePay, phân bổ dòng tiền.
   - `AdminLogService`: Ghi nhận nhật ký kiểm toán biến động dữ liệu, tự động diffing giá trị cũ → mới, chống ghi log rác.
4. **Tầng Dữ Liệu & Giao Dịch (Persistence Layer):**
   - Sử dụng kết nối PDO với chế độ nghiêm ngặt `PDO::ERRMODE_EXCEPTION`.
   - 100% câu lệnh truy vấn đều được tham số hóa (Prepared Statements) để triệt tiêu lỗ hổng SQL Injection.
   - Quản lý giao dịch MySQL Transaction (`BEGIN ... COMMIT / ROLLBACK`) trong tất cả các tác vụ nhạy cảm liên quan đến tiền bạc, điểm thưởng và đặt lịch.

### 3.3. Cơ Chế Chống Đặt Trùng Lịch (Concurrency Control & Race Condition)
Để giải quyết bài toán hai khách hàng cùng bấm đặt một sân bóng ở cùng một khung giờ tại cùng một mili-giây:
- Hệ thống áp dụng cơ chế khóa dòng bi quan (**Pessimistic Locking**) thông qua lệnh:
  ```sql
  SELECT id, status FROM bookings 
  WHERE pitch_id = :pitch_id AND booking_date = :date AND time_slot = :slot 
  FOR UPDATE;
  ```
- Toàn bộ quá trình kiểm tra lịch trống, tạm giữ slot trong 15 phút (cho khách chuyển khoản cọc) và ghi nhận vào bảng `bookings` được bọc trọn vẹn trong một MySQL Transaction.
- Nếu một tiến trình khác cố gắng đặt cùng slot đó trong lúc transaction đầu tiên chưa commit, tiến trình thứ hai sẽ bị chặn và nhận thông báo: *"Khung giờ này vừa có khách hàng khác thực hiện đặt chỗ"*.

---

## 4. PHÂN HỆ QUẢN TRỊ TRUNG TÂM (PORTAL ADMIN - 11 PHÂN HỆ)

Cổng quản trị tập trung tại `/portal-admin/` là trái tim vận hành của toàn bộ tổ hợp Sân Bóng Pro. Giao diện được thiết kế theo dạng Single Page Application (SPA-like) với thanh Sidebar chuyển đổi linh hoạt giữa 11 tab chức năng:

```
┌────────────────────────────────────────────────────────────────────────┐
│  PORTAL ADMIN - SÂN BÓNG PRO                                           │
├───────────────┬────────────────────────────────────────────────────────┤
│ [1] Tổng quan │  📊 DASHBOARD CHỈ HUY & TỔNG QUAN TÀI CHÍNH            │
│ [2] Sơ đồ sân │  📅 GANTT CHART TIMELINE ĐIỀU HÀNH CA ĐÁ (05:30-23:00) │
│ [3] Đặt quầy  │  ⚡ POS ĐẶT SÂN NHANH TẠI QUẦY & TỰ TẠO ĐƠN            │
│ [4] Quản lý ca│  📋 DANH SÁCH & XỬ LÝ CA ĐẶT (ĐÃ CỌC / HOÀN THÀNH)     │
│ [5] Sân & B/trì│  🛠️ KHÓA SÂN BẢO TRÌ & QUẢN LÝ 17 SÂN BÓNG            │
│ [6] Khách hàng│  👥 CRM HỘI VIÊN (8 CỘT CHUẨN, LỊCH SỬ ĐÁ, TÍCH ĐIỂM)   │
│ [7] Bán hàng  │  🥤 QUẢN LÝ KHO NƯỚC, DỊCH VỤ PHỤ TRỢ & CHO THUÊ ĐỒ    │
│ [8] Báo cáo   │  📈 KẾ TOÁN DOANH THU & BIỂU ĐỒ INLINE SVG THUẦN       │
│ [9] Khuyến mãi│  🎁 MÃ GIẢM GIÁ (VOUCHER) & KHUYẾN MÃI GIỜ VÀNG        │
│ [10] Cài đặt  │  ⚙️ CẤU HÌNH HỆ THỐNG & BẢNG GIÁ THEO GIỜ VÀNG (ADMIN) │
│ [11] Nhật ký  │  🛡️ NHẬT KÝ KIỂM TOÁN AUDIT LOG 6 NHÓM MÀU (ADMIN ONLY)│
└───────────────┴────────────────────────────────────────────────────────┘
```

### 4.1. Chi Tiết 11 Phân Hệ Vận Hành

#### 4.1.1. Tab 1: Tổng Quan KPI & Trung Tâm Chỉ Huy (Overview Dashboard)
- Cập nhật số liệu tức thì (Realtime Widgets): Doanh thu trong ngày, Tỷ lệ lấp đầy sân (Occupancy Rate), Số ca đang thi đấu, Số ca sắp bắt đầu trong 60 phút tới.
- Biểu đồ nhiệt (Heatmap) thể hiện các khung giờ có mật độ đá cao nhất trong tuần.
- Bộ lọc nhanh: Tất cả ca, Ca đã cọc, Ca cần check-in, Ca hoàn thành.

#### 4.1.2. Tab 2: Sơ Đồ Sân Bóng & Timeline Điều Hành (Gantt Chart)
- Biểu đồ thời gian trực quan kéo dài từ `05:30` đến `23:00` hiển thị trạng thái của 17 sân bóng.
- Mỗi khối ca đá hiển thị tên đội bóng, số điện thoại, trạng thái thanh toán và đồng hồ đếm ngược thời gian thi đấu.
- Bấm vào ca đá mở ngay Popup Thao Tác Nhanh:
  - **Bù giờ (Overtime):** Gia hạn thêm 15 phút hoặc 30 phút, tự động tính phụ thu.
  - **Đổi sân tại chỗ:** Chuyển ca sang sân trống khác nếu khách yêu cầu hoặc do mặt sân gặp sự cố.
  - **Thêm dịch vụ:** Gắn thêm nước uống, thuê bóng vào hóa đơn ca đá.

#### 4.1.3. Tab 3: Đặt Sân Nhanh Tại Quầy (POS Quick Booking)
- Tối ưu hóa cho nhân viên lễ tân tiếp nhận khách đặt trực tiếp hoặc gọi điện thoại.
- Khi nhân viên gõ số điện thoại khách hàng, hệ thống tự động tra cứu dữ liệu khách trong tích tắc:
  - Nhận diện hội viên VIP / Khách quen để áp dụng giá ưu đãi.
  - Cảnh báo ngay lập tức nếu số điện thoại này từng có tiền sử **"Khách chưa đến (No-Show)"** hoặc nằm trong danh sách đen (Blacklist).
- Tùy chọn thu tiền cọc linh hoạt: Thu cọc tiền mặt hoặc tạo mã VietQR tại quầy cho khách quét thanh toán ngay.

#### 4.1.4. Tab 4: Quản Lý & Điều Phối Ca Đặt (Booking Management)
- Bảng danh sách chi tiết toàn bộ các đơn đặt sân với bộ lọc đa chiều (theo ngày, theo loại sân, theo trạng thái).
- Thao tác nghiệp vụ: Xác nhận cọc thủ công (trong trường hợp đối soát ngân hàng lệch nội dung), Hủy ca trả cọc, Hủy ca phạt cọc, Đóng ca hoàn tất.

#### 4.1.5. Tab 5: Quản Lý Sân & Lịch Bảo Trì (Pitch Maintenance)
- Quản lý danh mục 17 sân bóng cỏ nhân tạo (tên sân, loại sân 5-7-11 người, tình trạng đèn chiếu sáng, chất lượng mặt cỏ).
- Tính năng **Khóa sân bảo trì**: Cho phép quản lý đóng một hoặc nhiều sân trong một khoảng thời gian cụ thể (để bảo dưỡng cỏ nhân tạo, thay bóng đèn cao áp), tự động ẩn các slot này khỏi trang đặt trực tuyến của khách hàng.

#### 4.1.6. Tab 6: Khách Hàng & CRM Hội Viên (Customer Relationship Management)
- Được nâng cấp toàn diện theo chuẩn CRM hiện đại (chi tiết xem tại [Phần 5](#5-chuyên-đề-chuẩn-hóa-crm-hội-viên--quy-chuẩn-xóa-bỏ-công-nợ)).
- Quản lý hồ sơ khách hàng, phân hạng VIP, theo dõi tần suất thi đấu, cộng/trừ điểm thưởng có ghi vết kiểm toán.

#### 4.1.7. Tab 7: Bán Hàng & Dịch Vụ Phụ Trợ (F&B and Inventory)
- Quản lý kho hàng tại quầy: Nước giải khát (Revive, Pocari, Sting, Nước suối), Thuê áo bít chia đội, Thuê giày, Thuê bóng thi đấu đạt chuẩn.
- Bán lẻ độc lập hoặc gộp thanh toán trực tiếp vào hóa đơn của ca đá.
- Báo cáo tồn kho tức thì và cảnh báo khi số lượng nước uống sắp hết.

#### 4.1.8. Tab 8: Báo Cáo Tài Chính & Kế Toán Doanh Thu (Financial Reports)
- Báo cáo doanh thu đa chiều: Theo ngày, theo tuần, theo tháng, theo từng sân cụ thể.
- Phân tích chi tiết nguồn thu: Doanh thu tiền thuê sân (Tiền cọc chuyển khoản VietQR + Tiền mặt thu tại quầy) + Doanh thu dịch vụ phụ trợ F&B.
- Biểu đồ phân tích tài chính được vẽ bằng **Inline SVG Vector Engine** thuần túy, mượt mà và không giật lag.
- Hỗ trợ xuất dữ liệu ra định dạng Excel và in báo cáo quyết toán bàn giao ca.

#### 4.1.9. Tab 9: Quản Lý Ưu Đãi & Mã Giảm Giá (Voucher System)
- Tạo và quản lý mã khuyến mãi: Giảm giá theo số tiền cố định (VD: `50.000 VNĐ`) hoặc theo phần trăm (VD: `10%`).
- Ràng buộc voucher: Giới hạn số lượt dùng tối đa, thời hạn hiệu lực, chỉ áp dụng cho khung giờ thấp điểm (trước 16:00) hoặc chỉ dành cho Hội viên VIP.

#### 4.1.10. Tab 10: Cấu Hình Hệ Thống & Bảng Giá Thông Minh (System Settings)
- **Quyền hạn truy cập:** Chỉ dành riêng cho vai trò `admin` (Chủ sân).
- Cấu hình bảng giá linh hoạt theo ma trận:
  - Giá theo loại sân (Sân 5 người, Sân 7 người, Sân 11 người).
  - Giá theo ngày (Ngày thường Thứ 2 - Thứ 6 vs Cuối tuần Thứ 7 - Chủ Nhật).
  - Giá theo khung giờ: Khung giờ sáng rẻ, Khung giờ chiều trung bình, **Khung giờ vàng (17:30 - 20:30)** có phụ thu cao điểm.
- Thiết lập thông số ngân hàng nhận cọc VietQR (Số tài khoản, Tên ngân hàng, Secret Token SePay).
- Cơ chế chống cập nhật thừa: Khi admin bấm lưu nhưng không thay đổi giá trị thực tế, hệ thống không thực thi ghi đè CSDL và không sinh log rác.

#### 4.1.11. Tab 11: Nhật Ký Kiểm Toán Toàn Diện (Admin Audit Log)
- **Quyền hạn truy cập:** Chỉ dành riêng cho vai trò `admin`.
- Giám sát toàn bộ các hành động thay đổi dữ liệu nhạy cảm trong hệ thống với cơ chế **Diffing Trực Quan** (So sánh giá trị Cũ → Mới):
  - Giá trị cũ hiển thị gạch ngang nền đỏ nhạt: `[- Cũ -]`
  - Giá trị mới hiển thị nổi bật nền xanh lá: `[+ Mới +]`
- **Phân loại 6 Nhóm Màu Hành Động Trực Quan:**
  1. 🟢 **Giá (Price):** Cập nhật bảng giá, giá giờ vàng, giá theo loại sân.
  2. 🔵 **Tiền & Cọc (Deposit & Money):** Duyệt cọc VietQR thủ công, hủy cọc, hoàn tiền.
  3. 🟣 **Ca trực & Điều hành (Shift & Ops):** Mở ca, chốt ca, xác nhận bàn giao tiền mặt, đổi sân, bù giờ.
  4. 🟡 **Hội viên & Điểm (Member & Loyalty):** Sửa thông tin hội viên, cộng/trừ điểm tích lũy kèm lý do bắt buộc.
  5. ⚪ **Cài đặt & Vận hành (Settings):** Cập nhật cấu hình hệ thống, tạo voucher, chỉnh kho hàng.
  6. 🔴 **Bảo mật & Quyền hạn (Security & Access):** Đổi mật khẩu, đổi vai trò nhân viên, kích hoạt 2FA.
- **Tính năng cao cấp:** Tooltip địa chỉ IP chống tràn bảng, Dropdown lọc theo emoji nhận diện, tự động che mờ thông tin cá nhân (SĐT, CCCD).

---

## 5. CHUYÊN ĐỀ: CHUẨN HÓA CRM HỘI VIÊN & QUY CHUẨN XÓA BỎ CÔNG NỢ

### 5.1. Bối Cảnh & Quyết Định Nghiệp Vụ Chốt Hạ
Trong các phiên bản trước, hệ thống tồn tại khái niệm "công nợ" gây hiểu lầm nghiêm trọng giữa hai định nghĩa:
- **Định nghĩa đúng:** Khoản tiền 70% còn lại của một ca đá đang diễn ra mà khách cần thanh toán khi đến nhận sân.
- **Định nghĩa sai lệch (nợ đọng):** Số tiền khách còn thiếu sau khi đã rời sân hoặc tích lũy cộng dồn qua nhiều đơn hàng.

Sau đợt tổng rà soát toàn diện (Audit Scan 2026-11-16), Ban Quản Trị đã ban hành quyết định nghiệp vụ tuyệt đối:
> **"Quy trình kinh doanh: Khách cọc khi đặt, đến sân thi đấu và THANH TOÁN HẾT tại quầy. Hệ thống KHÔNG CÓ công nợ đọng. XÓA SẠCH khái niệm công nợ khỏi toàn bộ Frontend, Backend, API, Báo cáo tài chính, Cơ sở dữ liệu và Tài liệu kỹ thuật."**

### 5.2. Kết Quả Xóa Sạch Công Nợ Toàn Diện
1. **Dữ liệu Database:**
   - Hoàn thiện và chạy thành công **Migration 016 & 017** an toàn idempotent trên cả môi trường Local và Hosting Production.
   - Không còn bất kỳ bảng hay cột nào phục vụ mục đích nợ đọng (`debts`, `customer_debts`, `users.debt_amount`).
   - Cột `remaining_amount` trong bảng `bookings` được định nghĩa chuẩn xác duy nhất là: *Bộ đệm ghi nhận 70% tiền sân còn phải thu tại quầy khi khách đến nhận sân*.
2. **Quy Tắc Đóng Đơn Ở Backend:**
   - Backend từ chối tuyệt đối việc chuyển trạng thái đơn sang "Hoàn thành" nếu số tiền thực thu chưa đủ 100% giá trị ca đá.
   - Nếu có trường hợp phát sinh giảm trừ (ví dụ thời tiết mưa to phải dừng trận sớm), Quản lý/Admin bắt buộc thực hiện thao tác *"Điều chỉnh giảm"* có nhập lý do bắt buộc và được ghi vết trong Audit Log.
3. **Lọc Sạch Giao Diện & API:**
   - Xóa bỏ nút lọc "Đơn đang nợ" và tab "Khách nợ" trên toàn bộ Portal Admin.
   - Bảng báo cáo tài chính Tab 8 đổi cột "Còn nợ" thành "Chưa thu (70%)" để phản ánh chính xác dòng tiền ca chưa diễn ra.

### 5.3. Chuẩn Hóa Cấu Trúc Bảng Khách Hàng (8 Cột Cố Định)
Bảng quản lý khách hàng tại Tab 6 (`portal-admin/partials/tab6_customers.php`) được thống nhất sinh ra từ một mảng định nghĩa duy nhất ở cả backend và frontend, cố định chính xác 8 cột dữ liệu:

| STT | Tên cột hiển thị | Khóa dữ liệu | Ý nghĩa & Quy chuẩn hiển thị |
| :---: | :--- | :--- | :--- |
| **1** | **Tên hội viên** | `name` | Tên khách hàng hoặc tên đội bóng. Đi kèm nhãn đỏ `[N lần bùng]` nếu N ≥ 1 (bằng 0 thì ẩn). |
| **2** | **Số điện thoại**| `phone` | Số điện thoại liên hệ chính thức, hỗ trợ bấm gọi nhanh trên mobile. |
| **3** | **Hạng** | `tier` | Phân hạng hội viên: `Hội viên VIP` (Vàng), `Khách quen` (Xanh dương), `Tiêu chuẩn` (Xám). |
| **4** | **Trận hoàn thành**| `completed_matches` | Tổng số trận đấu đã diễn ra thành công (Trạng thái đơn: Hoàn thành). Đồng nhất 1 định nghĩa giữa bảng ngoài và modal chi tiết. |
| **5** | **Điểm tích lũy** | `points` | Hiển thị dạng số nguyên kèm chữ "điểm" (Ví dụ: `574 điểm`), tuyệt đối không để đơn vị "đ". |
| **6** | **Đặt gần nhất** | `last_booking` | Hiển thị dạng thời gian tương đối: *"Hôm nay"*, *"x ngày trước"*, hoặc *"—"* nếu chưa từng đặt. |
| **7** | **Tổng chi tiêu** | `total_spent` | Tổng số tiền thực tế khách đã chi trả thành công (Định dạng: `5.745.000 ₫`). |
| **8** | **Thao tác** | `actions` | Nút *"Hồ sơ"* mở modal CRM quản lý chi tiết và sửa thông tin hội viên. |

### 5.4. Chuẩn Hóa Modal Hồ Sơ CRM & Lịch Sử Khách Hàng
Modal chi tiết khách hàng được tinh giản và tái cấu trúc thành một trải nghiệm liền mạch:
1. **4 Thẻ Chỉ Số Trên Cùng:**
   - 🟢 **Trận hoàn thành:** Tổng số ca thi đấu hoàn tất thành công.
   - 🔴 **Vắng mặt / Hủy:** Số lần khách đặt nhưng không đến (No-Show) hoặc hủy sát giờ.
   - 🟡 **Điểm tích lũy:** Số điểm thưởng hiện có (`points`).
   - 🔵 **Tổng chi tiêu:** Lũy kế số tiền đã thanh toán tại sân (`total_spent`).
2. **Hợp Nhất 1 Form Chỉnh Sửa Duy Nhất:**
   - Loại bỏ tình trạng có 2 nút sửa chồng chéo. Tích hợp form chỉnh sửa hồ sơ duy nhất ngay trong modal:
     - Tên khách / Đội bóng, Số điện thoại, Email liên hệ, Ghi chú sở thích/thói quen của khách.
     - Phân hạng hội viên: Cho phép Admin ghi đè hạng (Kèm lý do).
     - Khóa đặt sân / Danh sách đen (Blacklist): Bắt buộc nhập lý do khi kích hoạt; khi khách bị khóa truy cập đặt online sẽ nhận thông báo hướng dẫn liên hệ hotline.
3. **Cơ Chế Điều Chỉnh Điểm Tích Lũy An Toàn (Points Log):**
   - Nghiêm cấm sửa trực tiếp giá trị vào cột `users.points`.
   - Admin muốn cộng hoặc trừ điểm bắt buộc phải nhập: *Số điểm thay đổi* (± delta) và *Lý do điều chỉnh*.
   - Hệ thống tự động ghi 1 dòng vào bảng kiểm toán `points_log` và cập nhật `users.points` trong cùng một MySQL Transaction:
     - Khóa dòng khách hàng với `SELECT points FROM users WHERE id = :id FOR UPDATE`.
     - Chặn điểm âm (Nếu trừ quá số điểm hiện có thì transaction bị rollback và báo lỗi ngay).
     - Hộp thoại xác nhận hiển thị trực quan: `Điểm cũ (574) → Điểm mới (674)`.
4. **Lịch Sử Đặt Sân:**
   - Hiển thị ngày thi đấu chuẩn định dạng Việt Nam (`dd/mm/yyyy`).
   - Có phân trang phía server (Server-side Pagination) để tránh tải chậm khi khách có hàng trăm đơn thi đấu.

---

## 6. HỆ THỐNG AN TOÀN THÔNG TIN, BẢO MẬT & PHÂN QUYỀN (RBAC & SECURITY)

### 6.1. Ma Trận Phân Quyền Truy Cập (Role-Based Access Control — RBAC)
Hệ thống thiết lập 3 vai trò người dùng trong nội bộ ban quản trị, được kiểm soát chặt chẽ ở tầng Backend API:

| Phân hệ / Quyền hạn | Nhân viên trực ca (`staff`) | Quản lý vận hành (`manager`) | Quản trị viên cấp cao (`admin`) |
| :--- | :---: | :---: | :---: |
| **Xem Timeline Gantt & Sơ đồ sân** | ✅ Có | ✅ Có | ✅ Có |
| **Đặt sân nhanh tại quầy (POS)** | ✅ Có | ✅ Có | ✅ Có |
| **Quét mã QR Check-in vào sân** | ✅ Có | ✅ Có | ✅ Có |
| **Bán nước & Dịch vụ F&B** | ✅ Có | ✅ Có | ✅ Có |
| **Chốt ca tiền mặt cuối ngày** | ✅ Có | ✅ Có | ✅ Có |
| **Đổi sân / Gia hạn bù giờ ca đá** | ❌ Không | ✅ Có | ✅ Có |
| **Khóa sân bảo trì sửa chữa** | ❌ Không | ✅ Có | ✅ Có |
| **Duyệt cọc lệch / Hủy ca phạt cọc**| ❌ Không | ✅ Có | ✅ Có |
| **Xem Báo cáo tài chính & Doanh thu**| ❌ Không | ❌ Không | ✅ Toàn quyền |
| **Cấu hình Bảng giá & Giá giờ vàng**| ❌ Không | ❌ Không | ✅ Toàn quyền |
| **Quản lý Nhân viên & Đổi vai trò** | ❌ Không | ❌ Không | ✅ Toàn quyền |
| **Tra cứu Nhật ký kiểm toán Audit Log**| ❌ Không | ❌ Không | ✅ Toàn quyền |

> **Nguyên tắc bảo vệ RBAC:** Việc phân quyền được kiểm tra ở đầu mỗi tệp xử lý backend (`api/` và `portal-admin/partials/`). Người dùng không đủ quyền truy cập sẽ nhận phản hồi mã lỗi `HTTP 403 Forbidden` và hành vi vi phạm được tự động ghi nhận vào log bảo mật.

### 6.2. Các Lớp Phòng Thủ An Toàn Thông Tin
1. **Băm Mật Khẩu Tiêu Chuẩn Hiện Đại (Argon2id):**
   - Toàn bộ mật khẩu người dùng và quản trị viên được băm bằng thuật toán `PASSWORD_ARGON2ID` với thông số bộ nhớ và thời gian tối ưu, có khả năng kháng hoàn toàn các cuộc tấn công giải mã bằng phần cứng GPU chuyên dụng.
2. **Xác Thực 2 Yếu Tố Bắt Buộc Cho Quản Trị Viên (TOTP 2FA):**
   - Hỗ trợ chuẩn xác thực thời gian thực RFC 6238 tương thích với Google Authenticator, Microsoft Authenticator.
   - Admin bắt buộc nhập mã 6 số OTP khi đăng nhập vào hệ thống quản trị hoặc khi thực hiện các tác vụ nhạy cảm (Đổi bảng giá, Khôi phục dữ liệu).
3. **Chống Tấn Công Tự Động & Brute-Force (Rate Limiting & Cloudflare Turnstile):**
   - Tích hợp Cloudflare Turnstile vô hình trên form đăng nhập và đặt sân, ngăn chặn botnet và script tự động.
   - Bộ đệm Rate Limiter giới hạn: Quá 5 lần đăng nhập sai trong 15 phút sẽ tự động khóa IP tạm thời trong 30 phút.
4. **Phòng Chống Tấn Công Giả Mạo Yêu Cầu (CSRF Protection):**
   - Mọi form gửi dữ liệu và request AJAX đều phải đính kèm Header `X-CSRF-Token` được mã hóa theo từng phiên làm việc của người dùng. Request thiếu token hoặc token hết hạn sẽ bị từ chối ngay lập tức.
5. **Triệt Tiêu Tuyệt Đối SQL Injection & Cross-Site Scripting (XSS):**
   - 100% câu truy vấn sử dụng PDO Prepared Statements.
   - Toàn bộ dữ liệu hiển thị ra giao diện HTML đều được làm sạch qua hàm `htmlspecialchars(..., ENT_QUOTES, 'UTF-8')`.
6. **Xác Thực Webhook Ngân Hàng Qua Chữ Ký Số HMAC SHA256:**
   - Webhook nhận tín hiệu thanh toán từ SePay được kiểm tra chuỗi băm bí mật `HMAC_SECRET`. Hệ thống từ chối mọi yêu cầu giả lập webhook không có chữ ký hợp lệ.
7. **Bảo Vệ Dữ Liệu Cá Nhân (Tuân Thủ Nghị Định 13/2023/NĐ-CP):**
   - Các thông tin nhạy cảm của khách hàng như Số điện thoại, Số tài khoản ngân hàng được che mờ một phần (Masking, ví dụ: `0912xxx678`) khi hiển thị trong nhật ký kiểm toán công khai nội bộ.
   - Tuyệt đối không ghi mật khẩu thô hoặc mã bí mật vào bất kỳ file log nào.

---

## 7. QUY CHUẨN THIẾT KẾ & TRẢI NGHIỆM NGƯỜI DÙNG (DESIGN SYSTEM & UI/UX)

### 7.1. Bảng Màu Thương Hiệu (Design Tokens)
Hệ thống sử dụng bảng màu hiện đại, khỏe khoắn, lấy cảm hứng từ màu xanh mặt cỏ thể thao và màu xanh đen công nghệ:

| Tên Token | Mã Màu Hex | Tailwind CSS Class | Ứng dụng thực tế trong hệ thống |
| :--- | :--- | :--- | :--- |
| **Primary Emerald** | `#16A34A` | `emerald-600` | Màu chủ đạo, nút hành động chính, viền sân đang chọn, trạng thái Hoàn thành. |
| **Primary Dark** | `#15803D` | `emerald-700` | Trạng thái hover/active của các nút bấm chính. |
| **Primary Light** | `#DCFCE7` | `emerald-100` | Nền huy hiệu thành công, thẻ thông báo đã đặt cọc. |
| **Navy Dark** | `#0F172A` | `slate-900` | Nền thanh tiêu đề header, thanh sidebar quản trị, màu chữ tiêu đề chính. |
| **Slate Gray** | `#64748B` | `slate-500` | Chữ phụ, icon thứ cấp, đường viền phân cách nhẹ. |
| **Surface Light** | `#F8FAFC` | `slate-50` | Nền tổng thể toàn bộ trang web và nền cửa sổ modal. |
| **Border Neutral** | `#E2E8F0` | `slate-200` | Đường viền phân cách giữa các khối, bảng dữ liệu và ô nhập liệu. |

#### Bảng Màu Trạng Thái Ca Đá & Huy Hiệu (Badges)
- 🟡 **Đã đặt cọc (Deposit Confirmed):** Nền vàng `bg-amber-100`, chữ vàng đậm `text-amber-800`, viền `border-amber-300`.
- 🔵 **Đang thi đấu (In-Play):** Nền xanh dương `bg-blue-100`, chữ xanh `text-blue-800`, hiệu ứng nhấp nháy nhẹ.
- 🟢 **Hoàn thành / Sân trống (Available):** Nền xanh lá `bg-emerald-100`, chữ xanh đậm `text-emerald-800`.
- 🔴 **Khách chưa đến (No-Show) / Đã hủy:** Nền đỏ nhạt `bg-red-100`, chữ đỏ `text-red-800`.
- ⚫ **Đang bảo trì (Maintenance):** Nền xám `bg-slate-200`, chữ xám đen `text-slate-700`.

### 7.2. Quy Chuẩn Typography & Tiền Tệ
- **Phông chữ chủ đạo:** `Plus Jakarta Sans`, `Inter`, sans-serif (Hỗ trợ hiển thị tiếng Việt có dấu sắc nét, không lỗi chân chữ).
- **Hệ thống phân cấp tiêu đề:**
  - Tiêu đề trang chính (H1): `text-2xl` đến `text-4xl`, `font-extrabold`, màu `#0F172A`.
  - Tiêu đề phân khu (H2): `text-xl` đến `text-2xl`, `font-bold`.
  - Tiêu đề thẻ (H3): `text-base` đến `text-lg`, `font-semibold`.
  - Nội dung thông thường (Body): `text-sm` đến `text-base`, `leading-relaxed`, màu `#334155`.
- **Định dạng tiền tệ chuẩn mực:** Bắt buộc áp dụng định dạng tiền tệ Việt Nam có dấu phân cách phần nghìn và ký hiệu đồng: `350.000 ₫` hoặc `350.000đ` (Không hiển thị số thô `350000`).

### 7.3. Trực Quan Hóa Dữ Liệu Bằng Pure Inline SVG Engine
- Loại bỏ hoàn toàn các thư viện đồ họa cồng kềnh bên thứ ba (như Chart.js, ApexCharts nặng hơn 250KB).
- Toàn bộ các biểu đồ tài chính, doanh thu tuần/tháng và biểu đồ phân bổ giờ vàng được render trực tiếp thông qua **Inline SVG Vector thuần** qua module `js/admin_finance.js`.
- Ưu điểm vượt trội:
  - Dung lượng tải trang bằng 0ms.
  - Hiển thị sắc nét tuyệt đối trên mọi màn hình độ phân giải siêu cao (Retina, 4K, Smart TV).
  - Tự động co giãn theo tỷ lệ màn hình (Responsive Vector).
  - Tương tác vi mô (Micro-interactions): Tooltip hiển thị số tiền chính xác khi di chuột vào từng cột mốc dữ liệu.

### 7.4. Nguyên Tắc Mobile-First & 4 Trạng Thái UI Bắt Buộc
1. **Thiết Kế Mobile-First (Bắt đầu từ 360px):**
   - Giao diện được tối ưu hoàn hảo từ kích thước màn hình nhỏ nhất **360px** (iPhone SE, dòng Samsung Galaxy A).
   - Chiều cao các modal/drawer sử dụng đơn vị hiện đại `100dvh` để không bị thanh điều hướng trình duyệt di động che lấp.
   - Vùng cảm ứng của các nút bấm di động đảm bảo tối thiểu ≥ 44px × 44px.
2. **4 Trạng Thái Bắt Buộc Cho Mọi Khối Dữ Liệu:**
   - **Đang tải (Loading State):** Hiển thị khung xương động (Skeleton Loader) khớp với bố cục nội dung thực, không dùng vòng xoay spinner đơn điệu giữa trang trắng.
   - **Dữ liệu trống (Empty State):** Hiển thị hình minh họa nhẹ nhàng kèm thông điệp tích cực (Ví dụ: *"Hiện tại chưa có ca đá nào cần xử lý"*).
   - **Xảy ra lỗi (Error State):** Thông báo lỗi rõ ràng bằng tiếng Việt, chỉ rõ nguyên nhân và cung cấp nút *"Thử lại"* mà không cần tải lại toàn bộ trang web.
   - **Thành công (Success State):** Cập nhật dữ liệu ngay trên màn hình đi kèm thông báo Toast notification ở góc màn hình tự đóng sau 3 giây.

---

## 8. DANH MỤC TÀI KHOẢN HỆ THỐNG & HƯỚNG DẪN VẬN HÀNH

### 8.1. Đường Dẫn Truy Cập Các Môi Trường
| Môi trường | Cổng Đăng Nhập Khách & Nhân Viên | Cổng Quản Trị Trực Tiếp (Portal Admin) |
| :--- | :--- | :--- |
| **Hệ Thống Trực Tuyến (Production)** | `https://fxzioyr.id.vn/login` | `https://fxzioyr.id.vn/portal-admin/` |
| **Môi Trường Cục Bộ (Local Laragon)** | `http://localhost/Quan_Ly_San_Bong/login` | `http://localhost/Quan_Ly_San_Bong/portal-admin/` |

### 8.2. Danh Sách Tài Khoản Vận Hành Tiêu Biểu
*(Lưu ý: Mật khẩu mặc định của các tài khoản mẫu khi khởi tạo môi trường thử nghiệm đều được bảo vệ bằng mã hóa Argon2id; vui lòng đổi mật khẩu ngay sau khi đăng nhập).*

1. **Quản Trị Viên Cấp Cao (Super Admin — Toàn Quyền Vận Hành):**
   - **Tên đăng nhập:** `vxyen0801`
   - **Vai trò:** `admin` (Chủ sân)
   - **Số điện thoại:** `0352313548` | **Email:** `vxyen0801@sanbongpro.vn`
   - **Phạm vi quyền hạn:** Toàn quyền truy cập 11 phân hệ, quản lý bảng giá, cài đặt ngân hàng VietQR và xem Audit Log.
2. **Quản Trị Viên Hệ Thống (System Admin):**
   - **Tên đăng nhập:** `admin`
   - **Vai trò:** `admin`
   - **Email:** `admin@sanbongpro.vn`
3. **Quản Lý Ca Vận Hành (Manager):**
   - **Tên đăng nhập:** `quanly`
   - **Họ và tên:** Nguyễn Hoàng Minh (Quản Lý Sân)
   - **Vai trò:** `manager`
   - **Số điện thoại:** `0352000222` | **Email:** `quanly@sanbongpro.vn`
   - **Phạm vi quyền hạn:** Điều hành Gantt Chart, duyệt ca, đổi sân, khóa bảo trì. Bị hạn chế truy cập Tab 10 (Cài đặt) và Tab 11 (Audit Log).
4. **Nhân Viên Trực Quầy (Staff):**
   - **Tên đăng nhập:** `nhanvien`
   - **Họ và tên:** Lê Văn Nam (Lễ Tân Quầy)
   - **Vai trò:** `staff`
   - **Số điện thoại:** `0352111333` | **Email:** `nhanvien@sanbongpro.vn`
   - **Phạm vi quyền hạn:** Quét QR Check-in, bán nước giải khát, đặt sân tại quầy và chốt ca tiền mặt.
5. **Khách Hàng Hội Viên Mẫu (VIP Player):**
   - **Tên đăng nhập:** `khachvip`
   - **Họ và tên:** Trần Tuấn Anh (Đội trưởng FC Tuấn Anh)
   - **Số điện thoại:** `0912345678`
   - **Phân hạng:** `Hội viên VIP` (574 điểm tích lũy).

### 8.3. Hướng Dẫn Vận Hành Định Kỳ & Tác Vụ Tự Động (Cron Jobs)
Để hệ thống vận hành trơn tru và tự động hóa tối đa, máy chủ được thiết lập các tác vụ định kỳ:
1. **Quét Hủy Đơn Treo Cọc Quá Hạn (Chạy mỗi 5 phút):**
   - Đơn đặt trực tuyến quá 15 phút kể từ lúc tạo mà khách chưa chuyển khoản cọc VietQR thành công sẽ tự động hủy và giải phóng slot giờ cho khách khác.
   - Lệnh thực thi: `php /path/to/cron/auto_cancel_unpaid.php`
2. **Nhắc Lịch Thi Đấu Cho Khách Hàng (Chạy mỗi 30 phút):**
   - Tự động gửi tin nhắn Zalo/SMS nhắc lịch thi đấu trước giờ bóng lăn 2 tiếng kèm chỉ dẫn đường đi và dự báo thời tiết.
3. **Tự Động Đóng Ca & Tính Điểm Thưởng (Chạy mỗi 60 phút):**
   - Tự động rà soát các ca đã thi đấu xong, xác nhận thu đủ 100% tiền sân, chuyển trạng thái sang "Hoàn thành" và cộng điểm tích lũy vào tài khoản hội viên.
4. **Sao Lưu Cơ Sở Dữ Liệu An Toàn (Chạy hàng ngày lúc 02:00 sáng):**
   - Tự động tạo bản sao lưu nén `.sql.gz` có mã hóa mật khẩu và đẩy lên lưu trữ đám mây an toàn.

---
*Tài liệu được biên soạn và cập nhật tự động từ toàn bộ kho mã nguồn, tài liệu kiến trúc và nhật ký phát triển của Dự án Sân Bóng Pro.*

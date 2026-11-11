# Sân Bóng Pro — Hệ Thống Quản Lý & Đặt Sân Bóng Đá Trực Tuyến

> **Hệ thống đặt sân bóng đá tự động, chuẩn hóa giao diện trực quan chuẩn FIFA, tích hợp thanh toán VietQR SePay 1 chạm và phân hệ quản trị vận hành toàn diện.**

* **Domain chính thức (Production Live):** [https://fxzioyr.id.vn](https://fxzioyr.id.vn)
* **Kho lưu trữ GitHub:** [github.com/vinhce/Web_Quan_Ly_San_Bong](https://github.com/vinhce/Web_Quan_Ly_San_Bong)
---

## Thông Tin Cơ Sở & Liên Hệ

* **Địa chỉ cơ sở:** Khu liên hợp Thể thao Pro, Số 18 Đường Lê Đức Thọ, Phường Mỹ Đình, Quận Nam Từ Liêm, TP. Hà Nội.
* **Hotline hỗ trợ 24/7:** **[0352 313 548](tel:0352313548)**
* **Hỗ trợ qua Zalo:** **[zalo.me/0352313548](https://zalo.me/0352313548)**
* **Giờ mở cửa:** 05:30 – 23:00 (Tất cả các ngày trong tuần)
* **Tài khoản thụ hưởng VietQR (SePay):**
  * **Ngân hàng:** MBBank (Ngân hàng Quân Đội)
  * **Số tài khoản:** `0352313548`
  * **Chủ tài khoản:** `NGUYEN QUANG VINH`
  * **Chính sách đặt cọc:** Thanh toán cọc 30% qua VietQR để giữ chỗ tức thì; 70% còn lại thanh toán tại quầy khi nhận sân (hỗ trợ hoàn/phạt cọc linh hoạt theo cấu hình).

---

## Tính Năng Nổi Bật

### 1. Dành cho Khách hàng (Customer Experience)
- **Xem & Tìm sân trực quan:** Phân loại sân 5, sân 7, sân 11 người chuẩn FIFA; hiển thị tình trạng mặt cỏ, kích thước và bảng giá theo giờ thường / giờ vàng / cuối tuần.
- **Dự báo thời tiết sân bóng:** Tích hợp Open-Meteo API lấy dữ liệu nhiệt độ, thời tiết thực tế tại khu vực sân theo thời gian thực.
- **Ma trận đặt slot giờ thông minh:** Hiển thị trực quan các slot (Trống, Đang đá, Đã đặt, Đang bảo trì), kiểm tra trùng giờ an toàn trong MySQL transaction phía server.
- **Thanh toán VietQR tự động qua SePay:** Sinh mã VietQR động theo chuẩn ngân hàng (`ASFF` Sân 5, `ASFS` Sân 7, `ASFE` Sân 11), nhận webhook tự động đối soát và xử lý giao dịch lệch tiền.
- **Vé điện tử, QR Check-in & Đánh giá sau trận:** Phát hành vé check-in ngay sau khi cọc, in vé PDF, chỉ đường Google Maps và gửi đánh giá 1–5 sao kèm góp ý (1 lần/đơn).
- **Hệ thống hội viên, Voucher & Danh sách chờ:** Quản lý lịch sử đặt sân, tích điểm atomic trên server, phân hạng thành viên, áp dụng mã giảm giá và đăng ký chờ slot trống.
- **Ghép kèo / Tìm đối (`/matchmaking`):** Đăng tin tìm đối giao hữu theo khung giờ/trình độ, có kiểm duyệt từ quản trị viên.
- **Tiện ích bổ trợ:** Widget Hotline/Zalo nổi trên mọi trang và xác nhận đồng thuận dữ liệu cá nhân theo Nghị định 13/2023.

### 2. Phân hệ Quản trị Vận hành (Portal Admin · RBAC 3 cấp: `staff` / `manager` / `admin`)
- **Tab 1 - Tổng quan KPI:** Doanh thu thực từ DB, tỷ lệ lấp đầy sân, số ca đá theo dõi (ẩn dữ liệu doanh thu nhạy cảm đối với tài khoản `staff`).
- **Tab 2 - Lịch đặt sân Timeline Gantt:** Bộ chọn ngày linh hoạt + biểu đồ thời gian 05:30–23:00; điều hành ca tại chỗ, danh sách chờ (Waitlist), lịch cố định hàng tuần (Recurring) và kiểm duyệt tin tìm đối.
- **Tab 3 - Đặt sân nhanh tại quầy, Kho nước & Chốt ca:** Đặt tại quầy khóa slot trùng phía server (hỗ trợ Gói 3 tháng), quản lý kho nước/dịch vụ kèm cảnh báo sắp hết hàng, chốt ca & bàn giao tiền mặt cuối ca.
- **Tab 4 - Quản lý sân bóng, Bảo trì & Đánh giá:** Thêm/sửa/ẩn sân, lên lịch bảo trì định kỳ (cảnh báo đơn trùng), theo dõi điểm đánh giá trung bình và phản hồi góp ý.
- **Tab 5 - Bảng giá, Voucher & Giờ vàng:** Cấu hình khung giá thường/cao điểm/cuối tuần lưu DB, quản lý mã khuyến mãi và quy tắc giá giờ vàng/thấp điểm.
- **Tab 6 - Khách & Hội viên CRM:** Hồ sơ khách hàng theo SĐT, nhãn VIP/Khách quen/Hay bùng sân (≥2 No-Show), bộ lọc công nợ chưa thu và lịch sử chi tiêu.
- **Tab 7 - Duyệt cọc VietQR & Đối soát Webhook:** Hàng chờ biên lai chuyển khoản + đối soát giao dịch SePay chưa khớp / chuyển thiếu hoặc thừa tiền.
- **Tab 8 - Báo cáo doanh thu & Sổ chi:** Lọc `Từ ngày – Đến ngày`, bóc tách tiền cọc / thu 70% / tiền mặt / VietQR / dịch vụ, quản lý chi phí vận hành, lãi ròng và xuất Excel CSV (UTF-8 BOM).
- **Tab 9 - Cài đặt, Nhân sự, Audit Log & Sao lưu:** Cấu hình VietQR, chính sách giữ chỗ/hoàn cọc, quản lý tài khoản nhân sự, bật 2FA TOTP, Audit Log chống thất thoát, nhật ký thông báo (Zalo/SMS & Telegram) và sao lưu/khôi phục CSDL.

---

## Cấu Trúc Mã Nguồn Chuẩn Hóa

```text
Web_Quan_Ly_San_Bong/
├── index.html                        # Trang chủ: Tìm kiếm nhanh, sân nổi bật, voucher, thời tiết
├── .htaccess                         # Clean URLs, ép HTTPS 301, chặn file nhạy cảm, CSP & Security Headers
├── .env.example                      # Mẫu biến môi trường an toàn (DB, SePay, Turnstile, Cron, Telegram, Backup)
├── robots.txt                        # Chỉ dẫn công cụ tìm kiếm, chặn bot quét API và Admin
├── css/                              # Thư mục giao diện tách module
│   ├── base.css                      # Reset style, font chữ Plus Jakarta Sans & Inter
│   ├── components.css                # Style UI Card, Button, Input, Modal, Badge
│   ├── booking.css                   # Style ma trận slot giờ và thanh tiến trình
│   ├── admin.css                     # Style biểu đồ Gantt timeline, bảng điều khiển KPI
│   ├── print.css                     # Định dạng in vé check-in điện tử
│   └── style.css                     # Tiện ích CSS bổ sung toàn cục
├── js/                               # Mã nguồn JavaScript ES6
│   ├── vendor/qrcode.min.js          # Thư viện tạo mã QR Check-in / 2FA offline
│   ├── helpers.js                    # Hàm tiện ích (định dạng tiền, escapeHTML, icon, CSRF helper)
│   ├── db.js                         # Bộ điều khiển dữ liệu SanBongDB & cache đồng bộ API
│   ├── ui.js                         # Thành phần UI dùng chung (Navbar, Footer, Toast, Modal, Consent)
│   ├── app.js                        # Gói Bundle hợp nhất từ vendor + helpers + db + ui
│   ├── api.js                        # Lớp gọi API bất đồng bộ (Fetch API, Open-Meteo, VietQR, SePay)
│   ├── index.js, fields.js, field-detail.js, booking.js, checkout.js, success.js, history.js, login.js
│   ├── matchmaking.js                # Logic trang ghép kèo / tìm đối (/matchmaking)
│   └── admin.js + admin_catalog.js + admin_ops.js + admin_inplay.js + admin_crm.js + admin_finance.js
├── html/                             # Giao diện trang chức năng (Clean URLs)
│   ├── fields.html                   # /fields: Danh sách và bộ lọc sân bóng
│   ├── field-detail.html             # /field-detail: Chi tiết sân bóng, cơ sở vật chất, bảng giá, đánh giá
│   ├── booking.html                  # /booking: Chọn ngày đá, slot giờ, dịch vụ, voucher & danh sách chờ
│   ├── checkout.html                 # /checkout: Quét mã VietQR chuyển khoản cọc 30%
│   ├── success.html                  # /success: Vé điện tử QR Check-in & đánh giá sau trận
│   ├── history.html                  # /history: Tra cứu lịch sử ca đá, đổi điểm & đánh giá sân
│   ├── matchmaking.html              # /matchmaking: Đăng tin ghép kèo / tìm đối
│   └── login.html                    # /login: Đăng nhập (hỗ trợ 2FA TOTP) & Đăng ký tài khoản
├── portal-admin/                     # Phân hệ Quản trị viên (/portal-admin)
│   ├── index.php                     # Cổng kiểm tra phiên RBAC (admin/manager/staff) & trạng thái DB
│   ├── index.html                    # Khung điều khiển trung tâm
│   └── partials/                     # Module quản trị: header, sidebar, tab1_kpi..tab9_settings
├── api/                              # Backend API RESTful chuẩn mực (PDO + CSRF + RBAC + Audit)
│   ├── security_helper.php           # Rate limit, Session 2h, CSRF, Sanitization, RBAC, 2FA TOTP
│   ├── sepay_helper.php              # Kết nối SePay API v2 (Sandbox/Production) & đối soát giao dịch
│   ├── notification_helper.php       # Dịch vụ gửi thông báo Zalo/SMS webhook & cảnh báo Telegram
│   ├── auth.php                      # Đăng nhập (Argon2id + 2FA), Đăng ký, Đăng xuất, Khôi phục/Quản lý phiên
│   ├── bookings.php                  # Tạo đơn, kiểm tra trùng transaction, giữ chỗ, hủy & áp dụng chính sách hoàn cọc
│   ├── pitches.php                   # Danh sách sân, bảng giá, giờ vàng, lịch bảo trì & cấu hình hệ thống
│   ├── admin.php                     # Router chính quản trị: điều hành ca, đặt quầy, sân, giá, cài đặt, nhân sự
│   ├── admin_ops.php                 # API vận hành: kho dịch vụ, chốt ca, lịch lặp, waitlist, bảo trì, matchmaking
│   ├── admin_crm.php                 # API CRM khách hàng, nợ chưa thu, lịch sử đặt & audit log
│   ├── admin_finance.php             # API báo cáo doanh thu, sổ chi phí, đối soát bank_transactions & sao lưu DB
│   ├── matchmaking.php               # API công khai đăng/tìm kèo giao hữu
│   ├── reviews.php                   # API gửi và xem đánh giá sân sau trận
│   ├── check_payment.php             # Endpoint Polling kiểm tra trạng thái cọc thời gian thực
│   └── sepay_webhook.php             # Endpoint tiếp nhận Webhook ngân hàng (HMAC / Secret + idempotent)
├── config/
│   ├── .htaccess                     # Chặn mọi truy cập HTTP trực tiếp vào config/
│   └── database.php                  # Đọc .env (ưu tiên ngoài webroot), kết nối PDO MySQL & auto-migration kiểm chuẩn
├── cron/                             # Tác vụ tự động định kỳ (chạy CLI hoặc HTTP có X-CRON-SECRET)
│   ├── .htaccess                     # Chặn truy cập web thông thường vào thư mục cron/
│   ├── auto_release_expired.php      # Tự động nhả đơn quá hạn giữ chỗ chưa cọc
│   ├── auto_generate_recurring.php   # Tự động sinh lịch cố định hàng tuần trước 4 tuần
│   ├── auto_remind_bookings.php      # Nhắc lịch khách trước giờ đá 2–3 giờ
│   └── backup_database.php           # Sao lưu mysqldump nén .sql.gz và xoay vòng bản lưu
├── database/
│   ├── .htaccess                     # Chặn truy cập web vào thư mục SQL
│   ├── schema.sql                    # Kịch bản khởi tạo CSDL MySQL ban đầu
│   └── migrations/                   # Migration an toàn 001..008 (Stage 1–7, Hardening & Hotfix)
├── tests/
│   └── security_hardening_test.php   # Bộ kiểm thử an ninh & cú pháp toàn bộ PHP/JS (RFC 6238, XSS, API, Lint)
└── scripts/                          # Công cụ build bundle & kiểm thử
    ├── build_app_bundle.js           # Biên dịch tự động js/app.js từ các module con
    ├── bump_version.js               # Đánh phiên bản Cache-Busting cho HTML/Portal
    ├── security_penetration_test.php # Bộ kiểm thử thâm nhập nội bộ (SQLi, IDOR, RBAC)
    └── run_production_pentest.js     # Script kiểm thử tự động trên môi trường Production
```

---

## Hướng Dẫn Cài Đặt & Triển Khai

### 1. Triển khai Cục bộ (Local Development)
Yêu cầu: Laragon / XAMPP với PHP 8.1+ và MySQL.
1. Clone dự án vào thư mục webroot:
   ```bash
   cd C:/laragon/www
   git clone https://github.com/vinhce/Web_Quan_Ly_San_Bong.git
   cd Web_Quan_Ly_San_Bong
   ```
2. Tạo tệp `.env` từ tệp mẫu `.env.example` (trên Production đặt `.env` **ngoài webroot**, ngang cấp `public_html/`):
   ```bash
   cp .env.example .env
   ```
3. Cập nhật thông tin kết nối CSDL, `CRON_SECRET`, khóa SePay (`SEPAY_ENV=production` / `SEPAY_BASE_URL=https://userapi.sepay.vn` khi chạy thật) và token Telegram/Zalo (nếu bật) vào `.env`.
4. Nhập schema ban đầu và các migration trong `database/migrations/` vào MySQL:
   ```bash
   mysql -u root -p sanbongpro < database/schema.sql
   ```
5. Cài đặt Cron Job định kỳ trên Hosting (khuyên dùng CLI hoặc kèm header `X-CRON-SECRET`):
   - `*/2 * * * *` → `php /path/to/cron/auto_release_expired.php`
   - `5 0 * * *` → `php /path/to/cron/auto_generate_recurring.php`
   - `*/15 * * * *` → `php /path/to/cron/auto_remind_bookings.php`
   - `0 2 * * *` → `php /path/to/cron/backup_database.php`
6. Mở trình duyệt và truy cập: `http://localhost/Quan_Ly_San_Bong/`

### 2. Tài khoản Đăng nhập Hệ thống
| Vai trò | Tên đăng nhập (Username) | Mật khẩu mặc định | Quyền hạn |
| :--- | :--- | :--- | :--- |
| **Quản Trị Viên (Admin)** | `vxyen0801` | *Đã mã hóa Argon2id* | Toàn quyền quản trị vận hành (`/portal-admin/`) |
| **Khách Hàng (User)** | `0352313548` (hoặc `user`) | *Đã mã hóa Argon2id* | Đặt sân, xem lịch sử đơn, tích lũy điểm thưởng |

---

## Kiểm Thử & Nghiệm Thu Hệ Thống

Trước khi xuất bản hoặc triển khai các bản cập nhật mới, chạy bộ công cụ kiểm thử tự động:

```bash
# 1. Biên dịch lại gói bundle frontend sau khi sửa js/helpers.js, js/db.js hoặc js/ui.js:
node scripts/build_app_bundle.js

# 2. Kiểm thử an ninh, 2FA, XSS, cấu hình & cú pháp toàn bộ file PHP/JS:
php tests/security_hardening_test.php

# 3. Kiểm thử thâm nhập nội bộ (Rate Limit, SQLi, IDOR, RBAC):
php scripts/security_penetration_test.php

# 4. Kiểm thử bảo mật trực tiếp trên máy chủ Production:
node scripts/run_production_pentest.js
```

---

## Giấy Phép & Bản Quyền

© 2026 **Sân Bóng Pro**. Bản quyền hệ thống thuộc về đơn vị quản lý và phát triển Sân Bóng Pro. Toàn bộ mã nguồn được xây dựng hướng tới hiệu năng cao, bảo mật tối ưu và khả năng mở rộng bền vững.

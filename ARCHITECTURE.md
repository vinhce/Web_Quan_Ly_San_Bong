# ARCHITECTURE — SÂN BÓNG PRO

## 1. TECH STACK
- **Backend:** PHP 8.1+ (Native PDO, strict types, transaction isolation, centralized error handling).
- **Database:** MySQL 8.0+ / MariaDB 10.4+ (`utf8mb4_unicode_ci`), cơ chế auto-migration kiểm tra marker `/logs/.schema_v12_booking_status_ready`.
- **Frontend:** HTML5 Clean URLs (Apache rewrite qua `.htaccess`), Tailwind CSS (CDN/Custom utility), Vanilla ES6 JavaScript (không dùng framework cồng kềnh, tối ưu hiệu năng).
- **Data Visualization:** Inline SVG Vector Charts thuần (tự render SVG responsive, không phụ thuộc thư viện cồng kềnh như Chart.js).
- **Asset Bundling:** Node.js script (`scripts/build_app_bundle.js`) đóng gói `js/vendor/qrcode.min.js` + `js/helpers.js` + `js/db.js` + `js/ui.js` thành `js/app.js`.
- **Dịch vụ tích hợp bên ngoài (Third-party APIs):**
  - Cổng thanh toán VietQR: SePay API v2 (`https://userapi.sepay.vn`) với webhook tự động đối soát (chuẩn hóa toàn bộ cổng thanh toán, không dùng PayOS).
  - Dự báo thời tiết: Open-Meteo API (Free tier, không cần API key).
  - Thư viện đọc mã QR: `jsQR` (quét camera thời gian thực & giải mã ảnh).
  - Bảo vệ chống Bot: Cloudflare Turnstile (Tùy chọn cấu hình trong `.env`).

---

## 2. CẤU TRÚC THƯ MỤC CHUẨN HÓA
```text
Quan_Ly_San_Bong/
├── index.html                        # Trang chủ: Tìm kiếm nhanh, sân nổi bật, voucher, thời tiết
├── favicon.svg, favicon.ico          # Nhận diện thương hiệu
├── .htaccess                         # Clean URLs, ép HTTPS 301, chặn file nhạy cảm, CSP & Headers
├── .env                              # Cấu hình biến môi trường cục bộ (không commit Git)
├── .env.example                      # Mẫu biến môi trường mẫu
├── robots.txt                        # Chỉ dẫn bot tìm kiếm, chặn quét API
├── PRD.md, ARCHITECTURE.md, DESIGN.md, RULES.md, TASKS.md, PROGRESS.md # Bộ 6 file Vibe Coding
│
├── api/                              # Backend API RESTful chuẩn mực
│   ├── security_helper.php           # Rate limit, Session 2h, CSRF, Sanitization, RBAC, 2FA TOTP
│   ├── sepay_helper.php              # Kết nối SePay API v2 & đối soát giao dịch ngân hàng
│   ├── notification_helper.php       # Dịch vụ gửi thông báo Zalo/SMS & cảnh báo Telegram
│   ├── auth.php                      # Đăng nhập (Argon2id + 2FA), Đăng ký, Đăng xuất, Phiên
│   ├── bookings.php                  # Đặt sân, kiểm tra trùng slot trong transaction, hủy & hoàn cọc
│   ├── pitches.php                   # Danh mục 17 sân bóng, bảng giá giờ vàng, lịch bảo trì
│   ├── check_payment.php             # Polling kiểm tra trạng thái thanh toán cọc VietQR
│   ├── matchmaking.php               # Đăng tin & quản lý ghép kèo tìm đối giao lưu
│   ├── reviews.php                   # Đánh giá sao, bình luận sân & phản hồi của quản lý/nhân viên
│   ├── sepay_webhook.php             # Xử lý webhook thanh toán VietQR tự động từ SePay API v2
│   ├── admin.php                     # Router quản trị trung tâm: điều hành ca, cài đặt, nhân sự
│   ├── admin_ops.php                 # Quản lý kho hàng & dịch vụ (nước uống, áo pitch), chốt ca, lịch lặp, waitlist
│   ├── admin_finance.php             # Báo cáo tài chính, biểu đồ doanh thu, chỉ số KPI kinh doanh, sổ thu chi
│   └── admin_crm.php                 # API CRM khách hàng, nợ chưa thu, lịch sử đặt sân
│
├── config/                           # Cấu hình hệ thống
│   └── database.php                  # Kết nối PDO Singleton, đọc biến môi trường, auto-migration
│
├── cron/                             # Các tác vụ chạy nền định kỳ
│   ├── auto_release_expired.php      # Quét tự động giải phóng các đơn đặt cọc quá hạn 10 phút
│   ├── auto_generate_recurring.php   # Tự động sinh lịch đặt sân định kỳ / gói tháng
│   ├── auto_remind_bookings.php      # Quét gửi nhắc lịch đá sắp tới cho khách hàng
│   └── backup_database.php           # Tự động sao lưu toàn diện CSDL nén gzip
│
├── css/                              # Thư mục stylesheet module hóa
│   ├── base.css                      # Reset styles, typography
│   ├── components.css                # Button, Input, Modal, Badge, Card
│   ├── booking.css                   # Ma trận slot giờ 18 khung và quy trình đặt sân
│   ├── admin.css                     # Bảng điều khiển Gantt timeline và layout portal
│   └── print.css                     # Định dạng in vé check-in điện tử
│
├── js/                               # Mã nguồn JavaScript ES6
│   ├── vendor/                       # Thư viện ngoài: qrcode.min.js, jsqr.min.js
│   ├── helpers.js                    # Tiện ích định dạng tiền tệ, escapeHTML, CSRF helper
│   ├── db.js                         # Lớp tương tác SanBongDB & đồng bộ API
│   ├── ui.js                         # Component UI dùng chung: Navbar, Modal, Toast
│   ├── app.js                        # File bundle được build tự động từ scripts/build_app_bundle.js
│   ├── api.js                        # Lớp gọi Fetch API bất đồng bộ
│   ├── booking.js, checkout.js, success.js, fields.js, field-detail.js, history.js, login.js
│   ├── admin_customers.js            # Module CRM: tìm kiếm SĐT, bảng CRM 2 cột mới & sửa hội viên
│   ├── admin_logs.js                 # Module Tab 11: Nhật ký Admin, 6 nhóm màu, legend, tooltip IP & lọc
│   └── admin.js, admin_ops.js, admin_inplay.js, admin_crm.js, admin_finance.js # Module Portal Admin (Inline SVG Charts)
│
├── html/                             # View giao diện khách hàng (được .htaccess phục vụ Clean URL)
│   ├── fields.html                   # /fields: Danh mục sân
│   ├── field-detail.html             # /field-detail: Chi tiết sân & đánh giá
│   ├── booking.html                  # /booking: Chọn sân, slot giờ & gói tháng
│   ├── checkout.html                 # /checkout: Quét mã QR cọc 30%
│   ├── success.html                  # /success: Vé điện tử QR Check-in
│   ├── history.html                  # /history: Tra cứu lịch sử ca đá & đổi điểm
│   ├── matchmaking.html              # /matchmaking: Ghép kèo tìm đối
│   └── login.html                    # /login: Đăng nhập & Đăng ký
│
├── portal-admin/                     # Phân hệ Quản trị viên (/portal-admin)
│   ├── index.php                     # Cổng kiểm tra phiên RBAC, CSRF & nạp partials
│   └── partials/                     # Các tab giao diện Tab 1 đến Tab 11 (Audit Log)
│
├── .agents/                          # Hệ thống Agent Harness & Optimization (Google Antigravity 2.0 / ECC)
│   ├── rules/                        # Quy chuẩn code review, bảo mật, coding style
│   ├── workflows/                    # Quy trình tự động hóa tác vụ
│   └── skills/                       # Thư viện 50+ skills chuyên sâu (tdd, verification-loop, eval-harness...)
│
├── database/                         # Kịch bản CSDL
│   ├── schema.sql                    # Schema CSDL duy nhất và đầy đủ của toàn bộ hệ thống
│   └── migrations/                   # 15 bản migration an toàn (001..015 mở rộng audit_logs & points_log)
│
├── scripts/                          # Script hỗ trợ phát triển & deploy
│   ├── build_app_bundle.js           # Build bundle cho js/app.js
│   └── deploy_to_hosting.js          # Đồng bộ tự động mã nguồn lên máy chủ Production qua OnePanel API
└── tests/                            # Bộ kiểm thử tự động
    ├── security_hardening_test.php   # Test bảo mật 25 kịch bản
    ├── test_part_a_admin_log.php     # Kiểm thử luồng Audit Log & Diffing
    ├── test_part_b_crm.php           # Kiểm thử tính toán ngày đặt gần nhất & số ca hoàn tất CRM
    └── test_part_c_member_crm.php    # Kiểm thử chuẩn hóa SĐT, points_log & khóa dòng FOR UPDATE
```

---

## 3. LUỒNG DỮ LIỆU (DATA FLOW)

```text
[Khách Hàng / Quản Trị Viên]
         │ (HTTPS Request)
         ▼
    [.htaccess] ─── Chặn truy cập file nhạy cảm, ép HTTPS, Rewrite Clean URL
         │
         ├──► [HTML / CSS / JS Frontend]
         │          │
         │          ▼ (Fetch API + X-CSRF-Token)
         └──► [api/*.php]
                    │
                    ├──► [security_helper.php] (Rate limit, Auth Session, Sanitization, RBAC)
                    │
                    ├──► [PDO MySQL Transaction] (SELECT ... FOR UPDATE, chống trùng slot)
                    │
                    └──► [SePay API Webhook] (Đối soát chuyển khoản tự động)
```

---

## 4. CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)
- **`pitches`**: Danh sách sân bóng (`id`, `name`, `type` [5/7/11], `price_per_hour`, `peak_price`, `status`, `description`).
- **`bookings`**: Đơn đặt sân (`id`, `order_code`, `pitch_id`, `booking_date`, `time_slot`, `customer_name`, `phone`, `total_price`, `deposit_amount`, `paid_amount`, `status` [pending, deposited, in_play, completed, cancelled, no_show], `qr_token`, `payment_method`).
- **`users`**: Tài khoản người dùng & nhân sự (`id`, `username`, `password_hash`, `full_name`, `phone`, `role` [admin, manager, staff, customer], `points`, `totp_secret`, `totp_enabled`).
- **`services`**: Dịch vụ kho nước / áo pitch / trọng tài (`id`, `name`, `price`, `stock`, `unit`).
- **`invoices`**: Hóa đơn thanh toán (`id`, `booking_id`, `subtotal`, `service_fee`, `discount_amount`, `final_amount`, `staff_id`, `created_at`).
- **`shifts`**: Nhật ký ca trực nhân viên (`id`, `staff_id`, `start_time`, `end_time`, `initial_cash`, `total_cash_collected`, `status`).
- **`vouchers`**: Mã giảm giá (`id`, `code`, `discount_type`, `discount_value`, `min_spend`, `usage_limit`, `used_count`, `expires_at`).
- **`audit_logs`**: Nhật ký hành động nhạy cảm của quản trị viên (`id`, `user_id`, `actor_name`, `actor_role`, `action`, `target_type`, `target_id`, `booking_id`, `old_value`, `new_value`, `ip`, `created_at`).
- **`points_log`**: Lịch sử cộng/trừ điểm hội viên minh bạch (`id`, `user_id`, `booking_id`, `delta`, `reason`, `admin_id`, `created_at`).

---

## 5. API CONTRACT & CHUẨN PHẢN HỒI

Mọi API trả về định dạng JSON chuẩn:
```json
{
  "success": true,
  "data": { ... },
  "message": "Thông báo thành công",
  "error": null
}
```
Trường hợp lỗi:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "SLOT_ALREADY_BOOKED",
    "message": "Khung giờ này vừa có người đặt cọc trước."
  }
}
```

### Các Endpoint Chính:
1. `POST /api/auth.php`: Xác thực tài khoản, đăng ký, đăng xuất, kiểm tra session.
2. `POST /api/bookings.php`: Đặt sân, tạo đơn đặt cọc, khóa slot an toàn qua transaction, tra cứu lịch sử và hủy/hoàn cọc.
3. `GET /api/pitches.php`: Lấy danh sách 17 sân bóng, trạng thái slot theo ngày và bảng giá giờ vàng/cao điểm.
4. `GET /api/check_payment.php`: Polling kiểm tra đối soát trạng thái thanh toán cọc VietQR.
5. `POST /api/sepay_webhook.php`: Webhook nhận thông báo chuyển khoản SePay API v2, xác thực chữ ký/cross-check và kích hoạt đơn tự động.
6. `POST /api/admin.php`: Router quản trị trung tâm: điều hành ca đá (nhận sân, bù giờ, đổi sân, hủy đơn), cấu hình và nhân sự (chống cập nhật thừa).
7. `POST /api/admin_ops.php`: Quản lý kho hàng & dịch vụ (bán nước giải khát, thuê áo pitch/bóng), chốt ca tiền mặt, bảng giá sân chống trùng log.
8. `GET /api/admin_finance.php`: Báo cáo tài chính, biểu đồ doanh thu theo ngày/tháng, chỉ số KPI kinh doanh và sổ thu chi vận hành.
9. `GET /api/admin_crm.php`: Tra cứu hồ sơ hội viên, tìm SĐT chuẩn hóa (+84/0), lấy ngày đặt gần nhất và số ca hoàn tất.
10. `POST /api/admin_crm.php?action=update_member`: Admin sửa thông tin hội viên (validate trùng phone/email, chống cập nhật thừa).
11. `POST /api/admin_crm.php?action=adjust_points`: Điều chỉnh điểm hội viên kèm lý do bắt buộc, ghi nhận qua `points_log` trong transaction có khóa dòng `FOR UPDATE`.
12. `GET /api/services/admin_settings.php?action=audit_logs`: Lấy danh sách nhật ký hệ thống kèm phân trang, lọc theo nhân viên, khoảng ngày, nhóm hành động 6 màu và tìm kiếm từ khóa.
13. `POST /api/matchmaking.php`: Đăng tin ghép kèo tìm đối giao lưu bóng đá và kiểm duyệt bài đăng.
14. `POST /api/reviews.php`: Đánh giá sao, gửi bình luận và phản hồi đánh giá của quản lý/nhân viên.

# ARCHITECTURE — SÂN BÓNG PRO

- **Website Production Live:** `https://fxzioyr.id.vn`
- **Admin Portal:** `https://fxzioyr.id.vn/portal-admin/`

## 1. TECH STACK
- **Backend:** PHP 8.1+ (Native PDO, strict types, transaction isolation, centralized error handling).
- **Database:** MySQL 8.0+ / MariaDB 10.4+ (`utf8mb4_unicode_ci`), cơ chế auto-migration trong `config/database.php` kiểm tra marker `/logs/.schema_v18_full_sync_ready`.
- **Frontend:** HTML5 Clean URLs (Apache rewrite qua `.htaccess`), Tailwind CSS (CDN/Custom utility), Vanilla ES6 JavaScript (tối ưu hiệu năng, không framework cồng kềnh).
- **Data Visualization:** Inline SVG Vector Charts thuần (tự render SVG responsive trong `js/admin_reports.js` & `js/admin_overview.js`).
- **Asset Bundling:** Node.js script (`scripts/build_app_bundle.js`) đóng gói `js/vendor/qrcode.min.js` cùng lớp điều phối `window.SanBongApp` thành `js/app.js`.
- **Dịch vụ tích hợp bên ngoài (Third-party APIs):**
  - Cổng thanh toán VietQR: SePay API v2 (`https://userapi.sepay.vn`) với webhook tự động đối soát (chuẩn hóa toàn bộ cổng thanh toán, không dùng PayOS).
  - Dự báo thời tiết: Open-Meteo API (Free tier, không cần API key).
  - Thư viện đọc mã QR: `jsQR` (`js/vendor/jsqr.min.js`, quét camera thời gian thực & giải mã ảnh).
  - Bảo vệ chống Bot: Cloudflare Turnstile (Tùy chọn cấu hình trong `.env`).

---

## 2. CẤU TRÚC THƯ MỤC CHUẨN HÓA
```text
Quan_Ly_San_Bong/
├── index.html                        # Trang chủ: Tìm kiếm nhanh, cụm 26 sân, voucher, thời tiết
├── favicon.svg, favicon.ico          # Nhận diện thương hiệu
├── .htaccess                         # Clean URLs, ép HTTPS 301, chặn thư mục/file nhạy cảm, CSP & Headers
├── .env                              # Cấu hình biến môi trường cục bộ (không commit Git)
├── .env.example                      # Mẫu biến môi trường chuẩn
├── robots.txt                        # Chỉ dẫn bot tìm kiếm, không tiết lộ đường dẫn nội bộ
├── PRD.md, ARCHITECTURE.md, DESIGN.md, RULES.md, TASKS.md, PROGRESS.md
│
├── api/                              # Backend API RESTful chuẩn mực
│   ├── security_helper.php           # Rate limit, Session 2h, CSRF, Sanitization, RBAC, logAdminChange()
│   ├── sepay_helper.php              # Kết nối SePay API v2 & đối soát giao dịch ngân hàng
│   ├── notification_helper.php       # Dịch vụ gửi thông báo Zalo/SMS webhook & cảnh báo Telegram
│   ├── auth.php                      # Đăng nhập (Argon2id + TOTP tùy chọn), Đăng ký, Đăng xuất, Phiên
│   ├── bookings.php                  # Đặt sân, kiểm tra trùng slot trong transaction, hủy & hoàn cọc
│   ├── team_split.php                # Sổ chia tiền nội bộ theo đội (optimistic concurrency revision)
│   ├── pitches.php                   # Danh mục 26 sân bóng, bảng giá giờ vàng, lịch bảo trì, cấu hình
│   ├── check_payment.php             # Polling kiểm tra trạng thái thanh toán cọc VietQR (FOR UPDATE)
│   ├── matchmaking.php               # Đăng tin & quản lý ghép kèo tìm đối giao lưu
│   ├── reviews.php                   # Đánh giá sao, bình luận sân & phản hồi của quản lý/nhân viên
│   ├── sepay_webhook.php             # Xử lý webhook thanh toán VietQR tự động từ SePay API v2
│   ├── admin.php                     # Router quản trị trung tâm: điều hành ca, đặt quầy, nhân sự, bảo trì
│   ├── admin_ops.php                 # API vận hành: kho dịch vụ, chốt ca, bảng giá, cài đặt, audit_logs
│   ├── admin_finance.php             # Báo cáo tài chính, biểu đồ, chỉ số KPI, sổ chi, đối soát ngân hàng
│   ├── admin_crm.php                 # API CRM khách hàng, hồ sơ hội viên, điểm thưởng (points_log) & lịch sử đặt
│   └── services/                     # Service Layer tách module (AdminLogService, admin_settings, cancellation_helper...)
│
├── config/                           # Cấu hình hệ thống
│   └── database.php                  # Kết nối PDO Singleton, đọc biến môi trường, auto-migration (v18)
│
├── cron/                             # Các tác vụ chạy nền định kỳ (CLI hoặc X-Cron-Secret + file lock)
│   ├── auto_release_expired.php      # Quét tự động giải phóng các đơn đặt cọc quá hạn (mặc định 15 phút)
│   ├── auto_generate_recurring.php   # Tự động sinh lịch đặt sân định kỳ / gói tháng (cửa sổ 4 tuần)
│   ├── auto_remind_bookings.php      # Quét gửi nhắc lịch đá sắp tới cho khách hàng
│   └── backup_database.php           # Tự động sao lưu toàn diện CSDL nén gzip (.sql.gz)
│
├── css/                              # Thư mục stylesheet module hóa
│   ├── base.css                      # Reset styles, typography
│   ├── components.css                # Button, Input, Modal, Badge, Card
│   ├── booking.css                   # Ma trận slot giờ 18 khung và quy trình đặt sân
│   ├── admin.css                     # Bảng điều khiển Gantt timeline và layout portal
│   ├── print.css                     # Định dạng in vé check-in điện tử
│   └── style.css                     # Stylesheet tổng hợp toàn cục
│
├── js/                               # Mã nguồn JavaScript ES6
│   ├── vendor/                       # Thư viện ngoài: qrcode.min.js, jsqr.min.js
│   ├── helpers.js                    # Tiện ích định dạng tiền tệ, escapeHTML, CSRF helper
│   ├── db.js (+ db_*.js)             # Lớp tương tác SanBongDB & đồng bộ API
│   ├── ui.js                         # Component UI dùng chung: Navbar, Modal, Toast
│   ├── app.js                        # File bundle sinh tự động từ scripts/build_app_bundle.js
│   ├── api.js                        # Lớp gọi Fetch API bất đồng bộ
│   ├── team_split.js                 # Modal chia tiền nội bộ theo đội
│   ├── booking.js, checkout.js, success.js, fields.js, field-detail.js, history.js, login.js, matchmaking.js
│   ├── admin_customers.js            # Module Tab 6 CRM: tìm kiếm SĐT, bảng CRM 8 cột & sửa hội viên
│   ├── admin_logs.js                 # Module Tab 11: Nhật ký Admin, 6 màu badge, legend, tooltip IP & lọc
│   └── admin*.js                     # Các module Portal Admin (overview, timeline, payments, shifts, reports, settings...)
│
├── html/                             # View giao diện khách hàng (phục vụ Clean URLs qua .htaccess)
│   ├── fields.html                   # /fields: Danh mục sân
│   ├── field-detail.html             # /field-detail: Chi tiết sân & đánh giá
│   ├── booking.html                  # /booking: Chọn sân, slot giờ & gói tháng
│   ├── checkout.html                 # /checkout: Quét mã QR cọc 30%
│   ├── success.html                  # /success: Vé điện tử QR Check-in
│   ├── history.html                  # /history: Tra cứu lịch sử ca đá, chia tiền đội & đánh giá
│   ├── matchmaking.html              # /matchmaking: Ghép kèo tìm đối
│   └── login.html                    # /login: Đăng nhập & Đăng ký
│
├── portal-admin/                     # Phân hệ Quản trị viên (/portal-admin/)
│   ├── index.php                     # Cổng kiểm tra phiên RBAC, CSRF & nạp partials
│   └── partials/                     # Header, Sidebar (11 tab) & tab1_kpi..tab11_admin_logs
│
├── .agents/                          # Hệ thống Agent Harness & Optimization
│   ├── rules/, workflows/, skills/
│
├── database/                         # Kịch bản CSDL
│   ├── schema.sql                    # Schema CSDL đầy đủ của toàn bộ hệ thống (26 sân mặc định)
│   └── migrations/                   # 17 bản migration an toàn (001..017: audit_logs, points_log, xóa công nợ)
│
├── scripts/                          # Script hỗ trợ phát triển, cache-busting & deploy
│   ├── build_app_bundle.js           # Build bundle cho js/app.js
│   ├── bump_version.js               # Cập nhật cache-busting ?v=...
│   └── deploy_to_hosting.js          # Đồng bộ mã nguồn lên Production
└── tests/                            # Bộ kiểm thử tự động
    ├── security_hardening_test.php   # Test bảo mật & kiểm tra cú pháp PHP/JS
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
    [.htaccess] ─── Chặn truy cập thư mục/file nhạy cảm, ép HTTPS, Rewrite Clean URL
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

## 4. CƠ SỞ DỮ LIỆU (DATABASE SCHEMA — `quan_ly_san_bong`)
- **`pitches`**: Danh mục 26 sân bóng (`id`, `name`, `type` [5/7/11], `base_price`, `peak_price`, `weekend_price`, `status`, `description`).
- **`bookings`**: Đơn đặt sân (`id`, `code`, `user_id`, `staff_id`, `pitch_id`, `booking_date`, `slot_id`, `slot_time`, `customer_name`, `phone`, `total_price`, `deposit_amount`, `paid_amount`, `remaining_amount` *(bộ đệm 70% cần thu tại quầy, không phải công nợ)*, `status` [`Giữ chỗ`, `Đã xác nhận`, `Đang đá`, `completed`/`Hoàn thành`, `Đã hủy`, `Khách chưa đến`], `payment_status`, `payment_method`, `expires_at`).
- **`users`**: Tài khoản người dùng & nhân sự (`id`, `username`, `email`, `phone`, `full_name`, `password_hash`, `role` [`user`, `staff`, `manager`, `admin`, `walkin`], `status`, `points`, `customer_tier`, `admin_note`, `version`, `totp_secret`, `totp_enabled`).
- **`extra_services`**: Dịch vụ kho nước / áo bib / bóng / trọng tài (`id`, `name`, `price`, `unit`, `stock_qty`, `min_stock_warning`, `track_inventory`, `is_active`).
- **`shifts`**: Nhật ký ca trực nhân viên (`id`, `staff_id`, `staff_name`, `start_time`, `end_time`, `initial_cash`, `cash_total`, `transfer_total`, `actual_cash_received`, `actual_cash`, `discrepancy_amount`, `cash_discrepancy`, `discrepancy_reason`, `status` [`open`, `closed`, `confirmed`]).
- **`vouchers`**: Mã giảm giá (`code`, `description`, `discount_type`, `discount_value`, `min_order`, `max_usage`, `used_count`, `max_per_user`, `valid_from`, `valid_to`, `pitch_type_limit`, `required_tier`, `is_active`).
- **`audit_logs`**: Nhật ký hành động nhạy cảm của quản trị viên (`id`, `user_id`, `actor_name`, `actor_role`, `action`, `target_type`, `target_id`, `booking_id`, `old_value`, `new_value`, `ip`, `created_at`).
- **`points_log`**: Lịch sử cộng/trừ điểm hội viên minh bạch (`id`, `user_id`, `booking_id`, `delta`, `reason`, `admin_id`, `created_at`).
- **Các bảng nghiệp vụ bổ sung:** `customer_crm`, `bank_transactions`, `service_sales`, `recurring_schedules`, `waitlist`, `golden_hour_rules`, `matchmaking_posts`, `pitch_maintenance`, `expenses`, `reviews`, `notification_logs`, `team_bill_splits`, `settings`, `rate_limits`.

---

## 5. API CONTRACT & CHUẨN PHẢN HỒI

Mọi API trả về định dạng JSON chuẩn:
```json
{
  "success": true,
  "data": { ... },
  "message": "Thông báo thành công"
}
```
Trường hợp lỗi:
```json
{
  "success": false,
  "message": "Khung giờ này vừa có người đặt cọc trước.",
  "ref_code": "ERR_DOUBLE_BOOKING"
}
```

### Các Endpoint Chính:
1. `POST /api/auth.php`: Xác thực tài khoản, đăng ký, đăng xuất, đổi mật khẩu, kiểm tra session (`?action=me`), TOTP 2FA.
2. `GET/POST /api/bookings.php`: Đặt sân, tạo đơn đặt cọc, khóa slot an toàn qua transaction, check-in, hủy/nhả sân, tra cứu lịch sử.
3. `GET/POST /api/team_split.php`: Xem và lưu bảng chia tiền nội bộ theo đội (kiểm soát xung đột qua `revision`).
4. `GET /api/pitches.php`: Lấy danh sách 26 sân bóng, khung giờ, dịch vụ, voucher, giờ vàng, lịch bảo trì và cấu hình hệ thống.
5. `GET /api/check_payment.php`: Polling kiểm tra đối soát trạng thái thanh toán cọc VietQR (cập nhật nguyên tử qua `FOR UPDATE`).
6. `POST /api/sepay_webhook.php`: Webhook nhận thông báo chuyển khoản SePay API v2, xác thực chữ ký/key và kích hoạt đơn tự động (idempotent).
7. `GET/POST /api/admin.php`: Router quản trị trung tâm (điều hành ca đá, đặt tại quầy, quản lý sân/bảo trì, nhân sự, voucher, giờ vàng, waitlist, lịch lặp).
8. `GET/POST /api/admin_ops.php`: Vận hành kho dịch vụ, chốt ca/giao ca (`shifts`), cấu hình bảng giá (`save_pricing` chống log thừa).
9. `GET/POST /api/admin_finance.php`: Báo cáo tài chính, đối soát 2 công thức, sổ chi phí, xuất CSV UTF-8 BOM, đối soát `bank_transactions` & sao lưu CSDL.
10. `GET/POST /api/admin_crm.php`: Tra cứu hồ sơ hội viên, tìm SĐT chuẩn hóa (`+84`/`0`/vài số cuối), `update_customer_crm` / `update_member` (chống cập nhật thừa, kiểm tra conflict), `adjust_points` ghi `points_log` với `FOR UPDATE`.
11. `GET/POST /api/services/admin_settings.php`: Quản lý cài đặt hệ thống (`settings`) và truy xuất nhật ký quản trị (`audit_logs` phân trang, lọc, che dữ liệu nhạy cảm).
12. `GET/POST /api/matchmaking.php`: Đăng tin ghép kèo tìm đối giao lưu bóng đá và kiểm duyệt bài đăng.
13. `GET/POST /api/reviews.php`: Đánh giá sao, gửi bình luận và phản hồi đánh giá của quản lý/nhân viên.

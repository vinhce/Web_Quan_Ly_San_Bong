# ARCHITECTURE — KIẾN TRÚC HỆ THỐNG SÂN BÓNG PRO

- **Production Live:** `https://fxzioyr.id.vn` · **Admin Portal:** `https://fxzioyr.id.vn/portal-admin/`

## 1. Tech Stack
- **Backend:** PHP 8.1+ (PDO Prepared Statements, MySQL Transactions, `SELECT ... FOR UPDATE`).
- **Database:** MySQL 8.0+ (khuyến nghị `8.4.3`, `utf8mb4_unicode_ci`) với auto-migration tại `config/database.php` (`ensureSchemaInitialized()` tới marker `logs/.schema_v23_audit_inverted_index_ready`).
- **Frontend:** HTML5 Clean URLs (`.htaccess`), **Tailwind CSS build cục bộ** (`css/tailwind.generated.css`, **0 CDN/Google Fonts ngoài**) và Vanilla ES6 JS (`scripts/build_app_bundle.js` đóng gói `js/app.js`).
- **Biểu đồ:** Inline SVG thuần trong `js/admin_reports.js` & `js/admin_overview.js` (không dùng Chart.js).
- **Tích hợp ngoài:** VietQR SePay API v2 (webhook idempotent), thời tiết Open-Meteo, quét QR `jsQR` và Cloudflare Turnstile (tùy chọn).

## 2. Cấu trúc thư mục chính
| Đường dẫn | Vai trò chính |
| :--- | :--- |
| `index.html`, `robots.txt` | Trang chủ, chỉ dẫn crawler |
| `.htaccess`, `.env`, `.env.example` | Clean URLs, HTTPS 301, `Cache-Control: private, no-store`, CSP & biến môi trường |
| `html/` | 13 view khách hàng (`fields`, `field-detail`, `booking`, `checkout`, `success`, `history`, `matchmaking`, `forgot-password`, `login`, trang lỗi) |
| `portal-admin/` | Shell RBAC (`index.php`) và partials `header.php`, `sidebar.php`, `tab1_kpi.php`..`tab11_admin_logs.php` |
| `api/` | Endpoint REST (`auth`, `bookings`, `pitches`, `check_payment`, `sepay_webhook`, `team_split`, `matchmaking`, `reviews`, `admin*`) & helpers (`security_helper`, `sepay_helper`, `notification_helper`) |
| `api/services/` | Nghiệp vụ tách lớp (`booking_creator`, `admin_shifts`, `admin_finance_reports`, `admin_settings`, `AdminLogRegistry`, `AdminLogRepository`, `AdminLogService`, `AdminLogIndexer`, ...) |
| `config/database.php` | Kết nối PDO Singleton & kiểm chuẩn migration tự động |
| `css/`, `js/` | CSS cục bộ (`tailwind.generated.css`, `style.css`, ...) & module ES6 (`helpers`, `db*`, `ui`, `app.js`, `history.js`, `admin_*.js`) |
| `database/` | `schema.sql` & **24 file migration (`001`..`023`)** |
| `cron/` | 4 job định kỳ chạy CLI hoặc `X-CRON-SECRET` có file lock |
| `scripts/`, `tests/`, `docs/` | Tool build/bump/deploy, bộ test bảo mật/UI/Inverted Index & tài liệu |

## 3. Luồng dữ liệu
```text
[Khách / Admin] ──▶ [.htaccess (HTTPS, Clean URL, No-Store, Chặn thư mục nhạy cảm)]
                         ├──▶ [HTML / Tailwind cục bộ / ES6 JS] ──(Fetch + X-CSRF-Token)──┐
                         └──▶ [api/*.php] ◀───────────────────────────────────────────────┘
                                  ├──▶ [security_helper.php] (Rate limit, Session 24h, RBAC, currentCustomer)
                                  ├──▶ [MySQL Transaction + SELECT ... FOR UPDATE]
                                  └──▶ [SePay Webhook v2] (Đối soát cọc tự động)
```

## 4. Bảng Cơ sở dữ liệu chính (`quan_ly_san_bong`)
| Bảng | Vai trò chính |
| :--- | :--- |
| `pitches` | Danh mục 26 sân bóng (5/7/11 người), giá thường/cao điểm/cuối tuần & trạng thái |
| `time_slots` | **7 khung giờ 2 tiếng/ca** (`S01` `05:30-07:30` .. `S07` `20:30-22:30`, nghỉ trưa `11:30-14:30`) |
| `bookings` | Đơn đặt sân, tiền tổng/cọc/đã thu, `remaining_amount` (bộ đệm 70% tại quầy, không phải công nợ), `idempotency_key` |
| `users` | Tài khoản `user`/`staff`/`manager`/`admin`/`walkin`, điểm `points`, hạng, `version`, 2FA TOTP |
| `extra_services`, `service_sales` | Kho nước/dịch vụ POS và lịch sử bán lẻ tại quầy |
| `shifts` | Ca trực nhân viên (`open`, `closed`, `confirmed`, `pending_explanation`, `staff_counted_cash`, xác minh lệch) |
| `vouchers`, `monthly_packages` | Mã giảm giá (`max_discount_amount`) & cấu hình gói cố định 4/8/12 tuần |
| `audit_logs`, `audit_reviews` | Nhật ký quản trị theo nhóm & kết quả hậu kiểm inline trên Tab 11 |
| `audit_search_tokens` | Inverted Index thuần SQL (`token`, `log_id`, `ON DELETE CASCADE`) tìm kiếm không dấu/SĐT/đa từ |
| `points_log`, `password_resets` | Lịch sử cộng/trừ điểm (`FOR UPDATE`) & token đặt lại mật khẩu |
| *Bảng nghiệp vụ bổ sung* | `customer_crm`, `bank_transactions`, `recurring_schedules`, `waitlist`, `golden_hour_rules`, `matchmaking_posts`, `pitch_maintenance`, `expenses`, `reviews`, `notification_logs`, `team_bill_splits`, `settings`, `rate_limits` |

## 5. Chuẩn API & Các Endpoint chính
Mọi API trả JSON thống nhất `{ "success": true, "data": ..., "message": "..." }` (hoặc `"success": false` kèm `"ref_code"` như `ERR_DOUBLE_BOOKING` khi lỗi).

| Endpoint | Chức năng chính |
| :--- | :--- |
| `POST /api/auth.php` | Đăng nhập (Argon2id + TOTP), đăng ký, đăng xuất, đổi/quên mật khẩu, phiên 24h (`?action=me`) |
| `GET/POST /api/bookings.php` | Đặt sân, `eligible_vouchers`, khóa trùng khoảng thời gian, check-in, hủy/nhả sân, lịch sử |
| `GET/POST /api/team_split.php` | Chia tiền nội bộ theo đội (chống xung đột bằng `revision`) |
| `GET /api/pitches.php` | Lấy danh sách 26 sân, 7 khung giờ 2 tiếng, dịch vụ, voucher, giờ vàng, lịch bảo trì |
| `GET /api/check_payment.php` | Kiểm tra trạng thái thanh toán VietQR nguyên tử (`FOR UPDATE`) |
| `POST /api/sepay_webhook.php` | Nhận webhook SePay v2, xác thực secret/HMAC và kích hoạt đơn idempotent |
| `GET/POST /api/admin.php` | Router điều hành ca, đặt quầy, sân/bảo trì, nhân sự, voucher, waitlist, lịch lặp, hậu kiểm Tab 11 & CSV BOM |
| `GET/POST /api/admin_ops.php` | Kho dịch vụ, chốt ca (`pending_explanation`), cấu hình bảng giá (chống log thừa) |
| `GET/POST /api/admin_finance.php` | Báo cáo doanh thu 4 sub-tab, sổ chi thống nhất, đối soát `bank_transactions`, xuất CSV BOM & sao lưu |
| `GET/POST /api/admin_crm.php` | CRM 2 nút lọc, tìm SĐT chuẩn hóa, sửa hội viên (bắt buộc lý do) & chỉnh điểm `points_log` |
| `GET/POST /api/services/admin_settings.php` | Cài đặt hệ thống & truy vấn `audit_logs` (Inverted Index, che dữ liệu nhạy cảm) |
| `GET/POST /api/matchmaking.php`, `/api/reviews.php` | Đăng/duyệt tin ghép kèo và đánh giá sao/phản hồi sau trận |

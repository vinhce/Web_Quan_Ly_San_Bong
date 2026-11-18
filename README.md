# Sân Bóng Pro — Hệ Thống Quản Lý & Đặt Sân Bóng Đá Trực Tuyến

> **Hệ thống đặt sân bóng đá trực tuyến chuẩn FIFA, tích hợp thanh toán VietQR SePay 1 chạm và phân hệ quản trị vận hành 11 tab toàn diện.**

* **Production Live:** [https://fxzioyr.id.vn](https://fxzioyr.id.vn) (`v20261118_v95`, cập nhật `2026-11-18`)
* **Kho lưu trữ GitHub:** [github.com/vinhce/Web_Quan_Ly_San_Bong](https://github.com/vinhce/Web_Quan_Ly_San_Bong)
* **Tài liệu dự án:** [PROGRESS.md](PROGRESS.md) · [TASKS.md](TASKS.md) · [docs/TIEN_DO.md](docs/TIEN_DO.md) · [AGENTS.md](AGENTS.md)

---

## Trạng Thái Phát Hành Hiện Tại (`v20261118_v95`)

* **Hạ tầng & CSDL:** 26 sân bóng (9 sân 5, 10 sân 7, 7 sân 11; 25–26 sân hoạt động) · 17 database migrations (`001`..`017`).
* **Bảo mật & Audit:** 25 hạng mục security hardening · Hợp nhất Nhật ký Admin tại **Tab 11** (**95 mã hành động / 9 nhóm**), gỡ bỏ `#admin-audit-tbody` trùng lặp ở Tab 10.
* **Kiểm thử & Go-Live:** `17/17` local test suites PASS · `49/49` file production đã triển khai và nghiệm thu E2E trên `https://fxzioyr.id.vn` với `0` console/HTTP errors.

---

## Tính Năng Chính

### 1. Trải nghiệm Khách hàng
* **Danh mục & Thời tiết sân (`/` · `/fields` · `/field-detail`):** Quản lý 26 sân (5, 7, 11 người), giá theo khung giờ thường / cao điểm / cuối tuần và dự báo thời tiết thời gian thực qua Open-Meteo API.
* **Đặt sân & Gói tháng (`/booking`):** Ma trận 18 khung giờ (05:30–23:00), khóa trùng slot an toàn trong MySQL transaction; hỗ trợ gói cố định 1–3 tháng (giảm 5%–15%).
* **VietQR SePay tự động (`/checkout` · `api/sepay_webhook.php`):** Sinh mã VietQR cọc 30% theo đầu mã sân (`ASFF` Sân 5, `ASFS` Sân 7, `ASFE` Sân 11), đối soát webhook idempotent và xử lý lệch tiền.
* **Vé QR, Hội viên & Ghép kèo (`/success` · `/history` · `/matchmaking`):** Phát hành vé QR Check-in, in PDF, đánh giá 1–5 sao (1 lần/đơn), tích điểm hội viên, voucher, waitlist và đăng tin tìm đối.
* **An toàn & Tuân thủ:** Cloudflare Turnstile chống bot (tùy chọn) và xác nhận đồng thuận dữ liệu cá nhân theo Nghị định 13/2023.

### 2. Phân hệ Quản trị `/portal-admin` (RBAC 3 cấp: `staff` / `manager` / `admin`)
Giao diện điều khiển responsive (Drawer Mobile & Desktop) tại `portal-admin/index.php`, định nghĩa chuẩn trong `portal-admin/partials/sidebar.php`:

1. **`1. Tổng quan & Đang chơi`** (`overview`): KPI doanh thu thực (ẩn số liệu nhạy cảm với `staff`), tỷ lệ lấp đầy và quét QR Check-in qua Camera / tải ảnh (`jsQR`) hoặc súng quét.
2. **`2. Lịch đặt sân Timeline`** (`timeline`): Biểu đồ Gantt 05:30–23:00, điều hành ca tại chỗ (bù giờ, đổi sân, gọi nước), Waitlist, lịch cố định (Recurring) và duyệt tin tìm đối.
3. **`3. Đặt sân tại quầy`** (`quick-booking`): Tạo đơn trực tiếp khóa trùng slot phía server (hỗ trợ gói tháng) và quản lý kho nước/dịch vụ kèm cảnh báo tồn thấp.
4. **`4. Quản lý sân bóng`** (`pitches`): Thêm/sửa/ẩn danh mục 26 sân, cấu hình giá riêng, lịch bảo trì (cảnh báo đơn trùng) và theo dõi đánh giá khách hàng.
5. **`5. Bảng giá & Voucher`** (`pricing` · `admin`): Cấu hình giá giờ thường/cao điểm/cuối tuần, chính sách gói tháng, quy tắc giờ vàng và voucher kèm diff-check chống cập nhật thừa.
6. **`6. Khách & Hội viên`** (`customers`): Tìm kiếm SĐT chuẩn hóa, CRM hiển thị "Đặt gần nhất" & "Số lượt đặt", nhãn cảnh báo bùng sân (≥1 No-Show), 3 bộ lọc (`Tất cả khách`, `Hội viên VIP`, `Khách quen`), sửa hội viên & điều chỉnh điểm qua `points_log` (`FOR UPDATE`).
7. **`7. Duyệt cọc VietQR`** (`payments` · `manager`/`admin`): Duyệt hàng chờ biên lai và đối soát giao dịch `bank_transactions` SePay (thiếu/thừa/chưa khớp).
8. **`8. Chốt ca / Giao ca`** (`shifts`): Mở ca, kiểm kê tiền mặt thực tế, tính chênh lệch bàn giao và lưu lịch sử ca trực.
9. **`9. Báo cáo doanh thu`** (`reports` · `manager`/`admin`): Lọc theo khoảng ngày, bóc tách tiền cọc / thanh toán đủ / tiền mặt / VietQR / dịch vụ, sổ chi phí, lãi ròng, biểu đồ SVG và xuất CSV UTF-8 BOM.
10. **`10. Cài đặt hệ thống`** (`settings` · `admin`): Cấu hình VietQR SePay, chính sách giữ chỗ/hoàn cọc, quản lý tài khoản nhân sự, nhật ký thông báo (Zalo/SMS/Telegram) và sao lưu `.sql.gz`.
11. **`11. Nhật ký Admin`** (`logs` · `admin`): Admin Audit Log bất biến hợp nhất qua `AdminLogService.php` (**95 mã hành động / 9 nhóm**), diff Cũ → Mới, che SĐT/STK/CCCD, lọc theo nhóm/nhân sự/từ khóa và phân trang.

---

## Bản Đồ Module Mã Nguồn

| Thư mục / Tệp | Vai trò chính |
| :--- | :--- |
| `index.html`, `html/*.html`, `.htaccess` | Trang chủ, 8 trang chức năng Clean URLs, ép HTTPS 301, CSP & Security Headers |
| `css/` | Stylesheet module (`base`, `components`, `booking`, `admin`, `print`, `style`) |
| `js/` & `js/app.js` | Frontend ES6 (`api.js`, `db.js`, `ui.js`, `helpers.js`), bundle `app.js`, `admin_*.js` (gồm `admin_logs.js`) |
| `portal-admin/` | Shell RBAC (`index.php`) & partials (`header.php`, `sidebar.php`, `tab1`..`tab11`) |
| `api/` & `api/services/` | REST API PDO (`auth`, `bookings`, `pitches`, `admin*`, `sepay_webhook`), `security_helper.php`, `AdminLogService.php` |
| `config/database.php` | Đọc `.env`, kết nối PDO MySQL & auto-check schema (`ensureSchemaInitialized()`) |
| `database/` | `schema.sql` & `migrations/001..017` (17 bản migration CSDL `quan_ly_san_bong`) |
| `cron/` | Tác vụ định kỳ bảo vệ bằng CLI / `X-CRON-SECRET` (nhả giữ chỗ, sinh lịch lặp, nhắc lịch, backup `.sql.gz`) |
| `tests/`, `scripts/`, `docs/`, `.agents/` | Bộ test an ninh/hồi quy (`17` suites), tool build/bump/pentest, tài liệu nội bộ & ECC workspace |

---

## Kiến Trúc Bảo Mật & Phân Quyền

* **Xác thực & Phiên:** Mật khẩu băm **Argon2id**, rate limit đăng nhập `5 lần / 15 phút`, session tối đa 2 giờ (`HttpOnly`, `SameSite`, rotate Session ID), `refresh_session_user()` fail-closed khi user bị khóa/xóa, hỗ trợ 2FA **TOTP (RFC 6238)** và CSRF Token (`X-CSRF-Token`).
* **Dữ liệu & Hạ tầng:** PDO Prepared Statements, MySQL Transaction + `SELECT ... FOR UPDATE` chống đặt trùng/Lost Update, `.htaccess` chặn truy cập `config/`, `cron/`, `database/`, `docs/`, `logs/`, `backups/` và `api/*.json`; webhook SePay kiểm tra Secret/HMAC và idempotent.
* **Quản lý tài khoản:** Phân quyền 4 vai trò (`admin`, `manager`, `staff`, `user`); tài khoản quản trị/nhân sự được cấp phát và đổi mật khẩu qua CSDL hoặc **Tab 10**, tuyệt đối không lưu thông tin đăng nhập hay secret thật trong mã nguồn hoặc tài liệu công khai.

---

## Cài Đặt, Build & Kiểm Thử

### 1. Triển khai Cục bộ (Local)
Yêu cầu: PHP 8.1+ (`pdo_mysql`, `curl`, `openssl`), MySQL 5.7+/8.0+, Node.js (nếu build/bump JS).
1. Clone dự án về webroot (vd `C:/laragon/www/Quan_Ly_San_Bong`) và tạo cấu hình:
   ```bash
   cp .env.example .env
   ```
   *(Trên Production đặt `.env` ngoài webroot; điền thông số DB `quan_ly_san_bong`, `CRON_SECRET`, SePay và Telegram/Zalo).*
2. Khởi tạo CSDL bằng `database/schema.sql` và/hoặc chạy tuần tự `database/migrations/001..017` (hệ thống cũng tự kiểm chuẩn qua `ensureSchemaInitialized()`):
   ```bash
   mysql -u root -p < database/schema.sql
   ```
3. Cài đặt Cron định kỳ (CLI hoặc header `X-CRON-SECRET`):
   * `*/2 * * * *` → `php /path/to/cron/auto_release_expired.php`
   * `5 0 * * *` → `php /path/to/cron/auto_generate_recurring.php`
   * `*/15 * * * *` → `php /path/to/cron/auto_remind_bookings.php`
   * `0 2 * * *` → `php /path/to/cron/backup_database.php`
4. Truy cập cục bộ: `http://localhost/Quan_Ly_San_Bong/`

### 2. Build & Kiểm thử trước khi phát hành
```bash
# Biên dịch lại js/app.js sau khi sửa js/helpers.js, js/db.js hoặc js/ui.js
node scripts/build_app_bundle.js

# Cập nhật tham số Cache-Busting (?v=...) trên HTML & Portal Admin
node scripts/bump_version.js 20261118_v95

# Kiểm thử an ninh, 2FA, XSS, cấu hình & cú pháp PHP/JS
php tests/security_hardening_test.php

# Kiểm thử thâm nhập nội bộ & kiểm thử Production
php scripts/security_penetration_test.php
node scripts/run_production_pentest.js
```

---

## Bản Quyền

© 2026 **Sân Bóng Pro**. Toàn bộ mã nguồn được phát triển phục vụ vận hành và quản lý hệ thống sân bóng trực tuyến.

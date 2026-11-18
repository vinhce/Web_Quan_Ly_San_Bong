# TÀI LIỆU TỔNG QUAN DỰ ÁN SÂN BÓNG PRO (`https://fxzioyr.id.vn`)
### HỆ THỐNG QUẢN LÝ ĐẶT SÂN VÀ VẬN HÀNH TỔ HỢP THỂ THAO THÔNG MINH

> Tài liệu này đóng vai trò bản tóm tắt điều hướng trung tâm của dự án **Sân Bóng Pro**. Các đặc tả chi tiết được tách thành từng nguồn chuẩn để tránh trùng lặp:
> - Nghiệp vụ & phạm vi tính năng: [PRD.md](../PRD.md)
> - Kiến trúc hệ thống, CSDL & API: [ARCHITECTURE.md](../ARCHITECTURE.md)
> - Hệ thống giao diện & UI/UX: [DESIGN.md](../DESIGN.md)
> - Quy tắc kỹ thuật & thuật ngữ bắt buộc: [RULES.md](../RULES.md)
> - Tài khoản, ma trận RBAC & vận hành Portal Admin: [DANH_SACH_TAI_KHOAN.md](./DANH_SACH_TAI_KHOAN.md) · [TAI_KHOAN_ADMIN.md](./TAI_KHOAN_ADMIN.md)

---

## 1. GIỚI THIỆU TỔNG QUAN & MÔ HÌNH VẬN HÀNH

- **Đơn vị chủ quản:** Tổ hợp thể thao Sân Bóng Pro Mỹ Đình (Số 18 Lê Đức Thọ, P. Mỹ Đình 1, Q. Nam Từ Liêm, TP. Hà Nội).
- **Domain Production Live:** `https://fxzioyr.id.vn/` (Cổng khách hàng) · `https://fxzioyr.id.vn/portal-admin/` (Cổng quản trị).
- **Quy mô hạ tầng:** **26 sân bóng đá cỏ nhân tạo** (9 sân 5 người, 10 sân 7 người, 7 sân 11 người) vận hành **18 khung giờ/ngày** (`05:30 – 23:00`).
- **Mô hình dòng tiền cốt lõi — KHÔNG CÓ CÔNG NỢ ĐỌNG:**
  1. Khách đặt sân chuyển khoản **cọc 30%** qua mã **VietQR động** (`ASFF` Sân 5, `ASFS` Sân 7, `ASFE` Sân 11), đối soát tự động qua **SePay Webhook API v2**.
  2. Khách đến sân quét vé QR check-in và thanh toán **70% còn lại + dịch vụ phát sinh** tại quầy.
  3. Hệ thống giải quyết triệt để vấn đề đặt trùng slot (`SELECT ... FOR UPDATE`), sai lệch cọc ngân hàng và tình trạng **khách không đến / trễ giờ quá hạn** (quy chuẩn trạng thái: **`Khách chưa đến`** sau 15 phút ân hạn).

---

## 2. PHÂN HỆ KHÁCH HÀNG (CLIENT PORTAL)

Chi tiết checklist xem tại [PRD.md](../PRD.md). Các luồng chính gồm:
- **Đặt sân & Gói tháng (`/fields`, `/booking`):** Xem ma trận 18 khung giờ realtime của 26 sân, tích hợp dự báo thời tiết Open-Meteo, hỗ trợ đặt lẻ hoặc gói cố định 1–3 tháng (4/8/12 tuần, giảm 5%–15% kèm quà tài trợ) và đăng ký Danh sách chờ (Waitlist).
- **Thanh toán VietQR & Vé điện tử (`/checkout`, `/success`):** Giữ chỗ mặc định `15 phút` (`hold_minutes`), đối soát qua `api/sepay_webhook.php` / `api/check_payment.php`, cấp vé QR check-in và đánh giá 1–5 sao sau trận (`/history`, `api/reviews.php`).
- **Chia tiền nội bộ theo đội (`api/team_split.php`):** Sổ thu nội bộ chia đều tổng đơn cho các thành viên đội bóng ngay trong `/history` (kiểm soát xung đột bằng `revision`, tách biệt với thanh toán cho sân).
- **Ghép kèo & Điểm thưởng (`/matchmaking`, `points_log`):** Đăng tin cáp đối giao hữu (hỗ trợ duyệt tin từ quản lý), tích lũy và đổi điểm thưởng minh bạch qua `points_log`, đồng thuận bảo vệ dữ liệu cá nhân theo Nghị định 13/2023.

---

## 3. KIẾN TRÚC HỆ THỐNG, CSDL & QUY CHUẨN KỸ THUẬT

Kiến trúc chi tiết, sơ đồ thư mục, schema bảng và danh sách API xem tại [ARCHITECTURE.md](../ARCHITECTURE.md); quy tắc ràng buộc xem tại [RULES.md](../RULES.md).

- **Stack công nghệ:** PHP 8.1+ (PDO Prepared Statements, MySQL Transactions), MySQL 8.0+ / MariaDB (`quan_ly_san_bong`), HTML5 Clean URLs (`.htaccess`), Tailwind CSS, Vanilla ES6 JavaScript (`scripts/build_app_bundle.js` build `js/app.js`), biểu đồ **Inline SVG thuần** (không dùng thư viện chart bên thứ ba), `jsQR` (quét QR camera/ảnh) và Cloudflare Turnstile (tùy chọn).
- **Chống đặt trùng slot & Race Condition:** Mọi thao tác giữ chỗ, kiểm tra cọc (`api/check_payment.php`), hủy đơn (`early_cancel`), cập nhật điểm (`points_log`) đều thực hiện trong MySQL Transaction với khóa dòng `SELECT ... FOR UPDATE`.
- **Database & Migrations:** Toàn bộ schema hợp nhất trong `database/schema.sql` kèm **17 bản migration idempotent (`001..017`)** và cơ chế auto-migration trong `config/database.php` (marker `/logs/.schema_v18_full_sync_ready`).

---

## 4. PHÂN HỆ QUẢN TRỊ TRUNG TÂM (`/portal-admin/` — 11 TAB CHUẨN)

Cổng `/portal-admin/` kiểm soát phiên server-side tại `portal-admin/index.php` và phân chia thành **11 tab chuẩn** theo `portal-admin/partials/sidebar.php` (xem ma trận quyền và hướng dẫn thao tác chi tiết tại [DANH_SACH_TAI_KHOAN.md](./DANH_SACH_TAI_KHOAN.md) và [TAI_KHOAN_ADMIN.md](./TAI_KHOAN_ADMIN.md)):

| Tab | Tên phân hệ | Mã tab | Quyền truy cập | Tóm tắt chức năng |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Tổng quan & Đang chơi** | `overview` | `staff`, `manager`, `admin` | KPI doanh thu & biểu đồ (`admin`), tỷ lệ lấp đầy, lọc ca trong ngày, quét QR Check-in (`jsQR`) |
| **2** | **Lịch đặt sân Timeline** | `timeline` | `staff`, `manager`, `admin` | Gantt `05:30–23:00`, Popup điều hành (bù giờ, đổi sân, thêm nước, hủy / nhả sân **Khách chưa đến**), Waitlist, Lịch lặp; duyệt ghép kèo (`manager`, `admin`) |
| **3** | **Đặt sân tại quầy** | `quick-booking` | `staff`, `manager`, `admin` | Đặt sân POS chống trùng (cảnh báo khách không đến / trễ giờ quá hạn), Kho nước & bán lẻ trừ tồn (`manager`, `admin` thêm/sửa dịch vụ) |
| **4** | **Quản lý sân bóng** | `pitches` | `staff`, `manager`, `admin` | Quản lý 26 sân, bật/tắt bảo trì nhanh, thêm/sửa sân (`admin`), lịch bảo trì định kỳ & phản hồi đánh giá (`manager`, `admin`) |
| **5** | **Bảng giá & Voucher** | `pricing` | `admin` | Giá thường/cao điểm/cuối tuần, chính sách gói tháng 1–3 tháng, Voucher, quy tắc giờ vàng (chống cập nhật thừa) |
| **6** | **Khách & Hội viên** | `customers` | `staff` (xem), `manager`, `admin` | Tìm SĐT chuẩn hóa, bảng 8 cột cố định, 3 nút lọc, Modal CRM hợp nhất & `points_log` |
| **7** | **Duyệt cọc VietQR** | `payments` | `manager`, `admin` | Duyệt biên lai VietQR & đối soát giao dịch SePay Webhook (`bank_transactions`) khi lệch tiền / sai nội dung |
| **8** | **Chốt ca / Giao ca** | `shifts` | `staff`, `manager`, `admin` | Mở ca tiền mặt đầu ca, tự tổng hợp tiền mặt & VietQR trong ca, kiểm đếm thực tế & xác nhận chốt ca (`manager`, `admin`) |
| **9** | **Báo cáo doanh thu** | `reports` | `manager`, `admin` | Đối chiếu 2 công thức dòng tiền, biểu đồ Inline SVG, bảng kê ca đặt, doanh thu theo sân, Sổ chi & lãi ròng, xuất CSV UTF-8 BOM |
| **10** | **Cài đặt hệ thống** | `settings` | `admin` | Tỷ lệ cọc, ngân hàng VietQR, thời gian giữ chỗ, mốc hoàn/phạt cọc, Zalo/SMS & Telegram Bot, nhân sự, nhật ký thông báo, backup `.sql.gz` |
| **11** | **Nhật ký Admin** | `logs` | `admin` | Nhật ký bất biến (append-only), diffing Cũ → Mới, 6 nhóm màu badge (`🟢`, `🔴`, `🔵`, `🟠`, `🟣`, `⚪`), che dữ liệu nhạy cảm, tooltip IP |

---

## 5. CHUẨN HÓA CRM HỘI VIÊN & XÓA BỎ CÔNG NỢ (MIGRATION 015–017)

1. **Xóa sạch công nợ đọng (Migration 016 & 017):**
   - Toàn bộ bảng/cột nợ đọng bị loại bỏ khỏi CSDL, API (`api/admin_crm.php`, `api/admin_finance.php`) và giao diện Portal Admin.
   - Trường `bookings.remaining_amount` chỉ là bộ đệm ghi nhận **70% tiền sân cần thu nốt tại quầy** cho ca chưa hoàn tất; backend từ chối đóng đơn sang `completed` nếu số tiền thực thu chưa đủ 100% (trừ khi quản lý/admin điều chỉnh giảm kèm lý do).
2. **Bảng CRM 8 cột cố định (`portal-admin/partials/tab6_customers.php` & `js/admin_customers.js`):**
   - `Tên hội viên` (kèm nhãn đỏ `<N> lần bùng` nếu `Khách chưa đến` ≥ 1, nhãn `Blacklist` nếu bị khóa) · `Số điện thoại` · `Hạng` · `Trận hoàn thành` · `Điểm tích lũy` (đơn vị `điểm`) · `Đặt gần nhất` (`Hôm nay`, `x ngày trước`, `Sắp tới`, `—`) · `Tổng chi tiêu` · `Thao tác`.
   - Thanh lọc tinh gọn 3 nút: `[Tất cả khách]`, `[Hội viên VIP]`, `[Khách quen]`.
3. **Modal Hồ sơ CRM hợp nhất & `points_log` (Migration 015):**
   - 4 thẻ chỉ số trên cùng (`Trận hoàn thành`, `Khách chưa đến / Hủy`, `Điểm tích lũy`, `Tổng chi tiêu`), 1 form chỉnh sửa duy nhất (kiểm tra trùng SĐT/email và optimistic locking `updated_at`/`version`), cùng 3 subtab lịch sử có phân trang.
   - Điều chỉnh điểm bắt buộc nhập lý do, ghi nhận vào `points_log` và cập nhật `users.points` trong cùng transaction với `SELECT ... FOR UPDATE` (chặn điểm âm) kèm Audit Log.

---

## 6. AN TOÀN THÔNG TIN, BẢO MẬT & THIẾT KẾ UI/UX

- **Bảo mật (`RULES.md` & `ARCHITECTURE.md`):** Băm mật khẩu **Argon2id**, Rate Limit `5 lần / 15 phút` + khóa tạm trên DB, Session tối đa 2 giờ (`HttpOnly`, `Secure`, `SameSite=Lax`), `X-CSRF-Token` trên mọi thao tác ghi, kiểm soát quyền server-side (`require_staff_or_admin`, `require_manager_or_admin`, `require_admin`), PDO Prepared Statements, escape XSS, xác thực SePay Webhook qua HMAC/Secret, hỗ trợ TOTP 2FA tùy chọn, che SĐT/CCCD/STK trong `AdminLogService` và tuân thủ Nghị định 13/2023.
- **Design System & UI/UX:** Xem đầy đủ Design Tokens (`#16A34A`, `#0F172A`, `#F8FAFC`), Typography (`Plus Jakarta Sans`, `Inter`), 6 màu badge Audit Log, Mobile-first từ `360px` (`100dvh`, vùng bấm ≥ `44px`) và quy chuẩn 4 trạng thái UI (Loading/Empty/Error/Success) tại [DESIGN.md](../DESIGN.md).

---

## 7. TÀI KHOẢN & TÁC VỤ ĐỊNH KỲ (CRON JOBS)

- **Tài khoản & Phân quyền:** Không lưu thông tin liên hệ cá nhân hay lệnh reset SQL trong tài liệu. Xem danh mục tài khoản mẫu theo vai trò tại [DANH_SACH_TAI_KHOAN.md](./DANH_SACH_TAI_KHOAN.md) và hướng dẫn vận hành/đổi mật khẩu an toàn tại [TAI_KHOAN_ADMIN.md](./TAI_KHOAN_ADMIN.md).
- **4 Tác vụ Cron định kỳ (chạy qua CLI hoặc HTTP kèm header `X-CRON-SECRET` và file lock chống chồng chéo):**
  1. `cron/auto_release_expired.php`: Quét tự động hủy các đơn giữ chỗ quá hạn chưa đặt cọc (mặc định `hold_minutes = 15` phút), hoàn trả tài nguyên và thông báo Waitlist.
  2. `cron/auto_generate_recurring.php`: Tự động sinh các buổi đặt sân cho lịch cố định hàng tuần trong cửa sổ 4 tuần.
  3. `cron/auto_remind_bookings.php`: Gửi nhắc lịch thi đấu trước giờ đá (mặc định 2 giờ qua `notification_helper.php`).
  4. `cron/backup_database.php`: Tạo bản sao lưu CSDL nén `.sql.gz` trong thư mục `backups/` được bảo vệ bởi `.htaccess` và `index.php`.

---
*Tài liệu được tinh gọn và đồng bộ trực tiếp theo mã nguồn hiện hành của Dự án Sân Bóng Pro (`https://fxzioyr.id.vn`).*

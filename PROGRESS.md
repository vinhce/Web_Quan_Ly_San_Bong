# PROGRESS — NHẬT KÝ TIẾN ĐỘ & TRẠNG THÁI DỰ ÁN (SÂN BÓNG PRO)

> Xem chi tiết danh sách task tại [TASKS.md](TASKS.md) và chi tiết kỹ thuật Portal Admin (`V1 -> V11`) tại [docs/TIEN_DO.md](docs/TIEN_DO.md).

## 1. PHÁT HÀNH MỚI NHẤT (`v20261118_v95` — 2026-11-18)
- [x] **Hợp nhất Nhật ký Admin (Tab 11) & Chuẩn hóa Portal Admin:**
  - Gỡ bỏ bảng `#admin-audit-tbody` trùng lặp khỏi Tab 10 (`portal-admin/partials/tab9_settings.php`), hợp nhất toàn bộ luồng hậu kiểm vào **Tab 11 (`11. Nhật ký Admin`)**.
  - Chuẩn hóa catalog nhật ký (`js/admin_logs.js`, `api/services/AdminLogService.php`) lên **95 mã hành động / 9 nhóm nghiệp vụ** (`pricing`, `payments`, `booking`, `shifts`, `members`, `venues`, `security`, `automation`, `other`), diffing Cũ → Mới và che dữ liệu nhạy cảm.
- [x] **CSDL, Danh mục sân & Bảo mật:**
  - Hoàn thiện **17 database migrations (`001`..`017`)** và đồng bộ **26 sân bóng** (9 sân 5, 10 sân 7, 7 sân 11; 25–26 sân đang hoạt động).
  - Hoàn thành **25 hạng mục security hardening** và vượt qua **17/17 local test suites PASS**.
- [x] **Triển khai & Nghiệm thu Production (`https://fxzioyr.id.vn`):**
  - Đồng bộ **49/49 file production** lên máy chủ hosting tại `https://fxzioyr.id.vn/portal-admin/` với phiên bản cache-busting `v20261118_v95`.
  - Kiểm thử E2E trực tiếp trên `https://fxzioyr.id.vn` đạt **0 console errors / 0 HTTP errors**.

## 2. CÁC MỐC HOÀN THÀNH TRƯỚC ĐÓ
- [x] **Audit Log, CRM & Points Log (Phần A → B → C):** Xây dựng `AdminLogService.php`, nâng cấp bảng CRM Tab 6 ("Đặt gần nhất", "Số lượt đặt", nhãn cảnh báo bùng sân ≥1 No-Show, 3 nút lọc), tìm SĐT chuẩn hóa, `points_log` với `FOR UPDATE` và cơ chế chống log rác (`logAdminChange()`). *(Chi tiết các đợt `V1 -> V11` xem [docs/TIEN_DO.md](docs/TIEN_DO.md)).*
- [x] **Vá 6 lỗi bảo mật/logic cốt lõi (`SRC-01` → `SRC-06`) & Luồng đăng nhập:**
  - **SRC-01 / SRC-02 (`api/bookings.php`):** Chặn IDOR tra cứu/hủy đơn theo SĐT tự khai; bọc `early_cancel` trong MySQL transaction + `SELECT ... FOR UPDATE`.
  - **SRC-03 (`api/check_payment.php`):** Đọc lại `paid_amount` trong transaction `FOR UPDATE` để triệt tiêu Lost Update.
  - **SRC-04 (`api/security_helper.php`):** `refresh_session_user()` chạy fail-closed — gọi `destroy_current_session()` ngay khi user không còn tồn tại hoặc bị khóa (`status = 'locked'`) trong DB.
  - **SRC-05 / SRC-06 (`api/auth.php`):** Chuẩn hóa regex SĐT `/^0[35789]\d{8}$/` và trả HTTP 503 `ERR_DB_UNAVAILABLE` khi mất kết nối DB.
  - **Đăng nhập & RBAC (`portal-admin/index.php`, `html/login.html`, `js/login.js`):** Đồng bộ `$basePath`, inject user hợp lệ từ PHP session sang `sb_current_user` và sửa đường dẫn relative để loại bỏ lỗi ở lì trang login.
- [x] **Tích hợp ECC Harness & Đồng bộ Hosting:** Cài đặt hệ thống quy chuẩn/skills tại `.agents/`, cấu hình `.htaccess` Clean URLs + HTTPS 301 và kiểm thử live (`scripts/run_production_pentest.js`).

## 3. BLOCKERS & BƯỚC TIẾP THEO
- **Blockers:** Không có blocker đang mở; toàn bộ 17/17 test suites local và nghiệm thu E2E production đã PASS.
- **Kế hoạch tiếp theo:** Theo dõi các task vận hành mở (`Task 6.7`–`Task 6.10`: chuyển key SePay Production khi kích hoạt thật, Zalo ZNS/SMS Brandname, PWA offline, tối ưu biểu đồ SVG) tại [TASKS.md](TASKS.md).

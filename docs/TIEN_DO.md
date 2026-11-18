# TIẾN ĐỘ NÂNG CẤP PORTAL-ADMIN (V1 -> V11)

> Tài liệu theo dõi kỹ thuật phân hệ `/portal-admin`. Xem tổng quan kiến trúc tại [README.md](../README.md), nhật ký phát hành tại [PROGRESS.md](../PROGRESS.md) và checklist task tại [TASKS.md](../TASKS.md).

## Trạng thái các hạng mục (`V1 -> V11` · Phát hành `v20261118_v95`)
- [x] **V1.** Tab mới "Chốt ca / Giao ca" & đánh số lại hệ thống tab (16/16 pass).
- [x] **V2.** Logic ca trực: mở ca, đếm tiền, chốt ca, đối soát & audit (11/11 pass).
- [x] **V3.** Duyệt cọc VietQR: ca đã chuyển cọc không còn nút Từ chối khi đã có tiền (9/9 pass).
- [x] **V4.** UI/UX Tab 3: kho nước & bán lẻ dịch vụ, chip tồn kho, responsive 360px (7/7 pass).
- [x] **V5.** Dữ liệu mẫu `[TEST]` đủ trạng thái, chi phí, ca trực (11/11 pass).
- [x] **V6.** Báo cáo doanh thu: đối chiếu số liệu, lợi nhuận, biểu đồ SVG, sổ chi, xuất CSV (33/33 pass).
- [x] **V7.** Rà soát hiển thị, loading, empty & error state trên các tab còn lại (12/12 pass).
- [x] **V8.** Bảo mật & hiệu năng toàn Portal: RBAC server-side, CSRF, escape XSS, audit logs (11/11 pass).
- [x] **V9.** Hồi quy toàn portal: 56/56 file syntax + 150/150 test pass.
- [x] **V10.** Modular hóa <= 666 dòng/file, phân quyền đầy đủ cho Admin và sửa UI Header/Tab 7/History (100% pass).
- [x] **V11 (`v20261118_v95` — 2026-11-18). Hợp nhất Tab 11 Nhật ký Admin, CRM 2 cột mới & Hardening toàn diện:**
  - Hợp nhất Admin Audit Log vào **Tab 11 (`11. Nhật ký Admin`)**, gỡ bỏ `#admin-audit-tbody` trùng lặp ở Tab 10; chuẩn hóa **95 mã hành động / 9 nhóm nghiệp vụ** (`js/admin_logs.js`, `AdminLogService.php`), diffing Cũ → Mới & che thông tin nhạy cảm.
  - Nâng cấp CRM Tab 6 ("Đặt gần nhất", "Số lượt đặt", cảnh báo bùng sân ≥1 No-Show, 3 nút lọc) và `points_log` với `FOR UPDATE`.
  - Hoàn thiện **25 hạng mục security hardening**, **26 sân bóng** (9 sân 5, 10 sân 7, 7 sân 11; 25–26 hoạt động), **17/17 local test suites PASS**, triển khai **49/49 file production** & nghiệm thu E2E trên `https://fxzioyr.id.vn` với **0 console/HTTP errors**.

## Quyết định kỹ thuật & Bảng ánh xạ 11 Tab (`portal-admin/partials/sidebar.php`)
- **Môi trường chuẩn:** MySQL 8.0+ (`quan_ly_san_bong`), PHP 8.1+, Production Live tại `https://fxzioyr.id.vn/portal-admin?tab=overview`.
- **Mã định danh & file module 11 tab:**
  1. `1. Tổng quan & Đang chơi` (`overview` → `tab1_kpi.php`)
  2. `2. Lịch đặt sân Timeline` (`timeline` → `tab2_timeline.php`)
  3. `3. Đặt sân tại quầy` (`quick-booking` → `tab3_quick_booking.php`)
  4. `4. Quản lý sân bóng` (`pitches` → `tab4_pitches.php`)
  5. `5. Bảng giá & Voucher` (`pricing` → `tab5_pricing.php`) *(Admin)*
  6. `6. Khách & Hội viên` (`customers` → `tab6_customers.php`)
  7. `7. Duyệt cọc VietQR` (`payments` → `tab7_deposits.php`) *(Manager / Admin)*
  8. `8. Chốt ca / Giao ca` (`shifts` → `tab8_shifts.php`)
  9. `9. Báo cáo doanh thu` (`reports` → `tab8_reports.php`) *(Manager / Admin)*
  10. `10. Cài đặt hệ thống` (`settings` → `tab9_settings.php`) *(Admin)*
  11. `11. Nhật ký Admin` (`logs` → `tab11_admin_logs.php`) *(Admin)*

## Database Migrations (`001`..`017`)
- Hệ thống sở hữu **17 bản migration (`database/migrations/001`..`017`)** kết hợp kiểm chuẩn tự động tại `config/database.php` (`ensureSchemaInitialized()`).
- Các mốc trọng điểm gần đây: `010_shifts_management_upgrade.sql` (ca trực & `staff_id`), `015_audit_and_points_log_expansion.sql` (mở rộng `audit_logs`, tạo `points_log`, thêm `admin_note`), cùng các bản `016`–`017` chuẩn hóa danh mục 26 sân, `walkin` user và đồng bộ trạng thái/phiên bản schema.

## Dữ liệu `[TEST]` phục vụ kiểm thử nội bộ
- Bộ dữ liệu mẫu gồm ca Sân 5 (`P5-C`, `P5-D`, `P5-E`), ca Sân 11 (`P11-A`, `P11-B`, `P11-C` đủ trạng thái + bán nước + lệch tiền), 4 khoản chi mẫu và ca trực phát sinh thu thực tế.
- Lệnh dọn dẹp an toàn: `php tests/test_v5_sample_data.php --clean` hoặc API `manage_sample_data?sub_action=clean`.

## Lỗi mở
- Không có lỗi mở.

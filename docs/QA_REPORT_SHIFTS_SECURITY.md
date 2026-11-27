# Báo Cáo Kiểm Thử Chốt Ca, Dữ Liệu Mẫu & An Ninh Hệ Thống

**Người thực hiện:** Nguyễn Quang Năng Tú (`PH62417`)  
**Ngày kiểm thử:** 27/11/2026  
**Môi trường:** Windows / Laragon PHP `8.1.10` / Node.js `v24.21.0`

---

## 1. Kết quả chạy bộ kiểm thử tự động thực tế

### 1.1. Kiểm thử an ninh & cú pháp (`tests/security_hardening_test.php`)
- **Nhóm 1 (RFC 6238 TOTP 2FA):** `7/7` kiểm tra đạt (`[PASS]`).
- **Nhóm 2 (XSS Escape, Bundle Sync & NĐ 13/2023):** `6/6` kiểm tra đạt (`[PASS]`).
- **Nhóm 3 (Cấu hình Apache `.htaccess`, Webhook SePay, chống trùng đặt sân):** `10/10` kiểm tra đạt (`[PASS]`).
- **Nhóm 4 (Database Schema & Points Transaction Isolation):** `[SKIP]` do chưa bật dịch vụ MySQL cục bộ tại thời điểm chạy script.
- **Nhóm 5 (Syntax & Lint Check):**
  - `php -l` toàn bộ **105 file PHP** trong `api/`, `cron/`, `config/`, `portal-admin/`, `tests/`: **105/105 hợp lệ (`[PASS]`)**.
  - `node --check` toàn bộ **49 file JS** trong `js/`: **49/49 hợp lệ (`[PASS]`)**.
- **Tổng kết script:** `26 PASS`, `0 FAIL`, `1 SKIP`.

### 1.2. Kiểm thử giao diện & nghiệp vụ JS
- `tests/test_history_ui_and_recurring.js`: **PASS** (`ALL HISTORY UI & RECURRING PACKAGE TESTS PASSED`).
- `tests/test_admin_customer_table.js`: **PASS** (đủ 8 cột chuẩn, render điểm tích lũy, tổng chi tiêu, không còn cột công nợ).
- `tests/test_admin_log_ui.js`: **PASS** (đạt toàn bộ assertion cho Tab 11 Nhật ký Admin).

---

## 2. Checklist kiểm tra Chốt ca & Dữ liệu mẫu (Portal Admin)

| Hạng mục | Nội dung kiểm tra | Trạng thái |
| :--- | :--- | :--- |
| Dữ liệu sân bóng | Đủ 26 sân (9 sân 5, 10 sân 7, 7 sân 11) từ `database/schema.sql` | [x] Đạt |
| Tài khoản vận hành mẫu | Có tài khoản phân quyền nhân viên (`nhanvien`), quản lý (`quanly`), khách lẻ (`khachle`) | [x] Đạt |
| Mở ca & Giao dịch trong ca | Mở ca đầu ngày, ghi nhận đơn đặt sân tại quầy & bán dịch vụ/nước uống | [x] Đạt |
| Tách doanh thu TM / CK | Tách bạch tiền mặt tại quầy và chuyển khoản VietQR khi tổng kết ca | [x] Đạt |
| Chốt ca / Giao ca | Nhập tiền mặt thực đếm, tính chênh lệch và yêu cầu ghi chú giải trình khi lệch tiền | [x] Đạt |

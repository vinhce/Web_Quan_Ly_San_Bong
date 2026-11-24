# TIẾN ĐỘ KỸ THUẬT PORTAL ADMIN & PHÁT HÀNH (`v20261124_v142`)

> Tổng quan xem tại [README.md](../README.md) · Phát hành xem tại [PROGRESS.md](../PROGRESS.md) · Task xem tại [TASKS.md](../TASKS.md).

## 1. Tổng hợp các đợt phát hành & nâng cấp
| Đợt / Mốc | Nội dung trọng tâm | Kết quả kiểm chứng |
| :--- | :--- | :--- |
| **`V1` -> `V10`** | Xây dựng Tab 8 Chốt ca, Tab 7 duyệt cọc VietQR, Tab 3 POS bán nước, dữ liệu `[TEST]`, Tab 9 Báo cáo SVG/CSV, modular hóa <= 666 dòng/file | Đạt chuẩn phân quyền RBAC & 0 lỗi cú pháp |
| **`V11` (`v20261118_v95`)** | Hợp nhất Nhật ký Admin sang Tab 11, nâng cấp Tab 6 CRM 8 cột & `points_log` (`FOR UPDATE`), 25 hạng mục hardening, `001..017` migrations | Go-live `https://fxzioyr.id.vn` (`0` lỗi console/HTTP) |
| **`v135` (2026-11-22)** | Giữ phiên đăng nhập 24h (`86400s`), `currentCustomer()`, `Cache-Control: no-store`, chuẩn hóa khung giờ 2 tiếng & responsive UI | Đồng bộ toàn site & kiểm thử bảo mật PASS |
| **`v136` (2026-11-24)** | Migration `022`, voucher 1 chạm ở `/booking`, gỡ nút CTA thừa `/checkout`, Tab 1 popup `Giữ chỗ`, Tab 6 còn 2 lọc (`Tất cả`/`VIP`), Tab 7 căn giữa, Tab 8 xác minh lệch ca, Tab 9 4 sub-tab sticky | 19/19 bộ test PHP/JS & 41/41 Playwright E2E PASS |
| **`v137` -> `v139`** | Nâng cấp Tab 11 thành **CSS Grid 5 cột** (`TD/XHC/CN/CB/TQ/AUTO`, 110 mã / 8 nhóm), bỏ nhãn `Chỉ ghi thêm`/`Append-only`, thêm hậu kiểm inline & **Inverted Index thuần SQL (`023`)** | 24/24 test Inverted Index, 58/58 B1 & E2E Chrome PASS |
| **`v140` -> `v142` (2026-11-24)** | Việt hóa `statusPill()` (`/history`), gói cố định 4/8/12 tuần có cấu trúc, gộp chip phụ thu, căn cột nút `/history`, giữ ghi chú sạch khi đặt lại, build Tailwind cục bộ (0 CDN) | `test_history_ui_and_recurring.js`, `test_admin_log_ui.js`, `security_hardening_test.php` (30/30) PASS |

## 2. Bảng ánh xạ 11 Tab (`/portal-admin/` — `portal-admin/partials/sidebar.php`)
| Tab | Tên hiển thị | Mã tab (`?tab=`) | File Partial |
| :---: | :--- | :--- | :--- |
| **1** | Tổng quan & Đang chơi | `overview` | `portal-admin/partials/tab1_kpi.php` |
| **2** | Lịch đặt sân Timeline | `timeline` | `portal-admin/partials/tab2_timeline.php` |
| **3** | Đặt sân tại quầy | `quick-booking` | `portal-admin/partials/tab3_quick_booking.php` |
| **4** | Quản lý sân bóng | `pitches` | `portal-admin/partials/tab4_pitches.php` |
| **5** | Bảng giá & Voucher | `pricing` *(Admin)* | `portal-admin/partials/tab5_pricing.php` |
| **6** | Khách & Hội viên | `customers` | `portal-admin/partials/tab6_customers.php` |
| **7** | Duyệt cọc VietQR | `payments` *(Manager/Admin)* | `portal-admin/partials/tab7_deposits.php` |
| **8** | Chốt ca / Giao ca | `shifts` | `portal-admin/partials/tab8_shifts.php` |
| **9** | Báo cáo doanh thu | `reports` *(Manager/Admin)* | `portal-admin/partials/tab8_reports.php` |
| **10** | Cài đặt hệ thống | `settings` *(Admin)* | `portal-admin/partials/tab9_settings.php` |
| **11** | Nhật ký Admin | `logs` *(Admin)* | `portal-admin/partials/tab11_admin_logs.php` |

## 3. Tóm tắt 24 file Database Migrations (`001`..`023`)
Hệ thống tự kiểm chuẩn cấu trúc DB qua `ensureSchemaInitialized()` trong `config/database.php` (chuỗi marker tới `logs/.schema_v23_audit_inverted_index_ready`):
- **`001`–`014`:** Nâng cấp cốt lõi đặt sân, thanh toán, phản hồi, ca trực (`010`), phân quyền, `points_log` (`013`) và danh mục 26 sân (`014`).
- **`015`–`017`:** Mở rộng `audit_logs` & `admin_note` (`015`), xóa bỏ hoàn toàn cột công nợ đọng (`016`–`017`) và chuẩn hóa tài khoản `walkin`.
- **`018` (2 file):** `018_create_password_resets.sql` (quên mật khẩu) và `018_update_2hour_time_slots.sql` (7 khung giờ liên tiếp 2 tiếng `05:30–22:30`, nghỉ trưa `11:30–14:30`).
- **`019`–`021`:** Index dashboard (`019`), bảng `monthly_packages` & cột `max_discount_amount` (`020`), idempotency & tỷ lệ điểm (`021`).
- **`022`–`023`:** Bảng hậu kiểm `audit_reviews` & cột xác minh lệch ca `shifts` (`022`), bảng Inverted Index thuần SQL `audit_search_tokens` (`023`).

## 4. Dữ liệu mẫu `[TEST]` & Trạng thái hiện tại
- **Bộ dữ liệu mẫu:** Gồm ca Sân 5 (`P5-C`, `P5-D`, `P5-E`), ca Sân 11 (`P11-A`, `P11-B`, `P11-C` có bán nước và lệch tiền), 4 khoản chi mẫu và ca trực phát sinh.
- **Lệnh dọn sạch an toàn:** `php tests/test_v5_sample_data.php --clean` (hoặc API `manage_sample_data?sub_action=clean`).
- **Lỗi mở hiện tại:** `0` (`https://fxzioyr.id.vn` hoạt động ổn định).

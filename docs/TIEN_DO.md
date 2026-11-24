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

## Nâng cấp Trang /booking: Toast, Đăng nhập & Chống trùng ca
### Pha 1: Phân tích Trang /booking, Toast & Chống trùng ca
1. **Xử lý nút & Toast**: Nút checkout chạy `proceedToCheckout()` (`js/booking.js:498`), gán sự kiện tại `js/booking_ui.js:620`. Toast thông báo bắn qua `window.SanBongApp.showToast()` (`js/booking.js:591`).
2. **Nguyên nhân 9 toast lặp**: Đăng ký sự kiện lặp lại nhiều lần khi tải trang/đồng bộ (`sb-data-synced`, `sb-auth-synced`) khi thiếu cờ khóa duy nhất, cộng với hàm `showToast()` trong `js/ui.js` thiếu cơ chế gộp trùng (deduplication) và không giới hạn số lượng toast hiển thị.
3. **Lưới ca time_slots**: Bảng có 18 ca (S01–S18), tồn tại song song cả ca 60' và ca 90' gây chồng lấn giờ (S10 đè S09+S11; S13 đè S12+S14; S15 đè S16; S17 đè S16+S18).
4. **Lỗ hổng chống trùng**: `booking_creator.php:312` chỉ kiểm tra `slot_id = ?` thay vì khoảng thời gian, khiến 2 đơn cùng sân cùng ngày đặt các ca chồng giờ nhau (vd S09 và S10) vẫn thành công.

### Pha 2: Thực hiện sửa Toast, Đăng nhập & Chống trùng ca
- **A. Khách chưa đăng nhập**: Nút mặc định ghi "Đăng nhập để đặt sân". Bấm nút không bắn toast, lưu draft vào `sessionStorage`, chuyển thẳng sang `/login?redirect=booking` với thông báo 1 dòng "Đăng nhập để tiếp tục đặt sân"; đăng nhập xong tự quay lại `/booking` khôi phục đầy đủ sân/ngày/ca/dịch vụ.
- **B. Toast & Form Validation**: `showToast()` có cơ chế gộp trùng nội dung (dedup), tối đa 3 toast cùng lúc, tự đóng sau 4s, đặt góc dưới phải (`bottom-5 right-5`), có nút đóng, `aria-live="polite"`. Khi lỗi form, gom mọi trường thiếu thành đúng 1 toast rõ ràng, viền đỏ `border-rose-500`, tự cuộn và focus vào ô lỗi đầu tiên. Nút đặt sân có cờ `_isProceedingCheckout` chống spam click.
- **C. Chống trùng khoảng thời gian (Interval Overlap)**:
  - **Server**: Trong `booking_creator.php`, truy vấn `SELECT ... FOR UPDATE` so sánh khoảng thời gian: `start_time < sEnd AND end_time > sStart` trên mọi đơn đang giữ chỗ/chờ duyệt/đã xác nhận cùng sân cùng ngày (kể cả đơn nhiều tuần). Từ chối 409 `ERR_DOUBLE_BOOKING` nếu trùng.
  - **UI**: Trong `booking.js` `renderSlots()`, khi chọn 1 ca (`activeSlotObj`), tự động tính toán và khóa tất cả các ca khác chồng giờ với nó, hiển thị nhãn "Trùng giờ", chip màu xám không thể bấm.
- **D. Nghiệm thu 7 tiêu chí bắt buộc**: 15/15 test asserts (100% PASS trên `tests/test_v10_overlap_and_toast.php`). Cú pháp PHP/JS sạch, không phát sinh lỗi trong `php_errors.log`.



## [XONG] Gọn bước 4 "Thông tin người đặt sân" & Thống nhất nguồn xác thực (Pha 1 + Pha 2 hoàn tất)
### Pha 1: Kết luận phân tích (Nguồn tự điền, Lệch nguồn & Cache-Control)
1. **Nguyên nhân tự điền Admin**: Khi đăng nhập portal admin, `login.js`/`admin.js` ghi dữ liệu vào `localStorage.sb_current_user`. Vì cùng origin (domain/localhost), `booking_ui.js` đọc `db.getUser()` từ `localStorage` và tự điền thông tin admin vào form trước khi API auth kiểm tra xong.
2. **Lệch nguồn & Cơ chế session**: Header phụ thuộc API `/api/auth.php?action=me` (PHP session), trong khi form đọc đồng bộ từ `localStorage`. Đã thống nhất dùng hàm `currentCustomer(?PDO $pdo)` làm single source of truth; tài khoản admin/staff portal không được coi là khách đặt sân; đăng nhập portal không còn ghi admin vào `localStorage`.
3. **Cache-Control chống rò rỉ**: Cấu hình `Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0` cho toàn bộ tài nguyên động (HTML/PHP/API) trong `.htaccess` và header PHP để đảm bảo không bị lưu đệm qua CDN/hosting/proxy giữa các người dùng.

### Pha 2: Thực hiện chuẩn hóa & Nghiệm thu
- **A. Nguồn sự thật**: Triển khai `currentCustomer(?PDO $pdo)` đọc session server, tách biệt hoàn toàn portal operator và khách hàng.
- **B. Mục 4 chỉ render khi đã đăng nhập**: Khách chưa đăng nhập ẩn hoàn toàn mục 4 (`class="hidden"`), hiển thị nhắc nhở `#summary-login-reminder`, nút tiếp tục đổi thành "Đăng nhập để đặt sân" điều hướng `/login?redirect=booking` và giữ nguyên trạng thái chọn sân trong `sessionStorage`.
- **C. Mục 4 cho người đã đăng nhập (gọn)**: Thẻ tóm tắt "<Họ tên> · <SĐT> · Hội viên <hạng>". Nút "Đặt hộ bạn bè / Đổi thông tin" trượt 2 ô tên/SĐT chỉ áp dụng cho đơn này, không đổi hồ sơ. Ghi chú ẩn sau nút "+ Thêm ghi chú cho ban quản lý sân". Voucher 1 dòng + chip gợi ý tải động từ DB.
- **D. Server hardening (`create_booking`)**: Bắt buộc đăng nhập (chưa đăng nhập trả 401). Tự lấy `user_id` và thông tin mặc định từ session server, triệt tiêu nguy cơ IDOR/mạo danh. Chỉ nhận tên/SĐT khi đánh dấu "Đặt hộ bạn bè" (vẫn gán `user_id` người đặt). Điểm thưởng (`points_log`) luôn gán cho khách đặt sân.
- **E. Bảo mật & Giao diện**: Header `Cache-Control` no-store. Bỏ toàn bộ emoji, dùng 100% SVG cục bộ. Widget rác "hi — Blocked" bị chặn và ẩn hoàn toàn.
- **F. Nghiệm thu 9 kịch bản bắt buộc**: Đạt 25/25 test asserts (100% PASS trên `tests/test_v9_booking_streamline.php`). Không phát sinh lỗi cú pháp hay file rác.

## Tối ưu Tab "9. Báo cáo doanh thu" (`admin_finance_reports.php`, `tab8_reports.php`, `admin_reports.js`)
### Pha 1: Kết luận kiểm toán công thức hiện tại & 4 điểm nghi
- **Định nghĩa hiện tại (`api/services/admin_finance_reports.php`)**:
  - `totalRevenue`: Tổng `total_price` đơn không hủy hoàn toàn + cọc giữ lại của đơn hủy/No-Show + `service_sales` bán lẻ tại quầy.
  - `collectedRevenue`: `cashRevenue + vietqrRevenue` (tổng `orderPaid` + bán lẻ tại quầy).
  - `uncollectedRevenue`: `SUM(max(0, total_price - orderPaid))` trên mọi đơn chưa tất toán.
  - `depositRevenue`: `min(deposit_amount, pitchNet)` khi `payment_status` thuộc whitelist (`Đã cọc 30%`, `Đã thanh toán đủ/100%`, `deposited/completed/paid`), chưa gồm `Đã cọc 60%`; đơn `Chờ duyệt cọc` = 0.
  - `remaining70Revenue`: `max(0, pitchNet - orderDeposit)` cho mọi đơn (kể cả chưa thanh toán phần còn lại).
  - Lợi nhuận không nhất quán: `grossProfit = collectedRevenue - totalExpenses` (cơ sở đã thu), còn `netProfit = totalRevenue - totalExpenses` (cơ sở ghi nhận).
  - `occupancyRate`: `(totalMatches * 1.5) / (count(dailyRevenue) * 17 * 17.5) * 100`.
- **Xác minh 4 điểm nghi**:
  - **(a) Cọc 27,1% thay vì 30%**: Do đơn `Chờ duyệt cọc` (hoặc `Đã cọc 60%` chưa có trong whitelist dòng 144) bị ép `orderDeposit = 0` nhưng tiền sân vẫn cộng vào mẫu số; cộng thêm các đơn có `deposit_amount` thực tế khác 30% (đặt tại quầy/gói tháng/voucher).
  - **(b) "Thu còn lại" (9.451.900đ) > "Đã thu" (8.359.100đ)**: `remaining70Revenue` đang tính **số phải thu** (`pitchNet - orderDeposit` của toàn bộ đơn, kể cả chưa thanh toán), không phải số đã thu; nhãn UI ghi *"Tiền thu 70% còn lại"* gây hiểu nhầm.
  - **(c) Tỷ lệ lấp đầy 1%**: Mẫu số hardcode sai `$totalPitches = 17` (thực tế 26 sân), `$totalHoursOpenPerDay = 17.5`, `$bookedHours = totalMatches * 1.5` (ca thực tế 2h) và `$numDays = count($dailyRevenue)` thay vì số ngày trong kỳ lọc × số sân hoạt động (trừ bảo trì/ẩn).
  - **(d) Đối soát "Khớp 100%" không độc lập**: `formula1` (`paid + (total - paid)`) và `formula2` (`dep + (pitchNet - dep) + srv`) là đồng nhất thức đại số trên cùng 1 tập `$bookingsRows`, không đối chiếu với `bank_transactions` hay `shifts`.

## [B0] Kết luận phân tích Bước 0 — Tab 11 Nhật ký Admin & Baseline DB (2026-11-24)
- **Baseline & Hạ tầng:** Commit baseline `v135` tại `9caa77b`; `DB_HOST=127.0.0.1`, DB `quan_ly_san_bong` chạy trên MySQL `8.4.3` (`data/mysql-8.4`, đủ migration `020`/`021`; lưu ý `mysql-8.0.30` ở `data/mysql-8` dừng từ 19/11, thiếu `monthly_packages` & `vouchers.max_discount_amount`).
- **File HTML mẫu:** Không tồn tại `"Nhật ký hệ thống – Sân Bóng Pro.html"` trong repo; Tab 11 chạy qua `portal-admin/partials/tab11_admin_logs.php`, `js/admin_logs.js`, `api/services/admin_settings.php` (`action=audit_logs`) & `AdminLogService.php`.
- **Bảng `audit_logs`:** 12 cột, 6 index (`PRIMARY`, `idx_audit_user/action/booking/created/target`); DB hiện có **93 bản ghi / 17 mã `action`**; quét `api/` ghi nhận **82 mã `action`** (78 literal + 4 `WEBHOOK_*` tại `sepay_webhook.php`) và **3 mã tại `cron/`**.
- **Snapshot `shifts` & `vouchers`:** `shifts` (18 cột) có 2 dòng (`id=14` closed `[TEST]` `cash=350k`, `transfer=450k`, `discrepancy=0`; `id=1` open `staff_id=3`); `vouchers` có 6 mã `is_active=1`, `used_count=0/100`, `max_discount_amount=0`.
- **Datepicker & RBAC:** `js/vn_datepicker.js` hiển thị `dd/mm/yyyy` ở `#<id>-vn` và override `origInput.value` giữ chuẩn `yyyy-mm-dd` (`admin-log-filter-from/to` thuộc `TARGET_IDS` & `ALLOW_PAST_IDS`); `api/security_helper.php` tách rõ `require_admin`, `require_manager_or_admin`, `require_staff_or_admin`.

## [B1]–[B4] Nâng cấp 17 comment UI/Logic, Tab 8 & Tab 11 Nhật ký (`v20261124_v136` — 2026-11-24)
- **[B1] Migration 022 & Kiến trúc API/Registry:**
  - `022_audit_reviews_and_shifts_upgrade.sql` + `config/database.php`: tạo bảng `audit_reviews`, mở rộng 5 cột/index `audit_logs`, trạng thái `pending_explanation` & `staff_counted_cash` ở `shifts`, 6 khóa ngưỡng bất thường trong `settings`.
  - Tab 11 B1 (`AdminLogRegistry` 110 actions / 6 nhóm `TD/XH/CN/CB/TQ/TT` + 9 luật `a..i`, `AdminLogRepository`, `AdminLogService`): append-only (HTTP 405), `audit_review`, xuất CSV BOM chống formula injection & che SĐT; bổ sung `validate_mandatory_audit_reason()` trong `api/security_helper.php`.
- **[B2]–[B3] Thực thi 17 hạng mục UI/Logic & Tab 11 B2–B3 (4 nhánh song song, 0 xung đột):**
  - **Luồng khách (`a7fa078`):** `/booking` đồng bộ `eligible_vouchers` + chip `-30k/-50k/-100k/-15%` (`CUOITUAN100K` cảnh báo `<900k`), gỡ form đặt hộ (`#btn-toggle-friend`, `#booking-input-fields-wrap`); `/checkout` gỡ `#guest-login-checkout-btn`; `/matchmaking` → `/login?redirect=matchmaking` không gắn `&expired=1`.
  - **Tab 1, 6, 7 (`08b79df`):** Tab 1 sửa nhãn đơn `Đã hủy`, mở `#inplay-manage-modal` cho `Giữ chỗ (chờ cọc)` (`z-40`/`z-50`); Tab 6 bỏ `Khách quen`/`regular`, `warning_noshow`, khối Blacklist, ghép `#crm-form-tier` + `#crm-form-note` cùng hàng, validate lý do server tại `api/admin_crm.php`; Tab 7 đổi `"Kỳ vọng"` → `"Số tiền nhận / Cần thu"` và căn giữa bảng.
  - **Tab 9 Báo cáo (`01f01c0`):** `#rpt-filter-bar` sticky nền `#ffffff`, 4 tab con nhớ hash (`#tong-quan`, `#doi-soat`, `#chi-tiet`, `#chi-phi`), gộp 1 `Sổ chi` duy nhất, `#ea580c` cho `Chưa thu`, `Lợi nhuận` `0` chi phí hiện `—`, đối soát có dấu không bù trừ; thống nhất đếm ca theo `isMatchCounted` (lý do lệch `13 vs 14 ca`: đơn hủy giữ cọc vào `detailedBookings` nhưng `isMatchCounted=false`).
  - **Tab 8 & Tab 11 UI (`6e16952`..`85e2ca8`):** Tab 8 `"✓ Khớp"`, bỏ `"Khớp 0đ"`, gộp trạng thái, tô nền dòng lệch, modal đối chiếu `bank_transactions`, chặn mở ca khi còn `open`; Tab 11 khớp 5 cột, CSS `.audit-*` + touch 44px mobile, 4 KPI, 6 chip lọc, diff/hậu kiểm, CSV BOM.
- **[B4] Hợp nhất, Tailwind v136 & Hồi quy toàn diện:**
  - Hợp nhất 4 nhánh vào `main`, đồng bộ `test_v10_overlap_and_toast.php` & `test_admin_customer_table.js`, build `css/tailwind.generated.css?v=20261124_v136` (0 URL CDN/Google Fonts ngoài).
  - Cú pháp: `101/101` PHP (`php -l`) & `47/47` JS (`node --check`) PASS. Kiểm thử MySQL 8.4.3: **19/19** bộ test PHP/JS PASS 100%; Playwright E2E (`127.0.0.1:8091`): **41/41** checks PASS ở mọi viewport (`1920/1280/820/768/390/360px`), 0 lỗi console/HTTP `>=400`, DB sạch 0 bản ghi `[TEST]` mới. **Lỗi mở: 0.**

## [Tab 11 UI] Chuẩn hóa Grid 5 cột & giữ thanh Quy ước màu (`v20261124_v137` — 2026-11-24)
- **Giao diện (`tab11_admin_logs.php`, `js/admin_logs.js` 750 dòng):** Chuyển bảng sang CSS Grid 5 cột (`Người thực hiện | Hành động | Đối tượng | Nội dung thay đổi (cũ → mới) | Thời gian`), header kèm nhãn `Chỉ ghi thêm` & `Cập nhật HH:mm`, bộ lọc 1 hàng kèm `vn_datepicker`, **giữ thanh `Quy ước màu:`** 6 chip `TD/XH/CN/CB/TQ/TT`, 4 thẻ KPI lọc nhanh, thu gọn diff (`+N thay đổi nữa`), `Xem chi tiết`/`Hậu kiểm ngay`, font hệ thống cục bộ (0 CDN).
- **Backend & Test (`AdminLogRepository.php`, `AdminLogService.php`, `test_tab11_audit_b1.php`, `test_admin_log_ui.js`):** Hỗ trợ lọc dropdown `optgroup` theo `__cat__:` / `cat:` (`XHC -> XH`, giữ `TD` tách `TT`), enrich `object_type_label` & `actor_role_label`; vượt toàn bộ unit test (`42/42` B1, `24/24` Part A, `5/5` Endpoint, `30/30` Security, Catalog & UI JS) và Playwright Chrome E2E (`1280px`/`768px`/`360px`, 0 lỗi console/HTTP/tràn ngang). **Lỗi mở: 0.**

## [Tab 11] Hoàn tất mã nhóm `TD/XHC/CN/CB/TQ/TĐ` & xóa nhãn `Chỉ ghi thêm` (`v20261124_v138` — 2026-11-24)
- **UI/UX (`tab11_admin_logs.php`, `js/admin_logs.js` 752 dòng, `portal-admin/index.php`, `tailwind.generated.css`):** Gỡ bỏ hoàn toàn chữ `Chỉ ghi thêm` / `Bất biến` / `Append-only` cùng `.audit-tag`/`.audit-note`; hiển thị 6 chip & `<optgroup>` theo mã `TD`, `XHC`, `CN`, `CB`, `TQ`, `TĐ` trong khi giữ nguyên 6 khóa DB `TD/XH/CN/CB/TQ/TT`.
- **Backend & Tìm kiếm (`AdminLogRegistry.php`, `AdminLogRepository.php`):** Bổ sung `short_code` & `resolveCategoryToken` phân biệt `đ`/`d` (`td`→`TD`, `tđ`/`auto`/`tdg`→`TT`, `xhc`→`XH`, hỗ trợ tổ hợp `td+cn`, `tđ+xhc`, `__cat__:XHC`/`__cat__:TĐ` và tìm `a.data_group`).
- **Kiểm thử & E2E:** PASS 100% `test_admin_log_action_catalog.js` (110 actions), `test_admin_log_ui.js`, `test_tab11_audit_b1.php` (56/56), `test_part_a_admin_log.php` (24/24), `test_audit_logs_endpoint.php` (5/5), `security_hardening_test.php` (30/30; 101 PHP & 49 JS), và Playwright Chrome E2E (`1280px`/`768px`/`360px`, 0 console/page/HTTP/overflow errors, DB `[TEST]` tạo mới sạch `0`). **Lỗi mở: 0.**


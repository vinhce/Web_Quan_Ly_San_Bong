# TASKS — KẾ HOẠCH THỰC THI TỪNG BƯỚC (SÂN BÓNG PRO)

> **Quy tắc:** Chỉ thực hiện 1 task tại 1 thời điểm; đánh dấu `[x]` kèm bằng chứng kiểm thử. Chi tiết tiến độ phát hành xem [PROGRESS.md](PROGRESS.md); chi tiết mốc `V1 -> V11` xem [docs/TIEN_DO.md](docs/TIEN_DO.md).

---

## GIAI ĐOẠN 1: CƠ SỞ HẠ TẦNG & CƠ SỞ DỮ LIỆU
- [x] **Task 1.1:** Thiết kế cấu trúc bảng CSDL chuẩn mực (`database/schema.sql`, hỗ trợ 26 sân: 9 sân 5, 10 sân 7, 7 sân 11).
- [x] **Task 1.2:** Thiết lập kết nối PDO Singleton, đọc cấu hình từ `.env` (`config/database.php`).
- [x] **Task 1.3:** Hoàn thiện **17 bản migration (`001`..`017`)** và cơ chế auto-check schema (`ensureSchemaInitialized()`).
- [x] **Task 1.4:** Thiết lập cấu trúc Clean URLs và bảo vệ thư mục/file nhạy cảm qua `.htaccess`.

---

## GIAI ĐOẠN 2: PHÂN HỆ ĐẶT SÂN & TÍCH HỢP VIETQR SEPAY
- [x] **Task 2.1:** Danh mục sân trực quan (26 sân, 25–26 hoạt động) & dự báo thời tiết Open-Meteo (`html/fields.html`, `js/fields.js`).
- [x] **Task 2.2:** Ma trận 18 khung giờ (05:30–23:00) chống trùng slot bằng MySQL Transaction (`html/booking.html`, `api/bookings.php`).
- [x] **Task 2.3:** Gói cố định theo tháng (1, 2, 3 tháng) giảm 5%–15% kèm quà tài trợ.
- [x] **Task 2.4:** Sinh mã VietQR động chuẩn SePay (`ASFF`, `ASFS`, `ASFE`) cọc 30% (`html/checkout.html`).
- [x] **Task 2.5:** Webhook SePay idempotent tự động kích hoạt đơn và ghi nhận đối soát (`api/sepay_webhook.php`).
- [x] **Task 2.6:** Vé điện tử QR Check-in và đánh giá sau trận (`html/success.html`, `api/reviews.php`).
- [x] **Task 2.7:** Hệ thống tích điểm hội viên, hạng thành viên và voucher (`html/history.html`).
- [x] **Task 2.8:** Trang ghép kèo / tìm đối giao hữu (`html/matchmaking.html`, `api/matchmaking.php`).

---

## GIAI ĐOẠN 3: PHÂN HỆ QUẢN TRỊ VIÊN 11 TAB (`/portal-admin`)
- [x] **Task 3.1:** Cổng đăng nhập RBAC 3 cấp (`staff`, `manager`, `admin`) băm Argon2id (`portal-admin/index.php`, `api/auth.php`).
- [x] **Task 3.2:** **Tab 1 – `1. Tổng quan & Đang chơi`** (`overview`): KPI doanh thu thực, tỷ lệ lấp đầy & quét QR check-in (`jsQR`).
- [x] **Task 3.3:** **Tab 2 – `2. Lịch đặt sân Timeline`** (`timeline`): Biểu đồ Gantt 05:30–23:00, điều hành ca, Waitlist, lịch lặp & duyệt ghép kèo.
- [x] **Task 3.4:** **Tab 3 – `3. Đặt sân tại quầy`** (`quick-booking`): Đặt tại quầy khóa trùng slot & quản lý kho nước/dịch vụ.
- [x] **Task 3.5:** **Tab 4 – `4. Quản lý sân bóng`** (`pitches`): Quản lý 26 sân, giá riêng, lịch bảo trì & đánh giá.
- [x] **Task 3.6:** **Tab 5 – `5. Bảng giá & Voucher`** (`pricing` · `admin`): Giá giờ thường/cao điểm/cuối tuần, giờ vàng & voucher.
- [x] **Task 3.7:** **Tab 6 – `6. Khách & Hội viên`** (`customers`): CRM SĐT chuẩn hóa, "Đặt gần nhất", "Số lượt đặt", cảnh báo bùng sân (≥1 No-Show) & `points_log` (`FOR UPDATE`).
- [x] **Task 3.8:** **Tab 7 – `7. Duyệt cọc VietQR`** (`payments` · `manager`/`admin`): Duyệt biên lai cọc & đối soát `bank_transactions` SePay.
- [x] **Task 3.9:** **Tab 8 – `8. Chốt ca / Giao ca`** (`shifts`): Mở/đóng ca, kiểm kê tiền mặt & đối soát chênh lệch bàn giao.
- [x] **Task 3.10:** **Tab 9 – `9. Báo cáo doanh thu`** (`reports` · `manager`/`admin`): Bóc tách dòng tiền, sổ chi phí, biểu đồ SVG & xuất CSV UTF-8 BOM.
- [x] **Task 3.11:** **Tab 10 – `10. Cài đặt hệ thống`** (`settings` · `admin`): Cấu hình VietQR, chính sách cọc, nhân sự, thông báo & backup `.sql.gz`.
- [x] **Task 3.12:** **Tab 11 – `11. Nhật ký Admin`** (`logs` · `admin`): Hợp nhất Audit Log (`AdminLogService.php`, **95 mã hành động / 9 nhóm**), gỡ `#admin-audit-tbody` trùng ở Tab 10.

---

## GIAI ĐOẠN 4: BẢO MẬT, KIỂM THỬ & PHÁT HÀNH (`v20261118_v95`)
- [x] **Task 4.1:** Triển khai **25 hạng mục security hardening** (Session 2h, `X-CSRF-Token`, CSP/OWASP headers, `refresh_session_user()` fail-closed, 2FA TOTP RFC 6238).
- [x] **Task 4.2:** Đóng gói `js/app.js` (`node scripts/build_app_bundle.js`) và bump cache-busting `20261118_v95` (`node scripts/bump_version.js 20261118_v95`).
- [x] **Task 4.3:** Chạy toàn bộ **17/17 local test suites PASS** (bao gồm `tests/security_hardening_test.php`).

---

## GIAI ĐOẠN 5: TRIỂN KHAI LIVE HOSTING (`https://fxzioyr.id.vn`)
- [x] **Task 5.1:** Cấu hình VirtualHost Apache, SSL/HTTPS và Clean URLs qua `.htaccess`.
- [x] **Task 5.2:** Triển khai **49/49 file production** lên hosting (`https://fxzioyr.id.vn`, bản `v20261118_v95`).
- [x] **Task 5.3:** Nghiệm thu E2E live trên `https://fxzioyr.id.vn` với **0 console errors / 0 HTTP errors** và hoàn tất kiểm thử bảo mật live.

---

## GIAI ĐOẠN 6: XỬ LÝ LỖI MÃ NGUỒN & BACKLOG VẬN HÀNH
### 6.1. Đã vá 6 lỗi bảo mật/logic (`SRC-01` → `SRC-06`) — `[QA PASS]` *(chi tiết tại [PROGRESS.md](PROGRESS.md))*
- [x] **Task 6.1 (`SRC-01`):** Khóa IDOR tra cứu/hủy đơn theo `user_id` hoặc session guest hợp lệ (`api/bookings.php`).
- [x] **Task 6.2 (`SRC-02`):** Đưa `early_cancel` (hoàn điểm, voucher, hủy đơn) vào transaction `SELECT ... FOR UPDATE` (`api/bookings.php`).
- [x] **Task 6.3 (`SRC-03`):** Đọc lại `paid_amount` trong transaction `FOR UPDATE` chống Lost Update (`api/check_payment.php`).
- [x] **Task 6.4 (`SRC-04`):** `refresh_session_user()` fail-closed gọi `destroy_current_session()` khi user không tồn tại/bị khóa (`api/security_helper.php`).
- [x] **Task 6.5 (`SRC-05`):** Chuẩn hóa regex SĐT `/^0[35789]\d{8}$/` (`api/auth.php`).
- [x] **Task 6.6 (`SRC-06`):** Trả HTTP 503 fail-closed khi mất kết nối DB lúc đăng ký (`api/auth.php`).

### 6.2. Backlog nâng cấp mở
- [ ] **Task 6.7:** Chuyển biến môi trường SePay sang chế độ Live (`SEPAY_ENV=production`, `SEPAY_ALLOW_API_CROSSCHECK=false`) khi kích hoạt key thật.
- [ ] **Task 6.8:** Tích hợp gửi thông báo Zalo ZNS / SMS Brandname tự động khi cọc thành công (`api/notification_helper.php`).
- [ ] **Task 6.9:** Cấu hình Service Worker PWA hỗ trợ quét vé offline tại quầy khi mất mạng chập chờn.
- [ ] **Task 6.10:** Mở rộng biểu đồ SVG phân tích xu hướng giờ lấp đầy và dự báo doanh thu tuần/tháng.

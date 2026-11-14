# TASKS — KẾ HOẠCH THỰC THI TỪNG BƯỚC (SÂN BÓNG PRO)

> **Quy tắc:** Chỉ thực hiện 1 task tại 1 thời điểm. Hoàn thành task nào đánh dấu `[x]` task đó kèm bằng chứng kiểm thử pass.

---

## GIAI ĐOẠN 1: CƠ SỞ HẠ TẦNG & CƠ SỞ DỮ LIỆU
- [x] **Task 1.1:** Thiết kế cấu trúc bảng CSDL chuẩn mực (`database/schema.sql`).
- [x] **Task 1.2:** Thiết lập kết nối PDO Singleton, đọc cấu hình từ `.env` (`config/database.php`).
- [x] **Task 1.3:** Tạo cơ chế auto-migration an toàn kiểm tra marker (`001..008_hotfix_bookings_status.sql`).
- [x] **Task 1.4:** Thiết lập cấu trúc thư mục Clean URLs và bảo vệ file nhạy cảm qua `.htaccess`.

---

## GIAI ĐOẠN 2: PHÂN HỆ ĐẶT SÂN & TÍCH HỢP VIETQR SEPAY
- [x] **Task 2.1:** Xây dựng danh mục sân trực quan và tích hợp dự báo thời tiết Open-Meteo (`html/fields.html`, `js/fields.js`).
- [x] **Task 2.2:** Xây dựng ma trận 18 khung giờ đặt sân chống trùng slot bằng MySQL Transaction (`html/booking.html`, `api/bookings.php`).
- [x] **Task 2.3:** Hỗ trợ đặt gói cố định theo tháng (1, 2, 3 tháng) giảm giá 5%–15% và tặng nước/trọng tài.
- [x] **Task 2.4:** Tích hợp sinh mã VietQR động theo chuẩn SePay (`ASFF`, `ASFS`, `ASFE`) với tiền cọc 30% (`html/checkout.html`).
- [x] **Task 2.5:** Xử lý Webhook SePay tự động kích hoạt đơn và ghi nhận đối soát thanh toán (`api/sepay_webhook.php`).
- [x] **Task 2.6:** Sinh vé điện tử kèm mã QR check-in sau khi đặt cọc thành công (`html/success.html`).
- [x] **Task 2.7:** Hệ thống tích điểm hội viên, hạng thành viên và áp dụng mã voucher giảm giá (`html/history.html`).
- [x] **Task 2.8:** Trang ghép kèo / tìm đối giao lưu bóng đá (`html/matchmaking.html`).

---

## GIAI ĐOẠN 3: PHÂN HỆ QUẢN TRỊ VIÊN (PORTAL-ADMIN)
- [x] **Task 3.1:** Cổng đăng nhập phân quyền RBAC 3 cấp (`staff`, `manager`, `admin`) băm Argon2id (`portal-admin/index.php`, `api/auth.php`).
- [x] **Task 3.2:** Tab 1 - Dashboard KPI doanh thu thực và quét QR check-in qua camera trực tiếp (`jsQR`).
- [x] **Task 3.3:** Tab 2 - Biểu đồ Gantt Timeline điều hành ca đá 05:30–23:00 tích hợp trung tâm bù giờ / đổi sân / thêm nước.
- [x] **Task 3.4:** Tab 3 - Đặt sân trực tiếp tại quầy, quản lý xuất nhập tồn kho nước và chốt ca tiền mặt.
- [x] **Task 3.5:** Tab 4 - Quản lý danh mục sân, giá riêng từng sân và lên lịch bảo trì tự động chặn slot.
- [x] **Task 3.6:** Tab 5 - Quản lý cấu hình giá giờ vàng, cuối tuần và mã voucher khuyến mãi.
- [x] **Task 3.7:** Tab 6 - CRM hồ sơ khách hàng, gắn nhãn VIP / cảnh báo bùng ca (≥2 lần) và theo dõi công nợ.
- [x] **Task 3.8:** Tab 7 - Đối soát cọc VietQR SePay, xử lý giao dịch chuyển thiếu/thừa tiền.
- [x] **Task 3.9:** Tab 8 - Báo cáo tài chính bóc tách các dòng tiền, sổ chi phí vận hành và xuất CSV UTF-8 BOM.
- [x] **Task 3.10:** Tab 9 - Quản lý nhân sự, bảo mật 2FA TOTP (RFC 6238), Audit Log và sao lưu CSDL.

---

## GIAI ĐOẠN 4: BẢO MẬT & TỐI ƯU GO-LIVE (SECURITY HARDENING)
- [x] **Task 4.1:** Bảo vệ phiên làm việc 2 giờ tuyệt đối, chống session fixation.
- [x] **Task 4.2:** Triển khai cơ chế xác thực `X-CSRF-Token` cho toàn bộ thao tác ghi dữ liệu.
- [x] **Task 4.3:** Thiết lập Content-Security-Policy (CSP) và các tiêu đề bảo mật HTTP Security Headers chuẩn OWASP.
- [x] **Task 4.4:** Đóng gói bundle `js/app.js` bằng `node scripts/build_app_bundle.js`.
- [x] **Task 4.5:** Chạy kiểm thử tự động toàn diện: `tests/security_hardening_test.php` đạt 25 PASS / 0 FAIL.

---

## GIAI ĐOẠN 5: TRIỂN KHAI LIVE HOSTING ONEPANEL (PRODUCTION DEPLOY)
- [x] **Task 5.1:** Cấu hình VirtualHost Apache trên OnePanel, kích hoạt chứng chỉ SSL/HTTPS và thiết lập Clean URLs qua `.htaccess` (`https://fxzioyr.id.vn`).
- [x] **Task 5.2:** Triển khai tự động và đồng bộ mã nguồn lên Web Hosting OnePanel qua OnePanel MCP Tool (`scripts/deploy_all_to_hosting.js`).
- [x] **Task 5.3:** Cấu hình môi trường `.env` production, cấu hình kết nối CSDL MySQL và webhook đối soát SePay API v2.
- [x] **Task 5.4:** Kiểm tra nghiệm thu trực tiếp trên Production Live: 18 endpoints HTTP 200, phân quyền RBAC chuyển hướng chuẩn xác, kiểm thử bảo mật live đạt tiêu chuẩn.

---

## GIAI ĐOẠN 6: KẾ HOẠCH XỬ LÝ BACKLOG & NÂNG CẤP HỆ THỐNG
### 6.1. Kế Hoạch Xử Lý 6 Lỗi Mã Nguồn (SRC-01 đến SRC-06):
- [x] **Task 6.1 (SRC-01 - Mức độ Cao):** Xác thực quyền sở hữu SĐT khi xem lịch sử và hủy đơn; phân quyền chặt chẽ theo `user_id`, tách riêng cơ chế tra cứu cho khách vãng lai (`api/auth.php`, `api/bookings.php`). [ĐÃ VÁ & QA PASS]
- [x] **Task 6.2 (SRC-02 - Mức độ Cao):** Đảm bảo tính nguyên tử trong luồng hủy đơn (`early_cancel`); bọc toàn bộ thao tác hoàn điểm tích lũy, hoàn lượt voucher và cập nhật trạng thái đơn trong cùng một MySQL Transaction có `SELECT ... FOR UPDATE` (`api/bookings.php`). [ĐÃ VÁ & QA PASS]
- [x] **Task 6.3 (SRC-03 - Mức độ Cao):** Sửa lỗi tính toán số tiền trong polling kiểm tra thanh toán; đọc lại `paid_amount` và trạng thái mới nhất từ DB sau khi đã khóa bản ghi `SELECT ... FOR UPDATE` trước khi cập nhật (`api/check_payment.php`). [ĐÃ VÁ & QA PASS]
- [x] **Task 6.4 (SRC-04 - Mức độ Cao):** Thu hồi phiên đăng nhập khi tài khoản không còn tồn tại trong DB; nếu truy vấn user trả về rỗng trong `refresh_session_user()`, lập tức hủy session và từ chối xác thực (`api/security_helper.php`). [ĐÃ VÁ & QA PASS]
- [x] **Task 6.5 (SRC-05 - Mức độ Thấp):** Chuẩn hóa biểu thức chính quy số điện thoại, sửa lỗi regex `/^(0[3|5|7|8|9])[0-9]{8}$/` loại bỏ ký tự `|` trong character class thành `/^(0[35789])[0-9]{8}$/` (`api/auth.php`). [ĐÃ VÁ & QA PASS]
- [x] **Task 6.6 (SRC-06 - Mức độ Trung bình):** Xử lý an toàn khi mất kết nối DB ở nhánh đăng ký; trả lỗi HTTP 503 fail-closed thay vì tạo session giả định khi chưa INSERT thành công vào DB (`api/auth.php`). [ĐÃ VÁ & QA PASS]

### 6.2. Nâng Cấp Vận Hành & Tính Năng Kế Tiếp:
- [ ] **Task 6.7:** Cập nhật biến môi trường SePay sang chế độ Live (`SEPAY_ENV=production`, `SEPAY_ALLOW_API_CROSSCHECK=false`) khi chủ sân kích hoạt key thật.
- [ ] **Task 6.8:** Tích hợp gửi thông báo Zalo ZNS / SMS Brandname tự động tới số điện thoại khách khi cọc thành công (`api/notification_helper.php`).
- [ ] **Task 6.9:** Cấu hình Service Worker PWA để hỗ trợ chế độ quét vé offline tại quầy khi mất mạng chập chờn.
- [ ] **Task 6.10:** Tối ưu biểu đồ phân tích xu hướng giờ lấp đầy và dự báo doanh thu tuần/tháng bằng Inline SVG Vector Charts thuần (thay thế Chart.js).

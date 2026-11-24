# TASKS — DANH SÁCH CÔNG VIỆC (SÂN BÓNG PRO)

> Tiến độ phát hành xem tại [PROGRESS.md](PROGRESS.md) · Lịch sử kỹ thuật xem tại [docs/TIEN_DO.md](docs/TIEN_DO.md).

## Giai đoạn 1: Hạ tầng & Cơ sở dữ liệu
- [x] **Task 1.1:** Thiết kế CSDL 26 sân bóng (9 sân 5, 10 sân 7, 7 sân 11) trong `database/schema.sql`.
- [x] **Task 1.2:** Thiết lập kết nối PDO MySQL qua `.env` (`config/database.php`).
- [x] **Task 1.3:** Hoàn thiện **24 file migration (`001`..`023`)** và tự kiểm chuẩn cấu trúc DB tới `v23`.
- [x] **Task 1.4:** Cấu hình Clean URLs, chặn thư mục nhạy cảm và `Cache-Control: no-store` qua `.htaccess`.

## Giai đoạn 2: Trải nghiệm Khách hàng & VietQR SePay
- [x] **Task 2.1:** Danh mục 26 sân kèm bảng giá theo khung giờ và dự báo thời tiết Open-Meteo.
- [x] **Task 2.2:** Ma trận **7 khung giờ 2 tiếng/ca (`05:30–22:30`)** chống trùng khoảng thời gian bằng giao dịch DB.
- [x] **Task 2.3:** Gói cố định 4/8/12 tuần (giảm 5%–15% kèm quà tài trợ) và chọn voucher 1 chạm.
- [x] **Task 2.4:** Tạo QR cọc 30% VietQR SePay (`ASFF`/`ASFS`/`ASFE`) tại `/checkout`.
- [x] **Task 2.5:** Webhook SePay tự động kích hoạt đơn và đối soát giao dịch ngân hàng.
- [x] **Task 2.6:** Phát hành vé điện tử QR Check-in và đánh giá 1–5 sao sau trận.
- [x] **Task 2.7:** Tích điểm hội viên (`points_log`), quên mật khẩu và chuẩn hóa trang `/history` tiếng Việt đầy đủ.
- [x] **Task 2.8:** Trang ghép kèo / tìm đối giao hữu (`/matchmaking`) và đăng nhập sạch.

## Giai đoạn 3: Cổng Quản trị 11 Tab (`/portal-admin`)
- [x] **Task 3.1:** Cổng đăng nhập RBAC 3 cấp (`staff`, `manager`, `admin`) với phiên tối đa 24 giờ.
- [x] **Task 3.2:** **Tab 1 — Tổng quan & Đang chơi:** KPI doanh thu (`admin`), quét QR Check-in và quản lý ca `Giữ chỗ`.
- [x] **Task 3.3:** **Tab 2 — Lịch đặt sân Timeline:** Biểu đồ Gantt trong ngày, điều hành ca, Waitlist, lịch lặp & duyệt kèo.
- [x] **Task 3.4:** **Tab 3 — Đặt sân tại quầy:** Tạo đơn POS chống trùng và bán nước/dịch vụ trừ tồn kho.
- [x] **Task 3.5:** **Tab 4 — Quản lý sân bóng:** Quản lý 26 sân, lịch bảo trì và phản hồi đánh giá.
- [x] **Task 3.6:** **Tab 5 — Bảng giá & Voucher:** Giá theo khung giờ/cuối tuần, giờ vàng, gói tuần/tháng & voucher.
- [x] **Task 3.7:** **Tab 6 — Khách & Hội viên:** Bảng CRM 8 cột, 2 nút lọc (`Tất cả khách`, `Hội viên VIP`), cảnh báo bùng sân & chỉnh điểm minh bạch.
- [x] **Task 3.8:** **Tab 7 — Duyệt cọc VietQR:** Duyệt biên lai cọc và đối soát giao dịch ngân hàng SePay.
- [x] **Task 3.9:** **Tab 8 — Chốt ca / Giao ca:** Mở/đóng ca, kiểm đếm tiền mặt thực tế và xác minh chênh lệch.
- [x] **Task 3.10:** **Tab 9 — Báo cáo doanh thu:** 4 sub-tab sticky, biểu đồ SVG thuần, Sổ chi chung & xuất CSV.
- [x] **Task 3.11:** **Tab 10 — Cài đặt hệ thống:** Chính sách cọc, ngân hàng, nhân sự, thông báo & backup `.sql.gz`.
- [x] **Task 3.12:** **Tab 11 — Nhật ký Admin:** Grid 5 cột (110 mã / 6 nhóm `TD/XHC/CN/CB/TQ/AUTO`), hậu kiểm inline & Inverted Index không dấu.

## Giai đoạn 4 & 5: Bảo mật, Kiểm thử & Triển khai (`v20261124_v142`)
- [x] **Task 4.1:** Hoàn thiện 25+ hạng mục bảo mật (Argon2id, session 24h, CSRF, 2FA TOTP, chống log rác).
- [x] **Task 4.2:** Build Tailwind CSS & `js/app.js` cục bộ (0 CDN ngoài), đồng bộ `?v=20261124_v142`.
- [x] **Task 4.3:** Vượt qua các bộ kiểm thử an ninh, Tab 11, Inverted Index & `/history`.
- [x] **Task 5.1–5.3:** Triển khai HTTPS Clean URLs lên `https://fxzioyr.id.vn` và nghiệm thu E2E (`0` lỗi).

## Giai đoạn 6: Đã vá mã nguồn & Backlog chưa làm
- [x] **Task 6.1–6.6 (`SRC-01` → `SRC-06`):** Đã vá xong toàn bộ lỗi IDOR, Lost Update, fail-closed session/DB và chuẩn hóa SĐT.
- [ ] **Task 6.7:** Chuyển biến môi trường SePay sang chế độ Live (`SEPAY_ENV=production`) khi kích hoạt key thật.
- [ ] **Task 6.8:** Tích hợp gửi tin nhắn Zalo ZNS / SMS Brandname tự động khi cọc thành công.
- [ ] **Task 6.9:** Bổ sung Service Worker PWA hỗ trợ quét vé QR offline tại quầy.
- [ ] **Task 6.10:** Mở rộng biểu đồ SVG phân tích giờ lấp đầy và dự báo doanh thu tuần/tháng.

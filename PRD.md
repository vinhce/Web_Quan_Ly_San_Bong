# PRD — SÂN BÓNG PRO (HỆ THỐNG QUẢN LÝ & ĐẶT SÂN BÓNG ĐÁ TRỰC TUYẾN)

## 1. TỔNG QUAN & SỨ MỆNH
- **Tên dự án:** Sân Bóng Pro (Web Quản Lý Sân Bóng)
- **Domain vận hành chính thức (Production Live):** `https://fxzioyr.id.vn`
- **Tuyên ngôn sứ mệnh:** Nền tảng quản lý vận hành cụm sân bóng đá mini và đặt sân trực tuyến tự động 1 chạm, chuẩn hóa giao diện trực quan chuẩn FIFA, tích hợp đối soát cọc tự động qua VietQR (SePay API v2) và trung tâm điều hành ca đá thời gian thực.
- **Đối tượng sử dụng (Target Users):**
  1. *Khách đặt sân (Cầu thủ / Đội trưởng):* Đặt slot nhanh, giữ chỗ cọc 30% qua VietQR (SePay API v2), nhận vé QR điện tử check-in, tra cứu lịch sử, chia tiền nội bộ theo đội, tìm đối ghép kèo.
  2. *Nhân viên quầy / Thu ngân (Staff):* Quét vé QR check-in, bán nước/dịch vụ, chốt ca bàn giao tiền mặt, đặt sân tại quầy.
  3. *Quản lý vận hành (Manager):* Điều hành ca đá Gantt Timeline, kiểm duyệt ghép kèo, quản lý lịch bảo trì sân, duyệt cọc lệch tiền, kiểm tra kho nước, xem báo cáo & xác nhận chốt ca.
  4. *Chủ sân (Admin):* Xem toàn bộ KPI doanh thu bóc tách, cấu hình giá giờ vàng/cao điểm, quản lý nhân sự, cấu hình hệ thống, đối soát ngân hàng & kiểm toán Audit Log.

---

## 2. VẤN ĐỀ CỐT LÕI CẦN GIẢI QUYẾT (PAIN POINTS)
- **Đặt trùng giờ (Double Booking):** Các sân bóng truyền thống ghi chép sổ sách hoặc tin nhắn Zalo dễ bị ghi đè, trùng slot khi nhiều đội cùng đặt một lúc.
- **Thất thoát & Trễ hạn xác nhận cọc:** Chủ sân phải kiểm tra app ngân hàng thủ công để xác nhận đã nhận cọc hay chưa, dễ nhầm cú pháp hoặc chậm trễ khiến khách hủy kèo.
- **Tình trạng khách không đến / trễ giờ quá hạn:** Khách đặt miệng không cọc rồi không đến gây trống sân giờ vàng và thiệt hại doanh thu.
- **Điều hành ca & dịch vụ tại quầy lộn xộn:** Không theo dõi được đội nào đang đá, đá quá giờ, gọi thêm nước/thuê áo bib hoặc ai chưa thanh toán 70% còn lại tại quầy.
- **Gian lận bàn giao tiền ca:** Khó bóc tách giữa tiền cọc chuyển khoản, tiền mặt thu tại quầy và tiền bán nước khi giao ca giữa các nhân viên.

---

## 3. DANH SÁCH TÍNH NĂNG CHÍNH (SCOPE)

### 3.1. Phân Hệ Khách Hàng (Client Portal)
- [x] **Xem & Tìm sân trực quan:** Danh mục 26 sân bóng (9 sân 5 người, 10 sân 7 người, 7 sân 11 người), phân loại sân, xem thông tin cỏ, đèn, kích thước và bảng giá giờ thường / cao điểm / cuối tuần.
- [x] **Tích hợp thời tiết thời gian thực:** Dự báo thời tiết tại cụm sân qua Open-Meteo API giúp khách chủ động chọn giờ đá phù hợp.
- [x] **Ma trận đặt slot & Gói tháng:** Chọn ngày, xem 18 khung giờ (05:30–23:00) theo màu trạng thái; đặt gói cố định theo tháng (4/8/12 tuần) giảm 5%–15% kèm quà tài trợ; hỗ trợ danh sách chờ (Waitlist).
- [x] **Thanh toán VietQR tự động qua SePay API v2:** Sinh mã QR chuyển khoản chuẩn ngân hàng có sẵn cú pháp (`ASFF`, `ASFS`, `ASFE` + 6 số), giữ chỗ mặc định 15 phút (`hold_minutes`, tự động nhả đơn quá hạn qua `cron/auto_release_expired.php`), webhook tự động xác nhận đơn trong <3 giây.
- [x] **Vé điện tử, QR Check-in & Chia tiền theo đội:** Sinh mã vé điện tử QR sau khi cọc, hỗ trợ in vé PDF, xem bản đồ chỉ đường, đánh giá 1–5 sao sau trận và sổ chia tiền nội bộ theo đội (`api/team_split.php`).
- [x] **CRM Khách hàng & Điểm thưởng:** Tích điểm tự động qua `points_log`, đổi điểm lấy nước suối, nâng hạng thành viên, áp dụng mã giảm giá (Voucher).
- [x] **Ghép kèo / Cáp đối (`/matchmaking`):** Đăng tin tìm đối giao lưu theo trình độ/khung giờ, hỗ trợ kiểm duyệt từ quản trị viên.
- [x] **Tuân thủ dữ liệu & Tiện ích:** Form xác nhận đồng thuận bảo vệ dữ liệu cá nhân (Nghị định 13/2023), widget gọi Hotline/Zalo nổi 24/7.

### 3.2. Phân Hệ Quản Trị Vận Hành (`/portal-admin/` — 11 Tab Chuẩn Hóa)
- [x] **Phân quyền RBAC 3 cấp (`staff`, `manager`, `admin`):** Bảo vệ phiên server-side (`portal-admin/index.php`), che giấu dữ liệu doanh thu nhạy cảm với `staff` và chặn truy cập phân hệ cấp cao theo vai trò.
- [x] **Tab 1 — Tổng quan & Đang chơi (`overview`):** KPI doanh thu thực (hiển thị cho `admin`), tỷ lệ lấp đầy, bộ lọc ca đá trong ngày, camera/tải ảnh quét QR vé điện tử (`jsQR`) hoặc súng quét.
- [x] **Tab 2 — Lịch đặt sân Timeline (`timeline`):** Biểu đồ Gantt 05:30–23:00, popup điều hành ca đá (bù giờ, đổi sân, thêm nước, hủy ca, đánh dấu **"Khách chưa đến"** khi khách không đến / trễ giờ quá hạn quá 15 phút), Danh sách chờ (Waitlist), Lịch cố định hàng tuần (Recurring) và Kiểm duyệt ghép kèo (`manager`, `admin`).
- [x] **Tab 3 — Đặt sân tại quầy (`quick-booking`):** Đặt tại quầy chống trùng slot (hỗ trợ gói tháng và cảnh báo lịch sử khách không đến / trễ giờ quá hạn), Kho nước & bán lẻ dịch vụ POS (`manager`, `admin` quản lý danh mục dịch vụ).
- [x] **Tab 4 — Quản lý sân bóng (`pitches`):** Bật/tắt bảo trì nhanh từng sân, cấu hình thông số/giá riêng (`admin` thêm/sửa sân), lịch bảo trì định kỳ tự động chặn đặt trùng (`manager`, `admin`) và thống kê/phản hồi đánh giá sau trận.
- [x] **Tab 5 — Bảng giá & Voucher (`pricing` · `admin`):** Cấu hình giá giờ thường/cao điểm/cuối tuần, chính sách gói tháng 1–3 tháng, quản lý mã voucher và quy tắc giờ vàng/thấp điểm; chống cập nhật thừa và cờ loading chống gửi trùng request.
- [x] **Tab 6 — Khách & Hội viên (`customers`):** Tìm kiếm SĐT chuẩn hóa (`+84`, `0` đầu, vài số cuối); bảng CRM 8 cột cố định gồm **"Đặt gần nhất"** & **"Trận hoàn thành"**; nhãn đỏ cảnh báo khách không đến / trễ giờ quá hạn (`≥1` lần); 3 nút lọc tinh gọn (`Tất cả khách`, `Hội viên VIP`, `Khách quen`); hồ sơ CRM hợp nhất, sửa hội viên & điều chỉnh điểm qua `points_log` kèm lý do bắt buộc và khóa dòng `FOR UPDATE` (`manager`, `admin` thao tác cập nhật). Không tồn tại công nợ đọng.
- [x] **Tab 7 — Duyệt cọc VietQR (`payments` · `manager`, `admin`):** Hàng đợi biên lai chờ duyệt và đối soát giao dịch SePay Webhook (`bank_transactions`) khi chuyển thiếu/thừa tiền hoặc sai nội dung.
- [x] **Tab 8 — Chốt ca / Giao ca (`shifts`):** Mở ca với tiền mặt đầu ca, tự động tổng hợp thu tiền mặt & chuyển khoản VietQR trong ca, kiểm đếm thực tế, tính chênh lệch (bắt buộc lý do khi lệch) và xác nhận bàn giao (`manager`, `admin`).
- [x] **Tab 9 — Báo cáo doanh thu (`reports` · `manager`, `admin`):** Lọc khoảng ngày, đối chiếu 2 công thức tài chính độc lập, biểu đồ Inline SVG thuần, bảng kê ca đặt, doanh thu theo sân, sổ chi phí vận hành & lãi ròng, xuất báo cáo CSV UTF-8 BOM.
- [x] **Tab 10 — Cài đặt hệ thống (`settings` · `admin`):** Cấu hình tỷ lệ cọc, tài khoản VietQR, thời gian giữ chỗ, mốc hoàn/phạt cọc, Waitlist/Ghép kèo, nhắc lịch Zalo/SMS & Telegram Bot, quản lý nhân sự (`staff`, `manager`), nhật ký thông báo, sao lưu/khôi phục CSDL (`.sql.gz`); chống cập nhật thừa cài đặt.
- [x] **Tab 11 — Nhật ký Admin (`logs` · `admin`):** Nhật ký bất biến (append-only) ghi nhận trong cùng transaction mọi thay đổi nhạy cảm; diffing trực quan Cũ → Mới; bộ lọc phân nhóm 6 màu badge (`🟢 Tạo/Duyệt`, `🔴 Xóa/Hủy/Chi tiền`, `🔵 Cập nhật`, `🟠 Cảnh báo`, `🟣 Tiền quầy`, `⚪ Tự động`) kèm chú thích (Legend) và Emoji; che dữ liệu nhạy cảm (SĐT/STK/CCCD, không lưu mật khẩu/token); tooltip IP chống vỡ giao diện.
- [x] **Cơ chế Chặn Cập Nhật Thừa & Chống Log Rác Toàn Diện:** Kiểm tra so sánh diff trước khi ghi DB trên toàn bộ phân hệ (Bảng giá, Trạng thái sân, Voucher, Cài đặt, CRM), chỉ ghi log khi có thay đổi thực tế.
- [x] **Hệ thống Migration Idempotent (17 Migrations `001..017`):** Auto-migration với marker `logs/.schema_v18_full_sync_ready`; trong đó `015` mở rộng `audit_logs`, tạo `points_log` và thêm `users.admin_note`, còn `016..017` xóa bỏ hoàn toàn các cấu trúc công nợ đọng.

---

## 4. NGOÀI PHẠM VI (OUT OF SCOPE)
- **App Native (iOS / Android):** Giai đoạn hiện tại tối ưu hóa Responsive Web App (Mobile-first từ 360px), chưa build app native bằng Flutter/React Native.
- **Hệ thống điều khiển đèn thông minh IoT:** Chưa tích hợp phần cứng ngắt rơ-le điện sân tự động theo giờ đá.
- **Camera AI Highlight / VAR:** Chưa tự động ghi hình và trích xuất video bàn thắng bằng camera AI.
- **Cổng thanh toán thẻ quốc tế & Cổng bên thứ ba khác (PayOS, Stripe, PayPal):** Hệ thống chỉ tập trung duy nhất chuẩn VietQR ngân hàng nội địa qua SePay API v2 (`https://userapi.sepay.vn`), không sử dụng PayOS hay cổng thanh toán thẻ quốc tế.

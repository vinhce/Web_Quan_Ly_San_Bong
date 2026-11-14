# PRD — SÂN BÓNG PRO (HỆ THỐNG QUẢN LÝ & ĐẶT SÂN BÓNG ĐÁ TRỰC TUYẾN)

## 1. TỔNG QUAN & SỨ MỆNH
- **Tên dự án:** Sân Bóng Pro (Web Quản Lý Sân Bóng)
- **Tuyên ngôn sứ mệnh:** Nền tảng quản lý vận hành cụm sân bóng đá mini và đặt sân trực tuyến tự động 1 chạm, chuẩn hóa giao diện trực quan chuẩn FIFA, tích hợp đối soát cọc tự động qua VietQR/SePay và trung tâm điều hành ca đá thời gian thực.
- **Đối tượng sử dụng (Target Users):**
  1. *Khách đặt sân (Cầu thủ / Đội trưởng):* Đặt slot nhanh, giữ chỗ cọc 30% qua VietQR, nhận vé QR điện tử check-in, tra cứu lịch sử, tìm đối ghép kèo.
  2. *Nhân viên quầy / Thu ngân (Staff):* Quét vé QR check-in, bán nước/dịch vụ, chốt ca bàn giao tiền mặt, đặt sân tại quầy.
  3. *Quản lý vận hành (Manager):* Điều hành ca đá Gantt Timeline, kiểm duyệt ghép kèo, quản lý lịch bảo trì sân, duyệt cọc lệch tiền, kiểm tra kho nước.
  4. *Chủ sân (Admin):* Xem toàn bộ KPI doanh thu bóc tách, cấu hình giá giờ vàng/cao điểm, quản lý nhân sự, cấu hình hệ thống & đối soát ngân hàng.

---

## 2. VẤN ĐỀ CỐT LÕI CẦN GIẢI QUYẾT (PAIN POINTS)
- **Đặt trùng giờ (Double Booking):** Các sân bóng truyền thống ghi chép sổ sách hoặc tin nhắn Zalo dễ bị ghi đè, trùng slot khi nhiều đội cùng đặt một lúc.
- **Thất thoát & Trễ hạn xác nhận cọc:** Chủ sân phải kiểm tra app ngân hàng thủ công để xác nhận đã nhận cọc hay chưa, dễ nhầm cú pháp hoặc chậm trễ khiến khách hủy kèo.
- **Tình trạng khách bùng sân (No-Show):** Khách đặt miệng không cọc rồi không đến gây trống sân giờ vàng và thiệt hại doanh thu.
- **Điều hành ca & dịch vụ tại quầy lộn xộn:** Không theo dõi được đội nào đang đá, đá quá giờ, gọi thêm nước/thuê áo pitch hoặc ai chưa thanh toán 70% còn lại.
- **Gian lận bàn giao tiền ca:** Khó bóc tách giữa tiền cọc chuyển khoản, tiền mặt thu tại quầy và tiền bán nước khi giao ca giữa các nhân viên.

---

## 3. DANH SÁCH TÍNH NĂNG CHÍNH (SCOPE)

### 3.1. Phân Hệ Khách Hàng (Client Portal)
- [x] **Xem & Tìm sân trực quan:** Danh mục 17 sân bóng (5, 7, 11 người), phân loại sân, xem thông tin cỏ, đèn, kích thước, ảnh thực tế và bảng giá.
- [x] **Tích hợp thời tiết thời gian thực:** Dự báo thời tiết tại cụm sân qua Open-Meteo API giúp khách chủ động chọn giờ đá phù hợp.
- [x] **Ma trận đặt slot & Gói tháng:** Chọn ngày, xem 18 khung giờ (05:30–23:00) theo màu trạng thái; đặt gói cố định theo tháng giảm 5%–15%.
- [x] **Thanh toán VietQR tự động (SePay):** Sinh mã QR chuyển khoản chuẩn ngân hàng có sẵn cú pháp (`ASFF`, `ASFS`, `ASFE`), webhook tự động xác nhận đơn trong <3 giây.
- [x] **Vé điện tử & QR Check-in:** Sinh mã vé điện tử QR sau khi cọc, hỗ trợ in vé PDF, lưu ảnh vé và xem bản đồ chỉ đường.
- [x] **CRM Khách hàng & Điểm thưởng:** Tích điểm tự động sau trận, nâng hạng thành viên (Bạc, Vàng, Kim Cương), áp dụng mã giảm giá (Voucher).
- [x] **Ghép kèo / Cáp đối (`/matchmaking`):** Đăng tin tìm đối giao lưu theo trình độ/khung giờ, có kiểm duyệt từ admin.
- [x] **Tuân thủ dữ liệu & Tiện ích:** Form xác nhận đồng thuận bảo vệ dữ liệu cá nhân (Nghị định 13/2023), widget gọi Hotline/Zalo nổi 24/7.

### 3.2. Phân Hệ Quản Trị Vận Hành (Portal Admin)
- [x] **Phân quyền RBAC 3 cấp (`staff`, `manager`, `admin`):** Bảo vệ phiên server-side, che giấu dữ liệu doanh thu nhạy cảm với nhân viên.
- [x] **Tab 1 - Tổng quan & Đang chơi:** KPI doanh thu thực, tỷ lệ lấp đầy, camera quét QR vé điện tử trực tiếp (`jsQR`) hoặc súng quét.
- [x] **Tab 2 - Lịch đặt sân Timeline:** Biểu đồ Gantt 05:30–23:00, điều hành trực tiếp ca đá (bù giờ, đổi sân, thêm nước, hủy ca, đánh dấu "Khách chưa đến").
- [x] **Tab 3 - Đặt sân tại quầy & Kho nước:** Đặt tại quầy chống trùng slot, quản lý xuất nhập tồn kho nước/dịch vụ, chốt ca bàn giao tiền mặt cuối ngày.
- [x] **Tab 4 - Quản lý sân & Bảo trì:** Thêm/sửa sân, bảng giá riêng, lên lịch bảo trì tự động chặn đặt sân trùng.
- [x] **Tab 5 - Bảng giá & Voucher:** Cấu hình giá giờ thường/cao điểm/cuối tuần, chính sách gói tháng, quản lý mã voucher.
- [x] **Tab 6 - CRM Khách hàng & Sổ nợ:** Hồ sơ khách theo SĐT, cảnh báo khách hay bùng cọc (≥2 lần), quản lý nợ chưa thu.
- [x] **Tab 7 - Duyệt cọc & Đối soát SePay:** Hàng đợi đối soát giao dịch chuyển thiếu/thừa tiền, duyệt thủ công khi cần.
- [x] **Tab 8 - Báo cáo tài chính & Sổ chi:** Thống kê doanh thu, bóc tách tiền cọc/tiền mặt/VietQR/dịch vụ, sổ chi phí, xuất báo cáo CSV UTF-8.
- [x] **Tab 9 - Cài đặt hệ thống & Bảo mật:** Cấu hình tài khoản, bảo mật 2FA TOTP (RFC 6238), Audit Log append-only, sao lưu CSDL tự động.

---

## 4. NGOÀI PHẠM VI (OUT OF SCOPE)
- **App Native (iOS / Android):** Giai đoạn hiện tại tối ưu hóa Responsive Web App (Mobile-first từ 360px), chưa build app native bằng Flutter/React Native.
- **Hệ thống điều khiển đèn thông minh IoT:** Chưa tích hợp phần cứng ngắt rơ-le điện sân tự động theo giờ đá.
- **Camera AI Highlight / VAR:** Chưa tự động ghi hình và trích xuất video bàn thắng bằng camera AI.
- **Cổng thanh toán thẻ quốc tế:** Chỉ tập trung chuẩn VietQR ngân hàng nội địa qua SePay, chưa tích hợp cổng Stripe/PayPal.

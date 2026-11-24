# PRD — ĐẶC TẢ SẢN PHẨM SÂN BÓNG PRO

## 1. Tổng quan & Đối tượng sử dụng
- **Sản phẩm:** Website đặt sân bóng đá trực tuyến & điều hành cụm sân **Sân Bóng Pro** (`https://fxzioyr.id.vn`).
- **Nhóm người dùng chính:**
  1. **Khách đặt sân / Đội trưởng:** Tìm sân trống, đặt lẻ hoặc gói cố định, chuyển khoản cọc 30% qua VietQR, nhận vé QR Check-in, chia tiền đội và tìm đối ghép kèo.
  2. **Nhân viên quầy (`staff`):** Quét vé QR nhận sân, bán nước/dịch vụ, đặt sân tại quầy và kiểm đếm chốt ca.
  3. **Quản lý (`manager`):** Điều hành lịch Timeline, duyệt tin ghép kèo, quản lý bảo trì/kho hàng, duyệt cọc VietQR, xác nhận ca trực và xem báo cáo doanh thu.
  4. **Chủ sân (`admin`):** Toàn quyền xem KPI doanh thu, cấu hình bảng giá/voucher/hệ thống, quản trị nhân sự và hậu kiểm Nhật ký Admin.

## 2. Bài toán cốt lõi cần giải quyết
- **Chống đặt trùng giờ:** Khóa trùng khoảng thời gian tự động ngay khi nhiều người đặt cùng lúc.
- **Tự động hóa xác nhận cọc:** Đối soát chuyển khoản VietQR tức thì qua webhook ngân hàng, giảm sai sót kiểm tra thủ công.
- **Kiểm soát khách không đến / trễ giờ:** Giữ chỗ tối đa 15 phút trước khi hủy đơn chưa cọc; hỗ trợ nhả sân trạng thái **`Khách chưa đến`** sau 15 phút ân hạn.
- **Minh bạch vận hành tại quầy:** Theo dõi đá bù giờ, đổi sân, gọi nước và bóc tách tiền mặt / chuyển khoản từng ca trực, không tồn tại công nợ đọng.

## 3. Phạm vi tính năng (`v20261124_v142`)

### 3.1. Cổng Khách hàng
- **Danh mục 26 sân & Thời tiết:** Lọc nhanh 9 sân 5 người, 10 sân 7 người, 7 sân 11 người kèm dự báo thời tiết theo giờ.
- **Đặt sân theo 7 khung giờ 2 tiếng (`05:30–22:30`, nghỉ trưa `11:30–14:30`):** Tự khóa ca trùng giờ; hỗ trợ gói cố định **4/8/12 tuần** (giảm 5%–15% kèm quà tài trợ), danh sách chờ và chọn voucher hợp lệ 1 chạm.
- **Thanh toán VietQR SePay & Vé QR:** Sinh mã QR cọc 30% (`ASFF`/`ASFS`/`ASFE` + 6 số), giữ chỗ mặc định 15 phút, tự động xác nhận qua webhook và cấp vé QR Check-in có thể in PDF.
- **Hội viên, Chia tiền & Ghép kèo:** Tích điểm đổi nước, đánh giá sân 1–5 sao, sổ chia tiền nội bộ theo đội, tra cứu lịch sử tiếng Việt rõ ràng (`/history`), đặt lại mật khẩu và đăng tin ghép kèo.
- **Tuân thủ dữ liệu:** Yêu cầu đồng thuận bảo vệ dữ liệu cá nhân theo Nghị định 13/2023 trước khi tạo tài khoản/đặt sân.

### 3.2. Cổng Quản trị 11 Phân hệ (`/portal-admin`)
1. **Tổng quan & Đang chơi:** KPI doanh thu ngày (`admin`), tỷ lệ lấp đầy, xử lý nhanh đơn giữ chỗ/đang đá và quét QR Check-in.
2. **Lịch đặt sân Timeline:** Biểu đồ lịch cả ngày cho 26 sân, điều hành ca (bù giờ, đổi sân, thêm dịch vụ, nhả sân **Khách chưa đến**), Waitlist, lịch lặp & duyệt ghép kèo.
3. **Đặt sân tại quầy:** Đặt sân POS chống trùng slot kèm cảnh báo lịch sử bùng sân và bán nước/dịch vụ trừ kho.
4. **Quản lý sân bóng:** Quản lý thông tin 26 sân, bật/tắt bảo trì nhanh, lịch bảo trì định kỳ và phản hồi đánh giá.
5. **Bảng giá & Voucher:** Cấu hình giá giờ thường/cao điểm/cuối tuần, chính sách gói tuần/tháng, giờ vàng và mã khuyến mãi.
6. **Khách & Hội viên:** Tìm kiếm SĐT linh hoạt, bảng CRM 8 cột ("Đặt gần nhất", "Trận hoàn thành", cảnh báo bùng sân), lọc `Tất cả khách` / `Hội viên VIP`, cập nhật hồ sơ & điểm thưởng kèm lý do bắt buộc.
7. **Duyệt cọc VietQR:** Duyệt biên lai thủ công và đối soát các giao dịch chuyển thiếu/thừa hoặc chưa khớp mã đơn.
8. **Chốt ca / Giao ca:** Mở/đóng ca, tự động tổng hợp tiền mặt & VietQR, kiểm đếm thực tế và xác minh chênh lệch.
9. **Báo cáo doanh thu:** Lọc khoảng ngày, chia 4 tab phân tích & đối soát dòng tiền, biểu đồ trực quan, sổ chi phí chung & xuất CSV.
10. **Cài đặt hệ thống:** Cấu hình cọc, ngân hàng, giữ chỗ, hoàn/phạt cọc, thông báo Telegram/Zalo, nhân sự & sao lưu CSDL.
11. **Nhật ký Admin:** Theo dõi mọi thay đổi nhạy cảm theo 6 nhóm màu (`TD/XHC/CN/CB/TQ/AUTO`), đối chiếu giá trị Cũ → Mới, hậu kiểm đánh dấu xử lý, che dữ liệu nhạy cảm & tìm kiếm tiếng Việt không dấu.

## 4. Ngoài phạm vi giai đoạn hiện tại
- Chưa phát triển ứng dụng di động native (iOS/Android); giao diện tập trung Responsive Web Mobile-first từ `360px`.
- Chưa tích hợp phần cứng IoT đóng/ngắt đèn sân hoặc camera AI tự động.
- Chỉ hỗ trợ chuyển khoản VietQR nội địa qua SePay; chưa tích hợp cổng thẻ quốc tế hay PayOS.

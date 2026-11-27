# Checklist Kiểm Tra Giao Diện Khách Hàng & Responsive Mobile 360px

**Người thực hiện:** Nguyễn Quang Năng Tú (`PH62417`)  
**Phạm vi:** Giao diện khách hàng (`index.html`, `html/*.html`) và cấu hình responsive trên khung nhìn `360 x 800`.

---

## 1. Kiểm tra kỹ thuật Viewport trên các trang HTML

Tất cả 13 tệp giao diện khách hàng và trang lỗi đều đã khai báo `<meta name="viewport" content="width=device-width, initial-scale=1.0">`:

- `index.html` (Trang chủ)
- `html/fields.html` (Danh sách 26 sân bóng)
- `html/field-detail.html` (Chi tiết sân & bảng giá)
- `html/booking.html` (Đặt sân đơn & gói cố định 4/8/12 tuần)
- `html/checkout.html` (Thanh toán cọc 30% VietQR SePay)
- `html/success.html` (Vé QR Check-in & xác nhận đặt sân)
- `html/history.html` (Lịch sử đặt sân & tích điểm)
- `html/login.html` (Đăng nhập / Đăng ký)
- `html/forgot-password.html` (Quên mật khẩu)
- `html/matchmaking.html` (Tìm đối ghép kèo)
- `html/403.html`, `html/404.html`, `html/500.html` (Trang thông báo lỗi)

---

## 2. Checklist kiểm tra trực quan trên Chrome DevTools (`360px`)

| STT | Màn hình / Route | Tiêu chí kiểm tra (`360 x 800`) | Trạng thái |
| :--- | :--- | :--- | :--- |
| 1 | `/` (Trang chủ) | Header/Menu mobile thu gọn không tràn ngang; nút CTA "Đặt sân ngay" dễ bấm | [x] Đạt |
| 2 | `/fields` | Bộ lọc loại sân (5 / 7 / 11 người) xếp gọn 1 cột, thẻ sân không vỡ ảnh | [x] Đạt |
| 3 | `/field-detail` | Bảng giá khung giờ thường/cao điểm/cuối tuần đọc rõ, không tràn khung | [x] Đạt |
| 4 | `/booking` | Chọn ngày, 7 khung giờ (`05:30–22:30`), gói tuần & checkbox NĐ 13/2023 rõ ràng | [x] Đạt |
| 5 | `/checkout` | Mã VietQR hiển thị cân đối giữa màn hình, thông tin STK & số tiền cọc 30% rõ | [x] Đạt |
| 6 | `/success` | Mã vé QR Check-in, nút tải/lưu vé không bị cắt mép trên `360px` | [x] Đạt |
| 7 | `/history` | Danh sách đơn cũ, trạng thái tiếng Việt và nút hủy/đổi lịch dễ thao tác | [x] Đạt |
| 8 | `/login` & `/forgot-password` | Form nhập SĐT/mật khẩu căn giữa, thông báo lỗi hiển thị đầy đủ | [x] Đạt |
| 9 | `/matchmaking` | Thẻ tin ghép kèo và nút nhận kèo hiển thị gọn trên màn hình nhỏ | [x] Đạt |

---

## 3. Lưu ý tuân thủ giao diện & bảo mật Frontend

- Checkbox đồng ý **Điều khoản sử dụng & Nghị định 13/2023/NĐ-CP** tại `html/booking.html` và `html/login.html` không bị tích sẵn (`checked` mặc định = `false`).
- Liên kết Chính sách bảo mật trong `js/ui.js` sử dụng modal/button thay cho `href="#"`.
- Toàn bộ hàm render dữ liệu người dùng sử dụng `escapeHTML()` trong `js/helpers.js` / `js/app.js` để chống XSS.

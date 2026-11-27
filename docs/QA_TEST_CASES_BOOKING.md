# Kịch Bản Kiểm Thử Luồng Đặt Sân, Chống Trùng & Gói Tuần

**Người thực hiện:** Nguyễn Quang Năng Tú (`PH62417`)  
**Mục tiêu:** Kiểm tra đầy đủ luồng nghiệp vụ khách hàng từ tìm sân, đặt lịch, chống đặt trùng giờ đến thanh toán cọc và theo dõi lịch sử.

---

## 1. Bảng Test Case chức năng đặt sân

| Mã TC | Kịch bản kiểm thử | Các bước thực hiện | Kết quả mong đợi | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| TC-BK-01 | Đăng ký tài khoản mới | Vào `/login?tab=register`, nhập Họ tên, SĐT 10 số hợp lệ, mật khẩu ≥ 8 ký tự, tích đồng ý điều khoản | Tạo tài khoản thành công, mật khẩu băm Argon2id | Pass |
| TC-BK-02 | Kiểm tra validate SĐT & mật khẩu | Nhập SĐT sai định dạng hoặc mật khẩu < 8 ký tự | Hệ thống từ chối và báo lỗi rõ ràng (`400 Bad Request`) | Pass |
| TC-BK-03 | Đặt sân đơn 1 ca | Chọn sân, ngày, khung giờ trống trên `/booking`, xác nhận đặt | Sinh mã đơn từ server, tính tiền cọc 30%, chuyển sang `/checkout` | Pass |
| TC-BK-04 | Chống đặt trùng lịch (`FOR UPDATE`) | Mở 2 tab đặt cùng 1 sân, cùng ngày, cùng khung giờ | Tab thứ 2 bị chặn, không tạo 2 đơn trùng khung giờ | Pass |
| TC-BK-05 | Đặt gói cố định 4 / 8 / 12 tuần | Chọn chế độ gói cố định (4 / 8 / 12 tuần) trên `/booking` | Hệ thống tính đúng tổng số buổi và mức chiết khấu 5%–15% | Pass |
| TC-BK-06 | Áp dụng Voucher & Điểm thưởng | Nhập mã khuyến mãi hợp lệ tại `/checkout` | Giảm đúng số tiền theo điều kiện đơn tối thiểu | Pass |
| TC-BK-07 | Lịch sử đặt sân & Vé QR | Mở `/history` và `/success` sau khi đặt thành công | Hiển thị đúng mã đơn, trạng thái thanh toán và vé QR Check-in | Pass |

---

## 2. Kết quả chạy kiểm thử tự động liên quan

- **Script:** `tests/test_history_ui_and_recurring.js` (Node.js)  
  - **Kết quả thực tế:** `ALL HISTORY UI & RECURRING PACKAGE TESTS PASSED`
- **Kiểm tra tĩnh luồng đặt sân** (qua `tests/security_hardening_test.php`):
  - `booking_creator.php` sinh mã đặt sân từ server-side (`[PASS]`).
  - `booking_creator.php` khóa chống trùng slot bằng `SELECT ... FOR UPDATE` (`[PASS]`).
  - `booking_creator.php` áp dụng giới hạn tần suất theo SĐT và tối đa 2 đơn giữ chỗ chờ thanh toán (`[PASS]`).

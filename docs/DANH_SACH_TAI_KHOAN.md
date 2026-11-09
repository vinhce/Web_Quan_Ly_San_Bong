# 📋 DANH SÁCH TÀI KHOẢN HỆ THỐNG — SÂN BÓNG PRO

Tài liệu tổng hợp tài khoản đăng nhập, phân quyền truy cập và hướng dẫn sử dụng hệ thống **Sân Bóng Pro**.

---

## 1. Đường dẫn Đăng nhập & Quản trị

| Môi trường | Cổng Đăng nhập (Khách & Admin) | Cổng Quản trị Trực tiếp (Admin Portal) |
| :--- | :--- | :--- |
| **Website Online (Production)** | [https://fxzioyr.id.vn/login](https://fxzioyr.id.vn/login) | [https://fxzioyr.id.vn/portal-admin/](https://fxzioyr.id.vn/portal-admin/) |
| **Môi trường Local (Laragon)** | `http://localhost/Quan_Ly_San_Bong/login` | `http://localhost/Quan_Ly_San_Bong/portal-admin/` |

---

## 2. Danh sách Tài khoản & Mật khẩu

### 2.1. Tài khoản Quản trị viên Chính (Admin - Toàn quyền)
> Dùng để vận hành sân, duyệt cọc VietQR, khóa sân bảo trì, xem doanh thu và đặt sân tại quầy.

- **Tên đăng nhập (Username):** `vxyen0801`
- **Mật khẩu (Password):** `********` *(Mật khẩu quản trị viên)*
- **Email quản trị:** `vxyen0801@sanbongpro.vn`
- **Số điện thoại:** `0352313548`
- **Vai trò (Role):** `admin` (Chủ sân · Toàn quyền)
- **Ghi chú:** Sau khi đăng nhập thành công, hệ thống tự động chuyển thẳng vào `/portal-admin/` và mở menu quản trị.

---

### 2.2. Tài khoản Quản trị viên Dự phòng (Admin Backup)
> Tài khoản quản trị viên mặc định dùng trong các tình huống khẩn cấp hoặc bảo trì kỹ thuật.

- **Tên đăng nhập (Username):** `admin`
- **Mật khẩu (Password):** `********` *(Mật khẩu quản trị viên)*
- **Email:** `admin@sanbongpro.vn`
- **Vai trò (Role):** `admin`

---

### 2.3. Tài khoản Khách hàng / Hội viên Mẫu (Test User)
> Dùng để kiểm thử luồng đặt sân, chuyển khoản cọc VietQR SePay, đổi điểm tích lũy lấy nước suối.

- **Tên đăng nhập (Username):** `user` (hoặc nhập SĐT: `0352313548`)
- **Mật khẩu (Password):** `********` *(Mật khẩu mẫu)*
- **Họ và tên:** Trần Minh Hoàng
- **Số điện thoại:** `0352313548`
- **Vai trò (Role):** `user` (Hội viên)
- **Điểm tích lũy:** Có sẵn điểm thưởng để kiểm thử tính năng đổi nước suối (100 điểm = 1 chai Aquafina).

---

## 3. Tạo Tài khoản Hội viên Mới (Dành cho Khách hàng)

Khách hàng mới có thể tự đăng ký tài khoản nhanh chóng theo các bước sau:
1. Truy cập: [https://fxzioyr.id.vn/login?tab=register](https://fxzioyr.id.vn/login?tab=register)
2. Điền các trường thông tin:
   - **Họ và tên:** Họ tên đầy đủ người đặt sân
   - **Số điện thoại:** Dùng làm số liên hệ nhận sân và tên đăng nhập
   - **Mật khẩu:** Tối thiểu 8 ký tự
3. Bấm **Tạo tài khoản hội viên**:
   - Hệ thống tự động cấp mã định danh, đăng nhập tức thì.
   - Nếu khách đang trong quá trình đặt sân (từ nút thanh toán), hệ thống sẽ tự động đưa ngay sang trang thanh toán `/checkout` mà không cần thao tác lại.

---

## 4. Quyền lợi & Cơ chế Điểm thưởng Hội viên

- **Tích điểm tự động:** Mỗi đơn đặt sân thanh toán cọc thành công được cộng **+100 điểm thưởng**.
- **Quy tắc dùng điểm:** Điểm thưởng của trận đấu hiện tại sẽ được ghi nhận và **sử dụng từ trận kế tiếp**.
- **Đổi quà tại trang thanh toán:** Hội viên có thể dùng điểm tích lũy để đổi nước suối Aquafina ướp lạnh trực tiếp khi thanh toán (tỷ lệ: **100 điểm = 1 chai**).

---

## 5. Quy định Vận hành Sân & Xử lý Khách Quá Hạn (No-Show)

- **Thời gian giữ chỗ thanh toán:** 10 phút đếm ngược tại trang thanh toán VietQR SePay. Hết 10 phút không chuyển cọc, hệ thống tự động giải phóng mã giữ chỗ.
- **Quy định nhận sân (Ân hạn 15 phút):** Khách đã cọc phải có mặt trước hoặc trong vòng 15 phút đầu của ca đá.
- **Xử lý No-Show:** Nếu quá 15 phút khách không đến nhận sân và không thông báo, Admin bấm nút **🚨 Quá hạn: Nhả sân** trên bảng điều khiển:
  1. Tịch thu cọc 30% bồi thường chi phí giữ sân.
  2. Trạng thái đơn chuyển thành *Vắng mặt (No-Show)*.
  3. Lập tức **nhả sân về trạng thái Còn trống** để đón khách vãng lai hoặc khách đặt trực tiếp tại quầy, đảm bảo không bao giờ để trống sân.

---

## 6. Lưu ý Bảo mật Quan trọng

1. Mật khẩu trên hệ thống được mã hóa một chiều bằng thuật toán **Argon2id** (`PASSWORD_ARGON2ID`), tuyệt đối không lưu dạng văn bản thuần trong CSDL.
2. Hệ thống áp dụng cơ chế **Rate Limiting**: Nếu nhập sai mật khẩu quá 5 lần liên tiếp trong 15 phút, tài khoản/IP sẽ bị khóa tạm thời trong 15 phút để chống tấn công Brute-Force.
3. Không chia sẻ tài khoản quản trị `vxyen0801` cho người ngoài. Khi rời máy, luôn bấm nút **Thoát** ở góc dưới bên trái menu Admin để hủy hoàn toàn phiên làm việc trên server.

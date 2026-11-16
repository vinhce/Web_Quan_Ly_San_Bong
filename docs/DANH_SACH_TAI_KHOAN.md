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
> Dùng để vận hành sân, duyệt cọc VietQR, khóa sân bảo trì, xem doanh thu, cấu hình hệ thống, quản lý hội viên và kiểm toán toàn bộ thao tác qua Tab 11 Audit Log.

- **Tên đăng nhập (Username):** `vxyen0801`
- **Mật khẩu (Password):** `******** (Liên hệ quản trị viên hoặc xem/đặt qua DB)` *(Mật khẩu quản trị viên)*
- **Email quản trị:** `vxyen0801@sanbongpro.vn`
- **Số điện thoại:** `0352313548`
- **Vai trò (Role):** `admin` (Chủ sân · Toàn quyền 11 phân hệ)
- **Quyền hạn đặc biệt:** Toàn quyền truy cập Tab 10 (Cài đặt hệ thống) và Tab 11 (Nhật ký kiểm toán Audit Log 6 nhóm hành động: Giá sân, Cài đặt, Cọc VietQR, Hủy đơn, Hội viên, Bảo trì sân).
- **Ghi chú:** Sau khi đăng nhập thành công, hệ thống tự động chuyển thẳng vào `/portal-admin/` và mở menu quản trị.

---

### 2.2. Tài khoản Quản trị viên (Admin)
> Dùng để đăng nhập quản trị hệ thống, duyệt cọc, bảo trì sân, xem doanh thu, đặt sân tại quầy và tra cứu nhật ký kiểm toán Tab 11.

- **Tên đăng nhập (Username):** `admin`
- **Mật khẩu (Password):** `******** (Liên hệ quản trị viên hoặc xem/đặt qua DB)` *(Đã băm Argon2id - đổi/cấp lại trong Portal Admin)*
- **Email:** `admin@sanbongpro.vn`
- **Vai trò (Role):** `admin` (Quản trị viên)
- **Quyền hạn:** Toàn quyền truy cập 11 tab vận hành và quản trị, bao gồm Cài đặt và Audit Log.

---

### 2.3. Tài khoản Quản lý Sân (Manager)
> Dùng để điều hành ca đá Gantt Timeline, kiểm duyệt ghép kèo, quản lý bảo trì sân, duyệt cọc lệch tiền và kiểm tra kho nước.

- **Tên đăng nhập (Username):** `quanly`
- **Mật khẩu (Password):** `******** (Liên hệ quản trị viên hoặc xem/đặt qua DB)` *(Đã băm Argon2id - đổi/cấp lại trong Portal Admin)*
- **Email:** `quanly@sanbongpro.vn`
- **Số điện thoại:** `0352000222`
- **Họ và tên:** Nguyễn Hoàng Minh (Quản Lý Sân)
- **Vai trò (Role):** `manager` (Quản lý vận hành)
- **Quyền hạn:** Truy cập các tab điều hành vận hành (Tab 1, 2, 3, 4, 6, 7, 8); **bị chặn truy cập Tab 10 (Cài đặt hệ thống) và Tab 11 (Audit Log)** theo chính sách RBAC bảo vệ dữ liệu nhạy cảm.

---

### 2.4. Tài khoản Nhân viên Trực Sân (Staff)
> Dùng cho nhân viên quầy ca trực để check-in vé QR, bán nước/dịch vụ, chốt ca tiền mặt và đặt sân tại quầy.

- **Tên đăng nhập (Username):** `nhanvien`
- **Mật khẩu (Password):** `******** (Liên hệ quản trị viên hoặc xem/đặt qua DB)` *(Đã băm Argon2id - đổi/cấp lại trong Portal Admin)*
- **Email:** `nhanvien@sanbongpro.vn`
- **Số điện thoại:** `0352000111`
- **Họ và tên:** Nhân Viên Trực Sân Ca 1
- **Vai trò (Role):** `staff` (Nhân viên vận hành trực sân)
- **Quyền hạn:** Quét vé QR check-in, bán nước/dịch vụ, chốt ca bàn giao tiền mặt, đặt sân tại quầy; ẩn toàn bộ KPI doanh thu nhạy cảm, **bị chặn truy cập Tab 10 (Cài đặt hệ thống) và Tab 11 (Audit Log)**.

---

### 2.5. Tài khoản Khách hàng / Hội viên Mẫu (Test User)
> Dùng để kiểm thử luồng đặt sân, chuyển khoản cọc VietQR SePay, đổi điểm tích lũy lấy nước suối.

- **Tên đăng nhập (Username):** `user`
- **Mật khẩu (Password):** `******** (Liên hệ quản trị viên hoặc xem/đặt qua DB)` *(Mật khẩu mẫu)*
- **Họ và tên:** Trần Minh Hoàng
- **Số điện thoại mẫu:** `0000000002` (không dùng để liên hệ)
- **Vai trò (Role):** `user` (Hội viên)
- **Điểm tích lũy:** Có sẵn điểm thưởng để kiểm thử tính năng đổi nước suối (100 điểm = 1 chai Aquafina).

> Quyền truy cập được xác định từ trường `role` trong cơ sở dữ liệu; tên đăng nhập và số điện thoại không tự cấp quyền admin.

---

### 2.6. Ma trận Phân quyền Cổng Quản trị (11 Phân hệ Portal Admin)

| Phân hệ / Tab | Quyền `staff` (Trực sân) | Quyền `manager` (Quản lý) | Quyền `admin` (Chủ sân) | Ghi chú bảo mật |
| :--- | :---: | :---: | :---: | :--- |
| **Tab 1: Tổng quan KPI** | Ẩn doanh thu | ✅ Toàn phần | ✅ Toàn phần | `staff` chỉ thấy ca đá, ẩn biểu đồ & doanh thu |
| **Tab 2: Lịch Timeline Gantt** | ✅ | ✅ | ✅ | Điều hành và xem trạng thái sân trực quan |
| **Tab 3: Đặt sân tại quầy** | ✅ | ✅ | ✅ | Đặt sân khách vãng lai, in phiếu nhận sân |
| **Tab 4: Quản lý sân & Bảo trì** | ✅ | ✅ | ✅ | Bật/tắt bảo trì tức thì |
| **Tab 5: Bảng giá & Voucher** | ❌ (Chặn) | ❌ (Chặn) | ✅ | Cấu hình giá giờ vàng, cuối tuần, mã giảm giá |
| **Tab 6: Khách hàng & CRM** | ✅ (Xem) | ✅ (Xem) | ✅ (Xem & Sửa) | Tìm kiếm SĐT, xem nợ/điểm, chỉ `admin` được sửa hội viên |
| **Tab 7: Ghép kèo giao hữu** | ✅ | ✅ | ✅ | Hỗ trợ bắt đối, duyệt ghép đội |
| **Tab 8: Duyệt cọc VietQR** | ❌ (Chặn) | ✅ | ✅ | Duyệt cọc SePay, hoàn tiền hoặc hủy cọc |
| **Tab 9: Báo cáo thống kê** | ❌ (Ẩn) | ❌ (Ẩn) | ✅ | Báo cáo tài chính, doanh thu chi tiết |
| **Tab 10: Cài đặt hệ thống** | ❌ (Ẩn/403) | ❌ (Ẩn/403) | ✅ | Tỷ lệ cọc, tài khoản ngân hàng thụ hưởng, hotline |
| **Tab 11: Nhật ký Audit Log** | ❌ (Ẩn/403) | ❌ (Ẩn/403) | ✅ | Kiểm toán thao tác 6 nhóm màu, chống sinh log thừa |

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

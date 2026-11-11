# TÀI LIỆU QUẢN TRỊ VIÊN (ADMIN ACCOUNT & PORTAL) — SÂN BÓNG PRO

Tài liệu hướng dẫn truy cập, thông tin tài khoản Quản trị viên (Admin), cơ chế bảo mật phân quyền (RBAC) và cách vận hành 9 phân hệ quản trị trên hệ thống **Sân Bóng Pro**.

---

## 1. Đường dẫn Truy cập Hệ thống

| Môi trường | Trang Đăng nhập | Cổng Quản trị (Admin Portal) |
| :--- | :--- | :--- |
| **Production (Online)** | `https://fxzioyr.id.vn/login` | `https://fxzioyr.id.vn/portal-admin/` |
| **Localhost (Laragon)** | `http://localhost/Quan_Ly_San_Bong/login` | `http://localhost/Quan_Ly_San_Bong/portal-admin/` |

> **Lưu ý về Clean URLs:**
> - Đường dẫn cũ `/admin` hoặc `/html/admin.html` đã được khóa hoàn toàn (`403 Forbidden` trong `.htaccess`) để ẩn đường dẫn quản trị khỏi người dùng thông thường.
> - Nếu truy cập trực tiếp `/portal-admin/` khi chưa đăng nhập, máy chủ sẽ tự động chuyển hướng (`302 Redirect`) về `/login?redirect=portal-admin`.

---

## 2. Thông tin Tài khoản Quản trị viên

### 2.1. Tài khoản Quản trị viên: `admin`
- **Username:** `admin` (hoặc email: `admin@sanbongpro.vn`)
- **Mật khẩu:** `******** (Liên hệ quản trị viên hoặc xem/đặt qua DB)` *(Đã băm Argon2id - đổi/cấp lại trong Portal Admin)*
- **Vai trò:** `admin` (Toàn quyền quản trị hệ thống)

### 2.2. Tài khoản Quản trị viên: `vxyen0801`

| Trường thông tin | Giá trị | Ghi chú bảo mật |
| :--- | :--- | :--- |
| **Tên đăng nhập (SĐT / Username)** | `vxyen0801` | Có thể nhập `vxyen0801` vào ô *Số điện thoại / Email* |
| **Email quản trị** | `vxyen0801@sanbongpro.vn` | Cũng có thể dùng để đăng nhập |
| **Mật khẩu** | `******** (Liên hệ quản trị viên hoặc xem/đặt qua DB)` | Đã băm một chiều bằng thuật toán **Argon2id** (`PASSWORD_ARGON2ID`), không lưu plaintext trong CSDL |
| **Vai trò (Role)** | `admin` | Toàn quyền quản trị hệ thống |
| **Hạng hiển thị** | `Quản trị viên` | Tự động mở nút **⚡ Quản trị Portal** trên thanh điều hướng |

---

### 2.3. Tài khoản Nhân viên trực sân: `nhanvien` (Mẫu)
- **Username:** `nhanvien` (hoặc email: `nhanvien@sanbongpro.vn`)
- **Số điện thoại:** `0352000111`
- **Mật khẩu:** `******** (Liên hệ quản trị viên hoặc xem/đặt qua DB)` *(Đã băm Argon2id - đổi/cấp lại trong Portal Admin)*
- **Vai trò (Role):** `staff` (Nhân viên vận hành trực sân, bị giới hạn phân hệ tài chính & cấu hình)
- **Hạng hiển thị:** `Nhân viên trực sân` (Hiển thị nút **🏟️ Cổng Trực Sân** trên thanh điều hướng)

---

## 2B. Bảng Phân Quyền 3 Cấp (`user` / `staff` / `admin`)

| Chức năng / Phân hệ | `user` (Khách hàng) | `staff` (Nhân viên trực sân) | `admin` (Chủ sân) |
| :--- | :---: | :---: | :---: |
| Đặt sân online, xem vé QR & lịch sử cá nhân | ✅ | ✅ | ✅ |
| Hủy lịch trước hạn đơn của chính mình (chống IDOR) | ✅ | ✅ *(Mọi đơn)* | ✅ *(Mọi đơn)* |
| Truy cập `/portal-admin/` (Cổng vận hành) | ❌ *(Bị chặn)* | ✅ *(5 tab vận hành)* | ✅ *(Toàn bộ 9 tab)* |
| Tab 1: Tổng quan ca đá, check-in, in hóa đơn | ❌ | ✅ *(Ẩn KPI Doanh thu & Biểu đồ)* | ✅ *(Đầy đủ KPI tài chính)* |
| Tab 2: Lịch đặt sân Timeline Gantt & Điều hành ca | ❌ | ✅ | ✅ |
| Tab 3: Đặt sân tại quầy (khách vãng lai) | ❌ | ✅ | ✅ |
| Tab 4: Quản lý sân & Bật/Tắt bảo trì | ❌ | ✅ | ✅ |
| Tab 5: Cấu hình Bảng giá & Mã Voucher | ❌ | ❌ *(403 Forbidden)* | ✅ |
| Tab 6: Danh sách Khách hàng & Hội viên | ❌ | ✅ | ✅ |
| Tab 7: Duyệt / Từ chối cọc VietQR | ❌ | ❌ *(403 Forbidden)* | ✅ |
| Tab 8: Báo cáo thống kê doanh thu | ❌ | ❌ *(Ẩn)* | ✅ |
| Tab 9: Cài đặt VietQR & Quản lý Nhân viên (`staff`) | ❌ | ❌ *(403 Forbidden)* | ✅ |

---

## 3. Quy trình Đăng nhập & Vào Trang Admin

1. Truy cập trang đăng nhập: `https://fxzioyr.id.vn/login` (hoặc truy cập thẳng `https://fxzioyr.id.vn/portal-admin/`).
2. Tại tab **Đăng nhập**:
   - **Số điện thoại / Email:** Nhập `vxyen0801`
   - **Mật khẩu:** Nhập mật khẩu quản trị viên của bạn.
3. Bấm **Đăng nhập tài khoản**:
   - Hệ thống xác thực mật khẩu qua `POST /api/auth.php?action=login` bằng `password_verify()` (Argon2id).
   - Sau khi đăng nhập thành công, hệ thống tự động cấp `PHPSESSID` mới (`session_regenerate_id(true)`) và chuyển thẳng vào `https://fxzioyr.id.vn/portal-admin/`.

---

## 4. Cơ chế Bảo mật Tài khoản Admin

1. **Chặn truy cập trái phép từ phía Server (`portal-admin/index.php` & `api/admin.php`):**
   - Mọi request vào `/portal-admin/` đều đi qua `portal-admin/index.php` để kiểm tra `$_SESSION['user']['role']` (`admin` hoặc `staff`) và kiểm tra trạng thái `status` từ CSDL (tài khoản `locked` bị hủy phiên tức thì).
   - Các thao tác vận hành sân (`checkin`, `noshow_release`, `restore`, `toggle_pitch`, `manage_booking`) kiểm tra `require_staff_or_admin()`; các thao tác nhạy cảm (`update_payment`, `vouchers` POST, `staff_users`) bắt buộc `require_admin()` tại `api/admin.php`.
2. **Chống dò mật khẩu (Rate Limiting):**
   - Nhập sai mật khẩu quá **5 lần trong 15 phút** (theo IP hoặc tài khoản) sẽ bị khóa tạm thời (`HTTP 429 Too Many Requests`).
3. **Quản lý Phiên (Session Security):**
   - Thời gian sống của phiên tối đa **2 giờ** (`7200 giây`).
   - Cookie phiên bật đầy đủ 3 cờ bảo mật: `HttpOnly`, `Secure`, `SameSite=Lax`.
   - Khi bấm nút **Thoát** ở góc dưới bên trái Sidebar Admin, hệ thống gọi `POST /api/auth.php?action=logout` để hủy hoàn toàn session trên server.

---

## 5. Các Phân hệ trong Cổng Quản trị (`/portal-admin/`)

1. **Tổng quan KPI:** Doanh thu ngày, tổng lượt đặt, tỷ lệ lấp đầy sân, biểu đồ doanh thu 7 ngày và danh sách ca đá sắp diễn ra.
2. **Lịch đặt sân Timeline:** Biểu đồ Gantt theo dõi trạng thái trực quan của toàn bộ các sân từ `05:30` đến `23:00`.
3. **Đặt sân tại quầy:** Tạo nhanh đơn khóa sân cho khách vãng lai hoặc khách gọi điện đặt trực tiếp.
4. **Quản lý sân & Bảo trì:** Bật/tắt chế độ **Bảo trì** theo thời gian thực cho từng sân (khóa ngay lập tức trên trang đặt sân của khách).
5. **Bảng giá cấu hình:** Điều chỉnh giá giờ thường, giờ cao điểm (`17:30 - 21:00`) và cuối tuần cho Sân 5, Sân 7, Sân 11.
6. **Khách & Hội viên:** Tra cứu danh sách hội viên, hạng thành viên (Đồng / Bạc / Vàng), điểm tích lũy và tổng chi tiêu.
7. **Duyệt cọc VietQR:** Theo dõi các biên lai chuyển khoản SePay VietQR (`ASFF` = Sân 5, `ASFS` = Sân 7, `ASFE` = Sân 11) và duyệt cọc / hủy đơn.
8. **Báo cáo doanh thu:** Thống kê doanh thu tháng, tỷ lệ hủy sân và doanh thu dịch vụ đi kèm (nước uống, áo bib, bóng, trọng tài).
9. **Cài đặt hệ thống:** Cấu hình tỷ lệ cọc bắt buộc (`30%`), thông tin tài khoản ngân hàng thụ hưởng VietQR và hotline hỗ trợ.

---

## 6. Hướng dẫn Đổi mật khẩu Admin (Khi cần)

Để đổi mật khẩu mới cho tài khoản `vxyen0801`, chạy lệnh PHP CLI sau tại thư mục gốc dự án để sinh mã băm Argon2id mới và cập nhật vào CSDL:

```powershell
C:\laragon\bin\php\php-8.3.28-Win32-vs16-x64\php.exe -r "require 'config/database.php'; \$pdo = getDBConnection(); \$hash = password_hash('MAT_KHAU_MOI_CUA_BAN', PASSWORD_ARGON2ID); \$stmt = \$pdo->prepare('UPDATE users SET password_hash = ? WHERE phone = ?'); \$stmt->execute([\$hash, 'vxyen0801']); echo 'Da cap nhat mat khau Admin thanh cong!';"
```

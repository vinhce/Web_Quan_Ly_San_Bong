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

| Trường thông tin | Giá trị | Ghi chú bảo mật |
| :--- | :--- | :--- |
| **Tên đăng nhập (SĐT / Username)** | `vxyen0801` | Có thể nhập `vxyen0801` vào ô *Số điện thoại / Email* |
| **Email quản trị** | `vxyen0801@sanbongpro.vn` | Cũng có thể dùng để đăng nhập |
| **Mật khẩu** | `********` *(Mật khẩu riêng quản trị)* | Đã băm một chiều bằng thuật toán **Argon2id** (`PASSWORD_ARGON2ID`), không lưu plaintext trong CSDL |
| **Vai trò (Role)** | `admin` | Toàn quyền quản trị hệ thống |
| **Hạng hiển thị** | `Quản trị viên` | Tự động mở nút **⚡ Quản trị Portal** trên thanh điều hướng |

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
   - Mọi request vào `/portal-admin/` đều đi qua `portal-admin/index.php` để kiểm tra `$_SESSION['user']['role'] === 'admin'` trước khi trả HTML.
   - Mọi thao tác dữ liệu (duyệt cọc, hủy đơn, bật/tắt bảo trì sân, đặt sân tại quầy) đều kiểm tra `require_admin()` + `verify_csrf_token()` tại `api/admin.php`.
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

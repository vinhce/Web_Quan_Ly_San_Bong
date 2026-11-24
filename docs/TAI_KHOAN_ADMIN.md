# HƯỚNG DẪN QUẢN TRỊ & BẢO MẬT PORTAL ADMIN

> Tài khoản mẫu và bảng ma trận phân quyền chi tiết cho từng tab xem tại [DANH_SACH_TAI_KHOAN.md](./DANH_SACH_TAI_KHOAN.md).

## 1. Cổng truy cập & Bảo vệ định tuyến
- **Đường dẫn chính thức:** `https://fxzioyr.id.vn/portal-admin/` (đăng nhập tại `/login`).
- **Quy tắc chuyển hướng & chặn truy cập (`.htaccess` & `portal-admin/index.php`):**
  - Đường dẫn cũ `/admin` hoặc `/html/admin.html` tự chuyển hướng `301` về `/portal-admin/`.
  - Thư mục `portal-admin/partials/` bị chặn truy cập HTTP trực tiếp (`403 Forbidden`).
  - Truy cập khi chưa đăng nhập hoặc sai vai trò sẽ chuyển `302` về `/login?redirect=portal-admin`.
  - Tài khoản có `must_change_password = 1` bắt buộc đổi mật khẩu tại `/login?force_change_password=1`.

## 2. Tóm tắt phạm vi 3 vai trò (`RBAC`)
- **`admin` (Chủ sân):** Toàn quyền cả **11 tab** (gồm Tab 5 Bảng giá/Voucher, Tab 10 Cài đặt/Nhân sự/Backup và Tab 11 Nhật ký Admin).
- **`manager` (Quản lý sân):** Điều hành ca đá, duyệt ghép kèo, kho dịch vụ, lịch bảo trì, sửa CRM/chỉnh điểm (Tab 6), duyệt cọc VietQR (Tab 7), xác nhận chốt ca (Tab 8) và xem báo cáo doanh thu (Tab 9). Bị chặn Tab 5, 10, 11.
- **`staff` (Nhân viên trực sân):** Thực hiện check-in QR, điều hành Timeline, đặt sân/bán nước tại quầy, xem CRM và mở/chốt ca (Tab 1–4, 6, 8); ẩn KPI tiền và chặn Tab 5, 7, 9, 10, 11.

## 3. Cơ chế Đăng nhập, Phiên 24 giờ & CSRF
1. **Xác thực mật khẩu:** Kiểm tra `password_verify()` với **Argon2id**, giới hạn **5 lần sai / 15 phút** (`HTTP 429`) và khóa tạm trên DB khi vượt ngưỡng.
2. **Bảo vệ phiên & Cache:** Tái sinh Session ID khi đăng nhập, thời hạn tối đa **24 giờ (`86400 giây`)**, cookie `HttpOnly` / `Secure` / `SameSite=Lax`, gắn `Cache-Control: private, no-store` cho trang động và tách biệt xác thực khách qua `currentCustomer()`.
3. **CSRF & Đăng xuất:** Mọi thao tác ghi (`POST/PUT/DELETE`) phải gửi `X-CSRF-Token`; kết thúc ca cần bấm **Thoát** ở Sidebar (`POST /api/auth.php?action=logout`) để hủy phiên server.

## 4. Đổi & Cấp lại mật khẩu an toàn
- **Tự đổi mật khẩu:** Qua `POST /api/auth.php?action=change_password` (yêu cầu mật khẩu hiện tại, mật khẩu mới tối thiểu **8 ký tự**, tự tái sinh Session ID).
- **Chủ sân cấp lại mật khẩu nhân sự (`staff`/`manager`):** Thực hiện trên **Tab 10 — Cài đặt hệ thống** (`POST /api/admin.php?action=staff_users`, `sub_action=reset_password`, tối thiểu 6 ký tự, ghi Audit Log `STAFF_RESET_PASSWORD`).
- **Nguyên tắc an toàn:** Không lưu mật khẩu plaintext, đường dẫn máy cá nhân hoặc lệnh SQL reset trực tiếp trong tài liệu. Khôi phục khẩn cấp quyền `admin` chỉ thực hiện trên server bằng `password_hash(..., PASSWORD_ARGON2ID)` và xoay vòng thông tin ngay sau đó.

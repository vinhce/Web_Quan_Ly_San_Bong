# TÀI LIỆU QUẢN TRỊ VIÊN (PORTAL ADMIN & BẢO MẬT VẬN HÀNH) — SÂN BÓNG PRO

Tài liệu hướng dẫn truy cập, cơ chế bảo mật phân quyền (RBAC) phía server, quy trình đăng nhập/đổi mật khẩu và vận hành **11 phân hệ chuẩn** trên cổng `/portal-admin/` của **Sân Bóng Pro**.

> *Danh sách tài khoản mẫu và bảng ma trận phân quyền đầy đủ được tổng hợp tại [DANH_SACH_TAI_KHOAN.md](./DANH_SACH_TAI_KHOAN.md) (tránh trùng lặp, không lưu SĐT/email cá nhân).*

---

## 1. Cổng Truy cập Quản trị & Điều hướng Clean URLs

- **Production Live:** `https://fxzioyr.id.vn/portal-admin/` (trang đăng nhập: `https://fxzioyr.id.vn/login`)
- **Cơ chế định tuyến & bảo vệ (`.htaccess` & `portal-admin/index.php`):**
  - Đường dẫn cũ `/admin` hoặc `/html/admin.html` tự động chuyển hướng `301` về `/portal-admin/`.
  - Thư mục `portal-admin/partials/` bị chặn truy cập HTTP trực tiếp (`403 Forbidden`).
  - Nếu truy cập `/portal-admin/` khi chưa đăng nhập hoặc thiếu quyền vận hành, `portal-admin/index.php` chuyển hướng `302 Redirect` về `/login?redirect=portal-admin`.
  - Nếu tài khoản có cờ `must_change_password = 1`, hệ thống chuyển hướng bắt buộc đổi mật khẩu tại `/login?force_change_password=1`.

---

## 2. Tài khoản Quản trị & Phạm vi Vai trò (RBAC)

Xem danh mục tài khoản và ma trận phân quyền chi tiết cho từng tab tại [DANH_SACH_TAI_KHOAN.md](./DANH_SACH_TAI_KHOAN.md). Tóm tắt phạm vi:
- **`admin` (Chủ sân):** Toàn quyền truy cập cả 11 tab, bao gồm cấu hình bảng giá/voucher (Tab 5), cài đặt hệ thống/nhân sự/backup (Tab 10) và Nhật ký Admin (Tab 11).
- **`manager` (Quản lý sân):** Vận hành sân, kiểm duyệt ghép kèo, quản lý danh mục dịch vụ & lịch bảo trì, xem/cập nhật CRM & điều chỉnh điểm (Tab 6), duyệt cọc VietQR (Tab 7), xác nhận chốt ca (Tab 8) và xem báo cáo doanh thu (Tab 9). Bị chặn Tab 5, Tab 10, Tab 11.
- **`staff` (Nhân viên trực sân):** Vận hành ca tại quầy (Tab 1–4, xem Tab 6, mở/chốt ca Tab 8); bị ẩn KPI doanh thu nhạy cảm và bị chặn Tab 5, 7, 9, 10, 11.

---

## 3. Quy trình Đăng nhập & Cơ chế Bảo mật Server-Side

1. **Đăng nhập:** Truy cập `https://fxzioyr.id.vn/login` (hoặc `/portal-admin/`), nhập tài khoản quản trị (`admin` / `quanly` / `nhanvien`) và mật khẩu.
2. **Xác thực & Chống dò mật khẩu (`api/auth.php`):**
   - Mật khẩu được kiểm tra bằng `password_verify()` với thuật toán **Argon2id** (`PASSWORD_ARGON2ID`).
   - Giới hạn **5 lần đăng nhập sai / 15 phút** theo IP và tài khoản (`HTTP 429 Too Many Requests`), kết hợp khóa tạm trên DB khi sai liên tiếp.
3. **Bảo vệ Phiên & CSRF (`portal-admin/index.php` & `api/security_helper.php`):**
   - Tái sinh Session ID khi đăng nhập (`session_regenerate_id(true)`), thời gian sống tối đa **2 giờ** (`7200 giây`).
   - Cookie phiên bật `HttpOnly`, `Secure` (trên HTTPS), `SameSite=Lax`.
   - Mọi request ghi dữ liệu (`POST/PUT/DELETE`) bắt buộc gửi kèm `X-CSRF-Token`.
   - Khi kết thúc ca, bấm nút **Thoát** ở góc dưới bên trái Sidebar để gọi `POST /api/auth.php?action=logout` và hủy hoàn toàn phiên trên server.

---

## 4. Hướng dẫn Vận hành 11 Phân hệ (`/portal-admin/`)

Thứ tự chuẩn theo `portal-admin/partials/sidebar.php`:

1. **Tab 1 — Tổng quan & Đang chơi (`overview`):** Theo dõi KPI doanh thu thực trong ngày & biểu đồ 7 ngày (`admin`), tỷ lệ lấp đầy, lọc nhanh trạng thái ca đá và mở Modal Quét QR Check-in (`jsQR` camera/tải ảnh/nhập mã).
2. **Tab 2 — Lịch đặt sân Timeline (`timeline`):** Biểu đồ Gantt `05:30–23:00` cho 26 sân; bấm vào ca đá để mở Popup điều hành (đá thêm giờ, chuyển sân, thêm nước/dịch vụ, hủy lịch hoặc đánh dấu **"Khách chưa đến"** khi khách không đến / trễ giờ quá hạn >15 phút để nhả sân); quản lý Danh sách chờ (Waitlist), Lịch cố định hàng tuần (Recurring) và Kiểm duyệt tin ghép kèo (`manager`, `admin`).
3. **Tab 3 — Đặt sân tại quầy (`quick-booking`):** Tạo đơn nhanh cho khách vãng lai/gọi điện (hỗ trợ gói tháng 1–3 tháng, cảnh báo lịch sử khách không đến / trễ giờ quá hạn) kết hợp Kho nước & Bán lẻ dịch vụ POS tự động trừ tồn kho.
4. **Tab 4 — Quản lý sân bóng (`pitches`):** Bật/tắt trạng thái Hoạt động/Bảo trì/Ẩn cho 26 sân, thêm/sửa sân (`admin`), tạo Lịch bảo trì định kỳ chặn slot trùng (`manager`, `admin`) và theo dõi/phản hồi đánh giá sau trận.
5. **Tab 5 — Bảng giá & Voucher (`pricing` · `admin`):** Cấu hình giá thường/cao điểm/cuối tuần, chính sách khuyến mãi gói tháng, quản lý mã Voucher và quy tắc giá giờ vàng/thấp điểm (có cơ chế chống cập nhật thừa).
6. **Tab 6 — Khách & Hội viên (`customers`):** Bảng CRM 8 cột chuẩn hóa gồm **Đặt gần nhất** và **Trận hoàn thành** (không có công nợ đọng); tìm SĐT chuẩn hóa (`+84`, `0` đầu, vài số cuối); 3 nút lọc (`Tất cả khách`, `Hội viên VIP`, `Khách quen`). `manager`/`admin` mở Modal hồ sơ CRM để sửa thông tin, khóa đặt sân (Blacklist kèm lý do) và điều chỉnh điểm qua `points_log` (`FOR UPDATE` + lý do bắt buộc).
7. **Tab 7 — Duyệt cọc VietQR (`payments` · `manager`, `admin`):** Duyệt biên lai VietQR (`ASFF` Sân 5, `ASFS` Sân 7, `ASFE` Sân 11) và đối soát giao dịch Webhook SePay (`bank_transactions`) cho các ca chuyển thiếu/thừa hoặc chưa khớp mã đơn.
8. **Tab 8 — Chốt ca / Giao ca (`shifts`):** Mở ca với tiền mặt đầu ca, tự động cộng dồn doanh thu tiền mặt & chuyển khoản VietQR trong ca, nhập số tiền mặt thực đếm, ghi lý do nếu có chênh lệch và khóa sổ bàn giao (`manager`/`admin` xác nhận).
9. **Tab 9 — Báo cáo doanh thu (`reports` · `manager`, `admin`):** Lọc khoảng ngày, đối chiếu 2 công thức dòng tiền độc lập, biểu đồ cột/tỷ trọng Inline SVG thuần, bảng kê chi tiết từng ca, doanh thu theo sân, Sổ chi phí vận hành & lãi ròng, xuất Excel CSV UTF-8 BOM.
10. **Tab 10 — Cài đặt hệ thống (`settings` · `admin`):** Cấu hình tỷ lệ cọc (`30%`), tài khoản ngân hàng VietQR, thời gian giữ chỗ (`hold_minutes`), mốc hoàn/phạt cọc, Waitlist/Ghép kèo, nhắc lịch Zalo/SMS & Telegram Bot, quản lý tài khoản nhân sự (`staff`/`manager`), nhật ký thông báo và sao lưu/khôi phục CSDL (`.sql.gz`).
11. **Tab 11 — Nhật ký Admin (`logs` · `admin`):** Nhật ký bất biến (append-only) phân nhóm 6 màu badge (`🟢 Tạo/Duyệt`, `🔴 Xóa/Hủy/Chi tiền`, `🔵 Cập nhật`, `🟠 Cảnh báo`, `🟣 Tiền quầy`, `⚪ Tự động`), diffing Cũ → Mới, lọc theo nhân sự/nhóm hành động/ngày/từ khóa, che dữ liệu nhạy cảm và tooltip IP ở cột thời gian.

---

## 5. Quy trình Đổi & Cấp lại Mật khẩu An toàn

- **Tài khoản đang đăng nhập tự đổi mật khẩu:** Thực hiện qua luồng xác thực `POST /api/auth.php?action=change_password` (yêu cầu nhập mật khẩu hiện tại, mật khẩu mới tối thiểu **8 ký tự**, tự động băm Argon2id và tái sinh Session ID).
- **Chủ sân cấp lại mật khẩu cho nhân sự (`staff` / `manager`):** Thực hiện trực tiếp trên giao diện **Tab 10 — Cài đặt hệ thống** (`POST /api/admin.php?action=staff_users`, `sub_action=reset_password`, tối thiểu 6 ký tự, tự động ghi Audit Log `STAFF_RESET_PASSWORD`).
- **Nguyên tắc vận hành bảo mật:** Không lưu hoặc chia sẻ mật khẩu dạng plaintext, đường dẫn cục bộ máy cá nhân hay câu lệnh SQL đặt lại mật khẩu trực tiếp trong tài liệu. Trường hợp khẩn cấp cần khôi phục quyền `admin`, quản trị hạ tầng thao tác trực tiếp trên máy chủ với script tham số hóa `password_hash(..., PASSWORD_ARGON2ID)` và xoay vòng thông tin đăng nhập ngay sau đó.

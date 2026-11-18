# 📋 DANH SÁCH TÀI KHOẢN & PHÂN QUYỀN HỆ THỐNG — SÂN BÓNG PRO

Tài liệu tổng hợp tài khoản khởi tạo theo vai trò, ma trận phân quyền 11 phân hệ Portal Admin và quy định vận hành cơ bản của **Sân Bóng Pro**.

> *Xem chi tiết quy trình đăng nhập, bảo mật server-side và hướng dẫn vận hành 11 tab quản trị tại [TAI_KHOAN_ADMIN.md](./TAI_KHOAN_ADMIN.md).*

---

## 1. Đường dẫn Truy cập Hệ thống

| Môi trường | Cổng Đăng nhập (Khách & Nhân sự) | Cổng Quản trị (`/portal-admin/`) |
| :--- | :--- | :--- |
| **Production Live** | [https://fxzioyr.id.vn/login](https://fxzioyr.id.vn/login) | [https://fxzioyr.id.vn/portal-admin/](https://fxzioyr.id.vn/portal-admin/) |
| **Local Development** | `http://localhost/Quan_Ly_San_Bong/login` | `http://localhost/Quan_Ly_San_Bong/portal-admin/` |

---

## 2. Danh mục Tài khoản Mẫu theo Vai trò (`users.role`)

*Thông tin liên hệ cá nhân (SĐT/email) được che mờ để bảo vệ dữ liệu; mật khẩu đều băm một chiều bằng **Argon2id** (`PASSWORD_ARGON2ID`) và quản lý trực tiếp trong CSDL hoặc Portal Admin.*

| Username | Vai trò (`role`) | Đối tượng / Mục đích | SĐT (Đã che) | Ghi chú truy cập |
| :--- | :--- | :--- | :--- | :--- |
| `vxyen0801` | `admin` (Chủ sân) | Quản trị viên chính — toàn quyền 11 tab | `0352xxx548` | Tự động chuyển vào `/portal-admin/` khi đăng nhập |
| `admin` | `admin` (Chủ sân) | Tài khoản quản trị hệ thống dự phòng | `0987xxx321` | Toàn quyền 11 phân hệ quản trị |
| `quanly` | `manager` (Quản lý sân) | Điều hành Timeline, kho, duyệt cọc, chốt ca, báo cáo | `0352xxx222` | Bị chặn Tab 5, Tab 10, Tab 11 |
| `nhanvien` | `staff` (Nhân viên trực) | Check-in QR, đặt tại quầy, bán nước, mở/chốt ca | `0352xxx111` | Bị chặn Tab 5, Tab 7, Tab 9, Tab 10, Tab 11 |
| `user` | `user` (Hội viên mẫu) | Kiểm thử đặt sân, VietQR, đổi điểm lấy nước | `0000xxx002` | Chỉ dùng cổng khách hàng (`/` và `/history`) |
| `khachle` | `walkin` (Hệ thống) | Bản ghi nội bộ gắn đơn khách lẻ tại quầy | `0000000000` | Tài khoản hệ thống, không đăng nhập |

> Quyền truy cập được xác định hoàn toàn từ trường `role` trong cơ sở dữ liệu; tên đăng nhập và số điện thoại không tự cấp quyền quản trị.

---

## 3. Ma trận Phân quyền Cổng Quản trị (11 Tab Chuẩn — `portal-admin/partials/sidebar.php`)

| Phân hệ / Tab | Mã Tab | `staff` (Trực sân) | `manager` (Quản lý) | `admin` (Chủ sân) | Phạm vi chức năng chính |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Tab 1: Tổng quan & Đang chơi** | `overview` | ✅ *(Ẩn KPI tiền & biểu đồ)* | ✅ *(Ẩn KPI tiền & biểu đồ)* | ✅ *(Toàn phần)* | Theo dõi ca đá hôm nay, tỷ lệ lấp đầy, quét QR Check-in (`admin` xem đủ KPI doanh thu) |
| **Tab 2: Lịch đặt sân Timeline** | `timeline` | ✅ *(Ẩn duyệt kèo)* | ✅ | ✅ | Gantt 05:30–23:00, Popup điều hành ca, Waitlist, Lịch lặp; `manager`/`admin` duyệt ghép kèo |
| **Tab 3: Đặt sân tại quầy** | `quick-booking` | ✅ *(Bán quầy)* | ✅ | ✅ | Đặt sân tại quầy (POS), bán nước trừ kho; `manager`/`admin` thêm & sửa dịch vụ |
| **Tab 4: Quản lý sân bóng** | `pitches` | ✅ *(Xem & bảo trì nhanh)* | ✅ *(+ Lịch bảo trì, đánh giá)* | ✅ *(Toàn quyền)* | Quản lý 26 sân; `manager`/`admin` tạo lịch bảo trì; chỉ `admin` thêm/sửa sân mới |
| **Tab 5: Bảng giá & Voucher** | `pricing` | ❌ *(Ẩn/403)* | ❌ *(Ẩn/403)* | ✅ | Giá thường/cao điểm/cuối tuần, chính sách gói tháng, Voucher, quy tắc giờ vàng |
| **Tab 6: Khách & Hội viên** | `customers` | ✅ *(Chỉ xem)* | ✅ *(Xem & Sửa CRM)* | ✅ *(Xem & Sửa CRM)* | Tìm SĐT chuẩn hóa, bảng 8 cột (Đặt gần nhất, Trận hoàn thành), chỉnh điểm qua `points_log` |
| **Tab 7: Duyệt cọc VietQR** | `payments` | ❌ *(Ẩn/403)* | ✅ | ✅ | Duyệt biên lai VietQR & đối soát giao dịch webhook SePay (`bank_transactions`) |
| **Tab 8: Chốt ca / Giao ca** | `shifts` | ✅ *(Mở/chốt ca)* | ✅ *(+ Xác nhận ca)* | ✅ *(Toàn quyền)* | Mở ca vốn lẻ, kiểm đếm tiền mặt, tính chênh lệch và xác nhận bàn giao ca |
| **Tab 9: Báo cáo doanh thu** | `reports` | ❌ *(Ẩn/403)* | ✅ | ✅ | Đối chiếu 2 công thức tài chính, biểu đồ SVG, sổ chi phí, lãi ròng & xuất CSV |
| **Tab 10: Cài đặt hệ thống** | `settings` | ❌ *(Ẩn/403)* | ❌ *(Ẩn/403)* | ✅ | Tỷ lệ cọc, ngân hàng VietQR, chính sách hoàn/giữ chỗ, Telegram/Zalo, nhân sự, backup DB |
| **Tab 11: Nhật ký Admin** | `logs` | ❌ *(Ẩn/403)* | ❌ *(Ẩn/403)* | ✅ | Kiểm toán bất biến (append-only), diffing Cũ → Mới, 6 nhóm màu badge, che dữ liệu nhạy cảm |

---

## 4. Tạo Tài khoản Hội viên Mới & Điểm thưởng

1. **Đăng ký hội viên:** Truy cập [https://fxzioyr.id.vn/login?tab=register](https://fxzioyr.id.vn/login?tab=register), điền đầy đủ Tên đăng nhập, Họ tên, SĐT di động 10 số (`03/05/07/08/09`), Email, Mật khẩu (**tối thiểu 8 ký tự**) và tích xác nhận Chính sách bảo mật (Nghị định 13/2023).
2. **Tích điểm & Đổi quà (`points_log`):** Điểm thưởng được ghi nhận minh bạch trong transaction qua `points_log` (theo cấu hình `loyalty_points_per_10k` và `loyalty_bottle_cost_points`), cho phép hội viên đổi điểm lấy nước suối Aquafina khi đặt sân hoặc được Quản lý/Admin điều chỉnh kèm lý do bắt buộc.

---

## 5. Quy định Giữ chỗ & Xử lý Khách Không Đến / Trễ Giờ Quá Hạn

- **Thời gian giữ chỗ thanh toán cọc:** Mặc định **15 phút** (theo cấu hình `hold_minutes`, có thể chỉnh 5–120 phút ở Tab 10). Quá hạn chưa chuyển cọc, tác vụ `cron/auto_release_expired.php` (hoặc cơ chế tự động kiểm tra) sẽ hủy đơn giữ chỗ và giải phóng slot.
- **Quy chế ân hạn nhận sân (15 phút):** Khách đã cọc phải có mặt trong vòng 15 phút đầu ca đá.
- **Xử lý khi khách không đến / trễ giờ quá hạn:** Nếu quá 15 phút khách không đến nhận sân, nhân sự thao tác **Quá giờ chưa đến: Nhả sân** trên Portal Admin:
  1. Tịch thu cọc 30% bồi thường giữ sân (`Tịch thu cọc 30%`).
  2. Trạng thái đơn chuyển thành **`Khách chưa đến`** (theo quy ước thuật ngữ tại [RULES.md](../RULES.md)).
  3. Lập tức nhả slot trống để đón khách vãng lai/đặt mới và kích hoạt thông báo hàng chờ (Waitlist).

---

## 6. Lưu ý Bảo mật Chung

1. Mật khẩu được băm bằng **Argon2id** (`PASSWORD_ARGON2ID`), không lưu dạng văn bản thuần.
2. Đăng nhập bị giới hạn tần suất (**Rate Limit: tối đa 5 lần / 15 phút**, vượt ngưỡng trả `HTTP 429` và khóa tạm tài khoản tăng dần trên DB).
3. Luôn bấm nút **Thoát** ở góc dưới bên trái menu để hủy phiên làm việc trên server khi rời máy.

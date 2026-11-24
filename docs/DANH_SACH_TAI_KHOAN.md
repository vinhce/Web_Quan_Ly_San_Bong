# DANH SÁCH TÀI KHOẢN & PHÂN QUYỀN — SÂN BÓNG PRO

> Chi tiết bảo mật đăng nhập và vận hành quản trị xem tại [TAI_KHOAN_ADMIN.md](./TAI_KHOAN_ADMIN.md).

## 1. Đường dẫn truy cập
| Môi trường | Đăng nhập (Khách & Nhân sự) | Cổng Quản trị |
| :--- | :--- | :--- |
| **Production Live** | [https://fxzioyr.id.vn/login](https://fxzioyr.id.vn/login) | [https://fxzioyr.id.vn/portal-admin/](https://fxzioyr.id.vn/portal-admin/) |
| **Local Development** | `http://localhost/Quan_Ly_San_Bong/login` | `http://localhost/Quan_Ly_San_Bong/portal-admin/` |

## 2. Tài khoản mẫu theo vai trò (`users.role`)
Mật khẩu được băm bằng **Argon2id** (`PASSWORD_ARGON2ID`) và quản lý trong CSDL hoặc Tab 10 (SĐT đã che để bảo vệ dữ liệu):

| Username | Vai trò (`role`) | Đối tượng | SĐT (Che) | Phạm vi truy cập |
| :--- | :--- | :--- | :--- | :--- |
| `vxyen0801` | `admin` | Chủ sân chính | `0352xxx548` | Toàn quyền 11 tab quản trị |
| `admin` | `admin` | Quản trị dự phòng | `0987xxx321` | Toàn quyền 11 tab quản trị |
| `quanly` | `manager` | Quản lý sân | `0352xxx222` | Truy cập Tab 1–4, 6–9 (chặn Tab 5, 10, 11) |
| `nhanvien` | `staff` | Nhân viên trực sân | `0352xxx111` | Truy cập Tab 1–4, xem Tab 6, chốt ca Tab 8 (ẩn doanh thu) |
| `user` | `user` | Hội viên mẫu | `0000xxx002` | Chỉ dùng cổng khách hàng (`/` và `/history`) |
| `khachle` | `walkin` | Khách lẻ tại quầy | `0000000000` | Tài khoản hệ thống gắn đơn quầy, không đăng nhập |

## 3. Ma trận phân quyền 11 Tab (`/portal-admin`)
| Tab | `staff` | `manager` | `admin` | Phạm vi chính |
| :--- | :---: | :---: | :---: | :--- |
| **1. Tổng quan & Đang chơi** (`overview`) | ✅ *(Ẩn tiền)* | ✅ *(Ẩn tiền)* | ✅ | Ca trong ngày, quét QR; chỉ `admin` xem KPI doanh thu |
| **2. Lịch đặt sân Timeline** (`timeline`) | ✅ *(Ẩn duyệt kèo)* | ✅ | ✅ | Gantt, điều hành ca, Waitlist, lịch lặp, duyệt ghép kèo |
| **3. Đặt sân tại quầy** (`quick-booking`) | ✅ *(Bán quầy)* | ✅ | ✅ | Đặt sân POS & bán nước (`manager`/`admin` sửa danh mục) |
| **4. Quản lý sân bóng** (`pitches`) | ✅ *(Bảo trì nhanh)* | ✅ *(+ Bảo trì, đánh giá)* | ✅ | Quản lý 26 sân; chỉ `admin` thêm/sửa thông số sân |
| **5. Bảng giá & Voucher** (`pricing`) | ❌ | ❌ | ✅ | Cấu hình bảng giá, gói tuần/tháng, giờ vàng & voucher |
| **6. Khách & Hội viên** (`customers`) | ✅ *(Chỉ xem)* | ✅ | ✅ | CRM 8 cột, 2 nút lọc, sửa hồ sơ & chỉnh điểm `points_log` |
| **7. Duyệt cọc VietQR** (`payments`) | ❌ | ✅ | ✅ | Duyệt biên lai & đối soát giao dịch SePay Webhook |
| **8. Chốt ca / Giao ca** (`shifts`) | ✅ *(Mở/chốt ca)* | ✅ *(+ Xác nhận)* | ✅ | Kiểm đếm tiền mặt, giải trình & xác minh chênh lệch |
| **9. Báo cáo doanh thu** (`reports`) | ❌ | ✅ | ✅ | 4 sub-tab phân tích, đối soát, Sổ chi chung & xuất CSV BOM |
| **10. Cài đặt hệ thống** (`settings`) | ❌ | ❌ | ✅ | Cọc, ngân hàng, thông báo Telegram/Zalo, nhân sự & backup DB |
| **11. Nhật ký Admin** (`logs`) | ❌ | ❌ | ✅ | Grid 5 cột (110 mã / 6 nhóm `TD/XHC/CN/CB/TQ/AUTO`), hậu kiểm & Inverted Index |

## 4. Quy định Hội viên, Giữ chỗ & Bảo mật chung
- **Đăng ký hội viên:** Nhập SĐT 10 số (`03/05/07/08/09`), mật khẩu tối thiểu **8 ký tự** và đồng thuận bảo mật theo Nghị định 13/2023. Tích/đổi điểm ghi qua `points_log`.
- **Giữ chỗ & `Khách chưa đến`:** Đơn chưa cọc giữ tối đa **15 phút** (`hold_minutes`) trước khi tự nhả; khách đã cọc trễ quá 15 phút đầu ca có thể bị nhả sân với trạng thái **`Khách chưa đến`** (tịch thu cọc 30% và báo Waitlist).
- **Lưu ý bảo mật:** Mật khẩu băm **Argon2id**; giới hạn đăng nhập **5 lần / 15 phút** (`HTTP 429`); luôn bấm **Thoát** ở Sidebar để hủy phiên server khi rời máy.

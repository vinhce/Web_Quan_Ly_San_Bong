# TỔNG QUAN DỰ ÁN SÂN BÓNG PRO

> Trang điều hướng trung tâm cho dự án **Sân Bóng Pro** (`https://fxzioyr.id.vn` — phiên bản `v20261124_v142`).
> - Nghiệp vụ & phạm vi: [PRD.md](../PRD.md) · Kiến trúc & CSDL: [ARCHITECTURE.md](../ARCHITECTURE.md)
> - Giao diện UI/UX: [DESIGN.md](../DESIGN.md) · Quy tắc cứng: [RULES.md](../RULES.md)
> - Tài khoản & Vận hành: [DANH_SACH_TAI_KHOAN.md](./DANH_SACH_TAI_KHOAN.md) · [TAI_KHOAN_ADMIN.md](./TAI_KHOAN_ADMIN.md)

## 1. Mô hình vận hành & Dòng tiền
- **Cơ sở:** Tổ hợp Sân Bóng Pro Mỹ Đình (Số 18 Lê Đức Thọ, Q. Nam Từ Liêm, Hà Nội) gồm **26 sân bóng** (9 sân 5, 10 sân 7, 7 sân 11) hoạt động **7 khung giờ liên tiếp 2 tiếng/ca** (`05:30–22:30`, nghỉ trưa `11:30–14:30`).
- **Quy trình 2 bước (Không có công nợ đọng):**
  1. Khách chuyển khoản **cọc 30%** qua **VietQR SePay** (`ASFF` Sân 5, `ASFS` Sân 7, `ASFE` Sân 11), đối soát webhook tự động trong <3 giây.
  2. Khách tới sân check-in QR và thanh toán **70% còn lại + dịch vụ** tại quầy; nếu quá 15 phút ân hạn không đến sẽ chuyển sang **`Khách chưa đến`** và nhả sân.
- **Nền tảng kỹ thuật:** PHP 8.1+ (Transaction + `FOR UPDATE`), MySQL `8.0+`/`8.4.3` (**24 file migration `001`..`023`**), Tailwind CSS build cục bộ (**0 CDN ngoài**), session tối đa **24 giờ (`86400 giây`)**.

## 2. Phân hệ Quản trị (`/portal-admin/` — 11 Tab)
| Tab | Tên phân hệ | Mã tab | Quyền | Chức năng chính |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Tổng quan & Đang chơi | `overview` | `staff`, `manager`, `admin` | KPI doanh thu (`admin`), lấp đầy, xử lý `Giữ chỗ`, quét QR |
| **2** | Lịch đặt sân Timeline | `timeline` | `staff`, `manager`, `admin` | Gantt `05:30–23:00`, điều hành ca, Waitlist, lịch lặp, duyệt kèo |
| **3** | Đặt sân tại quầy | `quick-booking` | `staff`, `manager`, `admin` | Tạo đơn POS chống trùng & bán nước/dịch vụ trừ tồn kho |
| **4** | Quản lý sân bóng | `pitches` | `staff`, `manager`, `admin` | Quản lý 26 sân, bảo trì định kỳ & phản hồi đánh giá |
| **5** | Bảng giá & Voucher | `pricing` | `admin` | Giá theo khung giờ/cuối tuần, gói cố định 4–12 tuần & voucher |
| **6** | Khách & Hội viên | `customers` | `staff` (xem), `manager`, `admin` | Bảng 8 cột, 2 nút lọc (`Tất cả`, `VIP`), CRM & `points_log` |
| **7** | Duyệt cọc VietQR | `payments` | `manager`, `admin` | Duyệt biên lai & đối soát giao dịch SePay (`bank_transactions`) |
| **8** | Chốt ca / Giao ca | `shifts` | `staff`, `manager`, `admin` | Mở/chốt ca, kiểm đếm thực tế & xác minh chênh lệch bàn giao |
| **9** | Báo cáo doanh thu | `reports` | `manager`, `admin` | 4 sub-tab sticky, biểu đồ SVG, Sổ chi chung & xuất CSV BOM |
| **10** | Cài đặt hệ thống | `settings` | `admin` | Cấu hình cọc, ngân hàng, giữ chỗ, thông báo, nhân sự & backup |
| **11** | Nhật ký Admin | `logs` | `admin` | Grid 5 cột, 110 mã / 6 nhóm (`TD/XHC/CN/CB/TQ/AUTO`), hậu kiểm & Inverted Index |

## 3. Tác vụ tự động định kỳ (`cron/`)
Chạy qua CLI hoặc HTTP kèm `X-CRON-SECRET` và file lock chống chạy chồng:
1. `cron/auto_release_expired.php` — Hủy đơn giữ chỗ quá hạn chưa cọc (mặc định 15 phút) và báo Waitlist.
2. `cron/auto_generate_recurring.php` — Tự động sinh lịch đặt cố định hàng tuần (cửa sổ 4 tuần).
3. `cron/auto_remind_bookings.php` — Nhắc lịch đá sắp tới trước giờ thi đấu.
4. `cron/backup_database.php` — Sao lưu CSDL nén `.sql.gz` vào thư mục `backups/` được `.htaccess` bảo vệ.

# Sân Bóng Pro

Website đặt sân bóng đá trực tuyến tích hợp thanh toán cọc **VietQR (SePay)** và cổng quản trị vận hành **11 phân hệ**.

* **Trang web thực tế:** [https://fxzioyr.id.vn](https://fxzioyr.id.vn) (`v20261124_v142`)
* **Mã nguồn GitHub:** [github.com/vinhce/Web_Quan_Ly_San_Bong](https://github.com/vinhce/Web_Quan_Ly_San_Bong)

---

## Tính năng nổi bật

### Dành cho Khách hàng
* **Tìm & xem sân trực quan:** Danh mục **26 sân bóng** (9 sân 5 người, 10 sân 7 người, 7 sân 11 người) kèm bảng giá theo khung giờ và dự báo thời tiết.
* **Đặt sân & Gói cố định:** Chọn nhanh theo **7 khung giờ liên tiếp (2 tiếng/ca, `05:30–22:30`)** tự động chống đặt trùng giờ; hỗ trợ gói cố định **4 / 8 / 12 tuần** (giảm 5%–15%) và đăng ký danh sách chờ.
* **Thanh toán cọc tự động:** Quét mã **VietQR SePay** đặt cọc 30% và tự động xác nhận đơn qua webhook ngân hàng.
* **Tiện ích sau đặt sân:** Phát hành vé QR Check-in, xem lịch sử đặt sân tiếng Việt rõ ràng, chọn voucher 1 chạm, tích điểm đổi quà, chia tiền đội bóng, tìm đối ghép kèo và đặt lại mật khẩu.

### Dành cho Quản trị (`/portal-admin` — Nhân viên / Quản lý / Chủ sân)
1. **Tổng quan & Đang chơi:** Theo dõi doanh thu, tỷ lệ lấp đầy sân và quét mã QR Check-in tại quầy.
2. **Lịch đặt sân Timeline:** Xem lịch cả ngày, xử lý bù giờ, đổi sân, gọi thêm dịch vụ và duyệt tin ghép kèo.
3. **Đặt sân tại quầy:** Đặt lịch trực tiếp cho khách và bán nước/dịch vụ kèm theo dõi tồn kho.
4. **Quản lý sân bóng:** Bật/tắt trạng thái 26 sân, lập lịch bảo trì và phản hồi đánh giá khách hàng.
5. **Bảng giá & Voucher:** Cấu hình giá giờ thường/cao điểm/cuối tuần, chính sách gói tuần và mã khuyến mãi.
6. **Khách & Hội viên:** Tra cứu SĐT nhanh, lọc hội viên VIP, xem lịch sử đặt sân và điều chỉnh điểm thưởng.
7. **Duyệt cọc VietQR:** Duyệt biên lai chuyển khoản và đối soát giao dịch ngân hàng từ SePay.
8. **Chốt ca / Giao ca:** Mở ca, kiểm đếm tiền mặt và xác minh chênh lệch khi bàn giao ca trực.
9. **Báo cáo doanh thu:** Thống kê dòng tiền, biểu đồ doanh thu, sổ chi phí và xuất báo cáo CSV.
10. **Cài đặt hệ thống:** Cấu hình tỷ lệ cọc, ngân hàng nhận tiền, nhân sự, thông báo và sao lưu dữ liệu.
11. **Nhật ký Admin:** Theo dõi lịch sử thao tác quản trị theo 6 nhóm màu, hậu kiểm và tìm kiếm nhanh tiếng Việt không dấu.

---

## Công nghệ sử dụng

* **Backend:** PHP 8.1+ (PDO, Transaction chống trùng lịch đặt).
* **Cơ sở dữ liệu:** MySQL 8.0+ (`quan_ly_san_bong`) với **24 file migration (`001`..`023`)** tự động đồng bộ cấu trúc.
* **Frontend:** HTML5 Clean URLs, **Tailwind CSS build cục bộ** và JavaScript ES6 thuần (không phụ thuộc CDN ngoài).
* **Tích hợp bên ngoài:** Cổng thanh toán VietQR SePay API v2 và dự báo thời tiết Open-Meteo.

---

## Cấu trúc thư mục chính

| Thư mục / Tệp | Chức năng |
| :--- | :--- |
| `index.html`, `html/` | Trang chủ và các trang giao diện dành cho khách hàng |
| `portal-admin/` | Giao diện cổng quản trị 11 phân hệ theo phân quyền |
| `api/` | Hệ thống API xử lý đặt sân, thanh toán, quản trị và nhật ký |
| `css/`, `js/` | Mã nguồn giao diện Tailwind CSS cục bộ và JavaScript ES6 |
| `database/` | Kịch bản khởi tạo CSDL (`schema.sql`) và 24 file migration (`001`..`023`) |
| `cron/`, `tests/`, `scripts/` | Tác vụ tự động định kỳ, bộ kiểm thử và công cụ build/triển khai |

---

## Hướng dẫn cài đặt nhanh (Local)

Yêu cầu môi trường: **PHP 8.1+**, **MySQL 8.0+**, Apache (Laragon/XAMPP) và **Node.js** (khi cần build JS/CSS hoặc chạy test giao diện).

1. Sao chép file cấu hình môi trường và điền thông số DB/SePay:
   ```bash
   cp .env.example .env
   ```
2. Khởi tạo cơ sở dữ liệu từ `database/schema.sql`:
   ```bash
   mysql -u root -p < database/schema.sql
   ```
3. Đưa mã nguồn vào thư mục web (ví dụ `C:\laragon\www\Quan_Ly_San_Bong`).
4. Mở trình duyệt truy cập `http://localhost/Quan_Ly_San_Bong/`.

### Lệnh kiểm thử & build thường dùng
```bash
# Kiểm thử an ninh, cấu hình & cú pháp PHP/JS
php tests/security_hardening_test.php

# Đóng gói lại js/app.js sau khi sửa JS dùng chung
node scripts/build_app_bundle.js

# Cập nhật phiên bản cache-busting trên HTML & Portal Admin
node scripts/bump_version.js 20261124_v142
```

---

## Tài liệu kỹ thuật chi tiết

* Tổng quan tính năng & phạm vi: [PRD.md](PRD.md)
* Kiến trúc hệ thống, CSDL & API: [ARCHITECTURE.md](ARCHITECTURE.md)
* Quy chuẩn giao diện UI/UX: [DESIGN.md](DESIGN.md)
* Nhật ký phát hành & danh sách task: [PROGRESS.md](PROGRESS.md) · [TASKS.md](TASKS.md) · [docs/TIEN_DO.md](docs/TIEN_DO.md)

---

© 2026 **Sân Bóng Pro**.

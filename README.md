# Sân Bóng Pro – Hệ Thống Đặt Sân Bóng Đá Trực Tuyến

Hệ thống đặt sân bóng đá tự động, chuẩn hóa giao diện trực quan và trải nghiệm mượt mà. Dự án được xây dựng bằng kiến trúc Frontend thuần (Static Web) tách bạch rõ ràng theo các thư mục `css/`, `js/`, `html/` và chỉ có tệp `index.html` ở thư mục gốc ngoài cùng. Dữ liệu được lưu trữ bền vững trên trình duyệt qua `LocalStorage`, giúp bất kỳ ai trong nhóm tải về đều có thể mở lên chạy và code tiếp được ngay mà không cần cài đặt môi trường phức tạp hay cơ sở dữ liệu nặng nề.

---

## 📍 Thông Tin Cơ Sở & Liên Hệ

* **Địa chỉ sân bóng:** Khu liên hợp Thể thao Pro, Số 18 Đường Lê Đức Thọ, Phường Mỹ Đình, Quận Nam Từ Liêm, TP. Hà Nội.
* **Hotline hỗ trợ 24/7:** **0352 313 548**
* **Giờ mở cửa:** 05:30 – 23:00 (Tất cả các ngày trong tuần)
* **Thông tin tài khoản nhận cọc:**
  * **Ngân hàng:** Vietcombank (VCB) – Chi nhánh Mỹ Đình, Hà Nội
  * **Số tài khoản:** `0123456789`
  * **Chủ tài khoản:** **NGUYEN QUANG VINH**
  * **Chính sách cọc:** Chuyển khoản cọc 30%, 70% còn lại thanh toán tại quầy khi nhận sân.

---

## 🚀 Hướng Dẫn Tải Về & Khởi Chạy (Dành Cho Thành Viên Nhóm)

### 1. Tải mã nguồn về máy
Mở Terminal / Git Bash / Command Prompt và chạy lệnh:
```bash
git clone https://github.com/vinhce/Web_Quan_Ly_San_Bong.git
cd Web_Quan_Ly_San_Bong
```

### 2. Khởi chạy ứng dụng
Không cần cài đặt `npm`, không cần `composer` hay cài đặt PHP/Node.js:
- **Cách 1 (Nhanh nhất):** Nhấp đúp chuột trực tiếp vào tệp `index.html` ở thư mục ngoài cùng để mở trên trình duyệt (Chrome, Edge, Brave, Cốc Cốc, Firefox).
- **Cách 2 (Laragon / XAMPP / Live Server):** Đặt thư mục vào `www/` hoặc `htdocs/`, truy cập `http://localhost/Quan_Ly_San_Bong`.

---

## 📁 Cấu Trúc Thư Mục Chuẩn Hóa (Không Phình File)

Dự án đã được phân tách gọn gàng, loại bỏ hoàn toàn các đoạn mã inline cồng kềnh:

```text
Web_Quan_Ly_San_Bong/
├── index.html          # Trang chủ ngoài cùng: Giới thiệu, banner tìm kiếm nhanh, sân nổi bật, voucher
├── css/
│   └── style.css       # Toàn bộ CSS dùng chung: Font, thẻ UI Card, Buttons, Input fields, Media print
├── js/
│   ├── data.js         # Mock Database: Dữ liệu khởi tạo (6 sân bóng, slot giờ, dịch vụ, voucher, tài khoản NH)
│   ├── app.js          # Core Engine: State LocalStorage (SanBongDB), Navbar/Footer dùng chung, render SVG sân bóng
│   ├── index.js        # Logic riêng trang chủ index.html
│   ├── fields.js       # Logic danh sách & bộ lọc sân bóng
│   ├── booking.js      # Logic đặt sân, chọn slot giờ, dịch vụ & áp voucher
│   ├── checkout.js     # Logic thanh toán cọc ngân hàng & đếm ngược giữ chỗ
│   ├── success.js      # Logic vé điện tử & QR check-in
│   ├── history.js      # Logic lịch sử đặt sân, hủy sân & điểm thưởng hội viên
│   ├── admin.js        # Logic 9 phân hệ quản trị viên (KPI, Gantt, bật/tắt bảo trì sân, duyệt cọc)
│   └── login.js        # Logic đăng nhập, đăng ký tài khoản hội viên
├── html/
│   ├── fields.html     # Danh sách sân: Bộ lọc theo loại sân (5, 7, 11 người), khoảng giá, tiện ích
│   ├── booking.html    # Đặt sân: Chọn ngày, ma trận khung giờ trực quan, dịch vụ thêm, mã giảm giá
│   ├── checkout.html   # Thanh toán cọc 30%: Thông tin chuyển khoản Vietcombank (Chủ TK: NGUYEN QUANG VINH)
│   ├── success.html    # Đặt sân thành công: Vé điện tử kèm mã QR check-in sân, chức năng in vé
│   ├── history.html    # Lịch sử đặt sân & Hội viên: Danh sách trận đã đặt, hạng thành viên (SĐT: 0352 313 548)
│   ├── admin.html      # Quản trị Admin: 9 module vận hành, timeline Gantt, tạo đơn tại quầy, duyệt cọc
│   └── login.html      # Trang đăng nhập / đăng ký hội viên
├── .gitignore          # Cấu hình bỏ qua các tệp tạm
└── README.md           # Tài liệu hướng dẫn sử dụng và phát triển
```

---

## 🔄 Luồng Nghiệp Vụ Hoạt Động (End-to-End Flow)

```mermaid
flowchart LR
    A["index.html / html/fields.html<br/>(Xem & Tìm sân)"] --> B["html/booking.html<br/>(Chọn giờ & dịch vụ)"]
    B --> C["html/checkout.html<br/>(Chuyển cọc 30% tới<br/>NGUYEN QUANG VINH)"]
    C --> D["html/success.html<br/>(Vé điện tử QR check-in)"]
    D --> E["html/history.html<br/>(Theo dõi lịch sử & tích điểm)"]
    C -.-> F["html/admin.html<br/>(Quản lý & Duyệt đơn)"]
```

1. **Khách hàng duyệt sân:** Tìm kiếm theo loại sân (sân 5, sân 7, sân 11) và ngày thi đấu.
2. **Chọn khung giờ & dịch vụ:** Ma trận giờ trực quan tự động đánh dấu slot "Trống", "Đang đá" hoặc "Đã đặt". Tùy chọn mua nước, áo bib, thuê trọng tài và áp mã ưu đãi (ví dụ: `WELCOME10`, `GIAM50K`).
3. **Thanh toán cọc 30%:** Trang `checkout.html` hiển thị rõ ràng thông tin người nhận:
   - Ngân hàng: **Vietcombank (VCB)**
   - Số tài khoản: **0123456789**
   - Chủ tài khoản: **NGUYEN QUANG VINH**
4. **Nhận vé check-in:** Chuyển sang `success.html` với mã đặt sân (SB-xxxx) và mã QR check-in tại quầy trước giờ thi đấu.
5. **Quản trị viên (Admin):** Theo dõi lịch đặt trong `admin.html`, lọc theo ngày, đổi trạng thái sân hoặc xác nhận cọc.

---

## 🛠️ Công Nghệ Sử Dụng

* **Giao diện (Frontend):** HTML5 Semantics, Tailwind CSS (qua CDN), Font Plus Jakarta Sans & Inter.
* **Vector Graphic:** Sơ đồ mặt cỏ sân bóng FIFA, vạch sân bóng, icon hệ thống vẽ hoàn toàn bằng SVG thuần (không lo vỡ hình, tải siêu tốc, không cần asset ảnh nặng).
* **Quản trị State & Dữ liệu:** Vanilla JavaScript (ES6+), tích hợp sẵn `SanBongDB` tự động khởi tạo và đồng bộ trạng thái qua `localStorage`.

---

## 💡 Hướng Dẫn Dành Cho Thành Viên Nhóm (Code Tiếp)

1. **Truy xuất và cập nhật dữ liệu:**
   Mọi trang đều nạp `js/data.js` và `js/app.js`. Bạn có thể tương tác với cơ sở dữ liệu mô phỏng qua đối tượng toàn cục `window.SanBongApp.SanBongDB`:
   ```javascript
   // Lấy danh sách sân
   const pitches = window.SanBongApp.SanBongDB.getPitches();

   // Lấy danh sách khung giờ kèm trạng thái theo ngày
   const slots = window.SanBongApp.SanBongDB.getSlotsWithStatus('P7-A', '2026-11-07');

   // Tạo đơn đặt sân mới
   const newBooking = window.SanBongApp.SanBongDB.createBooking({
     customerName: 'Tên khách',
     phone: '0352313548',
     pitchId: 'P7-A',
     date: '2026-11-07',
     slotId: 'S08',
     slotTime: '18:30 - 20:00',
     services: [],
     paymentMethod: 'VietQR Chuyển khoản'
   });
   ```

2. **Quy tắc điều hướng (Smart Link Routing):**
   - Hàm `window.SanBongApp.getRelativePath(target)` trong `js/app.js` tự động tính đường dẫn tương đối tùy thuộc vào vị trí người dùng đang ở root (`index.html`) hay trong thư mục con (`html/*.html`).
   - Các trang bên trong `html/` khi liên kết với nhau chỉ cần gọi trực tiếp tên tệp (ví dụ: `href="booking.html"`) và quay về trang chủ bằng `href="../index.html"`.

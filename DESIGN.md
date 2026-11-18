# DESIGN SYSTEM & UI/UX SPEC — SÂN BÓNG PRO

## 1. HỆ MÀU (DESIGN TOKENS)

| Vai trò | Mã Hex | Tailwind Class | Ứng dụng |
| :--- | :--- | :--- | :--- |
| **Primary Emerald** | `#16A34A` | `emerald-600` | Nút hành động chính, màu chủ đạo sân cỏ, trạng thái Hoàn thành |
| **Primary Hover** | `#15803D` | `emerald-700` | Trạng thái hover/active nút chính |
| **Primary Tint** | `#DCFCE7` | `emerald-100` | Nền badge thành công, viền highlight sân đang chọn |
| **Navy Dark** | `#0F172A` | `slate-900` | Màu nền header, sidebar admin, chữ tiêu đề đậm |
| **Slate Gray** | `#64748B` | `slate-500` | Chữ phụ, icon thứ cấp, đường phân cách nhẹ |
| **Surface Light** | `#F8FAFC` | `slate-50` | Màu nền tổng thể trang web và nền modal |
| **Border Neutral** | `#E2E8F0` | `slate-200` | Đường viền card, bảng và input |

### Màu Trạng Thái Đặt Sân & Ca Đá (Badges & Borders)
- **Đã đặt cọc (Deposit Confirmed):** Amber `#F59E0B` (`amber-500`) / Tint `#FEF3C7` (`amber-100`)
- **Đang đá (In-Play):** Blue `#2563EB` (`blue-600`) / Tint `#DBEAFE` (`blue-100`)
- **Hoàn thành / Trống (Available):** Emerald `#16A34A` (`emerald-600`) / Tint `#DCFCE7` (`emerald-100`)
- **Khách chưa đến / Đã hủy (khách không đến / trễ giờ quá hạn):** Red `#DC2626` (`red-600`) / Tint `#FEE2E2` (`red-100`)
- **Bảo trì (Maintenance):** Slate `#475569` (`slate-600`) / Tint `#F1F5F9` (`slate-100`)

---

## 2. TYPOGRAPHY
- **Font chữ chính:** `Plus Jakarta Sans`, `Inter`, sans-serif.
- **Tiêu đề chính (H1 - Hero/Banner):** `text-2xl` đến `text-4xl`, `font-extrabold`, `tracking-tight`, màu `#0F172A`.
- **Tiêu đề khối (H2 - Section):** `text-xl` đến `text-2xl`, `font-bold`, màu `#0F172A`.
- **Tiêu đề thẻ (H3 - Card Title):** `text-base` đến `text-lg`, `font-semibold`.
- **Nội dung chung (Body):** `text-sm` đến `text-base`, `font-normal`, `leading-relaxed`, màu `#334155`.
- **Ghi chú & Metadata (Caption):** `text-xs`, `font-medium`, màu `#64748B`.
- **Định dạng tiền tệ:** Luôn sử dụng `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })` (VD: `350.000 ₫`).

---

## 3. QUY CHUẨN COMPONENT

### 3.1. Nút Bấm (Button)
- **Primary Button:** Nền `bg-emerald-600`, chữ trắng `text-white`, bo góc `rounded-xl`, đổ bóng nhẹ `shadow-sm hover:shadow hover:bg-emerald-700 active:scale-[0.98] transition-all duration-200`. Vùng bấm tối thiểu mobile $\ge 44\text{px}$.
- **Secondary / Ghost Button:** Nền trong suốt hoặc `bg-slate-100`, viền `border border-slate-300`, chữ `text-slate-700 hover:bg-slate-200`.
- **Danger Button:** Nền `bg-red-600 hover:bg-red-700`, chữ trắng, dùng cho tác vụ Hủy ca, Xóa sân.
- **Icon Button:** Kèm `aria-label` minh bạch để hỗ trợ khả năng tiếp cận (Accessibility).

### 3.2. Ô Nhập Liệu (Input / Form)
- Viền mặc định `border border-slate-300 rounded-xl px-4 py-2.5 text-sm`.
- Hiệu ứng Focus: `focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`.
- Hiển thị lỗi: Viền đỏ `border-red-500 text-red-600`, đi kèm thông điệp giải thích ngay bên dưới ô nhập.
- Bắt buộc có nhãn `<label>` thực, thuộc tính `autocomplete` và `inputmode` phù hợp (`tel`, `email`, `numeric`).

### 3.3. Thẻ Sân & Khung Giờ (Pitch Card & Slot Matrix)
- Thẻ sân: Bo tròn `rounded-2xl`, viền `border border-slate-200`, hiệu ứng nhấc thẻ khi hover `hover:-translate-y-1 hover:shadow-lg transition-all`.
- Ma trận 18 slot giờ: Grid hiển thị trực quan theo màu trạng thái. Slot đã đặt có biểu tượng khóa, slot trống có giá hiển thị rõ ràng và hỗ trợ bấm chọn nhiều slot cho gói tháng.

### 3.4. Trung Tâm Điều Hành Timeline (Gantt Chart)
- Biểu đồ thời gian trải dài từ `05:30` đến `23:00`.
- Mỗi khối ca đá có viền mảnh phân màu trạng thái, nhãn tên đội và SĐT khách rõ ràng.
- Bấm vào ca đá mở ngay Popup điều hành: Đá bù giờ (+15p, +30p), Thêm nước giải khát, In hóa đơn hoặc Đổi sân tại chỗ.

### 3.5. Trực Quan Hóa Dữ Liệu (Data Visualization — Inline SVG Vector Thuần)
- Toàn bộ biểu đồ báo cáo tài chính, phân tích xu hướng giờ lấp đầy và so sánh doanh thu tuần/tháng được xây dựng bằng **Inline SVG Vector thuần**, loại bỏ hoàn toàn các thư viện cồng kềnh bên thứ ba như Chart.js để tối ưu tải trang và không phát sinh chi phí runtime.
- Render trực tiếp các thẻ hình học SVG (`<svg viewBox="...">`, `<rect>`, `<path>`, `<polyline>`, `<circle>`, `<text>`) qua JavaScript ES6 module (`js/admin_finance.js`).
- Giao diện Responsive tự co giãn theo container, hiển thị sắc nét tuyệt đối trên mọi độ phân giải (Retina, 4K, Mobile).
- Tương tác vi mô (Micro-interactions): Tooltip hiển thị chi tiết doanh thu / số ca đá khi hover/touch vào các cột mốc dữ liệu mà không gây giật lag.

### 3.6. Giao Diện Bảng Nhật Ký Admin (Admin Audit Log UI Spec)
- **Hệ thống 6 Nhóm Màu Badge Hành Động (`portal-admin/partials/tab11_admin_logs.php` & `js/admin_logs.js`):**
  1. 🟢 **Tạo / Duyệt (`badge-green`):** `#DCFCE7` / chữ `#166534` / viền `#BBF7D0` (Tạo đơn quầy, mở ca, duyệt cọc, khớp webhook, thêm dịch vụ/bảo trì, xác nhận ca).
  2. 🔴 **Xóa / Hủy / Chi tiền (`badge-red`):** `#FEE2E2` / chữ `#991B1B` / viền `#FECACA` (Xóa voucher/giờ vàng/khoản chi, hủy đơn, từ chối cọc, tự động nhả đơn quá hạn, thêm khoản chi).
  3. 🔵 **Cập nhật (`badge-blue`):** `#DBEAFE` / chữ `#1E40AF` / viền `#BFDBFE` (Cập nhật bảng giá, cài đặt, trạng thái sân, sửa hội viên, điều chỉnh điểm, check-in, chuyển sân).
  4. 🟠 **Cảnh báo (`badge-orange`):** `#FFEDD5` / chữ `#9A3412` / viền `#FED7AA` (Giao dịch lệch/chưa khớp, khách chưa đến quá hạn nhả sân, đổi vai trò/mật khẩu nhân sự, đóng/giao ca).
  5. 🟣 **Tiền quầy (`badge-purple`):** `#F3E8FF` / chữ `#6B21A8` / viền `#E9D5FF` (Thu tiền, bán hàng tại quầy).
  6. ⚪ **Tự động (`badge-gray`):** `#F1F5F9` / chữ `#334155` / viền `#CBD5E1` (Cron nhắc lịch, sinh lịch lặp, hoàn tất ca quá giờ, sao lưu CSDL, test Telegram).
- **Thanh Chú Thích Trực Quan (Legend):** Đặt ngay trong khung bộ lọc trên đầu bảng, hiển thị đầy đủ 6 nhóm màu giúp admin nhận diện nhanh thao tác.
- **Tooltip IP Chống Tràn Bảng:** Thông tin địa chỉ IP được tích hợp dưới dạng tooltip (`title="IP: ..."`) khi hover vào cột thời gian thay vì tạo cột riêng biệt, giữ bảng luôn hiển thị vừa vặn.
- **Trình Diễn Diffing Cũ → Mới Trực Quan:** Thẻ gạch ngang `<del class="text-rose-700">` cho giá trị cũ và `<strong class="text-emerald-800">` cho giá trị mới; tự động giải mã JSON lồng nhau và che thông tin nhạy cảm (`0912xxx678`).
- **Dropdown Phân Nhóm Emoji:** Dropdown bộ lọc hành động phân theo 9 nhóm nghiệp vụ (`ADMIN_LOG_CATALOG`) kèm emoji theo nhóm màu (🟢, 🔴, 🔵, 🟠, 🟣, ⚪).

### 3.7. Giao Diện Bảng CRM Khách Hàng (Customer Management UI Spec)
- **Cấu trúc 8 cột cố định (`tab6_customers.php` & `js/admin_customers.js`):** `Tên hội viên`, `Số điện thoại`, `Hạng`, `Trận hoàn thành`, `Điểm tích lũy`, `Đặt gần nhất`, `Tổng chi tiêu`, `Thao tác`. Trong đó 2 cột nổi bật:
  - *"Đặt gần nhất"*: Hiển thị dạng *"Hôm nay"*, *"x ngày trước"*, *"Sắp tới"*, hoặc *"—"* (nếu chưa từng đặt).
  - *"Trận hoàn thành"*: Tổng số ca đá đã hoàn tất thành công.
- **Nhãn Cảnh Báo Khách Không Đến / Trễ Giờ Quá Hạn:** Huy hiệu màu đỏ `bg-red-100 text-red-700 border border-red-200` hiển thị ngay cạnh tên khách khi số lần `Khách chưa đến` $N \ge 1$ (bằng 0 thì ẩn hoàn toàn).
- **Thanh Lọc Tinh Gọn:** 3 nút bấm chuẩn mực `[Tất cả khách]`, `[Hội viên VIP]`, `[Khách quen]` với hiệu ứng active nền xanh `bg-emerald-600 text-white`.

---

## 4. QUY TẮC RESPONSIVE & 4 TRẠNG THÁI UI

### 4.1. Responsive Mobile-First
- Tối ưu bắt đầu từ màn hình nhỏ nhất **360px** (iPhone SE, Galaxy A series).
- Tuyệt đối không để phát sinh thanh cuộn ngang ngoài ý muốn (`overflow-x: hidden`).
- Chiều cao các trang toàn màn hình (Modal/Drawer) sử dụng `100dvh` để không bị thanh công cụ trình duyệt mobile che khuất.
- Drawer Sidebar trên Mobile trong Portal Admin: Vuốt trượt mượt mà, bấm backdrop để đóng.

### 4.2. 4 Trạng Thái Bắt Buộc Cho Mọi Khối Dữ Liệu Động
1. **Loading State:** Sử dụng Skeleton loader có kích thước và bố cục tương đương với nội dung thật khi tải xong (không dùng vòng quay spinner đơn điệu giữa trang trắng).
2. **Empty State:** Hình minh họa/icon nhẹ nhàng, thông điệp thân thiện (VD: *"Không có trận đấu nào trong khung giờ này"*) kèm nút điều hướng hành động tiếp theo.
3. **Error State:** Thông báo lỗi rõ ràng bằng tiếng Việt, giải thích nguyên nhân và có nút `Thử lại` (Retry) mà không cần reload toàn bộ trang.
4. **Success State:** Cập nhật DOM ngay lập tức hoặc hiển thị Toast thông báo ở góc màn hình (tự tắt sau 3 giây).

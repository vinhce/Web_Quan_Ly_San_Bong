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
- **Khách chưa đến / Hủy (No-Show/Cancelled):** Red `#DC2626` (`red-600`) / Tint `#FEE2E2` (`red-100`)
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

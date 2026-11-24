# DESIGN SYSTEM & UI/UX — SÂN BÓNG PRO

## 1. Bảng màu chuẩn (Design Tokens)
| Vai trò | Mã Hex | Tailwind Class | Ứng dụng |
| :--- | :--- | :--- | :--- |
| **Chủ đạo (Primary)** | `#16A34A` / `#15803D` | `emerald-600` / `700` | Nút chính, điểm nhấn sân cỏ, trạng thái Hoàn thành |
| **Nền nhấn xanh** | `#DCFCE7` | `emerald-100` | Badge thành công, viền khung đang chọn |
| **Tối (Header/Sidebar)** | `#0F172A` | `slate-900` | Thanh điều hướng, sidebar admin, tiêu đề chính |
| **Chữ phụ / Viền / Nền** | `#64748B` / `#E2E8F0` / `#F8FAFC` | `slate-500/200/50` | Nhãn phụ, viền card/input, nền tổng thể |

### Màu trạng thái ca đá
- **Đã đặt cọc:** Amber `#F59E0B` (`amber-500`) / nền `#FEF3C7` (`amber-100`)
- **Đang đá:** Blue `#2563EB` (`blue-600`) / nền `#DBEAFE` (`blue-100`)
- **Hoàn thành / Trống:** Emerald `#16A34A` (`emerald-600`) / nền `#DCFCE7` (`emerald-100`)
- **Khách chưa đến / Đã hủy:** Red `#DC2626` (`red-600`) / nền `#FEE2E2` (`red-100`)
- **Bảo trì:** Slate `#475569` (`slate-600`) / nền `#F1F5F9` (`slate-100`)

## 2. Typography & Tiền tệ
- **Font chữ:** Dùng **font hệ thống cục bộ** (`system-ui`, `-apple-system`, sans-serif) qua `css/tailwind.generated.css` — **0 Google Fonts / CDN ngoài**.
- **Phân cấp chữ:** Tiêu đề hero `text-2xl`–`text-4xl font-extrabold`; mục lớn `text-xl`–`text-2xl font-bold`; nội dung `text-sm`–`text-base`; ghi chú `text-xs`.
- **Tiền tệ:** Định dạng chuẩn Việt Nam qua `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`.

## 3. Quy chuẩn Component chính
- **Nút bấm & Form:** Vùng bấm tối thiểu mobile $\ge 44\text{px}$; input có `<label>`, `inputmode` phù hợp, viền `focus:ring-2 focus:ring-emerald-500` và báo lỗi viền đỏ kèm mô tả tiếng Việt.
- **Ma trận 7 khung giờ 2 tiếng/ca (`05:30–22:30`, nghỉ trưa `11:30–14:30`):** Slot trùng giờ tự khóa kèm nhãn `"Trùng giờ"`; slot trống cho phép chọn nhiều tuần theo gói cố định.
- **Timeline & Biểu đồ SVG:** Gantt Chart trải dài `05:30–23:00`; toàn bộ biểu đồ doanh thu ở `js/admin_reports.js` và `js/admin_overview.js` vẽ bằng **Inline SVG thuần** (không dùng Chart.js).
- **Tab 11 Nhật ký Admin (Grid 5 cột):** Bố cục `Người thực hiện | Hành động | Đối tượng | Nội dung thay đổi (cũ → mới) | Thời gian`, có 4 thẻ KPI, thanh `Quy ước màu:`, thu gọn diff dài (`+N thay đổi nữa`), nút `Xem chi tiết`/`Hậu kiểm ngay`, tooltip IP ở cột thời gian và **gỡ bỏ hoàn toàn** nhãn `Chỉ ghi thêm`/`Append-only`:
  - 🟢 **Tạo / Duyệt (`TD`):** `#DCFCE7` / `#166534`
  - 🔴 **Xóa / Hủy / Chi tiền (`XHC`, DB `XH`):** `#FEE2E2` / `#991B1B`
  - 🔵 **Cập nhật (`CN`):** `#DBEAFE` / `#1E40AF`
  - 🟠 **Cảnh báo (`CB`):** `#FFEDD5` / `#9A3412`
  - 🟣 **Tiền quầy (`TQ`):** `#F3E8FF` / `#6B21A8`
  - ⚪ **Tự động (`AUTO`, DB `TT`):** `#F1F5F9` / `#334155`
- **Tab 6 CRM Khách hàng:** Bảng 8 cột cố định (`Tên hội viên`, `Số điện thoại`, `Hạng`, `Trận hoàn thành`, `Điểm tích lũy`, `Đặt gần nhất`, `Tổng chi tiêu`, `Thao tác`), huy hiệu đỏ cảnh báo bùng sân khi $\ge 1$ lần, thanh lọc **2 nút** `[Tất cả khách]` và `[Hội viên VIP]`, chọn hạng + ghi chú cùng 1 hàng.

## 4. Responsive & 4 Trạng thái UI bắt buộc
- **Mobile-first từ `360px`:** Không tràn ngang (`overflow-x: hidden`), modal/drawer dùng `100dvh`, vùng chạm $\ge 44\text{px}$.
- **Mọi khối dữ liệu động đều phải có 4 trạng thái:**
  1. **Loading:** Skeleton khớp bố cục nội dung thật.
  2. **Empty:** Thông báo thân thiện kèm nút điều hướng tiếp theo.
  3. **Error:** Báo lỗi tiếng Việt rõ nguyên nhân kèm nút `Thử lại`.
  4. **Success:** Cập nhật DOM tức thì kèm Toast góc màn hình (gộp trùng, tự tắt).

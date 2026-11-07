# QUAN LY SAN BONG - ARCHITECTURE & CONVENTIONS

## 1. TECH STACK & SYSTEM ARCHITECTURE
- **Core Technology**: 100% Frontend chuẩn Web tĩnh hiện đại (HTML5 + Tailwind CSS CDN + Vanilla ES6 JS). TUYỆT ĐỐI KHÔNG DÙNG PHP.
- **Root Directory**: `c:\laragon\www\Quan_Ly_San_Bong`
- **Data Persistence**: `localStorage` (giả lập Client-side Database: sân, slots, booking, voucher, hóa đơn).
- **Styling**: Tailwind CSS + Google Fonts (Plus Jakarta Sans & Inter) + Lucide Icons SVG.
- **Pages Architecture**:
  - `index.html`: Web Trang chủ (Frame 1 & 20)
  - `fields.html`: Danh sách & Chi tiết sân (Frame 2, 3)
  - `booking.html`: Ma trận chọn slot giờ & đặt sân (Frame 4, 21)
  - `checkout.html`: Thanh toán cọc & mã VietQR động (Frame 5)
  - `success.html`: Thẻ vé điện tử & QR check-in (Frame 6, 22)
  - `history.html`: Lịch sử đặt sân & Hội viên (Frame 9, 23)
  - `login.html`: Đăng nhập / Đăng ký (Frame 7, 8)
  - `admin.html`: Toàn bộ 9 màn hình quản trị Admin Dashboard (Frame 11 - 19)
  - `assets/js/data.js`: Dữ liệu mẫu (sân, giá, khung giờ, voucher, bookings)
  - `assets/js/app.js`: Logic tương tác, state SanBongDB, calculatePrice, escapeHTML

## 2. DESIGN CONTRACT
- Primary Emerald: `#16A34A`, Hover: `#15803D`, Tint: `#DCFCE7`
- Navy/Dark: `#0F172A`, Slate: `#64748B`, Border: `#E2E8F0`
- Badges: Amber `#F59E0B` (Đã cọc), Blue `#2563EB` (Đang đá), Red `#DC2626` (Bảo trì)

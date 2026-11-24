# PROGRESS — TIẾN ĐỘ DỰ ÁN SÂN BÓNG PRO

> Chi tiết task xem tại [TASKS.md](TASKS.md) · Lịch sử kỹ thuật xem tại [docs/TIEN_DO.md](docs/TIEN_DO.md).

## 1. Phát hành mới nhất (`v20261124_v142` — 2026-11-24)
- [x] **CSDL & Bảo mật phiên:** Hoàn thiện **24 file migration (`001`..`023`)** với **7 khung giờ 2 tiếng/ca (`05:30–22:30`)**, nâng thời hạn phiên đăng nhập lên **24 giờ (`86400 giây`)**, thống nhất xác thực khách hàng ở server và cấu hình `Cache-Control: private, no-store` cho trang động.
- [x] **Luồng Khách hàng:** Hoàn thiện chọn voucher 1 chạm ở `/booking` (bỏ form đặt hộ), xác thực phiên sạch ở `/checkout` & `/matchmaking`, trang quên mật khẩu `/forgot-password`, và Việt hóa `/history` kèm gói cố định 4/8/12 tuần cấu trúc rõ ràng, gộp chip phụ thu, căn thẳng cột nút.
- [x] **Portal Admin 11 Tab:** Nâng cấp **Tab 11 Nhật ký Admin** lên CSS Grid 5 cột (110 mã / 6 nhóm màu `TD/XHC/CN/CB/TQ/AUTO`), hậu kiểm inline và tìm kiếm Inverted Index không dấu; tinh gọn Tab 6 CRM (còn 2 nút lọc `Tất cả khách` / `Hội viên VIP`, bỏ `Khách quen` & Blacklist); chia Tab 9 Báo cáo thành 4 sub-tab; bổ sung xác minh chênh lệch Tab 8 và căn giữa đối soát Tab 7.
- [x] **Build cục bộ & Live Production:** Đóng gói Tailwind CSS cục bộ (**0 CDN ngoài**), vượt qua các bộ test bảo mật/UI/Inverted Index và triển khai đồng bộ lên `https://fxzioyr.id.vn` (`origin/main` tới commit `6a34e81`).

## 2. Các mốc đã hoàn thành trước đó
- [x] **Mốc nền tảng (`v20261118_v95` — 2026-11-18):** Hoàn thiện 17 bản migration đầu (`001`..`017`), 26 sân bóng, 25 hạng mục bảo mật, hợp nhất Audit Log vào Tab 11 và go-live `https://fxzioyr.id.vn`.
- [x] **Vá 6 lỗi bảo mật/logic cốt lõi (`SRC-01` → `SRC-06`):** Khóa IDOR tra cứu/hủy đơn, giao dịch `FOR UPDATE` chống Lost Update khi hủy ca và kiểm tra cọc, fail-closed khi khóa user hoặc mất DB, chuẩn hóa SĐT `03/05/07/08/09`.
- [x] **Chuẩn hóa CRM & Xóa công nợ (Migration `015`–`017`):** Loại bỏ hoàn toàn cột công nợ đọng, thêm bảng `points_log` khóa dòng minh bạch, bảng CRM 8 cột và chống ghi log thừa.

## 3. Trạng thái hiện tại & Bước tiếp theo
- **Blockers:** Không có (`0` lỗi mở).
- **Backlog mở:** `Task 6.7`–`Task 6.10` (chuyển key SePay Live, Zalo ZNS/SMS Brandname, PWA offline, mở rộng biểu đồ SVG) xem tại [TASKS.md](TASKS.md).

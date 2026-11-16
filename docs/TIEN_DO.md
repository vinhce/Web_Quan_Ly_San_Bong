# TIẾN ĐỘ NÂNG CẤP PORTAL-ADMIN (V1 -> V9)

## Trạng thái các hạng mục
- [x] V1. TAB MỚI "CHỐT CA / GIAO CA" (Tab 8) & ĐÁNH SỐ LẠI 10 TAB (Test: 16/16 pass)
- [x] V2. LOGIC CA TRỰC (Mở ca, đếm tiền, chốt ca, đối soát, audit) (Test: 11/11 pass)
- [x] V3. DUYỆT CỌC VIETQR (Tab 7: Đã chuyển cọc là ca đã có người, bỏ nút Từ chối khi có tiền) (Test: 9/9 pass)
- [x] V4. UI/UX TAB 3 (Kho nước & bán lẻ dịch vụ, chip tồn kho, responsive 360px) (Test: 7/7 pass)
- [x] V5. DỮ LIỆU MẪU [TEST] (Sân C, D, E và Sân 11 đủ trạng thái, chi phí, ca trực) (Test: 11/11 pass)
- [x] V6. BÁO CÁO DOANH THU (Tab 9: Đối chiếu số liệu, lợi nhuận, biểu đồ SVG, sổ chi, xuất Excel/CSV) (Test: 33/33 pass)
- [x] V7. CÁC TAB CÒN LẠI (Tab 1, 2, 4, 5, 6, 10 rà soát hiển thị, loading, rỗng, lỗi) (Test: 12/12 pass)
- [x] V8. BẢO MẬT & HIỆU NĂNG TOÀN PORTAL (Phân quyền server, CSRF, escape, audit logs) (Test: 11/11 pass)
- [x] V9. HỒI QUY CUỐI (Syntax check, acceptance_test, kiểm tra 10 tab, chốt số liệu) (Test: 56/56 file syntax + 150/150 test pass)
- [x] V10. MODULAR HÓA <= 666 DÒNG & ĐỒNG BỘ HOSTING (Tất cả file <= 666 dòng, cấp full quyền Admin vxyen0801, sửa lỗi UI Header/Tab 7/History, deploy public_html) (Test: 100% pass)
- [x] V11. NÂNG CẤP TAB 11 "NHẬT KÝ ADMIN", CRM 2 CỘT MỚI & POINTS LOG (Tab 11 Audit Log 6 nhóm màu, legend, diffing Cũ → Mới; CRM bỏ cột cũ thêm 2 cột mới "Đặt gần nhất" & "Số lượt đặt", nhãn bùng sân, tinh gọn 3 nút lọc; form sửa hội viên và points_log có lý do bắt buộc với FOR UPDATE; chống log rác) (Test: 67/67 pass: Part A 24/24, Part B 21/21, Part C 22/22)

## Quyết định kỹ thuật
- Môi trường: MySQL 8.0.30 Local (127.0.0.1:3306), PHP 8.1.10.
- Mã định danh tab:
  + Tab 1: Tổng quan (kpi)
  + Tab 2: Lịch (timeline)
  + Tab 3: Đặt sân tại quầy (quick_booking)
  + Tab 4: Quản lý sân (pitches)
  + Tab 5: Bảng giá & Voucher (pricing)
  + Tab 6: Khách & Hội viên (customers)
  + Tab 7: Duyệt cọc VietQR (deposits)
  + Tab 8: Chốt ca / Giao ca (shifts)
  + Tab 9: Báo cáo doanh thu (reports)
  + Tab 10: Cài đặt hệ thống (settings)
  + Tab 11: Nhật ký hệ thống (logs) [MỚI - ADMIN ONLY]

## Migration đã chạy
- 010_shifts_management_upgrade.sql (Thêm initial_cash, discrepancy_reason vào shifts; staff_id vào bookings).
- 015_audit_and_points_log_expansion.sql (Mở rộng audit_logs thêm target_type, target_id, ip; tạo points_log; thêm admin_note vào users).

## Dữ liệu [TEST] đã thêm
- 9 ca Sân 5 (P5-C, P5-D, P5-E trải dài 3 ngày qua-nay-mai, giờ thường và giờ vàng).
- 7 ca Sân 11 (P11-A, P11-B, P11-C đủ trạng thái: Giữ chỗ, Đã xác nhận, Đang đá, Hoàn thành, Đã hủy; có voucher; kèm bán nước; 1 thiếu, 1 thừa, 1 chưa thấy tiền).
- 4 khoản chi phí mẫu trong sổ chi (Điện nước 1.2M, Bảo trì 850k, Nhập hàng 2.5M, Nhân sự 3M).
- Ca trực mẫu có phát sinh thu thực tế.
- Lệnh dọn dẹp an toàn: `php tests/test_v5_sample_data.php --clean` hoặc qua API `manage_sample_data?sub_action=clean`.

## Lỗi mở
- Không có lỗi mở.

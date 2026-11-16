# BÁO CÁO SCAN TOÀN DIỆN VÀ AUDIT DATABASE VỀ CÔNG NỢ (STEP 1)
**Ngày thực hiện:** 2026-11-16  
**Agent thực hiện:** `scanner`  
**Đối tượng bàn giao:** `@backend_crm`, `@frontend_crm`, `@coordinator`

---

## 1. TỔNG QUAN KẾT QUẢ QUÉT TOÀN BỘ CODEBASE
- Tổng số vị trí phát hiện từ khóa liên quan đến nợ (`công nợ`, `nợ`, `debt`, `outstanding`, `receivable`, `còn phải thu`, `còn thiếu`, `unpaid`): **72 dòng code/tài liệu**.
- Phân loại xử lý:
  - **DELETE completely (Xóa sạch hoàn toàn):** 28 vị trí (các hàm tính tổng nợ khách hàng, cột `Công nợ` trên CRM, bộ lọc `debt`, cảnh báo nợ khi đặt sân, nhãn "Đơn đang nợ").
  - **KEEP if payment of current booking (Giữ lại vì là thanh toán ca hiện tại):** 18 vị trí (tiền còn phải thu 70% tại quầy lúc nhận sân / in hóa đơn / quét QR check-in, tính năng chia tiền theo nhóm `team_split`).
  - **UNCLEAR / RENAME (Đổi tên ngữ nghĩa cho chuẩn):** 6 vị trí (báo cáo tài chính `rpt-f1-debt` đổi thành `Chưa thu / Còn lại`, tránh ngộ nhận là nợ đọng xấu).
  - **KEEP / FALSE POSITIVE (Giữ nguyên - không phải công nợ khách hàng):** 20 vị trí (từ ngữ "còn thiếu cột", mã test booking `[TEST]P11_UNPAID_06`, chính sách hủy `unpaid_free_cancel`).

---

## 2. BẢNG SCAN CHI TIẾT THEO TỪNG FILE VÀ HƯỚNG XỬ LÝ

| STT | File:Dòng | Nội dung / Chức năng | Phân loại | Hướng xử lý chi tiết |
|:---:|:---|:---|:---:|:---|
| **A** | **HỒ SƠ KHÁCH HÀNG & CRM (BACKEND)** | | | |
| 1 | `api/admin_crm.php:79` | Query `COALESCE(SUM(CASE WHEN b.remaining_amount > 0 ...), 0) AS debt_amount` trong API `crm_customers` | **DELETE completely** | Bỏ hoàn toàn trường `debt_amount` khỏi câu SELECT tổng hợp khách hàng. |
| 2 | `api/admin_crm.php:164` | Gán `'debtAmount' => (int)$row['debt_amount']` vào payload trả về | **DELETE completely** | Xóa trường `debtAmount` khỏi JSON trả về của khách hàng. |
| 3 | `api/admin_crm.php:213-215` | Logic lọc khách theo nợ: `if ($tierFilter === 'debt') return $c['debtAmount'] > 0;` | **DELETE completely** | Bỏ bộ lọc `debt`, không hỗ trợ lọc khách hàng theo nợ. |
| 4 | `api/admin_crm.php:278-280` | Tính lũy kế `$debtAmount += $b['remaining_amount']` trong API `customer_detail` | **DELETE completely** | Xóa khối tính nợ trong API xem chi tiết khách hàng. |
| 5 | `api/admin_crm.php:321` | Trả về `'debtAmount' => $debtAmount` trong modal chi tiết CRM | **DELETE completely** | Xóa trường `debtAmount` khỏi API chi tiết khách hàng. |
| 6 | `api/admin_crm.php:555` | Khởi tạo `'debt_amount' => 0` trong `crm_search_customers` | **DELETE completely** | Xóa trường `debt_amount` trong kết quả tìm kiếm khách hàng. |
| 7 | `api/admin_crm.php:577` | Query tính `SUM(remaining_amount) AS debt_amount` theo SĐT | **DELETE completely** | Bỏ `debt_amount` khỏi query thống kê của tìm kiếm. |
| 8 | `api/admin_crm.php:596` | Gán `$item['debt_amount'] = (int)$statsMap...` | **DELETE completely** | Xóa gán `debt_amount`. |
| 9 | `api/services/booking_queries.php:36-37` | Query `debt_count` và `debt_amount` trong `check_phone_noshow` | **DELETE completely** | Bỏ 2 biểu thức tính nợ trong query kiểm tra SĐT. |
| 10 | `api/services/booking_queries.php:43-44` | Đọc `$debtCount` và `$debtAmount` từ kết quả query | **DELETE completely** | Bỏ đọc 2 biến này. |
| 11 | `api/services/booking_queries.php:72-73` | Trả `'debtCount' => $debtCount, 'debtAmount' => $debtAmount` | **DELETE completely** | Xóa hẳn 2 trường này khỏi JSON trả về khi nhập SĐT. |
| **B** | **GIAO DIỆN KHÁCH HÀNG & CRM (FRONTEND)** | | | |
| 12 | `portal-admin/partials/tab6_customers.php:7` | Phụ đề: "công nợ chưa thu, cảnh báo bùng sân..." | **DELETE completely** | Sửa phụ đề thành: "Theo dõi lịch sử thi đấu, cảnh báo bùng sân (No-Show) và phân hạng hội viên". |
| 13 | `portal-admin/partials/tab6_customers.php:32` | Header bảng: `<th class="py-3 px-4 text-right">Công nợ</th>` | **DELETE completely** | Xóa hoàn toàn thẻ `<th>` này (giảm số cột từ 9 xuống 8 cột). |
| 14 | `js/admin_customers.js:86` | Parse `debtAmount: Number(c.debtAmount ?? c.debt_amount ?? 0)` | **DELETE completely** | Xóa trường `debtAmount` khỏi object mapping khách hàng. |
| 15 | `js/admin_customers.js:98-99` | Lọc `currentCustomerFilter === 'debt'` | **DELETE completely** | Xóa nhánh lọc `debt`. |
| 16 | `js/admin_customers.js:181` | Lọc fallback `currentCustomerFilter === 'debt'` | **DELETE completely** | Xóa nhánh lọc fallback. |
| 17 | `js/admin_customers.js:193` | Sắp xếp danh sách: `(b.debtAmount - a.debtAmount)` | **DELETE completely** | Bỏ tiêu chí nợ trong sắp xếp ưu tiên. |
| 18 | `js/admin_customers.js:254` | Cột dữ liệu `<td>`: hiển thị `Number(c.debtAmount) + 'đ'` | **DELETE completely** | Xóa toàn bộ thẻ `<td>` hiển thị công nợ này. |
| 19 | `js/admin_customers.js:328-331` | Card "Công nợ hiện tại / Cần thu tại sân" trong CRM modal | **DELETE completely** | Xóa card này khỏi modal CRM; thay bằng card Điểm tích lũy hoặc trạng thái hội viên. |
| 20 | `js/admin.js:464` | Tab title: `'customers': 'Hồ sơ & Công nợ'` | **DELETE completely** | Đổi thành: `'customers': 'Hồ sơ khách hàng'` hoặc `'Khách hàng & CRM'`. |
| **C** | **CẢNH BÁO NỢ KHI ĐẶT SÂN & TỔNG QUAN** | | | |
| 21 | `portal-admin/partials/tab1_kpi.php:78` | Nút tab: `<button id="ov-filter-debt">Đơn đang nợ</button>` | **DELETE completely** | Xóa nút lọc "Đơn đang nợ" khỏi thanh công cụ Tab 1. |
| 22 | `js/admin_overview.js:289, 294, 498-508` | Bộ lọc `'debt'` và hàm `isDebt` trong Tab Tổng quan | **DELETE completely** | Xóa nhánh filter `'debt'` và hàm `isDebt`. |
| 23 | `portal-admin/partials/tab3_quick_booking.php:27` | Comment: `<!-- Hộp cảnh báo No-Show / Công nợ ngay dưới ô SĐT -->` | **DELETE completely** | Cập nhật comment (bỏ từ Công nợ). |
| 24 | `html/booking.html:232` | Comment: `<!-- Hộp cảnh báo No-Show / Công nợ ngay dưới ô SĐT của khách -->` | **DELETE completely** | Cập nhật comment. |
| 25 | `js/admin_ops.js:402, 435` | Đọc `debtAmount` và hiển thị cảnh báo: `Đang còn công nợ chưa thu...` | **DELETE completely** | Xóa cảnh báo công nợ khi nhập SĐT tại quầy (chỉ giữ cảnh báo No-show / Blacklist). |
| 26 | `js/booking.js:59, 80` | Đọc `debtAmount` và hiện cảnh báo: `SĐT này hiện còn đơn nợ chưa thanh toán` | **DELETE completely** | Xóa cảnh báo nợ trên giao diện đặt sân online của khách. |
| 27 | `js/db_bookings.js:221` | Ghi log `COLLECT_PAYMENT`: `"Còn nợ: ...đ"` | **DELETE completely** | Đổi chữ `"Còn nợ"` thành `"Còn lại"`. |
| **D** | **BÁO CÁO TÀI CHÍNH & IN HÓA ĐƠN (GIỮ / CHUẨN HÓA NGỮ NGHĨA)** | | | |
| 28 | `portal-admin/partials/tab8_reports.php:50` | Công thức 1: `Tiền mặt + Chuyển khoản + Còn nợ = Tổng` (`rpt-f1-debt`) | **UNCLEAR / RENAME** | Trong kế toán, đây là phần doanh thu 70% của các ca chưa diễn ra. Đổi nhãn hiển thị thành `Chưa thu` hoặc `Còn lại` để không gây hiểu lầm là nợ xấu. |
| 29 | `portal-admin/partials/tab8_reports.php:190, 206` | Phụ đề & Cột `<th class="py-2.5 px-3 text-right">Còn nợ</th>` | **UNCLEAR / RENAME** | Đổi tên cột từ `Còn nợ` thành `Chưa thu (70%)` hoặc `Còn lại`. |
| 30 | `api/services/admin_finance_reports.php:424, 437` | Biến `'debt' => $debtRevenue` trong công thức tài chính | **KEEP / RENAME** | Giữ logic tính toán nhưng chuẩn hóa alias thành `uncollectedRevenue` hoặc giữ tương thích cho test F1. |
| 31 | `js/admin_reports.js:400` | Gán `rpt-f1-debt` theo `f1.debt` | **KEEP / RENAME** | Giữ đồng bộ hiển thị với Tab 8. |
| 32 | `js/admin_invoices.js:116` | Text: `<span>SỐ TIỀN CÒN PHẢI THU:</span>` | **KEEP if payment of current booking** | Đây là phiếu in hóa đơn cho ca đặt sân hiện tại để thu nốt tiền tại sân. Rất chuẩn xác, giữ nguyên. |
| 33 | `js/admin_qr.js:340` & `scripts/patch_admin_qr.js:400` | Text: `Còn phải thu: <b>...đ</b>` khi quét vé QR | **KEEP if payment of current booking** | Nhân viên quầy cần biết số tiền phải thu nốt của khách khi khách đến sân. Giữ nguyên. |
| 34 | `api/sepay_webhook.php:466` | Thông báo Telegram: `(Còn thiếu: ... đ)` | **KEEP if payment of current booking** | Báo động khi khách chuyển khoản thiếu tiền cọc của đơn đang đặt. Giữ nguyên. |
| 35 | `api/team_split.php:73` & `api/team_split_helper.php:21,45,50` | Biến `outstandingAmount` | **KEEP** | Tính năng chia tiền theo nhóm (Team Split); `outstandingAmount` là số tiền các thành viên trong nhóm chưa nộp. Không phải công nợ khách hàng. |
| 36 | `js/team_split.js:64,71,72,75` | Biển `outstanding`, text `Còn thiếu theo thành viên` | **KEEP** | Giữ nguyên cho tính năng chia hóa đơn trận đấu. |
| **E** | **TEST SUITE & TÀI LIỆU DỰ ÁN** | | | |
| 37 | `tests/test_admin_customer_table.js:19, 53, 58, 63` | Fixture mock `debt_amount: 4382000`, test 9 cột và kiểm tra chuỗi `4.382.000đ` | **DELETE completely** | Nguồn gốc con số 4.382.000đ! Sửa test: xóa trường `debt_amount`, giảm headerCount từ 9 xuống 8 cột, bỏ assert `4.382.000đ`. |
| 38 | `tests/test_part_b_crm.php:35, 119-125` | Test thẻ `<th>` CRM và kiểm tra `remainingRevenue` trong Báo cáo | **UPDATE / KEEP** | Bổ sung assert xác nhận `<th class="py-3 px-4 text-right">Công nợ</th>` đã bị xóa hoàn toàn khỏi `tab6_customers.php`. Giữ nguyên assert `remainingRevenue`. |
| 39 | `docs/DANH_SACH_TAI_KHOAN.md:91` | Mô tả Tab 6: "Tìm kiếm SĐT, xem nợ/điểm..." | **UPDATE** | Sửa thành: "Tìm kiếm SĐT, xem điểm/lịch sử đặt...". |
| 40 | `docs/TAI_KHOAN_ADMIN.md:102` | Mô tả Tab 6: "...bổ sung 2 cột Số điện thoại & Tổng nợ..." | **UPDATE** | Bỏ cụm từ "& Tổng nợ". |
| 41 | `ARCHITECTURE.md:42` | Ghi chú `admin_crm.php # API CRM khách hàng, nợ chưa thu...` | **UPDATE** | Sửa thành: `admin_crm.php # API CRM khách hàng, lịch sử đặt sân...`. |
| 42 | `TASKS.md:34` | Task 3.7: "...theo dõi công nợ" | **UPDATE** | Đổi thành: "...xóa bỏ công nợ, quản lý hội viên". |

---

## 3. KẾT QUẢ AUDIT DATABASE SCHEMA VỀ CÔNG NỢ
- Đã rà soát toàn bộ 23 bảng trong MySQL cục bộ (`c:\laragon\www\Quan_Ly_San_Bong`):
  1. **Không có bất kỳ bảng riêng nào dành cho công nợ** (không có `debts`, `customer_debts`, `debt_records`, `debt_logs`).
  2. **Không có bất kỳ cột công nợ riêng biệt nào** (như `debt`, `debt_amount`, `total_debt`) trong bảng `users` hoặc `customer_crm`.
  3. Bảng `bookings` chỉ có cột `remaining_amount INT NOT NULL DEFAULT 0`. Cột này không phải là cột "nợ xấu", mà là bộ đệm lưu số tiền còn lại phải thu khi khách thanh toán cọc 30% (70% còn lại thanh toán tại sân lúc nhận sân). Tuy nhiên, code cũ trong `admin_crm.php` đã gom `SUM(b.remaining_amount)` của tất cả các đơn và gán thành `debt_amount` trên giao diện khách hàng.
- **Migration 016 được tạo ra để:**
  - Thiết lập cơ chế phòng hộ (safety pre-checks): Tự động kiểm tra và DROP bất kỳ bảng hoặc cột nợ nào nếu có tồn tại (`customer_crm.debt_amount`, `customer_crm.total_debt`, `users.debt_amount`, `bookings.is_debt`).
  - Chuẩn hóa và đối soát sạch sẽ dữ liệu nợ treo trong `bookings`.

---

## 4. MIGRATION FILE ĐÃ SOẠN THẢO VÀ KIỂM THỬ THÀNH CÔNG
Đã tạo file migration idempotent tại cả 2 đường dẫn:
1. `database/migrations/016_destructive_remove_debt_columns.sql`
2. `migrations/016_destructive_remove_debt_columns.sql`

**Nội dung chính của Migration 016:**
- Hướng dẫn chi tiết lệnh sao lưu dự phòng an toàn qua `mysqldump` và phương án phục hồi (rollback).
- DROP an toàn nếu tồn tại các bảng nợ legacy.
- ALTER TABLE an toàn nếu tồn tại các cột nợ trên `customer_crm`, `users`, `bookings` bằng kỹ thuật Dynamic SQL `DO 0` (tương thích 100% cả MySQL CLI và PHP PDO unbuffered query).
- Dọn dẹp dữ liệu:
  - Cập nhật tất cả các đơn `status IN ('Hoàn thành', 'completed')` về `remaining_amount = 0` và `paid_amount = total_price`.
  - Cập nhật các đơn đã hủy hoặc No-show về `remaining_amount = 0`.
  - Chuẩn hóa các đơn còn lại về đúng `remaining_amount = GREATEST(0, total_price - paid_amount)`.
  - Ghi audit log hệ thống về đợt dọn nợ `MIGRATION_016_PURGE_DEBT`.
- **Đã kiểm thử thực tế trên CSDL MySQL cục bộ: 38/38 statements PASS hoàn toàn, chạy 2 lần liên tiếp đều PASS 100% (chuẩn Idempotent).**

---

## 5. KẾT QUẢ ĐỐI SOÁT CÁC CON SỐ CÔNG NỢ & NGUỒN GỐC DỮ LIỆU
### 5.1 Nguồn gốc các con số 4.382.000đ, 553.000đ, 343.000đ
1. **Con số `4.382.000đ`:**
   - Xuất phát trực tiếp từ file test `tests/test_admin_customer_table.js` (dòng 19 và 58):
     ```javascript
     const fixture = {
       phone: '0912345678',
       customer_name: 'Khách kiểm tra',
       total_spent: 5745000,
       debt_amount: 4382000, // <--- NGUỒN GỐC CHÍNH XÁC
       points: 120,
       ...
     };
     assert(tbody.innerHTML.includes('4.382.000đ'));
     ```
   - Đây là dữ liệu mock test được commit vào ngày 16/11/2026 trong commit `43eed35`. Khi test chạy, fixture này render lên màn hình và kiểm tra sự xuất hiện của `4.382.000đ` tại cột "Công nợ".
2. **Con số `553.000đ` và `343.000đ`:**
   - Trong CSDL thực tế, khi khách hàng đặt sân có lẻ tiền dịch vụ/giờ cao điểm, query cũ trong `admin_crm.php` tính tổng `remaining_amount` của các ca đặt (ví dụ: ca 350.000đ cọc 30% còn lại 245.000đ + tiền dịch vụ, ca 250.000đ cọc 75.000đ còn lại 175.000đ).
   - Khi có nhiều đơn đặt chưa thanh toán đủ, các số dư này cộng dồn thành các khoản nợ hiển thị trên thẻ CRM.

### 5.2 Danh sách các đơn chưa thanh toán đủ hiện có trong DB cục bộ
| ID | Mã đơn | Tên khách hàng | SĐT | Ngày đá | Tổng tiền | Đã trả | Còn lại | Trạng thái | TT Thanh toán |
|:---:|:---|:---|:---:|:---:|:---:|:---:|:---:|:---|:---|
| 504 | ASFF120145 | Nguyen Van A | 0912345678 | 2026-11-16 | 250.000đ | 0đ | 250.000đ | Đã xác nhận | Chờ duyệt cọc |
| 608 | [TEST]P5_C_02 | Khách [TEST] Sân P5-C #3 | 0982905739 | 2026-11-16 | 350.000đ | 105.000đ | 245.000đ | Đã xác nhận | Đã cọc 30% |
| 609 | [TEST]P5_C_03 | Khách [TEST] Sân P5-C #4 | 0981628458 | 2026-11-17 | 250.000đ | 0đ | 250.000đ | Giữ chỗ | Chờ cọc 30% |
| 611 | [TEST]P5_D_05 | Khách [TEST] Sân P5-D #6 | 0983871774 | 2026-11-16 | 350.000đ | 105.000đ | 245.000đ | Đã xác nhận | Đã cọc 30% |
| 612 | [TEST]P5_D_06 | Khách [TEST] Sân P5-D #7 | 0984312414 | 2026-11-17 | 250.000đ | 0đ | 250.000đ | Giữ chỗ | Chờ cọc 30% |
| 614 | [TEST]P5_E_08 | Khách [TEST] Sân P5-E #9 | 0983987373 | 2026-11-16 | 350.000đ | 105.000đ | 245.000đ | Đã xác nhận | Đã cọc 30% |
| 615 | [TEST]P5_E_09 | Khách [TEST] Sân P5-E #10 | 0987609107 | 2026-11-17 | 250.000đ | 0đ | 250.000đ | Giữ chỗ | Chờ cọc 30% |
| 618 | [TEST]P11_CONF_03 | CLB Sân 11 [TEST] | 0979251681 | 2026-11-16 | 1.500.000đ | 450.000đ | 1.050.000đ | Đã xác nhận | Đã cọc 30% |
| 619 | [TEST]P11_UNDER_04 | CLB Sân 11 [TEST] | 0976154299 | 2026-11-16 | 1.500.000đ | 300.000đ | 1.200.000đ | Chờ duyệt cọc | Chờ duyệt cọc |
| 620 | [TEST]P11_OVER_05 | CLB Sân 11 [TEST] | 0971830970 | 2026-11-17 | 1.500.000đ | 600.000đ | 900.000đ | Chờ duyệt cọc | Chờ duyệt cọc |
| 621 | [TEST]P11_UNPAID_06 | CLB Sân 11 [TEST] | 0974366627 | 2026-11-17 | 1.500.000đ | 0đ | 1.500.000đ | Chờ duyệt cọc | Chờ duyệt cọc |

*Ghi chú: Toàn bộ 4 đơn đã hoàn thành trong DB (ID 607, 610, 613, 616) đều đã thu đủ 100% tiền và `remaining_amount = 0`.*

### 5.3 Câu truy vấn SQL để làm sạch / đối soát dữ liệu (Reconciliation Queries)
```sql
-- 1. Đảm bảo toàn bộ đơn hoàn thành không bị treo số dư nợ
UPDATE bookings 
SET paid_amount = total_price, remaining_amount = 0, payment_status = 'Đã thanh toán 100%' 
WHERE status IN ('Hoàn thành', 'completed') AND (remaining_amount > 0 OR paid_amount < total_price);

-- 2. Triệt tiêu số dư nợ đối với các đơn đã hủy hoặc No-Show
UPDATE bookings 
SET remaining_amount = 0 
WHERE status IN ('Đã hủy', 'Khách chưa đến') 
   OR payment_status IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc');

-- 3. Chuẩn hóa số tiền còn lại phải thu cho các đơn đang chờ đá / đang chơi
UPDATE bookings 
SET remaining_amount = GREATEST(0, total_price - paid_amount) 
WHERE status NOT IN ('Đã hủy', 'Khách chưa đến', 'Hoàn thành', 'completed');
```

---

## 6. KHUYẾN NGHỊ PHỐI HỢP CHO CÁC BƯỚC TIẾP THEO
- **Gửi `@backend_crm`:**
  - Sửa `api/admin_crm.php` (bỏ `debt_amount`, bỏ `debtAmount`, bỏ filter `debt`).
  - Sửa `api/services/booking_queries.php` (bỏ `debtCount`, `debtAmount` khỏi `check_phone_noshow`).
  - Bổ sung validation chặn chuyển đơn sang `completed` nếu `total_price > paid_amount`.
  - Thêm action `adjust_discount` cho admin kèm ghi audit log.
- **Gửi `@frontend_crm`:**
  - Xóa cột `<th>Công nợ</th>` tại `portal-admin/partials/tab6_customers.php:32` (bảng CRM còn 8 cột).
  - Sửa `js/admin_customers.js` (xóa `<td>` công nợ, xóa card công nợ trong modal, bỏ filter `debt`).
  - Xóa nút lọc `Đơn đang nợ` tại `tab1_kpi.php:78` và logic trong `js/admin_overview.js`.
  - Cập nhật test `tests/test_admin_customer_table.js` (headerCount = 8, bỏ assert `4.382.000đ`).

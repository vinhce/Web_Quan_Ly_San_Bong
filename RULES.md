# RULES — QUY TẮC CỨNG DÀNH CHO AI & LẬP TRÌNH VIÊN (SÂN BÓNG PRO)

## 1. RÀNG BUỘC CỨNG (HARD CONSTRAINTS)

### 1.1. Git & Commit
- **Bảo gì làm nấy:** TUYỆT ĐỐI KHÔNG tự động `git commit`, `git push`, hoặc deploy/upload lên hosting trừ khi người dùng yêu cầu trực tiếp từng bước.
- **Quy tắc Commit Message:** Khi người dùng yêu cầu commit, BẮT BUỘC phải dừng lại hỏi người dùng muốn đặt commit message là gì. Chỉ commit khi người dùng đã cung cấp message hoặc xác nhận.
- **Khởi đầu phiên làm việc:** Luôn chạy `git status` trước tiên để nắm rõ các file đang sửa dở trong repo; không can thiệp đè lên các thay đổi ngoài phạm vi.
- **Cấm lệnh phá lịch sử:** Cấm tuyệt đối `git reset --hard`, `git clean -fd`, `git restore .`, `git push --force`.
- **Cấm liên kết:** Tuyệt đối không chạm vào hay liên kết tới repo `Nhom-666`.

### 1.2. Sửa Mã Nguồn Phẫu Thuật & Giới Hạn File
- Chỉ sửa đúng dòng/hàm thuộc phạm vi nhiệm vụ được giao.
- Tuyệt đối không viết lại toàn bộ file đang chạy ổn định.
- Tuyệt đối không dùng code placeholder gây mất mát tính năng (như `// ... existing code ...`).
- **GIỚI HẠN DÒNG & COMMENT TỐI GIẢN:** Mỗi file tuyệt đối không dài quá 666 dòng (nếu vượt phải tách module/partials/service). Chú thích chức năng phải tối giản, súc tích (1 dòng), TUYỆT ĐỐI KHÔNG vẽ khung ascii, hộp trang trí (`/* ===...=== */`, `┌──┐`, v.v.) gây phình to file.
- **QUY TẮC ĐÓNG GÓI JAVASCRIPT BUNDLE:** File `js/app.js` là file bundle được sinh ra tự động bởi lệnh:
  ```bash
  node scripts/build_app_bundle.js
  ```
  Nguồn gồm: `js/vendor/qrcode.min.js` + `js/helpers.js` + `js/db.js` + `js/ui.js`.
  $\rightarrow$ Luôn sửa ở các file nguồn con tương ứng, sau đó chạy lệnh build bundle. **TUYỆT ĐỐI KHÔNG sửa tay trực tiếp trong file `js/app.js`**.

### 1.3. An Toàn Dữ Liệu & Database
- Nghiêm cấm chạy các lệnh phá hủy dữ liệu (`DROP TABLE`, `TRUNCATE`, `migrate:fresh`).
- Mọi thao tác ghi nhiều bảng liên quan đến đặt sân/thanh toán phải được bọc trong MySQL Transaction (`BEGIN TRANSACTION ... COMMIT`).
- Chống đặt trùng slot (Race Condition) bằng `SELECT ... FOR UPDATE` hoặc ràng buộc logic kiểm tra trạng thái trước khi insert đơn.
- Các thay đổi cấu trúc bảng mới phải tạo file migration trong `database/migrations/` và tuân thủ marker an toàn (`/logs/.schema_v12_booking_status_ready`).

### 1.4. Bảo Mật Web & Xác Thực
- **Không hardcode Secret:** API Token SePay, DB Password, Secret Turnstile, Mailer Secret phải được đọc từ biến môi trường (`.env` nằm ngoài thư mục web công khai).
- **Mật khẩu:** Bắt buộc băm bằng thuật toán hiện đại `Argon2id` (`PASSWORD_ARGON2ID`).
- **Phiên làm việc & CSRF:** Phiên đăng nhập giới hạn tối đa 2 giờ; mọi request thay đổi dữ liệu (POST/PUT/DELETE) đều phải có `X-CSRF-Token` hợp lệ.
- **Phân quyền RBAC:** Cổng `portal-admin/` kiểm tra quyền ở tầng server qua `$_SESSION['user']['role'] === 'admin'|'manager'|'staff'`; không dựa vào việc ẩn nút bấm ở client.
- **XSS & SQL Injection:** Tham số hóa 100% câu truy vấn PDO; escape toàn bộ dữ liệu người dùng trước khi in ra HTML bằng `htmlspecialchars(..., ENT_QUOTES, 'UTF-8')`.

### 1.5. Quy Ước Thuật Ngữ & Ngôn Ngữ
- Thuật ngữ trạng thái ca đá quá 15 phút không đến nhận sân: Thống nhất dùng tiếng Việt chuẩn **"Khách chưa đến"** (không dùng từ "No-Show" hay "Vắng mặt").
- Mã giao dịch chuyển khoản VietQR quy ước theo loại sân:
  - Sân 5 người: `ASFF` + 6 số
  - Sân 7 người: `ASFS` + 6 số
  - Sân 11 người: `ASFE` + 6 số

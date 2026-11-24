# RULES — QUY TẮC BẮT BUỘC KHI PHÁT TRIỂN (SÂN BÓNG PRO)

## 1. Git & Quy trình làm việc
- **Bảo gì làm nấy:** Tuyệt đối không tự ý `git commit`, `git push` hoặc upload lên hosting khi người dùng chưa yêu cầu trực tiếp.
- **Commit message:** Khi được yêu cầu commit, phải hỏi hoặc xác nhận message với người dùng trước khi chạy (trừ khi người dùng giao quyền tự đặt rõ ràng).
- **Mở đầu phiên:** Chạy `git status` trước tiên để nắm các thay đổi đang có, không ghi đè file ngoài phạm vi.
- **Cấm lệnh phá lịch sử:** Cấm tuyệt đối `git reset --hard`, `git clean -fd`, `git restore .`, `git push --force`.
- **Cấm liên kết:** Tuyệt đối không chạm vào hay liên kết tới repo `Nhom-666`.

## 2. Chỉnh sửa mã nguồn & Kích thước file
- **Sửa phẫu thuật:** Chỉ sửa đúng đoạn thuộc nhiệm vụ; không viết lại cả file ổn định và không dùng comment placeholder kiểu `// ... existing code ...`.
- **Giới hạn `<= 666` dòng/file:** Nếu vượt quá phải tách module/service/partial; comment tối giản 1 dòng giải thích lý do, không vẽ khung ASCII trang trí.
- **Không sửa tay `js/app.js`:** Luôn sửa trong `js/helpers.js`, `js/db.js`, `js/ui.js` rồi chạy `node scripts/build_app_bundle.js` để đóng gói lại.

## 3. An toàn Cơ sở dữ liệu
- **Cấm phá dữ liệu:** Nghiêm cấm `DROP TABLE`, `TRUNCATE`, `migrate:fresh`.
- **Transaction & Chống trùng:** Mọi thao tác ghi nhiều bảng hoặc đặt/hủy/kiểm tra thanh toán/chỉnh điểm phải bọc Transaction kèm khóa dòng `SELECT ... FOR UPDATE`.
- **Migration Idempotent (`001..023`):** Hiện có **24 file migration** (mốc `018` gồm 2 file) kèm chuỗi marker trong `config/database.php` tới `logs/.schema_v23_audit_inverted_index_ready`; luôn kiểm tra `INFORMATION_SCHEMA` trước khi sửa cấu trúc bảng.

## 4. Bảo mật Web & Phân quyền
- **Secret ngoài webroot:** Mọi key/mật khẩu DB, SePay, Turnstile, Mail đọc từ `.env`, không hardcode trong code/tài liệu.
- **Mật khẩu & Phiên:** Băm **Argon2id** (`PASSWORD_ARGON2ID`); phiên sống tối đa **24 giờ (`86400 giây`)**; trang động bắt buộc `Cache-Control: private, no-store`; mọi thao tác ghi dùng `X-CSRF-Token`.
- **RBAC Server-side:** `/portal-admin` kiểm tra vai trò `admin|manager|staff` ở server (`security_helper.php`); tách biệt xác thực khách đặt sân qua `currentCustomer()`.
- **SQLi & XSS:** 100% PDO Prepared Statements; escape HTML đầu ra bằng `htmlspecialchars(..., ENT_QUOTES, 'UTF-8')` và `escapeHTML()`.

## 5. Thuật ngữ, Nhật ký & Điểm thưởng
- **Thuật ngữ chuẩn:** Trạng thái khách quá 15 phút không đến nhận sân bắt buộc viết là **"Khách chưa đến"**; đầu mã giao dịch VietQR cố định: Sân 5 `ASFF`, Sân 7 `ASFS`, Sân 11 `ASFE` (+ 6 số).
- **Audit Log sạch & bảo mật:** Ghi `AdminLogService::record()` / `logAdminChange()` (đồng bộ `AdminLogIndexer`) trong cùng transaction; bắt buộc so sánh diff để **không ghi log rác** khi dữ liệu không đổi; che SĐT/CCCD/STK và tuyệt đối không lưu mật khẩu/token/secret.
- **Điều chỉnh điểm hội viên:** Không cập nhật thẳng `users.points` bỏ qua lịch sử; phải ghi qua `points_log` trong transaction `FOR UPDATE`, bắt buộc nhập lý do và chặn điểm âm.

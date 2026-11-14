# Báo cáo lỗi kiểm thử local — Sân Bóng Pro

- Ngày kiểm thử: 14/11/2026.
- Địa chỉ kiểm thử: `http://localhost/Quan_Ly_San_Bong/`.
- Môi trường: Windows, Apache 2.4.69, PHP 8.3.36, Node.js 22.23.4.
- Phạm vi: kiểm tra cú pháp PHP/JavaScript, phản hồi HTTP, đường dẫn tài nguyên, cấu hình và mã kiểm thử hiện có.
- Không sửa mã nguồn, cấu hình, không chạy thao tác cập nhật dữ liệu nghiệp vụ. File này là tài liệu báo cáo được tạo theo yêu cầu.

## 1. Lỗi đã xác nhận

### BUG-01 — JavaScript trả 404 khi chạy trong thư mục con

- Mức độ: Cao.
- Vị trí tham khảo: `index.html:312–315`, `html/fields.html:141–144`.
- Các thẻ script sử dụng đường dẫn bắt đầu bằng `/js/`, ví dụ `/js/app.js?v=20261112_v34`.
- Với địa chỉ local đang kiểm thử, trình duyệt yêu cầu `http://localhost/js/app.js?v=20261112_v34` và nhận HTTP 404.
- File thực tế tại `http://localhost/Quan_Ly_San_Bong/js/app.js?v=20261112_v34` trả HTTP 200.
- Ảnh hưởng: các script không tải được; các chức năng phụ thuộc vào chúng có thể không khởi tạo. Chưa kiểm chứng tương tác bằng trình duyệt tự động.
- Cách tái hiện: mở trang chủ hoặc `/Quan_Ly_San_Bong/fields`, xem các yêu cầu `/js/` trong Network.
- Kết quả mong đợi: đường dẫn script trỏ tới tài nguyên của đúng dự án và trả HTTP 200.
- Nhận định: lỗi được xác nhận trong cách chạy local bằng thư mục con; chưa kết luận lỗi tương tự khi triển khai ở gốc tên miền.

### BUG-02 — CSS trả 404 trên các trang URL gọn

- Mức độ: Cao.
- Vị trí tham khảo: `html/fields.html:12`.
- Trang dùng đường dẫn CSS tương đối `../css/style.css?v=20261112_v34`.
- Khi mở `http://localhost/Quan_Ly_San_Bong/fields`, đường dẫn này được phân giải thành `http://localhost/css/style.css?v=20261112_v34`, trả HTTP 404.
- File `http://localhost/Quan_Ly_San_Bong/css/style.css?v=20261112_v34` trả HTTP 200.
- Ảnh hưởng: stylesheet nội bộ không tải, có thể làm mất các định dạng riêng của ứng dụng. Chưa đánh giá hình ảnh giao diện bằng trình duyệt.
- Cách tái hiện: mở URL gọn `/Quan_Ly_San_Bong/fields`, kiểm tra yêu cầu CSS trong Network.
- Kết quả mong đợi: CSS tải thành công trên URL gọn.
- Ngoại lệ cần lưu ý: `html/login.html` hiện có đoạn JavaScript sinh thẻ `<base>`. Công cụ phân tích HTML tĩnh không thực thi đoạn này, nên không dùng kết quả phân giải tĩnh để kết luận trang login mắc lỗi tương tự.

### BUG-03 — Chuyển hướng Admin làm mất đường dẫn thư mục dự án

- Mức độ: Cao.
- Vị trí: `.htaccess:41`.
- Yêu cầu `http://localhost/Quan_Ly_San_Bong/html/admin.html` trả HTTP 301 với `Location: http://localhost/portal-admin/`.
- Địa chỉ đích `http://localhost/portal-admin/` trả HTTP 404.
- Nguyên nhân trong cấu hình: đích chuyển hướng `/portal-admin/` bắt đầu từ gốc host, không giữ tiền tố `/Quan_Ly_San_Bong`.
- Ảnh hưởng: truy cập Admin qua đường dẫn cũ bị chuyển tới trang không tồn tại trong môi trường local này.
- Cách tái hiện: truy cập URL cũ nêu trên và theo dõi chuyển hướng.
- Kết quả mong đợi: chuyển tới cổng Admin thuộc đúng dự án.
- Phạm vi xác nhận: đường dẫn Admin cũ; chưa kiểm thử đăng nhập hay quyền truy cập cổng Admin thực tế.

## 2. Phát hiện cần xem xét

### OBS-01 — File mã kiểm thử Python có thể tải công khai

- Yêu cầu `http://localhost/Quan_Ly_San_Bong/test_e2e_sanbong.py` trả HTTP 200.
- File chứa mã kiểm thử và đường dẫn môi trường phát triển.
- Đây là phát hiện về phạm vi tài nguyên được phục vụ; chưa xác nhận có dữ liệu bí mật bị lộ và chưa kiểm tra trên production.
- Đề xuất: xem xét loại file kiểm thử khỏi phạm vi phục vụ công khai hoặc chặn truy cập khi triển khai. Chưa thực hiện thay đổi.

### OBS-02 — Bộ E2E chưa chạy được với môi trường đã kiểm tra

- `test_e2e_sanbong.py:6` đặt URL đích là `http://127.0.0.1:8080`.
- Kết nối tới cổng 8080 thất bại; Apache đang phục vụ dự án qua cổng mặc định tại URL ghi đầu báo cáo.
- Python 3.12 được kiểm tra không có module Playwright.
- Đây là trở ngại chạy bộ kiểm thử, không phải bằng chứng chức năng nghiệp vụ bị lỗi.

## 3. Kết quả kiểm tra đạt

| Hạng mục | Kết quả |
| --- | --- |
| Cú pháp toàn bộ file PHP được quét trong dự án | 43/43 hợp lệ qua `php -n -l` |
| Cú pháp JavaScript trong thư mục `js/` | 23/23 hợp lệ qua `node --check` |
| HTTP các trang chính | 9/9 trả HTTP 200 |
| Extension PHP cần thiết được kiểm tra | Có `pdo_mysql`, `curl`, `openssl` |
| Tài nguyên ở đường dẫn đúng | JS bundle và CSS được kiểm tra trả HTTP 200 |

Chín trang được kiểm tra: trang chủ, `fields`, `booking`, `checkout`, `success`, `history`, `login`, `field-detail`, `matchmaking`. HTTP 200 chỉ xác nhận tài liệu HTML được phục vụ; không chứng minh JavaScript hoặc chức năng nghiệp vụ hoạt động.

## 4. Giới hạn và nội dung chưa kiểm thử

- Chưa chạy trình duyệt tự động, chưa xác nhận lỗi console hoặc bố cục trên desktop/mobile.
- Chưa kiểm thử đăng nhập, đăng ký, đặt sân, chống đặt trùng, thanh toán, webhook, phân quyền và các thao tác quản trị.
- Không gọi các API có khả năng tự ghi dữ liệu hoặc kích hoạt khởi tạo schema trong quá trình kiểm thử này.
- Không chạy nguyên bộ `tests/security_hardening_test.php`: bộ test có thao tác `UPDATE users` trong transaction rồi rollback; hàm `getDBConnection()` còn gọi `ensureSchemaInitialized()` có thể thay đổi schema. Việc bỏ qua nhằm giữ phạm vi kiểm thử chỉ đọc.
- Log lỗi PHP có các cảnh báo session/header lịch sử. Chưa tái hiện trong phiên này nên không ghi nhận chúng là lỗi hiện tại.
- Không kiểm thử production, không thực hiện giao dịch hay gửi thông báo ra ngoài.

## 5. Trạng thái mã nguồn

- Trước kiểm thử đã có thay đổi ở `html/login.html` (4 dòng thêm, 4 dòng xóa theo Git); thay đổi này không do phiên kiểm thử tạo ra.
- Sau kiểm thử, Git vẫn chỉ báo thay đổi có sẵn ở `html/login.html`, không có file mới tại thời điểm kết thúc kiểm thử.
- Sau yêu cầu lập tài liệu, chỉ tạo thêm `docs/BAO_CAO_LOI_KIEM_THU_LOCAL.md`.
- Các đề xuất trong báo cáo chưa được áp dụng; không sửa file code hoặc cấu hình.

## 6. Kiểm thử lại trên production — 14/11/2026

Địa chỉ: `https://fxzioyr.id.vn/`. Phần này bổ sung kết quả trên hosting, không thay thế bằng chứng của lần kiểm thử local.

### Kết quả HTTP đã xác nhận

| Hạng mục | Kết quả thực tế |
| --- | --- |
| GET trang chủ, fields, booking, checkout, success, history, login, field-detail, matchmaking | 9/9 trả HTTP 200 bằng curl trực tiếp |
| GET JS riêng của 9 trang trên (`/js/index.js`, `/js/fields.js` và các script trang tương ứng, query `v=20261112_v34`) | 9/9 trả HTTP 200 |
| HEAD `/js/app.js`, `/js/api.js`, `/js/data.js` với query `v=20261112_v34` | HTTP 200, Content-Type JavaScript |
| HEAD `/css/style.css?v=20261112_v34` | HTTP 200, Content-Type CSS |
| HEAD `/html/admin.html` | HTTP 301 tới `https://fxzioyr.id.vn/portal-admin/` |
| GET `/portal-admin/` khi chưa đăng nhập | HTTP 302 tới `https://fxzioyr.id.vn/login?redirect=portal-admin` |
| GET `/test_e2e_sanbong.py` | HTTP 404 |
| HEAD `/.env`, `/config/database.php` | HTTP 403 |
| HEAD `/docs/BAO_CAO_LOI_KIEM_THU_LOCAL.md` | HTTP 403 |
| HEAD `/test_pitches.php` | HTTP 404 |

### Đối chiếu các phát hiện trước

- **BUG-01:** Không tái hiện 404 tại các đường dẫn JavaScript đã kiểm tra trên tên miền gốc. Đường dẫn `/js/` phù hợp với cách triển khai hiện tại ở gốc domain. Điều này không chứng minh lỗi chạy trong thư mục con đã được sửa.
- **BUG-02:** CSS tại `/css/style.css` trả 200. Ở URL gọn `/fields` trên gốc domain, `../css/style.css` cũng phân giải về đường dẫn này. Không tái hiện lỗi local ở địa chỉ production đã kiểm tra.
- **BUG-03:** Đường dẫn Admin cũ chuyển tới đúng cổng production; cổng này chuyển khách chưa đăng nhập về login. Không tái hiện lỗi chuyển tới 404 của môi trường local.
- **OBS-01:** File kiểm thử Python không tải được trên production (404); chưa có bằng chứng file này bị phục vụ công khai tại thời điểm kiểm tra lại.
- **OBS-02:** Giới hạn môi trường chạy E2E trên máy kiểm thử vẫn còn; không đánh dấu E2E đạt.

### Hiện tượng lớp kiểm tra truy cập hosting

Một lượt GET bằng Python urllib và curl gọi qua tiến trình con nhận HTTP 403 trên các trang công khai; nội dung có script `/_osh/collect.js`. Các lượt curl trực tiếp sau đó tải được HTML ứng dụng và trả 200 cho cả 9 trang. HTML production có các script `/_osh/collect.js`, `/_rum/beacon.js`, `/_osh-cs/widget.js`.

Phản hồi khác nhau giữa các lượt cho thấy có thể có lớp kiểm tra truy cập của hosting. Chưa xác định chính xác điều kiện gây 403; không kết luận ứng dụng chặn mọi khách truy cập và không coi các lượt 403 ban đầu là bằng chứng các file nội bộ được bảo vệ đúng. Kết quả chặn file nội bộ trong bảng được kiểm tra riêng bằng curl trực tiếp.

### Giới hạn của lần kiểm thử production

- Kiểm tra HTTP và tài nguyên; chưa thực thi JavaScript trong trình duyệt, chưa xác nhận giao diện và lỗi console.
- HTTP 200 của JS/CSS chỉ xác nhận tài nguyên được phục vụ tại các URL đã kiểm tra; chưa chứng minh luồng nghiệp vụ hoạt động.
- Chưa đăng nhập bằng tài khoản thật, chưa xác nhận phân quyền sau đăng nhập, chưa tạo/hủy đơn, chưa thanh toán hoặc gọi webhook.
- Không chạy API có khả năng cập nhật dữ liệu hay tự khởi tạo schema.
- Chưa xác nhận toàn bộ tài nguyên CDN bên ngoài hoặc mọi tham số version đang được các trang sử dụng.
- Không sửa mã nguồn, cấu hình hay triển khai lại. Chỉ bổ sung kết quả vào file báo cáo này.

**Kết luận lần kiểm thử lại:** Chưa phát hiện lỗi 404 đường dẫn đã nêu khi kiểm tra các URL production tương ứng. Chưa đủ dữ liệu để kết luận toàn bộ hệ thống vận hành không lỗi; cần kiểm thử trình duyệt và nghiệp vụ để đánh giá các luồng còn lại.

## 7. Rà soát lỗi logic và bảo mật trong mã nguồn — 14/11/2026

Phạm vi: mã nguồn local hiện có, tập trung API đăng ký, phiên đăng nhập, lịch sử/hủy đơn và kiểm tra thanh toán. Không mặc định mã trên hosting giống hoàn toàn bản local. Không tạo tài khoản, đơn, giao dịch hay gọi API ghi dữ liệu để thử các lỗi dưới đây.

### SRC-01 — Số điện thoại tự khai được dùng làm quyền xem và hủy đơn

- Mức độ: Cao.
- Bằng chứng: `api/auth.php:558–575` chỉ kiểm tra định dạng số điện thoại; nhánh đăng ký không xác minh quyền sở hữu số. `api/auth.php:613–620` chỉ kiểm tra trùng username/email. Schema `database/schema.sql:14,31` không đặt phone là duy nhất.
- `api/bookings.php:1491–1496` trả lịch sử theo `user_id = ? OR phone = ?`, không giới hạn điều kiện phone cho đơn khách vãng lai.
- `api/bookings.php:220–225` và `1428–1437` cho phép hủy/xem chi tiết nếu trùng phone, kể cả khi đơn thuộc user_id khác.
- Kịch bản: một tài khoản đăng ký bằng số điện thoại của khách khác có thể được trả lịch sử đơn của số đó; mã đơn lấy từ lịch sử tiếp tục vượt qua kiểm tra quyền hủy theo phone, nếu trạng thái đơn cho phép hủy.
- Kiểm chứng: đối chiếu xuyên suốt nhánh đăng ký, câu SQL lịch sử và điều kiện quyền hủy; chưa thực hiện trên dữ liệu thật.
- Hướng xử lý đề xuất: chỉ dùng số đã xác minh để nhận quyền sở hữu; đơn đã gắn tài khoản cần phân quyền bằng user_id, cơ chế nhận đơn khách vãng lai cần xác thực riêng.

### SRC-02 — Hủy đơn không nguyên tử, có thể hoàn điểm/lượt voucher nhiều lần

- Mức độ: Cao.
- Vị trí: `api/bookings.php:188–291`.
- Nhánh early_cancel đọc đơn ở dòng 212, kiểm tra trạng thái ở dòng 228 nhưng không bắt đầu transaction và không khóa bản ghi.
- Dòng 277 giảm used_count voucher, dòng 284 cộng points cho user; sau đó dòng 290–291 mới cập nhật trạng thái booking. UPDATE cuối chỉ lọc theo code, không có điều kiện trạng thái cũ.
- Nếu hai yêu cầu từ hai phiên cùng đọc được đơn còn hiệu lực trước khi một yêu cầu cập nhật trạng thái, cả hai có thể hoàn điểm và lượt voucher. Khóa session của một phiên không bảo vệ các phiên khác nhau.
- Nếu một bước ghi thất bại, các bước đã ghi trước đó không được rollback cùng nhau.
- Kiểm chứng: xác nhận thứ tự câu lệnh và sự thiếu transaction/khóa trong toàn nhánh; chưa chạy kiểm thử đồng thời trên DB.
- Hướng xử lý đề xuất: khóa booking và kiểm tra trạng thái trong cùng transaction với việc hoàn điểm/voucher; đảm bảo chỉ một lần hủy được áp dụng.

### SRC-03 — Kiểm tra thanh toán dùng số tiền cũ sau khi đã khóa bản ghi mới

- Mức độ: Cao, phát sinh khi có cập nhật đồng thời.
- Vị trí: `api/check_payment.php:21–24,86–108`.
- newPaid được tính từ booking đọc trước transaction tại dòng 87. Sau khi SELECT FOR UPDATE ở dòng 91–93 lấy freshBooking, code không tính lại theo paid_amount mới và ghi newPaid vào DB ở dòng 98–99.
- Ví dụ: lúc đầu paid_amount = 0; kết quả đối soát trả 100.000đ. Trong lúc chờ, webhook đã cập nhật paid_amount = 300.000đ. Nhánh polling sau đó có thể ghi ngược lại 100.000đ.
- Trạng thái hủy/hết hạn chỉ được kiểm tra trước transaction; sau khóa không kiểm tra lại trạng thái hủy, cũng không đọc expires_at trong SELECT khóa. Có thể cập nhật payment_status của đơn vừa bị hủy trong khoảng chờ.
- Nếu UPDATE/commit thất bại, catch chỉ ghi log; luồng vẫn có thể trả paid=true từ kết quả đối soát ở dòng 114 dù DB chưa lưu được kết quả.
- Kiểm chứng: đối chiếu luồng đọc/khóa/ghi; chưa giả lập giao dịch thật hoặc thử trên production.
- Hướng xử lý đề xuất: tính lại tiền và kiểm tra trạng thái sau khóa; trả lỗi hoặc trạng thái chờ nếu không lưu được đối soát.

### SRC-04 — Tài khoản không còn trong DB vẫn được xác thực bằng session cũ

- Mức độ: Cao khi tài khoản đã bị xóa hoặc DB đã được khôi phục/thay đổi.
- Vị trí: `api/security_helper.php:296–315`; các hàm require_auth/require_admin tại dòng 336–374 sử dụng kết quả này.
- Khi SELECT user không trả bản ghi, dòng 311–312 trả lại user trong session thay vì hủy session nếu session còn dữ liệu.
- Hệ quả: phiên đã đăng nhập có thể tiếp tục mang quyền cũ dù user không tồn tại trong DB; việc xóa tài khoản không thu hồi được phiên qua cơ chế này.
- Đã chạy kiểm tra PHP cô lập: trích đúng hàm refresh_session_user từ mã nguồn, dùng DB giả trả fetch=false và session role=admin. Kết quả `MISSING_DB_USER_STILL_AUTHENTICATED=YES`, tiến trình thoát 0.
- Bài kiểm tra chạy qua stdin, không include bootstrap, không kết nối DB và không tạo file.
- Hướng xử lý đề xuất: khi truy vấn thành công nhưng không có user, hủy phiên và từ chối xác thực.

### SRC-05 — Regex đăng ký chấp nhận ký tự | trong số điện thoại

- Mức độ: Thấp.
- Vị trí: `api/auth.php:570`.
- Regex `/^(0[3|5|7|8|9])[0-9]{8}$/` dùng dấu | trong character class; dấu này được xem là ký tự hợp lệ.
- Kiểm tra PHP cô lập với chính biểu thức trong file: `0|12345678` được preg_match chấp nhận (`INVALID_PHONE_ACCEPTED=YES`), tiến trình thoát 0.
- Nhánh đăng ký lưu số đã sanitize nhưng không chuẩn hóa số sau kiểm tra; dữ liệu không phải số có thể được lưu và gây sai lệch đối chiếu số điện thoại.
- Hướng xử lý đề xuất: dùng tập chữ số đầu số đúng và chuẩn hóa trước khi kiểm tra/lưu.

### SRC-06 — Đăng ký báo thành công và tạo session khi DB không khả dụng

- Mức độ: Trung bình; phụ thuộc tình huống mất kết nối DB.
- Vị trí: `api/auth.php:586–610`.
- Khi pdo không có, nhánh đăng ký tạo user_id bằng time(), thiết lập session và trả HTTP 201 cùng thông báo thành công, dù không INSERT user.
- Khác với nhánh đăng nhập ở dòng 145–151, nhánh này không giới hạn fallback bằng APP_ENV=local và ALLOW_DEMO_FALLBACK.
- Hệ quả: người dùng được báo đăng ký thành công nhưng tài khoản không được lưu, không thể đăng nhập lại bình thường; session tài khoản không tồn tại còn có thể được giữ bởi SRC-04.
- Kiểm chứng: đối chiếu nhánh đăng ký và nhánh đăng nhập; chưa gây ngắt DB để chạy thử.
- Hướng xử lý đề xuất: trả lỗi dịch vụ khi DB không khả dụng; chỉ cho phép demo nếu được cấu hình rõ ràng ở môi trường local.

### Phạm vi xác nhận của đợt rà soát

- SRC-04 và SRC-05 đã được tái hiện bằng PHP cô lập trên logic thực tế, không ghi dữ liệu.
- SRC-01, SRC-02, SRC-03, SRC-06 được xác định qua luồng mã và điều kiện cụ thể; chưa kiểm thử tích hợp trên DB/production.
- Rà soát này chưa bao phủ toàn bộ API quản trị, frontend và cron, không phải chứng nhận hệ thống không còn lỗi khác.
- Chỉ cập nhật file báo cáo này, không áp dụng sửa lỗi vào mã nguồn.

## 8. Kiểm thử theo flow trên production — 14/11/2026

Địa chỉ: `https://fxzioyr.id.vn`. Đây là kiểm tra HTTP/API và các nhánh từ chối an toàn, không phải kiểm thử trình duyệt end-to-end. Không dùng tài khoản khách/admin thật, không tạo đơn hợp lệ, không gửi giao dịch và không kích hoạt webhook.

### Flow 1 — Trang chủ và dữ liệu sân

- GET `/`, `/fields`, `/booking`, `/checkout`, `/success`, `/history`, `/login`, `/field-detail`, `/matchmaking`: mỗi URL đã kiểm tra trả HTTP 200 trong lần quét production trước đó.
- GET `/api/pitches.php?all=1`: HTTP 200, JSON `success=true`, có danh sách sân, slot, dịch vụ, voucher, cấu hình và CSRF token.
- GET tài nguyên JS/CSS của các trang đã kiểm tra ở mục 6: HTTP 200.
- Giới hạn: chưa chạy JavaScript trên trình duyệt; dữ liệu JSON trả về qua curl bị hiển thị sai encoding trong PowerShell, không coi phần hiển thị đó là lỗi encoding của response.

### Flow 2 — Phiên đăng nhập và CSRF cơ bản

- GET `/api/auth.php?action=me` không cookie: HTTP 200, `authenticated=false`, `user=null`, cấp CSRF token.
- GET `/api/auth.php?action=logout`: HTTP 405 `ERR_METHOD_NOT_ALLOWED`, đúng với yêu cầu logout phải POST.
- GET `/api/bookings.php` không đăng nhập: HTTP 401 `ERR_UNAUTHORIZED`.
- POST `/api/auth.php?action=register` thiếu privacy consent: HTTP 422 `ERR_PRIVACY_CONSENT_REQUIRED`; request bị dừng trước kiểm tra/ghi tài khoản.
- Chưa thử login thành công, 2FA, captcha/token Turnstile thật, rate-limit nhiều lần hoặc logout có CSRF hợp lệ.

### Flow 3 — Truy vấn đơn và thanh toán

- GET `/api/bookings.php?code=INVALID_TEST_CODE`: HTTP 404 `ERR_NOT_FOUND`.
- GET `/api/check_payment.php?code=INVALID_TEST_CODE`: HTTP 200, `success=true`, `paid=false`, `expectedAmount=0`, thông báo chưa nhận được giao dịch.
- POST `/api/bookings.php` không có consent: HTTP 422 `ERR_PRIVACY_CONSENT_REQUIRED`, không tạo đơn.
- POST tạo đơn thiếu mã vé tới `/api/reviews.php`: HTTP 422 `ERR_MISSING_CODE`, không ghi review.
- Không tạo booking hợp lệ, không poll mã đơn thật, không xác minh SePay và không gọi webhook. Các yêu cầu này có thể ảnh hưởng giữ slot hoặc dữ liệu giao dịch.
- Lưu ý kết quả check_payment: trả HTTP 200 cho mã không tồn tại không tự nó chứng minh lỗi nghiệp vụ; tuy nhiên response không đồng nhất với API booking 404 và dễ khiến client nhầm “mã không tồn tại” với “đơn đang chờ thanh toán”. Cần xác nhận hợp đồng API/client trước khi xếp thành bug.

### Flow 4 — Review và matchmaking

- GET `/api/reviews.php`: HTTP 200, JSON thành công và danh sách review (kết quả lần gọi là rỗng).
- GET `/api/matchmaking.php`: HTTP 200, JSON thành công, `enabled=true`, `requireApproval=false`.
- Chưa tạo tin tìm đối hoặc gửi yêu cầu tham gia hợp lệ để tránh ghi dữ liệu/liên hệ thật.

### Flow 5 — Cổng quản trị và phân quyền

- GET `/api/admin.php?action=dashboard` không đăng nhập: HTTP 401 `ERR_UNAUTHORIZED`.
- GET trực tiếp `/api/admin_ops.php?action=dashboard`, `/api/admin_crm.php?action=dashboard`, `/api/admin_finance.php?action=dashboard`: HTTP 403 `ERR_FORBIDDEN` (`Direct access forbidden.`).
- `/portal-admin/` khi chưa có session: được xác nhận ở lần kiểm tra production trước chuyển HTTP 302 về `/login?redirect=portal-admin`.
- Chưa kiểm thử quyền sau đăng nhập với role staff/manager/admin, các thao tác tài chính, kho, chốt ca hoặc đổi cấu hình.

### Flow 6 — Kiểm thử đăng ký lỗi định dạng điện thoại

- Không gửi request production có privacy consent và phone `0|12345678`: với lỗi SRC-05 đã tái hiện trong mã local, request có khả năng vượt validation và tạo tài khoản rác.
- Nhánh thiếu consent trả HTTP 422 và không đi tới regex, nên không thể dùng nó để kết luận production có/không mắc SRC-05.
- Kết quả regex chỉ được tái hiện bằng PHP cô lập trên mã nguồn local; cần kiểm thử có kiểm soát trên staging hoặc sau khi có bản sửa trước khi kết luận phiên bản production.

### Kết quả từng flow và lỗi mới

- Flow 1: đạt ở mức HTTP/data API; chưa xác minh render frontend.
- Flow 2: các nhánh unauthenticated, logout sai method và từ chối consent hoạt động đúng theo kết quả thử.
- Flow 3: API bảo vệ từ chối payload thiếu consent/mã vé; endpoint check_payment có lỗi hợp đồng API khi trả HTTP 200 cho mã đơn không tồn tại (ghi nhận tại mục 9).
- Flow 4: GET review và matchmaking hoạt động; không thử mutation hợp lệ.
- Flow 5: request chưa xác thực bị chặn 401/403; RBAC theo từng role chưa kiểm thử.
- Flow 6: cố ý không gửi request có thể tạo user.
- Không phát hiện thêm lỗi production mới có thể khẳng định chỉ bằng các test an toàn trên. Các lỗi SRC-01 đến SRC-06 tại mục 7 vẫn là phát hiện từ mã local, chưa xác nhận cùng tồn tại trong bản production.
- Không thay đổi file code/config hoặc dữ liệu nghiệp vụ; chỉ cập nhật báo cáo.

## 9. Kết luận kiểm tra `check_payment.php` — 14/11/2026

### FLOW-03 — Mã đơn không tồn tại bị trả như đơn đang chờ thanh toán

- Mức độ: Trung bình — lỗi hợp đồng API, chưa gây xác nhận thanh toán giả trong frontend hiện tại.
- Đã xác nhận trên production `https://fxzioyr.id.vn` với `GET /api/check_payment.php?code=INVALID_TEST_CODE`: HTTP 200 và JSON có `success=true`, `paid=false`, `expectedAmount=0`, cùng thông báo “Chưa nhận được giao dịch chuyển khoản”.
- Đối chiếu cùng mã với `GET /api/bookings.php?code=INVALID_TEST_CODE`: HTTP 404, `success=false`, `ref_code=ERR_NOT_FOUND`.
- Code tương ứng tại `api/check_payment.php:18–83`: nếu không tìm thấy booking, biến `$booking` vẫn là `null`, `get_expected_deposit_amount()` trả 0, sau đó endpoint rơi xuống response mặc định ở dòng 123–132 thay vì trả lỗi không tìm thấy. Code rỗng vẫn có nhánh 400 riêng ở dòng 10–16.
- Frontend `js/checkout.js:394–403` và `565–605` chỉ xử lý thành công khi `paid === true`, vì vậy lần kiểm tra hiện tại không làm người dùng được xác nhận thanh toán giả. Tuy nhiên client hoặc hệ thống tích hợp khác có thể hiểu nhầm HTTP 200/`success=true` là mã đơn hợp lệ đang chờ thanh toán.
- Kết luận: đây là bug đã xác nhận về tính nhất quán và ý nghĩa của response API, không còn chỉ là điểm cần làm rõ. Nên trả HTTP 404 với `success=false`, `ref_code=ERR_NOT_FOUND` khi mã không tồn tại; giữ response HTTP 200/`paid=false` cho booking tồn tại nhưng chưa thanh toán.
- Kiểm tra cú pháp local: `api/check_payment.php` và `api/sepay_helper.php` đều không có lỗi cú pháp.
- Không sửa code, không tạo booking, không gửi giao dịch và không gọi webhook trong quá trình kiểm tra.
/* === data.js === */

const DEFAULT_PITCHES = [
  {
    "id": "P5-A",
    "name": "Sân 5 - Sân A",
    "type": 5,
    "typeName": "Sân 5 người",
    "size": "20m x 40m",
    "grass": "Cỏ nhân tạo kim cương FIFA Quality Pro, đệm hạt cao su EPDM êm ái",
    "basePrice": 350000,
    "peakPrice": 350000,
    "weekendPrice": 350000,
    "status": "Hoạt động",
    "amenities": [
      "Đèn LED 400W chống chói",
      "Bãi đỗ ô tô & xe máy",
      "Nước suối miễn phí",
      "Phòng thay đồ & tắm nóng lạnh",
      "Wifi tốc độ cao",
      "Thuê trọng tài theo yêu cầu (tính phí lẻ)"
    ],
    "variant": "standard",
    "description": "Sân 5 chuẩn thi đấu mini, vị trí gần khán đài và khu dịch vụ tiện lợi."
  },
  {
    "id": "P5-B",
    "name": "Sân 5 - Sân B",
    "type": 5,
    "typeName": "Sân 5 người",
    "size": "20m x 40m",
    "grass": "Cỏ nhân tạo monofilament cao cấp 50mm, thoát nước nhanh sau mưa",
    "basePrice": 350000,
    "peakPrice": 350000,
    "weekendPrice": 350000,
    "status": "Hoạt động",
    "amenities": [
      "Đèn LED 400W chống chói",
      "Bãi đỗ xe máy",
      "Nước suối",
      "Phòng thay đồ",
      "Wifi"
    ],
    "variant": "bright",
    "description": "Sân 5 thoáng mát, trang bị lưới chắn bóng cao cấp quanh sân an toàn."
  },
  {
    "id": "P7-A",
    "name": "Sân 7 - Sân A (Trung tâm)",
    "type": 7,
    "typeName": "Sân 7 người",
    "size": "30m x 50m",
    "grass": "Cỏ sợi đan mật độ cao, giảm thiểu trầy xước khi va chạm tối đa",
    "basePrice": 450000,
    "peakPrice": 450000,
    "status": "Hoạt động",
    "amenities": [
      "Hệ thống chiếu sáng 8 trụ LED",
      "Bãi xe ô tô rộng",
      "Phòng tắm nóng lạnh riêng",
      "Khu kỹ thuật khán đài",
      "Wifi",
      "Hỗ trợ quay phát Highlight"
    ],
    "variant": "deep",
    "description": "Sân 7 trung tâm chuyên tổ chức giải đấu phong trào và giao hữu câu lạc bộ."
  },
  {
    "id": "P7-B",
    "name": "Sân 7 - Sân B",
    "type": 7,
    "typeName": "Sân 7 người",
    "size": "30m x 50m",
    "grass": "Cỏ nhân tạo 5cm tiêu chuẩn quốc tế, hạt cao su đàn hồi cao",
    "basePrice": 450000,
    "peakPrice": 450000,
    "weekendPrice": 450000,
    "status": "Hoạt động",
    "amenities": [
      "Đèn LED công suất lớn",
      "Bãi đỗ xe ô tô",
      "Phòng thay đồ & tắm",
      "Nước suối miễn phí",
      "Wifi"
    ],
    "variant": "twin",
    "description": "Sân 7 liền kề khu căng tin phục vụ nước giải khát và đồ ăn nhẹ."
  },
  {
    "id": "P7-C",
    "name": "Sân 7 - Sân C (Bảo trì cỏ)",
    "type": 7,
    "typeName": "Sân 7 người",
    "size": "30m x 50m",
    "grass": "Đang nâng cấp mặt cỏ nhân tạo thế hệ mới",
    "basePrice": 450000,
    "peakPrice": 450000,
    "weekendPrice": 450000,
    "status": "Bảo trì",
    "amenities": [
      "Đèn LED",
      "Bãi xe",
      "Phòng thay đồ"
    ],
    "variant": "muted",
    "description": "Sân đang trong giai đoạn nâng cấp bảo dưỡng mặt cỏ định kỳ."
  },
  {
    "id": "P11-GH",
    "name": "Sân 11 - Sân Ghép (A+B)",
    "type": 11,
    "typeName": "Sân 11 người",
    "size": "60m x 90m",
    "grass": "Ghép từ 2 sân 7 chuẩn, cỏ đồng bộ phẳng tuyệt đối",
    "basePrice": 900000,
    "peakPrice": 900000,
    "weekendPrice": 900000,
    "status": "Hoạt động",
    "amenities": [
      "Hệ thống đèn 12 cột chuẩn thi đấu",
      "Phòng họp đội bóng",
      "Bãi đỗ xe lớn",
      "Phòng tắm nóng lạnh",
      "Trọng tài VFF hỗ trợ"
    ],
    "variant": "hero",
    "description": "Sân 11 ghép kích thước chuẩn giải phong trào lớn, đáp ứng thi đấu đỉnh cao."
  },
  {
    "id": "P5-C",
    "name": "Sân 5 - Sân C (Mới)",
    "type": 5,
    "typeName": "Sân 5 người",
    "size": "20m x 40m",
    "grass": "Cỏ nhân tạo thế hệ 4 EvoFiber 60mm, chống nóng, hạt EPDM chính hãng",
    "basePrice": 350000,
    "peakPrice": 350000,
    "weekendPrice": 350000,
    "status": "Hoạt động",
    "amenities": [
      "Đèn LED 500W siêu sáng",
      "Bãi đỗ xe ô tô & xe máy",
      "Nước suối miễn phí",
      "Phòng thay đồ có máy lạnh",
      "Wifi 5G",
      "Camera an ninh 24/7"
    ],
    "variant": "bright",
    "description": "Sân 5 mới nhất khu phức hợp, trang bị hiện đại nhất với cỏ thế hệ 4 chống nóng."
  },
  {
    "id": "P7-D",
    "name": "Sân 7 - Sân D (VIP)",
    "type": 7,
    "typeName": "Sân 7 người",
    "size": "32m x 52m",
    "grass": "Cỏ lai tổng hợp Hybrid SIS (60% nhân tạo + 40% tự nhiên) chuẩn FIFA Quality Pro",
    "basePrice": 450000,
    "peakPrice": 450000,
    "weekendPrice": 450000,
    "status": "Hoạt động",
    "amenities": [
      "Hệ thống chiếu sáng 10 cột LED 1000W",
      "Phòng VIP khán đài có điều hòa",
      "Màn hình tỷ số điện tử",
      "Dịch vụ phát Livestream",
      "Bãi xe ô tô riêng",
      "Trọng tài VFF cấp 1"
    ],
    "variant": "deep",
    "description": "Sân 7 VIP cao cấp nhất cụm, dành cho giải phong trào lớn và sự kiện thể thao doanh nghiệp."
  },
  {
    "id": "P5-D",
    "name": "Sân 5 - Sân D (Khán Đài Đông)",
    "type": 5,
    "typeName": "Sân 5 người",
    "size": "20m x 40m",
    "grass": "Cỏ nhân tạo kim cương FIFA Quality Pro, hạt cao su EPDM êm chân",
    "basePrice": 350000,
    "peakPrice": 350000,
    "weekendPrice": 350000,
    "status": "Hoạt động",
    "amenities": [
      "Đèn LED 400W chống chói",
      "Bãi đỗ ô tô & xe máy",
      "Nước suối miễn phí",
      "Phòng thay đồ & tắm nóng lạnh",
      "Wifi tốc độ cao"
    ],
    "variant": "standard",
    "description": "Sân 5 liền kề khu vực khán đài Đông, trang bị dàn đèn LED hiện đại và lưới chắn an toàn."
  },
  {
    "id": "P5-E",
    "name": "Sân 5 - Sân E (Mini VIP)",
    "type": 5,
    "typeName": "Sân 5 người",
    "size": "20m x 40m",
    "grass": "Cỏ nhân tạo sợi gân kép đàn hồi giảm sốc tối đa, chống lật sơ mi",
    "basePrice": 350000,
    "peakPrice": 350000,
    "weekendPrice": 350000,
    "status": "Hoạt động",
    "amenities": [
      "Đèn LED 500W siêu sáng",
      "Bãi đỗ xe ô tô",
      "Phòng thay đồ có máy lạnh",
      "Wifi 5G",
      "Camera an ninh 24/7"
    ],
    "variant": "bright",
    "description": "Sân 5 Mini VIP cỏ nhân tạo mềm mại, vị trí trung tâm tiện lợi cho các trận giao lưu thân hữu."
  },
  {
    "id": "P5-F",
    "name": "Sân 5 - Sân F (Trẻ Trung)",
    "type": 5,
    "typeName": "Sân 5 người",
    "size": "20m x 40m",
    "grass": "Cỏ nhân tạo monofilament cao cấp 50mm, thoát nước nhanh sau mưa",
    "basePrice": 350000,
    "peakPrice": 350000,
    "weekendPrice": 350000,
    "status": "Hoạt động",
    "amenities": [
      "Đèn LED 400W chống chói",
      "Bãi xe máy",
      "Nước suối",
      "Phòng thay đồ",
      "Wifi"
    ],
    "variant": "standard",
    "description": "Sân 5 tiêu chuẩn thi đấu nhanh, không gian thoáng đãng phù hợp giao hữu nhóm và câu lạc bộ trẻ."
  },
  {
    "id": "P7-E",
    "name": "Sân 7 - Sân E (Mặt Cỏ SIS)",
    "type": 7,
    "typeName": "Sân 7 người",
    "size": "30m x 50m",
    "grass": "Cỏ lai tổng hợp Hybrid SIS Grass đàn hồi cao cấp chống trượt va chạm",
    "basePrice": 450000,
    "peakPrice": 450000,
    "weekendPrice": 450000,
    "status": "Hoạt động",
    "amenities": [
      "Hệ thống 8 trụ đèn LED 600W",
      "Bãi đỗ xe ô tô rộng",
      "Phòng tắm nóng lạnh riêng",
      "Khu kỹ thuật khán đài",
      "Wifi",
      "Hỗ trợ quay Highlight"
    ],
    "variant": "deep",
    "description": "Sân 7 mặt cỏ công nghệ SIS chuẩn quốc tế, kiểm soát bóng tối ưu cho các trận cầu đỉnh cao."
  },
  {
    "id": "P7-F",
    "name": "Sân 7 - Sân F (Khán Đài B)",
    "type": 7,
    "typeName": "Sân 7 người",
    "size": "30m x 50m",
    "grass": "Cỏ nhân tạo 50mm nhập khẩu Hà Lan, đệm êm ái chống ma sát",
    "basePrice": 450000,
    "peakPrice": 450000,
    "weekendPrice": 450000,
    "status": "Hoạt động",
    "amenities": [
      "Đèn LED công suất cao",
      "Khán đài B có mái che",
      "Phòng thay đồ & tắm",
      "Nước suối miễn phí",
      "Wifi"
    ],
    "variant": "twin",
    "description": "Sân 7 cạnh khán đài B có mái che, trang bị cabin huấn luyện viên và khu khởi động riêng."
  },
  {
    "id": "P7-G",
    "name": "Sân 7 - Sân G (Đèn LED Pro)",
    "type": 7,
    "typeName": "Sân 7 người",
    "size": "30m x 50m",
    "grass": "Cỏ sợi kim cương đệm hạt cao su nguyên sinh thân thiện môi trường",
    "basePrice": 450000,
    "peakPrice": 450000,
    "weekendPrice": 450000,
    "status": "Hoạt động",
    "amenities": [
      "Hệ thống chiếu sáng LED Pro 800W",
      "Bãi đỗ xe",
      "Phòng thay đồ",
      "Wifi tốc độ cao"
    ],
    "variant": "bright",
    "description": "Sân 7 trang bị dàn đèn LED cao cấp 800W, thi đấu buổi tối cực rõ nét và không bị lóa mắt."
  },
  {
    "id": "P11-A",
    "name": "Sân 11 - Sân Tiêu Chuẩn Quốc Gia",
    "type": 11,
    "typeName": "Sân 11 người",
    "size": "68m x 105m",
    "grass": "Kích thước chuẩn FIFA 68m x 105m, mặt cỏ tiêu chuẩn thi đấu chuyên nghiệp",
    "basePrice": 900000,
    "peakPrice": 900000,
    "weekendPrice": 900000,
    "status": "Hoạt động",
    "amenities": [
      "Dàn đèn 12 cột chuẩn thi đấu quốc tế",
      "Khán đài 500 chỗ ngồi",
      "Phòng họp chiến thuật",
      "Bãi xe lớn",
      "Trọng tài VFF hỗ trợ"
    ],
    "variant": "hero",
    "description": "Sân 11 chuẩn kích thước FIFA 68m x 105m, đáp ứng tổ chức các giải bóng đá chuyên nghiệp và phong trào quy mô lớn."
  },
  {
    "id": "P11-B",
    "name": "Sân 11 - Sân Ghép (C+D)",
    "type": 11,
    "typeName": "Sân 11 người",
    "size": "60m x 90m",
    "grass": "Ghép linh hoạt từ 2 sân 7 C và D, cỏ đồng bộ phẳng tuyệt đối",
    "basePrice": 900000,
    "peakPrice": 900000,
    "weekendPrice": 900000,
    "status": "Hoạt động",
    "amenities": [
      "Đèn LED 1000W",
      "Phòng thay đồ riêng",
      "Bãi đỗ xe ô tô",
      "Nước uống miễn phí",
      "Phát sóng trực tiếp"
    ],
    "variant": "hero",
    "description": "Sân 11 ghép từ cụm sân 7 C và D, mặt sân đồng đều êm ái cho các giải đấu cúp."
  },
  {
    "id": "P11-C",
    "name": "Sân 11 - Sân Trung Tâm VFF",
    "type": 11,
    "typeName": "Sân 11 người",
    "size": "68m x 105m",
    "grass": "Mặt cỏ FIFA Quality Pro và bảng tỷ số điện tử LED hiện đại",
    "basePrice": 900000,
    "peakPrice": 900000,
    "weekendPrice": 900000,
    "status": "Hoạt động",
    "amenities": [
      "Dàn đèn LED 1200W chuyên dụng truyền hình",
      "Bảng tỷ số điện tử",
      "Phòng thay đồ máy lạnh",
      "Khán đài VIP",
      "Camera Livestream đa góc"
    ],
    "variant": "hero",
    "description": "Sân 11 trung tâm hiện đại nhất hệ thống, tích hợp hệ thống bảng tỷ số LED và livestream đa góc máy phục vụ các giải đấu tranh cúp đỉnh cao."
  },
  {
    "id": "P5-G",
    "name": "Sân 5 - Sân G (Mẫu)",
    "type": 5,
    "typeName": "Sân 5 người",
    "size": "20m x 40m",
    "grass": "Cỏ nhân tạo tiêu chuẩn, đệm hạt cao su",
    "basePrice": 350000,
    "peakPrice": 350000,
    "weekendPrice": 350000,
    "status": "Hoạt động",
    "amenities": [
      "Đèn LED",
      "Bãi xe máy",
      "Phòng thay đồ"
    ],
    "variant": "standard",
    "description": "Sân 5 mẫu bổ sung để kiểm thử danh sách và đặt sân."
  },
  {
    "id": "P5-H",
    "name": "Sân 5 - Sân H",
    "type": 5,
    "typeName": "Sân 5 người",
    "size": "20m x 40m",
    "grass": "Cỏ nhân tạo Monofilament 50mm, thoát nước nhanh sau mưa",
    "basePrice": 350000,
    "peakPrice": 350000,
    "weekendPrice": 350000,
    "status": "Hoạt động",
    "amenities": [
      "Đèn LED 400W chống chói",
      "Bãi đỗ ô tô & xe máy",
      "Nước suối miễn phí",
      "Phòng thay đồ",
      "Wifi"
    ],
    "variant": "standard",
    "description": "Sân 5 chất lượng cao, vị trí thoáng mát."
  },
  {
    "id": "P5-I",
    "name": "Sân 5 - Sân I",
    "type": 5,
    "typeName": "Sân 5 người",
    "size": "20m x 40m",
    "grass": "Cỏ nhân tạo kim cương FIFA Quality Pro, đệm cao su EPDM",
    "basePrice": 350000,
    "peakPrice": 350000,
    "weekendPrice": 350000,
    "status": "Hoạt động",
    "amenities": [
      "Đèn LED 400W chống chói",
      "Bãi đỗ xe",
      "Phòng thay đồ",
      "Wifi"
    ],
    "variant": "bright",
    "description": "Sân 5 mới bổ sung mặt cỏ êm ái."
  },
  {
    "id": "P7-H",
    "name": "Sân 7 - Sân H (Mẫu)",
    "type": 7,
    "typeName": "Sân 7 người",
    "size": "30m x 50m",
    "grass": "Cỏ nhân tạo sợi ngắn, thoát nước nhanh",
    "basePrice": 450000,
    "peakPrice": 450000,
    "weekendPrice": 450000,
    "status": "Hoạt động",
    "amenities": [
      "Đèn LED",
      "Bãi đỗ xe",
      "Nước uống"
    ],
    "variant": "bright",
    "description": "Sân 7 mẫu bổ sung, phù hợp các trận giao hữu buổi tối."
  },
  {
    "id": "P7-I",
    "name": "Sân 7 - Sân I",
    "type": 7,
    "typeName": "Sân 7 người",
    "size": "30m x 50m",
    "grass": "Cỏ sợi đan mật độ cao chuẩn thi đấu phong trào",
    "basePrice": 450000,
    "peakPrice": 450000,
    "weekendPrice": 450000,
    "status": "Hoạt động",
    "amenities": [
      "Hệ thống chiếu sáng 8 trụ LED",
      "Bãi xe ô tô",
      "Phòng tắm nóng lạnh",
      "Wifi"
    ],
    "variant": "deep",
    "description": "Sân 7 khu khán đài C, đèn sáng rõ."
  },
  {
    "id": "P7-K",
    "name": "Sân 7 - Sân K",
    "type": 7,
    "typeName": "Sân 7 người",
    "size": "30m x 50m",
    "grass": "Cỏ nhân tạo 5cm tiêu chuẩn quốc tế, đàn hồi êm",
    "basePrice": 450000,
    "peakPrice": 450000,
    "weekendPrice": 450000,
    "status": "Hoạt động",
    "amenities": [
      "Đèn LED công suất lớn",
      "Bãi đỗ xe",
      "Nước suối miễn phí",
      "Wifi"
    ],
    "variant": "twin",
    "description": "Sân 7 tiêu chuẩn mới cho các trận giao hữu."
  },
  {
    "id": "P11-D",
    "name": "Sân 11 - Sân D (Mẫu)",
    "type": 11,
    "typeName": "Sân 11 người",
    "size": "68m x 105m",
    "grass": "Cỏ nhân tạo tiêu chuẩn thi đấu",
    "basePrice": 900000,
    "peakPrice": 900000,
    "weekendPrice": 900000,
    "status": "Hoạt động",
    "amenities": [
      "Đèn thi đấu",
      "Khán đài",
      "Phòng thay đồ"
    ],
    "variant": "hero",
    "description": "Sân 11 mẫu bổ sung để kiểm thử cấu hình và hiển thị."
  },
  {
    "id": "P11-E",
    "name": "Sân 11 - Sân E (Tiêu Chuẩn FIFA)",
    "type": 11,
    "typeName": "Sân 11 người",
    "size": "68m x 105m",
    "grass": "Kích thước chuẩn FIFA 68m x 105m, cỏ tiêu chuẩn thi đấu quốc tế",
    "basePrice": 900000,
    "peakPrice": 900000,
    "weekendPrice": 900000,
    "status": "Hoạt động",
    "amenities": [
      "Dàn đèn 12 cột chuẩn thi đấu",
      "Khán đài có mái che",
      "Phòng họp chiến thuật",
      "Bãi xe lớn"
    ],
    "variant": "hero",
    "description": "Sân 11 tiêu chuẩn quốc tế tổ chức các giải đấu chuyên nghiệp."
  },
  {
    "id": "P11-F",
    "name": "Sân 11 - Sân F (Khu Nam)",
    "type": 11,
    "typeName": "Sân 11 người",
    "size": "68m x 105m",
    "grass": "Mặt cỏ FIFA Quality Pro thoát nước ngầm hiện đại",
    "basePrice": 900000,
    "peakPrice": 900000,
    "weekendPrice": 900000,
    "status": "Hoạt động",
    "amenities": [
      "Dàn đèn LED 1200W",
      "Phòng thay đồ máy lạnh",
      "Khán đài",
      "Camera Livestream"
    ],
    "variant": "hero",
    "description": "Sân 11 khu Nam không gian rộng rãi cho các giải đấu cúp."
  }
];

const DEFAULT_TIME_SLOTS = [
  { id: 'S01', time: '05:30 - 07:30', start: '05:30', end: '07:30', isPeak: false, duration: 2.0 },
  { id: 'S02', time: '07:30 - 09:30', start: '07:30', end: '09:30', isPeak: false, duration: 2.0 },
  { id: 'S03', time: '09:30 - 11:30', start: '09:30', end: '11:30', isPeak: false, duration: 2.0 },
  { id: 'S04', time: '14:30 - 16:30', start: '14:30', end: '16:30', isPeak: false, duration: 2.0 },
  { id: 'S05', time: '16:30 - 18:30', start: '16:30', end: '18:30', isPeak: true, duration: 2.0 },
  { id: 'S06', time: '18:30 - 20:30', start: '18:30', end: '20:30', isPeak: true, duration: 2.0 },
  { id: 'S07', time: '20:30 - 22:30', start: '20:30', end: '22:30', isPeak: false, duration: 2.0 }
];

const DEFAULT_EXTRA_SERVICES = [
  { id: 'SRV-WATER', name: 'Nước suối đóng chai (Thùng 24 chai Aquafina)', price: 120000, unit: 'thùng', icon: 'droplet' },
  { id: 'SRV-WATER-BOTTLE', name: 'Nước suối lẻ Aquafina 500ml', price: 10000, unit: 'chai', icon: 'droplet' },
  { id: 'SRV-BIB', name: 'Áo bib chia đội (Bộ 10 áo màu dạ quang)', price: 30000, unit: 'bộ/trận', icon: 'shirt' },
  { id: 'SRV-BALL', name: 'Thuê bóng Động Lực FIFA Quality', price: 20000, unit: 'quả/trận', icon: 'ball' },
  { id: 'SRV-REF', name: 'Trọng tài chuyên nghiệp bắt trận', price: 150000, unit: 'trận', icon: 'flag' }
];

const DEFAULT_VOUCHERS = [
  {
    code: 'WELCOME10',
    description: 'Giảm 10% tổng đơn cho khách hàng mới',
    type: 'percent',
    value: 10,
    minOrder: 0,
    maxUsage: 100,
    usedCount: 0,
    maxDiscountAmount: 0,
    validFrom: null,
    validTo: null,
    pitchTypeLimit: null,
    requiredTier: '',
    isActive: true
  },
  {
    code: 'GIAM50K',
    description: 'Giảm ngay 50.000đ cho đơn đặt sân từ 500.000đ',
    type: 'fixed',
    value: 50000,
    minOrder: 500000,
    maxUsage: 100,
    usedCount: 0,
    maxDiscountAmount: 0,
    validFrom: null,
    validTo: null,
    pitchTypeLimit: null,
    requiredTier: '',
    isActive: true
  },
  {
    code: 'VIPGOLD',
    description: 'Giảm 15% cho thành viên Vàng & Kim Cương',
    type: 'percent',
    value: 15,
    minOrder: 300000,
    maxUsage: 100,
    usedCount: 0,
    maxDiscountAmount: 0,
    validFrom: null,
    validTo: null,
    pitchTypeLimit: null,
    requiredTier: 'vip,regular',
    isActive: true
  },
  {
    code: 'DATTHANG15',
    description: 'Giảm 15% ưu đãi hợp đồng đặt sân theo tháng',
    type: 'percent',
    value: 15,
    minOrder: 800000,
    maxUsage: 100,
    usedCount: 0,
    maxDiscountAmount: 0,
    validFrom: null,
    validTo: null,
    pitchTypeLimit: null,
    requiredTier: '',
    isActive: true
  },
  {
    code: 'SINHVIEN30K',
    description: 'Giảm 30.000đ trợ giá học sinh - sinh viên',
    type: 'fixed',
    value: 30000,
    minOrder: 200000,
    maxUsage: 100,
    usedCount: 0,
    maxDiscountAmount: 0,
    validFrom: null,
    validTo: null,
    pitchTypeLimit: null,
    requiredTier: '',
    isActive: true
  },
  {
    code: 'CUOITUAN100K',
    description: 'Giảm 100.000đ cho đơn đặt sân 11 người / Giải đấu',
    type: 'fixed',
    value: 100000,
    minOrder: 900000,
    maxUsage: 100,
    usedCount: 0,
    maxDiscountAmount: 0,
    validFrom: null,
    validTo: null,
    pitchTypeLimit: null,
    requiredTier: '',
    isActive: true
  }
];

const DEFAULT_USER = null;

const DEFAULT_BANK_INFO = {
  bankName: 'Ngân hàng Quân Đội (MBBank)',
  bankCode: 'MB',
  accountNumber: '0352313548',
  accountName: 'NGUYEN QUANG VINH',
  branch: 'Chi nhánh Hà Nội',
  depositRate: 0.3
};

const DEFAULT_SYSTEM_CONFIG = {
  depositRate: 30,
  hotline: '0352 313 548',
  openHours: '05:30 - 22:30 hàng ngày (kể cả Lễ, Tết)',
  holdMinutes: 15,
  waitlistHoldMinutes: 15,
  refundFullHours: 24,
  refundPartialHours: 4,
  autoCancelEnabled: true,
  matchmakingEnabled: true,
  matchmakingRequireApproval: false,
  pricingTable: null
};
window.DEFAULT_SYSTEM_CONFIG = DEFAULT_SYSTEM_CONFIG;

function getTodayDateString(offsetDays = 0) {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const todayStr = getTodayDateString();
const yesterdayStr = getTodayDateString(-1);
const tomorrowStr = getTodayDateString(1);

const DEFAULT_BOOKINGS = [
  {
    code: 'ASFS982145',
    customerName: 'Trần Minh Hoàng',
    phone: '0352 313 548',
    pitchId: 'P7-A',
    pitchName: 'Sân 7 - Sân A (Trung tâm)',
    date: todayStr,
    slotId: 'S10',
    slotTime: '17:30 - 19:00',
    pitchPrice: 650000,
    services: [
      { id: 'SRV-WATER-BOTTLE', name: 'Nước suối lẻ Aquafina 500ml', quantity: 6, price: 10000 },
      { id: 'SRV-BIB', name: 'Áo bib chia đội', quantity: 1, price: 30000 }
    ],
    voucherCode: 'WELCOME10',
    discountAmount: 74000,
    totalPrice: 666000,
    depositAmount: 200000,
    remainingAmount: 466000,
    status: 'Đã xác nhận',
    paymentStatus: 'Đã cọc 30%',
    paymentMethod: 'VietQR Chuyển khoản',
    createdAt: `${todayStr} 08:30`,
    note: 'Yêu cầu chuẩn bị sẵn áo bib màu cam và xanh'
  },
  {
    code: 'ASFF441209',
    customerName: 'Lê Hoàng Nam',
    phone: '0988 777 666',
    pitchId: 'P5-A',
    pitchName: 'Sân 5 - Sân A',
    date: todayStr,
    slotId: 'S08',
    slotTime: '16:00 - 17:00',
    pitchPrice: 250000,
    services: [],
    voucherCode: '',
    discountAmount: 0,
    totalPrice: 250000,
    depositAmount: 100000,
    remainingAmount: 150000,
    status: 'Đang đá',
    paymentStatus: 'Đã cọc 30%',
    paymentMethod: 'VietQR Chuyển khoản',
    createdAt: `${todayStr} 10:15`,
    note: 'Đã nhận sân đúng giờ'
  },
  {
    code: 'ASFF110283',
    customerName: 'Nguyễn Tuấn Kiệt',
    phone: '0903 112 233',
    pitchId: 'P5-B',
    pitchName: 'Sân 5 - Sân B',
    date: todayStr,
    slotId: 'S12',
    slotTime: '19:00 - 20:00',
    pitchPrice: 350000,
    services: [
      { id: 'SRV-BALL', name: 'Thuê bóng Động Lực', quantity: 1, price: 20000 }
    ],
    voucherCode: '',
    discountAmount: 0,
    totalPrice: 370000,
    depositAmount: 120000,
    remainingAmount: 250000,
    status: 'Đã xác nhận',
    paymentStatus: 'Đã cọc 30%',
    paymentMethod: 'VietQR Chuyển khoản',
    createdAt: `${todayStr} 11:40`,
    note: 'Đá giao hữu giữa công ty'
  },
  {
    code: 'ASFS883210',
    customerName: 'Phạm Đức Duy',
    phone: '0934 555 888',
    pitchId: 'P7-B',
    pitchName: 'Sân 7 - Sân B',
    date: yesterdayStr,
    slotId: 'S13',
    slotTime: '19:00 - 20:30',
    pitchPrice: 600000,
    services: [
      { id: 'SRV-REF', name: 'Trọng tài chuyên nghiệp', quantity: 1, price: 150000 }
    ],
    voucherCode: 'GIAM50K',
    discountAmount: 50000,
    totalPrice: 700000,
    depositAmount: 250000,
    remainingAmount: 0,
    status: 'Hoàn thành',
    paymentStatus: 'Đã thanh toán 100%',
    paymentMethod: 'Tiền mặt tại quầy',
    createdAt: `${yesterdayStr} 09:20`,
    note: 'Trận bán kết cúp IT'
  },
  {
    code: 'ASFE559072',
    customerName: 'Vũ Quốc Bảo',
    phone: '0977 444 111',
    pitchId: 'P11-GH',
    pitchName: 'Sân 11 - Sân Ghép (A+B)',
    date: tomorrowStr,
    slotId: 'S14',
    slotTime: '20:00 - 21:00',
    pitchPrice: 1200000,
    services: [
      { id: 'SRV-REF', name: 'Trọng tài chuyên nghiệp', quantity: 1, price: 150000 },
      { id: 'SRV-WATER', name: 'Nước suối đóng chai (Thùng 24 chai)', quantity: 2, price: 240000 }
    ],
    voucherCode: 'VIPGOLD',
    discountAmount: 238500,
    totalPrice: 1351500,
    depositAmount: 500000,
    remainingAmount: 851500,
    status: 'Đã xác nhận',
    paymentStatus: 'Đã cọc 30%',
    paymentMethod: 'VietQR Chuyển khoản',
    createdAt: `${todayStr} 12:00`,
    note: 'Đá giao lưu 2 chi nhánh ngân hàng'
  }
];

const PACKAGE_PROMOTIONS = {
  12: {
    weeks: 12,
    months: 3,
    title: 'Gói Vàng 3 Tháng (12 tuần liên tiếp)',
    discountRate: 0.15,
    perMatchGifts: [
      { id: 'SRV-WATER', name: 'Nước suối Aquafina đóng chai (Thùng 24 chai)', quantity: 2, unit: 'thùng', singleValue: 120000, lineValue: 240000, icon: '💧' },
      { id: 'SRV-REF', name: 'Trọng tài chuyên nghiệp bắt chính trận đấu', quantity: 1, unit: 'trận', singleValue: 150000, lineValue: 150000, icon: '🏁' }
    ],
    perMatchGiftValue: 390000,
    totalGiftValue: 4680000,
    giftSummary: '2 thùng nước suối (48 chai) + 1 trọng tài chuyên nghiệp MỖI TRẬN',
    badge: 'SIÊU VIP 3 THÁNG',
    description: 'Giảm 15% tiền sân + TẶNG 2 thùng nước (48 chai) & 1 trọng tài bắt chính MỖI TRẬN (Tài trợ 4.680.000đ quà tặng cả gói)'
  },
  8: {
    weeks: 8,
    months: 2,
    title: 'Gói Bạc 2 Tháng (8 tuần liên tiếp)',
    discountRate: 0.10,
    perMatchGifts: [
      { id: 'SRV-WATER', name: 'Nước suối Aquafina đóng chai (Thùng 24 chai)', quantity: 1, unit: 'thùng', singleValue: 120000, lineValue: 120000, icon: '💧' },
      { id: 'SRV-BIB', name: 'Bộ 10 áo bib chia đội dạ quang', quantity: 1, unit: 'bộ', singleValue: 30000, lineValue: 30000, icon: '🎽' }
    ],
    perMatchGiftValue: 150000,
    totalGiftValue: 1200000,
    giftSummary: '1 thùng nước suối (24 chai) + 1 bộ áo bib thi đấu MỖI TRẬN',
    badge: 'ƯU ĐÃI 2 THÁNG',
    description: 'Giảm 10% tiền sân + TẶNG 1 thùng nước & 1 bộ áo bib thi đấu MỖI TRẬN (Tài trợ 1.200.000đ quà tặng)'
  },
  4: {
    weeks: 4,
    months: 1,
    title: 'Gói Đồng 1 Tháng (4 tuần liên tiếp)',
    discountRate: 0.05,
    perMatchGifts: [
      { id: 'SRV-WATER-LOK', name: 'Lốc nước suối Aquafina (12 chai 500ml)', quantity: 1, unit: 'lốc', singleValue: 60000, lineValue: 60000, icon: '💧' },
      { id: 'SRV-BALL', name: 'Bóng thi đấu Động Lực FIFA Quality', quantity: 1, unit: 'quả', singleValue: 20000, lineValue: 20000, icon: '⚽' }
    ],
    perMatchGiftValue: 80000,
    totalGiftValue: 320000,
    giftSummary: '1 lốc nước (12 chai) + Miễn phí bóng thi đấu MỖI TRẬN',
    badge: 'ƯU ĐÃI 1 THÁNG',
    description: 'Giảm 5% tiền sân + TẶNG 1 lốc nước (12 chai) & bóng thi đấu MỖI TRẬN (Tài trợ 320.000đ quà tặng)'
  }
};

window.SanBongData = {
  DEFAULT_PITCHES,
  DEFAULT_TIME_SLOTS,
  DEFAULT_EXTRA_SERVICES,
  DEFAULT_VOUCHERS,
  PACKAGE_PROMOTIONS,
  DEFAULT_USER,
  DEFAULT_BANK_INFO,
  DEFAULT_SYSTEM_CONFIG,
  DEFAULT_BOOKINGS,
  getTodayDateString
};

;
/* === helpers.js === */

(function () {
  'use strict';

  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatVND(amount) {
    const num = Number(amount) || 0;
    return num.toLocaleString('vi-VN') + 'đ';
  }

  function formatDateVN(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  function getLocalTodayISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  let _csrfMemoryToken = '';

  function getCsrfToken() {
    if (_csrfMemoryToken) return _csrfMemoryToken;
    try {
      const meta = document.querySelector('meta[name="csrf-token"]');
      if (meta && meta.content) {
        _csrfMemoryToken = meta.content.trim();
        return _csrfMemoryToken;
      }
      const st = (sessionStorage.getItem('sb_csrf_token') || '').trim();
      if (st) {
        _csrfMemoryToken = st;
        return _csrfMemoryToken;
      }
      return '';
    } catch (e) {
      return _csrfMemoryToken || '';
    }
  }

  function setCsrfToken(token) {
    if (!token || typeof token !== 'string') return;
    const clean = token.trim();
    if (!clean) return;
    _csrfMemoryToken = clean;
    try {
      sessionStorage.setItem('sb_csrf_token', clean);
      let meta = document.querySelector('meta[name="csrf-token"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'csrf-token';
        document.head && document.head.appendChild(meta);
      }
      meta.content = clean;
    } catch (e) {}
  }

  function clearCsrfToken() {
    _csrfMemoryToken = '';
    try {
      sessionStorage.removeItem('sb_csrf_token');
    } catch (e) {}
  }

  async function ensureCsrfToken(apiBase) {
    const current = getCsrfToken();
    if (current) return current;
    try {
      const base = apiBase !== undefined ? apiBase : (getAppBase() ? getAppBase() + '/' : '/');
      const url = `${base}api/auth.php?action=me`;
      const res = await fetch(url, { credentials: 'same-origin' });
      if (res.ok) {
        const json = await res.json();
        if (json && json.csrf_token) {
          setCsrfToken(json.csrf_token);
          return json.csrf_token;
        }
      }
    } catch (e) {}
    return getCsrfToken();
  }

  function getAuthFetchHeaders(extra = {}) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, extra || {});
    const token = getCsrfToken();
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
    return headers;
  }

  async function secureFetch(url, options = {}) {
    await ensureCsrfToken();
    const opts = Object.assign({}, options);
    opts.headers = getAuthFetchHeaders(opts.headers);
    if (!opts.credentials) opts.credentials = 'same-origin';
    const res = await fetch(url, opts);
    const tokenHeader = res.headers ? res.headers.get('X-CSRF-Token') : null;
    if (tokenHeader) {
      setCsrfToken(tokenHeader);
    }
    return res;
  }

  function getAppBase() {
    const pathname = (window.location && typeof window.location.pathname === 'string')
      ? window.location.pathname.replace(/\\/g, '/')
      : '/';
    const match = pathname.match(/^(.*?\/Quan_Ly_San_Bong)/i);
    return match ? match[1] : '';
  }

  function getRelativePath(target) {
    const base = getAppBase();
    const fallback = base ? `${base}/` : '/';
    if (!target || target === 'index.html' || target === '/' || target === '') {
      return fallback;
    }
    const raw = String(target).trim();
    if (/^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/\/)/.test(raw) || raw.includes('\\') || raw.includes('..')) {
      return fallback;
    }
    const cleanTarget = raw
      .replace(/^\.\.\//, '')
      .replace(/^html\//, '')
      .replace(/^\/+/, '')
      .replace(/\.html(?=$|[?#])/, '');
    if (!/^[a-zA-Z0-9_\-\/\.]+(?:\?[a-zA-Z0-9_=&%\-\.]*)?(?:#[a-zA-Z0-9_\-]*)?$/.test(cleanTarget)) {
      return fallback;
    }
    if (cleanTarget === 'portal-admin' || cleanTarget === 'portal-admin/') {
      return base ? `${base}/portal-admin/` : '/portal-admin/';
    }
    return base ? `${base}/${cleanTarget}` : `/${cleanTarget}`;
  }

  const Icons = {
    ball: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg>`,
    calendar: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
    clock: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    mapPin: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
    check: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="20 6 9 17 4 12"/></svg>`,
    copy: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
    grid: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,
    list: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>`,
    pitch: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="12" x2="12" y1="5" y2="19"/><circle cx="12" cy="12" r="3"/></svg>`,
    tag: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>`,
    users: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    wallet: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>`,
    chart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>`,
    settings: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    home: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    user: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    bell: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
    search: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
    filter: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
    phone: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    arrowRight: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
    arrowLeft: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>`,
    download: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
    share: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>`
  };

  function renderPitchSVG(variant = 'standard', heightClass = 'h-40') {
    const palettes = {
      standard: { c1: '#15803D', c2: '#16A34A', line: 'rgba(255,255,255,0.85)' },
      deep:     { c1: '#14532D', c2: '#15803D', line: 'rgba(255,255,255,0.8)' },
      bright:   { c1: '#16A34A', c2: '#22C55E', line: 'rgba(255,255,255,0.9)' },
      twin:     { c1: '#065F46', c2: '#059669', line: 'rgba(255,255,255,0.85)' },
      muted:    { c1: '#475569', c2: '#64748B', line: 'rgba(255,255,255,0.55)' },
      hero:     { c1: '#064E3B', c2: '#047857', line: 'rgba(255,255,255,0.22)' }
    };
    const p = palettes[variant] || palettes.standard;
    return `
    <div class="w-full ${heightClass} relative overflow-hidden select-none" style="background:${p.c1}">
      <svg viewBox="0 0 600 320" preserveAspectRatio="xMidYMid slice" class="w-full h-full">
        <rect x="0" y="0" width="60" height="320" fill="${p.c1}"/>
        <rect x="60" y="0" width="60" height="320" fill="${p.c2}"/>
        <rect x="120" y="0" width="60" height="320" fill="${p.c1}"/>
        <rect x="180" y="0" width="60" height="320" fill="${p.c2}"/>
        <rect x="240" y="0" width="60" height="320" fill="${p.c1}"/>
        <rect x="300" y="0" width="60" height="320" fill="${p.c2}"/>
        <rect x="360" y="0" width="60" height="320" fill="${p.c1}"/>
        <rect x="420" y="0" width="60" height="320" fill="${p.c2}"/>
        <rect x="480" y="0" width="60" height="320" fill="${p.c1}"/>
        <rect x="540" y="0" width="60" height="320" fill="${p.c2}"/>
        <rect x="36" y="24" width="528" height="272" rx="4" fill="none" stroke="${p.line}" stroke-width="3"/>
        <line x1="300" y1="24" x2="300" y2="296" stroke="${p.line}" stroke-width="3"/>
        <circle cx="300" cy="160" r="44" fill="none" stroke="${p.line}" stroke-width="3"/>
        <circle cx="300" cy="160" r="4" fill="${p.line}"/>
        <rect x="36" y="84" width="86" height="152" fill="none" stroke="${p.line}" stroke-width="3"/>
        <rect x="36" y="120" width="36" height="80" fill="none" stroke="${p.line}" stroke-width="3"/>
        <rect x="20" y="136" width="16" height="48" fill="none" stroke="${p.line}" stroke-width="2.5"/>
        <path d="M 122 128 A 36 36 0 0 1 122 192" fill="none" stroke="${p.line}" stroke-width="3"/>
        <rect x="478" y="84" width="86" height="152" fill="none" stroke="${p.line}" stroke-width="3"/>
        <rect x="528" y="120" width="36" height="80" fill="none" stroke="${p.line}" stroke-width="3"/>
        <rect x="564" y="136" width="16" height="48" fill="none" stroke="${p.line}" stroke-width="2.5"/>
        <path d="M 478 128 A 36 36 0 0 0 478 192" fill="none" stroke="${p.line}" stroke-width="3"/>
        <path d="M 36 38 A 14 14 0 0 0 50 24" fill="none" stroke="${p.line}" stroke-width="2.5"/>
        <path d="M 550 24 A 14 14 0 0 0 564 38" fill="none" stroke="${p.line}" stroke-width="2.5"/>
        <path d="M 36 282 A 14 14 0 0 1 50 296" fill="none" stroke="${p.line}" stroke-width="2.5"/>
        <path d="M 550 296 A 14 14 0 0 1 564 282" fill="none" stroke="${p.line}" stroke-width="2.5"/>
      </svg>
    </div>`;
  }

  function statusPill(label) {
    const raw = String(label ?? '').trim();
    const lower = raw.toLowerCase();
    let displayLabel = raw;
    if (lower === 'completed' || lower === 'hoàn thành') {
      displayLabel = 'Hoàn thành';
    } else if (lower === 'cancelled' || lower === 'canceled' || lower === 'đã hủy') {
      displayLabel = 'Đã hủy';
    } else if (lower === 'confirmed' || lower === 'đã xác nhận') {
      displayLabel = 'Đã xác nhận';
    } else if (lower === 'playing' || lower === 'đang đá') {
      displayLabel = 'Đang đá';
    } else if (lower === 'pending' || lower === 'hold' || lower === 'giữ chỗ') {
      displayLabel = 'Giữ chỗ';
    } else if (lower === 'noshow' || lower === 'no-show' || lower === 'no_show' || raw === 'Vắng mặt (No-Show)' || raw.includes('No-Show')) {
      displayLabel = 'Khách chưa đến';
    } else if (lower === 'paid' || lower === 'đã thanh toán 100%' || lower === 'đã thanh toán đủ') {
      displayLabel = raw === 'Đã thanh toán đủ' ? 'Đã thanh toán đủ' : 'Đã thanh toán 100%';
    } else if (lower === 'deposited' || lower === 'đã cọc') {
      displayLabel = 'Đã cọc';
    }
    const map = {
      'Trống': 'bg-white text-[#16A34A] border border-[#16A34A] font-semibold',
      'Giữ chỗ': 'bg-[#FEF3C7] text-[#D97706] border border-[#F59E0B] font-semibold',
      'Chờ duyệt cọc': 'bg-[#FEF3C7] text-[#D97706] border border-[#F59E0B] font-semibold',
      'Chờ thanh toán': 'bg-[#FEF3C7] text-[#D97706] border border-[#F59E0B] font-semibold',
      'Đã xác nhận': 'bg-[#DCFCE7] text-[#16A34A] border border-[#16A34A] font-semibold',
      'Hoạt động': 'bg-[#DCFCE7] text-[#16A34A] border border-[#16A34A] font-semibold',
      'Đang đá': 'bg-[#DBEAFE] text-[#2563EB] border border-[#2563EB] font-semibold',
      'Hoàn thành': 'bg-[#F1F5F9] text-[#475569] border border-[#94A3B8] font-semibold',
      'Đã hủy': 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] font-semibold',
      'Vắng mặt': 'bg-[#DC2626] text-white border border-[#B91C1C] font-semibold',
      'Vắng mặt (No-Show)': 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] font-bold',
      'Khách chưa đến': 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] font-bold',
      'Quá giờ chưa đến': 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] font-bold',
      'Tịch thu cọc 30%': 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] font-semibold',
      'Đã đá - chưa tất toán': 'bg-[#FEF3C7] text-[#B45309] border border-[#F59E0B] font-semibold',
      'Đã thanh toán 100%': 'bg-[#DCFCE7] text-[#16A34A] border border-[#86EFAC] font-semibold',
      'Đã nhả sân trống': 'bg-[#DCFCE7] text-[#16A34A] border border-[#86EFAC] font-bold',
      'Đã khóa': 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] font-semibold',
      'Bảo trì': 'hatch-slate border border-[#CBD5E1] text-[#475569] font-semibold'
    };
    const cls = map[displayLabel] || map[raw] || 'bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1] font-semibold';
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium whitespace-nowrap ${cls}">${escapeHTML(displayLabel)}</span>`;
  }

  function getVietQRUrl(bankCode, accountNo, amount, memo, accountName) {
    const safeBank = encodeURIComponent(bankCode || 'VCB');
    const safeAcc = encodeURIComponent(accountNo || '0123456789');
    const safeAmount = encodeURIComponent(amount || 0);
    const safeMemo = encodeURIComponent(memo || 'DAT SAN BONG');
    let holder = accountName;
    if (!holder) {
      try {
        const db = window.SanBongApp?.SanBongDB || window.SanBongDB;
        if (db && typeof db.getBankInfo === 'function') {
          const bInfo = db.getBankInfo();
          if (bInfo && bInfo.accountName) holder = bInfo.accountName;
        }
      } catch (e) {}
    }
    const safeName = encodeURIComponent(holder || 'CHU SAN BONG');
    return `https://img.vietqr.io/image/${safeBank}-${safeAcc}-compact2.png?amount=${safeAmount}&addInfo=${safeMemo}&accountName=${safeName}`;
  }

  function renderQRCodeSVG(data, size = 160) {
    let content = String(data || 'SANBONG-PRO');
    // If only size passed as number (legacy call)
    if (typeof data === 'number' && !size) {
      size = data;
      content = 'SANBONG-PRO';
    }
    if (typeof window !== 'undefined' && typeof window.qrcode === 'function') {
      try {
        const qr = window.qrcode(0, 'M');
        qr.addData(content);
        qr.make();
        const count = qr.getModuleCount();
        const cellSize = Math.max(2, Math.floor(size / count));
        return qr.createSvgTag(cellSize, 2);
      } catch (e) {
        console.warn('qrcode generator error:', e);
      }
    }
    const safeCode = escapeHTML(content);
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="QR ${safeCode}" class="w-full h-full rounded-lg border border-slate-200 bg-white"><rect width="100%" height="100%" fill="#FFFFFF"/><text x="50%" y="46%" dominant-baseline="middle" text-anchor="middle" fill="#0F172A" font-family="monospace" font-size="13" font-weight="700">${safeCode}</text><text x="50%" y="62%" dominant-baseline="middle" text-anchor="middle" fill="#64748B" font-family="sans-serif" font-size="10">Mã vé điện tử</text></svg>`;
  }

  function playScanBeep(success = true) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (success) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1760, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {}
  }

  function downloadTicketQR(bookingCode) {
    if (!bookingCode) return;
    const db = window.SanBongApp?.SanBongDB || window.SanBongDB;
    const b = db ? db.getBookingByCode(bookingCode) : null;
    const customer = b ? b.customerName : 'Khách hàng';
    const pitch = b ? b.pitchName : 'Sân bóng';
    const time = b ? `${formatDateVN(b.date)} · ${b.slotTime}` : '';

    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 620;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 480, 620);

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, 480, 105);

    ctx.fillStyle = '#16A34A';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('⚽ HỆ THỐNG SÂN BÓNG PRO', 24, 38);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('VÉ ĐIỆN TỬ CHECK-IN NHẬN SÂN', 24, 72);

    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(24, 120, 432, 125);
    ctx.strokeStyle = '#E2E8F0';
    ctx.strokeRect(24, 120, 432, 125);

    ctx.fillStyle = '#64748B';
    ctx.font = '11px sans-serif';
    ctx.fillText('MÃ VÉ ĐIỆN TỬ', 40, 145);
    ctx.fillStyle = '#16A34A';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(bookingCode, 40, 172);

    ctx.fillStyle = '#64748B';
    ctx.font = '11px sans-serif';
    ctx.fillText('SÂN THI ĐẤU', 250, 145);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(pitch.length > 20 ? pitch.slice(0, 18) + '...' : pitch, 250, 170);

    ctx.fillStyle = '#64748B';
    ctx.font = '11px sans-serif';
    ctx.fillText('KHÁCH HÀNG', 40, 205);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(customer, 40, 226);

    ctx.fillStyle = '#64748B';
    ctx.font = '11px sans-serif';
    ctx.fillText('THỜI GIAN', 250, 205);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(time, 250, 226);

    const qrSize = 220;
    const qrX = (480 - qrSize) / 2;
    const qrY = 265;

    if (typeof window.qrcode === 'function') {
      try {
        const qr = window.qrcode(0, 'M');
        qr.addData(bookingCode);
        qr.make();
        const count = qr.getModuleCount();
        const cellSize = qrSize / count;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
        ctx.strokeStyle = '#16A34A';
        ctx.lineWidth = 2;
        ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

        for (let r = 0; r < count; r++) {
          for (let c = 0; c < count; c++) {
            ctx.fillStyle = qr.isDark(r, c) ? '#0F172A' : '#FFFFFF';
            ctx.fillRect(qrX + c * cellSize, qrY + r * cellSize, cellSize + 0.5, cellSize + 0.5);
          }
        }
      } catch (e) {}
    }

    ctx.fillStyle = '#475569';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Xuất trình mã QR này tại quầy để nhân viên quét nhận sân & bật đèn.', 240, 525);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '11px sans-serif';
    ctx.fillText('Hotline hỗ trợ: 0352 313 548 · Chúc bạn có trận đấu bùng nổ!', 240, 550);
    ctx.textAlign = 'left';

    try {
      const link = document.createElement('a');
      link.download = `Ve-SanBong-${bookingCode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast('✓ Đã tải vé QR điện tử về máy thành công!', 'success');
      }
    } catch (e) {
      console.warn('download error:', e);
    }
  }

  window.SanBongHelpers = {
    escapeHTML,
    formatVND,
    formatDateVN,
    getLocalTodayISO,
    getCsrfToken,
    setCsrfToken,
    clearCsrfToken,
    ensureCsrfToken,
    secureFetch,
    getAuthFetchHeaders,
    getAppBase,
    getRelativePath,
    Icons,
    renderPitchSVG,
    statusPill,
    getVietQRUrl,
    renderQRCodeSVG,
    playScanBeep,
    downloadTicketQR
  };

  window.escapeHTML = escapeHTML;
  window.formatVND = formatVND;
  window.formatDateVN = formatDateVN;
  window.getLocalTodayISO = getLocalTodayISO;
  window.getCsrfToken = getCsrfToken;
  window.setCsrfToken = setCsrfToken;
  window.ensureCsrfToken = ensureCsrfToken;
  window.secureFetch = secureFetch;
  window.getAuthFetchHeaders = getAuthFetchHeaders;
  window.getRelativePath = getRelativePath;

})();

;
/* === db_core.js === */
(function () {
  'use strict';

  const DEFAULT_SYSTEM_CONFIG = window.DEFAULT_SYSTEM_CONFIG || window.SanBongData?.DEFAULT_SYSTEM_CONFIG || {
    depositRate: 30,
    hotline: '0352 313 548',
    openHours: '05:30 - 22:30 hàng ngày (kể cả Lễ, Tết)',
    holdMinutes: 15,
    waitlistHoldMinutes: 15,
    refundFullHours: 24,
    refundPartialHours: 4,
    autoCancelEnabled: true,
    matchmakingEnabled: true,
    matchmakingRequireApproval: false,
    loyaltyBottleCostPoints: 100,
    pricingTable: null
  };
  window.DEFAULT_SYSTEM_CONFIG = DEFAULT_SYSTEM_CONFIG;

  const STORAGE_KEYS = {
    PITCHES: 'sb_pitches_v2',
    TIME_SLOTS: 'sb_slots_v1',
    SERVICES: 'sb_services_v1',
    VOUCHERS: 'sb_vouchers_v1',
    GOLDEN_HOURS: 'sb_golden_hours_v1',
    MAINTENANCE: 'sb_maintenance_v1',
    USER: 'sb_user_v1',
    BANK: 'sb_bank_v1',
    BOOKINGS: 'sb_bookings_v1',
    PENDING_PAYMENTS: 'sb_pending_payments_v3',
    AUDIT_LOGS: 'sb_audit_logs_v1',
    SHIFTS: 'sb_shifts_v1',
    COUNTER_SALES: 'sb_counter_sales_v1',
    BANK_TRANSACTIONS: 'sb_bank_transactions_v1'
  };
  window.STORAGE_KEYS = STORAGE_KEYS;

  window.SanBongDB = window.SanBongDB || {};
  window.SanBongDB.STORAGE_KEYS = STORAGE_KEYS;
  Object.assign(window.SanBongDB, {
    init() {
      if (typeof window !== 'undefined' && window.location && /(?:\/|^)(login|forgot-password)(?:\.html|\/|$)/i.test(String(window.location.pathname || ''))) {
        try {
          localStorage.removeItem(STORAGE_KEYS.USER);
          localStorage.removeItem('sb_user');
          localStorage.removeItem('sb_current_user');
        } catch (e) {}
        return;
      }
      const data = window.SanBongData || {};
      const savedPitches = JSON.parse(localStorage.getItem(STORAGE_KEYS.PITCHES) || '[]');
      if (!localStorage.getItem(STORAGE_KEYS.PITCHES) || savedPitches.length < (data.DEFAULT_PITCHES || []).length) {
        const mergedPitches = [...(data.DEFAULT_PITCHES || [])];
        if (Array.isArray(savedPitches)) {
          savedPitches.forEach(sp => {
            const idx = mergedPitches.findIndex(mp => mp.id === sp.id);
            if (idx >= 0) mergedPitches[idx] = Object.assign({}, mergedPitches[idx], sp);
            else mergedPitches.push(sp);
          });
        }
        localStorage.setItem(STORAGE_KEYS.PITCHES, JSON.stringify(mergedPitches));
      }
      // Ensure weekendPrice exists on all pitches
      try {
        const pList = JSON.parse(localStorage.getItem(STORAGE_KEYS.PITCHES) || '[]');
        let pChanged = false;
        pList.forEach(p => {
          if (!p.weekendPrice || Number(p.weekendPrice) <= 0) {
            p.weekendPrice = Number(p.basePrice) > 0 ? Number(p.basePrice) : (p.type === 11 ? 900000 : (p.type === 7 ? 450000 : 350000));
            pChanged = true;
          }
        });
        if (pChanged) localStorage.setItem(STORAGE_KEYS.PITCHES, JSON.stringify(pList));
      } catch (e) {}

      try {
        const curSlots = JSON.parse(localStorage.getItem(STORAGE_KEYS.TIME_SLOTS) || '[]');
        if (!Array.isArray(curSlots) || curSlots.length !== 7 || Number(curSlots[0]?.duration) !== 2) {
          localStorage.setItem(STORAGE_KEYS.TIME_SLOTS, JSON.stringify(data.DEFAULT_TIME_SLOTS || []));
        }
      } catch (e) {
        localStorage.setItem(STORAGE_KEYS.TIME_SLOTS, JSON.stringify(data.DEFAULT_TIME_SLOTS || []));
      }
      if (!localStorage.getItem(STORAGE_KEYS.SERVICES)) {
        localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(data.DEFAULT_EXTRA_SERVICES || []));
      }
      // Ensure stockQty & minStockWarning exist on all services
      try {
        const sList = JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICES) || '[]');
        let sChanged = false;
        sList.forEach(s => {
          if (s.stockQty === undefined || s.stockQty === null) {
            s.stockQty = s.id === 'SRV-WATER' ? 42 : (s.id === 'SRV-REVIVE' ? 8 : (s.id === 'SRV-REF' ? 15 : 25));
            sChanged = true;
          }
          if (s.minStockWarning === undefined || s.minStockWarning === null) {
            s.minStockWarning = s.id === 'SRV-REF' ? 2 : 10;
            sChanged = true;
          }
        });
        if (sChanged) localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(sList));
      } catch (e) {}

      if (!localStorage.getItem('sb_active_shift_start')) {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        localStorage.setItem('sb_active_shift_start', `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} 06:00`);
      }

      if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
        const initLogs = [
          {
            id: 1,
            created_at: '2026-11-06 08:15:20',
            actor_name: 'Quản Trị Viên',
            actor_role: 'admin',
            action: 'CHECKIN',
            target_code: 'ASFS260039',
            old_value: 'Trạng thái: Đã xác nhận',
            new_value: 'Trạng thái: Đang đá (Check-in 08:15)',
            ip_address: '127.0.0.1'
          },
          {
            id: 2,
            created_at: '2026-11-06 09:05:11',
            actor_name: 'Nguyễn Văn Bình (Ca 1)',
            actor_role: 'staff',
            action: 'COLLECT_PAYMENT',
            target_code: 'ASFF260038',
            old_value: 'Còn nợ: 210.000đ',
            new_value: 'Thu đủ 210.000đ (Tiền mặt tại quầy)',
            ip_address: '127.0.0.1'
          }
        ];
        localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(initLogs));
      }

      if (!localStorage.getItem(STORAGE_KEYS.SHIFTS)) {
        const initShifts = [
          {
            id: 'CA-261105-02',
            staff_name: 'Nguyễn Văn Bình (Trực sân)',
            staff_username: 'staff1',
            opened_at: '2026-11-05 14:00',
            closed_at: '2026-11-05 22:30',
            cash_declared: 2450000,
            transfer_declared: 1850000,
            actual_cash: 2450000,
            diff_amount: 0,
            status: 'confirmed',
            note: 'Bàn giao đủ tiền mặt cuối ngày cho Quản lý'
          }
        ];
        localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(initShifts));
      }
      if (!localStorage.getItem(STORAGE_KEYS.BANK_TRANSACTIONS)) {
        const nowDate = (window.SanBongData && typeof window.SanBongData.getTodayDateString === 'function')
          ? window.SanBongData.getTodayDateString()
          : new Date().toISOString().slice(0, 10);
        const initBankTx = [
          {
            id: 'TX-SEPAY-901',
            reference_code: 'FT2631100901',
            transaction_date: `${nowDate} 10:15:22`,
            bank_name: 'MBBank',
            content: 'CHUYEN TIEN COC SAN BONG TOI NAY',
            detected_code: '',
            booking_code: '',
            amount_in: 200000,
            expected_amount: 0,
            diff_amount: 0,
            match_status: 'unmatched',
            status: 'pending',
            note: 'Thiếu mã đơn đặt sân trong nội dung chuyển khoản'
          },
          {
            id: 'TX-SEPAY-902',
            reference_code: 'FT2631100902',
            transaction_date: `${nowDate} 11:08:40`,
            bank_name: 'Vietcombank',
            content: 'ASFS982145 coc san',
            detected_code: 'ASFS982145',
            booking_code: 'ASFS982145',
            amount_in: 150000,
            expected_amount: 200000,
            diff_amount: -50000,
            match_status: 'underpaid',
            status: 'pending',
            note: 'Khách chuyển thiếu 50.000đ tiền cọc yêu cầu'
          },
          {
            id: 'TX-SEPAY-903',
            reference_code: 'FT2631100903',
            transaction_date: `${nowDate} 11:45:12`,
            bank_name: 'Techcombank',
            content: 'ASFF110283 thanh toan du',
            detected_code: 'ASFF110283',
            booking_code: 'ASFF110283',
            amount_in: 370000,
            expected_amount: 120000,
            diff_amount: 250000,
            match_status: 'overpaid',
            status: 'pending',
            note: 'Khách chuyển dư +250.000đ (có thể đã chuyển đủ 100%)'
          },
          {
            id: 'TX-SEPAY-900',
            reference_code: 'FT2631100900',
            transaction_date: `${nowDate} 09:30:05`,
            bank_name: 'MBBank',
            content: 'ASFE559072',
            detected_code: 'ASFE559072',
            booking_code: 'ASFE559072',
            amount_in: 500000,
            expected_amount: 500000,
            diff_amount: 0,
            match_status: 'matched',
            status: 'resolved',
            note: 'Tự động đối soát khớp 100% qua SePay Webhook'
          }
        ];
        localStorage.setItem(STORAGE_KEYS.BANK_TRANSACTIONS, JSON.stringify(initBankTx));
      }
      if (!localStorage.getItem(STORAGE_KEYS.VOUCHERS)) {
        localStorage.setItem(STORAGE_KEYS.VOUCHERS, JSON.stringify(data.DEFAULT_VOUCHERS || []));
      } else {
        try {
          const savedVouchers = JSON.parse(localStorage.getItem(STORAGE_KEYS.VOUCHERS) || '[]');
          const defVouchers = data.DEFAULT_VOUCHERS || [];
          if (Array.isArray(savedVouchers) && savedVouchers.length < defVouchers.length) {
            const merged = [...savedVouchers];
            defVouchers.forEach(dv => {
              if (!merged.some(sv => sv.code === dv.code)) {
                merged.push(dv);
              }
            });
            localStorage.setItem(STORAGE_KEYS.VOUCHERS, JSON.stringify(merged));
          }
        } catch (e) {}
      }
      try {
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem('sb_user');
      } catch (e) {}
      const currentBank = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANK) || '{}');
      if (!localStorage.getItem(STORAGE_KEYS.BANK) || currentBank.accountName === 'NGUYEN VAN HUNG' || currentBank.branch?.includes('Nam Sài Gòn')) {
        localStorage.setItem(STORAGE_KEYS.BANK, JSON.stringify(data.DEFAULT_BANK_INFO || {}));
      }
      if (!localStorage.getItem(STORAGE_KEYS.BOOKINGS)) {
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(data.DEFAULT_BOOKINGS || []));
      }
      if (!localStorage.getItem(STORAGE_KEYS.PENDING_PAYMENTS)) {
        let processed = [];
        try {
          processed = JSON.parse(localStorage.getItem('sb_processed_receipts_v1') || '[]');
          if (!Array.isArray(processed)) processed = [];
        } catch (e) {
          processed = [];
        }
        const defaultPending = [
          { time: '10:12', code: 'ASFS260042', name: 'Trần Minh Hoàng', amt: 306000, bank: 'Vietcombank' },
          { time: '11:05', code: 'ASFS260044', name: 'Phạm Quốc Bảo', amt: 126000, bank: 'Vietcombank' },
          { time: '13:40', code: 'ASFF260045', name: 'Đỗ Thành Long', amt: 90000, bank: 'MB Bank' }
        ].filter(item => !processed.includes(item.code));
        localStorage.setItem(STORAGE_KEYS.PENDING_PAYMENTS, JSON.stringify(defaultPending));
      }

      try {
        const rawPending = localStorage.getItem(STORAGE_KEYS.PENDING_PAYMENTS);
        if (rawPending && rawPending.includes('SB-')) {
          const list = JSON.parse(rawPending);
          if (Array.isArray(list)) {
            const upgraded = list.map(item => {
              if (item.code && item.code.startsWith('SB-')) {
                const pfx = (item.code.includes('0045') || (item.amt && item.amt <= 100000)) ? 'ASFF' : 'ASFS';
                item.code = item.code.replace(/^SB-\d+-?/, pfx + '26');
              }
              return item;
            });
            localStorage.setItem(STORAGE_KEYS.PENDING_PAYMENTS, JSON.stringify(upgraded));
          }
        }
        const rawBookings = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
        if (rawBookings) {
          const bList = JSON.parse(rawBookings);
          if (Array.isArray(bList)) {
            const pitches = this.getPitches();
            let changed = false;
            const upgradedB = bList.map(b => {
              if (b.code && b.code.startsWith('SB-')) {
                const p = pitches.find(pitch => pitch.id === b.pitchId);
                let pfx = 'ASFS';
                if (p?.type === 5 || (b.pitchId && b.pitchId.startsWith('P5'))) pfx = 'ASFF';
                else if (p?.type === 11 || (b.pitchId && b.pitchId.startsWith('P11'))) pfx = 'ASFE';
                b.code = b.code.replace(/^SB-\d+-?/, pfx + '26');
                changed = true;
              }
              if (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) {
                b.status = 'Khách chưa đến';
                changed = true;
              }
              if (b.note && String(b.note).includes('No-Show')) {
                b.note = String(b.note)
                  .replace(/Hủy No-Show do quá 15p/g, 'Quá 15p khách chưa đến')
                  .replace(/No-Show/g, 'Quá 15p khách chưa đến');
                changed = true;
              }
              const tot = Number(b.totalPrice || 0);
              const dep = Number(b.depositAmount || Math.round(tot * 0.3));
              if (b.status === 'Hoàn thành') {
                if (!b.paidRemainingAmount || b.paidRemainingAmount <= 0) {
                  b.paidRemainingAmount = Math.max(0, tot - dep);
                  changed = true;
                }
                if (b.note && String(b.note).includes('phần còn lại 0đ')) {
                  b.note = String(b.note).replace('phần còn lại 0đ', `phần còn lại ${b.paidRemainingAmount.toLocaleString('vi-VN')}đ`);
                  changed = true;
                }
              } else if (b.status !== 'Đã hủy' && b.status !== 'Khách chưa đến' && typeof b.remainingAmount !== 'number') {
                b.remainingAmount = Math.max(0, tot - dep);
                changed = true;
              }
              return b;
            });
            if (changed) {
              localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(upgradedB));
            }
          }
        }
      } catch (e) {}

      try {
        const rawSysCfg = localStorage.getItem('sb_system_config');
        if (rawSysCfg) {
          const parsedSysCfg = JSON.parse(rawSysCfg);
          if (parsedSysCfg && typeof parsedSysCfg === 'object' && !Array.isArray(parsedSysCfg)) {
            let cfgChanged = false;
            ['openHours', 'open_hours'].forEach(key => {
              if (typeof parsedSysCfg[key] === 'string' && parsedSysCfg[key].includes('05:30 - 23:00')) {
                parsedSysCfg[key] = parsedSysCfg[key].replace(/05:30 - 23:00/g, '05:30 - 22:30');
                cfgChanged = true;
              }
            });
            if (cfgChanged) {
              localStorage.setItem('sb_system_config', JSON.stringify(parsedSysCfg));
            }
          }
        }
      } catch (e) {}

      this.syncFromServer();
    },

    async syncFromServer() {
      try {
        const isAdminPortal = Boolean(typeof window !== 'undefined' && window.location && String(window.location.pathname || '').includes('portal-admin'));
        const res = await fetch(getRelativePath(isAdminPortal ? 'api/pitches.php?all=1&include_hidden=1' : 'api/pitches.php?all=1'));
        if (!res.ok) return;
        const jsonRes = await res.json();
        if (jsonRes?.csrf_token && window.SanBongHelpers?.setCsrfToken) {
          window.SanBongHelpers.setCsrfToken(jsonRes.csrf_token);
        }
        if (jsonRes && jsonRes.success && jsonRes.data) {
          const d = jsonRes.data;
          if (Array.isArray(d.pitches) && d.pitches.length > 0) {
            localStorage.setItem(STORAGE_KEYS.PITCHES, JSON.stringify(d.pitches));
          }
          if (Array.isArray(d.timeSlots) && d.timeSlots.length > 0) {
            localStorage.setItem(STORAGE_KEYS.TIME_SLOTS, JSON.stringify(d.timeSlots));
          }
          if (Array.isArray(d.extraServices) && d.extraServices.length > 0) {
            localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(d.extraServices));
          }
          if (Array.isArray(d.vouchers)) {
            localStorage.setItem(STORAGE_KEYS.VOUCHERS, JSON.stringify(d.vouchers));
          }
          if (Array.isArray(d.goldenHourRules)) {
            localStorage.setItem(STORAGE_KEYS.GOLDEN_HOURS, JSON.stringify(d.goldenHourRules));
          }
          if (Array.isArray(d.maintenanceSchedules)) {
            localStorage.setItem(STORAGE_KEYS.MAINTENANCE, JSON.stringify(d.maintenanceSchedules));
          }
          if (d.bankInfo && typeof d.bankInfo === 'object') {
            const b = {
              bankName: d.bankInfo.bankName || d.bankInfo.bank_name || 'Vietcombank',
              bankCode: d.bankInfo.bankCode || d.bankInfo.bank_code || 'VCB',
              accountNo: d.bankInfo.accountNo || d.bankInfo.accountNumber || d.bankInfo.account_no || '0123456789',
              accountNumber: d.bankInfo.accountNumber || d.bankInfo.accountNo || d.bankInfo.account_no || '0123456789',
              accountName: d.bankInfo.accountName || d.bankInfo.account_holder || 'CONG TY CP SAN BONG PRO'
            };
            localStorage.setItem(STORAGE_KEYS.BANK, JSON.stringify(b));
          }
          if (d.settings && typeof d.settings === 'object') {
            const prevCfg = this.getSystemConfig ? this.getSystemConfig() : DEFAULT_SYSTEM_CONFIG;
            const autoRaw = d.settings.autoCancelEnabled ?? d.settings.auto_cancel_enabled;
            const mmEnabledRaw = d.settings.matchmakingEnabled ?? d.settings.matchmaking_enabled;
            const mmApprovalRaw = d.settings.matchmakingRequireApproval ?? d.settings.matchmaking_require_approval;
            const cfg = {
              depositRate: Number(d.settings.depositRate ?? d.settings.deposit_rate ?? prevCfg.depositRate ?? DEFAULT_SYSTEM_CONFIG.depositRate),
              hotline: d.settings.hotline || prevCfg.hotline || DEFAULT_SYSTEM_CONFIG.hotline,
              openHours: d.settings.openHours || d.settings.open_hours || prevCfg.openHours || DEFAULT_SYSTEM_CONFIG.openHours,
              holdMinutes: Number(d.settings.holdMinutes ?? d.settings.hold_minutes ?? prevCfg.holdMinutes ?? DEFAULT_SYSTEM_CONFIG.holdMinutes),
              waitlistHoldMinutes: Number(d.settings.waitlistHoldMinutes ?? d.settings.waitlist_hold_minutes ?? prevCfg.waitlistHoldMinutes ?? DEFAULT_SYSTEM_CONFIG.waitlistHoldMinutes),
              refundFullHours: Number(d.settings.refundFullHours ?? d.settings.refund_full_hours ?? prevCfg.refundFullHours ?? DEFAULT_SYSTEM_CONFIG.refundFullHours),
              refundPartialHours: Number(d.settings.refundPartialHours ?? d.settings.refund_partial_hours ?? prevCfg.refundPartialHours ?? DEFAULT_SYSTEM_CONFIG.refundPartialHours),
              autoCancelEnabled: autoRaw === undefined ? (prevCfg.autoCancelEnabled ?? DEFAULT_SYSTEM_CONFIG.autoCancelEnabled) : (autoRaw === true || autoRaw === 1 || autoRaw === '1' || autoRaw === 'true'),
              matchmakingEnabled: mmEnabledRaw === undefined ? (prevCfg.matchmakingEnabled ?? true) : (mmEnabledRaw === true || mmEnabledRaw === 1 || mmEnabledRaw === '1' || mmEnabledRaw === 'true'),
              matchmakingRequireApproval: mmApprovalRaw === undefined ? (prevCfg.matchmakingRequireApproval ?? false) : (mmApprovalRaw === true || mmApprovalRaw === 1 || mmApprovalRaw === '1' || mmApprovalRaw === 'true'),
              loyaltyBottleCostPoints: Math.max(1, Number(d.settings.loyaltyBottleCostPoints ?? d.settings.loyalty_bottle_cost_points ?? prevCfg.loyaltyBottleCostPoints ?? 100) || 100),
              pricingTable: d.settings.pricingTable || prevCfg.pricingTable || null
            };
            localStorage.setItem('sb_system_config', JSON.stringify(cfg));
          }
          window.dispatchEvent(new CustomEvent('sb-data-synced', { detail: d }));
        }
      } catch (e) {}
    },

    getSystemConfig() {
      try {
        const cfg = JSON.parse(localStorage.getItem('sb_system_config') || '{}');
        const autoRaw = cfg.autoCancelEnabled ?? cfg.auto_cancel_enabled;
        const mmEnabledRaw = cfg.matchmakingEnabled ?? cfg.matchmaking_enabled;
        const mmApprovalRaw = cfg.matchmakingRequireApproval ?? cfg.matchmaking_require_approval;
        return {
          depositRate: Number(cfg.depositRate ?? cfg.deposit_rate ?? DEFAULT_SYSTEM_CONFIG.depositRate) || 30,
          hotline: cfg.hotline || DEFAULT_SYSTEM_CONFIG.hotline,
          openHours: cfg.openHours || cfg.open_hours || DEFAULT_SYSTEM_CONFIG.openHours,
          holdMinutes: Math.max(5, Math.min(120, Number(cfg.holdMinutes ?? cfg.hold_minutes ?? DEFAULT_SYSTEM_CONFIG.holdMinutes) || 15)),
          waitlistHoldMinutes: Math.max(5, Math.min(120, Number(cfg.waitlistHoldMinutes ?? cfg.waitlist_hold_minutes ?? DEFAULT_SYSTEM_CONFIG.waitlistHoldMinutes) || 15)),
          refundFullHours: Math.max(1, Math.min(168, Number(cfg.refundFullHours ?? cfg.refund_full_hours ?? DEFAULT_SYSTEM_CONFIG.refundFullHours) || 24)),
          refundPartialHours: Math.max(0, Math.min(48, Number(cfg.refundPartialHours ?? cfg.refund_partial_hours ?? DEFAULT_SYSTEM_CONFIG.refundPartialHours) ?? 4)),
          autoCancelEnabled: autoRaw === undefined ? DEFAULT_SYSTEM_CONFIG.autoCancelEnabled : (autoRaw === true || autoRaw === 1 || autoRaw === '1' || autoRaw === 'true'),
          matchmakingEnabled: mmEnabledRaw === undefined ? true : (mmEnabledRaw === true || mmEnabledRaw === 1 || mmEnabledRaw === '1' || mmEnabledRaw === 'true'),
          matchmakingRequireApproval: mmApprovalRaw === undefined ? false : (mmApprovalRaw === true || mmApprovalRaw === 1 || mmApprovalRaw === '1' || mmApprovalRaw === 'true'),
          loyaltyBottleCostPoints: Math.max(1, Number(cfg.loyaltyBottleCostPoints ?? cfg.loyalty_bottle_cost_points ?? DEFAULT_SYSTEM_CONFIG.loyaltyBottleCostPoints) || 100),
          pricingTable: cfg.pricingTable || null
        };
      } catch (e) {
        return Object.assign({}, DEFAULT_SYSTEM_CONFIG);
      }
    },

    getGoldenHourRules() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.GOLDEN_HOURS) || '[]') || [];
      } catch (e) {
        return [];
      }
    },

    getMaintenanceSchedules() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.MAINTENANCE) || '[]') || [];
      } catch (e) {
        return [];
      }
    },

    findMaintenanceForSlot(pitchId, dateStr, slotTime = '') {
      const list = this.getMaintenanceSchedules();
      if (!Array.isArray(list) || !list.length || !pitchId || !dateStr) return null;
      const d = String(dateStr).slice(0, 10);
      const parseMin = (hhmm) => {
        const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
        return m ? (parseInt(m[1], 10) * 60 + parseInt(m[2], 10)) : null;
      };
      const slotMatch = String(slotTime || '').match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
      const sStart = slotMatch ? parseMin(slotMatch[1]) : null;
      const sEnd = slotMatch ? parseMin(slotMatch[2]) : null;
      for (const m of list) {
        if (m.pitchId !== pitchId && m.pitch_id !== pitchId) continue;
        const st = String(m.status || 'scheduled');
        if (st !== 'scheduled' && st !== 'in_progress') continue;
        const mStartDate = String(m.startDate || m.start_date || '');
        const mEndDate = String(m.endDate || m.end_date || '');
        if (!mStartDate || !mEndDate || d < mStartDate || d > mEndDate) continue;
        if (sStart === null || sEnd === null) return m;
        const mStart = parseMin(m.startTime || m.start_time || '05:30') ?? (5 * 60 + 30);
        const mEnd = parseMin(m.endTime || m.end_time || '23:00') ?? (23 * 60);
        if (mEnd <= mStart || (sStart < mEnd && mStart < sEnd)) return m;
      }
      return null;
    },

    getPitches() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.PITCHES)) || [];
      } catch (e) {
        return window.SanBongData?.DEFAULT_PITCHES || [];
      }
    },

    getPitchById(id) {
      const pitches = this.getPitches();
      return pitches.find(p => p.id === id) || null;
    },

    updatePitchStatus(pitchId, status) {
      const pitches = this.getPitches();
      const pitch = pitches.find(p => p.id === pitchId);
      if (pitch) {
        pitch.status = status;
        localStorage.setItem(STORAGE_KEYS.PITCHES, JSON.stringify(pitches));
        return true;
      }
      return false;
    },

    getTimeSlots() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.TIME_SLOTS)) || [];
      } catch (e) {
        return window.SanBongData?.DEFAULT_TIME_SLOTS || [];
      }
    },

    getServices() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICES)) || [];
      } catch (e) {
        return window.SanBongData?.DEFAULT_EXTRA_SERVICES || [];
      }
    },

    getExtraServices() {
      return this.getServices();
    },

    getVouchers() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.VOUCHERS)) || [];
      } catch (e) {
        return window.SanBongData?.DEFAULT_VOUCHERS || [];
      }
    },

    getPackagePromotions() {
      return window.SanBongData?.PACKAGE_PROMOTIONS || {};
    },

    getPackagePromotion(weeks) {
      const all = this.getPackagePromotions();
      const w = parseInt(weeks, 10) || 1;
      if (w >= 12) return all[12] || null;
      if (w >= 8) return all[8] || null;
      if (w >= 4) return all[4] || null;
      return null;
    },

    saveVoucher(v) {
      if (!v || !v.code) return null;
      const code = String(v.code).trim().toUpperCase();
      const origCode = v.originalCode ? String(v.originalCode).trim().toUpperCase() : code;
      const list = this.getVouchers();
      const origIdx = list.findIndex(x => String(x.code).toUpperCase() === origCode);
      const existingIdx = origIdx >= 0 ? origIdx : list.findIndex(x => String(x.code).toUpperCase() === code);
      const prevActive = existingIdx >= 0 && list[existingIdx].isActive !== undefined ? Boolean(list[existingIdx].isActive) : true;
      const item = {
        code,
        description: String(v.description || '').trim() || `Ưu đãi mã ${code}`,
        type: v.type === 'fixed' ? 'fixed' : 'percent',
        value: Math.max(0, Number(v.value) || 0),
        minOrder: Math.max(0, Number(v.minOrder) || 0),
        maxUsage: Math.max(0, Number(v.maxUsage ?? v.max_usage ?? 100)),
        usedCount: Math.max(0, Number(v.usedCount ?? v.used_count ?? (existingIdx >= 0 ? list[existingIdx].usedCount : 0) ?? 0)),
        validFrom: v.validFrom ?? v.valid_from ?? null,
        validTo: v.validTo ?? v.valid_to ?? null,
        pitchTypeLimit: (v.pitchTypeLimit ?? v.pitch_type_limit) ? Number(v.pitchTypeLimit ?? v.pitch_type_limit) : null,
        isActive: v.isActive !== undefined ? Boolean(v.isActive) : prevActive
      };
      if (existingIdx >= 0) {
        list[existingIdx] = item;
      } else {
        list.unshift(item);
      }
      localStorage.setItem(STORAGE_KEYS.VOUCHERS, JSON.stringify(list));
      return item;
    },

    toggleVoucherActive(code) {
      if (!code) return null;
      const target = String(code).trim().toUpperCase();
      const list = this.getVouchers();
      const idx = list.findIndex(x => String(x.code).toUpperCase() === target);
      if (idx < 0) return null;
      list[idx].isActive = list[idx].isActive === false ? true : false;
      localStorage.setItem(STORAGE_KEYS.VOUCHERS, JSON.stringify(list));
      return list[idx];
    },

    deleteVoucher(code) {
      if (!code) return false;
      const target = String(code).trim().toUpperCase();
      const list = this.getVouchers().filter(x => String(x.code).toUpperCase() !== target);
      localStorage.setItem(STORAGE_KEYS.VOUCHERS, JSON.stringify(list));
      return true;
    },

    getBankInfo() {
      try {
        const b = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANK)) || {};
        if (b.accountNo && !b.accountNumber) b.accountNumber = b.accountNo;
        if (b.accountNumber && !b.accountNo) b.accountNo = b.accountNumber;
        return b;
      } catch (e) {
        return window.SanBongData?.DEFAULT_BANK_INFO || {};
      }
    },

  });
})();

;
/* === db_pricing.js === */
(function () {
  'use strict';
  window.SanBongDB = window.SanBongDB || {};
  Object.assign(window.SanBongDB, {
    getUser() {
      try {
        const sessionUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
        const rawName = sessionUser ? (sessionUser.full_name || sessionUser.name || sessionUser.username) : '';
        if (sessionUser && rawName) {
          const customerTier = String(sessionUser.customer_tier || sessionUser.customerTier || sessionUser.tier || 'standard').trim().toLowerCase();
          const tierLabels = { standard: 'Hội viên', bronze: 'Hội viên Đồng', silver: 'Hội viên Bạc', regular: 'Khách thân thiết', gold: 'Hội viên Vàng', vip: 'Khách VIP', diamond: 'Hội viên Kim Cương' };
          return {
            id: sessionUser.id,
            name: rawName,
            full_name: rawName,
            username: sessionUser.username || rawName,
            phone: sessionUser.phone || '',
            email: sessionUser.email || '',
            team: sessionUser.team || '',
            role: sessionUser.role || 'user',
            customer_tier: customerTier,
            tier: sessionUser.role === 'admin'
              ? 'Quản trị viên'
              : (sessionUser.role === 'manager'
                ? 'Quản lý sân'
                : (sessionUser.role === 'staff' ? 'Nhân viên trực sân' : (sessionUser.tier || tierLabels[customerTier] || 'Hội viên'))),
            points: Number(sessionUser.points) || 0,
            avatar: rawName.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() || 'VIP',
            totalBookings: 0,
            favoritePitch: ''
          };
        }
        return null;
      } catch (e) {
        return null;
      }
    },

    getCustomer() {
      return this.getUser();
    },

    getCurrentUser() {
      return this.getUser();
    },

    updateUser(updates) {
      try {
        const sessionUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
        if (sessionUser) {
          const updated = Object.assign({}, sessionUser, updates);
          sessionStorage.setItem('sb_current_user', JSON.stringify(updated));
          try { localStorage.removeItem('sb_current_user'); } catch (e) {}
          return updated;
        }
        return null;
      } catch (e) {
        return null;
      }
    },

    getAllBookings() {
      try {
        return JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.BOOKINGS || window.SanBongDB?.STORAGE_KEYS?.BOOKINGS || 'sb_bookings_v1')) || [];
      } catch (e) {
        return window.SanBongData?.DEFAULT_BOOKINGS || [];
      }
    },

    getBookingByCode(code) {
      if (!code) return null;
      const bookings = this.getAllBookings();
      return bookings.find(b => b.code.toLowerCase() === code.trim().toLowerCase()) || null;
    },

    getSlots(pitchId, dateStr) {
      const slots = this.getTimeSlots();
      const pitch = this.getPitchById(pitchId);
      const isPitchMaintenance = pitch && pitch.status === 'Bảo trì';

      const bookings = this.getAllBookings().filter(b => b.pitchId === pitchId && b.date === dateStr && b.status !== 'Đã hủy' && b.status !== 'Khách chưa đến' && b.status !== 'Vắng mặt (No-Show)' && b.paymentStatus !== 'Tịch thu cọc 30%');

      return slots.map(slot => {
        if (isPitchMaintenance) {
          return { ...slot, status: 'Bảo trì', booking: null, maintenanceReason: pitch?.maintenanceReason || 'Sân đang bảo trì' };
        }
        const mWin = this.findMaintenanceForSlot ? this.findMaintenanceForSlot(pitchId, dateStr, slot.time) : null;
        if (mWin) {
          return { ...slot, status: 'Bảo trì', booking: null, maintenanceReason: mWin.reason || 'Bảo trì định kỳ' };
        }

        const match = bookings.find(b => b.slotId === slot.id || b.slotTime === slot.time);
        if (match) {
          return {
            ...slot,
            status: match.status === 'Đang đá' ? 'Đang đá' : 'Đã đặt',
            booking: match
          };
        }

        return { ...slot, status: 'Trống', booking: null };
      });
    },

    calculatePrice(pitchId, dateStr, slotIdOrTime, servicesList = [], voucherCode = '', weeksCount = 1) {
      const pitch = this.getPitchById(pitchId);
      if (!pitch) return null;

      const weeks = Math.max(1, parseInt(weeksCount, 10) || 1);
      const slots = this.getTimeSlots();
      const slot = slots.find(s => s.id === slotIdOrTime || s.time === slotIdOrTime);
      const isPeak = slot ? slot.isPeak : false;

      let isWeekend = false;
      let dayIso = 1;
      if (dateStr) {
        const dObj = new Date(String(dateStr).split(' ')[0] + 'T00:00:00');
        if (!isNaN(dObj.getTime())) {
          const day = dObj.getDay();
          isWeekend = (day === 0 || day === 6);
          dayIso = day === 0 ? 7 : day;
        }
      }

      let hourlyRate = isPeak ? Number(pitch.peakPrice || pitch.basePrice || 0) : Number(pitch.basePrice || 0);
      if (isWeekend && Number(pitch.weekendPrice) > 0) {
        hourlyRate = isPeak ? Math.max(Number(pitch.peakPrice || 0), Number(pitch.weekendPrice)) : Number(pitch.weekendPrice);
      }

      let singlePitchPrice = Math.round(hourlyRate);
      const rawPitchTotal = singlePitchPrice * weeks;

      let singleServiceTotal = 0;
      const allServices = this.getServices();
      const appliedServices = [];

      if (Array.isArray(servicesList)) {
        servicesList.forEach(item => {
          const srvDef = allServices.find(s => s.id === item.id);
          if (srvDef && item.quantity > 0) {
            const lineTotal = srvDef.price * item.quantity;
            singleServiceTotal += lineTotal;
            appliedServices.push({
              id: srvDef.id,
              name: srvDef.name,
              price: srvDef.price,
              quantity: item.quantity,
              unit: srvDef.unit,
              lineTotal
            });
          }
        });
      }

      const serviceTotal = singleServiceTotal;
      const packagePromotion = this.getPackagePromotion(weeks);
      let monthlyDiscountRate = packagePromotion ? packagePromotion.discountRate : 0;
      if (!monthlyDiscountRate) {
        if (weeks >= 12) monthlyDiscountRate = 0.15;
        else if (weeks >= 8) monthlyDiscountRate = 0.10;
        else if (weeks >= 4) monthlyDiscountRate = 0.05;
      }

      let monthlyDiscountAmount = monthlyDiscountRate > 0 ? Math.round(rawPitchTotal * monthlyDiscountRate) : 0;
      const pitchPriceBeforeRule = Math.max(0, rawPitchTotal - monthlyDiscountAmount);

      // Tính năng quy tắc giá giờ vàng / thấp điểm đã được gỡ bỏ
      let netPitchPrice = pitchPriceBeforeRule;
      let goldenHourRule = null;
      let goldenHourDelta = 0;
      const ghRules = [];
      if (Array.isArray(ghRules) && ghRules.length > 0 && pitchPriceBeforeRule > 0) {
        const pitchType = Number(pitch.type || 7);
        const sId = slot ? slot.id : String(slotIdOrTime || '');
        const matchingRules = ghRules.filter(r => {
          const rType = r.pitchType ?? r.pitch_type ?? null;
          const rDay = r.dayOfWeek ?? r.day_of_week ?? null;
          const rSlot = r.slotId ?? r.slot_id ?? null;
          if (rType !== null && rType !== '' && Number(rType) !== pitchType) return false;
          if (rDay !== null && rDay !== '' && Number(rDay) !== dayIso) return false;
          if (rSlot !== null && rSlot !== '' && String(rSlot) !== String(sId)) return false;
          return true;
        }).map(r => {
          const rType = r.pitchType ?? r.pitch_type ?? null;
          const rDay = r.dayOfWeek ?? r.day_of_week ?? null;
          const rSlot = r.slotId ?? r.slot_id ?? null;
          const score = (rType !== null && rType !== '' ? 1 : 0) + (rDay !== null && rDay !== '' ? 2 : 0) + (rSlot !== null && rSlot !== '' ? 4 : 0);
          return { r, score };
        }).sort((a, b) => (b.score - a.score) || (Number(b.r.id || 0) - Number(a.r.id || 0)));

        if (matchingRules.length > 0) {
          const best = matchingRules[0].r;
          const adjType = best.priceAdjustmentType || best.price_adjustment_type || 'fixed';
          const adjVal = Number(best.adjustmentValue ?? best.adjustment_value ?? 0);
          if (adjType === 'fixed') {
            netPitchPrice = Math.max(50000, pitchPriceBeforeRule + adjVal);
          } else if (adjType === 'percent_discount') {
            const pct = Math.max(0, Math.min(90, adjVal));
            netPitchPrice = Math.max(50000, Math.round(pitchPriceBeforeRule * (1 - pct / 100)));
          } else if (adjType === 'percent_surcharge') {
            const pct = Math.max(0, Math.min(200, adjVal));
            netPitchPrice = Math.round(pitchPriceBeforeRule * (1 + pct / 100));
          }
          goldenHourDelta = netPitchPrice - pitchPriceBeforeRule;
          goldenHourRule = best;
        }
      }

      const pitchPrice = rawPitchTotal;
      const rawSubtotal = rawPitchTotal + serviceTotal + goldenHourDelta;
      const netPitchPriceFull = Math.max(0, rawPitchTotal + goldenHourDelta);

      let discountAmount = 0;
      let appliedVoucher = null;
      let rejectedVoucherCode = '';
      let voucherError = '';
      if (voucherCode) {
        const todayLocal = window.SanBongHelpers?.getLocalTodayISO
          ? window.SanBongHelpers.getLocalTodayISO()
          : new Date().toISOString().split('T')[0];
        const targetCode = voucherCode.trim().toUpperCase();
        const rawList = typeof this.getVouchers === 'function' ? this.getVouchers() : [];
        const normFn = typeof this.normalizeVoucher === 'function'
          ? (vc => this.normalizeVoucher(vc))
          : (vc => {
              if (!vc || !vc.code) return null;
              const code = String(vc.code).trim().toUpperCase();
              const rawType = String(vc.type ?? vc.discount_type ?? 'percent').trim().toLowerCase();
              const type = rawType === 'fixed' ? 'fixed' : 'percent';
              const value = Math.max(0, Number(vc.value ?? vc.discount_value ?? 0) || 0);
              const minOrder = Math.max(0, Number(vc.minOrder ?? vc.min_order ?? 0) || 0);
              const maxDiscountAmount = Math.max(0, Number(vc.maxDiscountAmount ?? vc.max_discount_amount ?? 0) || 0);
              const maxUsage = Math.max(0, Number(vc.maxUsage ?? vc.max_usage ?? 0) || 0);
              const usedCount = Math.max(0, Number(vc.usedCount ?? vc.used_count ?? 0) || 0);
              const rawFrom = vc.validFrom ?? vc.valid_from ?? null;
              const validFrom = rawFrom ? String(rawFrom).trim().slice(0, 10) : null;
              const rawTo = vc.validTo ?? vc.valid_to ?? null;
              const validTo = rawTo ? String(rawTo).trim().slice(0, 10) : null;
              const rawPitchLimit = vc.pitchTypeLimit ?? vc.pitch_type_limit ?? null;
              const pitchTypeLimit = (rawPitchLimit !== null && rawPitchLimit !== '' && Number(rawPitchLimit) > 0) ? Number(rawPitchLimit) : null;
              const requiredTier = String(vc.requiredTier ?? vc.required_tier ?? (code === 'VIPGOLD' ? 'vip,regular' : '')).trim();
              const rawActive = vc.isActive ?? vc.is_active;
              const isActive = rawActive === undefined ? true : !(rawActive === false || rawActive === 0 || rawActive === '0' || String(rawActive).toLowerCase() === 'false');
              return { code, description: vc.description || '', type, value, minOrder, maxDiscountAmount, maxUsage, usedCount, validFrom, validTo, pitchTypeLimit, requiredTier, isActive };
            });
        const v = rawList.map(normFn).find(vc => vc && vc.code === targetCode && vc.isActive !== false);
        if (!v) {
          voucherError = 'Mã giảm giá không tồn tại hoặc đã ngừng áp dụng.';
        } else if ((v.validFrom && todayLocal < v.validFrom) || (v.validTo && todayLocal > v.validTo)) {
          voucherError = 'Mã giảm giá chưa đến ngày áp dụng hoặc đã hết hạn.';
        } else if (v.pitchTypeLimit && Number(v.pitchTypeLimit) !== Number(pitch.type)) {
          voucherError = `Mã giảm giá này chỉ áp dụng riêng cho Sân ${v.pitchTypeLimit} người.`;
        } else if (Number(v.maxUsage || 0) > 0 && Number(v.usedCount || 0) >= Number(v.maxUsage)) {
          voucherError = 'Mã giảm giá đã hết lượt sử dụng.';
        } else if (rawSubtotal < (v.minOrder || 0)) {
          voucherError = `Đơn hàng chưa đạt giá trị tối thiểu (${Number(v.minOrder || 0).toLocaleString('vi-VN')}đ) để dùng mã này.`;
        } else {
          const requiredTier = String(v.requiredTier || (v.code === 'VIPGOLD' ? 'vip,regular' : '')).trim().toLowerCase();
          const unrestricted = !requiredTier || requiredTier === 'standard' || requiredTier === 'all';
          let tierValid = true;
          if (!unrestricted) {
            const curUser = this.getUser ? this.getUser() : null;
            if (!curUser || !curUser.name) {
              tierValid = false;
              voucherError = 'Mã giảm giá này chỉ áp dụng cho thành viên hạng ưu đãi đã đăng nhập tài khoản.';
            } else {
              const rawTier = String(curUser.customer_tier || curUser.tier || 'standard').trim().toLowerCase();
              const legacyTiers = {
                'hội viên': 'standard',
                'hội viên đồng': 'bronze',
                'hội viên bạc': 'silver',
                'hội viên vàng': 'gold',
                'hội viên kim cương': 'diamond',
                'khách vip': 'vip',
                'khách thân thiết': 'regular'
              };
              const canonicalTier = legacyTiers[rawTier] || rawTier;
              const tierRank = { standard: 1, bronze: 2, silver: 3, regular: 4, gold: 4, vip: 5, diamond: 5 };
              const requiredTiers = requiredTier.split(',').map(t => t.trim()).filter(Boolean);
              const isQualified = requiredTiers.some(t => (tierRank[canonicalTier] || 1) >= (tierRank[t] || 99));
              if (!isQualified) {
                tierValid = false;
                voucherError = 'Hạng thành viên hiện tại chưa đủ điều kiện áp dụng mã ưu đãi này.';
              }
            }
          }
          if (tierValid) {
            appliedVoucher = v;
            if (v.type === 'percent') {
              discountAmount = Math.round((rawSubtotal * v.value) / 100);
              const maxDisc = Number(v.maxDiscountAmount || 0);
              if (maxDisc > 0 && discountAmount > maxDisc) discountAmount = maxDisc;
            } else {
              discountAmount = Math.min(v.value, rawSubtotal);
            }
          }
        }
      }

      // Non-stacking: chọn ưu đãi có lợi nhất giữa gói tháng và voucher
      let appliedDiscountSource = 'none';
      if (discountAmount > 0 && monthlyDiscountAmount > 0) {
        if (discountAmount >= monthlyDiscountAmount) {
          monthlyDiscountAmount = 0;
          appliedDiscountSource = 'voucher';
        } else {
          discountAmount = 0;
          rejectedVoucherCode = appliedVoucher ? appliedVoucher.code : '';
          appliedVoucher = null;
          appliedDiscountSource = 'monthly_package';
        }
      } else if (discountAmount > 0) {
        appliedDiscountSource = 'voucher';
      } else if (monthlyDiscountAmount > 0) {
        appliedDiscountSource = 'monthly_package';
      }

      const totalDiscount = monthlyDiscountAmount + discountAmount + Math.max(0, -goldenHourDelta);
      const totalPrice = Math.max(0, rawSubtotal - (monthlyDiscountAmount + discountAmount));
      netPitchPrice = Math.max(0, netPitchPriceFull - monthlyDiscountAmount);
      const isMonthly = Number(weeks) > 1;
      const sysCfg = this.getSystemConfig ? this.getSystemConfig() : { depositRate: 30 };
      const defaultDepositRate = isMonthly ? 60 : (Number(sysCfg.depositRate) || 30);
      const depositRate = Math.max(10, Math.min(100, defaultDepositRate)) / 100;
      const depositAmount = Math.round(totalPrice * depositRate);
      const remainingAmount = totalPrice - depositAmount;

      return {
        pitchPrice,
        netPitchPrice,
        singlePitchPrice,
        isPeak,
        isWeekend,
        goldenHourRule,
        goldenHourDelta,
        serviceTotal,
        singleServiceTotal,
        appliedServices,
        subtotal: rawSubtotal,
        netSubtotal: rawSubtotal,
        weeksCount: weeks,
        packagePromotion,
        isMonthly,
        depositRatePct: isMonthly ? 60 : Math.round(depositRate * 100),
        monthlyDiscountRate,
        monthlyDiscountAmount,
        appliedDiscountSource,
        voucherCode: appliedVoucher ? appliedVoucher.code : '',
        rejectedVoucherCode,
        voucherDiscountAmount: discountAmount,
        voucherError,
        discountAmount,
        totalDiscount,
        totalPrice,
        depositAmount,
        remainingAmount
      };
    },

  });
})();

;
/* === db_bookings.js === */
(function () {
  'use strict';
  window.SanBongDB = window.SanBongDB || {};
  Object.assign(window.SanBongDB, {
    createBooking(bookingInput) {
      const now = new Date();
      const rand6 = Math.floor(100000 + Math.random() * 900000);
      const pitch = this.getPitchById(bookingInput.pitchId);
      const pitchIdStr = String(bookingInput.pitchId || '').toUpperCase();
      let prefix = 'ASFS';
      if (pitch?.type === 5 || pitchIdStr.startsWith('P5')) {
        prefix = 'ASFF';
      } else if (pitch?.type === 7 || pitchIdStr.startsWith('P7')) {
        prefix = 'ASFS';
      } else if (pitch?.type === 11 || pitchIdStr.startsWith('P11')) {
        prefix = 'ASFE';
      }
      const bookingCode = bookingInput.code || `${prefix}${rand6}`;
      const weeksCount = Math.max(1, parseInt(bookingInput.weeksCount, 10) || 1);

      const pricing = this.calculatePrice(
        bookingInput.pitchId,
        bookingInput.date,
        bookingInput.slotId || bookingInput.slotTime,
        bookingInput.services || [],
        bookingInput.voucherCode || '',
        weeksCount
      );

      const newBooking = {
        code: bookingCode,
        customerName: bookingInput.customerName || 'Khách vãng lai',
        phone: bookingInput.phone || '',
        email: bookingInput.email || '',
        pitchId: bookingInput.pitchId,
        pitchName: pitch ? pitch.name : 'Sân bóng',
        date: bookingInput.date,
        slotId: bookingInput.slotId || '',
        slotTime: bookingInput.slotTime || '',
        bookingMode: bookingInput.bookingMode || (weeksCount > 1 ? 'monthly' : 'single'),
        weeksCount: weeksCount,
        packagePromotion: pricing?.packagePromotion || this.getPackagePromotion(weeksCount) || null,
        monthlyDates: Array.isArray(bookingInput.monthlyDates) ? bookingInput.monthlyDates : [],
        monthlyDiscountAmount: pricing ? pricing.monthlyDiscountAmount : 0,
        pitchPrice: pricing ? pricing.pitchPrice : 0,
        services: pricing ? pricing.appliedServices : [],
        voucherCode: pricing ? pricing.voucherCode : '',
        discountAmount: pricing ? pricing.discountAmount : 0,
        totalPrice: pricing ? pricing.totalPrice : 0,
        depositAmount: pricing ? pricing.depositAmount : 0,
        remainingAmount: pricing ? pricing.remainingAmount : 0,
        status: bookingInput.status || 'Chờ duyệt cọc',
        paymentStatus: bookingInput.paymentStatus || 'Chờ cọc 30%',
        paymentMethod: bookingInput.paymentMethod || 'Chuyển khoản đặt cọc',
        createdAt: `${bookingInput.date} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        note: bookingInput.note || ''
      };

      const bookings = this.getAllBookings();
      bookings.unshift(newBooking);
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));

      return newBooking;
    },

    updateBookingStatus(bookingCode, status, paymentStatus) {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (booking) {
        booking.status = status;
        if (paymentStatus) {
          booking.paymentStatus = paymentStatus;
        }
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
        return booking;
      }
      return null;
    },

    checkinBooking(bookingCode) {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (booking) {
        const oldStatus = booking.status;
        booking.status = 'Đang đá';
        booking.checkinTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        if (!booking.paymentStatus || booking.paymentStatus === 'Chờ duyệt cọc' || booking.paymentStatus === 'Chờ cọc 30%') {
          booking.paymentStatus = 'Đã cọc 30%';
        }
        if (typeof booking.remainingAmount !== 'number' || booking.remainingAmount <= 0) {
          const total = Number(booking.totalPrice || 0);
          const dep = Number(booking.depositAmount || Math.round(total * 0.3));
          booking.remainingAmount = Math.max(0, total - dep);
        }
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
        this.addAuditLog('CHECKIN', bookingCode, `Trạng thái: ${oldStatus}`, `Trạng thái: Đang đá (${booking.checkinTime})`);
        return booking;
      }
      return null;
    },

    addOvertimeToBooking(bookingCode, minutes, fee) {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (!booking) return null;
      const mins = Math.max(0, parseInt(minutes, 10) || 0);
      const extraFee = Math.max(0, parseInt(fee, 10) || 0);
      booking.overtimeMinutes = (Number(booking.overtimeMinutes) || 0) + mins;
      booking.overtimeFee = (Number(booking.overtimeFee) || 0) + extraFee;
      booking.totalPrice = (Number(booking.totalPrice) || 0) + extraFee;
      booking.remainingAmount = (Number(booking.remainingAmount) || 0) + extraFee;
      booking.note = (booking.note ? booking.note + ' | ' : '') + `[Đá thêm ${mins}p: +${extraFee.toLocaleString('vi-VN')}đ]`;
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      return booking;
    },

    changePitchForBooking(bookingCode, newPitchId, adjustPrice = false, reason = '') {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      const newPitch = this.getPitchById(newPitchId);
      if (!booking || !newPitch) return null;
      const oldPitchName = booking.pitchName || booking.pitchId;
      booking.pitchId = newPitch.id;
      booking.pitchName = newPitch.name;

      let diff = 0;
      if (adjustPrice) {
        const slots = this.getTimeSlots();
        const slot = slots.find(s => s.id === booking.slotId || s.time === booking.slotTime);
        const isPeak = slot ? slot.isPeak : false;
        const weeks = Math.max(1, Number(booking.weeksCount) || 1);
        const newPitchPrice = Math.round(isPeak ? newPitch.peakPrice : newPitch.basePrice) * weeks;
        const oldPitchPrice = Number(booking.pitchPrice || 0);
        diff = newPitchPrice - oldPitchPrice;
        booking.pitchPrice = newPitchPrice;
        booking.totalPrice = Math.max(0, Number(booking.totalPrice || 0) + diff);
        booking.remainingAmount = Math.max(0, Number(booking.remainingAmount || 0) + diff);
      }
      const diffNote = adjustPrice && diff !== 0 ? ` (${diff > 0 ? '+' : ''}${diff.toLocaleString('vi-VN')}đ)` : ' (Giữ nguyên giá)';
      booking.note = (booking.note ? booking.note + ' | ' : '') + `[Đổi sân: ${oldPitchName} -> ${newPitch.name}${diffNote}${reason ? ' - Lý do: ' + reason : ''}]`;
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      this.addAuditLog('TRANSFER_PITCH', bookingCode, `Sân: ${oldPitchName}`, `Sân: ${newPitch.name}${diffNote}${reason ? ' (' + reason + ')' : ''}`);
      return booking;
    },

    addInPlayService(bookingCode, serviceId, quantity = 1) {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      const srvDef = this.getServices().find(s => s.id === serviceId);
      if (!booking || !srvDef) return null;
      const qty = Math.max(1, parseInt(quantity, 10) || 1);
      const addedCost = srvDef.price * qty;

      if (!Array.isArray(booking.services)) booking.services = [];
      const existing = booking.services.find(s => s.id === srvDef.id);
      if (existing) {
        existing.quantity = (Number(existing.quantity) || 0) + qty;
        existing.lineTotal = existing.quantity * srvDef.price;
      } else {
        booking.services.push({
          id: srvDef.id,
          name: srvDef.name,
          price: srvDef.price,
          quantity: qty,
          unit: srvDef.unit,
          lineTotal: addedCost
        });
      }

      booking.totalPrice = (Number(booking.totalPrice) || 0) + addedCost;
      booking.remainingAmount = (Number(booking.remainingAmount) || 0) + addedCost;
      booking.note = (booking.note ? booking.note + ' | ' : '') + `[Gọi thêm: ${srvDef.name} x${qty} (+${addedCost.toLocaleString('vi-VN')}đ)]`;
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      this.deductServiceStock(srvDef.id, qty);
      return booking;
    },

    cancelBookingEarly(bookingCode, policy = 'refund_100', reason = '') {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (!booking) return null;
      const oldStatus = booking.status;
      const oldPay = booking.paymentStatus;
      const policyMap = {
        'refund_100': 'Đã hoàn cọc 100%',
        'reserve': 'Bảo lưu cọc 30%',
        'forfeit_50': 'Phạt 50% cọc'
      };
      booking.status = 'Đã hủy';
      booking.paymentStatus = policyMap[policy] || 'Đã hoàn cọc 100%';
      booking.remainingAmount = 0;
      booking.cancelPolicy = policy;
      booking.cancelReason = reason || 'Hủy lịch trước thời hạn';
      booking.note = (booking.note ? booking.note + ' | ' : '') + `[Hủy trước hạn - ${booking.paymentStatus}${reason ? ': ' + reason : ''}]`;
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      this.addAuditLog('CANCEL_BOOKING', bookingCode, `${oldStatus} (${oldPay})`, `Đã hủy (${booking.paymentStatus}) - Lý do: ${booking.cancelReason}`);
      return booking;
    },

    completeAndPayRemaining(bookingCode, payMethod = 'Tiền mặt tại quầy') {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (!booking) return null;
      const total = Number(booking.totalPrice || 0);
      const deposit = Number(booking.depositAmount || Math.round(total * 0.3));
      const calcRem = (typeof booking.remainingAmount === 'number' && booking.remainingAmount > 0)
        ? booking.remainingAmount
        : Math.max(0, total - deposit);
      const paidRem = Number(booking.paidRemainingAmount || calcRem);
      booking.paidRemainingAmount = paidRem;
      booking.remainingPaymentMethod = payMethod;
      booking.remainingAmount = 0;
      booking.status = 'Hoàn thành';
      booking.paymentStatus = 'Đã thanh toán 100%';
      booking.completedAt = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      if (!String(booking.note || '').includes('Đã tất toán phần còn lại')) {
        booking.note = (booking.note ? booking.note + ' | ' : '') + `[Đã tất toán phần còn lại ${paidRem.toLocaleString('vi-VN')}đ qua ${payMethod}]`;
      }
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      this.addAuditLog('COLLECT_PAYMENT', bookingCode, `Còn nợ: ${calcRem.toLocaleString('vi-VN')}đ`, `Thu đủ ${paidRem.toLocaleString('vi-VN')}đ (${payMethod})`);
      return booking;
    },

    releaseNoShowBooking(bookingCode) {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (booking) {
        const oldStatus = booking.status;
        booking.status = 'Khách chưa đến';
        booking.paymentStatus = 'Tịch thu cọc 30%';
        booking.note = (booking.note ? booking.note + ' | ' : '') + '[Quá 15p khách chưa đến - Đã nhả sân trống]';
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
        this.addAuditLog('NOSHOW_RELEASE', bookingCode, `Trạng thái: ${oldStatus}`, 'Khách chưa đến (Tịch thu cọc 30% & Nhả sân)');
        return booking;
      }
      return null;
    },

    restoreBooking(bookingCode) {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (booking) {
        const oldStatus = booking.status;
        booking.status = 'Đã xác nhận';
        booking.paymentStatus = 'Đã cọc 30%';
        booking.remainingAmount = Math.max(0, Number(booking.totalPrice || 0) - Number(booking.depositAmount || 0));
        booking.note = (booking.note ? booking.note + ' | ' : '') + '[Đã khôi phục lại ca đá]';
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
        this.addAuditLog('RESTORE_BOOKING', bookingCode, `Trạng thái: ${oldStatus}`, 'Đã xác nhận (Khôi phục ca đá)');
        return booking;
      }
      return null;
    },

    upsertPitch(pitchData) {
      if (!pitchData || !pitchData.id) return null;
      const list = this.getPitches();
      const cleanId = String(pitchData.id).trim().toUpperCase();
      const existingIdx = list.findIndex(p => String(p.id).toUpperCase() === cleanId);
      const oldPitch = existingIdx >= 0 ? Object.assign({}, list[existingIdx]) : null;
      const pType = Number(pitchData.type) || (cleanId.startsWith('P11') ? 11 : (cleanId.startsWith('P7') ? 7 : 5));
      const basePrice = Math.max(0, Number(pitchData.basePrice) || (pType === 11 ? 900000 : (pType === 7 ? 450000 : 350000)));
      const peakPrice = Math.max(0, Number(pitchData.peakPrice) || basePrice);
      const weekendPrice = Math.max(0, Number(pitchData.weekendPrice) || basePrice);

      const updatedPitch = Object.assign({}, oldPitch || {}, {
        id: cleanId,
        name: String(pitchData.name || cleanId).trim(),
        type: pType,
        typeLabel: `Sân ${pType} người`,
        size: String(pitchData.size || (oldPitch ? oldPitch.size : '') || (pType === 11 ? '60m x 95m' : (pType === 7 ? '40m x 60m' : '22m x 42m'))).trim(),
        grass: String(pitchData.grass || (oldPitch ? oldPitch.grass : '') || 'Cỏ nhân tạo FIFA Quality · Đèn LED 400W').trim(),
        basePrice,
        peakPrice,
        weekendPrice,
        status: pitchData.status || (oldPitch ? oldPitch.status : 'Hoạt động'),
        badge: oldPitch?.badge || `Sân ${pType} Tiêu Chuẩn`,
        rating: oldPitch?.rating || 0,
        reviews: oldPitch?.reviews || 0,
        amenities: oldPitch?.amenities || ['Đèn LED chống chói', 'Lưới chắn mới', 'Nước uống tại sân']
      });

      if (existingIdx >= 0) {
        list[existingIdx] = updatedPitch;
      } else {
        list.push(updatedPitch);
      }
      localStorage.setItem(STORAGE_KEYS.PITCHES, JSON.stringify(list));
      this.addAuditLog(
        'PITCH_UPSERT',
        cleanId,
        oldPitch ? `${oldPitch.name} (${oldPitch.basePrice.toLocaleString('vi-VN')}đ / ${oldPitch.peakPrice.toLocaleString('vi-VN')}đ) [${oldPitch.status}]` : 'Tạo sân mới',
        `${updatedPitch.name} (Đồng giá: ${basePrice.toLocaleString('vi-VN')}đ/ca 2h) [${updatedPitch.status}]`
      );
      return updatedPitch;
    },

    saveServiceItem(srvData) {
      if (!srvData || !srvData.id) return null;
      const list = this.getServices();
      const cleanId = String(srvData.id).trim().toUpperCase();
      const idx = list.findIndex(s => String(s.id).toUpperCase() === cleanId);
      const item = {
        id: cleanId,
        name: String(srvData.name || cleanId).trim(),
        price: Math.max(0, Number(srvData.price) || 0),
        unit: String(srvData.unit || 'cái').trim(),
        stockQty: Math.max(0, parseInt(srvData.stockQty, 10) || 0),
        minStockWarning: Math.max(0, parseInt(srvData.minStockWarning, 10) || 5),
        icon: srvData.icon || (idx >= 0 ? list[idx].icon : '🥤')
      };
      if (idx >= 0) {
        list[idx] = item;
      } else {
        list.push(item);
      }
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(list));
      return item;
    },

    deleteServiceItem(serviceId) {
      if (!serviceId) return false;
      const target = String(serviceId).trim().toUpperCase();
      const list = this.getServices().filter(s => String(s.id).toUpperCase() !== target);
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(list));
      return true;
    },

    restockService(serviceId, addQty) {
      const list = this.getServices();
      const item = list.find(s => String(s.id).toUpperCase() === String(serviceId).toUpperCase());
      const qty = Math.max(0, parseInt(addQty, 10) || 0);
      if (!item || qty <= 0) return null;
      item.stockQty = Math.max(0, Number(item.stockQty || 0)) + qty;
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(list));
      return item;
    },

    deductServiceStock(serviceId, deductQty) {
      const list = this.getServices();
      const item = list.find(s => String(s.id).toUpperCase() === String(serviceId).toUpperCase());
      const qty = Math.max(0, parseInt(deductQty, 10) || 0);
      if (!item || qty <= 0) return null;
      item.stockQty = Math.max(0, Number(item.stockQty || 0) - qty);
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(list));
      return item;
    },

    getCounterSales() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.COUNTER_SALES) || '[]') || [];
      } catch (e) {
        return [];
      }
    },

    recordCounterSale({ serviceId, quantity, payMethod, paymentMethod, note }) {
      const resolvedPayMethod = payMethod || paymentMethod || 'Tiền mặt tại quầy';
      const list = this.getServices();
      const srv = list.find(s => String(s.id).toUpperCase() === String(serviceId).toUpperCase());
      if (!srv) return null;
      const qty = Math.max(1, parseInt(quantity, 10) || 1);
      const oldStock = Number(srv.stockQty ?? 20);
      const newStock = Math.max(0, oldStock - qty);
      srv.stockQty = newStock;
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(list));

      const totalAmount = Number(srv.price || 0) * qty;
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const user = this.getUser();
      const sale = {
        id: 'POS-' + Date.now().toString().slice(-6),
        serviceId: srv.id,
        serviceName: srv.name,
        quantity: qty,
        unitPrice: srv.price,
        totalAmount,
        payMethod: resolvedPayMethod,
        note: note || '',
        createdAt: timestamp,
        staffName: user ? user.name : 'Nhân viên trực sân'
      };
      const sales = this.getCounterSales();
      sales.unshift(sale);
      localStorage.setItem(STORAGE_KEYS.COUNTER_SALES, JSON.stringify(sales));
      this.addAuditLog(
        'COUNTER_SALE',
        sale.id,
        `Tồn kho ${srv.name}: ${oldStock} ${srv.unit}`,
        `Bán ${qty} ${srv.unit} (${totalAmount.toLocaleString('vi-VN')}đ - ${sale.payMethod}) · Tồn còn: ${newStock}`
      );
      return { sale, service: srv };
    },

    getAuditLogs() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS) || '[]') || [];
      } catch (e) {
        return [];
      }
    },

    addAuditLog(action, targetCode, oldValue, newValue) {
      try {
        const logs = this.getAuditLogs();
        const user = this.getUser();
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const createdAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        const entry = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          created_at: createdAt,
          actor_name: user ? user.name : 'Quản Trị Viên',
          actor_role: user ? user.role : 'admin',
          action: String(action || 'SYSTEM'),
          target_code: String(targetCode || '---'),
          old_value: typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue || '---'),
          new_value: typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue || '---'),
          ip_address: '127.0.0.1'
        };
        logs.unshift(entry);
        localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, 300)));
        return entry;
      } catch (e) {
        return null;
      }
    },

    getPhoneNoShowAndDebt(phone) {
      const clean = String(phone || '').replace(/\D+/g, '');
      if (clean.length < 9) {
        return { phone: clean, noShowCount: 0 };
      }
      const bookings = this.getAllBookings();
      let noShowCount = 0;
      bookings.forEach(b => {
        const bPhone = String(b.phone || '').replace(/\D+/g, '');
        if (!bPhone || (!bPhone.endsWith(clean.slice(-9)) && bPhone !== clean)) return;
        const st = String(b.status || '');
        const paySt = String(b.paymentStatus || '');
        if (st === 'Khách chưa đến' || st.includes('No-Show') || paySt === 'Tịch thu cọc 30%') {
          noShowCount += 1;
        }
      });
      return { phone: clean, noShowCount };
    },

  });
})();

;
/* === db_operations.js === */
(function () {
  'use strict';
  window.SanBongDB = window.SanBongDB || {};
  Object.assign(window.SanBongDB, {
    getCurrentShiftStats() {
      const startTime = localStorage.getItem('sb_active_shift_start') || 'Hôm nay, 06:00';
      const startDatePart = String(startTime).split(' ')[0];
      const bookings = this.getAllBookings();
      let cashTotal = 0;
      let transferTotal = 0;

      bookings.forEach(b => {
        if (b.status === 'Đã hủy') return;
        const bDate = String(b.createdAt || b.date || '').split(' ')[0];
        if (startDatePart && bDate && bDate < startDatePart && b.date !== startDatePart) return;

        const dep = Number(b.depositAmount || 0);
        const payMethod = String(b.paymentMethod || '');
        const payStatus = String(b.paymentStatus || '');
        if (dep > 0 && (payStatus.includes('Đã cọc') || payStatus.includes('Đã thanh toán') || payStatus.includes('Tịch thu cọc'))) {
          if (payMethod.includes('Tiền mặt')) {
            cashTotal += dep;
          } else {
            transferTotal += dep;
          }
        }
        if (b.status === 'Hoàn thành') {
          const paidRem = Number(b.paidRemainingAmount || 0);
          const remMethod = String(b.remainingPaymentMethod || 'Tiền mặt tại quầy');
          if (paidRem > 0) {
            if (remMethod.includes('VietQR') || remMethod.includes('Chuyển khoản')) {
              transferTotal += paidRem;
            } else {
              cashTotal += paidRem;
            }
          }
        }
      });

      const sales = this.getCounterSales();
      sales.forEach(s => {
        const sDate = String(s.createdAt || '').split(' ')[0];
        if (startDatePart && sDate && sDate < startDatePart) return;
        const amt = Number(s.totalAmount || 0);
        if (String(s.payMethod || '').includes('VietQR') || String(s.payMethod || '').includes('Chuyển khoản')) {
          transferTotal += amt;
        } else {
          cashTotal += amt;
        }
      });

      return { startTime, cashTotal, transferTotal };
    },

    getShifts() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.SHIFTS) || '[]') || [];
      } catch (e) {
        return [];
      }
    },

    closeShift(note = '') {
      const stats = this.getCurrentShiftStats();
      const user = this.getUser();
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const shiftId = `CA-${String(now.getFullYear()).slice(-2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;

      const newShift = {
        id: shiftId,
        staff_name: user ? user.name : 'Nhân viên trực sân',
        staff_username: user ? (user.username || user.role) : 'staff',
        opened_at: stats.startTime,
        closed_at: nowStr,
        cash_declared: stats.cashTotal,
        transfer_declared: stats.transferTotal,
        actual_cash: null,
        diff_amount: null,
        status: 'closed',
        note: String(note || '').trim()
      };

      const shifts = this.getShifts();
      shifts.unshift(newShift);
      localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
      localStorage.setItem('sb_active_shift_start', nowStr);

      this.addAuditLog(
        'SHIFT_CLOSE',
        shiftId,
        `Mở ca: ${stats.startTime}`,
        `Chốt ca: TM ${stats.cashTotal.toLocaleString('vi-VN')}đ | CK ${stats.transferTotal.toLocaleString('vi-VN')}đ${note ? ' (' + note + ')' : ''}`
      );
      return newShift;
    },

    confirmShift(shiftId, actualCash) {
      const shifts = this.getShifts();
      const shift = shifts.find(s => String(s.id) === String(shiftId));
      if (!shift) return null;
      const actual = Math.max(0, Number(actualCash) || 0);
      const declared = Number(shift.cash_declared || 0);
      const diff = actual - declared;
      shift.actual_cash = actual;
      shift.diff_amount = diff;
      shift.status = 'confirmed';
      localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));

      this.addAuditLog(
        'SHIFT_CONFIRM',
        shift.id,
        `Tiền mặt kê khai: ${declared.toLocaleString('vi-VN')}đ`,
        `Thực nhận: ${actual.toLocaleString('vi-VN')}đ · Chênh lệch: ${diff === 0 ? 'Khớp 0đ' : (diff > 0 ? '+' + diff.toLocaleString('vi-VN') + 'đ' : diff.toLocaleString('vi-VN') + 'đ')}`
      );
      return shift;
    },

        getPendingPayments() {
      let list = [];
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.PENDING_PAYMENTS);
        list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list)) list = [];
      } catch (e) {
        list = [];
      }

      let processed = [];
      try {
        processed = JSON.parse(localStorage.getItem('sb_processed_receipts_v1') || '[]');
        if (!Array.isArray(processed)) processed = [];
      } catch (e) {
        processed = [];
      }

      list = list.filter(item => !processed.includes(item.code));

      const pendingBookings = this.getAllBookings().filter(b => b.paymentStatus === 'Chờ duyệt cọc' && b.status !== 'Đã hủy' && !processed.includes(b.code));
      pendingBookings.forEach(pb => {
        if (!list.some(item => item.code === pb.code)) {
          list.push({
            time: pb.createdAt ? pb.createdAt.split(' ')[1] || 'Vừa xong' : 'Vừa xong',
            code: pb.code,
            name: pb.customerName,
            amt: pb.depositAmount || Math.round(pb.totalPrice * 0.3),
            bank: pb.paymentMethod && pb.paymentMethod.includes('MB') ? 'MB Bank' : 'Vietcombank'
          });
        }
      });
      return list;
    },

    approveDeposit(bookingCode) {
      this.updateBookingStatus(bookingCode, 'Đã xác nhận', 'Đã cọc 30%');
      let list = [];
      try {
        list = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_PAYMENTS)) || [];
      } catch (e) {
        list = [];
      }
      list = list.filter(item => item.code !== bookingCode);
      localStorage.setItem(STORAGE_KEYS.PENDING_PAYMENTS, JSON.stringify(list));

      try {
        let processed = JSON.parse(localStorage.getItem('sb_processed_receipts_v1') || '[]');
        if (!Array.isArray(processed)) processed = [];
        if (!processed.includes(bookingCode)) processed.push(bookingCode);
        localStorage.setItem('sb_processed_receipts_v1', JSON.stringify(processed));
      } catch (e) {}
      return true;
    },

    rejectDeposit(bookingCode) {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (booking) {
        booking.status = 'Đã hủy';
        booking.paymentStatus = 'Đã hủy';
        booking.note = (booking.note ? booking.note + ' ' : '') + '[Admin từ chối duyệt cọc - Đã giải phóng sân]';
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      }
      let list = [];
      try {
        list = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_PAYMENTS)) || [];
      } catch (e) {
        list = [];
      }
      list = list.filter(item => item.code !== bookingCode);
      localStorage.setItem(STORAGE_KEYS.PENDING_PAYMENTS, JSON.stringify(list));

      try {
        let processed = JSON.parse(localStorage.getItem('sb_processed_receipts_v1') || '[]');
        if (!Array.isArray(processed)) processed = [];
        if (!processed.includes(bookingCode)) processed.push(bookingCode);
        localStorage.setItem('sb_processed_receipts_v1', JSON.stringify(processed));
      } catch (e) {}
      return true;
    },

    getBankTransactions(filter = 'all') {
      let list = [];
      try {
        list = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANK_TRANSACTIONS) || '[]') || [];
        if (!Array.isArray(list)) list = [];
      } catch (e) {
        list = [];
      }
      if (filter === 'pending') {
        return list.filter(tx => {
          const st = String(tx.status || '').toLowerCase();
          const mst = String(tx.match_status || '').toLowerCase();
          return st !== 'resolved' && st !== 'ignored' && st !== 'matched' && mst !== 'matched' && mst !== 'resolved';
        });
      }
      if (filter === 'resolved') {
        return list.filter(tx => {
          const st = String(tx.status || '').toLowerCase();
          const mst = String(tx.match_status || '').toLowerCase();
          return st === 'resolved' || st === 'ignored' || st === 'matched' || mst === 'matched' || mst === 'resolved';
        });
      }
      return list;
    },

    addBankTransaction(tx) {
      if (!tx) return null;
      const list = this.getBankTransactions('all');
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const entry = Object.assign({
        id: 'TX-' + Date.now().toString().slice(-6),
        reference_code: 'FT' + Date.now().toString().slice(-8),
        transaction_date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
        bank_name: 'MBBank',
        content: '',
        detected_code: '',
        booking_code: '',
        amount_in: 0,
        expected_amount: 0,
        diff_amount: 0,
        match_status: 'unmatched',
        status: 'pending',
        note: ''
      }, tx);
      list.unshift(entry);
      localStorage.setItem(STORAGE_KEYS.BANK_TRANSACTIONS, JSON.stringify(list));
      return entry;
    },

    resolveBankTransaction(txId, payloadOrStatus = 'resolved') {
      const list = this.getBankTransactions('all');
      const idx = list.findIndex(tx => String(tx.id) === String(txId) || String(tx.reference_code) === String(txId));
      if (idx < 0) return null;
      const tx = list[idx];
      const payload = (typeof payloadOrStatus === 'string') ? { status: payloadOrStatus } : (payloadOrStatus || {});
      const user = this.getUser();
      const dNow = new Date();
      const pad2 = n => String(n).padStart(2, '0');
      const nowStr = `${dNow.getFullYear()}-${pad2(dNow.getMonth() + 1)}-${pad2(dNow.getDate())} ${pad2(dNow.getHours())}:${pad2(dNow.getMinutes())}:${pad2(dNow.getSeconds())}`;

      if (payload.booking_code) {
        const cleanCode = String(payload.booking_code).trim().toUpperCase();
        tx.booking_code = cleanCode;
        tx.match_status = 'matched';
        const bookings = this.getAllBookings();
        const b = bookings.find(item => String(item.code).toUpperCase() === cleanCode);
        if (b) {
          const amtIn = Number(tx.transfer_amount ?? tx.amount_in ?? tx.amount ?? 0);
          let targetPay = payload.target_payment_status || payload.target_status || 'auto';
          if (targetPay === 'auto') {
            targetPay = amtIn >= Number(b.totalPrice || 0) ? 'Đã thanh toán 100%' : 'Đã cọc 30%';
          }
          if (targetPay === 'Đã thanh toán 100%') {
            b.status = 'Hoàn thành';
            b.paymentStatus = 'Đã thanh toán 100%';
            b.remainingAmount = 0;
          } else {
            b.status = b.status === 'Chờ duyệt cọc' ? 'Đã xác nhận' : (b.status || 'Đã xác nhận');
            b.paymentStatus = 'Đã cọc 30%';
            b.remainingAmount = Math.max(0, Number(b.totalPrice || 0) - amtIn);
          }
          b.note = (b.note ? b.note + ' | ' : '') + `[Đối soát GD ${tx.reference_code || tx.id}: +${amtIn.toLocaleString('vi-VN')}đ${payload.note ? ' - ' + payload.note : ''}]`;
          localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
          tx.expected_amount = targetPay === 'Đã thanh toán 100%' ? Number(b.totalPrice || 0) : Number(b.depositAmount || 0);
          tx.diff_amount = amtIn - tx.expected_amount;
        }
      }

      tx.status = payload.status || 'resolved';
      if (payload.note) tx.note = payload.note;
      tx.resolved_at = nowStr;
      tx.resolved_by = user ? user.name : 'Quản lý';
      list[idx] = tx;
      localStorage.setItem(STORAGE_KEYS.BANK_TRANSACTIONS, JSON.stringify(list));
      this.addAuditLog(
        payload.booking_code ? 'RECONCILE_MANUAL' : 'RECONCILE_RESOLVE',
        tx.booking_code || tx.id,
        `GD ${tx.reference_code || tx.id} (${Number(tx.transfer_amount ?? tx.amount_in ?? 0).toLocaleString('vi-VN')}đ)`,
        tx.booking_code ? `Khớp đơn ${tx.booking_code} (${tx.note || 'Đã đối soát'})` : `${tx.status === 'ignored' ? 'Bỏ qua' : 'Đã xử lý'}: ${tx.note || tx.status}`
      );
      return tx;
    },

    normalizeVoucher(raw) {
      if (!raw || typeof raw !== 'object') return null;
      const code = String(raw.code || '').trim().toUpperCase();
      if (!code) return null;

      const rawType = String(raw.type ?? raw.discount_type ?? 'percent').trim().toLowerCase();
      const type = rawType === 'fixed' ? 'fixed' : 'percent';
      const value = Math.max(0, Number(raw.value ?? raw.discount_value ?? 0) || 0);
      const minOrder = Math.max(0, Number(raw.minOrder ?? raw.min_order ?? 0) || 0);
      const maxDiscountAmount = Math.max(0, Number(raw.maxDiscountAmount ?? raw.max_discount_amount ?? 0) || 0);
      const maxUsage = Math.max(0, Number(raw.maxUsage ?? raw.max_usage ?? 0) || 0);
      const usedCount = Math.max(0, Number(raw.usedCount ?? raw.used_count ?? 0) || 0);
      const maxPerUser = Math.max(0, Number(raw.maxPerUser ?? raw.max_per_user ?? 0) || 0);

      const rawFrom = raw.validFrom ?? raw.valid_from ?? null;
      const validFrom = rawFrom ? String(rawFrom).trim().slice(0, 10) : null;
      const rawTo = raw.validTo ?? raw.valid_to ?? null;
      const validTo = rawTo ? String(rawTo).trim().slice(0, 10) : null;

      const rawPitchLimit = raw.pitchTypeLimit ?? raw.pitch_type_limit ?? null;
      const pitchTypeLimit = (rawPitchLimit !== null && rawPitchLimit !== '' && Number(rawPitchLimit) > 0)
        ? Number(rawPitchLimit)
        : null;

      let requiredTier = String(raw.requiredTier ?? raw.required_tier ?? '').trim();
      if (!requiredTier && code === 'VIPGOLD') {
        requiredTier = 'vip,regular';
      }

      const rawActive = raw.isActive ?? raw.is_active;
      const isActive = rawActive === undefined
        ? true
        : !(rawActive === false || rawActive === 0 || rawActive === '0' || String(rawActive).toLowerCase() === 'false');

      return {
        code,
        description: String(raw.description ?? '').trim(),
        type,
        discount_type: type,
        value,
        discount_value: value,
        minOrder,
        min_order: minOrder,
        maxDiscountAmount,
        max_discount_amount: maxDiscountAmount,
        maxUsage,
        max_usage: maxUsage,
        usedCount,
        used_count: usedCount,
        maxPerUser,
        max_per_user: maxPerUser,
        validFrom,
        valid_from: validFrom,
        validTo,
        valid_to: validTo,
        pitchTypeLimit,
        pitch_type_limit: pitchTypeLimit,
        requiredTier,
        required_tier: requiredTier,
        isActive,
        is_active: isActive ? 1 : 0
      };
    },

    getVouchers() {
      const primaryKey = window.STORAGE_KEYS?.VOUCHERS || window.SanBongDB?.STORAGE_KEYS?.VOUCHERS || 'sb_vouchers_v1';
      const secondaryKey = 'sanbong_vouchers';
      const readList = (key) => {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || 'null');
          return Array.isArray(parsed) ? parsed.map(v => this.normalizeVoucher(v)).filter(Boolean) : [];
        } catch (e) {
          return [];
        }
      };
      const primaryList = readList(primaryKey);
      const secondaryList = readList(secondaryKey);
      if (primaryList.length === 0 && secondaryList.length === 0) {
        return (window.SanBongData?.DEFAULT_VOUCHERS || []).map(v => this.normalizeVoucher(v)).filter(Boolean);
      }
      const mergedMap = new Map();
      primaryList.forEach(v => mergedMap.set(v.code, v));
      secondaryList.forEach(v => mergedMap.set(v.code, v));
      return Array.from(mergedMap.values());
    },

    setVouchers(list) {
      const primaryKey = window.STORAGE_KEYS?.VOUCHERS || window.SanBongDB?.STORAGE_KEYS?.VOUCHERS || 'sb_vouchers_v1';
      const normalized = Array.isArray(list) ? list.map(v => this.normalizeVoucher(v)).filter(Boolean) : [];
      try {
        localStorage.setItem(primaryKey, JSON.stringify(normalized));
        localStorage.setItem('sanbong_vouchers', JSON.stringify(normalized));
      } catch (e) {}
      return normalized;
    },

    getSlotsWithStatus(pitchId, dateStr) {
      return this.getSlots(pitchId, dateStr);
    }
  });
  if (typeof window.SanBongDB.init === 'function') window.SanBongDB.init();
})();

;
/* === db.js === */
﻿// Sân Bóng Pro - Unified Database Orchestrator
(function () {
  'use strict';
  window.SanBongDB = window.SanBongDB || {};
})();

;
/* === ui.js === */

(function () {
  'use strict';

  const escapeHTML = (str) => (window.SanBongHelpers ? window.SanBongHelpers.escapeHTML(str) : String(str || ''));
  const getRelativePath = (t) => (window.SanBongHelpers ? window.SanBongHelpers.getRelativePath(t) : t);
  const Icons = (window.SanBongHelpers && window.SanBongHelpers.Icons) ? window.SanBongHelpers.Icons : {};

function handleLogout() {
    const doLogout = async () => {
      try {
        const headers = window.SanBongHelpers?.getAuthFetchHeaders
          ? window.SanBongHelpers.getAuthFetchHeaders()
          : { 'Content-Type': 'application/json' };
        if (!headers['X-CSRF-Token'] && sessionStorage.getItem('sb_current_user')) {
          const meRes = await fetch(getRelativePath('api/auth.php?action=me'), { cache: 'no-store' });
          const meJson = await meRes.json().catch(() => null);
          if (meJson?.csrf_token) {
            headers['X-CSRF-Token'] = meJson.csrf_token;
          }
        }
        await fetch(getRelativePath('api/auth.php?action=logout'), {
          method: 'POST',
          headers,
          body: JSON.stringify({})
        });
      } catch (e) {}

      ['sb_current_user', 'sb_booking_draft', 'sb_latest_booking', 'sb_csrf_token'].forEach(k => sessionStorage.removeItem(k));
      try {
        sessionStorage.clear();
        ['sb_current_user', 'sb_user_v1', 'sb_bookings_v1', 'sb_pending_payments_v3', 'sb_audit_logs_v1', 'sb_shifts_v1', 'sb_counter_sales_v1', 'sb_bank_transactions_v1'].forEach(k => localStorage.removeItem(k));
        Object.keys(localStorage).forEach(k => { if (k.startsWith('sb_hold_expire_') || k.startsWith('sb_')) localStorage.removeItem(k); });
      } catch (e) {}
      if (window.SanBongHelpers?.clearCsrfToken) window.SanBongHelpers.clearCsrfToken();
      window.location.href = getRelativePath('');
    };

    if (showModal) {
      showModal({
        title: 'Đăng xuất tài khoản',
        message: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?',
        type: 'danger',
        confirmVariant: 'danger',
        confirmText: 'Đăng xuất',
        cancelText: 'Ở lại',
        onConfirm: doLogout
      });
    } else {
      doLogout();
    }
  }

  function renderNavbar(activePage = 'Trang chủ') {
    let currentUser = null;
    try {
      currentUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
      try { localStorage.removeItem('sb_current_user'); } catch (e) {}
    } catch(e) {}

    const sysCfg = (window.SanBongDB && typeof window.SanBongDB.getSystemConfig === 'function')
      ? window.SanBongDB.getSystemConfig()
      : null;
    const showMatchmaking = !sysCfg || sysCfg.matchmakingEnabled !== false;

    const navItems = [
      { label: 'Trang chủ', href: getRelativePath('') },
      { label: 'Danh sách sân', href: getRelativePath('fields') },
      { label: 'Đặt sân nhanh', href: getRelativePath('booking') },
      ...(showMatchmaking ? [{ label: 'Tìm đối / Ghép kèo', href: getRelativePath('matchmaking') }] : []),
      ...(currentUser ? [{ label: 'Lịch sử & Hội viên', href: getRelativePath('history') }] : [])
    ];

    if (currentUser && currentUser.role === 'admin') {
      navItems.push({ label: 'Quản trị Portal', href: getRelativePath('portal-admin/') });
    } else if (currentUser && currentUser.role === 'manager') {
      navItems.push({ label: 'Quản lý Sân', href: getRelativePath('portal-admin/') });
    } else if (currentUser && currentUser.role === 'staff') {
      navItems.push({ label: 'Cổng Trực Sân', href: getRelativePath('portal-admin/') });
    }

    let authSectionHtml = '';
    const userDisplayName = currentUser ? (currentUser.full_name || currentUser.name || currentUser.username) : '';
    if (currentUser && userDisplayName) {
      const isAdmin = currentUser.role === 'admin';
      const isManager = currentUser.role === 'manager';
      const isStaff = currentUser.role === 'staff';
      const cleanAvatarWords = userDisplayName
        .replace(/\([^)]*\)/g, ' ')
        .trim()
        .split(/\s+/)
        .map(w => w.replace(/[^a-zA-ZÀ-ỹ0-9]/g, ''))
        .filter(Boolean);
      const user = {
        name: userDisplayName,
        full_name: userDisplayName,
        avatar: cleanAvatarWords.map(w => w[0]).slice(-2).join('').toUpperCase() || 'VIP',
        tier: isAdmin ? 'Quản trị viên' : (isManager ? 'Quản lý sân' : (isStaff ? 'Nhân viên trực sân' : (currentUser.tier || 'Hội viên'))),
        points: Number(currentUser.points) || 0
      };
      const userSubline = (isStaff || isManager) ? escapeHTML(user.tier) : `${escapeHTML(user.tier)} • ${user.points}đ`;

      authSectionHtml = `
      <div class="flex items-center gap-2 sm:gap-3 shrink-0">
        <div id="notif-bell-wrap" class="relative shrink-0">
          <button type="button" id="notif-bell-btn" aria-label="Thông báo" aria-haspopup="true" aria-expanded="false" onclick="window.SanBongUI && window.SanBongUI.toggleNotificationsDropdown(event)" class="w-11 h-11 sm:w-10 sm:h-10 rounded-full border border-[#E2E8F0] flex items-center justify-center relative text-[#475569] hover:bg-[#ECFDF3] hover:text-[#15803D] hover:border-[#86EFAC] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A]">
            ${Icons.bell}
            <span id="notif-unread-dot" class="hidden absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white"></span>
          </button>

          <div id="notif-dropdown-menu" role="region" aria-label="Danh sách thông báo" class="hidden absolute right-0 top-full mt-2 w-[calc(100vw-1.5rem)] max-w-sm sm:w-80 bg-white rounded-xl shadow-2xl border border-[#E2E8F0] z-50 overflow-hidden">
            <div class="px-4 py-3 border-b border-[#F1F5F9] flex items-center justify-between bg-[#F8FAFC]">
              <div class="flex items-center gap-2">
                <span class="font-heading font-bold text-sm text-[#0F172A]">Thông báo</span>
                <span id="notif-count-badge" class="hidden px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">0</span>
              </div>
              <button type="button" onclick="window.SanBongUI && window.SanBongUI.markNotificationsRead()" class="text-[11px] font-semibold text-[#16A34A] hover:text-[#15803D] hover:underline">Đánh dấu đã đọc</button>
            </div>
            <div id="notif-list-container" class="max-h-80 overflow-y-auto divide-y divide-[#F1F5F9]">
              <div class="p-6 text-center text-xs text-[#64748B]">Đang tải thông báo...</div>
            </div>
            <div class="px-4 py-2.5 border-t border-[#F1F5F9] bg-[#F8FAFC] text-center">
              <a href="${getRelativePath('history')}" class="text-xs font-bold text-[#16A34A] hover:text-[#15803D] hover:underline">Xem tất cả lịch sử đặt sân →</a>
            </div>
          </div>
        </div>

        <div id="user-menu-container" class="relative group shrink-0">
          <button id="user-menu-btn" aria-expanded="false" class="min-h-[44px] flex items-center gap-1.5 sm:gap-2 pl-1.5 py-1 pr-2 sm:pr-3 rounded-full hover:bg-[#F1F5F9] transition-colors border border-transparent hover:border-[#E2E8F0] text-left whitespace-nowrap">
            <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#DCFCE7] text-[#16A34A] font-heading font-bold text-xs sm:text-sm flex items-center justify-center shrink-0">
              ${escapeHTML(user.avatar || 'VIP')}
            </div>
            <div class="hidden xl:block max-w-[140px]">
              <div class="text-[13px] font-semibold text-[#0F172A] leading-tight truncate">${escapeHTML(user.name)}</div>
              <div class="text-[11px] text-[#16A34A] font-medium truncate">${userSubline}</div>
            </div>
            <svg class="w-4 h-4 text-[#94A3B8] shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
          </button>

          <!-- Dropdown menu -->
          <div id="user-dropdown-menu" class="absolute right-0 top-full pt-2 w-56 hidden group-hover:block z-50 transition-all before:content-[''] before:absolute before:-top-3 before:left-0 before:right-0 before:h-3">
            <div class="w-full bg-white rounded-xl shadow-xl border border-[#E2E8F0] py-2">
              <div class="px-4 py-2 border-b border-[#F1F5F9]">
                <div class="text-xs font-bold text-[#0F172A] truncate">${escapeHTML(user.name)}</div>
                <div class="text-[11px] text-[#64748B] truncate">${escapeHTML(currentUser.phone || currentUser.email || '')}</div>
              </div>
              <a href="${getRelativePath('history')}" class="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] hover:text-[#16A34A]">
                <svg class="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                <span>Lịch sử đặt sân & Hội viên</span>
              </a>
              ${isAdmin ? `
              <a href="${getRelativePath('portal-admin/')}" class="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#16A34A] hover:bg-[#DCFCE7]/50">
                <svg class="w-4 h-4 text-[#16A34A] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                <span>Bảng điều khiển Quản trị</span>
              </a>` : (isManager ? `
              <a href="${getRelativePath('portal-admin/')}" class="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#7C3AED] hover:bg-purple-50">
                <svg class="w-4 h-4 text-purple-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                <span>Quản lý Sân</span>
              </a>` : (isStaff ? `
              <a href="${getRelativePath('portal-admin/')}" class="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#2563EB] hover:bg-blue-50">
                <svg class="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                <span>Cổng Trực Sân</span>
              </a>` : ''))}
              <button onclick="window.SanBongApp.handleLogout()" class="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#DC2626] hover:bg-rose-50 border-t border-[#F1F5F9]">
                <svg class="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      </div>`;
    } else {
      authSectionHtml = `
      <div class="flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap">
        <a href="${getRelativePath('login')}" class="min-h-[44px] sm:min-h-0 sm:h-9 px-3 sm:px-4 rounded-lg flex items-center justify-center text-xs font-bold text-[#16A34A] border border-[#16A34A] hover:bg-[#ECFDF3] hover:text-[#15803D] transition-all whitespace-nowrap">
          Đăng nhập
        </a>
        <a href="${getRelativePath('login')}?tab=register" class="hidden sm:flex h-9 px-4 rounded-lg items-center justify-center text-xs font-bold bg-[#16A34A] text-white hover:bg-[#15803D] shadow-sm transition-all whitespace-nowrap">
          Đăng ký
        </a>
      </div>`;
    }

    const mobileNavHtml = navItems.map(item => {
      const isAct = item.label === activePage;
      return `
      <a href="${item.href}" class="min-h-[44px] flex items-center px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
        isAct ? 'bg-[#ECFDF3] text-[#15803D]' : 'text-[#334155] hover:bg-[#F8FAFC] hover:text-[#15803D]'
      }">${escapeHTML(item.label)}</a>`;
    }).join('');

    return `
    <header class="w-full bg-white border-b border-[#E2E8F0] sticky top-0 z-50 shadow-sm">
      <div class="h-[72px] px-2.5 sm:px-4 lg:px-6 xl:px-10 flex items-center justify-between gap-2 sm:gap-3">
        <div class="flex items-center gap-4 lg:gap-6 xl:gap-8 shrink-0">
          <a href="${getRelativePath('')}" class="min-h-[44px] flex items-center gap-2 sm:gap-2.5 group shrink-0 whitespace-nowrap">
            <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] bg-[#16A34A] text-white flex items-center justify-center shadow-md group-hover:bg-[#15803D] transition-all shrink-0">
              ${Icons.ball}
            </div>
            <div class="leading-none">
              <span class="block font-heading font-extrabold text-[15px] sm:text-[19px] text-[#0F172A] tracking-tight whitespace-nowrap">Sân Bóng Pro</span>
              <span class="hidden sm:block text-[10px] font-medium text-[#16A34A] uppercase tracking-wider mt-0.5 whitespace-nowrap">Hệ thống sân đỉnh cao</span>
            </div>
          </a>

          <nav class="hidden lg:flex items-center gap-4 xl:gap-6 h-[72px]">
            ${navItems.map(item => {
              const isAct = item.label === activePage;
              return `
              <a href="${item.href}" class="h-full flex items-center relative text-[13px] xl:text-[14px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                isAct ? 'text-[#16A34A] font-semibold' : 'text-[#475569] hover:text-[#15803D]'
              }">
                <span>${escapeHTML(item.label)}</span>
                ${isAct ? `<span class="absolute bottom-0 left-0 right-0 h-[3px] bg-[#16A34A] rounded-t-full"></span>` : ''}
              </a>`;
            }).join('')}
          </nav>
        </div>

        <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
          ${authSectionHtml}
          <button type="button" id="mobile-nav-toggle-btn" aria-label="Mở menu điều hướng" aria-expanded="false" onclick="(function(btn){var m=document.getElementById('mobile-nav-drawer');if(!m)return;var open=m.classList.toggle('hidden');btn.setAttribute('aria-expanded',String(!open));})(this)" class="lg:hidden w-11 h-11 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#334155] hover:bg-[#ECFDF3] hover:text-[#15803D] transition-colors shrink-0">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
        </div>
      </div>

      <nav id="mobile-nav-drawer" class="hidden lg:hidden border-t border-[#E2E8F0] bg-white px-3 py-2.5 space-y-1 shadow-md">
        ${mobileNavHtml}
        ${!currentUser ? `
        <div class="sm:hidden pt-2 mt-2 border-t border-[#E2E8F0] grid grid-cols-2 gap-2">
          <a href="${getRelativePath('login')}" class="min-h-[44px] rounded-lg flex items-center justify-center text-xs font-bold text-[#16A34A] border border-[#16A34A] hover:bg-[#ECFDF3] hover:text-[#15803D] transition-all">Đăng nhập</a>
          <a href="${getRelativePath('login')}?tab=register" class="min-h-[44px] rounded-lg flex items-center justify-center text-xs font-bold bg-[#16A34A] text-white hover:bg-[#15803D] shadow-sm transition-all">Đăng ký</a>
        </div>` : ''}
      </nav>
    </header>`;
  }

  function renderFooter() {
    const sysCfg = (window.SanBongDB && typeof window.SanBongDB.getSystemConfig === 'function')
      ? window.SanBongDB.getSystemConfig()
      : null;
    const openHoursText = escapeHTML(sysCfg?.openHours || '05:30 - 22:30 hàng ngày (kể cả Lễ, Tết)');
    return `
    <footer class="w-full bg-[#0F172A] text-white pt-14 pb-8 border-t border-[#1E293B]">
      <div class="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-[10px] bg-[#16A34A] text-white flex items-center justify-center">
              ${Icons.ball}
            </div>
            <span class="font-heading font-bold text-[20px] text-white">Sân Bóng Pro</span>
          </div>
          <p class="text-[13px] text-[#94A3B8] leading-relaxed">
            Hệ thống đặt sân bóng đá tự động, chuẩn hóa giao diện trực quan với mặt cỏ chuẩn FIFA và dịch vụ trận đấu trọn gói.
          </p>
          <div class="flex items-center gap-3 text-[#94A3B8] text-[13px]">
            ${Icons.phone}
            <a href="tel:0352313548" class="hover:text-emerald-400 font-bold transition-colors">Hotline: 0352 313 548 (24/7)</a>
          </div>
        </div>

        <div>
          <h4 class="font-heading font-semibold text-[15px] mb-4 text-[#F8FAFC]">Hệ Thống Sân</h4>
          <ul class="space-y-2.5 text-[13px] text-[#94A3B8]">
            <li><a href="${getRelativePath('fields')}" class="hover:text-white transition-colors">Sân 5 người tiêu chuẩn</a></li>
            <li><a href="${getRelativePath('fields')}" class="hover:text-white transition-colors">Sân 7 người trung tâm</a></li>
            <li><a href="${getRelativePath('fields')}" class="hover:text-white transition-colors">Sân 11 người ghép chuẩn VFF</a></li>
            <li><a href="${getRelativePath('booking')}" class="hover:text-white transition-colors">Bảng giá &amp; Khung giờ</a></li>
          </ul>
        </div>

        <div>
          <h4 class="font-heading font-semibold text-[15px] mb-4 text-[#F8FAFC]">Dịch Vụ Đi Kèm</h4>
          <ul class="space-y-2.5 text-[13px] text-[#94A3B8]">
            <li>Áo bib phân đội dạ quang</li>
            <li>Nước giải khát Aquafina & Revive</li>
            <li>Trọng tài chuyên nghiệp bắt giải</li>
            <li>Thuê bóng thi đấu Động Lực</li>
          </ul>
        </div>

        <div>
          <h4 class="font-heading font-semibold text-[15px] mb-4 text-[#F8FAFC]">Địa Chỉ Liên Hệ</h4>
          <p class="text-[13px] text-[#94A3B8] leading-relaxed mb-3">
            Khu liên hợp Thể thao Pro, Số 18 Đường Lê Đức Thọ, Phường Mỹ Đình, Quận Nam Từ Liêm, TP. Hà Nội.
          </p>
          <div class="p-3 rounded-lg bg-[#1E293B] border border-[#334155] text-xs text-[#CBD5E1] flex items-center gap-2">
            <span class="relative flex h-2.5 w-2.5 shrink-0">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span class="text-emerald-400 font-semibold">Giờ mở cửa:</span>
            <span>${openHoursText}</span>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 md:px-8 pt-6 border-t border-[#1E293B] flex flex-col sm:flex-row items-center justify-between text-[12px] text-[#64748B] gap-4">
        <div>© 2026 Sân Bóng Pro. Bản quyền hệ thống đặt sân hiện đại.</div>
        <div class="flex items-center gap-6">
          <button type="button" id="footer-btn-terms" class="hover:text-white transition-colors cursor-pointer text-left bg-transparent border-none p-0 text-[12px] text-[#94A3B8]">Điều khoản sử dụng</button>
          <button type="button" id="footer-btn-privacy" class="hover:text-white transition-colors cursor-pointer text-left bg-transparent border-none p-0 text-[12px] text-[#94A3B8]">Chính sách bảo mật (NĐ 13/2023)</button>
        </div>
      </div>

      <!-- FLOATING QUICK ACTIONS (ZALO & HOTLINE) -->
      <style id="zalo-floating-motion-style">
        .zalo-floating-btn {
          position: relative;
          box-shadow: 0 4px 16px rgba(0, 104, 255, 0.45);
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
        }
        .zalo-floating-btn:hover {
          transform: scale(1.15) !important;
          box-shadow: 0 6px 22px rgba(0, 104, 255, 0.65);
        }
        .zalo-icon-inner {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          animation: zaloWiggle 2.6s infinite ease-in-out;
          transform-origin: center center;
        }
        .zalo-pulse-ring {
          position: absolute;
          inset: -4px;
          border-radius: 9999px;
          background: rgba(0, 104, 255, 0.45);
          animation: zaloPulseRing 2s infinite cubic-bezier(0.24, 0, 0.38, 1);
          z-index: 1;
          pointer-events: none;
        }
        .zalo-pulse-wave {
          position: absolute;
          inset: -10px;
          border-radius: 9999px;
          border: 2px solid rgba(0, 104, 255, 0.35);
          animation: zaloPulseWave 2s infinite cubic-bezier(0.24, 0, 0.38, 1);
          animation-delay: 0.4s;
          z-index: 1;
          pointer-events: none;
        }
        @keyframes zaloWiggle {
          0%, 100% { transform: scale(1) rotate(0deg); }
          8%, 22% { transform: scale(1.12) rotate(-12deg); }
          15%, 28% { transform: scale(1.12) rotate(12deg); }
          35% { transform: scale(1.05) rotate(0deg); }
          45% { transform: scale(1) rotate(0deg); }
        }
        @keyframes zaloPulseRing {
          0% { transform: scale(0.9); opacity: 0.85; }
          70% { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes zaloPulseWave {
          0% { transform: scale(0.85); opacity: 0.9; }
          80% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }

        /* Hotline Floating Motion */
        .hotline-floating-btn {
          position: relative;
          box-shadow: 0 4px 16px rgba(22, 163, 74, 0.45);
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
        }
        .hotline-floating-btn:hover {
          transform: scale(1.15) !important;
          box-shadow: 0 6px 22px rgba(22, 163, 74, 0.65);
        }
        .hotline-icon-inner {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          animation: phoneRing 2.6s infinite ease-in-out;
          animation-delay: 1.3s;
          transform-origin: center center;
        }
        .hotline-pulse-ring {
          position: absolute;
          inset: -4px;
          border-radius: 9999px;
          background: rgba(22, 163, 74, 0.45);
          animation: hotlinePulseRing 2s infinite cubic-bezier(0.24, 0, 0.38, 1);
          z-index: 1;
          pointer-events: none;
        }
        .hotline-pulse-wave {
          position: absolute;
          inset: -10px;
          border-radius: 9999px;
          border: 2px solid rgba(22, 163, 74, 0.35);
          animation: hotlinePulseWave 2s infinite cubic-bezier(0.24, 0, 0.38, 1);
          animation-delay: 0.4s;
          z-index: 1;
          pointer-events: none;
        }
        @keyframes phoneRing {
          0%, 100% { transform: scale(1) rotate(0deg); }
          8%, 22% { transform: scale(1.15) rotate(-15deg); }
          15%, 28% { transform: scale(1.15) rotate(15deg); }
          35% { transform: scale(1.05) rotate(0deg); }
          45% { transform: scale(1) rotate(0deg); }
        }
        @keyframes hotlinePulseRing {
          0% { transform: scale(0.9); opacity: 0.85; }
          70% { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes hotlinePulseWave {
          0% { transform: scale(0.85); opacity: 0.9; }
          80% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      </style>
      ${(() => {
        const p = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname.toLowerCase() : '';
        if (/(?:\/|^)(booking|checkout|login|forgot-password)(?:\.html|\/|$)/.test(p)) return '';
        return `
      <div id="sb-floating-contact" class="fixed right-3 sm:right-5 bottom-16 sm:bottom-6 z-40 flex flex-col gap-2.5 pointer-events-auto transition-opacity duration-200">
        <a href="https://zalo.me/0352313548" target="_blank" rel="noopener noreferrer" class="zalo-floating-btn w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#0068FF] text-white flex items-center justify-center font-bold text-[11px] sm:text-xs" title="Chat Zalo hỗ trợ 24/7">
          <span class="zalo-pulse-ring"></span>
          <span class="zalo-pulse-wave"></span>
          <span class="zalo-icon-inner relative z-10 text-[11px] sm:text-xs font-black tracking-tighter drop-shadow-sm">Zalo</span>
        </a>
        <a href="tel:0352313548" class="hotline-floating-btn w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#16A34A] text-white flex items-center justify-center font-bold text-base sm:text-lg" title="Gọi Hotline đặt sân 0352 313 548">
          <span class="hotline-pulse-ring"></span>
          <span class="hotline-pulse-wave"></span>
          <span class="hotline-icon-inner relative z-10 flex items-center justify-center">
            <svg class="w-5 h-5 text-white fill-current drop-shadow-sm" viewBox="0 0 24 24"><path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z"/></svg>
          </span>
        </a>
      </div>`;
      })()}${(() => { if (typeof window !== 'undefined') setTimeout(() => { if (typeof window._sbSyncFabVisibility === 'function') window._sbSyncFabVisibility(); }, 20); return ''; })()}
    </footer>`;
  }

  function showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('sb-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'sb-toast-container';
      container.setAttribute('role', 'region');
      container.setAttribute('aria-label', 'Thông báo hệ thống');
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      container.className = 'fixed bottom-20 sm:bottom-5 right-3 sm:right-5 left-3 sm:left-auto z-[9999] flex flex-col-reverse gap-2.5 sm:max-w-sm w-auto pointer-events-none';
      document.body.appendChild(container);
    }

    const normMsg = String(message || '').trim();
    // Gộp trùng: chỉ 1 toast cùng nội dung tại một thời điểm
    const existing = container.querySelectorAll('[data-sb-toast-msg]');
    for (const el of existing) {
      if (el.getAttribute('data-sb-toast-msg') === normMsg) {
        el.classList.add('ring-2', 'ring-emerald-400', 'scale-105');
        setTimeout(() => el.classList.remove('ring-2', 'ring-emerald-400', 'scale-105'), 200);
        return;
      }
    }

    // Tối đa 3 toast: loại bỏ toast cũ nhất nếu đã đủ 3
    while (container.children.length >= 3) {
      const oldest = container.firstElementChild;
      if (oldest) oldest.remove();
    }

    const toast = document.createElement('div');
    toast.setAttribute('data-sb-toast-msg', normMsg);
    toast.className = 'pointer-events-auto transform translate-y-2 opacity-0 transition-all duration-300 ease-out shadow-xl rounded-xl p-3.5 flex items-start gap-3 border text-xs font-semibold backdrop-blur-md';

    let icon = '';
    let styleClasses = '';

    if (type === 'success') {
      icon = '<svg class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>';
      styleClasses = 'bg-emerald-50/95 text-emerald-900 border-emerald-300';
    } else if (type === 'error') {
      icon = '<svg class="w-4 h-4 text-rose-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>';
      styleClasses = 'bg-rose-50/95 text-rose-900 border-rose-300';
    } else if (type === 'warning') {
      icon = '<svg class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>';
      styleClasses = 'bg-amber-50/95 text-amber-900 border-amber-300';
    } else {
      icon = '<svg class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>';
      styleClasses = 'bg-blue-50/95 text-blue-900 border-blue-300';
    }

    toast.className += ' ' + styleClasses;
    toast.innerHTML = `
      ${icon}
      <div class="flex-1 leading-snug">${escapeHTML(message).replace(/\n/g, '<br>')}</div>
      <button type="button" aria-label="Đóng thông báo" class="text-slate-400 hover:text-slate-700 ml-1 text-sm font-bold leading-none select-none p-1">&times;</button>
    `;

    const closeBtn = toast.querySelector('button');
    const removeToast = () => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => {
        try { toast.remove(); } catch (e) {}
      }, 300);
    };
    closeBtn.addEventListener('click', removeToast);

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.remove('opacity-0', 'translate-y-2');
      toast.classList.add('opacity-100', 'translate-y-0');
    });

    if (duration > 0) {
      setTimeout(removeToast, duration);
    }
  }

  function showModal(options = {}) {
    const {
      title = 'Thông báo',
      message = '',
      type = 'info',
      confirmText = 'Xác nhận',
      cancelText = null,
      confirmVariant = null,
      onConfirm = null,
      onCancel = null
    } = options;

    const modalId = 'sb-dialog-modal';
    const existing = document.getElementById(modalId);
    if (existing) {
      if (typeof window._sbActiveModalCleanup === 'function') {
        window._sbActiveModalCleanup();
      }
      existing.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = modalId;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'sb-dialog-modal-title');
    overlay.className = 'fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 opacity-0 transition-opacity duration-200';

    const card = document.createElement('div');
    card.className = 'relative bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-5 transform scale-95 transition-transform duration-200';

    const isLogout = type === 'logout' || options.icon === 'logout' || (/đăng xuất/i.test(title || ''));

    let headerBadge = '';
    if (isLogout) {
      headerBadge = `
        <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0 shadow-sm" aria-hidden="true">
          <svg class="w-6 h-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </div>
      `;
    } else if (type === 'error' || type === 'danger') {
      headerBadge = `
        <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0 shadow-sm" aria-hidden="true">
          <svg class="w-6 h-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
      `;
    } else if (type === 'warning') {
      headerBadge = `
        <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0 shadow-sm" aria-hidden="true">
          <svg class="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
      `;
    } else if (type === 'success') {
      headerBadge = `
        <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 shadow-sm" aria-hidden="true">
          <svg class="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
      `;
    } else {
      headerBadge = `
        <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 shadow-sm" aria-hidden="true">
          <svg class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
      `;
    }

    const effectiveVariant = confirmVariant || (isLogout || type === 'danger' || type === 'error' ? 'danger' : (type === 'warning' ? 'warning' : 'primary'));

    let confirmBtnClass = '';
    if (effectiveVariant === 'danger') {
      confirmBtnClass = 'bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl px-5 py-2.5 shadow-md shadow-rose-200 transition-all text-sm cursor-pointer';
    } else if (effectiveVariant === 'warning') {
      confirmBtnClass = 'bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl px-5 py-2.5 shadow-md shadow-amber-200 transition-all text-sm cursor-pointer';
    } else {
      confirmBtnClass = 'bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold rounded-xl px-5 py-2.5 shadow-md shadow-emerald-200 transition-all text-sm cursor-pointer';
    }

    const cancelBtnClass = 'border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl px-5 py-2.5 transition-all text-sm cursor-pointer';

    card.innerHTML = `
      <button type="button" id="modal-close-x" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors focus:outline-none cursor-pointer" aria-label="Đóng">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
      <div class="flex items-start gap-4">
        ${headerBadge}
        <div class="flex-1 min-w-0 pr-6">
          <h3 id="sb-dialog-modal-title" class="font-heading font-bold text-lg text-slate-900 tracking-tight leading-snug">${escapeHTML(title || 'Thông báo')}</h3>
          <div class="text-sm text-slate-600 leading-relaxed mt-1 whitespace-pre-line max-h-[60vh] overflow-y-auto pr-1">${escapeHTML(message || '')}</div>
        </div>
      </div>
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
        ${cancelText ? `<button type="button" id="modal-cancel-btn" class="${cancelBtnClass}">${escapeHTML(cancelText)}</button>` : ''}
        <button type="button" id="modal-confirm-btn" class="${confirmBtnClass}">${escapeHTML(confirmText)}</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.classList.remove('opacity-0');
      overlay.classList.add('opacity-100');
      card.classList.remove('scale-95');
      card.classList.add('scale-100');
    });

    let closed = false;
    const close = (triggerCancel = true) => {
      if (closed) return;
      closed = true;

      document.removeEventListener('keydown', handleKeyDown);
      window._sbActiveModalCleanup = null;

      overlay.classList.remove('opacity-100');
      overlay.classList.add('opacity-0');
      card.classList.remove('scale-100');
      card.classList.add('scale-95');

      setTimeout(() => {
        try { overlay.remove(); } catch (e) {}
      }, 200);

      if (triggerCancel && typeof onCancel === 'function') {
        try { onCancel(); } catch (e) {}
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    window._sbActiveModalCleanup = () => {
      document.removeEventListener('keydown', handleKeyDown);
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        close(true);
      }
    });

    const closeXBtn = card.querySelector('#modal-close-x');
    if (closeXBtn) {
      closeXBtn.addEventListener('click', () => close(true));
    }

    if (cancelText) {
      const cancelBtn = card.querySelector('#modal-cancel-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => close(true));
      }
    }

    const confirmBtn = card.querySelector('#modal-confirm-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        close(false);
        if (typeof onConfirm === 'function') {
          try { onConfirm(); } catch (e) {}
        }
      });
    }
  }

  function showPrivacyPolicyModal() {
    showModal({
      title: '🛡️ CHÍNH SÁCH BẢO VỆ DỮ LIỆU CÁ NHÂN (Nghị định 13/2023/NĐ-CP)',
      message: `1. Mục đích thu thập & xử lý dữ liệu:
Hệ thống thu thập Họ tên, Số điện thoại, Email và thông tin giao dịch nhằm:
• Xác thực lệnh đặt sân, phát hành vé điện tử QR check-in vào sân.
• Liên hệ xác nhận lịch thi đấu, hỗ trợ hủy lịch hoặc xử lý hoàn cọc.
• Tích lũy điểm hội viên và nâng hạng thành viên thân thiết.
• Phòng chống gian lận đặt ảo và bảo vệ an ninh trật tự khu sân.

2. Bên kiểm soát & Bên xử lý dữ liệu:
• Hệ thống Sân Bóng Pro (Số 18 Đường Lê Đức Thọ, P. Mỹ Đình, Q. Nam Từ Liêm, TP. Hà Nội).
• Hotline liên hệ hỗ trợ: 0352 313 548.

3. Thời gian lưu trữ dữ liệu cá nhân:
Dữ liệu cá nhân được lưu trữ an toàn trong suốt thời gian người dùng duy trì tài khoản hoặc tối đa 24 tháng kể từ ngày giao dịch gần nhất, trừ khi pháp luật có quy định khác.

4. Quyền của chủ thể dữ liệu (Quý khách hàng):
Theo Điều 9 Nghị định 13/2023/NĐ-CP, Quý khách có đầy đủ quyền:
• Được biết, đồng ý hoặc không đồng ý xử lý dữ liệu cá nhân.
• Truy cập, chỉnh sửa hoặc yêu cầu cập nhật thông tin cá nhân.
• Yêu cầu xóa dữ liệu cá nhân hoặc rút lại sự đồng ý đã cung cấp.
• Khiếu nại, tố cáo hoặc phản ánh khi phát hiện vi phạm bảo mật dữ liệu.
Mọi yêu cầu thực hiện quyền vui lòng liên hệ Hotline: 0352 313 548 để được giải quyết trong vòng 72 giờ.

5. Cam kết an toàn & bảo mật:
Hệ thống áp dụng các biện pháp mã hóa đường truyền HTTPS/TLS, cơ chế phòng chống truy cập trái phép và cam kết TUYỆT ĐỐI không chia sẻ hoặc mua bán thông tin cho bên thứ ba vì mục đích thương mại.`,
      type: 'info',
      confirmText: 'Tôi đã hiểu & đồng ý'
    });
  }

  function showTermsModal() {
    showModal({
      title: '📋 ĐIỀU KHOẢN SỬ DỤNG DỊCH VỤ SÂN BÓNG PRO',
      message: `1. Quy định đặt sân & Giữ chỗ:
• Khách hàng thực hiện đặt chỗ trực tuyến qua website. Sau khi tạo lệnh, hệ thống áp dụng thời gian giữ chỗ (mặc định 15 phút) để khách thanh toán tiền cọc.
• Hết thời gian giữ chỗ nếu chưa nhận được tiền cọc, hệ thống sẽ tự động hủy đơn và nhả slot cho các đội bóng khác.

2. Chính sách cọc & Hoàn tiền:
• Tỷ lệ đặt cọc: Áp dụng 30% cho đặt lẻ hoặc 60% cho gói theo tháng.
• Hủy trước 24 giờ so với giờ bắt đầu: Hoàn 100% tiền cọc.
• Hủy trước từ 4 giờ đến dưới 24 giờ: Hoàn 50% tiền cọc (phạt 50% chi phí giữ chỗ).
• Hủy sát giờ dưới 4 giờ hoặc vắng mặt (No-Show): Không hoàn cọc nhằm bù đắp chi phí vận hành sân.

3. Quy định trang thiết bị & An toàn:
• Cầu thủ sử dụng giày thi đấu chuyên dụng cho sân cỏ nhân tạo (giày đinh dăm TF hoặc đế bệt IC). Nghiêm cấm giày đinh sắt SG gây rách mặt cỏ.
• Giữ gìn vệ sinh chung, không mang chất dễ cháy nổ, đồ thủy tinh hoặc chất cấm vào khu vực sân cỏ.
• Tôn trọng đối thủ, trọng tài và thi đấu trên tinh thần thể thao văn minh, fair-play.`,
      type: 'info',
      confirmText: 'Đã hiểu'
    });
  }

  let _authMePromise = null;

  async function syncAuthMe() {
    window.SanBongApp = window.SanBongApp || {};
    _authMePromise = (async () => {
      try {
        const res = await fetch(getRelativePath('api/auth.php?action=me'), { credentials: 'same-origin', cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.csrf_token && window.SanBongHelpers?.setCsrfToken) {
            window.SanBongHelpers.setCsrfToken(data.csrf_token);
          }
          if (data && data.turnstile_site_key) {
            window.TURNSTILE_SITE_KEY = data.turnstile_site_key;
          }
          if (data && data.authenticated && data.user) {
            const rawName = data.user.full_name || data.user.name || data.user.username || 'Hội viên';
            data.user.name = rawName;
            data.user.full_name = rawName;
            const current = JSON.parse(sessionStorage.getItem('sb_current_user') || '{}');
            const updated = Object.assign({}, current, data.user);
            sessionStorage.setItem('sb_current_user', JSON.stringify(updated));
            try { localStorage.removeItem('sb_current_user'); } catch (e) {}
            // If navbar is already rendered, update points / tier if changed
            const navPlaceholder = document.getElementById('app-navbar');
            if (navPlaceholder && window.SanBongUI && typeof window.SanBongUI.renderNavbar === 'function') {
              const activePage = navPlaceholder.dataset ? navPlaceholder.dataset.activePage : navPlaceholder.getAttribute?.('data-active-page');
              navPlaceholder.innerHTML = activePage ? window.SanBongUI.renderNavbar(activePage) : window.SanBongUI.renderNavbar();
            }
            if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
              const custDetail = (data.customer || (data.user.role === 'user' ? data.user : null));
              window.dispatchEvent(new CustomEvent('sb-auth-synced', { detail: custDetail }));
              if (!custDetail) {
                window.dispatchEvent(new CustomEvent('sb-auth-unauthenticated'));
              }
            }
            return data.user;
          } else if (data && data.authenticated === false) {
            sessionStorage.removeItem('sb_current_user');
            try { localStorage.removeItem('sb_current_user'); } catch (e) {}
            const navPlaceholder = document.getElementById('app-navbar');
            if (navPlaceholder && window.SanBongUI && typeof window.SanBongUI.renderNavbar === 'function') {
              const activePage = navPlaceholder.dataset ? navPlaceholder.dataset.activePage : navPlaceholder.getAttribute?.('data-active-page');
              navPlaceholder.innerHTML = activePage ? window.SanBongUI.renderNavbar(activePage) : window.SanBongUI.renderNavbar();
            }
            if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
              window.dispatchEvent(new CustomEvent('sb-auth-unauthenticated'));
            }
            return null;
          }
        }
      } catch (e) {}
      return null;
    })();

    window.SanBongApp.authReady = _authMePromise;
    return _authMePromise;
  }

  // Event delegation for footer buttons & legal links
  document.addEventListener('click', function (e) {
    const target = e.target;
    if (!target) return;
    if (target.id === 'footer-btn-privacy' || target.closest('#footer-btn-privacy')) {
      e.preventDefault();
      showPrivacyPolicyModal();
      return;
    }
    if (target.id === 'footer-btn-terms' || target.closest('#footer-btn-terms')) {
      e.preventDefault();
      showTermsModal();
      return;
    }
  });

  // Sync auth on load
  if (typeof window !== 'undefined') {
    window.SanBongApp = window.SanBongApp || {};
    window.SanBongApp.authReady = syncAuthMe();

    // Bảo vệ UI: Tự động ẩn mọi widget rác/bên thứ ba bị chặn hoặc hiện lỗi "hi — Blocked"
    document.addEventListener('DOMContentLoaded', () => {
      try {
        const suspicious = document.querySelectorAll('iframe, [id*="chat"], [class*="chat"], [id*="widget"]');
        suspicious.forEach(el => {
          const t = (el.innerText || el.textContent || '').trim();
          if (/blocked/i.test(t) || t === 'hi' || /hi\s*[-—]\s*blocked/i.test(t)) {
            el.classList.add('hidden');
            el.style.display = 'none';
          }
        });
        const syncFabVisibility = () => {
          const fab = document.getElementById('sb-floating-contact');
          if (!fab) return;
          fab.style.display = '';
          const rFab = fab.getBoundingClientRect();
          const pad = 10;
          const overlapsRect = (rect) => {
            if (!rect || (rect.width === 0 && rect.height === 0)) return false;
            return !(
              rFab.right + pad < rect.left ||
              rFab.left - pad > rect.right ||
              rFab.bottom + pad < rect.top ||
              rFab.top - pad > rect.bottom
            );
          };

          let shouldHide = false;
          const heroBtn = document.getElementById('hero-submit-btn');
          if (heroBtn && overlapsRect(heroBtn.getBoundingClientRect())) {
            shouldHide = true;
          }
          if (!shouldHide && window.innerWidth < 640) {
            const vouchersList = document.getElementById('vouchers-list');
            if (vouchersList) {
              const rV = vouchersList.getBoundingClientRect();
              if (rV.top <= rFab.bottom + pad && rV.bottom >= rFab.top - pad) {
                shouldHide = true;
              }
            }
          }
          if (!shouldHide) {
            const docEl = document.documentElement;
            if (docEl && docEl.scrollHeight > window.innerHeight + 120) {
              if (window.innerHeight + window.scrollY >= docEl.scrollHeight - 80) {
                shouldHide = true;
              }
            }
          }
          if (shouldHide) {
            fab.style.display = 'none';
          }
        };
        window._sbSyncFabVisibility = syncFabVisibility;
        syncFabVisibility();
        window.addEventListener('scroll', syncFabVisibility, { passive: true });
        window.addEventListener('resize', syncFabVisibility, { passive: true });
      } catch (e) {}
    });
  }

  window.alert = function (msg) {
    showToast(String(msg), 'warning');
  };

  function buildNotificationsFromBookings(bookings, currentUser) {
    if (!Array.isArray(bookings) || !currentUser) return [];
    const uId = currentUser.id ? Number(currentUser.id) : null;
    const uPhone = String(currentUser.phone || currentUser.username || '').replace(/\D+/g, '');
    const isAdmin = ['admin', 'manager', 'staff'].includes(String(currentUser.role || '').toLowerCase());

    const mine = bookings.filter(b => {
      if (isAdmin) return true;
      const bUid = b.user_id ? Number(b.user_id) : null;
      const bPhone = String(b.phone || '').replace(/\D+/g, '');
      return (uId && bUid && uId === bUid) || (uPhone && bPhone && uPhone === bPhone);
    });

    const fmtDate = (iso) => {
      const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
      return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || '');
    };

    return mine.slice(0, 10).map(b => {
      const st = String(b.status || '');
      const ps = String(b.paymentStatus || b.payment_status || '');
      let icon = '🔔', title = `Cập nhật đơn #${b.code}`, tone = 'text-slate-700 bg-slate-100';
      if (st === 'Đã hủy' || ps === 'Đã hủy') {
        icon = '✕'; title = `Đơn #${b.code} đã hủy`; tone = 'text-rose-700 bg-rose-100';
      } else if (st === 'Hoàn thành' || st.toLowerCase() === 'completed') {
        icon = '✓'; title = `Hoàn thành ca đá #${b.code}`; tone = 'text-emerald-700 bg-emerald-100';
      } else if (st === 'Đang đá') {
        icon = '⚽'; title = `Ca đá #${b.code} đang diễn ra`; tone = 'text-blue-700 bg-blue-100';
      } else if (ps.includes('Đã cọc') || ps.includes('Đã thanh toán')) {
        icon = '✓'; title = `Đã xác nhận cọc đơn #${b.code}`; tone = 'text-emerald-700 bg-emerald-100';
      } else {
        icon = '⏳'; title = `Đơn #${b.code} đang chờ cọc`; tone = 'text-amber-700 bg-amber-100';
      }
      return {
        code: b.code || '',
        icon,
        title,
        tone,
        desc: `${b.pitchName || b.pitch_name || b.pitchId || 'Sân bóng'} · ${fmtDate(b.date || b.booking_date)} (${b.slotTime || b.slot_time || ''})`,
        time: b.createdAt || b.created_at || ''
      };
    });
  }

  async function loadAndRenderNotifications() {
    const listEl = document.getElementById('notif-list-container');
    const dotEl = document.getElementById('notif-unread-dot');
    const badgeEl = document.getElementById('notif-count-badge');
    if (!listEl) return;

    let currentUser = null;
    try {
      currentUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
    } catch (e) {}

    let bookings = (window.SanBongDB && typeof window.SanBongDB.getAllBookings === 'function')
      ? window.SanBongDB.getAllBookings()
      : [];

    if ((!bookings || bookings.length === 0) && currentUser) {
      try {
        const res = await fetch(getRelativePath('api/bookings.php'), { credentials: 'same-origin', cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (res.ok && json && Array.isArray(json.data)) {
          bookings = json.data;
        }
      } catch (e) {}
    }

    const items = buildNotificationsFromBookings(bookings, currentUser);
    const notifSeenKey = currentUser?.id ? `sb_notif_seen_count_${currentUser.id}` : 'sb_notif_seen_count';
    const seenCount = Number(localStorage.getItem(notifSeenKey) || '0');
    const hasUnread = items.length > seenCount;

    if (dotEl) dotEl.classList.toggle('hidden', !hasUnread);
    if (badgeEl) {
      badgeEl.textContent = String(items.length);
      badgeEl.classList.toggle('hidden', items.length === 0);
    }

    if (items.length === 0) {
      listEl.innerHTML = '<div class="p-6 text-center text-xs text-[#64748B]">Chưa có thông báo nào.</div>';
      return;
    }

    listEl.innerHTML = items.map(it => {
      const targetHref = it.code
        ? `${getRelativePath('history')}?code=${encodeURIComponent(it.code)}`
        : getRelativePath('history');
      const safeCodeJs = String(it.code || '').replace(/[^a-zA-Z0-9_-]/g, '');
      return `
      <a href="${targetHref}" onclick="if(typeof window.focusHistoryBooking==='function'&&'${safeCodeJs}'){event.preventDefault();window.SanBongUI&&window.SanBongUI.closeNotificationsDropdown&&window.SanBongUI.closeNotificationsDropdown();window.focusHistoryBooking('${safeCodeJs}');}" class="flex items-start gap-3 px-4 py-3 hover:bg-[#ECFDF3]/70 transition-colors">
        <span class="w-7 h-7 rounded-full ${it.tone} flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">${it.icon}</span>
        <div class="min-w-0 flex-1">
          <div class="text-xs font-bold text-[#0F172A] truncate">${escapeHTML(it.title)}</div>
          <div class="text-[11px] text-[#475569] mt-0.5 leading-snug">${escapeHTML(it.desc)}</div>
          ${it.time ? `<div class="text-[10px] text-[#94A3B8] mt-1">${escapeHTML(it.time)}</div>` : ''}
        </div>
      </a>`;
    }).join('');
  }

  function toggleNotificationsDropdown(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const menu = document.getElementById('notif-dropdown-menu');
    const btn = document.getElementById('notif-bell-btn');
    if (!menu || !btn) return;
    const willOpen = menu.classList.contains('hidden');
    menu.classList.toggle('hidden', !willOpen);
    btn.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) {
      loadAndRenderNotifications();
    }
  }

  function markNotificationsRead() {
    let curUid = null;
    try {
      const u = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
      curUid = u?.id || null;
    } catch (e) {}
    const notifSeenKey = curUid ? `sb_notif_seen_count_${curUid}` : 'sb_notif_seen_count';
    const dotEl = document.getElementById('notif-unread-dot');
    const badgeEl = document.getElementById('notif-count-badge');
    const cnt = Number(badgeEl?.textContent || '0') || 0;
    try { localStorage.setItem(notifSeenKey, String(cnt)); } catch (e) {}
    if (dotEl) dotEl.classList.add('hidden');
    showToast('Đã đánh dấu tất cả thông báo là đã đọc.', 'success');
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
      const wrap = document.getElementById('notif-bell-wrap');
      const menu = document.getElementById('notif-dropdown-menu');
      const btn = document.getElementById('notif-bell-btn');
      if (wrap && menu && !menu.classList.contains('hidden') && !wrap.contains(e.target)) {
        menu.classList.add('hidden');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const menu = document.getElementById('notif-dropdown-menu');
        const btn = document.getElementById('notif-bell-btn');
        if (menu && !menu.classList.contains('hidden')) {
          menu.classList.add('hidden');
          if (btn) { btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
        }
      }
    });
  }

  function closeNotificationsDropdown() {
    const menu = document.getElementById('notif-dropdown-menu');
    const btn = document.getElementById('notif-bell-btn');
    if (menu) menu.classList.add('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function handleUnauthorizedSession(redirectRoute) {
    try {
      sessionStorage.removeItem('sb_current_user');
      sessionStorage.removeItem('sb_csrf_token');
      localStorage.removeItem('sb_current_user');
    } catch (e) {}
    if (typeof window !== 'undefined') {
      window.sb_current_user = null;
      if (window._sbRedirecting401) return;
      window._sbRedirecting401 = true;
      const route = String(redirectRoute || '').trim().replace(/^\/+/, '') || 'history';
      window.location.replace(getRelativePath(`login?redirect=${encodeURIComponent(route)}&expired=1`));
    }
  }

  window.SanBongUI = {
    renderNavbar,
    renderFooter,
    handleLogout,
    showToast,
    showModal,
    showPrivacyPolicyModal,
    showTermsModal,
    syncAuthMe,
    handleUnauthorizedSession,
    toggleNotificationsDropdown,
    closeNotificationsDropdown,
    markNotificationsRead
  };

  window.showToast = showToast;
  window.showModal = showModal;

})();

;
/* === vn_datepicker.js === */
(function () {
  'use strict';

  const TARGET_IDS = new Set([
    'search-date',
    'fields-filter-date',
    'booking-date-input',
    'detail-schedule-date',
    'widget-date',
    'filter-date',
    'post-match-date',
    'timeline-date-picker',
    'waitlist-date-filter',
    'rec-start-date',
    'admin-book-date',
    'shift-filter-date',
    'admin-log-filter-from',
    'admin-log-filter-to',
    'rpt-from-date',
    'rpt-to-date',
    'exp-date',
    'edit-exp-date'
  ]);

  const ALLOW_PAST_IDS = new Set([
    'filter-date',
    'timeline-date-picker',
    'waitlist-date-filter',
    'shift-filter-date',
    'admin-log-filter-from',
    'admin-log-filter-to',
    'rpt-from-date',
    'rpt-to-date',
    'exp-date',
    'edit-exp-date'
  ]);

  const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const nativeValueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

  function getTodayISO() {
    if (window.SanBongApp && typeof window.SanBongApp.getLocalTodayISO === 'function') {
      return window.SanBongApp.getLocalTodayISO();
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function isoToDate(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    return dt;
  }

  function dateToISO(dt) {
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }

  function isoToVN(iso) {
    const dt = isoToDate(iso);
    if (!dt) return '';
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  }

  function vnToISO(vnStr) {
    const clean = String(vnStr || '').trim();
    const m = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (!m) return null;
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const y = parseInt(m[3], 10);
    if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return null;
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return dateToISO(dt);
  }

  function getNearestWeekendISO(todayISO) {
    const dt = isoToDate(todayISO) || new Date();
    const day = dt.getDay(); // 0=Sun..6=Sat
    const addDays = day === 6 ? 0 : (day === 0 ? 6 : (6 - day));
    dt.setDate(dt.getDate() + addDays);
    return dateToISO(dt);
  }

  function addDaysISO(baseISO, delta) {
    const dt = isoToDate(baseISO) || new Date();
    dt.setDate(dt.getDate() + delta);
    return dateToISO(dt);
  }

  function injectStyles() {
    if (document.getElementById('vn-dp-styles')) return;
    const style = document.createElement('style');
    style.id = 'vn-dp-styles';
    style.textContent = `
      .vn-dp-wrap { position: relative; display: block; width: 100%; }
      .vn-dp-field { position: relative; display: flex; align-items: center; width: 100%; }
      .vn-dp-text {
        width: 100%; min-height: 44px; padding-right: 44px !important;
        font-variant-numeric: tabular-nums;
      }
      .vn-dp-btn {
        position: absolute; right: 0; top: 0; bottom: 0; width: 44px; min-height: 44px;
        display: inline-flex; align-items: center; justify-content: center;
        background: transparent; border: none; color: #475569; cursor: pointer;
        border-radius: 0 0.5rem 0.5rem 0;
      }
      .vn-dp-btn:hover { color: #15803D; background: #ECFDF3; }
      .vn-dp-btn:focus-visible, .vn-dp-text:focus-visible, .vn-dp-popover button:focus-visible {
        outline: 2px solid #16A34A; outline-offset: 2px;
      }
      .vn-dp-popover {
        position: absolute; left: 0; top: calc(100% + 6px); z-index: 9999;
        width: 296px; max-width: calc(100vw - 24px);
        background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 0.75rem;
        box-shadow: 0 14px 36px -8px rgba(15, 23, 42, 0.22);
        padding: 12px; color: #0F172A; font-family: inherit;
      }
      .vn-dp-popover.vn-dp-align-right { left: auto; right: 0; }
      .vn-dp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
      .vn-dp-nav-btn {
        width: 36px; height: 36px; min-width: 36px; min-height: 36px;
        border-radius: 0.5rem; border: 1px solid #E2E8F0; background: #F8FAFC;
        color: #0F172A; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
      }
      .vn-dp-nav-btn:hover { background: #ECFDF3; color: #15803D; border-color: #86EFAC; }
      .vn-dp-title { font-size: 13px; font-weight: 800; color: #0F172A; }
      .vn-dp-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; text-align: center; }
      .vn-dp-wk { font-size: 11px; font-weight: 700; color: #64748B; padding: 4px 0; }
      .vn-dp-day {
        min-height: 36px; border-radius: 0.5rem; border: 1px solid transparent;
        background: transparent; color: #0F172A; font-size: 12px; font-weight: 600;
        cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
        font-variant-numeric: tabular-nums;
      }
      .vn-dp-day:hover:not(:disabled) { background: #ECFDF3; color: #15803D; border-color: #86EFAC; }
      .vn-dp-day.is-today { border-color: #16A34A; color: #15803D; font-weight: 800; }
      .vn-dp-day.is-selected { background: #16A34A !important; color: #FFFFFF !important; font-weight: 800; }
      .vn-dp-day:disabled { color: #CBD5E1; cursor: not-allowed; text-decoration: line-through; }
      .vn-dp-quick { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #F1F5F9; }
      .vn-dp-quick-btn {
        min-height: 36px; padding: 4px 6px; border-radius: 0.5rem;
        border: 1px solid #BBF7D0; background: #ECFDF3; color: #15803D;
        font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap;
      }
      .vn-dp-quick-btn:hover:not(:disabled) { background: #16A34A; color: #FFFFFF; border-color: #16A34A; }
      .vn-dp-quick-btn:disabled { opacity: 0.45; cursor: not-allowed; }
      .vn-dp-error { font-size: 11px; font-weight: 600; color: #DC2626; margin-top: 4px; }
      @media (max-width: 640px) {
        .vn-dp-day, .vn-dp-quick-btn, .vn-dp-nav-btn { min-height: 44px; }
      }
    `;
    document.head.appendChild(style);
  }

  let activePopoverCloser = null;

  function enhanceDateInput(origInput) {
    if (!origInput || origInput.dataset.vnDatepickerInit === '1') return;
    if (origInput.type !== 'date') return;

    injectStyles();
    origInput.dataset.vnDatepickerInit = '1';

    const allowPast = ALLOW_PAST_IDS.has(origInput.id) || origInput.dataset.allowPast === '1';
    const getMinISO = () => origInput.getAttribute('min') || (allowPast ? '' : getTodayISO());
    const getMaxISO = () => origInput.getAttribute('max') || '';

    const wrap = document.createElement('div');
    wrap.className = 'vn-dp-wrap';
    // Preserve compact width if input is inline inside admin flex bar
    if (origInput.id === 'rpt-from-date' || origInput.id === 'rpt-to-date') {
      wrap.style.width = '148px';
      wrap.style.display = 'inline-block';
    }

    const field = document.createElement('div');
    field.className = 'vn-dp-field';

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.inputMode = 'numeric';
    textInput.autocomplete = 'off';
    textInput.placeholder = 'dd/mm/yyyy';
    textInput.maxLength = 10;
    textInput.className = (origInput.className || 'input-field') + ' vn-dp-text';
    textInput.id = origInput.id ? `${origInput.id}-vn` : '';
    const linkedLabel = origInput.id ? document.querySelector(`label[for="${origInput.id}"]`) : null;
    const ariaLabel = origInput.getAttribute('aria-label') || (linkedLabel ? linkedLabel.textContent.trim() : 'Chọn ngày (dd/mm/yyyy)');
    textInput.setAttribute('aria-label', `${ariaLabel} (định dạng dd/mm/yyyy)`);
    textInput.setAttribute('aria-haspopup', 'dialog');
    textInput.setAttribute('aria-expanded', 'false');

    const calBtn = document.createElement('button');
    calBtn.type = 'button';
    calBtn.className = 'vn-dp-btn';
    calBtn.setAttribute('aria-label', `Mở lịch chọn ${ariaLabel}`);
    calBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';

    const errEl = document.createElement('div');
    errEl.className = 'vn-dp-error hidden';
    errEl.setAttribute('role', 'alert');

    const popover = document.createElement('div');
    popover.className = 'vn-dp-popover hidden';
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-label', `Lịch chọn ${ariaLabel}`);

    origInput.parentNode.insertBefore(wrap, origInput);
    field.appendChild(textInput);
    field.appendChild(calBtn);
    wrap.appendChild(field);
    wrap.appendChild(errEl);
    wrap.appendChild(popover);
    wrap.appendChild(origInput);

    origInput.style.position = 'absolute';
    origInput.style.width = '1px';
    origInput.style.height = '1px';
    origInput.style.opacity = '0';
    origInput.style.pointerEvents = 'none';
    origInput.tabIndex = -1;
    origInput.setAttribute('aria-hidden', 'true');

    const getOrigVal = () => nativeValueDescriptor.get.call(origInput);
    const setOrigVal = (v) => nativeValueDescriptor.set.call(origInput, v);

    let viewYear = new Date().getFullYear();
    let viewMonth = new Date().getMonth();

    function showError(msg) {
      if (!msg) {
        errEl.textContent = '';
        errEl.classList.add('hidden');
        textInput.removeAttribute('aria-invalid');
        textInput.classList.remove('border-rose-500');
        return;
      }
      errEl.textContent = msg;
      errEl.classList.remove('hidden');
      textInput.setAttribute('aria-invalid', 'true');
      textInput.classList.add('border-rose-500');
      if (window.SanBongApp && typeof window.SanBongApp.showToast === 'function') {
        window.SanBongApp.showToast(msg, 'warning');
      }
    }

    function syncDisplayFromOrig() {
      const iso = getOrigVal();
      textInput.value = iso ? isoToVN(iso) : '';
      const dt = isoToDate(iso);
      if (dt) {
        viewYear = dt.getFullYear();
        viewMonth = dt.getMonth();
      }
    }

    Object.defineProperty(origInput, 'value', {
      configurable: true,
      get() {
        return getOrigVal();
      },
      set(v) {
        setOrigVal(v);
        syncDisplayFromOrig();
      }
    });

    function commitISO(iso, fireEvents) {
      const minISO = getMinISO();
      const maxISO = getMaxISO();
      if (iso) {
        if (minISO && iso < minISO) {
          showError(`Không thể chọn ngày trước ${isoToVN(minISO)}.`);
          return false;
        }
        if (maxISO && iso > maxISO) {
          showError(`Chỉ hỗ trợ chọn tối đa đến ${isoToVN(maxISO)}.`);
          return false;
        }
      }
      showError('');
      setOrigVal(iso);
      syncDisplayFromOrig();
      if (fireEvents) {
        origInput.dispatchEvent(new Event('input', { bubbles: true }));
        origInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return true;
    }

    function renderCalendar() {
      const todayISO = getTodayISO();
      const selectedISO = getOrigVal();
      const minISO = getMinISO();
      const maxISO = getMaxISO();

      const firstDay = new Date(viewYear, viewMonth, 1);
      const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

      let daysHtml = '';
      for (let i = 0; i < startOffset; i++) {
        daysHtml += '<span></span>';
      }
      for (let d = 1; d <= daysInMonth; d++) {
        const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const disabled = (minISO && iso < minISO) || (maxISO && iso > maxISO);
        const cls = [
          'vn-dp-day',
          iso === todayISO ? 'is-today' : '',
          iso === selectedISO ? 'is-selected' : ''
        ].filter(Boolean).join(' ');
        daysHtml += `<button type="button" class="${cls}" data-iso="${iso}" ${disabled ? 'disabled aria-disabled="true"' : ''} aria-label="Ngày ${d} tháng ${viewMonth + 1} năm ${viewYear}">${d}</button>`;
      }

      const tomorrowISO = addDaysISO(todayISO, 1);
      const weekendISO = getNearestWeekendISO(todayISO);
      const isDis = (iso) => Boolean((minISO && iso < minISO) || (maxISO && iso > maxISO));

      popover.innerHTML = `
        <div class="vn-dp-header">
          <button type="button" class="vn-dp-nav-btn" data-nav="-1" aria-label="Tháng trước">‹</button>
          <span class="vn-dp-title">Tháng ${String(viewMonth + 1).padStart(2, '0')} / ${viewYear}</span>
          <button type="button" class="vn-dp-nav-btn" data-nav="1" aria-label="Tháng sau">›</button>
        </div>
        <div class="vn-dp-grid">
          ${WEEKDAYS.map(w => `<div class="vn-dp-wk">${w}</div>`).join('')}
          ${daysHtml}
        </div>
        <div class="vn-dp-quick">
          <button type="button" class="vn-dp-quick-btn" data-iso="${todayISO}" ${isDis(todayISO) ? 'disabled' : ''}>Hôm nay</button>
          <button type="button" class="vn-dp-quick-btn" data-iso="${tomorrowISO}" ${isDis(tomorrowISO) ? 'disabled' : ''}>Ngày mai</button>
          <button type="button" class="vn-dp-quick-btn" data-iso="${weekendISO}" ${isDis(weekendISO) ? 'disabled' : ''}>Cuối tuần</button>
        </div>
      `;
    }

    function closePopover(returnFocus) {
      popover.classList.add('hidden');
      textInput.setAttribute('aria-expanded', 'false');
      if (activePopoverCloser === closePopover) activePopoverCloser = null;
      if (returnFocus) textInput.focus();
    }

    function openPopover() {
      if (activePopoverCloser && activePopoverCloser !== closePopover) {
        activePopoverCloser(false);
      }
      const dt = isoToDate(getOrigVal()) || isoToDate(getTodayISO()) || new Date();
      viewYear = dt.getFullYear();
      viewMonth = dt.getMonth();
      renderCalendar();
      popover.classList.remove('hidden');
      popover.classList.remove('vn-dp-align-right');
      const rect = popover.getBoundingClientRect();
      if (rect.right > window.innerWidth - 8) {
        popover.classList.add('vn-dp-align-right');
      }
      textInput.setAttribute('aria-expanded', 'true');
      activePopoverCloser = closePopover;
    }

    popover.addEventListener('click', (e) => {
      const navBtn = e.target.closest('[data-nav]');
      if (navBtn) {
        const delta = parseInt(navBtn.getAttribute('data-nav'), 10);
        viewMonth += delta;
        if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
        if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
        renderCalendar();
        return;
      }
      const dayBtn = e.target.closest('[data-iso]');
      if (dayBtn && !dayBtn.disabled) {
        const iso = dayBtn.getAttribute('data-iso');
        if (commitISO(iso, true)) {
          closePopover(true);
        }
      }
    });

    calBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (popover.classList.contains('hidden')) openPopover();
      else closePopover(false);
    });

    textInput.addEventListener('click', () => {
      if (popover.classList.contains('hidden')) openPopover();
    });

    function parseManualInput() {
      const raw = textInput.value.trim();
      if (!raw) {
        if (allowPast) {
          commitISO('', true);
          return true;
        }
        showError('Vui lòng nhập ngày hợp lệ theo định dạng dd/mm/yyyy.');
        return false;
      }
      const iso = vnToISO(raw);
      if (!iso) {
        showError('Ngày không hợp lệ. Vui lòng nhập đúng định dạng dd/mm/yyyy (VD: 21/11/2026).');
        return false;
      }
      return commitISO(iso, true);
    }

    textInput.addEventListener('input', () => {
      const raw = textInput.value.trim();
      if (raw.length === 10) {
        const iso = vnToISO(raw);
        if (!iso) {
          showError('Ngày không hợp lệ. Vui lòng nhập đúng định dạng dd/mm/yyyy (VD: 21/11/2026).');
        } else {
          showError('');
        }
      } else {
        showError('');
      }
    });

    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePopover(true);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (parseManualInput()) closePopover(false);
      }
    });

    const parentForm = wrap.closest('form');
    if (parentForm) {
      parentForm.addEventListener('submit', (e) => {
        if (!parseManualInput()) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      }, true);
    }

    popover.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePopover(true);
      }
    });

    textInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (!popover.contains(document.activeElement)) {
          parseManualInput();
          if (!wrap.contains(document.activeElement)) {
            closePopover(false);
          }
        }
      }, 120);
    });

    document.addEventListener('click', (e) => {
      if (!popover.classList.contains('hidden') && !wrap.contains(e.target)) {
        closePopover(false);
      }
    });

    if (!window._vnDpEscBound) {
      window._vnDpEscBound = true;
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && activePopoverCloser) {
          e.preventDefault();
          activePopoverCloser(true);
        }
      });
    }

    syncDisplayFromOrig();
    // Re-sync shortly after DOM init in case page JS sets initial value asynchronously
    setTimeout(syncDisplayFromOrig, 60);
    setTimeout(syncDisplayFromOrig, 300);
  }

  function initAll(root) {
    const scope = root || document;
    const inputs = scope.querySelectorAll('input[type="date"]');
    inputs.forEach((inp) => {
      if (TARGET_IDS.has(inp.id) || inp.dataset.vnDatepicker === '1') {
        enhanceDateInput(inp);
      }
    });
  }

  window.SanBongDatePicker = {
    init: initAll,
    enhance: enhanceDateInput,
    isoToVN,
    vnToISO
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAll(document));
  } else {
    initAll(document);
  }
})();

;
/* === app.js === */
/* Local QR Code Generator (qrcode-generator v1.4.4, self-hosted) */
var qrcode=function(){var t=function(t,r){var e=t,n=g[r],o=null,i=0,a=null,u=[],f={},c=function(t,r){o=function(t){for(var r=new Array(t),e=0;e<t;e+=1){r[e]=new Array(t);for(var n=0;n<t;n+=1)r[e][n]=null}return r}(i=4*e+17),l(0,0),l(i-7,0),l(0,i-7),s(),h(),d(t,r),e>=7&&v(t),null==a&&(a=p(e,n,u)),w(a,r)},l=function(t,r){for(var e=-1;e<=7;e+=1)if(!(t+e<=-1||i<=t+e))for(var n=-1;n<=7;n+=1)r+n<=-1||i<=r+n||(o[t+e][r+n]=0<=e&&e<=6&&(0==n||6==n)||0<=n&&n<=6&&(0==e||6==e)||2<=e&&e<=4&&2<=n&&n<=4)},h=function(){for(var t=8;t<i-8;t+=1)null==o[t][6]&&(o[t][6]=t%2==0);for(var r=8;r<i-8;r+=1)null==o[6][r]&&(o[6][r]=r%2==0)},s=function(){for(var t=B.getPatternPosition(e),r=0;r<t.length;r+=1)for(var n=0;n<t.length;n+=1){var i=t[r],a=t[n];if(null==o[i][a])for(var u=-2;u<=2;u+=1)for(var f=-2;f<=2;f+=1)o[i+u][a+f]=-2==u||2==u||-2==f||2==f||0==u&&0==f}},v=function(t){for(var r=B.getBCHTypeNumber(e),n=0;n<18;n+=1){var a=!t&&1==(r>>n&1);o[Math.floor(n/3)][n%3+i-8-3]=a}for(n=0;n<18;n+=1){a=!t&&1==(r>>n&1);o[n%3+i-8-3][Math.floor(n/3)]=a}},d=function(t,r){for(var e=n<<3|r,a=B.getBCHTypeInfo(e),u=0;u<15;u+=1){var f=!t&&1==(a>>u&1);u<6?o[u][8]=f:u<8?o[u+1][8]=f:o[i-15+u][8]=f}for(u=0;u<15;u+=1){f=!t&&1==(a>>u&1);u<8?o[8][i-u-1]=f:u<9?o[8][15-u-1+1]=f:o[8][15-u-1]=f}o[i-8][8]=!t},w=function(t,r){for(var e=-1,n=i-1,a=7,u=0,f=B.getMaskFunction(r),c=i-1;c>0;c-=2)for(6==c&&(c-=1);;){for(var g=0;g<2;g+=1)if(null==o[n][c-g]){var l=!1;u<t.length&&(l=1==(t[u]>>>a&1)),f(n,c-g)&&(l=!l),o[n][c-g]=l,-1==(a-=1)&&(u+=1,a=7)}if((n+=e)<0||i<=n){n-=e,e=-e;break}}},p=function(t,r,e){for(var n=A.getRSBlocks(t,r),o=b(),i=0;i<e.length;i+=1){var a=e[i];o.put(a.getMode(),4),o.put(a.getLength(),B.getLengthInBits(a.getMode(),t)),a.write(o)}var u=0;for(i=0;i<n.length;i+=1)u+=n[i].dataCount;if(o.getLengthInBits()>8*u)throw"code length overflow. ("+o.getLengthInBits()+">"+8*u+")";for(o.getLengthInBits()+4<=8*u&&o.put(0,4);o.getLengthInBits()%8!=0;)o.putBit(!1);for(;!(o.getLengthInBits()>=8*u||(o.put(236,8),o.getLengthInBits()>=8*u));)o.put(17,8);return function(t,r){for(var e=0,n=0,o=0,i=new Array(r.length),a=new Array(r.length),u=0;u<r.length;u+=1){var f=r[u].dataCount,c=r[u].totalCount-f;n=Math.max(n,f),o=Math.max(o,c),i[u]=new Array(f);for(var g=0;g<i[u].length;g+=1)i[u][g]=255&t.getBuffer()[g+e];e+=f;var l=B.getErrorCorrectPolynomial(c),h=k(i[u],l.getLength()-1).mod(l);for(a[u]=new Array(l.getLength()-1),g=0;g<a[u].length;g+=1){var s=g+h.getLength()-a[u].length;a[u][g]=s>=0?h.getAt(s):0}}var v=0;for(g=0;g<r.length;g+=1)v+=r[g].totalCount;var d=new Array(v),w=0;for(g=0;g<n;g+=1)for(u=0;u<r.length;u+=1)g<i[u].length&&(d[w]=i[u][g],w+=1);for(g=0;g<o;g+=1)for(u=0;u<r.length;u+=1)g<a[u].length&&(d[w]=a[u][g],w+=1);return d}(o,n)};f.addData=function(t,r){var e=null;switch(r=r||"Byte"){case"Numeric":e=M(t);break;case"Alphanumeric":e=x(t);break;case"Byte":e=m(t);break;case"Kanji":e=L(t);break;default:throw"mode:"+r}u.push(e),a=null},f.isDark=function(t,r){if(t<0||i<=t||r<0||i<=r)throw t+","+r;return o[t][r]},f.getModuleCount=function(){return i},f.make=function(){if(e<1){for(var t=1;t<40;t++){for(var r=A.getRSBlocks(t,n),o=b(),i=0;i<u.length;i++){var a=u[i];o.put(a.getMode(),4),o.put(a.getLength(),B.getLengthInBits(a.getMode(),t)),a.write(o)}var g=0;for(i=0;i<r.length;i++)g+=r[i].dataCount;if(o.getLengthInBits()<=8*g)break}e=t}c(!1,function(){for(var t=0,r=0,e=0;e<8;e+=1){c(!0,e);var n=B.getLostPoint(f);(0==e||t>n)&&(t=n,r=e)}return r}())},f.createTableTag=function(t,r){t=t||2;var e="";e+='<table style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: "+(r=void 0===r?4*t:r)+"px;",e+='">',e+="<tbody>";for(var n=0;n<f.getModuleCount();n+=1){e+="<tr>";for(var o=0;o<f.getModuleCount();o+=1)e+='<td style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: 0px;",e+=" width: "+t+"px;",e+=" height: "+t+"px;",e+=" background-color: ",e+=f.isDark(n,o)?"#000000":"#ffffff",e+=";",e+='"/>';e+="</tr>"}return e+="</tbody>",e+="</table>"},f.createSvgTag=function(t,r,e,n){var o={};"object"==typeof arguments[0]&&(t=(o=arguments[0]).cellSize,r=o.margin,e=o.alt,n=o.title),t=t||2,r=void 0===r?4*t:r,(e="string"==typeof e?{text:e}:e||{}).text=e.text||null,e.id=e.text?e.id||"qrcode-description":null,(n="string"==typeof n?{text:n}:n||{}).text=n.text||null,n.id=n.text?n.id||"qrcode-title":null;var i,a,u,c,g=f.getModuleCount()*t+2*r,l="";for(c="l"+t+",0 0,"+t+" -"+t+",0 0,-"+t+"z ",l+='<svg version="1.1" xmlns="http://www.w3.org/2000/svg"',l+=o.scalable?"":' width="'+g+'px" height="'+g+'px"',l+=' viewBox="0 0 '+g+" "+g+'" ',l+=' preserveAspectRatio="xMinYMin meet"',l+=n.text||e.text?' role="img" aria-labelledby="'+y([n.id,e.id].join(" ").trim())+'"':"",l+=">",l+=n.text?'<title id="'+y(n.id)+'">'+y(n.text)+"</title>":"",l+=e.text?'<description id="'+y(e.id)+'">'+y(e.text)+"</description>":"",l+='<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>',l+='<path d="',a=0;a<f.getModuleCount();a+=1)for(u=a*t+r,i=0;i<f.getModuleCount();i+=1)f.isDark(a,i)&&(l+="M"+(i*t+r)+","+u+c);return l+='" stroke="transparent" fill="black"/>',l+="</svg>"},f.createDataURL=function(t,r){t=t||2,r=void 0===r?4*t:r;var e=f.getModuleCount()*t+2*r,n=r,o=e-r;return I(e,e,(function(r,e){if(n<=r&&r<o&&n<=e&&e<o){var i=Math.floor((r-n)/t),a=Math.floor((e-n)/t);return f.isDark(a,i)?0:1}return 1}))},f.createImgTag=function(t,r,e){t=t||2,r=void 0===r?4*t:r;var n=f.getModuleCount()*t+2*r,o="";return o+="<img",o+=' src="',o+=f.createDataURL(t,r),o+='"',o+=' width="',o+=n,o+='"',o+=' height="',o+=n,o+='"',e&&(o+=' alt="',o+=y(e),o+='"'),o+="/>"};var y=function(t){for(var r="",e=0;e<t.length;e+=1){var n=t.charAt(e);switch(n){case"<":r+="&lt;";break;case">":r+="&gt;";break;case"&":r+="&amp;";break;case'"':r+="&quot;";break;default:r+=n}}return r};return f.createASCII=function(t,r){if((t=t||1)<2)return function(t){t=void 0===t?2:t;var r,e,n,o,i,a=1*f.getModuleCount()+2*t,u=t,c=a-t,g={"██":"█","█ ":"▀"," █":"▄","  ":" "},l={"██":"▀","█ ":"▀"," █":" ","  ":" "},h="";for(r=0;r<a;r+=2){for(n=Math.floor((r-u)/1),o=Math.floor((r+1-u)/1),e=0;e<a;e+=1)i="█",u<=e&&e<c&&u<=r&&r<c&&f.isDark(n,Math.floor((e-u)/1))&&(i=" "),u<=e&&e<c&&u<=r+1&&r+1<c&&f.isDark(o,Math.floor((e-u)/1))?i+=" ":i+="█",h+=t<1&&r+1>=c?l[i]:g[i];h+="\n"}return a%2&&t>0?h.substring(0,h.length-a-1)+Array(a+1).join("▀"):h.substring(0,h.length-1)}(r);t-=1,r=void 0===r?2*t:r;var e,n,o,i,a=f.getModuleCount()*t+2*r,u=r,c=a-r,g=Array(t+1).join("██"),l=Array(t+1).join("  "),h="",s="";for(e=0;e<a;e+=1){for(o=Math.floor((e-u)/t),s="",n=0;n<a;n+=1)i=1,u<=n&&n<c&&u<=e&&e<c&&f.isDark(o,Math.floor((n-u)/t))&&(i=0),s+=i?g:l;for(o=0;o<t;o+=1)h+=s+"\n"}return h.substring(0,h.length-1)},f.renderTo2dContext=function(t,r){r=r||2;for(var e=f.getModuleCount(),n=0;n<e;n++)for(var o=0;o<e;o++)t.fillStyle=f.isDark(n,o)?"black":"white",t.fillRect(n*r,o*r,r,r)},f};t.stringToBytes=(t.stringToBytesFuncs={default:function(t){for(var r=[],e=0;e<t.length;e+=1){var n=t.charCodeAt(e);r.push(255&n)}return r}}).default,t.createStringToBytes=function(t,r){var e=function(){for(var e=S(t),n=function(){var t=e.read();if(-1==t)throw"eof";return t},o=0,i={};;){var a=e.read();if(-1==a)break;var u=n(),f=n()<<8|n();i[String.fromCharCode(a<<8|u)]=f,o+=1}if(o!=r)throw o+" != "+r;return i}(),n="?".charCodeAt(0);return function(t){for(var r=[],o=0;o<t.length;o+=1){var i=t.charCodeAt(o);if(i<128)r.push(i);else{var a=e[t.charAt(o)];"number"==typeof a?(255&a)==a?r.push(a):(r.push(a>>>8),r.push(255&a)):r.push(n)}}return r}};var r,e,n,o,i,a=1,u=2,f=4,c=8,g={L:1,M:0,Q:3,H:2},l=0,h=1,s=2,v=3,d=4,w=5,p=6,y=7,B=(r=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],e=1335,n=7973,i=function(t){for(var r=0;0!=t;)r+=1,t>>>=1;return r},(o={}).getBCHTypeInfo=function(t){for(var r=t<<10;i(r)-i(e)>=0;)r^=e<<i(r)-i(e);return 21522^(t<<10|r)},o.getBCHTypeNumber=function(t){for(var r=t<<12;i(r)-i(n)>=0;)r^=n<<i(r)-i(n);return t<<12|r},o.getPatternPosition=function(t){return r[t-1]},o.getMaskFunction=function(t){switch(t){case l:return function(t,r){return(t+r)%2==0};case h:return function(t,r){return t%2==0};case s:return function(t,r){return r%3==0};case v:return function(t,r){return(t+r)%3==0};case d:return function(t,r){return(Math.floor(t/2)+Math.floor(r/3))%2==0};case w:return function(t,r){return t*r%2+t*r%3==0};case p:return function(t,r){return(t*r%2+t*r%3)%2==0};case y:return function(t,r){return(t*r%3+(t+r)%2)%2==0};default:throw"bad maskPattern:"+t}},o.getErrorCorrectPolynomial=function(t){for(var r=k([1],0),e=0;e<t;e+=1)r=r.multiply(k([1,C.gexp(e)],0));return r},o.getLengthInBits=function(t,r){if(1<=r&&r<10)switch(t){case a:return 10;case u:return 9;case f:case c:return 8;default:throw"mode:"+t}else if(r<27)switch(t){case a:return 12;case u:return 11;case f:return 16;case c:return 10;default:throw"mode:"+t}else{if(!(r<41))throw"type:"+r;switch(t){case a:return 14;case u:return 13;case f:return 16;case c:return 12;default:throw"mode:"+t}}},o.getLostPoint=function(t){for(var r=t.getModuleCount(),e=0,n=0;n<r;n+=1)for(var o=0;o<r;o+=1){for(var i=0,a=t.isDark(n,o),u=-1;u<=1;u+=1)if(!(n+u<0||r<=n+u))for(var f=-1;f<=1;f+=1)o+f<0||r<=o+f||0==u&&0==f||a==t.isDark(n+u,o+f)&&(i+=1);i>5&&(e+=3+i-5)}for(n=0;n<r-1;n+=1)for(o=0;o<r-1;o+=1){var c=0;t.isDark(n,o)&&(c+=1),t.isDark(n+1,o)&&(c+=1),t.isDark(n,o+1)&&(c+=1),t.isDark(n+1,o+1)&&(c+=1),0!=c&&4!=c||(e+=3)}for(n=0;n<r;n+=1)for(o=0;o<r-6;o+=1)t.isDark(n,o)&&!t.isDark(n,o+1)&&t.isDark(n,o+2)&&t.isDark(n,o+3)&&t.isDark(n,o+4)&&!t.isDark(n,o+5)&&t.isDark(n,o+6)&&(e+=40);for(o=0;o<r;o+=1)for(n=0;n<r-6;n+=1)t.isDark(n,o)&&!t.isDark(n+1,o)&&t.isDark(n+2,o)&&t.isDark(n+3,o)&&t.isDark(n+4,o)&&!t.isDark(n+5,o)&&t.isDark(n+6,o)&&(e+=40);var g=0;for(o=0;o<r;o+=1)for(n=0;n<r;n+=1)t.isDark(n,o)&&(g+=1);return e+=Math.abs(100*g/r/r-50)/5*10},o),C=function(){for(var t=new Array(256),r=new Array(256),e=0;e<8;e+=1)t[e]=1<<e;for(e=8;e<256;e+=1)t[e]=t[e-4]^t[e-5]^t[e-6]^t[e-8];for(e=0;e<255;e+=1)r[t[e]]=e;var n={glog:function(t){if(t<1)throw"glog("+t+")";return r[t]},gexp:function(r){for(;r<0;)r+=255;for(;r>=256;)r-=255;return t[r]}};return n}();function k(t,r){if(void 0===t.length)throw t.length+"/"+r;var e=function(){for(var e=0;e<t.length&&0==t[e];)e+=1;for(var n=new Array(t.length-e+r),o=0;o<t.length-e;o+=1)n[o]=t[o+e];return n}(),n={getAt:function(t){return e[t]},getLength:function(){return e.length},multiply:function(t){for(var r=new Array(n.getLength()+t.getLength()-1),e=0;e<n.getLength();e+=1)for(var o=0;o<t.getLength();o+=1)r[e+o]^=C.gexp(C.glog(n.getAt(e))+C.glog(t.getAt(o)));return k(r,0)},mod:function(t){if(n.getLength()-t.getLength()<0)return n;for(var r=C.glog(n.getAt(0))-C.glog(t.getAt(0)),e=new Array(n.getLength()),o=0;o<n.getLength();o+=1)e[o]=n.getAt(o);for(o=0;o<t.getLength();o+=1)e[o]^=C.gexp(C.glog(t.getAt(o))+r);return k(e,0).mod(t)}};return n}var A=function(){var t=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],r=function(t,r){var e={};return e.totalCount=t,e.dataCount=r,e},e={};return e.getRSBlocks=function(e,n){var o=function(r,e){switch(e){case g.L:return t[4*(r-1)+0];case g.M:return t[4*(r-1)+1];case g.Q:return t[4*(r-1)+2];case g.H:return t[4*(r-1)+3];default:return}}(e,n);if(void 0===o)throw"bad rs block @ typeNumber:"+e+"/errorCorrectionLevel:"+n;for(var i=o.length/3,a=[],u=0;u<i;u+=1)for(var f=o[3*u+0],c=o[3*u+1],l=o[3*u+2],h=0;h<f;h+=1)a.push(r(c,l));return a},e}(),b=function(){var t=[],r=0,e={getBuffer:function(){return t},getAt:function(r){var e=Math.floor(r/8);return 1==(t[e]>>>7-r%8&1)},put:function(t,r){for(var n=0;n<r;n+=1)e.putBit(1==(t>>>r-n-1&1))},getLengthInBits:function(){return r},putBit:function(e){var n=Math.floor(r/8);t.length<=n&&t.push(0),e&&(t[n]|=128>>>r%8),r+=1}};return e},M=function(t){var r=a,e=t,n={getMode:function(){return r},getLength:function(t){return e.length},write:function(t){for(var r=e,n=0;n+2<r.length;)t.put(o(r.substring(n,n+3)),10),n+=3;n<r.length&&(r.length-n==1?t.put(o(r.substring(n,n+1)),4):r.length-n==2&&t.put(o(r.substring(n,n+2)),7))}},o=function(t){for(var r=0,e=0;e<t.length;e+=1)r=10*r+i(t.charAt(e));return r},i=function(t){if("0"<=t&&t<="9")return t.charCodeAt(0)-"0".charCodeAt(0);throw"illegal char :"+t};return n},x=function(t){var r=u,e=t,n={getMode:function(){return r},getLength:function(t){return e.length},write:function(t){for(var r=e,n=0;n+1<r.length;)t.put(45*o(r.charAt(n))+o(r.charAt(n+1)),11),n+=2;n<r.length&&t.put(o(r.charAt(n)),6)}},o=function(t){if("0"<=t&&t<="9")return t.charCodeAt(0)-"0".charCodeAt(0);if("A"<=t&&t<="Z")return t.charCodeAt(0)-"A".charCodeAt(0)+10;switch(t){case" ":return 36;case"$":return 37;case"%":return 38;case"*":return 39;case"+":return 40;case"-":return 41;case".":return 42;case"/":return 43;case":":return 44;default:throw"illegal char :"+t}};return n},m=function(r){var e=f,n=t.stringToBytes(r),o={getMode:function(){return e},getLength:function(t){return n.length},write:function(t){for(var r=0;r<n.length;r+=1)t.put(n[r],8)}};return o},L=function(r){var e=c,n=t.stringToBytesFuncs.SJIS;if(!n)throw"sjis not supported.";!function(){var t=n("友");if(2!=t.length||38726!=(t[0]<<8|t[1]))throw"sjis not supported."}();var o=n(r),i={getMode:function(){return e},getLength:function(t){return~~(o.length/2)},write:function(t){for(var r=o,e=0;e+1<r.length;){var n=(255&r[e])<<8|255&r[e+1];if(33088<=n&&n<=40956)n-=33088;else{if(!(57408<=n&&n<=60351))throw"illegal char at "+(e+1)+"/"+n;n-=49472}n=192*(n>>>8&255)+(255&n),t.put(n,13),e+=2}if(e<r.length)throw"illegal char at "+(e+1)}};return i},D=function(){var t=[],r={writeByte:function(r){t.push(255&r)},writeShort:function(t){r.writeByte(t),r.writeByte(t>>>8)},writeBytes:function(t,e,n){e=e||0,n=n||t.length;for(var o=0;o<n;o+=1)r.writeByte(t[o+e])},writeString:function(t){for(var e=0;e<t.length;e+=1)r.writeByte(t.charCodeAt(e))},toByteArray:function(){return t},toString:function(){var r="";r+="[";for(var e=0;e<t.length;e+=1)e>0&&(r+=","),r+=t[e];return r+="]"}};return r},S=function(t){var r=t,e=0,n=0,o=0,i={read:function(){for(;o<8;){if(e>=r.length){if(0==o)return-1;throw"unexpected end of file./"+o}var t=r.charAt(e);if(e+=1,"="==t)return o=0,-1;t.match(/^\s$/)||(n=n<<6|a(t.charCodeAt(0)),o+=6)}var i=n>>>o-8&255;return o-=8,i}},a=function(t){if(65<=t&&t<=90)return t-65;if(97<=t&&t<=122)return t-97+26;if(48<=t&&t<=57)return t-48+52;if(43==t)return 62;if(47==t)return 63;throw"c:"+t};return i},I=function(t,r,e){for(var n=function(t,r){var e=t,n=r,o=new Array(t*r),i={setPixel:function(t,r,n){o[r*e+t]=n},write:function(t){t.writeString("GIF87a"),t.writeShort(e),t.writeShort(n),t.writeByte(128),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(255),t.writeByte(255),t.writeByte(255),t.writeString(","),t.writeShort(0),t.writeShort(0),t.writeShort(e),t.writeShort(n),t.writeByte(0);var r=a(2);t.writeByte(2);for(var o=0;r.length-o>255;)t.writeByte(255),t.writeBytes(r,o,255),o+=255;t.writeByte(r.length-o),t.writeBytes(r,o,r.length-o),t.writeByte(0),t.writeString(";")}},a=function(t){for(var r=1<<t,e=1+(1<<t),n=t+1,i=u(),a=0;a<r;a+=1)i.add(String.fromCharCode(a));i.add(String.fromCharCode(r)),i.add(String.fromCharCode(e));var f,c,g,l=D(),h=(f=l,c=0,g=0,{write:function(t,r){if(t>>>r!=0)throw"length over";for(;c+r>=8;)f.writeByte(255&(t<<c|g)),r-=8-c,t>>>=8-c,g=0,c=0;g|=t<<c,c+=r},flush:function(){c>0&&f.writeByte(g)}});h.write(r,n);var s=0,v=String.fromCharCode(o[s]);for(s+=1;s<o.length;){var d=String.fromCharCode(o[s]);s+=1,i.contains(v+d)?v+=d:(h.write(i.indexOf(v),n),i.size()<4095&&(i.size()==1<<n&&(n+=1),i.add(v+d)),v=d)}return h.write(i.indexOf(v),n),h.write(e,n),h.flush(),l.toByteArray()},u=function(){var t={},r=0,e={add:function(n){if(e.contains(n))throw"dup key:"+n;t[n]=r,r+=1},size:function(){return r},indexOf:function(r){return t[r]},contains:function(r){return void 0!==t[r]}};return e};return i}(t,r),o=0;o<r;o+=1)for(var i=0;i<t;i+=1)n.setPixel(i,o,e(i,o));var a=D();n.write(a);for(var u=function(){var t=0,r=0,e=0,n="",o={},i=function(t){n+=String.fromCharCode(a(63&t))},a=function(t){if(t<0);else{if(t<26)return 65+t;if(t<52)return t-26+97;if(t<62)return t-52+48;if(62==t)return 43;if(63==t)return 47}throw"n:"+t};return o.writeByte=function(n){for(t=t<<8|255&n,r+=8,e+=1;r>=6;)i(t>>>r-6),r-=6},o.flush=function(){if(r>0&&(i(t<<6-r),t=0,r=0),e%3!=0)for(var o=3-e%3,a=0;a<o;a+=1)n+="="},o.toString=function(){return n},o}(),f=a.toByteArray(),c=0;c<f.length;c+=1)u.writeByte(f[c]);return u.flush(),"data:image/gif;base64,"+u};return t}();qrcode.stringToBytesFuncs["UTF-8"]=function(t){return function(t){for(var r=[],e=0;e<t.length;e++){var n=t.charCodeAt(e);n<128?r.push(n):n<2048?r.push(192|n>>6,128|63&n):n<55296||n>=57344?r.push(224|n>>12,128|n>>6&63,128|63&n):(e++,n=65536+((1023&n)<<10|1023&t.charCodeAt(e)),r.push(240|n>>18,128|n>>12&63,128|n>>6&63,128|63&n))}return r}(t)},function(t){"function"==typeof define&&define.amd?define([],t):"object"==typeof exports&&(module.exports=t())}((function(){return qrcode}));
;
(function () {
  'use strict';

  const helpers = window.SanBongHelpers || {};
  const db = window.SanBongDB || {};
  const ui = window.SanBongUI || {};

  window.SanBongApp = Object.assign(window.SanBongApp || {}, {
    escapeHTML: helpers.escapeHTML || (s => s),
    formatVND: helpers.formatVND || (n => Number(n).toLocaleString('vi-VN') + 'đ'),
    formatDateVN: helpers.formatDateVN || (d => d),
    getLocalTodayISO: helpers.getLocalTodayISO || (() => {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }),
    getCsrfToken: helpers.getCsrfToken || (() => ''),
    setCsrfToken: helpers.setCsrfToken || (() => {}),
    clearCsrfToken: helpers.clearCsrfToken || (() => {}),
    ensureCsrfToken: helpers.ensureCsrfToken || (() => Promise.resolve('')),
    secureFetch: helpers.secureFetch || fetch,
    getAuthFetchHeaders: helpers.getAuthFetchHeaders || ((extra) => Object.assign({ 'Content-Type': 'application/json' }, extra || {})),
    getAppBase: helpers.getAppBase || (() => ''),
    getRelativePath: helpers.getRelativePath || (p => p),
    Icons: helpers.Icons || {},
    renderPitchSVG: helpers.renderPitchSVG || (() => ''),
    statusPill: helpers.statusPill || (s => '<span>' + s + '</span>'),
    getVietQRUrl: helpers.getVietQRUrl || (() => ''),
    renderQRCodeSVG: helpers.renderQRCodeSVG || (() => ''),
    downloadTicketQR: helpers.downloadTicketQR || (() => {}),
    playScanBeep: helpers.playScanBeep || (() => {}),
    SanBongDB: db,
    renderNavbar: ui.renderNavbar || (() => ''),
    renderFooter: ui.renderFooter || (() => ''),
    handleLogout: ui.handleLogout || (() => {}),
    showToast: ui.showToast || ((m) => console.log(m)),
    showModal: ui.showModal || ((cfg) => { if (confirm(cfg.message || cfg.title)) cfg.onConfirm && cfg.onConfirm(); }),
    syncAuthMe: ui.syncAuthMe || (typeof syncAuthMe !== 'undefined' ? syncAuthMe : (() => Promise.resolve(null))),
    handleUnauthorizedSession: ui.handleUnauthorizedSession || (typeof handleUnauthorizedSession !== 'undefined' ? handleUnauthorizedSession : ((route) => {
      try { sessionStorage.removeItem('sb_current_user'); sessionStorage.removeItem('sb_csrf_token'); localStorage.removeItem('sb_current_user'); } catch (e) {}
      window.location.replace(`login?redirect=${encodeURIComponent(route || 'history')}&expired=1`);
    }))
  });

  function renderShellNavbar() {
    const currentUI = window.SanBongUI || ui;
    const navPlaceholder = document.getElementById('app-navbar');
    if (navPlaceholder && currentUI.renderNavbar) {
      const activePage = navPlaceholder.dataset ? navPlaceholder.dataset.activePage : navPlaceholder.getAttribute?.('data-active-page');
      navPlaceholder.innerHTML = activePage
        ? currentUI.renderNavbar(activePage)
        : currentUI.renderNavbar();
    }

    if (!window._sbUserMenuBound && typeof document !== 'undefined') {
      window._sbUserMenuBound = true;
      document.addEventListener('click', function (e) {
        const btn = e.target.closest('#user-menu-btn');
        const container = e.target.closest('#user-menu-container');
        const menu = document.getElementById('user-dropdown-menu');
        if (!menu) return;

        if (btn) {
          e.preventDefault();
          const isOpen = menu.classList.toggle('!block');
          btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        } else if (!container) {
          menu.classList.remove('!block');
          const boundBtn = document.getElementById('user-menu-btn');
          if (boundBtn) boundBtn.setAttribute('aria-expanded', 'false');
        }
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          const menu = document.getElementById('user-dropdown-menu');
          if (menu) {
            menu.classList.remove('!block');
            const btn = document.getElementById('user-menu-btn');
            if (btn) btn.setAttribute('aria-expanded', 'false');
          }
        }
      });
    }
  }

  function renderShellFooter() {
    const currentUI = window.SanBongUI || ui;
    const footerPlaceholder = document.getElementById('app-footer');
    if (footerPlaceholder && currentUI.renderFooter) {
      footerPlaceholder.innerHTML = currentUI.renderFooter();
    }
  }

  function initAppShell() {
    if (window.SanBongDB && typeof window.SanBongDB.init === 'function') {
      window.SanBongDB.init();
    }

    renderShellNavbar();
    renderShellFooter();

    if (!window._sbNavSyncBound && typeof window.addEventListener === 'function') {
      window._sbNavSyncBound = true;
      window.addEventListener('sb-data-synced', function () {
        renderShellNavbar();
        renderShellFooter();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAppShell);
  } else {
    initAppShell();
  }
})();

;
/* === api.js === */

window.SanBongApp = window.SanBongApp || {};

window.SanBongApp.SanBongAPI = {
  async fetchInitialData() {
    try {
      const isAdminPortal = Boolean(typeof window !== 'undefined' && window.location && String(window.location.pathname || '').includes('portal-admin'));
      const apiUrl = window.SanBongApp.getRelativePath(isAdminPortal ? 'api/pitches.php?all=1&include_hidden=1' : 'api/pitches.php?all=1');
      const response = await fetch(apiUrl);
      if (response.ok) {
        const jsonRes = await response.json();
        if (jsonRes?.csrf_token && window.SanBongHelpers?.setCsrfToken) {
          window.SanBongHelpers.setCsrfToken(jsonRes.csrf_token);
        }
        if (jsonRes.success && jsonRes.data && jsonRes.data.pitches) {
          if (window.SanBongApp?.SanBongDB?.syncFromServer) {
            try {
              localStorage.setItem('sb_pitches_v2', JSON.stringify(jsonRes.data.pitches));
              if (Array.isArray(jsonRes.data.vouchers)) {
                localStorage.setItem('sb_vouchers_v1', JSON.stringify(jsonRes.data.vouchers));
              }
              if (Array.isArray(jsonRes.data.goldenHourRules)) {
                localStorage.setItem('sb_golden_hours_v1', JSON.stringify(jsonRes.data.goldenHourRules));
              }
              if (Array.isArray(jsonRes.data.maintenanceSchedules)) {
                localStorage.setItem('sb_maintenance_v1', JSON.stringify(jsonRes.data.maintenanceSchedules));
              }
              if (jsonRes.data.bankInfo) {
                const b = Object.assign({}, jsonRes.data.bankInfo, {
                  accountNo: jsonRes.data.bankInfo.accountNo || jsonRes.data.bankInfo.accountNumber || '',
                  accountNumber: jsonRes.data.bankInfo.accountNumber || jsonRes.data.bankInfo.accountNo || ''
                });
                localStorage.setItem('sb_bank_v1', JSON.stringify(b));
              }
              if (jsonRes.data.settings) {
                localStorage.setItem('sb_system_config', JSON.stringify(jsonRes.data.settings));
              }
              if (jsonRes.data.publicStats) {
                localStorage.setItem('sb_public_stats_v1', JSON.stringify(jsonRes.data.publicStats));
              }
            } catch (e) {}
          }
          return {
            pitches: jsonRes.data.pitches,
            timeSlots: jsonRes.data.timeSlots || window.SanBongApp.SanBongDB?.getTimeSlots() || [],
            extraServices: jsonRes.data.extraServices || window.SanBongApp.SanBongDB?.getServices?.() || [],
            vouchers: jsonRes.data.vouchers || window.SanBongApp.SanBongDB?.getVouchers() || [],
            goldenHourRules: jsonRes.data.goldenHourRules || window.SanBongApp.SanBongDB?.getGoldenHourRules?.() || [],
            maintenanceSchedules: jsonRes.data.maintenanceSchedules || window.SanBongApp.SanBongDB?.getMaintenanceSchedules?.() || [],
            bankInfo: jsonRes.data.bankInfo || window.SanBongApp.SanBongDB?.getBankInfo() || {},
            settings: jsonRes.data.settings || window.SanBongApp.SanBongDB?.getSystemConfig?.() || {},
            publicStats: jsonRes.data.publicStats || null
          };
        }
      }
    } catch (e) {
    }

    try {
      const dataUrl = window.SanBongApp.getRelativePath('data/data.json');
      const response = await fetch(dataUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      return {
        pitches: window.SanBongApp.SanBongDB?.getPitches() || window.SanBongData?.DEFAULT_PITCHES || [],
        timeSlots: window.SanBongApp.SanBongDB?.getTimeSlots() || window.SanBongData?.DEFAULT_TIME_SLOTS || [],
        extraServices: window.SanBongApp.SanBongDB?.getServices?.() || window.SanBongData?.DEFAULT_EXTRA_SERVICES || [],
        vouchers: window.SanBongApp.SanBongDB?.getVouchers() || window.SanBongData?.DEFAULT_VOUCHERS || [],
        bankInfo: window.SanBongApp.SanBongDB?.getBankInfo() || window.SanBongData?.DEFAULT_BANK_INFO || {}
      };
    }
  },

  async getPitches() {
    const data = await this.fetchInitialData();
    return data.pitches || window.SanBongApp.SanBongDB.getPitches();
  },

  async fetchWeather() {
    try {
      const weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.7684&current_weather=true';
      const response = await fetch(weatherUrl);
      if (!response.ok) throw new Error('Không thể tải thời tiết');
      const data = await response.json();
      const current = data.current_weather;

      let conditionText = 'Trời đẹp, khô ráo';
      let icon = '☀️';
      if (current.weathercode >= 51 && current.weathercode <= 67) {
        conditionText = 'Có mưa nhỏ, sân cỏ thoát nước tốt';
        icon = '🌧️';
      } else if (current.weathercode > 67) {
        conditionText = 'Mưa to, có đèn che khán đài';
        icon = '⛈️';
      } else if (current.temperature < 20) {
        conditionText = 'Se lạnh, lý tưởng thi đấu';
        icon = '🌤️';
      }

      return {
        temperature: Math.round(current.temperature),
        windSpeed: current.windspeed,
        condition: conditionText,
        icon: icon,
        time: current.time
      };
    } catch (err) {
      console.warn('Fetch thời tiết thất bại, dùng giá trị mặc định:', err.message);
      return {
        temperature: 26,
        windSpeed: 2.5,
        condition: 'Trời khô ráo, lý tưởng thi đấu',
        icon: '🌤️'
      };
    }
  },

  async fetchBanks() {
    try {
      const response = await fetch('https://api.vietqr.io/v2/banks');
      if (!response.ok) throw new Error('Lỗi fetch ngân hàng');
      const json = await response.json();
      if (json && json.data) {
        return json.data;
      }
      return [];
    } catch (err) {
      console.warn('Fetch VietQR banks thất bại:', err.message);
      return [
        { name: 'Vietcombank', code: 'VCB', shortName: 'Vietcombank' },
        { name: 'MB Bank', code: 'MB', shortName: 'MBBank' },
        { name: 'Techcombank', code: 'TCB', shortName: 'Techcombank' }
      ];
    }
  },

  async requestJSON(path, payload) {
    try {
      const app = window.SanBongApp;
      if (payload !== undefined && app.ensureCsrfToken) {
        await app.ensureCsrfToken();
      }
      const base = String(app.getAppBase?.() || '').replace(/\/+$/, '');
      const apiUrl = app.getRelativePath ? app.getRelativePath(path) : `${base}/${path}`;
      const options = { credentials: 'same-origin', cache: 'no-store' };
      if (payload !== undefined) {
        options.method = 'POST';
        options.headers = app.getAuthFetchHeaders ? app.getAuthFetchHeaders() : { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(payload);
      }
      const response = await fetch(apiUrl, options);
      const setToken = app.setCsrfToken || window.SanBongHelpers?.setCsrfToken;
      const tokenHeader = response.headers?.get('X-CSRF-Token');
      if (tokenHeader && setToken) setToken(tokenHeader);
      const result = await response.json().catch(() => null);
      if (result?.csrf_token && setToken) setToken(result.csrf_token);
      if (!result || typeof result !== 'object' || Array.isArray(result) || typeof result.success !== 'boolean') {
        return {
          success: false,
          status: response.status,
          ref_code: 'ERR_INVALID_RESPONSE',
          message: 'Phản hồi máy chủ không hợp lệ. Vui lòng thử lại để kiểm tra trạng thái đơn.'
        };
      }
      return Object.assign({}, result, {
        success: response.ok && result.success === true,
        status: response.status,
        message: result.message || (response.ok && result.success === true ? '' : 'Không thể xử lý yêu cầu trên máy chủ.')
      });
    } catch (e) {
      return {
        success: false,
        status: 0,
        ref_code: 'ERR_NETWORK',
        message: 'Không thể kết nối máy chủ. Vui lòng thử lại để kiểm tra trạng thái đơn.'
      };
    }
  },

  postBooking(bookingPayload) {
    return this.requestJSON('api/bookings.php', bookingPayload);
  },

  getBooking(code) {
    return this.requestJSON('api/bookings.php?code=' + encodeURIComponent(code));
  },

  updateBookingRedemption(code, redeemedBottles) {
    return this.requestJSON('api/bookings.php?action=update_redemption', { code, redeemedBottles });
  },

  redirectToLogin(route, options = {}) {
    const expired = Boolean(options && options.expired);
    const notice = String(options && options.notice ? options.notice : '').trim();
    const useReplace = options && options.replace !== undefined ? Boolean(options.replace) : expired;
    try {
      sessionStorage.removeItem('sb_current_user');
      sessionStorage.removeItem('sb_csrf_token');
      localStorage.removeItem('sb_current_user');
      if (notice && !expired) {
        sessionStorage.setItem('sb_login_notice', notice);
      }
    } catch (e) {}
    if (typeof window !== 'undefined') {
      window.sb_current_user = null;
      if (expired && window._sbRedirecting401) return;
      if (expired) window._sbRedirecting401 = true;
      const cleanRoute = String(route || '').trim().replace(/^\/+/, '').replace(/\.html(?=$|[?#])/, '') || 'history';
      const query = `login?redirect=${encodeURIComponent(cleanRoute)}${expired ? '&expired=1' : ''}`;
      const targetUrl = window.SanBongApp?.getRelativePath
        ? window.SanBongApp.getRelativePath(query)
        : (window.SanBongHelpers?.getRelativePath ? window.SanBongHelpers.getRelativePath(query) : '/' + query);
      if (useReplace) {
        window.location.replace(targetUrl);
      } else {
        window.location.href = targetUrl;
      }
    }
  },

  checkPayment(code) {
    return this.requestJSON('api/check_payment.php?code=' + encodeURIComponent(code) + '&_t=' + Date.now());
  }
};
window.SanBongApp.redirectToLogin = window.SanBongApp.SanBongAPI.redirectToLogin.bind(window.SanBongApp.SanBongAPI);


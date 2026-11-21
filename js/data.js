
const DEFAULT_PITCHES = [
  {
    "id": "P5-A",
    "name": "Sân 5 - Sân A",
    "type": 5,
    "typeName": "Sân 5 người",
    "size": "20m x 40m",
    "grass": "Cỏ nhân tạo kim cương FIFA Quality Pro, đệm hạt cao su EPDM êm ái",
    "basePrice": 250000,
    "peakPrice": 350000,
    "status": "Hoạt động",
    "amenities": [
      "Đèn LED 400W chống chói",
      "Bãi đỗ ô tô & xe máy",
      "Nước suối miễn phí",
      "Phòng thay đồ & tắm nóng lạnh",
      "Wifi tốc độ cao",
      "Trọng tài theo yêu cầu"
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
    "basePrice": 250000,
    "peakPrice": 350000,
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
    "peakPrice": 650000,
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
    "basePrice": 400000,
    "peakPrice": 600000,
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
    "basePrice": 400000,
    "peakPrice": 600000,
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
    "basePrice": 800000,
    "peakPrice": 1200000,
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
    "basePrice": 280000,
    "peakPrice": 380000,
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
    "basePrice": 500000,
    "peakPrice": 750000,
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
    "basePrice": 250000,
    "peakPrice": 350000,
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
    "basePrice": 280000,
    "peakPrice": 380000,
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
    "basePrice": 250000,
    "peakPrice": 350000,
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
    "peakPrice": 650000,
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
    "basePrice": 420000,
    "peakPrice": 620000,
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
    "basePrice": 420000,
    "peakPrice": 620000,
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
    "peakPrice": 1400000,
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
    "basePrice": 800000,
    "peakPrice": 1200000,
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
    "basePrice": 950000,
    "peakPrice": 1500000,
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
    "basePrice": 260000,
    "peakPrice": 360000,
    "weekendPrice": 390000,
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
    "basePrice": 250000,
    "peakPrice": 350000,
    "weekendPrice": 380000,
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
    "basePrice": 250000,
    "peakPrice": 350000,
    "weekendPrice": 380000,
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
    "basePrice": 430000,
    "peakPrice": 630000,
    "weekendPrice": 720000,
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
    "peakPrice": 650000,
    "weekendPrice": 700000,
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
    "peakPrice": 650000,
    "weekendPrice": 700000,
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
    "basePrice": 920000,
    "peakPrice": 1420000,
    "weekendPrice": 1550000,
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
    "peakPrice": 1200000,
    "weekendPrice": 1400000,
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
    "peakPrice": 1200000,
    "weekendPrice": 1400000,
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
    minOrder: 0
  },
  {
    code: 'GIAM50K',
    description: 'Giảm ngay 50.000đ cho đơn đặt sân từ 500.000đ',
    type: 'fixed',
    value: 50000,
    minOrder: 500000
  },
  {
    code: 'VIPGOLD',
    description: 'Giảm 15% cho thành viên Vàng & Kim Cương',
    type: 'percent',
    value: 15,
    minOrder: 300000
  },
  {
    code: 'DATTHANG15',
    description: 'Giảm 15% hợp đồng 3 tháng (Tặng 2 thùng nước + 1 trọng tài mỗi trận)',
    type: 'percent',
    value: 15,
    minOrder: 800000
  },
  {
    code: 'SINHVIEN30K',
    description: 'Giảm 30.000đ trợ giá học sinh - sinh viên',
    type: 'fixed',
    value: 30000,
    minOrder: 200000
  },
  {
    code: 'CUOITUAN100K',
    description: 'Giảm 100.000đ cho đơn đặt sân 11 người / Giải đấu',
    type: 'fixed',
    value: 100000,
    minOrder: 900000
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
  openHours: '05:30 - 23:00 hàng ngày (kể cả Lễ, Tết)',
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

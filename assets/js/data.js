/**
 * SÂN BÓNG PRO - MOCK DATABASE & INITIAL DATA
 * Lưu trữ bền vững qua localStorage
 */

const DEFAULT_PITCHES = [
  {
    id: 'P5-A',
    name: 'Sân 5 - Sân A',
    type: 5,
    typeName: 'Sân 5 người',
    size: '20m x 40m',
    grass: 'Cỏ nhân tạo kim cương FIFA Quality Pro, đệm hạt cao su EPDM êm ái',
    basePrice: 250000,
    peakPrice: 350000,
    status: 'Hoạt động', // 'Hoạt động' | 'Bảo trì'
    amenities: ['Đèn LED 400W chống chói', 'Bãi đỗ ô tô & xe máy', 'Nước suối miễn phí', 'Phòng thay đồ & tắm nóng lạnh', 'Wifi tốc độ cao', 'Trọng tài theo yêu cầu'],
    variant: 'standard',
    description: 'Sân 5 chuẩn thi đấu mini, vị trí gần khán đài và khu dịch vụ tiện lợi.'
  },
  {
    id: 'P5-B',
    name: 'Sân 5 - Sân B',
    type: 5,
    typeName: 'Sân 5 người',
    size: '20m x 40m',
    grass: 'Cỏ nhân tạo monofilament cao cấp 50mm, thoát nước nhanh sau mưa',
    basePrice: 250000,
    peakPrice: 350000,
    status: 'Hoạt động',
    amenities: ['Đèn LED 400W chống chói', 'Bãi đỗ xe máy', 'Nước suối', 'Phòng thay đồ', 'Wifi'],
    variant: 'bright',
    description: 'Sân 5 thoáng mát, trang bị lưới chắn bóng cao cấp quanh sân an toàn.'
  },
  {
    id: 'P7-A',
    name: 'Sân 7 - Sân A (Trung tâm)',
    type: 7,
    typeName: 'Sân 7 người',
    size: '30m x 50m',
    grass: 'Cỏ sợi đan mật độ cao, giảm thiểu trầy xước khi va chạm tối đa',
    basePrice: 450000,
    peakPrice: 650000,
    status: 'Hoạt động',
    amenities: ['Hệ thống chiếu sáng 8 trụ LED', 'Bãi xe ô tô rộng', 'Phòng tắm nóng lạnh riêng', 'Khu kỹ thuật khán đài', 'Wifi', 'Hỗ trợ quay phát Highlight'],
    variant: 'deep',
    description: 'Sân 7 trung tâm chuyên tổ chức giải đấu phong trào và giao hữu câu lạc bộ.'
  },
  {
    id: 'P7-B',
    name: 'Sân 7 - Sân B',
    type: 7,
    typeName: 'Sân 7 người',
    size: '30m x 50m',
    grass: 'Cỏ nhân tạo 5cm tiêu chuẩn quốc tế, hạt cao su đàn hồi cao',
    basePrice: 400000,
    peakPrice: 600000,
    status: 'Hoạt động',
    amenities: ['Đèn LED công suất lớn', 'Bãi đỗ xe ô tô', 'Phòng thay đồ & tắm', 'Nước suối miễn phí', 'Wifi'],
    variant: 'twin',
    description: 'Sân 7 liền kề khu căng tin phục vụ nước giải khát và đồ ăn nhẹ.'
  },
  {
    id: 'P7-C',
    name: 'Sân 7 - Sân C (Bảo trì cỏ)',
    type: 7,
    typeName: 'Sân 7 người',
    size: '30m x 50m',
    grass: 'Đang nâng cấp mặt cỏ nhân tạo thế hệ mới',
    basePrice: 400000,
    peakPrice: 600000,
    status: 'Bảo trì',
    amenities: ['Đèn LED', 'Bãi xe', 'Phòng thay đồ'],
    variant: 'muted',
    description: 'Sân đang trong giai đoạn nâng cấp bảo dưỡng mặt cỏ định kỳ.'
  },
  {
    id: 'P11-GH',
    name: 'Sân 11 - Sân Ghép (A+B)',
    type: 11,
    typeName: 'Sân 11 người',
    size: '60m x 90m',
    grass: 'Ghép từ 2 sân 7 chuẩn, cỏ đồng bộ phẳng tuyệt đối',
    basePrice: 800000,
    peakPrice: 1200000,
    status: 'Hoạt động',
    amenities: ['Hệ thống đèn 12 cột chuẩn thi đấu', 'Phòng họp đội bóng', 'Bãi đỗ xe lớn', 'Phòng tắm nóng lạnh', 'Trọng tài VFF hỗ trợ'],
    variant: 'hero',
    description: 'Sân 11 ghép kích thước chuẩn giải phong trào lớn, đáp ứng thi đấu đỉnh cao.'
  },
  {
    id: 'P5-C',
    name: 'Sân 5 - Sân C (Mới)',
    type: 5,
    typeName: 'Sân 5 người',
    size: '20m x 40m',
    grass: 'Cỏ nhân tạo thế hệ 4 EvoFiber 60mm, chống nóng, hạt EPDM chính hãng',
    basePrice: 280000,
    peakPrice: 380000,
    status: 'Hoạt động',
    amenities: ['Đèn LED 500W siêu sáng', 'Bãi đỗ xe ô tô & xe máy', 'Nước suối miễn phí', 'Phòng thay đồ có máy lạnh', 'Wifi 5G', 'Camera an ninh 24/7'],
    variant: 'bright',
    description: 'Sân 5 mới nhất khu phức hợp, trang bị hiện đại nhất với cỏ thế hệ 4 chống nóng.'
  },
  {
    id: 'P7-D',
    name: 'Sân 7 - Sân D (VIP)',
    type: 7,
    typeName: 'Sân 7 người',
    size: '32m x 52m',
    grass: 'Cỏ lai tổng hợp Hybrid SIS (60% nhân tạo + 40% tự nhiên) chuẩn FIFA Quality Pro',
    basePrice: 500000,
    peakPrice: 750000,
    status: 'Hoạt động',
    amenities: ['Hệ thống chiếu sáng 10 cột LED 1000W', 'Phòng VIP khán đài có điều hòa', 'Màn hình tỷ số điện tử', 'Dịch vụ phát Livestream', 'Bãi xe ô tô riêng', 'Trọng tài VFF cấp 1'],
    variant: 'deep',
    description: 'Sân 7 VIP cao cấp nhất cụm, dành cho giải phong trào lớn và sự kiện thể thao doanh nghiệp.'
  }
];

const DEFAULT_TIME_SLOTS = [
  { id: 'S01', time: '05:30 - 06:30', start: '05:30', end: '06:30', isPeak: false },
  { id: 'S02', time: '06:30 - 07:30', start: '06:30', end: '07:30', isPeak: false },
  { id: 'S03', time: '07:30 - 08:30', start: '07:30', end: '08:30', isPeak: false },
  { id: 'S04', time: '08:30 - 09:30', start: '08:30', end: '09:30', isPeak: false },
  { id: 'S05', time: '09:30 - 10:30', start: '09:30', end: '10:30', isPeak: false },
  { id: 'S06', time: '14:00 - 15:00', start: '14:00', end: '15:00', isPeak: false },
  { id: 'S07', time: '15:00 - 16:00', start: '15:00', end: '16:00', isPeak: false },
  { id: 'S08', time: '16:00 - 17:00', start: '16:00', end: '17:00', isPeak: false },
  { id: 'S09', time: '17:00 - 18:00', start: '17:00', end: '18:00', isPeak: true },
  { id: 'S10', time: '17:30 - 19:00', start: '17:30', end: '19:00', isPeak: true, duration: 1.5 },
  { id: 'S11', time: '18:00 - 19:00', start: '18:00', end: '19:00', isPeak: true },
  { id: 'S12', time: '19:00 - 20:00', start: '19:00', end: '20:00', isPeak: true },
  { id: 'S13', time: '19:00 - 20:30', start: '19:00', end: '20:30', isPeak: true, duration: 1.5 },
  { id: 'S14', time: '20:00 - 21:00', start: '20:00', end: '21:00', isPeak: true },
  { id: 'S15', time: '20:30 - 22:00', start: '20:30', end: '22:00', isPeak: true, duration: 1.5 },
  { id: 'S16', time: '21:00 - 22:00', start: '21:00', end: '22:00', isPeak: false },
  { id: 'S17', time: '21:00 - 22:30', start: '21:00', end: '22:30', isPeak: false, duration: 1.5 },
  { id: 'S18', time: '22:00 - 23:00', start: '22:00', end: '23:00', isPeak: false }
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
  }
];

const DEFAULT_USER = {
  id: 'USR-8821',
  name: 'Trần Minh Hoàng',
  phone: '0912 345 678',
  email: 'minhhoang.fc@gmail.com',
  team: 'Hoàng Long FC',
  tier: 'Hạng Bạc',
  points: 820,
  avatar: 'TH',
  totalBookings: 14,
  favoritePitch: 'Sân 7 - Sân A (Trung tâm)'
};

const DEFAULT_BANK_INFO = {
  bankName: 'Vietcombank',
  bankCode: 'VCB',
  accountNumber: '0123456789',
  accountName: 'NGUYEN QUANG VINH',
  branch: 'Chi nhánh Nam Sài Gòn, TP.HCM',
  depositRate: 0.3 // Cọc 30%
};

// Hàm lấy ngày hôm nay theo format YYYY-MM-DD
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
    code: 'SB-20261106-9821',
    customerName: 'Trần Minh Hoàng',
    phone: '0912 345 678',
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
    status: 'Đã xác nhận', // 'Đã xác nhận' | 'Đang đá' | 'Hoàn thành' | 'Đã hủy'
    paymentStatus: 'Đã cọc 30%',
    paymentMethod: 'VietQR Chuyển khoản',
    createdAt: `${todayStr} 08:30`,
    note: 'Yêu cầu chuẩn bị sẵn áo bib màu cam và xanh'
  },
  {
    code: 'SB-20261106-4412',
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
    code: 'SB-20261106-1102',
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
    code: 'SB-20261105-8832',
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
    code: 'SB-20261107-5590',
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

// Xuất các đối tượng vào global window để script khác sử dụng trực tiếp
window.SanBongData = {
  DEFAULT_PITCHES,
  DEFAULT_TIME_SLOTS,
  DEFAULT_EXTRA_SERVICES,
  DEFAULT_VOUCHERS,
  DEFAULT_USER,
  DEFAULT_BANK_INFO,
  DEFAULT_BOOKINGS,
  getTodayDateString
};

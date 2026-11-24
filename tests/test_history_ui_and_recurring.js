const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');
const historyHtml = fs.readFileSync(path.join(rootDir, 'html', 'history.html'), 'utf8');
const historyJs = fs.readFileSync(path.join(rootDir, 'js', 'history.js'), 'utf8');
const helpersJs = fs.readFileSync(path.join(rootDir, 'js', 'helpers.js'), 'utf8');
const bookingUiJs = fs.readFileSync(path.join(rootDir, 'js', 'booking_ui.js'), 'utf8');
const bookingJs = fs.readFileSync(path.join(rootDir, 'js', 'booking.js'), 'utf8');
const twCss = fs.readFileSync(path.join(rootDir, 'css', 'tailwind.generated.css'), 'utf8');
const componentsCss = fs.readFileSync(path.join(rootDir, 'css', 'components.css'), 'utf8');

// 1. Kiểm tra class CSS trong history.html, history.js và helpers.js tồn tại trong tailwind.generated.css hoặc components.css
for (const content of [historyHtml, historyJs, helpersJs]) {
    const strRe = /class\s*=\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g;
    let m;
    while ((m = strRe.exec(content)) !== null) {
        const raw = (m[1] ?? m[2] ?? m[3] ?? '').replace(/\$\{[^}]*\}/g, ' ');
        for (const c of raw.split(/\s+/).filter(Boolean)) {
            if (/^(ui-card|input-field|btn-|font-heading|hatch-|lucide)/.test(c)) continue;
            const escaped = c.replace(/[:/\[\]#.%]/g, (ch) => '\\' + ch);
            const inTw = twCss.includes('.' + escaped);
            const inComp = componentsCss.includes('.' + c);
            assert.ok(inTw || inComp, `Class "${c}" không tìm thấy trong tailwind.generated.css hoặc components.css`);
        }
    }
}

// Không dùng CDN ngoài trong history.html và history.js
for (const combined of [historyHtml, historyJs]) {
    assert.ok(!/fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr|unpkg\.com|cdnjs\.cloudflare/i.test(combined), 'Không được chứa CDN ngoài');
}

// 2. Chạy helpers.js + history.js trong Node VM với DOM giả lập
function makeEl(id, extra = {}) {
    const clsSet = new Set(extra.classes || []);
    return Object.assign({
        id,
        value: extra.value || '',
        textContent: '',
        innerHTML: '',
        style: {},
        attrs: {},
        classList: {
            add: (...c) => c.forEach((x) => clsSet.add(x)),
            remove: (...c) => c.forEach((x) => clsSet.delete(x)),
            toggle: (c, f) => (f === undefined ? (clsSet.has(c) ? clsSet.delete(c) : clsSet.add(c)) : (f ? clsSet.add(c) : clsSet.delete(c))),
            contains: (c) => clsSet.has(c),
        },
        setAttribute: function (k, v) { this.attrs[k] = String(v); },
        getAttribute: function (k) { return this.attrs[k] ?? null; },
        addEventListener: () => {},
        focus: () => {},
    }, extra);
}

const els = {
    'history-container': makeEl('history-container'),
    'no-history-state': makeEl('no-history-state', { classes: ['hidden'] }),
    'guest-state': makeEl('guest-state', { classes: ['hidden'] }),
    'history-search-input': makeEl('history-search-input', { value: '' }),
    'total-badge': makeEl('total-badge'),
    'modal-code': makeEl('modal-code'),
    'modal-pitch': makeEl('modal-pitch'),
    'modal-time': makeEl('modal-time'),
    'modal-qr-mount': makeEl('modal-qr-mount'),
    'ticket-modal': makeEl('ticket-modal', { classes: ['hidden'] }),
};

const sampleBookings = [
    {
        code: 'ASFF467718',
        userId: 10,
        customerName: 'Nguyen Quang Vinh',
        phone: '0326070772',
        pitchId: 'P5-A',
        pitchName: 'Sân 5 - Sân A',
        date: '2026-12-15',
        slotId: 'S02',
        slotTime: '07:30 - 09:30',
        weeksCount: 8,
        bookingMode: 'monthly',
        totalPrice: 1800000,
        depositAmount: 1080000,
        paidAmount: 0,
        remainingAmount: 0,
        status: 'Đã hủy',
        paymentStatus: 'Đã hủy',
        createdAt: '2026-11-22 12:04:33',
        note: '[Gói cố định 8 tuần: 15/12/2026, 22/12/2026, 29/12/2026, 05/01/2027, 12/01/2027, 19/01/2027, 26/01/2027, 02/02/2027] [Tài trợ mỗi trận: 1 thùng nước suối (24 chai) + 1 bộ áo bib thi đấu MỖI TRẬN] [Hủy trước hạn (unpaid_free_cancel, hoàn 0đ) - Đã hủy: TEST_S2_CLEANUP]',
    },
    {
        code: 'ASFF137066',
        userId: 10,
        customerName: 'Nguyen Quang Vinh',
        phone: '0326070772',
        pitchId: 'P5-C',
        pitchName: 'Sân 5 - Sân C (Mới)',
        date: '2026-11-15',
        slotId: 'S05',
        slotTime: '16:00 - 17:00',
        weeksCount: 1,
        bookingMode: 'single',
        totalPrice: 920000,
        depositAmount: 276000,
        paidAmount: 920000,
        remainingAmount: 0,
        status: 'completed',
        paymentStatus: 'Đã thanh toán 100%',
        createdAt: '2026-11-15 02:45:01',
        note: '[Tự động hủy do quá hạn 15p chưa đặt cọc] [Đã khôi phục lại ca đá] [Đã tất toán 100% qua Tiền mặt tại quầy] [Đã tất toán 100% qua Tiền mặt tại quầy]',
    },
    {
        code: 'ASFS998877',
        userId: 10,
        customerName: 'Nguyen Quang Vinh',
        phone: '0326070772',
        pitchId: 'P7-A',
        pitchName: 'Sân 7 - Sân A (Trung tâm)',
        date: '2026-12-20',
        slotId: 'S06',
        slotTime: '18:30 - 20:30',
        weeksCount: 1,
        bookingMode: 'single',
        totalPrice: 600000,
        depositAmount: 180000,
        paidAmount: 180000,
        remainingAmount: 420000,
        status: 'Đã xác nhận',
        paymentStatus: 'Đã cọc 30%',
        createdAt: '2026-11-24 10:00:00',
        note: 'Chuẩn bị 2 bóng | [Đá thêm 30p: +150.000đ] | [Đặt trực tiếp tại quầy]',
    },
    {
        code: 'ASFE123456',
        userId: 10,
        customerName: 'Nguyen Quang Vinh',
        phone: '0326070772',
        pitchId: 'P11-GH',
        pitchName: 'Sân 11 - Sân Ghép (A+B)',
        date: '2026-11-01',
        slotId: 'S05',
        slotTime: '16:30 - 18:30',
        weeksCount: 12,
        bookingMode: 'monthly',
        totalPrice: 12000000,
        depositAmount: 7200000,
        paidAmount: 12000000,
        remainingAmount: 0,
        status: 'completed',
        paymentStatus: 'Đã thanh toán 100%',
        createdAt: '2026-11-01 09:00:00',
        note: 'Đá giải công ty | [Gói cố định 12 tuần: 01/11/2026, 08/11/2026] [Gói 3 tháng (12 tuần) - Tặng 2 thùng nước + 1 trọng tài/trận]',
    },
    {
        code: 'ASFE602868',
        userId: 10,
        customerName: 'Nguyen Quang Vinh',
        phone: '0326070772',
        pitchId: 'P11-GH',
        pitchName: 'Sân 11 - Sân Ghép (A+B)',
        date: '2026-11-09',
        slotId: 'S05',
        slotTime: '16:00 - 17:00',
        weeksCount: 1,
        bookingMode: 'single',
        totalPrice: 4440000,
        depositAmount: 240000,
        paidAmount: 4440000,
        remainingAmount: 0,
        status: 'completed',
        paymentStatus: 'Đã thanh toán 100%',
        createdAt: '2026-11-09 15:00:00',
        note: '[Tự động hủy do quá hạn 15p chưa đặt cọc] [Đá thêm 30p: +600.000đ] [Đá thêm 30p: +600.000đ] [Đá thêm 30p: +600.000đ] [Đá thêm 30p: +600.000đ] [Đá thêm 30p: +600.000đ] [Đá thêm 30p: +600.000đ] [Gọi thêm: Nước suối lẻ Aquafina 500ml x1 (+10.000đ)] [Gọi thêm: Nước suối lẻ Aquafina 500ml x1 (+10.000đ)] [Gọi thêm: Nước suối lẻ Aquafina 500ml x1 (+10.000đ)] [Gọi thêm: Nước suối lẻ Aquafina 500ml x1 (+10.000đ)] [Đã tất toán 100% qua Tiền mặt tại quầy]',
    },
];

const sandbox = {
    console,
    Date,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    Map,
    JSON,
    URLSearchParams,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout,
    clearTimeout,
    document: {
        getElementById: (id) => els[id] || null,
        querySelector: () => null,
        addEventListener: () => {},
        createElement: () => makeEl('tmp'),
        body: { appendChild: () => {} },
    },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    fetch: async (url) => {
        if (String(url).includes('api/reviews.php')) {
            return {
                ok: true,
                status: 200,
                headers: { get: () => null },
                json: async () => ({
                    success: true,
                    data: { reviewed: { ASFE123456: { rating: 5, comment: 'Rất tốt' } } },
                }),
            };
        }
        return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ success: true, data: {} }) };
    },
};
sandbox.window = sandbox;
sandbox.window.location = { search: '', pathname: '/history', href: 'https://fxzioyr.id.vn/history' };
sandbox.window.addEventListener = () => {};

vm.runInNewContext(helpersJs, sandbox);

sandbox.window.SanBongApp = Object.assign(sandbox.window.SanBongApp || {}, sandbox.window.SanBongHelpers, {
    getRelativePath: (p) => '/' + String(p || '').replace(/^\//, ''),
    SanBongDB: {
        getUser: () => ({ id: 10, full_name: 'Nguyen Quang Vinh', phone: '0326070772', role: 'user' }),
        getAllBookings: () => sampleBookings,
        getSystemConfig: () => ({ refundFullHours: 24, refundPartialHours: 4 }),
        getPackagePromotion: (w) => (Number(w) === 8
            ? { giftSummary: '1 thùng nước suối (24 chai) + 1 bộ áo bib thi đấu MỖI TRẬN' }
            : (Number(w) === 12 ? { giftSummary: '2 thùng nước suối (48 chai) + 1 trọng tài chuyên nghiệp MỖI TRẬN' } : null)),
    },
});

vm.runInNewContext(historyJs, sandbox);

// 3. Verify statusPill mapping
const helpers = sandbox.window.SanBongHelpers;
for (const [input, expectedLabel] of [
    ['completed', 'Hoàn thành'],
    ['Completed', 'Hoàn thành'],
    ['cancelled', 'Đã hủy'],
    ['confirmed', 'Đã xác nhận'],
    ['playing', 'Đang đá'],
    ['pending', 'Giữ chỗ'],
    ['noshow', 'Khách chưa đến'],
    ['Vắng mặt (No-Show)', 'Khách chưa đến'],
]) {
    const pill = helpers.statusPill(input);
    assert.ok(pill.includes(`>${expectedLabel}<`), `statusPill('${input}') phải hiển thị '${expectedLabel}', nhận: ${pill}`);
}

// 4. Verify renderHistory output for all cards
(async () => {
await sandbox.syncReviewedMap(sandbox.window.SanBongApp.SanBongDB);
sandbox.renderHistory();
const htmlOut = els['history-container'].innerHTML;

assert.ok(htmlOut.length > 0, 'history-container không được rỗng');
assert.strictEqual(els['total-badge'].textContent, 5);

// Card 1: ASFF467718 (Gói 8 tuần + note sạch)
const card1Start = htmlOut.indexOf('id="booking-card-ASFF467718"');
const card2Start = htmlOut.indexOf('id="booking-card-ASFF137066"');
const card3Start = htmlOut.indexOf('id="booking-card-ASFS998877"');
const card4Start = htmlOut.indexOf('id="booking-card-ASFE123456"');
const card5Start = htmlOut.indexOf('id="booking-card-ASFE602868"');
assert.ok(card1Start >= 0 && card2Start > card1Start && card3Start > card2Start && card4Start > card3Start && card5Start > card4Start, 'Phải render đủ cả 5 thẻ đơn');

const card1Html = htmlOut.slice(card1Start, card2Start);
assert.ok(card1Html.includes('📅 Lịch 8 buổi:'), 'ASFF467718 phải có khối Lịch 8 buổi');
assert.ok(card1Html.includes('15/12/2026 – 02/02/2027 (8 buổi hàng tuần)'), 'ASFF467718 phải hiện khoảng ngày 8 buổi');
assert.ok(card1Html.includes('02/02/2027'), 'ASFF467718 phải hiển thị chip ngày cuối');
assert.ok(card1Html.includes('🎁 Ưu đãi mỗi trận: 1 thùng nước suối (24 chai) + 1 bộ áo bib thi đấu'), 'ASFF467718 phải hiện ưu đãi mỗi trận gọn');
assert.ok(!card1Html.includes('MỖI TRẬN'), 'Không được lặp chữ MỖI TRẬN trong ưu đãi');
assert.ok(!card1Html.includes('unpaid_free_cancel'), 'Không được lộ mã unpaid_free_cancel');
assert.ok(!card1Html.includes('TEST_S2_CLEANUP'), 'Không được lộ chuỗi TEST_S2_CLEANUP');
assert.ok(!card1Html.includes('[Gói cố định'), 'Không được đổ chuỗi thô [Gói cố định');
assert.ok(card1Html.includes('Đã hủy trước hạn (chưa thanh toán cọc)'), 'Phải hiển thị lý do hủy đã làm sạch');
assert.ok(card1Html.includes('w-full sm:w-64 shrink-0 flex flex-col gap-2'), 'Cột nút bên phải phải cố định chiều rộng sm:w-64');
assert.ok(!card1Html.includes('btn-base'), 'Nút trong cột phải không được dùng .btn-base gây méo font/padding');

// Card 2: ASFF137066 (completed + lặp note cũ + 3 nút)
const card2Html = htmlOut.slice(card2Start, card3Start);
assert.ok(card2Html.includes('>Hoàn thành<'), 'ASFF137066 phải đổi completed sang Hoàn thành');
assert.ok(!card2Html.includes('>completed<'), 'ASFF137066 không được hiện raw completed');
assert.ok(card2Html.includes('>Đã thanh toán 100%<'), 'ASFF137066 phải hiện Đã thanh toán 100%');
assert.ok(!card2Html.includes('Tự động hủy'), 'ASFF137066 không được hiện log hủy cũ');
assert.ok(!card2Html.includes('Đã khôi phục'), 'ASFF137066 không được hiện log khôi phục nội bộ');
assert.ok(!card2Html.includes('Đã tất toán 100% qua Tiền mặt'), 'ASFF137066 không được lặp log tất toán nội bộ');
assert.ok(card2Html.includes('grid grid-cols-2 gap-2 w-full'), 'ASFF137066 phải xếp 2 nút dưới trong grid-cols-2 thẳng hàng');
assert.ok(card2Html.includes('href="/booking?pitchId=P5-C&amp;slotId=S05"'), 'Nút Đặt lại ca này phải truyền cả pitchId và slotId');

// Card 3: ASFS998877 (Ghi chú khách + overtime chip + nút Hủy trước hạn)
const card3Html = htmlOut.slice(card3Start, card4Start);
assert.ok(card3Html.includes('Chuẩn bị 2 bóng'), 'Phải giữ ghi chú khách');
assert.ok(card3Html.includes('⏱️ Đá thêm 30p (+150.000đ)'), 'Phải hiển thị chip Đá thêm giờ gộp gọn');
assert.ok(!card3Html.includes('Đặt trực tiếp tại quầy'), 'Phải ẩn tag nội bộ Đặt trực tiếp tại quầy');
assert.ok(card3Html.includes('Hủy trước hạn &amp; Hoàn cọc'), 'Đơn đã cọc phải có nút hủy thẳng cột');

// Card 4: ASFE123456 (Gói 12 tuần + Đã đánh giá + giữ ghi chú tay)
const card4Html = htmlOut.slice(card4Start, card5Start);
assert.ok(card4Html.includes('✓ Đã đánh giá ★5'), 'Đơn đã đánh giá phải hiển thị badge cân đối trong grid-cols-2');
assert.ok(card4Html.includes('Đá giải công ty'), 'Phải giữ ghi chú tay của khách');
assert.ok(!card4Html.includes('Tặng 2 thùng nước'), 'Tag quà thô không được lặp ở dòng ghi chú vì đã ở khối Gói cố định');
assert.ok(card4Html.includes('href="/booking?pitchId=P11-GH&amp;slotId=S05&amp;mode=monthly&amp;weeks=12"'), 'Đặt lại gói cố định phải mang theo mode=monthly&weeks=12');

// Card 5: ASFE602868 (Gộp cộng dồn 6 lần đá thêm giờ + 4 lần gọi thêm nước + xóa log cũ)
const card5Html = htmlOut.slice(card5Start);
assert.ok(card5Html.includes('⏱️ Đá thêm 180p (+3.600.000đ)'), 'Phải cộng dồn 6x30p (+600k) = 180p (+3.600.000đ)');
assert.ok(card5Html.includes('🛒 Nước suối lẻ Aquafina 500ml ×4 (+40.000đ)'), 'Phải cộng dồn 4x Nước suối Aquafina (+10k) = ×4 (+40.000đ)');
assert.ok(!card5Html.includes('+600.000đ') && !card5Html.includes('Đá thêm 30p'), 'Không được lặp lại các dòng +600.000đ / 30p thô');
assert.ok(!card5Html.includes('+10.000đ') && !card5Html.includes('x1 ('), 'Không được lặp lại các dòng +10.000đ / x1 thô');
assert.ok(!card5Html.includes('Tự động hủy'), 'Không được hiển thị log tự động hủy cũ trên đơn hoàn thành');
assert.ok(!card5Html.includes('Đã tất toán 100% qua Tiền mặt'), 'Không được hiển thị log tất toán nội bộ');

// Test Hủy lúc: YYYY-MM-DD HH:MM:SS - Khách hàng chủ động...
const cancelMeta = sandbox.parseHistoryBookingMeta({
    status: 'Đã hủy',
    paymentStatus: 'Đã hủy',
    note: '[Hủy lúc: 2026-11-21 08:48:03 - Khách hàng chủ động hủy lịch trước thời hạn]'
}, sandbox.window.SanBongApp.SanBongDB);
assert.strictEqual(JSON.stringify(cancelMeta.cleanNotes), JSON.stringify(['Đã hủy trước hạn theo yêu cầu']), 'Phải tách trọn timestamp YYYY-MM-DD HH:MM:SS của Hủy lúc:');

// Filter test
sandbox.filterHistory('completed');
assert.ok(els['history-container'].innerHTML.includes('ASFF137066'), 'Filter completed phải nhận status="completed"');
assert.ok(!els['history-container'].innerHTML.includes('ASFF467718'), 'Filter completed không hiện đơn Đã hủy');

// View QR modal check for ASFF467718 (0đ collected) & ASFF137066 (checked badge)
sandbox.filterHistory('all');
sandbox.viewQRCode('ASFF467718');
assert.ok(els['modal-time'].innerHTML.includes('Gói 8 tuần (15/12/2026 – 02/02/2027)'), 'Modal QR gói cố định phải hiện khoảng ngày');
assert.ok(els['modal-time'].innerHTML.includes('Đã thu: 0đ'), 'Đơn hủy chưa cọc không được báo Đã cọc 1.080.000đ');
sandbox.viewQRCode('ASFF137066');
assert.ok(els['modal-qr-mount'].innerHTML.includes('Đã quét QR Check-in'), 'Đơn completed phải hiện tick xanh Đã quét QR Check-in');

// 5. Verify booking_ui stripBookingSystemNoteTags & booking.js draft safety
assert.ok(bookingUiJs.includes('function stripBookingSystemNoteTags'), 'booking_ui.js phải có stripBookingSystemNoteTags');
assert.ok(bookingUiJs.includes('const paramWeeks = parseInt'), 'booking_ui.js phải đọc tham số weeks');
assert.ok(bookingJs.includes('customerNote: cleanUserNote'), 'booking.js phải lưu customerNote sạch riêng biệt');

const stripFnMatch = bookingUiJs.match(/function stripBookingSystemNoteTags\([\s\S]*?\n\}/);
assert.ok(stripFnMatch, 'Không trích xuất được stripBookingSystemNoteTags');
const stripSandbox = {};
vm.runInNewContext(stripFnMatch[0], stripSandbox);
const cleanedUserNote = stripSandbox.stripBookingSystemNoteTags(
    'Cho đội mặc áo đỏ | [Gói cố định 12 tuần: 01/12/2026, 08/12/2026] [Tài trợ mỗi trận: 2 thùng nước]'
);
assert.strictEqual(cleanedUserNote, 'Cho đội mặc áo đỏ');

console.log('ALL HISTORY UI & RECURRING PACKAGE TESTS PASSED');
})().catch((err) => {
    console.error(err);
    process.exit(1);
});

const fs = require('fs');

// 1. Update html/history.html
let histHtml = fs.readFileSync('html/history.html', 'utf8');
histHtml = histHtml.replace(
  /<div id="member-avatar"[\s\S]*?<div class="text-\[11px\] text-\[#64748B\] flex justify-between">[\s\S]*?<\/div>/,
  `<div id="member-avatar" class="w-14 h-14 rounded-full bg-[#DCFCE7] text-[#16A34A] font-heading font-extrabold text-xl flex items-center justify-center shadow-sm">
              👤
            </div>
            <div>
              <div id="member-name" class="font-heading font-extrabold text-lg text-[#0F172A]">Khách vãng lai</div>
              <div id="member-phone" class="text-xs text-[#64748B]">Chưa đăng nhập</div>
              <span id="member-tier-badge" class="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                Chưa đăng nhập
              </span>
            </div>
          </div>

          <!-- Points Progress bar -->
          <div class="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
            <div class="flex justify-between text-xs font-semibold">
              <span class="text-[#64748B]">Điểm tích lũy</span>
              <span id="points-label" class="text-[#16A34A]">0 / 2.000 điểm</span>
            </div>
            <div class="w-full h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
              <div id="points-bar" class="w-0 h-full bg-[#16A34A]"></div>
            </div>
            <div class="text-[11px] text-[#64748B] flex justify-between">
              <span id="points-upgrade-hint">Đăng nhập tài khoản để tích điểm hội viên</span>
              <span class="font-bold text-[#16A34A]">Ưu đãi lên đến -15%</span>
            </div>`
);
histHtml = histHtml.replace(/<span class="text-xs bg-\[#16A34A\] text-white px-2 py-0\.5 rounded-full" id="total-badge">14<\/span>/, '<span class="text-xs bg-[#16A34A] text-white px-2 py-0.5 rounded-full" id="total-badge">0</span>');
fs.writeFileSync('html/history.html', histHtml, 'utf8');
console.log('Updated html/history.html');

// 2. Update js/history.js
let histJs = fs.readFileSync('js/history.js', 'utf8');
const oldRender = /function renderHistory\(\) \{[\s\S]*?const totBadge = document\.getElementById\('total-badge'\);[\s\S]*?let list = all\.filter\(/;
const newRender = `function renderHistory() {
  const db = window.SanBongApp.SanBongDB;
  const user = db.getUser();
  const all = db.getAllBookings();

  // Chỉ hiển thị đơn của người dùng đăng nhập; khách vãng lai chỉ thấy đơn vừa đặt
  let userBookings = [];
  if (user && user.phone) {
    userBookings = all.filter(b => b.phone === user.phone || b.customerName === user.name);
  } else {
    const rawLatest = sessionStorage.getItem('sb_latest_booking');
    if (rawLatest) {
      try {
        const lb = JSON.parse(rawLatest);
        if (lb && lb.code) userBookings = [lb];
      } catch (e) {}
    }
  }

  const totBadge = document.getElementById('total-badge');
  if (totBadge) totBadge.textContent = userBookings.length;

  let list = userBookings.filter(`;
histJs = histJs.replace(oldRender, newRender);
fs.writeFileSync('js/history.js', histJs, 'utf8');
console.log('Updated js/history.js');

// 3. Update html/checkout.html
let coHtml = fs.readFileSync('html/checkout.html', 'utf8');
coHtml = coHtml.replace(/<span id="co-phone" class="font-bold">0352 313 548<\/span>/, '<span id="co-phone" class="font-bold">---</span>');
fs.writeFileSync('html/checkout.html', coHtml, 'utf8');
console.log('Updated html/checkout.html');

// 4. Update js/checkout.js fallback points
let coJs = fs.readFileSync('js/checkout.js', 'utf8');
coJs = coJs.replace(/const currentPoints = typeof user\?\.points === 'number' \? user\.points : 820;/, "const currentPoints = typeof user?.points === 'number' ? user.points : 0;");
fs.writeFileSync('js/checkout.js', coJs, 'utf8');
console.log('Updated js/checkout.js');

async function loadAdminReviews() {
  const tbody = document.getElementById('admin-reviews-tbody');
  if (!tbody) return;
  const r = await adminFetchJson('../api/reviews.php?all=1');
  if (!r.ok) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách đánh giá.')}</td></tr>`;
    return;
  }

  const payload = r.data || r.json || {};
  const summary = payload.summary || {};
  const pitchStats = Array.isArray(payload.pitchStats) ? payload.pitchStats : [];
  const slotStats = Array.isArray(payload.slotStats) ? payload.slotStats : [];
  const reviews = Array.isArray(payload.reviews) ? payload.reviews : [];
  window.adminReviewsCache = reviews;

  const avgEl = document.getElementById('rev-stat-avg');
  const totEl = document.getElementById('rev-stat-total');
  const pubEl = document.getElementById('rev-stat-published');
  const hidEl = document.getElementById('rev-stat-hidden');
  if (avgEl) avgEl.textContent = `${Number(summary.avg_rating || 0).toFixed(1)} ★`;
  if (totEl) totEl.textContent = String(Number(summary.total_reviews || 0));
  if (pubEl) pubEl.textContent = String(Number(summary.published_reviews || 0));
  if (hidEl) hidEl.textContent = String(Number(summary.hidden_reviews || 0));

  const pitchListEl = document.getElementById('rev-by-pitch-list');
  if (pitchListEl) {
    pitchListEl.innerHTML = pitchStats.length > 0 ? pitchStats.map(ps => (
      `<div class="flex items-center justify-between py-1 border-b border-slate-200/70 last:border-0">
        <span class="font-semibold text-[#0F172A]">${escapeSearchHTML(ps.pitch_name || ps.pitch_id || '')}</span>
        <span class="font-bold text-amber-600">${Number(ps.avg_rating || 0).toFixed(1)} ★ <span class="text-[#64748B] font-normal">(${Number(ps.total || 0)} lượt)</span></span>
      </div>`
    )).join('') : '<div class="text-[#94A3B8]">Chưa có dữ liệu đánh giá theo sân.</div>';
  }

  const slotListEl = document.getElementById('rev-by-slot-list');
  if (slotListEl) {
    slotListEl.innerHTML = slotStats.length > 0 ? slotStats.map(ss => (
      `<div class="flex items-center justify-between py-1 border-b border-slate-200/70 last:border-0">
        <span class="font-semibold text-[#0F172A]">⏰ ${escapeSearchHTML(ss.slot_time || ss.slot_id || '')}</span>
        <span class="font-bold text-amber-600">${Number(ss.avg_rating || 0).toFixed(1)} ★ <span class="text-[#64748B] font-normal">(${Number(ss.total || 0)} lượt)</span></span>
      </div>`
    )).join('') : '<div class="text-[#94A3B8]">Chưa có dữ liệu đánh giá theo khung giờ.</div>';
  }

  if (reviews.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-[#94A3B8]">Chưa có đánh giá nào từ khách hàng.</td></tr>';
    return;
  }

  tbody.innerHTML = reviews.map(rv => {
    const rid = Number(rv.id);
    const starsNum = Math.max(1, Math.min(5, Number(rv.rating || 5)));
    const starsStr = '★'.repeat(starsNum) + '☆'.repeat(5 - starsNum);
    const st = rv.status || 'published';
    const nextSt = st === 'hidden' ? 'published' : 'hidden';
    const tags = Array.isArray(rv.tags) ? rv.tags : [];
    const tagsHtml = tags.length > 0
      ? `<div class="flex flex-wrap gap-1 mt-1">${tags.map(t => `<span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">${escapeSearchHTML(t)}</span>`).join('')}</div>`
      : '';

    const replyHtml = rv.admin_reply
      ? `<div class="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[#0F172A]">
           <div>${escapeSearchHTML(rv.admin_reply)}</div>
           ${rv.replied_by ? `<div class="text-[10px] text-[#64748B] mt-0.5">— ${escapeSearchHTML(rv.replied_by)} ${rv.replied_at ? '· ' + escapeSearchHTML(rv.replied_at) : ''}</div>` : ''}
         </div>`
      : '<span class="text-[11px] text-[#94A3B8] italic">Chưa phản hồi</span>';

    const statusBadge = st === 'hidden'
      ? '<span class="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">Đã ẩn</span>'
      : '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">Hiển thị</span>';

    const toggleBtn = isManagerOrAdmin()
      ? `<button type="button" onclick="toggleReviewStatus(${rid}, '${nextSt}')" class="px-2 py-1 rounded ${st === 'hidden' ? 'bg-sky-600 hover:bg-sky-700 text-white' : 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700'} font-bold text-[11px] cursor-pointer">${st === 'hidden' ? '👁️ Hiện' : '🙈 Ẩn'}</button>`
      : '';

    return `<tr class="hover:bg-slate-50/70">
      <td class="py-3 px-4 align-top">
        <div class="font-mono font-bold text-[#0F172A]">#${escapeSearchHTML(rv.booking_code || '')}</div>
        <div class="text-[10px] text-[#64748B] mt-0.5">${escapeSearchHTML(rv.created_at || '')}</div>
      </td>
      <td class="py-3 px-4 align-top">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(rv.pitch_name || rv.pitch_id || '')}</div>
        <div class="text-[11px] text-[#64748B]">${escapeSearchHTML(rv.booking_date || '')} ${rv.slot_time ? '· ' + escapeSearchHTML(rv.slot_time) : ''}</div>
      </td>
      <td class="py-3 px-4 align-top">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(rv.customer_name || '')}</div>
        <div class="font-mono text-[11px] text-[#64748B]">${escapeSearchHTML(rv.phone || '')}</div>
      </td>
      <td class="py-3 px-4 align-top max-w-[260px]">
        <div class="text-amber-500 font-bold text-xs tracking-wider">${starsStr}</div>
        <div class="text-[#334155] mt-1">${escapeSearchHTML(rv.comment || '—')}</div>
        ${tagsHtml}
      </td>
      <td class="py-3 px-4 align-top max-w-[220px]">${replyHtml}</td>
      <td class="py-3 px-4 align-top">${statusBadge}</td>
      <td class="py-3 px-4 align-top text-right">
        <div class="inline-flex items-center justify-end gap-1.5">
          <button type="button" onclick="openReviewReplyModal(${rid})" class="px-2.5 py-1 rounded bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer">💬 ${rv.admin_reply ? 'Sửa trả lời' : 'Trả lời'}</button>
          ${toggleBtn}
        </div>
      </td>
    </tr>`;
  }).join('');
}
window.loadAdminReviews = loadAdminReviews;

function openReviewReplyModal(reviewId) {
  const reviews = window.adminReviewsCache || [];
  const rv = reviews.find(x => Number(x.id) === Number(reviewId));
  if (!rv) return;
  const modal = document.getElementById('review-reply-modal');
  if (!modal) return;

  const idEl = document.getElementById('rev-reply-id');
  const metaEl = document.getElementById('rev-reply-meta');
  const textEl = document.getElementById('rev-reply-text');

  if (idEl) idEl.value = String(rv.id);
  if (metaEl) {
    const stars = '★'.repeat(Math.max(1, Math.min(5, Number(rv.rating || 5))));
    metaEl.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-bold text-[#0F172A]">${escapeSearchHTML(rv.customer_name || '')} (#${escapeSearchHTML(rv.booking_code || '')})</span>
        <span class="text-amber-500 font-bold">${stars}</span>
      </div>
      <div class="text-[11px] text-[#64748B]">${escapeSearchHTML(rv.pitch_name || '')} · ${escapeSearchHTML(rv.slot_time || '')}</div>
      <div class="text-[#334155] italic">"${escapeSearchHTML(rv.comment || '')}"</div>
    `;
  }
  if (textEl) textEl.value = rv.admin_reply || '';

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}
window.openReviewReplyModal = openReviewReplyModal;

function closeReviewReplyModal() {
  const modal = document.getElementById('review-reply-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}
window.closeReviewReplyModal = closeReviewReplyModal;

async function submitReviewReply(e) {
  if (e && e.preventDefault) e.preventDefault();
  const reviewId = parseInt(document.getElementById('rev-reply-id')?.value || '0', 10) || 0;
  const replyText = (document.getElementById('rev-reply-text')?.value || '').trim();
  if (!reviewId || !replyText) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập nội dung phản hồi!', 'warning');
    return;
  }

  const form = e?.target || document.getElementById('review-reply-form');
  const submitBtn = form?.querySelector('button[type="submit"]');
  const orig = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Đang gửi...';
  }
  try {
    const r = await adminFetchJson('../api/reviews.php', {
      method: 'POST',
      body: JSON.stringify({
        action: 'reply_review',
        review_id: reviewId,
        reply_text: replyText
      })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể gửi phản hồi đánh giá!', 'error', 4000);
      return;
    }
    closeReviewReplyModal();
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã gửi phản hồi đánh giá khách hàng!', 'success', 3000);
    await loadAdminReviews();
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = orig;
    }
  }
}
window.submitReviewReply = submitReviewReply;

async function toggleReviewStatus(reviewId, nextStatus) {
  if (!isManagerOrAdmin()) return;
  if (nextStatus === 'hidden') {
    const ok = await showAdminConfirm({
      title: 'Ẩn đánh giá khách hàng',
      message: 'Đánh giá này sẽ không còn hiển thị công khai trên trang chủ. Bạn có chắc muốn ẩn?',
      confirmText: 'Ẩn đánh giá',
      cancelText: 'Hủy',
      danger: true
    });
    if (!ok) return;
  }

  const r = await adminFetchJson('../api/reviews.php', {
    method: 'POST',
    body: JSON.stringify({
      action: 'toggle_status',
      review_id: Number(reviewId),
      status: nextStatus
    })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể cập nhật trạng thái đánh giá!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã cập nhật hiển thị đánh giá!', 'success', 3000);
  await loadAdminReviews();
}
window.toggleReviewStatus = toggleReviewStatus;

function performAdminSearch() {
  const input = document.getElementById('admin-global-search');
  const resultsBox = document.getElementById('admin-search-results');
  const clearBtn = document.getElementById('admin-search-clear');
  if (!input || !resultsBox) return;

  const rawQuery = input.value.trim();
  const query = rawQuery.toLowerCase();
  if (!query) {
    resultsBox.classList.add('hidden');
    resultsBox.innerHTML = '';
    if (clearBtn) clearBtn.classList.add('hidden');
    return;
  }
  if (clearBtn) clearBtn.classList.remove('hidden');

  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const allBookings = db.getAllBookings ? db.getAllBookings() : [];
  const pendingPayments = (isManagerOrAdmin() && db.getPendingPayments) ? db.getPendingPayments() : [];
  const cleanPhoneQ = query.replace(/[\s\.\-]+/g, '');

  const matchedBookings = allBookings.filter(b => {
    const code = (b.code || '').toLowerCase();
    const phone = (b.phone || '').replace(/[\s\.\-]+/g, '');
    const name = (b.customerName || '').toLowerCase();
    const pitch = (b.pitchName || '').toLowerCase();
    const isCodeMatch = code.includes(query);
    const isPhoneMatch = cleanPhoneQ.length >= 3 && phone.includes(cleanPhoneQ);
    const isNameMatch = name.includes(query);
    const isPitchMatch = pitch.includes(query);
    return isCodeMatch || isPhoneMatch || isNameMatch || isPitchMatch;
  });

  const matchedPending = pendingPayments.filter(p => {
    const code = (p.code || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    const bank = (p.bank || '').toLowerCase();
    return code.includes(query) || name.includes(query) || bank.includes(query);
  });

  const total = matchedBookings.length + matchedPending.length;

  if (total === 0) {
    resultsBox.innerHTML = `
      <div class="p-4 text-center">
        <div class="text-2xl mb-1">🔍</div>
        <div class="font-bold text-xs text-[#0F172A]">Không tìm thấy đơn đặt sân nào</div>
        <div class="text-[11px] text-[#64748B] mt-0.5">Không có kết quả khớp với "<strong>${escapeSearchHTML(rawQuery)}</strong>"</div>
      </div>
    `;
    resultsBox.classList.remove('hidden');
    return;
  }

  let html = `
    <div class="px-3 py-1.5 text-[11px] font-bold text-[#64748B] bg-slate-50 rounded-lg flex items-center justify-between mb-1.5">
      <span>TÌM THẤY ${total} KẾT QUẢ</span>
      <button onclick="clearAdminSearch()" class="text-slate-400 hover:text-slate-600 text-xs">Đóng</button>
    </div>
  `;

  if (matchedPending.length > 0) {
    matchedPending.forEach(p => {
      html += `
        <div onclick="switchAdminTab('payments'); clearAdminSearch();" class="p-2.5 rounded-lg hover:bg-amber-50 cursor-pointer transition-all border border-transparent hover:border-amber-200 mb-1">
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono font-bold text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded">${escapeSearchHTML(p.code)}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Chờ duyệt cọc</span>
          </div>
          <div class="mt-1 text-xs font-semibold text-[#0F172A] flex items-center justify-between">
            <span>${escapeSearchHTML(p.name)}</span>
            <span class="font-bold text-[#16A34A]">${Number(p.amt || 0).toLocaleString('vi-VN')}đ</span>
          </div>
          <div class="text-[11px] text-[#64748B] flex items-center justify-between mt-0.5">
            <span>${escapeSearchHTML(p.bank || 'VietQR')} · ${p.time || ''}</span>
            <span class="text-[#D97706] font-semibold">Xem duyệt cọc →</span>
          </div>
        </div>
      `;
    });
  }

  if (matchedBookings.length > 0) {
    matchedBookings.forEach(b => {
      const isPending = b.paymentStatus === 'Chờ duyệt cọc';
      const statusBg = isPending ? 'bg-amber-100 text-amber-700' : (b.status === 'Đang đá' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700');
      html += `
        <div data-code="${escapeSearchHTML(b.code || '')}" onclick="viewBookingDetail(this.getAttribute('data-code'))" class="p-2.5 rounded-lg hover:bg-emerald-50 cursor-pointer transition-all border border-transparent hover:border-emerald-200 mb-1">
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded">${escapeSearchHTML(b.code)}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBg}">${escapeSearchHTML(b.paymentStatus || b.status)}</span>
          </div>
          <div class="mt-1 text-xs font-semibold text-[#0F172A] flex items-center justify-between">
            <span>${escapeSearchHTML(b.customerName || 'Khách')} ${b.phone ? '· ' + escapeSearchHTML(b.phone) : ''}</span>
            <span class="font-bold text-[#16A34A]">${Number(b.totalPrice || 0).toLocaleString('vi-VN')}đ</span>
          </div>
          <div class="text-[11px] text-[#64748B] flex items-center justify-between mt-0.5">
            <span>${escapeSearchHTML(b.pitchName || '')} (${escapeSearchHTML(b.slotTime || '')})</span>
            <span class="text-[#16A34A] font-semibold">Chi tiết đơn →</span>
          </div>
        </div>
      `;
    });
  }

  resultsBox.innerHTML = html;
  resultsBox.classList.remove('hidden');
}

function clearAdminSearch() {
  const input = document.getElementById('admin-global-search');
  const resultsBox = document.getElementById('admin-search-results');
  const clearBtn = document.getElementById('admin-search-clear');
  if (input) input.value = '';
  if (resultsBox) {
    resultsBox.classList.add('hidden');
    resultsBox.innerHTML = '';
  }
  if (clearBtn) clearBtn.classList.add('hidden');
}

function viewBookingDetail(code) {
  clearAdminSearch();
  if (typeof openInPlayModal === 'function') openInPlayModal(code);
}

document.addEventListener('click', (e) => {
  const searchContainer = document.getElementById('admin-global-search')?.closest('.relative');
  if (searchContainer && !searchContainer.contains(e.target)) {
    const resultsBox = document.getElementById('admin-search-results');
    if (resultsBox) resultsBox.classList.add('hidden');
  }
});

window.performAdminSearch = performAdminSearch;
window.clearAdminSearch = clearAdminSearch;
window.viewBookingDetail = viewBookingDetail;

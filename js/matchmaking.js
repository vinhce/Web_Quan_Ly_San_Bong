(function () {
  'use strict';

  const getRel = (p) => (window.SanBongHelpers ? window.SanBongHelpers.getRelativePath(p) : '/' + p);
  const escapeHtml = (s) => (window.SanBongHelpers ? window.SanBongHelpers.escapeHTML(s) : String(s || ''));
  const esc = escapeHtml;

  const skillLabels = {
    beginner: 'Vui vẻ / Văn phòng',
    intermediate: 'Trung bình khá',
    advanced: 'Khá cứng / Phủi giải',
    all: 'Giao lưu mọi trình độ'
  };

  const feeLabels = {
    split_50_50: 'Chia đôi 50/50',
    loser_pays: 'Thua trả tiền sân',
    negotiable: 'Thỏa thuận'
  };

  let currentPosts = [];
  let currentJoinPost = null;

  async function loadMatches() {
    const grid = document.getElementById('matches-grid');
    if (!grid) return;

    const pitchType = document.getElementById('filter-pitch-type')?.value || '';
    const status = document.getElementById('filter-status')?.value || 'open';
    const date = document.getElementById('filter-date')?.value || '';

    const params = new URLSearchParams();
    if (pitchType) params.set('pitch_type', pitchType);
    if (status) params.set('status', status);
    if (date) params.set('date', date);

    grid.innerHTML = `<div class="col-span-full py-12 text-center text-sm text-[#64748B]">Đang tải danh sách kèo giao lưu...</div>`;

    try {
      const res = await fetch(getRel('api/matchmaking.php?') + params.toString());
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Lỗi tải dữ liệu');

      const openPostBtn = document.getElementById('open-post-match-modal');
      if (json.enabled === false) {
        if (openPostBtn) {
          openPostBtn.classList.add('hidden');
          openPostBtn.disabled = true;
        }
        grid.innerHTML = `
          <div class="col-span-full ui-card p-10 text-center space-y-2 border border-amber-200 bg-amber-50/40">
            <div class="text-2xl">⏸️</div>
            <div class="font-heading font-bold text-base text-[#0F172A]">Chức năng Ghép kèo / Tìm đối đang tạm đóng</div>
            <p class="text-xs text-[#64748B]">Quản trị viên hiện đang tạm ẩn bảng tin tìm đối. Quý khách vui lòng đặt sân trực tiếp tại trang Sân Bóng.</p>
          </div>
        `;
        return;
      }
      if (openPostBtn) {
        openPostBtn.classList.remove('hidden');
        openPostBtn.disabled = false;
      }

      currentPosts = Array.isArray(json.data) ? json.data : [];
      renderMatches(currentPosts);
    } catch (err) {
      grid.innerHTML = `<div class="col-span-full py-12 text-center text-sm text-red-500">Không thể tải danh sách ghép kèo: ${esc(err.message)}</div>`;
    }
  }

  function renderMatches(posts) {
    const grid = document.getElementById('matches-grid');
    if (!grid) return;

    if (!posts.length) {
      grid.innerHTML = `
        <div class="col-span-full ui-card p-12 text-center space-y-3">
          <div class="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto text-2xl">⚽</div>
          <div class="font-heading font-bold text-lg text-[#0F172A]">Chưa có kèo tìm đối nào phù hợp</div>
          <p class="text-xs text-[#64748B]">Hãy là đội đầu tiên đăng kèo tìm đối giao lưu ngay hôm nay!</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = posts.map(p => {
      const isMatched = p.status === 'matched';
      const isOpen = p.status === 'open';
      const isMine = Boolean(p.is_mine);
      const dateStr = p.match_date ? p.match_date.split('-').reverse().join('/') : '';

      const statusBadge = isMatched
        ? `<span class="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold">Đã ghép: ${esc(p.opponent_team || 'Có đối')}</span>`
        : `<span class="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-[11px] font-bold flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></span> Đang tìm đối</span>`;

      const isMineBadge = isMine
        ? `<span class="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">★ Kèo của bạn</span>`
        : '';

      const authorHtml = `<div class="text-[11px] text-[#64748B] mb-1">Đăng bởi: <span class="font-semibold text-[#0F172A]">${escapeHtml(p.author_fullname || p.author_username || p.captain_name)}</span> ${p.author_tier ? '<span class="ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Hội viên ' + escapeHtml(p.author_tier) + '</span>' : '<span class="ml-1 text-[10px] text-slate-400">(Hội viên)</span>'}</div>`;

      let actionButtons = '';
      if (isMatched) {
        actionButtons = `<div class="text-xs font-bold text-blue-700 w-full text-center py-2 bg-blue-50 rounded-lg">🤝 ${esc(p.team_name)} vs ${esc(p.opponent_team)} (SĐT: ${esc(p.phone_masked || p.phone || '')})</div>`;
      } else if (isMine && isOpen) {
        actionButtons = `
          <div class="text-xs text-[#64748B]">SĐT: <span class="font-mono font-bold text-[#0F172A]">${esc(p.phone_masked || p.phone || '')}</span></div>
          <button type="button" class="btn-cancel-post px-3 py-2 rounded-lg border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors" data-post-id="${esc(p.id)}" data-post-code="${esc(p.post_code)}">
            Hủy Kèo
          </button>
        `;
      } else if (!isMine && isOpen) {
        actionButtons = `
          <div class="text-xs text-[#64748B]">SĐT: <span class="font-mono font-bold text-[#0F172A]">${esc(p.phone_masked || p.phone || '')}</span></div>
          <div class="flex items-center gap-2">
            ${p.phone ? `<a href="https://zalo.me/${esc(p.phone)}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-2 rounded-lg border border-blue-200 text-xs font-bold text-blue-600 hover:bg-blue-50 flex items-center gap-1 transition-colors">💬 Nhắn Zalo</a>` : ''}
            <button type="button" class="btn-base btn-primary px-4 py-2 text-xs font-bold shadow-sm join-match-btn" data-post-id="${esc(p.id)}" data-code="${esc(p.post_code)}">
              Bắt Kèo Ngay
            </button>
          </div>
        `;
      } else {
        actionButtons = `
          <div class="text-xs text-[#64748B]">SĐT: <span class="font-mono font-bold text-[#0F172A]">${esc(p.phone_masked || p.phone || '')}</span></div>
          <span class="text-xs font-semibold text-slate-400">Đã đóng</span>
        `;
      }

      return `
        <div class="ui-card p-5 flex flex-col justify-between hover:shadow-lg transition-all border border-[#E2E8F0]">
          <div class="space-y-3">
            <div class="flex items-start justify-between gap-2">
              <div>
                ${authorHtml}
                <div class="text-[11px] font-mono font-bold text-[#64748B]">#${esc(p.post_code)}</div>
                <h3 class="font-heading font-bold text-lg text-[#0F172A] mt-0.5">${esc(p.team_name)}</h3>
              </div>
              <div class="flex flex-col items-end gap-1.5">
                ${isMineBadge}
                ${statusBadge}
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 text-xs bg-[#F8FAFC] p-3 rounded-xl border border-[#F1F5F9]">
              <div>
                <span class="text-[#64748B] block text-[11px]">Ngày đá:</span>
                <span class="font-bold text-[#0F172A]">${esc(dateStr)}</span>
              </div>
              <div>
                <span class="text-[#64748B] block text-[11px]">Khung giờ:</span>
                <span class="font-bold text-[#16A34A]">${esc(p.slot_time)}</span>
              </div>
              <div>
                <span class="text-[#64748B] block text-[11px]">Loại sân:</span>
                <span class="font-bold text-[#0F172A]">Sân ${esc(p.pitch_type)} người</span>
              </div>
              <div>
                <span class="text-[#64748B] block text-[11px]">Trình độ:</span>
                <span class="font-bold text-[#0F172A]">${esc(skillLabels[p.skill_level] || p.skill_level)}</span>
              </div>
            </div>

            <div class="text-xs text-[#475569] space-y-1">
              <div class="flex items-center justify-between">
                <span>Đội trưởng: <strong class="text-[#0F172A]">${esc(p.captain_name)}</strong></span>
                <span>Thể lệ: <strong class="text-[#0F172A]">${esc(feeLabels[p.fee_mode] || p.fee_mode)}</strong></span>
              </div>
              ${p.note ? `<p class="italic text-[#64748B] pt-1">"${esc(p.note)}"</p>` : ''}
            </div>
          </div>

          <div class="pt-4 mt-4 border-t border-[#F1F5F9] flex items-center justify-between gap-3">
            ${actionButtons}
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.join-match-btn').forEach(btn => {
      btn.addEventListener('click', () => openJoinModal(btn.dataset.code || btn.dataset.postId));
    });

    document.querySelectorAll('.btn-cancel-post').forEach(btn => {
      btn.addEventListener('click', () => openCancelModal(btn.dataset.postId, btn.dataset.postCode));
    });
  }

  function prefillUserInfo(nameId, phoneId, specificUser) {
    try {
      const user = specificUser
        || JSON.parse(sessionStorage.getItem('sb_current_user') || 'null')
        || (window.SanBongApp?.SanBongDB?.getUser ? window.SanBongApp.SanBongDB.getUser() : null);
      if (user) {
        const nEl = document.getElementById(nameId);
        const pEl = document.getElementById(phoneId);
        if (nEl && !nEl.value) nEl.value = user.full_name || user.name || '';
        if (pEl && !pEl.value) pEl.value = user.phone || '';
      }
    } catch (e) {}
  }

  window.addEventListener('sb-auth-synced', (e) => {
    prefillUserInfo('post-captain-name', 'post-phone', e.detail);
    prefillUserInfo('join-captain-name', 'join-phone', e.detail);
  });
  if (window.SanBongApp?.authReady) {
    window.SanBongApp.authReady.then((u) => {
      prefillUserInfo('post-captain-name', 'post-phone', u);
      prefillUserInfo('join-captain-name', 'join-phone', u);
    });
  }

  const ERROR_CLASSES = ['!border-red-500', '!ring-1', '!ring-red-500'];

  function markFieldError(el) {
    if (!el) return;
    el.classList.add(...ERROR_CLASSES);
  }

  function clearFieldError(el) {
    if (!el) return;
    el.classList.remove(...ERROR_CLASSES);
  }

  function clearAllFieldErrors(formEl) {
    if (!formEl) return;
    const inputs = formEl.querySelectorAll('input, select, textarea');
    inputs.forEach(el => clearFieldError(el));
  }

  function setupAutoClearErrors(formEl) {
    if (!formEl) return;
    const inputs = formEl.querySelectorAll('input, select, textarea');
    inputs.forEach(el => {
      const clear = () => clearFieldError(el);
      el.addEventListener('input', clear);
      el.addEventListener('change', clear);
    });
  }

  function isValidVNPhone(phone) {
    const clean = String(phone || '').replace(/[\s\.\-\(\)]+/g, '');
    return /^(?:0|\+84)(?:3|5|7|8|9)\d{8}$/.test(clean);
  }

  function getTodayISO() {
    if (window.SanBongApp?.getLocalTodayISO) {
      return window.SanBongApp.getLocalTodayISO();
    }
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function openPostModal() {
    const modal = document.getElementById('post-match-modal');
    if (!modal) return;
    const dateInput = document.getElementById('post-match-date');
    if (dateInput && !dateInput.value) {
      const today = getTodayISO();
      dateInput.value = today;
      dateInput.min = today;
    }
    prefillUserInfo('post-captain-name', 'post-phone');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closePostModal() {
    const modal = document.getElementById('post-match-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    clearAllFieldErrors(document.getElementById('post-match-form'));
  }

  function openJoinModal(postCodeOrId) {
    const post = currentPosts.find(p => p.post_code === postCodeOrId || String(p.id) === String(postCodeOrId));
    if (!post) return;
    currentJoinPost = post;
    const modal = document.getElementById('join-match-modal');
    document.getElementById('join-post-code').value = post.post_code;
    document.getElementById('join-match-summary').innerHTML = `
      <div><strong>Chủ kèo:</strong> ${esc(post.team_name)} (Cap: ${esc(post.captain_name)})</div>
      <div><strong>Thời gian:</strong> ${esc(post.match_date)} lúc <span class="text-[#16A34A] font-bold">${esc(post.slot_time)}</span></div>
      <div><strong>Sân:</strong> Sân ${esc(post.pitch_type)} người | <strong>Thể lệ:</strong> ${esc(feeLabels[post.fee_mode] || post.fee_mode)}</div>
    `;
    prefillUserInfo('join-captain-name', 'join-phone');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeJoinModal() {
    const modal = document.getElementById('join-match-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    clearAllFieldErrors(document.getElementById('join-match-form'));
  }

  function openCancelModal(postId, postCode) {
    const modal = document.getElementById('cancel-match-modal');
    if (!modal) return;
    const idInput = document.getElementById('cancel-post-id');
    const codeInput = document.getElementById('cancel-post-code');
    if (idInput) idInput.value = postId || '';
    if (codeInput) codeInput.value = postCode || '';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeCancelModal() {
    const modal = document.getElementById('cancel-match-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  async function handleConfirmCancel() {
    const postId = document.getElementById('cancel-post-id')?.value;
    const postCode = document.getElementById('cancel-post-code')?.value;
    if (!postId && !postCode) return;

    const confirmBtn = document.getElementById('confirm-cancel-match-btn');
    const origText = confirmBtn ? confirmBtn.textContent : '';
    const notify = (msg, type = 'info') => window.SanBongApp?.showToast ? window.SanBongApp.showToast(msg, type) : alert(msg);

    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Đang xử lý...';
    }

    try {
      if (window.SanBongApp?.ensureCsrfToken) {
        await window.SanBongApp.ensureCsrfToken();
      }
      const headers = window.SanBongApp?.getAuthFetchHeaders
        ? window.SanBongApp.getAuthFetchHeaders()
        : { 'Content-Type': 'application/json' };

      const res = await fetch(getRel('api/matchmaking.php'), {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'cancel_match',
          post_id: postId,
          post_code: postCode
        })
      });
      if (res.status === 401) {
        closeCancelModal();
        if (window.SanBongApp?.handleUnauthorizedSession) {
          window.SanBongApp.handleUnauthorizedSession('matchmaking');
        } else {
          window.location.replace(getRel('login?redirect=matchmaking&expired=1'));
        }
        return;
      }

      const tokenHeader = res.headers ? res.headers.get('X-CSRF-Token') : null;
      if (tokenHeader && window.SanBongApp?.setCsrfToken) {
        window.SanBongApp.setCsrfToken(tokenHeader);
      }
      const json = await res.json();
      if (json?.csrf_token && window.SanBongApp?.setCsrfToken) {
        window.SanBongApp.setCsrfToken(json.csrf_token);
      }

      if (json.success) {
        notify(json.message || 'Đã hủy bài đăng tìm đối thành công.', 'success');
        closeCancelModal();
        loadMatches();
      } else {
        notify(json.message || 'Không thể hủy bài đăng.', 'error');
      }
    } catch (err) {
      notify('Lỗi kết nối khi hủy bài đăng.', 'error');
    } finally {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = origText;
      }
    }
  }

  function openContactModal(contactData) {
    const modal = document.getElementById('match-contact-modal');
    if (!modal) return;

    const teamEl = document.getElementById('contact-team-name');
    const capEl = document.getElementById('contact-captain-name');
    const phoneEl = document.getElementById('contact-phone');
    const callBtn = document.getElementById('contact-call-btn');
    const zaloBtn = document.getElementById('contact-zalo-btn');

    const teamName = contactData.host_team || contactData.team_name || 'Đội đối thủ';
    const captainName = contactData.host_captain || contactData.captain_name || 'Đội trưởng';
    const phone = contactData.host_phone || contactData.phone || '';
    const cleanPhone = String(phone).replace(/\D/g, '');

    if (teamEl) teamEl.textContent = teamName;
    if (capEl) capEl.textContent = captainName;
    if (phoneEl) phoneEl.textContent = phone || 'Chưa cập nhật';

    if (callBtn) {
      callBtn.href = phone ? `tel:${phone}` : '#';
      if (!phone) {
        callBtn.classList.add('opacity-50', 'pointer-events-none');
      } else {
        callBtn.classList.remove('opacity-50', 'pointer-events-none');
      }
    }

    if (zaloBtn) {
      zaloBtn.href = cleanPhone ? `https://zalo.me/${cleanPhone}` : '#';
      if (!cleanPhone) {
        zaloBtn.classList.add('opacity-50', 'pointer-events-none');
      } else {
        zaloBtn.classList.remove('opacity-50', 'pointer-events-none');
      }
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeContactModal() {
    const modal = document.getElementById('match-contact-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function populateMatchmakingSlots() {
    const sel = document.getElementById('post-slot-time');
    if (!sel) return;
    const dbSlots = window.SanBongApp?.SanBongDB?.getTimeSlots?.() || [
      { id: 'S01', time: '05:30 - 07:30', isPeak: false },
      { id: 'S02', time: '07:30 - 09:30', isPeak: false },
      { id: 'S03', time: '09:30 - 11:30', isPeak: false },
      { id: 'S04', time: '14:30 - 16:30', isPeak: false },
      { id: 'S05', time: '16:30 - 18:30', isPeak: true },
      { id: 'S06', time: '18:30 - 20:30', isPeak: true },
      { id: 'S07', time: '20:30 - 22:30', isPeak: false }
    ];
    if (!Array.isArray(dbSlots) || dbSlots.length === 0) return;
    const prevVal = sel.value;
    sel.innerHTML = dbSlots.map(s => {
      const peakLabel = s.isPeak ? ' (Cao điểm)' : '';
      return `<option value="${esc(s.time)}" data-slot-id="${esc(s.id)}">${esc(s.time)}${peakLabel}</option>`;
    }).join('');
    if (prevVal && [...sel.options].some(o => o.value === prevVal)) {
      sel.value = prevVal;
    } else {
      const hotOpt = [...sel.options].find(o => o.dataset.slotId === 'S06' || o.dataset.slotId === 'S05');
      if (hotOpt) sel.value = hotOpt.value;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    populateMatchmakingSlots();
    window.addEventListener('sb-data-synced', populateMatchmakingSlots);
    loadMatches();

    const postFormEl = document.getElementById('post-match-form');
    const joinFormEl = document.getElementById('join-match-form');
    setupAutoClearErrors(postFormEl);
    setupAutoClearErrors(joinFormEl);

    document.getElementById('filter-pitch-type')?.addEventListener('change', loadMatches);
    document.getElementById('filter-status')?.addEventListener('change', loadMatches);
    document.getElementById('filter-date')?.addEventListener('change', loadMatches);
    document.getElementById('refresh-matches-btn')?.addEventListener('click', loadMatches);

    document.getElementById('open-post-match-modal')?.addEventListener('click', openPostModal);
    document.getElementById('close-post-modal')?.addEventListener('click', closePostModal);
    document.getElementById('cancel-post-btn')?.addEventListener('click', closePostModal);

    document.getElementById('close-join-modal')?.addEventListener('click', closeJoinModal);
    document.getElementById('cancel-join-btn')?.addEventListener('click', closeJoinModal);

    postFormEl?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formEl = e.currentTarget;
      const submitBtn = formEl.querySelector('button[type="submit"]');
      const origText = submitBtn ? submitBtn.textContent : '';
      const notify = (msg, type = 'info') => window.SanBongApp?.showToast ? window.SanBongApp.showToast(msg, type) : alert(msg);

      const teamNameEl = document.getElementById('post-team-name');
      const captainNameEl = document.getElementById('post-captain-name');
      const phoneEl = document.getElementById('post-phone');
      const dateEl = document.getElementById('post-match-date');

      const invalidEls = [];
      const todayISO = getTodayISO();

      if (!teamNameEl?.value.trim()) {
        invalidEls.push(teamNameEl);
      } else {
        clearFieldError(teamNameEl);
      }

      if (!captainNameEl?.value.trim()) {
        invalidEls.push(captainNameEl);
      } else {
        clearFieldError(captainNameEl);
      }

      const phoneVal = phoneEl?.value.trim() || '';
      if (!phoneVal || !isValidVNPhone(phoneVal)) {
        invalidEls.push(phoneEl);
      } else {
        clearFieldError(phoneEl);
      }

      const dateVal = dateEl?.value || '';
      if (!dateVal || dateVal < todayISO) {
        invalidEls.push(dateEl);
      } else {
        clearFieldError(dateEl);
      }

      if (invalidEls.length > 0) {
        invalidEls.forEach(el => markFieldError(el));
        invalidEls[0]?.focus();
        notify('Vui lòng kiểm tra và điền đầy đủ các trường thông tin bắt buộc màu đỏ.', 'warning');
        return;
      }

      const slotSelect = document.getElementById('post-slot-time');
      const selectedSlotOpt = slotSelect?.options?.[slotSelect.selectedIndex];
      const payload = {
        action: 'create_post',
        team_name: teamNameEl.value.trim(),
        captain_name: captainNameEl.value.trim(),
        phone: phoneVal,
        pitch_type: document.getElementById('post-pitch-type').value,
        match_date: dateVal,
        slot_id: selectedSlotOpt?.dataset?.slotId || '',
        slot_time: slotSelect?.value || '',
        skill_level: document.getElementById('post-skill-level').value,
        fee_mode: document.getElementById('post-fee-mode').value,
        note: document.getElementById('post-note').value.trim()
      };
      if (window.SanBongApp?.ensureCsrfToken) await window.SanBongApp.ensureCsrfToken();
      const headers = window.SanBongApp?.getAuthFetchHeaders ? window.SanBongApp.getAuthFetchHeaders() : { 'Content-Type': 'application/json' };
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Đang đăng...'; }
      try {
        const res = await fetch(getRel('api/matchmaking.php'), {
          method: 'POST', headers, credentials: 'same-origin', body: JSON.stringify(payload)
        });
        if (res.status === 401) {
          closePostModal();
          if (window.SanBongApp?.handleUnauthorizedSession) {
            window.SanBongApp.handleUnauthorizedSession('matchmaking');
          } else {
            window.location.replace(getRel('login?redirect=matchmaking&expired=1'));
          }
          return;
        }
        const tokenHeader = res.headers ? res.headers.get('X-CSRF-Token') : null;
        if (tokenHeader && window.SanBongApp?.setCsrfToken) window.SanBongApp.setCsrfToken(tokenHeader);
        const json = await res.json();
        if (json?.csrf_token && window.SanBongApp?.setCsrfToken) window.SanBongApp.setCsrfToken(json.csrf_token);
        if (json.success) {
          notify(json.message, 'success');
          closePostModal();
          formEl.reset();
          loadMatches();
        } else {
          notify(json.message || 'Lỗi đăng kèo.', 'error');
        }
      } catch (err) {
        notify('Lỗi kết nối máy chủ.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = origText;
        }
      }
    });

    joinFormEl?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formEl = e.currentTarget;
      const submitBtn = formEl.querySelector('button[type="submit"]');
      const origText = submitBtn ? submitBtn.textContent : '';
      const notify = (msg, type = 'info') => window.SanBongApp?.showToast ? window.SanBongApp.showToast(msg, type) : alert(msg);

      const teamNameEl = document.getElementById('join-team-name');
      const captainNameEl = document.getElementById('join-captain-name');
      const phoneEl = document.getElementById('join-phone');

      const invalidEls = [];

      if (!teamNameEl?.value.trim()) {
        invalidEls.push(teamNameEl);
      } else {
        clearFieldError(teamNameEl);
      }

      if (!captainNameEl?.value.trim()) {
        invalidEls.push(captainNameEl);
      } else {
        clearFieldError(captainNameEl);
      }

      const phoneVal = phoneEl?.value.trim() || '';
      if (!phoneVal || !isValidVNPhone(phoneVal)) {
        invalidEls.push(phoneEl);
      } else {
        clearFieldError(phoneEl);
      }

      if (invalidEls.length > 0) {
        invalidEls.forEach(el => markFieldError(el));
        invalidEls[0]?.focus();
        notify('Vui lòng kiểm tra và điền đầy đủ các trường thông tin bắt buộc màu đỏ.', 'warning');
        return;
      }

      const payload = {
        action: 'join_match',
        post_code: document.getElementById('join-post-code').value,
        opponent_team: teamNameEl.value.trim(),
        opponent_captain: captainNameEl.value.trim(),
        opponent_phone: phoneVal
      };
      if (window.SanBongApp?.ensureCsrfToken) {
        await window.SanBongApp.ensureCsrfToken();
      }
      const headers = window.SanBongApp?.getAuthFetchHeaders
        ? window.SanBongApp.getAuthFetchHeaders()
        : { 'Content-Type': 'application/json' };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang gửi...';
      }
      try {
        const res = await fetch(getRel('api/matchmaking.php'), {
          method: 'POST',
          headers,
          credentials: 'same-origin',
          body: JSON.stringify(payload)
        });
        if (res.status === 401) {
          closeJoinModal();
          if (window.SanBongApp?.handleUnauthorizedSession) {
            window.SanBongApp.handleUnauthorizedSession('matchmaking');
          } else {
            window.location.replace(getRel('login?redirect=matchmaking&expired=1'));
          }
          return;
        }
        const tokenHeader = res.headers ? res.headers.get('X-CSRF-Token') : null;
        if (tokenHeader && window.SanBongApp?.setCsrfToken) {
          window.SanBongApp.setCsrfToken(tokenHeader);
        }
        const json = await res.json();
        if (json?.csrf_token && window.SanBongApp?.setCsrfToken) {
          window.SanBongApp.setCsrfToken(json.csrf_token);
        }
        if (json.success) {
          notify(json.message || 'Bắt kèo thành công!', 'success');
          closeJoinModal();
          formEl.reset();
          loadMatches();

          const hostData = {
            host_team: json.data?.host_team || currentJoinPost?.team_name || 'Đối thủ',
            host_captain: json.data?.host_captain || currentJoinPost?.captain_name || 'Đội trưởng',
            host_phone: json.data?.host_phone || json.host_phone || currentJoinPost?.phone || ''
          };
          openContactModal(hostData);
        } else {
          notify(json.message || 'Không thể nhận kèo.', 'error');
        }
      } catch (err) {
        notify('Lỗi kết nối máy chủ.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = origText;
        }
      }
    });

    ['close-match-contact-modal', 'dismiss-match-contact-btn'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', closeContactModal);
    });
    document.getElementById('match-contact-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeContactModal();
    });

    ['close-cancel-match-modal', 'dismiss-cancel-match-btn'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', closeCancelModal);
    });
    document.getElementById('confirm-cancel-match-btn')?.addEventListener('click', handleConfirmCancel);
    document.getElementById('cancel-match-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeCancelModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') [closePostModal, closeJoinModal, closeCancelModal, closeContactModal].forEach(fn => fn());
    });
  });
})();

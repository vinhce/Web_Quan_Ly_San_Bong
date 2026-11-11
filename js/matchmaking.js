(function () {
  'use strict';

  const getRel = (p) => (window.SanBongHelpers ? window.SanBongHelpers.getRelativePath(p) : '/' + p);
  const esc = (s) => (window.SanBongHelpers ? window.SanBongHelpers.escapeHTML(s) : String(s || ''));

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
      const dateStr = p.match_date ? p.match_date.split('-').reverse().join('/') : '';
      const statusBadge = isMatched
        ? `<span class="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold">Đã ghép: ${esc(p.opponent_team || 'Có đối')}</span>`
        : `<span class="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-[11px] font-bold flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></span> Đang tìm đối</span>`;

      return `
        <div class="ui-card p-5 flex flex-col justify-between hover:shadow-lg transition-all border border-[#E2E8F0]">
          <div class="space-y-3">
            <div class="flex items-start justify-between gap-2">
              <div>
                <div class="text-[11px] font-mono font-bold text-[#64748B]">#${esc(p.post_code)}</div>
                <h3 class="font-heading font-bold text-lg text-[#0F172A] mt-0.5">${esc(p.team_name)}</h3>
              </div>
              ${statusBadge}
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
            ${isMatched
              ? `<div class="text-xs font-bold text-blue-700 w-full text-center py-2 bg-blue-50 rounded-lg">🤝 ${esc(p.team_name)} vs ${esc(p.opponent_team)} (SĐT: ${esc(p.phone_masked)})</div>`
              : `<div class="text-xs text-[#64748B]">SĐT: <span class="font-mono font-bold text-[#0F172A]">${esc(p.phone_masked)}</span></div>
                 <button type="button" class="join-match-btn btn-base btn-primary px-4 py-2 text-xs font-bold shadow-sm" data-code="${esc(p.post_code)}">
                   Bắt Kèo Ngay
                 </button>`
            }
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.join-match-btn').forEach(btn => {
      btn.addEventListener('click', () => openJoinModal(btn.dataset.code));
    });
  }

  function prefillUserInfo(nameId, phoneId) {
    try {
      const user = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
      if (user) {
        const nEl = document.getElementById(nameId);
        const pEl = document.getElementById(phoneId);
        if (nEl && !nEl.value) nEl.value = user.full_name || user.name || '';
        if (pEl && !pEl.value) pEl.value = user.phone || '';
      }
    } catch (e) {}
  }

  function openPostModal() {
    const modal = document.getElementById('post-match-modal');
    if (!modal) return;
    const dateInput = document.getElementById('post-match-date');
    if (dateInput && !dateInput.value) {
      const today = window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0];
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
  }

  function openJoinModal(postCode) {
    const post = currentPosts.find(p => p.post_code === postCode);
    if (!post) return;
    const modal = document.getElementById('join-match-modal');
    document.getElementById('join-post-code').value = postCode;
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
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadMatches();

    document.getElementById('filter-pitch-type')?.addEventListener('change', loadMatches);
    document.getElementById('filter-status')?.addEventListener('change', loadMatches);
    document.getElementById('filter-date')?.addEventListener('change', loadMatches);
    document.getElementById('refresh-matches-btn')?.addEventListener('click', loadMatches);

    document.getElementById('open-post-match-modal')?.addEventListener('click', openPostModal);
    document.getElementById('close-post-modal')?.addEventListener('click', closePostModal);
    document.getElementById('cancel-post-btn')?.addEventListener('click', closePostModal);

    document.getElementById('close-join-modal')?.addEventListener('click', closeJoinModal);
    document.getElementById('cancel-join-btn')?.addEventListener('click', closeJoinModal);

    document.getElementById('post-match-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formEl = e.currentTarget;
      const submitBtn = formEl.querySelector('button[type="submit"]');
      const origText = submitBtn ? submitBtn.textContent : '';
      const payload = {
        action: 'create_post',
        team_name: document.getElementById('post-team-name').value.trim(),
        captain_name: document.getElementById('post-captain-name').value.trim(),
        phone: document.getElementById('post-phone').value.trim(),
        pitch_type: document.getElementById('post-pitch-type').value,
        match_date: document.getElementById('post-match-date').value,
        slot_time: document.getElementById('post-slot-time').value,
        skill_level: document.getElementById('post-skill-level').value,
        fee_mode: document.getElementById('post-fee-mode').value,
        note: document.getElementById('post-note').value.trim()
      };
      if (window.SanBongApp?.ensureCsrfToken) {
        await window.SanBongApp.ensureCsrfToken();
      }
      const headers = window.SanBongApp?.getAuthFetchHeaders
        ? window.SanBongApp.getAuthFetchHeaders()
        : { 'Content-Type': 'application/json' };
      const notify = (msg, type = 'info') => window.SanBongApp?.showToast ? window.SanBongApp.showToast(msg, type) : alert(msg);

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang đăng...';
      }
      try {
        const res = await fetch(getRel('api/matchmaking.php'), {
          method: 'POST',
          headers,
          credentials: 'same-origin',
          body: JSON.stringify(payload)
        });
        const tokenHeader = res.headers ? res.headers.get('X-CSRF-Token') : null;
        if (tokenHeader && window.SanBongApp?.setCsrfToken) {
          window.SanBongApp.setCsrfToken(tokenHeader);
        }
        const json = await res.json();
        if (json?.csrf_token && window.SanBongApp?.setCsrfToken) {
          window.SanBongApp.setCsrfToken(json.csrf_token);
        }
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

    document.getElementById('join-match-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formEl = e.currentTarget;
      const submitBtn = formEl.querySelector('button[type="submit"]');
      const origText = submitBtn ? submitBtn.textContent : '';
      const payload = {
        action: 'join_match',
        post_code: document.getElementById('join-post-code').value,
        opponent_team: document.getElementById('join-team-name').value.trim(),
        opponent_captain: document.getElementById('join-captain-name').value.trim(),
        opponent_phone: document.getElementById('join-phone').value.trim()
      };
      if (window.SanBongApp?.ensureCsrfToken) {
        await window.SanBongApp.ensureCsrfToken();
      }
      const headers = window.SanBongApp?.getAuthFetchHeaders
        ? window.SanBongApp.getAuthFetchHeaders()
        : { 'Content-Type': 'application/json' };
      const notify = (msg, type = 'info') => window.SanBongApp?.showToast ? window.SanBongApp.showToast(msg, type) : alert(msg);

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
        const tokenHeader = res.headers ? res.headers.get('X-CSRF-Token') : null;
        if (tokenHeader && window.SanBongApp?.setCsrfToken) {
          window.SanBongApp.setCsrfToken(tokenHeader);
        }
        const json = await res.json();
        if (json?.csrf_token && window.SanBongApp?.setCsrfToken) {
          window.SanBongApp.setCsrfToken(json.csrf_token);
        }
        if (json.success) {
          notify(json.message, 'success');
          closeJoinModal();
          formEl.reset();
          loadMatches();
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
  });
})();

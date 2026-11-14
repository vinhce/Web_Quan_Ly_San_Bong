(() => {
  const money = amount => new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  let activeModal = null;

  window.openTeamSplit = async code => {
    if (activeModal) return;
    const modal = document.createElement('div');
    activeModal = modal;
    modal.className = 'fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <section role="dialog" aria-modal="true" aria-labelledby="team-split-title" class="bg-white rounded-2xl p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4">
        <div class="flex justify-between items-center gap-3">
          <h2 id="team-split-title" class="font-bold text-lg">Chia tiền theo đội</h2>
          <button type="button" data-close aria-label="Đóng" class="btn-base btn-secondary">✕</button>
        </div>
        <p class="text-sm text-slate-600">Chia đều tổng tiền đơn sau giảm giá, gồm dịch vụ. Đây là sổ thu nội bộ của đội; không xác nhận thanh toán cho sân.</p>
        <p data-total class="font-bold"></p>
        <p data-message role="status" class="text-sm text-slate-600">Đang tải…</p>
        <form class="space-y-4 hidden">
          <div data-members class="space-y-3"></div>
          <button type="button" data-add class="btn-base btn-secondary text-xs">+ Thêm thành viên</button>
          <p data-summary class="text-sm font-bold"></p>
          <p class="text-xs text-slate-500">Phần lẻ 1đ được phân cho các thành viên đầu danh sách. Khi thêm/bớt người, phần phải đóng được tính lại; số đã đóng được giữ nguyên.</p>
          <button type="submit" class="btn-base btn-primary w-full">Lưu chia tiền</button>
        </form>
      </section>`;
    document.body.appendChild(modal);
    const previousFocus = document.activeElement;
    const message = modal.querySelector('[data-message]');
    const form = modal.querySelector('form');
    const rows = modal.querySelector('[data-members]');
    const close = () => {
      modal.remove();
      activeModal = null;
      document.removeEventListener('keydown', onKey);
      previousFocus?.focus();
    };
    const onKey = event => {
      if (event.key === 'Escape') close();
      if (event.key === 'Tab') {
        const focusable = [...modal.querySelectorAll('button,input')].filter(el => !el.disabled && el.getClientRects().length);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    modal.querySelector('[data-close]').onclick = close;
    modal.querySelector('[data-close]').focus();
    const app = window.SanBongApp;
    const url = app?.getRelativePath ? app.getRelativePath('api/team_split.php') : '/api/team_split.php';
    let total = 0;
    let revision = 0;
    const readMembers = () => [...rows.children].map(row => ({
      name: row.querySelector('[data-name]').value.trim(),
      paidAmount: Number(row.querySelector('[data-paid]').value)
    }));
    const refresh = () => {
      const members = readMembers();
      if (!members.length) return;
      const base = Math.floor(total / members.length);
      let collected = 0;
      let outstanding = 0;
      members.forEach((member, index) => {
        const share = base + (index < total % members.length ? 1 : 0);
        const paid = Number.isSafeInteger(member.paidAmount) && member.paidAmount >= 0 ? member.paidAmount : 0;
        const remaining = Math.max(0, share - paid);
        const extra = Math.max(0, paid - share);
        collected += paid;
        outstanding += remaining;
        rows.children[index].querySelector('[data-share]').textContent = `Phần đóng: ${money(share)} · Còn thiếu: ${money(remaining)}${extra ? ' · Đóng dư: ' + money(extra) : ''}`;
        rows.children[index].querySelector('[data-remove]').disabled = members.length === 1;
      });
      modal.querySelector('[data-summary]').textContent = `Đã thu: ${money(collected)} · Còn thiếu theo thành viên: ${money(outstanding)}`;
      modal.querySelector('[data-add]').disabled = members.length >= 50;
    };
    const addMember = (member = { name: '', paidAmount: 0 }) => {
      if (rows.children.length >= 50) return;
      const row = document.createElement('div');
      row.className = 'rounded-xl border border-slate-200 p-3 space-y-2';
      row.innerHTML = `<div class="flex flex-wrap gap-2 items-end">
        <label class="flex-1 text-xs font-semibold">Tên thành viên<input data-name required maxlength="80" class="block border rounded-lg p-2 w-full" placeholder="Ví dụ: Minh"></label>
        <label class="text-xs font-semibold">Đã đóng (đ)<input data-paid type="number" required min="0" max="2000000000" step="1" class="block border rounded-lg p-2 w-36"></label>
        <button type="button" data-remove class="btn-base btn-secondary text-xs">Xóa</button>
        </div><p data-share class="text-xs text-slate-600"></p>`;
      row.querySelector('[data-name]').value = member.name;
      row.querySelector('[data-paid]').value = member.paidAmount;
      row.querySelector('[data-remove]').onclick = () => { row.remove(); refresh(); };
      row.addEventListener('input', refresh);
      rows.appendChild(row);
      refresh();
    };
    modal.querySelector('[data-add]').onclick = () => { addMember(); rows.lastElementChild.querySelector('input').focus(); };
    const request = async (target, options = {}) => {
      const response = await fetch(target, { credentials: 'same-origin', cache: 'no-store', ...options });
      const json = await response.json();
      if (json.csrf_token) app?.setCsrfToken?.(json.csrf_token);
      if (!response.ok || !json.success) throw new Error(json.message || 'Không thể xử lý chia tiền.');
      return json.data;
    };
    try {
      const data = await request(url + '?code=' + encodeURIComponent(code));
      if (!modal.isConnected) return;
      total = data.totalAmount;
      revision = data.revision;
      modal.querySelector('[data-total]').textContent = `Đơn ${code} · Tổng chia: ${money(total)}`;
      form.classList.remove('hidden');
      (data.members.length ? data.members : [{ name: '', paidAmount: 0 }]).forEach(addMember);
      message.textContent = 'Nhập thành viên và số tiền thực tế đã thu.';
    } catch (error) {
      message.textContent = error.message;
    }
    form.onsubmit = async event => {
      event.preventDefault();
      const controls = [...form.querySelectorAll('button,input')];
      controls.forEach(control => { control.disabled = true; });
      try {
        const members = readMembers();
        if (members.some(member => !member.name || !Number.isSafeInteger(member.paidAmount) || member.paidAmount < 0)) throw new Error('Kiểm tra tên và số tiền đã đóng.');
        await app?.ensureCsrfToken?.();
        const data = await request(url, {
          method: 'POST',
          headers: app?.getAuthFetchHeaders ? app.getAuthFetchHeaders() : { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, revision, members })
        });
        revision = data.revision;
        total = data.totalAmount;
        modal.querySelector('[data-total]').textContent = `Đơn ${code} · Tổng chia: ${money(total)}`;
        message.textContent = 'Đã lưu chia tiền theo đội.';
      } catch (error) {
        message.textContent = error.message;
      } finally {
        controls.forEach(control => { control.disabled = false; });
        refresh();
      }
    };
  };
})();
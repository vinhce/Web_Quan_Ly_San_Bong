// =========================================================
// 5. QUẢN LÝ TÀI KHOẢN NHÂN VIÊN TRỰC SÂN (TAB 9 - CHỦ SÂN)
// =========================================================
// [hoisted to admin.js]
// [hoisted to admin.js]

function getDefaultStaffList() {
  return [
    {
      id: 4,
      username: 'nhanvien',
      email: 'nhanvien@sanbongpro.vn',
      phone: '0352000111',
      full_name: 'Nhân Viên Trực Sân Ca 1',
      role: 'staff',
      status: 'active',
      created_at: '2026-11-10 08:00:00'
    }
  ];
}

function getLocalStaffUsers() {
  try {
    const raw = localStorage.getItem(STAFF_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return getDefaultStaffList();
}

function saveLocalStaffUsers(list) {
  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(Array.isArray(list) ? list : []));
  } catch (e) {}
}

async function loadStaffUsers(silent = true) {
  if (!isOwnerAdmin()) return;

  const r = await adminFetchJson('../api/admin.php?action=staff_users');
  if (r.ok && Array.isArray(r.data)) {
    cachedStaffUsers = r.data;
    saveLocalStaffUsers(cachedStaffUsers);
    renderStaffUsers(cachedStaffUsers);
    return;
  }

  cachedStaffUsers = getLocalStaffUsers();
  renderStaffUsers(cachedStaffUsers);
  if (!silent && window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || 'Không thể tải danh sách nhân sự!', 'error');
  }
}

function renderStaffUsers(list) {
  if (!isOwnerAdmin()) return;

  const staffList = Array.isArray(list) ? list : cachedStaffUsers;
  const countBadge = document.getElementById('staff-count-badge');
  if (countBadge) {
    countBadge.textContent = `${staffList.length} nhân sự`;
  }

  const tbody = document.getElementById('admin-staff-tbody');
  if (!tbody) return;

  const thEls = Array.from(tbody.closest('table')?.querySelectorAll('thead th') || []);
  const colCount = thEls.length || 5;
  const headerTexts = thEls.map(th => (th.textContent || '').trim().toLowerCase());
  const hasRoleCol = headerTexts.some(t => t.includes('vai trò'));

  if (staffList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${colCount}" class="py-8 text-center text-xs text-[#64748B]">
          Chưa có tài khoản nhân sự nào. Hãy tạo tài khoản mới ở biểu mẫu phía trên.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = staffList.map(u => {
    const staffId = Number(u.id) || 0;
    const rawUsername = String(u.username || '');
    const safeJsUsername = rawUsername.replace(/[^a-zA-Z0-9_]/g, '');
    const safeUsername = escapeSearchHTML(rawUsername);
    const safeFullName = escapeSearchHTML(u.full_name || '');
    const safePhone = escapeSearchHTML(u.phone || '');
    const safeEmail = escapeSearchHTML(u.email || `${rawUsername.toLowerCase()}@sanbongpro.vn`);
    const uRole = String(u.role || 'staff').toLowerCase() === 'manager' ? 'manager' : 'staff';
    const isLocked = (u.status || 'active') === 'locked';

    const roleBadge = uRole === 'manager'
      ? '<span class="px-2 py-0.5 rounded-full bg-purple-100 text-[#7C3AED] border border-purple-200 text-[10px] font-bold whitespace-nowrap">🛡️ Manager</span>'
      : '<span class="px-2 py-0.5 rounded-full bg-blue-100 text-[#2563EB] border border-blue-200 text-[10px] font-bold whitespace-nowrap">🏟️ Staff</span>';

    const roleCellHtml = `
      <div class="space-y-1">
        <div>${roleBadge}</div>
        <select onchange="handleChangeStaffRole(${staffId}, this.value)" aria-label="Đổi vai trò nhân sự" class="h-7 px-2 rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-[#0F172A] cursor-pointer">
          <option value="staff" ${uRole === 'staff' ? 'selected' : ''}>Staff (Trực ca)</option>
          <option value="manager" ${uRole === 'manager' ? 'selected' : ''}>Manager (Quản lý)</option>
        </select>
      </div>
    `;

    const statusBadge = isLocked
      ? '<span class="px-2.5 py-0.5 rounded-full bg-red-100 text-[#DC2626] text-[11px] font-bold whitespace-nowrap">Đã khóa</span>'
      : '<span class="px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A] text-[11px] font-bold whitespace-nowrap">Đang hoạt động</span>';

    const toggleBtnLabel = isLocked ? '🔓 Mở khóa' : '🔒 Khóa';
    const toggleBtnClass = isLocked
      ? 'px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200 cursor-pointer whitespace-nowrap'
      : 'px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] border border-red-200 cursor-pointer whitespace-nowrap';

    const actionHtml = `
      <div class="inline-flex items-center justify-end gap-1.5 flex-wrap">
        <button type="button" onclick="openResetStaffPwModal(${staffId}, '${safeJsUsername}')" class="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 cursor-pointer whitespace-nowrap">🔑 Đổi MK</button>
        <button type="button" onclick="handleToggleStaffStatus(${staffId})" class="${toggleBtnClass}">${toggleBtnLabel}</button>
      </div>
    `;

    if (colCount === 5 && hasRoleCol) {
      return `
        <tr class="hover:bg-slate-50 transition-colors ${isLocked ? 'opacity-70 bg-rose-50/30' : ''}">
          <td class="py-3 px-4">
            <div class="font-mono font-bold text-[#0F172A]">@${safeUsername}</div>
            <div class="text-[11px] text-[#64748B]">${safeEmail}</div>
          </td>
          <td class="py-3 px-4">
            <div class="font-bold text-[#0F172A]">${safeFullName}</div>
            <div class="font-mono text-[11px] text-[#475569]">${safePhone}</div>
          </td>
          <td class="py-3 px-4">${roleCellHtml}</td>
          <td class="py-3 px-4">${statusBadge}</td>
          <td class="py-3 px-4 text-right">${actionHtml}</td>
        </tr>
      `;
    }

    return `
      <tr class="hover:bg-slate-50 transition-colors ${isLocked ? 'opacity-70 bg-rose-50/30' : ''}">
        <td class="py-3 px-4">
          <div class="font-mono font-bold text-[#0F172A]">@${safeUsername}</div>
          <div class="text-[11px] text-[#64748B]">${safeEmail}</div>
        </td>
        <td class="py-3 px-4">
          <div class="font-bold text-[#0F172A]">${safeFullName}</div>
          <div class="font-mono text-[11px] text-[#475569]">${safePhone}</div>
          <div class="mt-1">${roleBadge}</div>
        </td>
        <td class="py-3 px-4">${statusBadge}</td>
        <td class="py-3 px-4 text-right">${actionHtml}</td>
      </tr>
    `;
  }).join('');
}

async function handleCreateStaff(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền tạo tài khoản nhân sự!', 'error');
    return;
  }

  const form = (e && e.target && e.target.tagName === 'FORM') ? e.target : (document.getElementById('admin-create-staff-form') || document.getElementById('staff-create-form'));
  const usernameEl = document.getElementById('staff-username') || document.getElementById('new-staff-username') || form?.querySelector('[name="username"]');
  const fullNameEl = document.getElementById('staff-fullname') || document.getElementById('staff-full-name') || document.getElementById('new-staff-fullname') || document.getElementById('staff-name') || form?.querySelector('[name="full_name"], [name="fullname"]');
  const phoneEl = document.getElementById('staff-phone') || document.getElementById('new-staff-phone') || form?.querySelector('[name="phone"]');
  const passwordEl = document.getElementById('staff-password') || document.getElementById('new-staff-password') || document.getElementById('staff-pw') || form?.querySelector('[name="password"]');
  const roleEl = document.getElementById('staff-role') || form?.querySelector('[name="role"]');
  const submitBtn = document.getElementById('staff-create-submit-btn') || document.getElementById('staff-create-btn') || document.getElementById('staff-submit-btn') || form?.querySelector('button[type="submit"]');

  const username = (usernameEl?.value || '').trim();
  const fullName = (fullNameEl?.value || '').trim();
  const phone = (phoneEl?.value || '').replace(/\s+/g, '');
  const password = String(passwordEl?.value || '');
  const role = (roleEl?.value === 'manager') ? 'manager' : 'staff';

  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Tên đăng nhập phải từ 3–30 ký tự (chữ cái, số, dấu gạch dưới _).', 'warning');
    return;
  }
  if (!fullName) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập họ và tên nhân sự.', 'warning');
    return;
  }
  if (!/^(0[3|5|7|8|9])[0-9]{8}$/.test(phone)) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Số điện thoại nhân sự phải đủ 10 số di động Việt Nam.', 'warning');
    return;
  }
  if (password.length < 8) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Mật khẩu nhân sự phải có tối thiểu 8 ký tự.', 'warning');
    return;
  }

  const origText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Đang tạo tài khoản...';
  }

  try {
    const r = await adminFetchJson('../api/admin.php?action=staff_users', {
      method: 'POST',
      body: JSON.stringify({
        sub_action: 'create',
        username,
        full_name: fullName,
        phone,
        password,
        role
      })
    });

    if (r.ok) {
      if (form && typeof form.reset === 'function') form.reset();
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(`✓ ${r.message || 'Đã tạo tài khoản nhân sự thành công!'}`, 'success', 3500);
      }
      await loadStaffUsers();
      return;
    }

    if (r.status > 0) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || 'Không thể tạo tài khoản nhân sự.', 'error', 3500);
      }
      return;
    }

    // Offline network fallback (status === 0)
    const localList = getLocalStaffUsers();
    if (localList.some(u => String(u.username || '').toLowerCase() === username.toLowerCase())) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast('Tên đăng nhập này đã tồn tại trên hệ thống.', 'error');
      }
      return;
    }
    const nowLocal = new Date();
    const pad2 = n => String(n).padStart(2, '0');
    const createdLocal = `${nowLocal.getFullYear()}-${pad2(nowLocal.getMonth() + 1)}-${pad2(nowLocal.getDate())} ${pad2(nowLocal.getHours())}:${pad2(nowLocal.getMinutes())}:${pad2(nowLocal.getSeconds())}`;
    const newStaff = {
      id: Date.now(),
      username,
      email: `${username.toLowerCase()}@sanbongpro.vn`,
      phone,
      full_name: fullName,
      role,
      status: 'active',
      created_at: createdLocal
    };
    localList.unshift(newStaff);
    saveLocalStaffUsers(localList);
    cachedStaffUsers = localList;
    renderStaffUsers(cachedStaffUsers);
    if (form && typeof form.reset === 'function') form.reset();
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`✓ Đã tạo tài khoản ${role === 'manager' ? 'Quản lý sân' : 'Nhân viên trực'} ${username} (offline)!`, 'success', 3500);
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origText;
    }
  }
}

async function handleChangeStaffRole(userId, newRole) {
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền đổi vai trò nhân sự!', 'error');
    return;
  }

  const staffId = Number(userId);
  const role = (newRole === 'manager') ? 'manager' : 'staff';
  if (!staffId) return;

  const r = await adminFetchJson('../api/admin.php?action=staff_users', {
    method: 'POST',
    body: JSON.stringify({ sub_action: 'update_role', id: staffId, role })
  });

  if (r.ok) {
    const localList = cachedStaffUsers.length > 0 ? [...cachedStaffUsers] : getLocalStaffUsers();
    const target = localList.find(u => Number(u.id) === staffId);
    if (target) {
      target.role = role;
      saveLocalStaffUsers(localList);
    }
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`✓ ${r.message || 'Đã cập nhật vai trò nhân sự thành công!'}`, 'success', 3000);
    }
    await loadStaffUsers();
    return;
  }

  if (r.status > 0) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể cập nhật vai trò nhân sự.', 'error');
    }
    renderStaffUsers(cachedStaffUsers);
    return;
  }

  const localList = cachedStaffUsers.length > 0 ? [...cachedStaffUsers] : getLocalStaffUsers();
  const target = localList.find(u => Number(u.id) === staffId);
  if (target) {
    target.role = role;
    saveLocalStaffUsers(localList);
    cachedStaffUsers = localList;
    renderStaffUsers(cachedStaffUsers);
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(
        `✓ Đã chuyển vai trò @${target.username} sang ${role === 'manager' ? 'Quản lý sân (Manager)' : 'Nhân viên trực (Staff)'}.`,
        'success',
        3000
      );
    }
  }
}
window.handleChangeStaffRole = handleChangeStaffRole;

async function handleToggleStaffStatus(id) {
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền khóa/mở khóa nhân viên!', 'error');
    return;
  }

  const staffId = Number(id);
  if (!staffId) return;

  const r = await adminFetchJson('../api/admin.php?action=staff_users', {
    method: 'POST',
    body: JSON.stringify({ sub_action: 'toggle_status', id: staffId })
  });

  if (r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`✓ ${r.message || 'Đã cập nhật trạng thái nhân viên.'}`, 'success', 3000);
    }
    await loadStaffUsers();
    return;
  }

  if (r.status > 0) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể cập nhật trạng thái nhân viên.', 'error');
    }
    return;
  }

  const localList = cachedStaffUsers.length > 0 ? [...cachedStaffUsers] : getLocalStaffUsers();
  const target = localList.find(u => Number(u.id) === staffId);
  if (target) {
    target.status = target.status === 'locked' ? 'active' : 'locked';
    saveLocalStaffUsers(localList);
    cachedStaffUsers = localList;
    renderStaffUsers(cachedStaffUsers);
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(
        target.status === 'locked'
          ? `🔒 Đã khóa tài khoản nhân viên ${target.username}.`
          : `🔓 Đã mở khóa tài khoản nhân viên ${target.username}.`,
        'info',
        3000
      );
    }
  }
}

function openResetStaffPwModal(id, username) {
  if (!isOwnerAdmin()) return;

  const modal = document.getElementById('staff-reset-pw-modal');
  const idEl = document.getElementById('reset-staff-id');
  const labelEl = document.getElementById('reset-staff-username-label');
  const pwEl = document.getElementById('reset-staff-new-pw');

  if (idEl) idEl.value = String(id || '');
  if (labelEl) labelEl.textContent = username || '';
  if (pwEl) pwEl.value = '';

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (pwEl) setTimeout(() => pwEl.focus(), 100);
  }
}

function closeResetStaffPwModal() {
  const modal = document.getElementById('staff-reset-pw-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

async function submitResetStaffPassword(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền đặt lại mật khẩu nhân viên!', 'error');
    return;
  }

  const form = (e && e.target && e.target.tagName === 'FORM') ? e.target : document.getElementById('staff-reset-pw-modal')?.querySelector('form');
  const id = Number(document.getElementById('reset-staff-id')?.value || '0');
  const password = String(document.getElementById('reset-staff-new-pw')?.value || '');
  const submitBtn = document.getElementById('reset-staff-submit-btn') || form?.querySelector('button[type="submit"]');

  if (!id) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Không xác định được tài khoản nhân viên.', 'error');
    return;
  }
  if (password.length < 8) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Mật khẩu mới phải có tối thiểu 8 ký tự!', 'warning');
    return;
  }

  const origText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Đang cập nhật...';
  }

  try {
    const r = await adminFetchJson('../api/admin.php?action=staff_users', {
      method: 'POST',
      body: JSON.stringify({ sub_action: 'reset_password', id, password })
    });

    if (r.ok) {
      closeResetStaffPwModal();
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(`✓ ${r.message || 'Đã đặt lại mật khẩu nhân viên thành công!'}`, 'success', 3500);
      }
      return;
    }

    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể đặt lại mật khẩu nhân viên.', 'error');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origText;
    }
  }
}

window.loadStaffUsers = loadStaffUsers;
window.renderStaffUsers = renderStaffUsers;
window.handleCreateStaff = handleCreateStaff;
window.handleToggleStaffStatus = handleToggleStaffStatus;
window.openResetStaffPwModal = openResetStaffPwModal;
window.closeResetStaffPwModal = closeResetStaffPwModal;
window.submitResetStaffPassword = submitResetStaffPassword;


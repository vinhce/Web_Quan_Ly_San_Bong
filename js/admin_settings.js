async function loadAdminSettings() {
  if (!isManagerOrAdmin()) return;
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  let cfg = db.getSystemConfig ? db.getSystemConfig() : {
    depositRate: 30,
    hotline: '0352 313 548',
    openHours: '05:30 - 23:00 hàng ngày (kể cả Lễ, Tết)',
    holdMinutes: 15,
    waitlistHoldMinutes: 15,
    matchmakingEnabled: true,
    matchmakingRequireApproval: false,
    refundFullHours: 24,
    refundPartialHours: 4,
    autoCancelEnabled: true,
    reminderEnabled: false,
    reminderHoursBefore: 2,
    customerNotifyEnabled: false,
    customerNotifyWebhook: '',
    bookingConfirmTemplate: '',
    reminderTemplate: '',
    telegramNotifyEnabled: false,
    telegramBotTokenConfigured: false,
    telegramChatId: '',
    telegramEvents: {}
  };

  let bank = {};
  try {
    bank = JSON.parse(localStorage.getItem('sb_bank_v1') || '{}');
  } catch (e) {}

  const r = await adminFetchJson('../api/admin.php?action=settings');
  if (r.ok && r.data) {
    const sRoot = r.data;
    const s = (sRoot.settings && typeof sRoot.settings === 'object') ? sRoot.settings : sRoot;
    const bInfo = (sRoot.bankInfo && typeof sRoot.bankInfo === 'object') ? sRoot.bankInfo : sRoot;
    const autoRaw = s.autoCancelEnabled ?? s.auto_cancel_enabled;
    const boolVal = (val, def = false) => val === undefined ? def : (val === true || val === 1 || val === '1' || val === 'true');
    const evObj = (s.telegramEvents && typeof s.telegramEvents === 'object') ? s.telegramEvents : {};
    const tokenConfigured = Boolean(
      s.telegramBotTokenConfigured ||
      (s.telegramBotToken && String(s.telegramBotToken).trim() !== '')
    );

    cfg = {
      depositRate: Number(s.depositRate ?? s.deposit_rate ?? cfg.depositRate ?? 30),
      hotline: s.hotline || cfg.hotline || '0352 313 548',
      openHours: s.openHours || s.open_hours || cfg.openHours || '05:30 - 23:00 hàng ngày (kể cả Lễ, Tết)',
      holdMinutes: Math.max(5, Math.min(120, Number(s.holdMinutes ?? s.hold_minutes ?? cfg.holdMinutes ?? 15))),
      waitlistHoldMinutes: Math.max(5, Math.min(120, Number(s.waitlistHoldMinutes ?? s.waitlist_hold_minutes ?? cfg.waitlistHoldMinutes ?? 15))),
      matchmakingEnabled: boolVal(s.matchmakingEnabled ?? s.matchmaking_enabled, true),
      matchmakingRequireApproval: boolVal(s.matchmakingRequireApproval ?? s.matchmaking_require_approval, false),
      refundFullHours: Math.max(1, Math.min(168, Number(s.refundFullHours ?? s.refund_full_hours ?? cfg.refundFullHours ?? 24))),
      refundPartialHours: Math.max(0, Math.min(48, Number(s.refundPartialHours ?? s.refund_partial_hours ?? cfg.refundPartialHours ?? 4))),
      autoCancelEnabled: boolVal(autoRaw, cfg.autoCancelEnabled !== false),
      reminderEnabled: boolVal(s.reminderEnabled ?? s.reminder_enabled, false),
      reminderHoursBefore: Math.max(1, Math.min(24, Number(s.reminderHoursBefore ?? s.reminder_hours_before ?? 2))),
      customerNotifyEnabled: boolVal(s.customerNotifyEnabled ?? s.customer_notify_enabled, false),
      customerNotifyWebhook: String(s.customerNotifyWebhook ?? s.customer_notify_webhook ?? ''),
      bookingConfirmTemplate: String(s.bookingConfirmTemplate ?? s.booking_confirm_template ?? ''),
      reminderTemplate: String(s.reminderTemplate ?? s.reminder_template ?? ''),
      telegramNotifyEnabled: boolVal(s.telegramNotifyEnabled ?? s.telegram_notify_enabled, false),
      telegramBotTokenConfigured: tokenConfigured,
      telegramChatId: String(s.telegramChatId ?? s.telegram_chat_id ?? ''),
      telegramEvents: evObj
    };
    const acc = bInfo.accountNo || bInfo.accountNumber || bInfo.account_no || bank.accountNo || bank.accountNumber || '0123456789';
    bank = {
      bankName: bInfo.bankName || bInfo.bank_name || bank.bankName || 'Vietcombank',
      bankCode: (bInfo.bankCode || bInfo.bank_code || bank.bankCode || 'VCB').toUpperCase(),
      accountNo: acc,
      accountNumber: acc,
      accountName: (bInfo.accountName || bInfo.account_holder || bank.accountName || 'CONG TY CP SAN BONG PRO').toUpperCase()
    };
    const safeCfgForStorage = Object.assign({}, cfg);
    delete safeCfgForStorage.telegramBotToken;
    try {
      localStorage.setItem('sb_system_config', JSON.stringify(safeCfgForStorage));
      localStorage.setItem('sb_bank_v1', JSON.stringify(bank));
    } catch (e) {}
  }

  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  const setChk = (id, v) => { const el = document.getElementById(id); if (el) el.checked = Boolean(v); };

  setVal('cfg-deposit-rate', cfg.depositRate || 30);
  setVal('cfg-bank-name', bank.bankName || 'Vietcombank');
  setVal('cfg-bank-code', bank.bankCode || 'VCB');
  setVal('cfg-bank-acc', bank.accountNo || bank.accountNumber || '0123456789');
  setVal('cfg-bank-holder', bank.accountName || 'CONG TY CP SAN BONG PRO');
  setVal('cfg-hotline', cfg.hotline || '0352 313 548');
  setVal('cfg-open-hours', cfg.openHours || '05:30 - 23:00 hàng ngày (kể cả Lễ, Tết)');
  setVal('cfg-hold-minutes', cfg.holdMinutes ?? 15);
  setVal('cfg-refund-full-hours', cfg.refundFullHours ?? 24);
  setVal('cfg-refund-partial-hours', cfg.refundPartialHours ?? 4);
  setChk('cfg-auto-cancel-enabled', cfg.autoCancelEnabled !== false);

  setVal('cfg-waitlist-hold-minutes', cfg.waitlistHoldMinutes ?? 15);
  setChk('cfg-matchmaking-enabled', cfg.matchmakingEnabled !== false);
  setChk('cfg-matchmaking-require-approval', Boolean(cfg.matchmakingRequireApproval));

  setChk('cfg-reminder-enabled', Boolean(cfg.reminderEnabled));
  setVal('cfg-reminder-hours-before', cfg.reminderHoursBefore ?? 2);
  setChk('cfg-customer-notify-enabled', Boolean(cfg.customerNotifyEnabled));
  setVal('cfg-customer-notify-webhook', cfg.customerNotifyWebhook || '');
  setVal('cfg-booking-confirm-template', cfg.bookingConfirmTemplate || '');
  setVal('cfg-reminder-template', cfg.reminderTemplate || '');

  setChk('cfg-tg-notify-enabled', Boolean(cfg.telegramNotifyEnabled));
  setVal('cfg-tg-chat-id', cfg.telegramChatId || '');
  // Bảo mật: không điền token thật hoặc '********' vào input token
  setVal('cfg-tg-bot-token', '');
  setChk('cfg-tg-clear-token', false);

  const tokenBadge = document.getElementById('tg-token-status-badge');
  if (tokenBadge) {
    if (cfg.telegramBotTokenConfigured) {
      tokenBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700';
      tokenBadge.textContent = '✓ Đã cấu hình Token';
    } else {
      tokenBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600';
      tokenBadge.textContent = 'Chưa cấu hình Token';
    }
  }

  const tgEventsList = ['new_booking', 'cancel', 'shift_diff', 'unmatched_tx', 'low_stock', 'waitlist', 'matchmaking', 'review'];
  const evMap = cfg.telegramEvents || {};
  tgEventsList.forEach(ev => {
    const val = evMap[ev] !== undefined ? Boolean(evMap[ev]) : false;
    const elExact = document.getElementById(`cfg-tg-ev-${ev}`);
    if (elExact) elExact.checked = val;
    const elKebab = document.getElementById(`cfg-tg-ev-${ev.replace(/_/g, '-')}`);
    if (elKebab && elKebab !== elExact) elKebab.checked = val;
  });

  const isAdmin = isOwnerAdmin();
  const notice = document.getElementById('settings-role-notice');
  if (notice) {
    if (isAdmin) notice.classList.add('hidden');
    else notice.classList.remove('hidden');
  }

  const formFields = document.querySelectorAll('#admin-settings-form input, #admin-settings-form select, #admin-settings-form textarea');
  formFields.forEach(f => {
    f.disabled = !isAdmin;
  });

  const saveBtn = document.querySelector('#admin-settings-form button[type="submit"]');
  if (saveBtn) {
    saveBtn.disabled = !isAdmin;
    if (!isAdmin) {
      saveBtn.className = 'btn-base bg-slate-200 text-slate-400 text-xs font-bold px-5 cursor-not-allowed';
      saveBtn.title = 'Chỉ Chủ sân (Admin) mới có quyền lưu cấu hình hệ thống & VietQR';
    } else {
      saveBtn.className = 'btn-base btn-primary text-xs font-bold px-5 cursor-pointer';
      saveBtn.title = '';
    }
  }
}

async function saveAdminSettings(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền thay đổi cài đặt hệ thống!', 'error');
    return;
  }

  const depositRate = Math.max(10, Math.min(100, parseInt(document.getElementById('cfg-deposit-rate')?.value || '30', 10) || 30));
  const bankName = (document.getElementById('cfg-bank-name')?.value || 'Vietcombank').trim();
  const bankCode = (document.getElementById('cfg-bank-code')?.value || 'VCB').trim().toUpperCase();
  const accountNo = (document.getElementById('cfg-bank-acc')?.value || '0123456789').trim();
  const accountName = (document.getElementById('cfg-bank-holder')?.value || 'CONG TY CP SAN BONG PRO').trim().toUpperCase();
  const hotline = (document.getElementById('cfg-hotline')?.value || '0352 313 548').trim();
  const openHours = (document.getElementById('cfg-open-hours')?.value || '05:30 - 23:00').trim();
  const holdMinutes = Math.max(5, Math.min(120, parseInt(document.getElementById('cfg-hold-minutes')?.value || '15', 10) || 15));
  const waitlistHoldMinutes = Math.max(5, Math.min(120, parseInt(document.getElementById('cfg-waitlist-hold-minutes')?.value || '15', 10) || 15));
  const matchmakingEnabled = Boolean(document.getElementById('cfg-matchmaking-enabled')?.checked ?? true);
  const matchmakingRequireApproval = Boolean(document.getElementById('cfg-matchmaking-require-approval')?.checked ?? false);
  const refundFullHours = Math.max(1, Math.min(168, parseInt(document.getElementById('cfg-refund-full-hours')?.value || '24', 10) || 24));
  const rawPartial = parseInt(document.getElementById('cfg-refund-partial-hours')?.value || '4', 10);
  const refundPartialHours = Math.max(0, Math.min(48, isNaN(rawPartial) ? 4 : rawPartial));
  const autoCancelEnabled = Boolean(document.getElementById('cfg-auto-cancel-enabled')?.checked ?? true);

  const reminderEnabled = Boolean(document.getElementById('cfg-reminder-enabled')?.checked ?? false);
  const reminderHoursBefore = Math.max(1, Math.min(24, parseInt(document.getElementById('cfg-reminder-hours-before')?.value || '2', 10) || 2));
  const customerNotifyEnabled = Boolean(document.getElementById('cfg-customer-notify-enabled')?.checked ?? false);
  const customerNotifyWebhook = (document.getElementById('cfg-customer-notify-webhook')?.value || '').trim();
  const bookingConfirmTemplate = (document.getElementById('cfg-booking-confirm-template')?.value || '').trim();
  const reminderTemplate = (document.getElementById('cfg-reminder-template')?.value || '').trim();

  const telegramNotifyEnabled = Boolean(document.getElementById('cfg-tg-notify-enabled')?.checked ?? false);
  const telegramChatId = (document.getElementById('cfg-tg-chat-id')?.value || '').trim();
  const rawNewToken = (document.getElementById('cfg-tg-bot-token')?.value || '').trim();
  const clearTelegramBotToken = Boolean(document.getElementById('cfg-tg-clear-token')?.checked ?? false);

  const telegramEvents = {};
  ['new_booking', 'cancel', 'shift_diff', 'unmatched_tx', 'low_stock', 'waitlist', 'matchmaking', 'review'].forEach(ev => {
    const el = document.getElementById(`cfg-tg-ev-${ev}`) || document.getElementById(`cfg-tg-ev-${ev.replace(/_/g, '-')}`);
    telegramEvents[ev] = Boolean(el?.checked);
  });

  if (refundPartialHours >= refundFullHours) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Mốc sát giờ không hoàn cọc phải nhỏ hơn mốc hoàn 100% cọc!', 'warning', 3500);
    }
    return;
  }

  const payload = {
    depositRate,
    holdMinutes,
    waitlistHoldMinutes,
    matchmakingEnabled,
    matchmakingRequireApproval,
    refundFullHours,
    refundPartialHours,
    autoCancelEnabled,
    hold_minutes: holdMinutes,
    refund_full_hours: refundFullHours,
    refund_partial_hours: refundPartialHours,
    auto_cancel_enabled: autoCancelEnabled ? 1 : 0,
    bankName,
    bankCode,
    accountNo,
    accountNumber: accountNo,
    accountName,
    hotline,
    openHours,
    reminderEnabled,
    reminderHoursBefore,
    customerNotifyEnabled,
    customerNotifyWebhook,
    bookingConfirmTemplate,
    reminderTemplate,
    telegramNotifyEnabled,
    telegramChatId,
    telegramEvents,
    clearTelegramBotToken
  };

  if (!clearTelegramBotToken && rawNewToken && !/^\*+$/.test(rawNewToken)) {
    payload.telegramBotToken = rawNewToken;
  }

  const r = await adminFetchJson('../api/admin.php?action=settings', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (!r || !r.ok || !r.json || r.json.success !== true) {
    if (r?.ref_code === 'ERR_UNSAFE_WEBHOOK_URL') {
      const whEl = document.getElementById('cfg-customer-notify-webhook');
      if (whEl) whEl.focus();
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || 'URL Webhook không hợp lệ hoặc bị chặn bảo mật SSRF!', 'error', 5000);
      }
      return;
    }
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r?.message || 'Không thể lưu cài đặt hệ thống lên máy chủ!', 'error', 4000);
    }
    return;
  }

  const cfg = {
    depositRate,
    hotline,
    openHours,
    holdMinutes,
    waitlistHoldMinutes,
    matchmakingEnabled,
    matchmakingRequireApproval,
    refundFullHours,
    refundPartialHours,
    autoCancelEnabled,
    reminderEnabled,
    reminderHoursBefore,
    customerNotifyEnabled,
    customerNotifyWebhook,
    bookingConfirmTemplate,
    reminderTemplate,
    telegramNotifyEnabled,
    telegramChatId,
    telegramEvents
  };
  const bank = { bankName, bankCode, accountNo, accountNumber: accountNo, accountName };

  try {
    localStorage.setItem('sb_system_config', JSON.stringify(cfg));
    localStorage.setItem('sb_bank_v1', JSON.stringify(bank));
  } catch (err) {
    console.error('Lỗi lưu cài đặt:', err);
  }

  await loadAdminSettings();
  window.dispatchEvent(new CustomEvent('sb-data-synced', { detail: { bankInfo: bank, settings: cfg } }));

  if (r?.json?.has_changed === false || r?.json?.hasChanged === false) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Không có thay đổi để lưu (cài đặt giữ nguyên).', 'info', 3000);
    }
  } else if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast('✓ Đã lưu cài đặt hệ thống, chính sách cọc, thông báo & cấu hình VietQR thành công!', 'success', 3500);
  }
}

async function testTelegramConnection() {
  if (!isOwnerAdmin()) return;
  const btn = document.getElementById('btn-test-telegram');
  const orig = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang gửi thử...';
  }
  try {
    const r = await adminFetchJson('../api/admin.php?action=test_telegram', {
      method: 'POST',
      body: JSON.stringify({})
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Gửi tin thử Telegram thất bại!', 'error', 4500);
      return;
    }
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã gửi tin nhắn thử tới Telegram Chủ sân!', 'success', 4000);
    await loadNotificationLogs();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  }
}
window.testTelegramConnection = testTelegramConnection;


async function loadNotificationLogs() {
  if (!isManagerOrAdmin()) return;
  const tbody = document.getElementById('admin-notif-logs-tbody');
  if (!tbody) return;

  const channel = document.getElementById('notif-filter-channel')?.value || 'all';
  const status = document.getElementById('notif-filter-status')?.value || 'all';
  const search = (document.getElementById('notif-filter-search')?.value || '').trim();

  const qs = new URLSearchParams({ action: 'notification_logs', channel, status, search });
  const r = await adminFetchJson(`../api/admin.php?${qs.toString()}`);
  if (!r.ok) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-5 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải nhật ký thông báo.')}</td></tr>`;
    return;
  }

  const summary = r.data?.summary || {};
  const sentEl = document.getElementById('notif-sent-count');
  const failEl = document.getElementById('notif-failed-count');
  if (sentEl) sentEl.textContent = `${Number(summary.sent || 0)} Đã gửi`;
  if (failEl) failEl.textContent = `${Number(summary.failed || 0)} Thất bại`;

  const logs = Array.isArray(r.data?.logs) ? r.data.logs : [];
  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-[#94A3B8]">Chưa có nhật ký gửi thông báo nào.</td></tr>';
    return;
  }

  const stBadge = {
    sent: '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">Đã gửi</span>',
    failed: '<span class="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">Thất bại</span>',
    pending: '<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">Đang chờ</span>'
  };

  tbody.innerHTML = logs.map(n => {
    const ch = String(n.channel || 'system').toUpperCase();
    return `<tr class="hover:bg-slate-50/70">
      <td class="py-2.5 px-3 font-mono text-[11px] text-[#475569] whitespace-nowrap">${escapeSearchHTML(n.created_at || '')}</td>
      <td class="py-2.5 px-3">
        <span class="px-2 py-0.5 rounded bg-slate-100 text-[#0F172A] font-bold text-[10px]">${escapeSearchHTML(ch)}</span>
        <div class="text-[10px] text-[#64748B] mt-0.5 font-mono">${escapeSearchHTML(n.event_type || '')}</div>
      </td>
      <td class="py-2.5 px-3">
        <div class="font-mono font-bold text-[#0F172A]">${n.booking_code ? '#' + escapeSearchHTML(n.booking_code) : '—'}</div>
        <div class="text-[11px] text-[#64748B]">${escapeSearchHTML(n.recipient || '—')}</div>
      </td>
      <td class="py-2.5 px-3 max-w-[280px]">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(n.title || '')}</div>
        <div class="text-[11px] text-[#475569] line-clamp-2">${escapeSearchHTML(n.message || '')}</div>
      </td>
      <td class="py-2.5 px-3">${stBadge[n.status] || escapeSearchHTML(n.status || '')}</td>
      <td class="py-2.5 px-3 text-[11px] text-[#64748B] max-w-[180px] truncate" title="${escapeSearchHTML(n.response_note || '')}">${escapeSearchHTML(n.response_note || '—')}</td>
    </tr>`;
  }).join('');
}
window.loadNotificationLogs = loadNotificationLogs;

async function loadBackupsList() {
  if (!isOwnerAdmin()) return;
  const tbody = document.getElementById('admin-backups-tbody');
  if (!tbody) return;

  const r = await adminFetchJson('../api/admin.php?action=list_backups');
  if (!r.ok || !Array.isArray(r.data)) {
    tbody.innerHTML = `<tr><td colspan="4" class="py-5 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách bản sao lưu.')}</td></tr>`;
    return;
  }

  if (r.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-[#94A3B8]">Chưa có bản sao lưu CSDL nào. Hãy bấm "Tạo bản sao lưu ngay".</td></tr>';
    return;
  }

  tbody.innerHTML = r.data.map(b => {
    const fname = b.filename || '';
    const sizeLabel = b.size_kb ? `${Number(b.size_kb).toFixed(1)} KB` : `${Math.round(Number(b.size || 0) / 1024)} KB`;
    return `<tr class="hover:bg-slate-50">
      <td class="py-3 px-4 font-mono font-bold text-[#0F172A]">${escapeSearchHTML(fname)}</td>
      <td class="py-3 px-4 font-semibold text-[#475569]">${escapeSearchHTML(sizeLabel)}</td>
      <td class="py-3 px-4 font-mono text-[#64748B]">${escapeSearchHTML(b.created_at || '')}</td>
      <td class="py-3 px-4 text-right">
        <button type="button" onclick="downloadBackupFile('${escapeJsAttr(fname)}')" class="px-3 py-1 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer">⬇️ Tải về</button>
      </td>
    </tr>`;
  }).join('');
}
window.loadBackupsList = loadBackupsList;

async function backupDatabaseNow() {
  if (!isOwnerAdmin()) return;
  const ok = await showAdminConfirm({
    title: '💾 Tạo bản sao lưu CSDL ngay',
    message: 'Hệ thống sẽ xuất toàn bộ dữ liệu hiện tại ra file sao lưu nén (.sql.gz / .sql) trên máy chủ. Tiếp tục?',
    confirmText: 'Sao lưu ngay',
    cancelText: 'Hủy'
  });
  if (!ok) return;

  const btn = document.getElementById('btn-backup-now');
  const orig = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang sao lưu...';
  }
  try {
    const r = await adminFetchJson('../api/admin.php?action=backup_database_now', {
      method: 'POST',
      body: JSON.stringify({})
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể tạo bản sao lưu CSDL!', 'error', 4000);
      return;
    }
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã tạo bản sao lưu CSDL thành công!', 'success', 4000);
    await loadBackupsList();
    if (typeof loadAdminLogs === 'function') loadAdminLogs(1);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  }
}
window.backupDatabaseNow = backupDatabaseNow;

function downloadBackupFile(filename) {
  if (!isOwnerAdmin() || !filename) return;
  const a = document.createElement('a');
  a.href = `../api/admin.php?action=download_backup&file=${encodeURIComponent(filename)}`;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
window.downloadBackupFile = downloadBackupFile;

async function runAutoReleaseNow() {
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền chạy quét nhả đơn quá hạn!', 'error');
    return;
  }

  const btn = document.getElementById('btn-run-auto-cancel-now');
  const origHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang quét đơn quá hạn...';
  }

  let releasedCount = 0;
  let serverMsg = '';
  let serverOk = false;

  const r = await adminFetchJson('../api/admin.php?action=run_auto_release', {
    method: 'POST',
    body: JSON.stringify({})
  });
  if (r.ok) {
    serverOk = true;
    releasedCount = Number(r.data?.released_count ?? r.data?.releasedCount ?? r.data?.released ?? r.json?.released_count ?? r.json?.released ?? 0);
    serverMsg = r.message || '';
  } else if (r.status > 0) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origHtml || '⚡ Quét nhả đơn quá hạn ngay';
    }
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể chạy quét đơn quá hạn!', 'error', 4000);
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  if (!serverOk && db) {
    const cfg = db.getSystemConfig ? db.getSystemConfig() : { holdMinutes: 15 };
    const holdMs = Math.max(5, Number(cfg.holdMinutes || 15)) * 60 * 1000;
    const allBookings = db.getAllBookings();
    let changed = false;
    allBookings.forEach(b => {
      const pSt = String(b.paymentStatus || '');
      const st = String(b.status || '');
      if (st !== 'Đã hủy' && st !== 'Hoàn thành' && st !== 'Đang đá' && (pSt === 'Chờ duyệt cọc' || pSt === 'Chờ cọc 30%')) {
        const createdMs = b.createdAt ? Date.parse(String(b.createdAt).replace(' ', 'T')) : NaN;
        if (!isNaN(createdMs) && (Date.now() - createdMs) > holdMs) {
          b.status = 'Đã hủy';
          b.paymentStatus = 'Đã hủy';
          b.remainingAmount = 0;
          b.note = (b.note ? b.note + ' | ' : '') + `[Tự động nhả đơn quá ${cfg.holdMinutes || 15}p chưa cọc]`;
          releasedCount++;
          changed = true;
        }
      }
    });
    if (changed) {
      try { localStorage.setItem('sb_bookings_v1', JSON.stringify(allBookings)); } catch (err) {}
      if (typeof db.addAuditLog === 'function') {
        db.addAuditLog('ADMIN_RUN_AUTO_RELEASE', 'SYSTEM', 'Quét đơn quá hạn chưa cọc', `Đã tự động nhả ${releasedCount} đơn quá hạn`);
      }
    }
  }

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = origHtml || '⚡ Quét nhả đơn quá hạn ngay';
  }

  refreshAllAdminViews();
  initQuickBookingForm();
  if (typeof loadAdminLogs === 'function') loadAdminLogs(1);

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(
      serverMsg || (releasedCount > 0
        ? `⚡ Đã quét và giải phóng ${releasedCount} đơn giữ chỗ quá hạn chưa cọc!`
        : '✓ Hệ thống sạch: Không có đơn giữ chỗ quá hạn nào cần nhả.'),
      releasedCount > 0 ? 'success' : 'info',
      4000
    );
  }
}
window.runAutoReleaseNow = runAutoReleaseNow;

window.renderAdminCustomers = renderAdminCustomers;
window.renderAdminReports = renderAdminReports;
window.loadAdminSettings = loadAdminSettings;
window.saveAdminSettings = saveAdminSettings;


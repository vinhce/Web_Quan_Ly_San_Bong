// [hoisted to admin.js]

async function runMatchRemindersNow() {
  if (!isOwnerAdmin()) return;
  const btn = document.getElementById('btn-run-reminders-now');
  const orig = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang gửi nhắc lịch...';
  }
  try {
    const r = await adminFetchJson('../api/admin.php?action=run_match_reminders', {
      method: 'POST',
      body: JSON.stringify({})
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể chạy nhắc lịch trước trận!', 'error', 4000);
      return;
    }
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã xử lý gửi nhắc lịch trước trận!', 'success', 4000);
    await loadNotificationLogs();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  }
}
window.runMatchRemindersNow = runMatchRemindersNow;

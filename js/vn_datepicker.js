(function () {
  'use strict';

  const TARGET_IDS = new Set([
    'search-date',
    'booking-date-input',
    'detail-schedule-date',
    'widget-date',
    'filter-date',
    'post-match-date',
    'rpt-from-date',
    'rpt-to-date',
    'exp-date',
    'edit-exp-date'
  ]);

  const ALLOW_PAST_IDS = new Set([
    'filter-date',
    'rpt-from-date',
    'rpt-to-date',
    'exp-date',
    'edit-exp-date'
  ]);

  const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const nativeValueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

  function getTodayISO() {
    if (window.SanBongApp && typeof window.SanBongApp.getLocalTodayISO === 'function') {
      return window.SanBongApp.getLocalTodayISO();
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function isoToDate(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    return dt;
  }

  function dateToISO(dt) {
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }

  function isoToVN(iso) {
    const dt = isoToDate(iso);
    if (!dt) return '';
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  }

  function vnToISO(vnStr) {
    const clean = String(vnStr || '').trim();
    const m = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (!m) return null;
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const y = parseInt(m[3], 10);
    if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return null;
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return dateToISO(dt);
  }

  function getNearestWeekendISO(todayISO) {
    const dt = isoToDate(todayISO) || new Date();
    const day = dt.getDay(); // 0=Sun..6=Sat
    const addDays = day === 6 ? 0 : (day === 0 ? 6 : (6 - day));
    dt.setDate(dt.getDate() + addDays);
    return dateToISO(dt);
  }

  function addDaysISO(baseISO, delta) {
    const dt = isoToDate(baseISO) || new Date();
    dt.setDate(dt.getDate() + delta);
    return dateToISO(dt);
  }

  function injectStyles() {
    if (document.getElementById('vn-dp-styles')) return;
    const style = document.createElement('style');
    style.id = 'vn-dp-styles';
    style.textContent = `
      .vn-dp-wrap { position: relative; display: block; width: 100%; }
      .vn-dp-field { position: relative; display: flex; align-items: center; width: 100%; }
      .vn-dp-text {
        width: 100%; min-height: 44px; padding-right: 44px !important;
        font-variant-numeric: tabular-nums;
      }
      .vn-dp-btn {
        position: absolute; right: 0; top: 0; bottom: 0; width: 44px; min-height: 44px;
        display: inline-flex; align-items: center; justify-content: center;
        background: transparent; border: none; color: #475569; cursor: pointer;
        border-radius: 0 0.5rem 0.5rem 0;
      }
      .vn-dp-btn:hover { color: #15803D; background: #ECFDF3; }
      .vn-dp-btn:focus-visible, .vn-dp-text:focus-visible, .vn-dp-popover button:focus-visible {
        outline: 2px solid #16A34A; outline-offset: 2px;
      }
      .vn-dp-popover {
        position: absolute; left: 0; top: calc(100% + 6px); z-index: 9999;
        width: 296px; max-width: calc(100vw - 24px);
        background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 0.75rem;
        box-shadow: 0 14px 36px -8px rgba(15, 23, 42, 0.22);
        padding: 12px; color: #0F172A; font-family: inherit;
      }
      .vn-dp-popover.vn-dp-align-right { left: auto; right: 0; }
      .vn-dp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
      .vn-dp-nav-btn {
        width: 36px; height: 36px; min-width: 36px; min-height: 36px;
        border-radius: 0.5rem; border: 1px solid #E2E8F0; background: #F8FAFC;
        color: #0F172A; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
      }
      .vn-dp-nav-btn:hover { background: #ECFDF3; color: #15803D; border-color: #86EFAC; }
      .vn-dp-title { font-size: 13px; font-weight: 800; color: #0F172A; }
      .vn-dp-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; text-align: center; }
      .vn-dp-wk { font-size: 11px; font-weight: 700; color: #64748B; padding: 4px 0; }
      .vn-dp-day {
        min-height: 36px; border-radius: 0.5rem; border: 1px solid transparent;
        background: transparent; color: #0F172A; font-size: 12px; font-weight: 600;
        cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
        font-variant-numeric: tabular-nums;
      }
      .vn-dp-day:hover:not(:disabled) { background: #ECFDF3; color: #15803D; border-color: #86EFAC; }
      .vn-dp-day.is-today { border-color: #16A34A; color: #15803D; font-weight: 800; }
      .vn-dp-day.is-selected { background: #16A34A !important; color: #FFFFFF !important; font-weight: 800; }
      .vn-dp-day:disabled { color: #CBD5E1; cursor: not-allowed; text-decoration: line-through; }
      .vn-dp-quick { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #F1F5F9; }
      .vn-dp-quick-btn {
        min-height: 36px; padding: 4px 6px; border-radius: 0.5rem;
        border: 1px solid #BBF7D0; background: #ECFDF3; color: #15803D;
        font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap;
      }
      .vn-dp-quick-btn:hover:not(:disabled) { background: #16A34A; color: #FFFFFF; border-color: #16A34A; }
      .vn-dp-quick-btn:disabled { opacity: 0.45; cursor: not-allowed; }
      .vn-dp-error { font-size: 11px; font-weight: 600; color: #DC2626; margin-top: 4px; }
      @media (max-width: 640px) {
        .vn-dp-day, .vn-dp-quick-btn, .vn-dp-nav-btn { min-height: 44px; }
      }
    `;
    document.head.appendChild(style);
  }

  let activePopoverCloser = null;

  function enhanceDateInput(origInput) {
    if (!origInput || origInput.dataset.vnDatepickerInit === '1') return;
    if (origInput.type !== 'date') return;

    injectStyles();
    origInput.dataset.vnDatepickerInit = '1';

    const allowPast = ALLOW_PAST_IDS.has(origInput.id) || origInput.dataset.allowPast === '1';
    const getMinISO = () => origInput.getAttribute('min') || (allowPast ? '' : getTodayISO());
    const getMaxISO = () => origInput.getAttribute('max') || '';

    const wrap = document.createElement('div');
    wrap.className = 'vn-dp-wrap';
    // Preserve compact width if input is inline inside admin flex bar
    if (origInput.id === 'rpt-from-date' || origInput.id === 'rpt-to-date') {
      wrap.style.width = '148px';
      wrap.style.display = 'inline-block';
    }

    const field = document.createElement('div');
    field.className = 'vn-dp-field';

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.inputMode = 'numeric';
    textInput.autocomplete = 'off';
    textInput.placeholder = 'dd/mm/yyyy';
    textInput.maxLength = 10;
    textInput.className = (origInput.className || 'input-field') + ' vn-dp-text';
    textInput.id = origInput.id ? `${origInput.id}-vn` : '';
    const linkedLabel = origInput.id ? document.querySelector(`label[for="${origInput.id}"]`) : null;
    const ariaLabel = origInput.getAttribute('aria-label') || (linkedLabel ? linkedLabel.textContent.trim() : 'Chọn ngày (dd/mm/yyyy)');
    textInput.setAttribute('aria-label', `${ariaLabel} (định dạng dd/mm/yyyy)`);
    textInput.setAttribute('aria-haspopup', 'dialog');
    textInput.setAttribute('aria-expanded', 'false');

    const calBtn = document.createElement('button');
    calBtn.type = 'button';
    calBtn.className = 'vn-dp-btn';
    calBtn.setAttribute('aria-label', `Mở lịch chọn ${ariaLabel}`);
    calBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';

    const errEl = document.createElement('div');
    errEl.className = 'vn-dp-error hidden';
    errEl.setAttribute('role', 'alert');

    const popover = document.createElement('div');
    popover.className = 'vn-dp-popover hidden';
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-label', `Lịch chọn ${ariaLabel}`);

    origInput.parentNode.insertBefore(wrap, origInput);
    field.appendChild(textInput);
    field.appendChild(calBtn);
    wrap.appendChild(field);
    wrap.appendChild(errEl);
    wrap.appendChild(popover);
    wrap.appendChild(origInput);

    origInput.style.position = 'absolute';
    origInput.style.width = '1px';
    origInput.style.height = '1px';
    origInput.style.opacity = '0';
    origInput.style.pointerEvents = 'none';
    origInput.tabIndex = -1;
    origInput.setAttribute('aria-hidden', 'true');

    const getOrigVal = () => nativeValueDescriptor.get.call(origInput);
    const setOrigVal = (v) => nativeValueDescriptor.set.call(origInput, v);

    let viewYear = new Date().getFullYear();
    let viewMonth = new Date().getMonth();

    function showError(msg) {
      if (!msg) {
        errEl.textContent = '';
        errEl.classList.add('hidden');
        textInput.removeAttribute('aria-invalid');
        textInput.classList.remove('border-rose-500');
        return;
      }
      errEl.textContent = msg;
      errEl.classList.remove('hidden');
      textInput.setAttribute('aria-invalid', 'true');
      textInput.classList.add('border-rose-500');
      if (window.SanBongApp && typeof window.SanBongApp.showToast === 'function') {
        window.SanBongApp.showToast(msg, 'warning');
      }
    }

    function syncDisplayFromOrig() {
      const iso = getOrigVal();
      textInput.value = iso ? isoToVN(iso) : '';
      const dt = isoToDate(iso);
      if (dt) {
        viewYear = dt.getFullYear();
        viewMonth = dt.getMonth();
      }
    }

    Object.defineProperty(origInput, 'value', {
      configurable: true,
      get() {
        return getOrigVal();
      },
      set(v) {
        setOrigVal(v);
        syncDisplayFromOrig();
      }
    });

    function commitISO(iso, fireEvents) {
      const minISO = getMinISO();
      const maxISO = getMaxISO();
      if (iso) {
        if (minISO && iso < minISO) {
          showError(`Không thể chọn ngày trước ${isoToVN(minISO)}.`);
          return false;
        }
        if (maxISO && iso > maxISO) {
          showError(`Chỉ hỗ trợ chọn tối đa đến ${isoToVN(maxISO)}.`);
          return false;
        }
      }
      showError('');
      setOrigVal(iso);
      syncDisplayFromOrig();
      if (fireEvents) {
        origInput.dispatchEvent(new Event('input', { bubbles: true }));
        origInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return true;
    }

    function renderCalendar() {
      const todayISO = getTodayISO();
      const selectedISO = getOrigVal();
      const minISO = getMinISO();
      const maxISO = getMaxISO();

      const firstDay = new Date(viewYear, viewMonth, 1);
      const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

      let daysHtml = '';
      for (let i = 0; i < startOffset; i++) {
        daysHtml += '<span></span>';
      }
      for (let d = 1; d <= daysInMonth; d++) {
        const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const disabled = (minISO && iso < minISO) || (maxISO && iso > maxISO);
        const cls = [
          'vn-dp-day',
          iso === todayISO ? 'is-today' : '',
          iso === selectedISO ? 'is-selected' : ''
        ].filter(Boolean).join(' ');
        daysHtml += `<button type="button" class="${cls}" data-iso="${iso}" ${disabled ? 'disabled aria-disabled="true"' : ''} aria-label="Ngày ${d} tháng ${viewMonth + 1} năm ${viewYear}">${d}</button>`;
      }

      const tomorrowISO = addDaysISO(todayISO, 1);
      const weekendISO = getNearestWeekendISO(todayISO);
      const isDis = (iso) => Boolean((minISO && iso < minISO) || (maxISO && iso > maxISO));

      popover.innerHTML = `
        <div class="vn-dp-header">
          <button type="button" class="vn-dp-nav-btn" data-nav="-1" aria-label="Tháng trước">‹</button>
          <span class="vn-dp-title">Tháng ${String(viewMonth + 1).padStart(2, '0')} / ${viewYear}</span>
          <button type="button" class="vn-dp-nav-btn" data-nav="1" aria-label="Tháng sau">›</button>
        </div>
        <div class="vn-dp-grid">
          ${WEEKDAYS.map(w => `<div class="vn-dp-wk">${w}</div>`).join('')}
          ${daysHtml}
        </div>
        <div class="vn-dp-quick">
          <button type="button" class="vn-dp-quick-btn" data-iso="${todayISO}" ${isDis(todayISO) ? 'disabled' : ''}>Hôm nay</button>
          <button type="button" class="vn-dp-quick-btn" data-iso="${tomorrowISO}" ${isDis(tomorrowISO) ? 'disabled' : ''}>Ngày mai</button>
          <button type="button" class="vn-dp-quick-btn" data-iso="${weekendISO}" ${isDis(weekendISO) ? 'disabled' : ''}>Cuối tuần</button>
        </div>
      `;
    }

    function closePopover(returnFocus) {
      popover.classList.add('hidden');
      textInput.setAttribute('aria-expanded', 'false');
      if (activePopoverCloser === closePopover) activePopoverCloser = null;
      if (returnFocus) textInput.focus();
    }

    function openPopover() {
      if (activePopoverCloser && activePopoverCloser !== closePopover) {
        activePopoverCloser(false);
      }
      const dt = isoToDate(getOrigVal()) || isoToDate(getTodayISO()) || new Date();
      viewYear = dt.getFullYear();
      viewMonth = dt.getMonth();
      renderCalendar();
      popover.classList.remove('hidden');
      popover.classList.remove('vn-dp-align-right');
      const rect = popover.getBoundingClientRect();
      if (rect.right > window.innerWidth - 8) {
        popover.classList.add('vn-dp-align-right');
      }
      textInput.setAttribute('aria-expanded', 'true');
      activePopoverCloser = closePopover;
    }

    popover.addEventListener('click', (e) => {
      const navBtn = e.target.closest('[data-nav]');
      if (navBtn) {
        const delta = parseInt(navBtn.getAttribute('data-nav'), 10);
        viewMonth += delta;
        if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
        if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
        renderCalendar();
        return;
      }
      const dayBtn = e.target.closest('[data-iso]');
      if (dayBtn && !dayBtn.disabled) {
        const iso = dayBtn.getAttribute('data-iso');
        if (commitISO(iso, true)) {
          closePopover(true);
        }
      }
    });

    calBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (popover.classList.contains('hidden')) openPopover();
      else closePopover(false);
    });

    textInput.addEventListener('click', () => {
      if (popover.classList.contains('hidden')) openPopover();
    });

    function parseManualInput() {
      const raw = textInput.value.trim();
      if (!raw) {
        if (allowPast) {
          commitISO('', true);
          return true;
        }
        showError('Vui lòng nhập ngày hợp lệ theo định dạng dd/mm/yyyy.');
        return false;
      }
      const iso = vnToISO(raw);
      if (!iso) {
        showError('Ngày không hợp lệ. Vui lòng nhập đúng định dạng dd/mm/yyyy (VD: 21/11/2026).');
        return false;
      }
      return commitISO(iso, true);
    }

    textInput.addEventListener('input', () => {
      const raw = textInput.value.trim();
      if (raw.length === 10) {
        const iso = vnToISO(raw);
        if (!iso) {
          showError('Ngày không hợp lệ. Vui lòng nhập đúng định dạng dd/mm/yyyy (VD: 21/11/2026).');
        } else {
          showError('');
        }
      } else {
        showError('');
      }
    });

    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePopover(true);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (parseManualInput()) closePopover(false);
      }
    });

    const parentForm = wrap.closest('form');
    if (parentForm) {
      parentForm.addEventListener('submit', (e) => {
        if (!parseManualInput()) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      }, true);
    }

    popover.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePopover(true);
      }
    });

    textInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (!popover.contains(document.activeElement)) {
          parseManualInput();
          if (!wrap.contains(document.activeElement)) {
            closePopover(false);
          }
        }
      }, 120);
    });

    document.addEventListener('click', (e) => {
      if (!popover.classList.contains('hidden') && !wrap.contains(e.target)) {
        closePopover(false);
      }
    });

    if (!window._vnDpEscBound) {
      window._vnDpEscBound = true;
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && activePopoverCloser) {
          e.preventDefault();
          activePopoverCloser(true);
        }
      });
    }

    syncDisplayFromOrig();
    // Re-sync shortly after DOM init in case page JS sets initial value asynchronously
    setTimeout(syncDisplayFromOrig, 60);
    setTimeout(syncDisplayFromOrig, 300);
  }

  function initAll(root) {
    const scope = root || document;
    const inputs = scope.querySelectorAll('input[type="date"]');
    inputs.forEach((inp) => {
      if (TARGET_IDS.has(inp.id) || inp.dataset.vnDatepicker === '1') {
        enhanceDateInput(inp);
      }
    });
  }

  window.SanBongDatePicker = {
    init: initAll,
    enhance: enhanceDateInput,
    isoToVN,
    vnToISO
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAll(document));
  } else {
    initAll(document);
  }
})();

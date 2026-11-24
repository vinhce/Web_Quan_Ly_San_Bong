
(function () {
  'use strict';

  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatVND(amount) {
    const num = Number(amount) || 0;
    return num.toLocaleString('vi-VN') + 'đ';
  }

  function formatDateVN(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  function getLocalTodayISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  let _csrfMemoryToken = '';

  function getCsrfToken() {
    if (_csrfMemoryToken) return _csrfMemoryToken;
    try {
      const meta = document.querySelector('meta[name="csrf-token"]');
      if (meta && meta.content) {
        _csrfMemoryToken = meta.content.trim();
        return _csrfMemoryToken;
      }
      const st = (sessionStorage.getItem('sb_csrf_token') || '').trim();
      if (st) {
        _csrfMemoryToken = st;
        return _csrfMemoryToken;
      }
      return '';
    } catch (e) {
      return _csrfMemoryToken || '';
    }
  }

  function setCsrfToken(token) {
    if (!token || typeof token !== 'string') return;
    const clean = token.trim();
    if (!clean) return;
    _csrfMemoryToken = clean;
    try {
      sessionStorage.setItem('sb_csrf_token', clean);
      let meta = document.querySelector('meta[name="csrf-token"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'csrf-token';
        document.head && document.head.appendChild(meta);
      }
      meta.content = clean;
    } catch (e) {}
  }

  function clearCsrfToken() {
    _csrfMemoryToken = '';
    try {
      sessionStorage.removeItem('sb_csrf_token');
    } catch (e) {}
  }

  async function ensureCsrfToken(apiBase) {
    const current = getCsrfToken();
    if (current) return current;
    try {
      const base = apiBase !== undefined ? apiBase : (getAppBase() ? getAppBase() + '/' : '/');
      const url = `${base}api/auth.php?action=me`;
      const res = await fetch(url, { credentials: 'same-origin' });
      if (res.ok) {
        const json = await res.json();
        if (json && json.csrf_token) {
          setCsrfToken(json.csrf_token);
          return json.csrf_token;
        }
      }
    } catch (e) {}
    return getCsrfToken();
  }

  function getAuthFetchHeaders(extra = {}) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, extra || {});
    const token = getCsrfToken();
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
    return headers;
  }

  async function secureFetch(url, options = {}) {
    await ensureCsrfToken();
    const opts = Object.assign({}, options);
    opts.headers = getAuthFetchHeaders(opts.headers);
    if (!opts.credentials) opts.credentials = 'same-origin';
    const res = await fetch(url, opts);
    const tokenHeader = res.headers ? res.headers.get('X-CSRF-Token') : null;
    if (tokenHeader) {
      setCsrfToken(tokenHeader);
    }
    return res;
  }

  function getAppBase() {
    const pathname = (window.location && typeof window.location.pathname === 'string')
      ? window.location.pathname.replace(/\\/g, '/')
      : '/';
    const match = pathname.match(/^(.*?\/Quan_Ly_San_Bong)/i);
    return match ? match[1] : '';
  }

  function getRelativePath(target) {
    const base = getAppBase();
    const fallback = base ? `${base}/` : '/';
    if (!target || target === 'index.html' || target === '/' || target === '') {
      return fallback;
    }
    const raw = String(target).trim();
    if (/^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/\/)/.test(raw) || raw.includes('\\') || raw.includes('..')) {
      return fallback;
    }
    const cleanTarget = raw
      .replace(/^\.\.\//, '')
      .replace(/^html\//, '')
      .replace(/^\/+/, '')
      .replace(/\.html(?=$|[?#])/, '');
    if (!/^[a-zA-Z0-9_\-\/\.]+(?:\?[a-zA-Z0-9_=&%\-\.]*)?(?:#[a-zA-Z0-9_\-]*)?$/.test(cleanTarget)) {
      return fallback;
    }
    if (cleanTarget === 'portal-admin' || cleanTarget === 'portal-admin/') {
      return base ? `${base}/portal-admin/` : '/portal-admin/';
    }
    return base ? `${base}/${cleanTarget}` : `/${cleanTarget}`;
  }

  const Icons = {
    ball: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg>`,
    calendar: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
    clock: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    mapPin: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
    check: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="20 6 9 17 4 12"/></svg>`,
    copy: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
    grid: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,
    list: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>`,
    pitch: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="12" x2="12" y1="5" y2="19"/><circle cx="12" cy="12" r="3"/></svg>`,
    tag: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>`,
    users: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    wallet: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>`,
    chart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>`,
    settings: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    home: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    user: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    bell: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
    search: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
    filter: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
    phone: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    arrowRight: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
    arrowLeft: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>`,
    download: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
    share: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>`
  };

  function renderPitchSVG(variant = 'standard', heightClass = 'h-40') {
    const palettes = {
      standard: { c1: '#15803D', c2: '#16A34A', line: 'rgba(255,255,255,0.85)' },
      deep:     { c1: '#14532D', c2: '#15803D', line: 'rgba(255,255,255,0.8)' },
      bright:   { c1: '#16A34A', c2: '#22C55E', line: 'rgba(255,255,255,0.9)' },
      twin:     { c1: '#065F46', c2: '#059669', line: 'rgba(255,255,255,0.85)' },
      muted:    { c1: '#475569', c2: '#64748B', line: 'rgba(255,255,255,0.55)' },
      hero:     { c1: '#064E3B', c2: '#047857', line: 'rgba(255,255,255,0.22)' }
    };
    const p = palettes[variant] || palettes.standard;
    return `
    <div class="w-full ${heightClass} relative overflow-hidden select-none" style="background:${p.c1}">
      <svg viewBox="0 0 600 320" preserveAspectRatio="xMidYMid slice" class="w-full h-full">
        <rect x="0" y="0" width="60" height="320" fill="${p.c1}"/>
        <rect x="60" y="0" width="60" height="320" fill="${p.c2}"/>
        <rect x="120" y="0" width="60" height="320" fill="${p.c1}"/>
        <rect x="180" y="0" width="60" height="320" fill="${p.c2}"/>
        <rect x="240" y="0" width="60" height="320" fill="${p.c1}"/>
        <rect x="300" y="0" width="60" height="320" fill="${p.c2}"/>
        <rect x="360" y="0" width="60" height="320" fill="${p.c1}"/>
        <rect x="420" y="0" width="60" height="320" fill="${p.c2}"/>
        <rect x="480" y="0" width="60" height="320" fill="${p.c1}"/>
        <rect x="540" y="0" width="60" height="320" fill="${p.c2}"/>
        <rect x="36" y="24" width="528" height="272" rx="4" fill="none" stroke="${p.line}" stroke-width="3"/>
        <line x1="300" y1="24" x2="300" y2="296" stroke="${p.line}" stroke-width="3"/>
        <circle cx="300" cy="160" r="44" fill="none" stroke="${p.line}" stroke-width="3"/>
        <circle cx="300" cy="160" r="4" fill="${p.line}"/>
        <rect x="36" y="84" width="86" height="152" fill="none" stroke="${p.line}" stroke-width="3"/>
        <rect x="36" y="120" width="36" height="80" fill="none" stroke="${p.line}" stroke-width="3"/>
        <rect x="20" y="136" width="16" height="48" fill="none" stroke="${p.line}" stroke-width="2.5"/>
        <path d="M 122 128 A 36 36 0 0 1 122 192" fill="none" stroke="${p.line}" stroke-width="3"/>
        <rect x="478" y="84" width="86" height="152" fill="none" stroke="${p.line}" stroke-width="3"/>
        <rect x="528" y="120" width="36" height="80" fill="none" stroke="${p.line}" stroke-width="3"/>
        <rect x="564" y="136" width="16" height="48" fill="none" stroke="${p.line}" stroke-width="2.5"/>
        <path d="M 478 128 A 36 36 0 0 0 478 192" fill="none" stroke="${p.line}" stroke-width="3"/>
        <path d="M 36 38 A 14 14 0 0 0 50 24" fill="none" stroke="${p.line}" stroke-width="2.5"/>
        <path d="M 550 24 A 14 14 0 0 0 564 38" fill="none" stroke="${p.line}" stroke-width="2.5"/>
        <path d="M 36 282 A 14 14 0 0 1 50 296" fill="none" stroke="${p.line}" stroke-width="2.5"/>
        <path d="M 550 296 A 14 14 0 0 1 564 282" fill="none" stroke="${p.line}" stroke-width="2.5"/>
      </svg>
    </div>`;
  }

  function statusPill(label) {
    const raw = String(label ?? '').trim();
    const lower = raw.toLowerCase();
    let displayLabel = raw;
    if (lower === 'completed' || lower === 'hoàn thành') {
      displayLabel = 'Hoàn thành';
    } else if (lower === 'cancelled' || lower === 'canceled' || lower === 'đã hủy') {
      displayLabel = 'Đã hủy';
    } else if (lower === 'confirmed' || lower === 'đã xác nhận') {
      displayLabel = 'Đã xác nhận';
    } else if (lower === 'playing' || lower === 'đang đá') {
      displayLabel = 'Đang đá';
    } else if (lower === 'pending' || lower === 'hold' || lower === 'giữ chỗ') {
      displayLabel = 'Giữ chỗ';
    } else if (lower === 'noshow' || lower === 'no-show' || lower === 'no_show' || raw === 'Vắng mặt (No-Show)' || raw.includes('No-Show')) {
      displayLabel = 'Khách chưa đến';
    } else if (lower === 'paid' || lower === 'đã thanh toán 100%' || lower === 'đã thanh toán đủ') {
      displayLabel = raw === 'Đã thanh toán đủ' ? 'Đã thanh toán đủ' : 'Đã thanh toán 100%';
    } else if (lower === 'deposited' || lower === 'đã cọc') {
      displayLabel = 'Đã cọc';
    }
    const map = {
      'Trống': 'bg-white text-[#16A34A] border border-[#16A34A] font-semibold',
      'Giữ chỗ': 'bg-[#FEF3C7] text-[#D97706] border border-[#F59E0B] font-semibold',
      'Chờ duyệt cọc': 'bg-[#FEF3C7] text-[#D97706] border border-[#F59E0B] font-semibold',
      'Chờ thanh toán': 'bg-[#FEF3C7] text-[#D97706] border border-[#F59E0B] font-semibold',
      'Đã xác nhận': 'bg-[#DCFCE7] text-[#16A34A] border border-[#16A34A] font-semibold',
      'Hoạt động': 'bg-[#DCFCE7] text-[#16A34A] border border-[#16A34A] font-semibold',
      'Đang đá': 'bg-[#DBEAFE] text-[#2563EB] border border-[#2563EB] font-semibold',
      'Hoàn thành': 'bg-[#F1F5F9] text-[#475569] border border-[#94A3B8] font-semibold',
      'Đã hủy': 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] font-semibold',
      'Vắng mặt': 'bg-[#DC2626] text-white border border-[#B91C1C] font-semibold',
      'Vắng mặt (No-Show)': 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] font-bold',
      'Khách chưa đến': 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] font-bold',
      'Quá giờ chưa đến': 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] font-bold',
      'Tịch thu cọc 30%': 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] font-semibold',
      'Đã đá - chưa tất toán': 'bg-[#FEF3C7] text-[#B45309] border border-[#F59E0B] font-semibold',
      'Đã thanh toán 100%': 'bg-[#DCFCE7] text-[#16A34A] border border-[#86EFAC] font-semibold',
      'Đã nhả sân trống': 'bg-[#DCFCE7] text-[#16A34A] border border-[#86EFAC] font-bold',
      'Đã khóa': 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] font-semibold',
      'Bảo trì': 'hatch-slate border border-[#CBD5E1] text-[#475569] font-semibold'
    };
    const cls = map[displayLabel] || map[raw] || 'bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1] font-semibold';
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium whitespace-nowrap ${cls}">${escapeHTML(displayLabel)}</span>`;
  }

  function getVietQRUrl(bankCode, accountNo, amount, memo, accountName) {
    const safeBank = encodeURIComponent(bankCode || 'VCB');
    const safeAcc = encodeURIComponent(accountNo || '0123456789');
    const safeAmount = encodeURIComponent(amount || 0);
    const safeMemo = encodeURIComponent(memo || 'DAT SAN BONG');
    let holder = accountName;
    if (!holder) {
      try {
        const db = window.SanBongApp?.SanBongDB || window.SanBongDB;
        if (db && typeof db.getBankInfo === 'function') {
          const bInfo = db.getBankInfo();
          if (bInfo && bInfo.accountName) holder = bInfo.accountName;
        }
      } catch (e) {}
    }
    const safeName = encodeURIComponent(holder || 'CHU SAN BONG');
    return `https://img.vietqr.io/image/${safeBank}-${safeAcc}-compact2.png?amount=${safeAmount}&addInfo=${safeMemo}&accountName=${safeName}`;
  }

  function renderQRCodeSVG(data, size = 160) {
    let content = String(data || 'SANBONG-PRO');
    // If only size passed as number (legacy call)
    if (typeof data === 'number' && !size) {
      size = data;
      content = 'SANBONG-PRO';
    }
    if (typeof window !== 'undefined' && typeof window.qrcode === 'function') {
      try {
        const qr = window.qrcode(0, 'M');
        qr.addData(content);
        qr.make();
        const count = qr.getModuleCount();
        const cellSize = Math.max(2, Math.floor(size / count));
        return qr.createSvgTag(cellSize, 2);
      } catch (e) {
        console.warn('qrcode generator error:', e);
      }
    }
    const safeCode = escapeHTML(content);
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="QR ${safeCode}" class="w-full h-full rounded-lg border border-slate-200 bg-white"><rect width="100%" height="100%" fill="#FFFFFF"/><text x="50%" y="46%" dominant-baseline="middle" text-anchor="middle" fill="#0F172A" font-family="monospace" font-size="13" font-weight="700">${safeCode}</text><text x="50%" y="62%" dominant-baseline="middle" text-anchor="middle" fill="#64748B" font-family="sans-serif" font-size="10">Mã vé điện tử</text></svg>`;
  }

  function playScanBeep(success = true) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (success) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1760, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {}
  }

  function downloadTicketQR(bookingCode) {
    if (!bookingCode) return;
    const db = window.SanBongApp?.SanBongDB || window.SanBongDB;
    const b = db ? db.getBookingByCode(bookingCode) : null;
    const customer = b ? b.customerName : 'Khách hàng';
    const pitch = b ? b.pitchName : 'Sân bóng';
    const time = b ? `${formatDateVN(b.date)} · ${b.slotTime}` : '';

    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 620;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 480, 620);

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, 480, 105);

    ctx.fillStyle = '#16A34A';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('⚽ HỆ THỐNG SÂN BÓNG PRO', 24, 38);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('VÉ ĐIỆN TỬ CHECK-IN NHẬN SÂN', 24, 72);

    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(24, 120, 432, 125);
    ctx.strokeStyle = '#E2E8F0';
    ctx.strokeRect(24, 120, 432, 125);

    ctx.fillStyle = '#64748B';
    ctx.font = '11px sans-serif';
    ctx.fillText('MÃ VÉ ĐIỆN TỬ', 40, 145);
    ctx.fillStyle = '#16A34A';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(bookingCode, 40, 172);

    ctx.fillStyle = '#64748B';
    ctx.font = '11px sans-serif';
    ctx.fillText('SÂN THI ĐẤU', 250, 145);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(pitch.length > 20 ? pitch.slice(0, 18) + '...' : pitch, 250, 170);

    ctx.fillStyle = '#64748B';
    ctx.font = '11px sans-serif';
    ctx.fillText('KHÁCH HÀNG', 40, 205);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(customer, 40, 226);

    ctx.fillStyle = '#64748B';
    ctx.font = '11px sans-serif';
    ctx.fillText('THỜI GIAN', 250, 205);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(time, 250, 226);

    const qrSize = 220;
    const qrX = (480 - qrSize) / 2;
    const qrY = 265;

    if (typeof window.qrcode === 'function') {
      try {
        const qr = window.qrcode(0, 'M');
        qr.addData(bookingCode);
        qr.make();
        const count = qr.getModuleCount();
        const cellSize = qrSize / count;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
        ctx.strokeStyle = '#16A34A';
        ctx.lineWidth = 2;
        ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

        for (let r = 0; r < count; r++) {
          for (let c = 0; c < count; c++) {
            ctx.fillStyle = qr.isDark(r, c) ? '#0F172A' : '#FFFFFF';
            ctx.fillRect(qrX + c * cellSize, qrY + r * cellSize, cellSize + 0.5, cellSize + 0.5);
          }
        }
      } catch (e) {}
    }

    ctx.fillStyle = '#475569';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Xuất trình mã QR này tại quầy để nhân viên quét nhận sân & bật đèn.', 240, 525);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '11px sans-serif';
    ctx.fillText('Hotline hỗ trợ: 0352 313 548 · Chúc bạn có trận đấu bùng nổ!', 240, 550);
    ctx.textAlign = 'left';

    try {
      const link = document.createElement('a');
      link.download = `Ve-SanBong-${bookingCode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast('✓ Đã tải vé QR điện tử về máy thành công!', 'success');
      }
    } catch (e) {
      console.warn('download error:', e);
    }
  }

  window.SanBongHelpers = {
    escapeHTML,
    formatVND,
    formatDateVN,
    getLocalTodayISO,
    getCsrfToken,
    setCsrfToken,
    clearCsrfToken,
    ensureCsrfToken,
    secureFetch,
    getAuthFetchHeaders,
    getAppBase,
    getRelativePath,
    Icons,
    renderPitchSVG,
    statusPill,
    getVietQRUrl,
    renderQRCodeSVG,
    playScanBeep,
    downloadTicketQR
  };

  window.escapeHTML = escapeHTML;
  window.formatVND = formatVND;
  window.formatDateVN = formatDateVN;
  window.getLocalTodayISO = getLocalTodayISO;
  window.getCsrfToken = getCsrfToken;
  window.setCsrfToken = setCsrfToken;
  window.ensureCsrfToken = ensureCsrfToken;
  window.secureFetch = secureFetch;
  window.getAuthFetchHeaders = getAuthFetchHeaders;
  window.getRelativePath = getRelativePath;

})();

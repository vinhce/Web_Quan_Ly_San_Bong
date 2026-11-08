/**
 * SÂN BÓNG PRO - CENTRAL APP LOGIC, STATE & REUSABLE COMPONENTS
 * Quản lý LocalStorage Database, SVG Renderers, Helpers, UI Shells
 */

(function () {
  'use strict';

  // 1. CHỐNG XSS HELPER (Bảo mật theo chiều sâu)
  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 2. FORMATTING HELPERS
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

  // Helper giải quyết đường dẫn Clean URLs và tương thích cả Root Hosting lẫn Localhost
  function getAppBase() {
    const pathname = window.location.pathname.replace(/\\/g, '/');
    const match = pathname.match(/^(.*?\/Quan_Ly_San_Bong)/i);
    return match ? match[1] : '';
  }

  function getRelativePath(target) {
    const base = getAppBase();
    if (!target || target === 'index.html' || target === '/' || target === '') {
      return base ? `${base}/` : '/';
    }
    const cleanTarget = String(target).replace(/^\.\.\//, '').replace(/^html\//, '').replace(/^\//, '').replace(/\.html$/, '');
    if (cleanTarget === 'portal-admin' || cleanTarget === 'portal-admin/') {
      return base ? `${base}/portal-admin/` : '/portal-admin/';
    }
    return base ? `${base}/${cleanTarget}` : `/${cleanTarget}`;
  }

  // 3. ICONS SVG DICTIONARY (24x24 & 20x20 tiêu chuẩn)
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

  // 4. VECTOR PITCH SVG GENERATOR (No Photos Rule - Tiêu chuẩn cao)
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

  // 5. STATUS PILL BADGE HELPER
  function statusPill(label) {
    const map = {
      'Trống': 'bg-white text-[#16A34A] border border-[#16A34A]',
      'Giữ chỗ': 'bg-[#FEF3C7] text-[#D97706]',
      'Chờ thanh toán': 'bg-[#FEF3C7] text-[#D97706]',
      'Đã xác nhận': 'bg-[#DCFCE7] text-[#16A34A]',
      'Hoạt động': 'bg-[#DCFCE7] text-[#16A34A]',
      'Đang đá': 'bg-[#DBEAFE] text-[#2563EB]',
      'Hoàn thành': 'bg-[#F1F5F9] text-[#475569]',
      'Đã hủy': 'bg-[#FEE2E2] text-[#DC2626]',
      'Vắng mặt': 'bg-[#DC2626] text-white',
      'Vắng mặt (No-Show)': 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] font-bold',
      'Tịch thu cọc 30%': 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] font-semibold',
      'Đã nhả sân trống': 'bg-[#DCFCE7] text-[#16A34A] border border-[#86EFAC] font-bold',
      'Đã khóa': 'bg-[#FEE2E2] text-[#DC2626]',
      'Bảo trì': 'hatch-slate border border-[#CBD5E1] text-[#475569]'
    };
    const cls = map[label] || 'bg-[#F1F5F9] text-[#475569]';
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium whitespace-nowrap ${cls}">${escapeHTML(label)}</span>`;
  }

  // 6. VIETQR GENERATOR (Hỗ trợ URL API VietQR chuẩn và Fallback SVG)
  function getVietQRUrl(bankCode, accountNo, amount, memo) {
    const safeBank = encodeURIComponent(bankCode || 'VCB');
    const safeAcc = encodeURIComponent(accountNo || '0123456789');
    const safeAmount = encodeURIComponent(amount || 0);
    const safeMemo = encodeURIComponent(memo || 'DAT SAN BONG');
    return `https://img.vietqr.io/image/${safeBank}-${safeAcc}-compact2.png?amount=${safeAmount}&addInfo=${safeMemo}&accountName=NGUYEN%20QUANG%20VINH`;
  }

  function renderQRCodeSVG(size = 160) {
    return `
    <svg width="${size}" height="${size}" viewBox="0 0 120 120" class="bg-white p-2 rounded-xl border border-[#E2E8F0]">
      <rect x="8" y="8" width="32" height="32" fill="none" stroke="#0F172A" stroke-width="6"/>
      <rect x="18" y="18" width="12" height="12" fill="#0F172A"/>
      <rect x="80" y="8" width="32" height="32" fill="none" stroke="#0F172A" stroke-width="6"/>
      <rect x="90" y="18" width="12" height="12" fill="#0F172A"/>
      <rect x="8" y="80" width="32" height="32" fill="none" stroke="#0F172A" stroke-width="6"/>
      <rect x="18" y="90" width="12" height="12" fill="#0F172A"/>
      <rect x="48" y="12" width="8" height="8" fill="#0F172A"/>
      <rect x="60" y="12" width="12" height="8" fill="#0F172A"/>
      <rect x="48" y="26" width="16" height="8" fill="#0F172A"/>
      <rect x="12" y="48" width="16" height="8" fill="#0F172A"/>
      <rect x="34" y="48" width="12" height="12" fill="#16A34A"/>
      <rect x="52" y="44" width="16" height="16" fill="#0F172A"/>
      <rect x="74" y="48" width="10" height="16" fill="#0F172A"/>
      <rect x="92" y="48" width="18" height="8" fill="#0F172A"/>
      <rect x="12" y="64" width="8" height="8" fill="#0F172A"/>
      <rect x="26" y="64" width="16" height="8" fill="#0F172A"/>
      <rect x="48" y="68" width="12" height="16" fill="#0F172A"/>
      <rect x="66" y="70" width="18" height="8" fill="#16A34A"/>
      <rect x="90" y="66" width="12" height="18" fill="#0F172A"/>
      <rect x="48" y="92" width="16" height="18" fill="#0F172A"/>
      <rect x="70" y="86" width="12" height="12" fill="#0F172A"/>
      <rect x="88" y="92" width="22" height="18" fill="#0F172A"/>
    </svg>`;
  }

  // 7. CENTRAL STATE & LOCALSTORAGE DATABASE
  const STORAGE_KEYS = {
    PITCHES: 'sb_pitches_v2',
    TIME_SLOTS: 'sb_slots_v1',
    SERVICES: 'sb_services_v1',
    VOUCHERS: 'sb_vouchers_v1',
    USER: 'sb_user_v1',
    BANK: 'sb_bank_v1',
    BOOKINGS: 'sb_bookings_v1',
    PENDING_PAYMENTS: 'sb_pending_payments_v2'
  };

  const SanBongDB = {
    init() {
      const data = window.SanBongData || {};
      const savedPitches = JSON.parse(localStorage.getItem(STORAGE_KEYS.PITCHES) || '[]');
      if (!localStorage.getItem(STORAGE_KEYS.PITCHES) || savedPitches.length < (data.DEFAULT_PITCHES || []).length) {
        localStorage.setItem(STORAGE_KEYS.PITCHES, JSON.stringify(data.DEFAULT_PITCHES || []));
      }
      if (!localStorage.getItem(STORAGE_KEYS.TIME_SLOTS)) {
        localStorage.setItem(STORAGE_KEYS.TIME_SLOTS, JSON.stringify(data.DEFAULT_TIME_SLOTS || []));
      }
      if (!localStorage.getItem(STORAGE_KEYS.SERVICES)) {
        localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(data.DEFAULT_EXTRA_SERVICES || []));
      }
      if (!localStorage.getItem(STORAGE_KEYS.VOUCHERS)) {
        localStorage.setItem(STORAGE_KEYS.VOUCHERS, JSON.stringify(data.DEFAULT_VOUCHERS || []));
      }
      const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || '{}');
      if (!localStorage.getItem(STORAGE_KEYS.USER) || currentUser.phone === '0912 345 678') {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.DEFAULT_USER || {}));
      }
      const currentBank = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANK) || '{}');
      if (!localStorage.getItem(STORAGE_KEYS.BANK) || currentBank.accountName === 'NGUYEN VAN HUNG' || currentBank.branch?.includes('Nam Sài Gòn')) {
        localStorage.setItem(STORAGE_KEYS.BANK, JSON.stringify(data.DEFAULT_BANK_INFO || {}));
      }
      if (!localStorage.getItem(STORAGE_KEYS.BOOKINGS)) {
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(data.DEFAULT_BOOKINGS || []));
      }
      if (!localStorage.getItem(STORAGE_KEYS.PENDING_PAYMENTS)) {
        const defaultPending = [
          { time: '10:12', code: 'SB-20261106-0042', name: 'Trần Minh Hoàng', amt: 306000, bank: 'Vietcombank' },
          { time: '11:05', code: 'SB-20261106-0044', name: 'Phạm Quốc Bảo', amt: 126000, bank: 'Vietcombank' },
          { time: '13:40', code: 'SB-20261106-0045', name: 'Đỗ Thành Long', amt: 90000, bank: 'MB Bank' }
        ];
        localStorage.setItem(STORAGE_KEYS.PENDING_PAYMENTS, JSON.stringify(defaultPending));
      }
    },

    getPitches() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.PITCHES)) || [];
      } catch (e) {
        return window.SanBongData?.DEFAULT_PITCHES || [];
      }
    },

    getPitchById(id) {
      const pitches = this.getPitches();
      return pitches.find(p => p.id === id) || null;
    },

    updatePitchStatus(pitchId, status) {
      const pitches = this.getPitches();
      const pitch = pitches.find(p => p.id === pitchId);
      if (pitch) {
        pitch.status = status;
        localStorage.setItem(STORAGE_KEYS.PITCHES, JSON.stringify(pitches));
        return true;
      }
      return false;
    },

    getTimeSlots() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.TIME_SLOTS)) || [];
      } catch (e) {
        return window.SanBongData?.DEFAULT_TIME_SLOTS || [];
      }
    },

    getServices() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICES)) || [];
      } catch (e) {
        return window.SanBongData?.DEFAULT_EXTRA_SERVICES || [];
      }
    },

    getVouchers() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.VOUCHERS)) || [];
      } catch (e) {
        return window.SanBongData?.DEFAULT_VOUCHERS || [];
      }
    },

    getBankInfo() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.BANK)) || {};
      } catch (e) {
        return window.SanBongData?.DEFAULT_BANK_INFO || {};
      }
    },

    getUser() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER)) || {};
      } catch (e) {
        return window.SanBongData?.DEFAULT_USER || {};
      }
    },

    updateUser(updates) {
      try {
        const user = this.getUser();
        const updated = Object.assign({}, user, updates);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
        return updated;
      } catch (e) {
        return null;
      }
    },

    getAllBookings() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKINGS)) || [];
      } catch (e) {
        return window.SanBongData?.DEFAULT_BOOKINGS || [];
      }
    },

    getBookingByCode(code) {
      if (!code) return null;
      const bookings = this.getAllBookings();
      return bookings.find(b => b.code.toLowerCase() === code.trim().toLowerCase()) || null;
    },

    getSlots(pitchId, dateStr) {
      const slots = this.getTimeSlots();
      const pitch = this.getPitchById(pitchId);
      const isPitchMaintenance = pitch && pitch.status === 'Bảo trì';

      const bookings = this.getAllBookings().filter(b => b.pitchId === pitchId && b.date === dateStr && b.status !== 'Đã hủy' && b.status !== 'Vắng mặt (No-Show)' && b.paymentStatus !== 'Tịch thu cọc 30%');

      return slots.map(slot => {
        if (isPitchMaintenance) {
          return { ...slot, status: 'Bảo trì', booking: null };
        }

        const match = bookings.find(b => b.slotId === slot.id || b.slotTime === slot.time);
        if (match) {
          return {
            ...slot,
            status: match.status === 'Đang đá' ? 'Đang đá' : 'Đã đặt',
            booking: match
          };
        }

        return { ...slot, status: 'Trống', booking: null };
      });
    },

    calculatePrice(pitchId, dateStr, slotIdOrTime, servicesList = [], voucherCode = '') {
      const pitch = this.getPitchById(pitchId);
      if (!pitch) return null;

      const slots = this.getTimeSlots();
      const slot = slots.find(s => s.id === slotIdOrTime || s.time === slotIdOrTime);
      const isPeak = slot ? slot.isPeak : false;

      let pitchPrice = isPeak ? pitch.peakPrice : pitch.basePrice;
      if (slot && slot.duration && slot.duration > 1) {
        pitchPrice = Math.round(pitchPrice * slot.duration);
      }

      let serviceTotal = 0;
      const allServices = this.getServices();
      const appliedServices = [];

      if (Array.isArray(servicesList)) {
        servicesList.forEach(item => {
          const srvDef = allServices.find(s => s.id === item.id);
          if (srvDef && item.quantity > 0) {
            const lineTotal = srvDef.price * item.quantity;
            serviceTotal += lineTotal;
            appliedServices.push({
              id: srvDef.id,
              name: srvDef.name,
              price: srvDef.price,
              quantity: item.quantity,
              unit: srvDef.unit,
              lineTotal
            });
          }
        });
      }

      const subtotal = pitchPrice + serviceTotal;

      let discountAmount = 0;
      let appliedVoucher = null;
      if (voucherCode) {
        const v = this.getVouchers().find(vc => vc.code.toUpperCase() === voucherCode.trim().toUpperCase());
        if (v && subtotal >= (v.minOrder || 0)) {
          appliedVoucher = v;
          if (v.type === 'percent') {
            discountAmount = Math.round((subtotal * v.value) / 100);
          } else {
            discountAmount = v.value;
          }
          if (discountAmount > subtotal) discountAmount = subtotal;
        }
      }

      const totalPrice = Math.max(0, subtotal - discountAmount);
      const depositRate = 0.3; // 30%
      const depositAmount = Math.round(totalPrice * depositRate);
      const remainingAmount = totalPrice - depositAmount;

      return {
        pitchPrice,
        isPeak,
        serviceTotal,
        appliedServices,
        subtotal,
        voucherCode: appliedVoucher ? appliedVoucher.code : '',
        discountAmount,
        totalPrice,
        depositAmount,
        remainingAmount
      };
    },

    createBooking(bookingInput) {
      const now = new Date();
      const rand6 = Math.floor(100000 + Math.random() * 900000);
      const pitch = this.getPitchById(bookingInput.pitchId);
      const pitchIdStr = String(bookingInput.pitchId || '').toUpperCase();
      let prefix = 'ASFS';
      if (pitch?.type === 5 || pitchIdStr.startsWith('P5')) {
        prefix = 'ASFF';
      } else if (pitch?.type === 7 || pitchIdStr.startsWith('P7')) {
        prefix = 'ASFS';
      } else if (pitch?.type === 11 || pitchIdStr.startsWith('P11')) {
        prefix = 'ASFE';
      }
      const bookingCode = bookingInput.code || `${prefix}${rand6}`;

      const pricing = this.calculatePrice(
        bookingInput.pitchId,
        bookingInput.date,
        bookingInput.slotId || bookingInput.slotTime,
        bookingInput.services || [],
        bookingInput.voucherCode || ''
      );

      const newBooking = {
        code: bookingCode,
        customerName: bookingInput.customerName || 'Khách vãng lai',
        phone: bookingInput.phone || '',
        email: bookingInput.email || '',
        pitchId: bookingInput.pitchId,
        pitchName: pitch ? pitch.name : 'Sân bóng',
        date: bookingInput.date,
        slotId: bookingInput.slotId || '',
        slotTime: bookingInput.slotTime || '',
        pitchPrice: pricing ? pricing.pitchPrice : 0,
        services: pricing ? pricing.appliedServices : [],
        voucherCode: pricing ? pricing.voucherCode : '',
        discountAmount: pricing ? pricing.discountAmount : 0,
        totalPrice: pricing ? pricing.totalPrice : 0,
        depositAmount: pricing ? pricing.depositAmount : 0,
        remainingAmount: pricing ? pricing.remainingAmount : 0,
        status: bookingInput.status || 'Chờ duyệt cọc',
        paymentStatus: bookingInput.paymentStatus || 'Chờ cọc 30%',
        paymentMethod: bookingInput.paymentMethod || 'Chuyển khoản đặt cọc',
        createdAt: `${bookingInput.date} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        note: bookingInput.note || ''
      };

      const bookings = this.getAllBookings();
      bookings.unshift(newBooking);
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));

      return newBooking;
    },

    updateBookingStatus(bookingCode, status, paymentStatus) {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (booking) {
        booking.status = status;
        if (paymentStatus) {
          booking.paymentStatus = paymentStatus;
        }
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
        return booking;
      }
      return null;
    },

    checkinBooking(bookingCode) {
      return this.updateBookingStatus(bookingCode, 'Đang đá', 'Đã thanh toán đủ');
    },

    releaseNoShowBooking(bookingCode) {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (booking) {
        booking.status = 'Vắng mặt (No-Show)';
        booking.paymentStatus = 'Tịch thu cọc 30%';
        booking.note = (booking.note ? booking.note + ' ' : '') + '[Hủy No-Show do quá 15p - Đã nhả sân trống]';
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
        return booking;
      }
      return null;
    },

    getPendingPayments() {
      let list = [];
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.PENDING_PAYMENTS);
        list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list)) list = [];
      } catch (e) {
        list = [];
      }

      // Tự động đồng bộ bất kỳ đơn đặt sân mới nào có paymentStatus = 'Chờ duyệt cọc'
      const pendingBookings = this.getAllBookings().filter(b => b.paymentStatus === 'Chờ duyệt cọc' && b.status !== 'Đã hủy');
      pendingBookings.forEach(pb => {
        if (!list.some(item => item.code === pb.code)) {
          list.push({
            time: pb.createdAt ? pb.createdAt.split(' ')[1] || 'Vừa xong' : 'Vừa xong',
            code: pb.code,
            name: pb.customerName,
            amt: pb.depositAmount || Math.round(pb.totalPrice * 0.3),
            bank: pb.paymentMethod?.includes('MB') ? 'MB Bank' : 'Vietcombank'
          });
        }
      });
      return list;
    },

    approveDeposit(bookingCode) {
      this.updateBookingStatus(bookingCode, 'Đã xác nhận', 'Đã cọc 30%');
      let list = [];
      try {
        list = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_PAYMENTS)) || [];
      } catch (e) {
        list = [];
      }
      list = list.filter(item => item.code !== bookingCode);
      localStorage.setItem(STORAGE_KEYS.PENDING_PAYMENTS, JSON.stringify(list));
      return true;
    },

    rejectDeposit(bookingCode) {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (booking) {
        booking.status = 'Đã hủy';
        booking.paymentStatus = 'Đã hủy';
        booking.note = (booking.note ? booking.note + ' ' : '') + '[Admin từ chối duyệt cọc - Đã giải phóng sân]';
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      }
      let list = [];
      try {
        list = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_PAYMENTS)) || [];
      } catch (e) {
        list = [];
      }
      list = list.filter(item => item.code !== bookingCode);
      localStorage.setItem(STORAGE_KEYS.PENDING_PAYMENTS, JSON.stringify(list));
      return true;
    },

    getSlotsWithStatus(pitchId, dateStr) {
      return this.getSlots(pitchId, dateStr);
    }
  };

  // Khởi tạo Database ngay khi nạp file
  SanBongDB.init();

  // 8. REUSABLE UI SHELLS: NAVBAR & FOOTER
  function renderNavbar(activePage = 'Trang chủ') {
    // 1. Phân quyền người dùng (RBAC) - Đọc thông tin phiên an toàn
    let currentUser = null;
    try {
      currentUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
    } catch(e) {}

    const navItems = [
      { label: 'Trang chủ', href: getRelativePath('') },
      { label: 'Danh sách sân', href: getRelativePath('fields') },
      { label: 'Đặt sân nhanh', href: getRelativePath('booking') },
      { label: 'Lịch sử & Hội viên', href: getRelativePath('history') }
    ];

    // CHỈ hiển thị liên kết Quản trị Portal nếu người dùng đăng nhập là ADMIN
    if (currentUser && currentUser.role === 'admin') {
      navItems.push({ label: '⚡ Quản trị Portal', href: getRelativePath('portal-admin/') });
    }

    const defaultUser = SanBongDB.getUser();
    const user = (currentUser && currentUser.full_name) ? {
      name: currentUser.full_name,
      avatar: currentUser.full_name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase(),
      tier: currentUser.role === 'admin' ? 'Quản trị viên' : (currentUser.tier || 'Hội viên VIP'),
      points: currentUser.role === 'admin' ? 9999 : (currentUser.points || 820)
    } : defaultUser;

    return `
    <header class="w-full h-[72px] bg-white border-b border-[#E2E8F0] px-4 md:px-10 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      <div class="flex items-center gap-6 lg:gap-10">
        <a href="${getRelativePath('')}" class="flex items-center gap-3 group">
          <div class="w-10 h-10 rounded-[10px] bg-[#16A34A] text-white flex items-center justify-center shadow-md group-hover:bg-[#15803D] transition-all">
            ${Icons.ball}
          </div>
          <div>
            <span class="font-heading font-extrabold text-[20px] text-[#0F172A] tracking-tight">Sân Bóng Pro</span>
            <span class="block text-[10px] font-medium text-[#16A34A] uppercase tracking-wider -mt-1">Hệ thống sân đỉnh cao</span>
          </div>
        </a>

        <nav class="hidden md:flex items-center gap-6 lg:gap-8 h-[72px]">
          ${navItems.map(item => {
            const isAct = item.label === activePage;
            return `
            <a href="${item.href}" class="h-full flex items-center relative text-[14px] font-medium transition-colors ${
              isAct ? 'text-[#16A34A] font-semibold' : 'text-[#475569] hover:text-[#0F172A]'
            }">
              <span>${escapeHTML(item.label)}</span>
              ${isAct ? `<span class="absolute bottom-0 left-0 right-0 h-[3px] bg-[#16A34A] rounded-t-full"></span>` : ''}
            </a>`;
          }).join('')}
        </nav>
      </div>

      <div class="flex items-center gap-3 sm:gap-4">
        <a href="${getRelativePath('history')}" class="w-10 h-10 rounded-full border border-[#E2E8F0] flex items-center justify-center relative text-[#475569] hover:bg-[#F8FAFC] transition-colors" title="Thông báo đặt sân">
          ${Icons.bell}
          <span class="w-2.5 h-2.5 rounded-full bg-[#DC2626] border-2 border-white absolute top-2 right-2"></span>
        </a>

        <a href="${getRelativePath('history')}" class="flex items-center gap-2.5 pl-2 py-1 pr-3 rounded-full hover:bg-[#F1F5F9] transition-colors border border-transparent hover:border-[#E2E8F0]">
          <div class="w-9 h-9 rounded-full bg-[#DCFCE7] text-[#16A34A] font-heading font-bold text-sm flex items-center justify-center">
            ${escapeHTML(user.avatar || 'TH')}
          </div>
          <div class="text-left hidden sm:block">
            <div class="text-[14px] font-semibold text-[#0F172A] leading-tight">${escapeHTML(user.name || 'Trần Minh Hoàng')}</div>
            <div class="text-[11px] text-[#16A34A] font-medium">${escapeHTML(user.tier || 'Hạng Bạc')} · ${user.points || 820}đ</div>
          </div>
        </a>
      </div>
    </header>`;
  }

  function renderFooter() {
    return `
    <footer class="w-full bg-[#0F172A] text-white pt-14 pb-8 border-t border-[#1E293B]">
      <div class="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-[10px] bg-[#16A34A] text-white flex items-center justify-center">
              ${Icons.ball}
            </div>
            <span class="font-heading font-bold text-[20px] text-white">Sân Bóng Pro</span>
          </div>
          <p class="text-[13px] text-[#94A3B8] leading-relaxed">
            Hệ thống đặt sân bóng đá tự động, chuẩn hóa giao diện trực quan với mặt cỏ chuẩn FIFA và dịch vụ trận đấu trọn gói.
          </p>
          <div class="flex items-center gap-3 text-[#94A3B8] text-[13px]">
            ${Icons.phone}
            <span>Hotline: 0352 313 548 (24/7)</span>
          </div>
        </div>

        <div>
          <h4 class="font-heading font-semibold text-[15px] mb-4 text-[#F8FAFC]">Hệ Thống Sân</h4>
          <ul class="space-y-2.5 text-[13px] text-[#94A3B8]">
            <li><a href="${getRelativePath('fields')}" class="hover:text-white transition-colors">Sân 5 người tiêu chuẩn</a></li>
            <li><a href="${getRelativePath('fields')}" class="hover:text-white transition-colors">Sân 7 người trung tâm</a></li>
            <li><a href="${getRelativePath('fields')}" class="hover:text-white transition-colors">Sân 11 người ghép chuẩn VFF</a></li>
            <li><a href="${getRelativePath('booking')}" class="hover:text-white transition-colors">Bảng giá & Khung giờ vàng</a></li>
          </ul>
        </div>

        <div>
          <h4 class="font-heading font-semibold text-[15px] mb-4 text-[#F8FAFC]">Dịch Vụ Đi Kèm</h4>
          <ul class="space-y-2.5 text-[13px] text-[#94A3B8]">
            <li>Áo bib phân đội dạ quang</li>
            <li>Nước giải khát Aquafina & Revive</li>
            <li>Trọng tài chuyên nghiệp bắt giải</li>
            <li>Thuê bóng thi đấu Động Lực</li>
          </ul>
        </div>

        <div>
          <h4 class="font-heading font-semibold text-[15px] mb-4 text-[#F8FAFC]">Địa Chỉ Liên Hệ</h4>
          <p class="text-[13px] text-[#94A3B8] leading-relaxed mb-3">
            Khu liên hợp Thể thao Pro, Số 18 Đường Lê Đức Thọ, Phường Mỹ Đình, Quận Nam Từ Liêm, TP. Hà Nội.
          </p>
          <div class="p-3 rounded-lg bg-[#1E293B] border border-[#334155] text-xs text-[#CBD5E1]">
            <span class="text-[#16A34A] font-semibold">● Đang mở cửa:</span> 05:30 - 23:00 mỗi ngày
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 md:px-8 pt-6 border-t border-[#1E293B] flex flex-col sm:flex-row items-center justify-between text-[12px] text-[#64748B] gap-4">
        <div>© 2026 Sân Bóng Pro. Bản quyền hệ thống đặt sân hiện đại.</div>
        <div class="flex items-center gap-6">
          <a href="#" class="hover:text-white">Điều khoản sử dụng</a>
          <a href="#" class="hover:text-white">Chính sách bảo mật</a>
        </div>
      </div>
    </footer>`;
  }

  // 9. GẮN VÀO WINDOW ĐỂ CÁC FILE VIEW TRUY CẬP TRỰC TIẾP
  window.SanBongApp = {
    escapeHTML,
    formatVND,
    formatDateVN,
    getRelativePath,
    Icons,
    renderPitchSVG,
    statusPill,
    getVietQRUrl,
    renderQRCodeSVG,
    SanBongDB,
    renderNavbar,
    renderFooter
  };

  // Tự động gán nếu DOM đã có sẵn placeholder #app-navbar và #app-footer
  document.addEventListener('DOMContentLoaded', () => {
    const navPlaceholder = document.getElementById('app-navbar');
    if (navPlaceholder && navPlaceholder.dataset.activePage) {
      navPlaceholder.innerHTML = renderNavbar(navPlaceholder.dataset.activePage);
    } else if (navPlaceholder) {
      navPlaceholder.innerHTML = renderNavbar();
    }

    const footerPlaceholder = document.getElementById('app-footer');
    if (footerPlaceholder) {
      footerPlaceholder.innerHTML = renderFooter();
    }
  });

})();


(function () {
  'use strict';

  function getRelativePath(target) {
    if (window.SanBongHelpers && typeof window.SanBongHelpers.getRelativePath === 'function') {
      return window.SanBongHelpers.getRelativePath(target);
    }
    const pathname = window.location.pathname.replace(/\\/g, '/');
    const match = pathname.match(/^(.*?\/Quan_Ly_San_Bong)/i);
    const base = match ? match[1] : '';
    if (!target || target === 'index.html' || target === '/' || target === '') {
      return base ? `${base}/` : '/';
    }
    const cleanTarget = String(target).replace(/^\.\.\//, '').replace(/^html\//, '').replace(/^\//, '').replace(/\.html$/, '');
    if (cleanTarget === 'portal-admin' || cleanTarget === 'portal-admin/') {
      return base ? `${base}/portal-admin/` : '/portal-admin/';
    }
    return base ? `${base}/${cleanTarget}` : `/${cleanTarget}`;
  }

  const STORAGE_KEYS = {
    PITCHES: 'sb_pitches_v2',
    TIME_SLOTS: 'sb_slots_v1',
    SERVICES: 'sb_services_v1',
    VOUCHERS: 'sb_vouchers_v1',
    GOLDEN_HOURS: 'sb_golden_hours_v1',
    MAINTENANCE: 'sb_maintenance_v1',
    USER: 'sb_user_v1',
    BANK: 'sb_bank_v1',
    BOOKINGS: 'sb_bookings_v1',
    PENDING_PAYMENTS: 'sb_pending_payments_v3',
    AUDIT_LOGS: 'sb_audit_logs_v1',
    SHIFTS: 'sb_shifts_v1',
    COUNTER_SALES: 'sb_counter_sales_v1',
    BANK_TRANSACTIONS: 'sb_bank_transactions_v1'
  };

  const DEFAULT_SYSTEM_CONFIG = {
    depositRate: 30,
    hotline: '0352 313 548',
    openHours: '05:30 - 23:00 hàng ngày (kể cả Lễ, Tết)',
    holdMinutes: 15,
    waitlistHoldMinutes: 15,
    refundFullHours: 24,
    refundPartialHours: 4,
    autoCancelEnabled: true,
    matchmakingEnabled: true,
    matchmakingRequireApproval: false
  };

  const SanBongDB = {
    DEFAULT_SYSTEM_CONFIG,
    init() {
      const data = window.SanBongData || {};
      const savedPitches = JSON.parse(localStorage.getItem(STORAGE_KEYS.PITCHES) || '[]');
      if (!localStorage.getItem(STORAGE_KEYS.PITCHES) || savedPitches.length < (data.DEFAULT_PITCHES || []).length) {
        const mergedPitches = [...(data.DEFAULT_PITCHES || [])];
        if (Array.isArray(savedPitches)) {
          savedPitches.forEach(sp => {
            const idx = mergedPitches.findIndex(mp => mp.id === sp.id);
            if (idx >= 0) mergedPitches[idx] = Object.assign({}, mergedPitches[idx], sp);
            else mergedPitches.push(sp);
          });
        }
        localStorage.setItem(STORAGE_KEYS.PITCHES, JSON.stringify(mergedPitches));
      }
      // Ensure weekendPrice exists on all pitches
      try {
        const pList = JSON.parse(localStorage.getItem(STORAGE_KEYS.PITCHES) || '[]');
        let pChanged = false;
        pList.forEach(p => {
          if (!p.weekendPrice || Number(p.weekendPrice) <= 0) {
            p.weekendPrice = p.type === 11 ? 1400000 : (p.type === 7 ? 700000 : 380000);
            pChanged = true;
          }
        });
        if (pChanged) localStorage.setItem(STORAGE_KEYS.PITCHES, JSON.stringify(pList));
      } catch (e) {}

      if (!localStorage.getItem(STORAGE_KEYS.TIME_SLOTS)) {
        localStorage.setItem(STORAGE_KEYS.TIME_SLOTS, JSON.stringify(data.DEFAULT_TIME_SLOTS || []));
      }
      if (!localStorage.getItem(STORAGE_KEYS.SERVICES)) {
        localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(data.DEFAULT_EXTRA_SERVICES || []));
      }
      // Ensure stockQty & minStockWarning exist on all services
      try {
        const sList = JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICES) || '[]');
        let sChanged = false;
        sList.forEach(s => {
          if (s.stockQty === undefined || s.stockQty === null) {
            s.stockQty = s.id === 'SRV-WATER' ? 42 : (s.id === 'SRV-REVIVE' ? 8 : (s.id === 'SRV-REF' ? 15 : 25));
            sChanged = true;
          }
          if (s.minStockWarning === undefined || s.minStockWarning === null) {
            s.minStockWarning = s.id === 'SRV-REF' ? 2 : 10;
            sChanged = true;
          }
        });
        if (sChanged) localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(sList));
      } catch (e) {}

      if (!localStorage.getItem('sb_active_shift_start')) {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        localStorage.setItem('sb_active_shift_start', `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} 06:00`);
      }

      if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
        const initLogs = [
          {
            id: 1,
            created_at: '2026-11-06 08:15:20',
            actor_name: 'Quản Trị Viên',
            actor_role: 'admin',
            action: 'CHECKIN',
            target_code: 'ASFS260039',
            old_value: 'Trạng thái: Đã xác nhận',
            new_value: 'Trạng thái: Đang đá (Check-in 08:15)',
            ip_address: '127.0.0.1'
          },
          {
            id: 2,
            created_at: '2026-11-06 09:05:11',
            actor_name: 'Nguyễn Văn Bình (Ca 1)',
            actor_role: 'staff',
            action: 'COLLECT_PAYMENT',
            target_code: 'ASFF260038',
            old_value: 'Còn nợ: 210.000đ',
            new_value: 'Thu đủ 210.000đ (Tiền mặt tại quầy)',
            ip_address: '127.0.0.1'
          }
        ];
        localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(initLogs));
      }

      if (!localStorage.getItem(STORAGE_KEYS.SHIFTS)) {
        const initShifts = [
          {
            id: 'CA-261105-02',
            staff_name: 'Nguyễn Văn Bình (Trực sân)',
            staff_username: 'staff1',
            opened_at: '2026-11-05 14:00',
            closed_at: '2026-11-05 22:30',
            cash_declared: 2450000,
            transfer_declared: 1850000,
            actual_cash: 2450000,
            diff_amount: 0,
            status: 'confirmed',
            note: 'Bàn giao đủ tiền mặt cuối ngày cho Quản lý'
          }
        ];
        localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(initShifts));
      }
      if (!localStorage.getItem(STORAGE_KEYS.BANK_TRANSACTIONS)) {
        const nowDate = (window.SanBongData && typeof window.SanBongData.getTodayDateString === 'function')
          ? window.SanBongData.getTodayDateString()
          : new Date().toISOString().slice(0, 10);
        const initBankTx = [
          {
            id: 'TX-SEPAY-901',
            reference_code: 'FT2631100901',
            transaction_date: `${nowDate} 10:15:22`,
            bank_name: 'MBBank',
            content: 'CHUYEN TIEN COC SAN BONG TOI NAY',
            detected_code: '',
            booking_code: '',
            amount_in: 200000,
            expected_amount: 0,
            diff_amount: 0,
            match_status: 'unmatched',
            status: 'pending',
            note: 'Thiếu mã đơn đặt sân trong nội dung chuyển khoản'
          },
          {
            id: 'TX-SEPAY-902',
            reference_code: 'FT2631100902',
            transaction_date: `${nowDate} 11:08:40`,
            bank_name: 'Vietcombank',
            content: 'ASFS982145 coc san',
            detected_code: 'ASFS982145',
            booking_code: 'ASFS982145',
            amount_in: 150000,
            expected_amount: 200000,
            diff_amount: -50000,
            match_status: 'underpaid',
            status: 'pending',
            note: 'Khách chuyển thiếu 50.000đ tiền cọc yêu cầu'
          },
          {
            id: 'TX-SEPAY-903',
            reference_code: 'FT2631100903',
            transaction_date: `${nowDate} 11:45:12`,
            bank_name: 'Techcombank',
            content: 'ASFF110283 thanh toan du',
            detected_code: 'ASFF110283',
            booking_code: 'ASFF110283',
            amount_in: 370000,
            expected_amount: 120000,
            diff_amount: 250000,
            match_status: 'overpaid',
            status: 'pending',
            note: 'Khách chuyển dư +250.000đ (có thể đã chuyển đủ 100%)'
          },
          {
            id: 'TX-SEPAY-900',
            reference_code: 'FT2631100900',
            transaction_date: `${nowDate} 09:30:05`,
            bank_name: 'MBBank',
            content: 'ASFE559072',
            detected_code: 'ASFE559072',
            booking_code: 'ASFE559072',
            amount_in: 500000,
            expected_amount: 500000,
            diff_amount: 0,
            match_status: 'matched',
            status: 'resolved',
            note: 'Tự động đối soát khớp 100% qua SePay Webhook'
          }
        ];
        localStorage.setItem(STORAGE_KEYS.BANK_TRANSACTIONS, JSON.stringify(initBankTx));
      }
      if (!localStorage.getItem(STORAGE_KEYS.VOUCHERS)) {
        localStorage.setItem(STORAGE_KEYS.VOUCHERS, JSON.stringify(data.DEFAULT_VOUCHERS || []));
      } else {
        try {
          const savedVouchers = JSON.parse(localStorage.getItem(STORAGE_KEYS.VOUCHERS) || '[]');
          const defVouchers = data.DEFAULT_VOUCHERS || [];
          if (Array.isArray(savedVouchers) && savedVouchers.length < defVouchers.length) {
            const merged = [...savedVouchers];
            defVouchers.forEach(dv => {
              if (!merged.some(sv => sv.code === dv.code)) {
                merged.push(dv);
              }
            });
            localStorage.setItem(STORAGE_KEYS.VOUCHERS, JSON.stringify(merged));
          }
        } catch (e) {}
      }
      try {
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem('sb_user');
        const sUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
        if (sUser && (sUser.username === 'user' || sUser.full_name === 'Trần Minh Hoàng')) {
          sessionStorage.removeItem('sb_current_user');
        }
      } catch (e) {}
      const currentBank = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANK) || '{}');
      if (!localStorage.getItem(STORAGE_KEYS.BANK) || currentBank.accountName === 'NGUYEN VAN HUNG' || currentBank.branch?.includes('Nam Sài Gòn')) {
        localStorage.setItem(STORAGE_KEYS.BANK, JSON.stringify(data.DEFAULT_BANK_INFO || {}));
      }
      if (!localStorage.getItem(STORAGE_KEYS.BOOKINGS)) {
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(data.DEFAULT_BOOKINGS || []));
      }
      if (!localStorage.getItem(STORAGE_KEYS.PENDING_PAYMENTS)) {
        let processed = [];
        try {
          processed = JSON.parse(localStorage.getItem('sb_processed_receipts_v1') || '[]');
          if (!Array.isArray(processed)) processed = [];
        } catch (e) {
          processed = [];
        }
        const defaultPending = [
          { time: '10:12', code: 'ASFS260042', name: 'Trần Minh Hoàng', amt: 306000, bank: 'Vietcombank' },
          { time: '11:05', code: 'ASFS260044', name: 'Phạm Quốc Bảo', amt: 126000, bank: 'Vietcombank' },
          { time: '13:40', code: 'ASFF260045', name: 'Đỗ Thành Long', amt: 90000, bank: 'MB Bank' }
        ].filter(item => !processed.includes(item.code));
        localStorage.setItem(STORAGE_KEYS.PENDING_PAYMENTS, JSON.stringify(defaultPending));
      }

      try {
        const rawPending = localStorage.getItem(STORAGE_KEYS.PENDING_PAYMENTS);
        if (rawPending && rawPending.includes('SB-')) {
          const list = JSON.parse(rawPending);
          if (Array.isArray(list)) {
            const upgraded = list.map(item => {
              if (item.code && item.code.startsWith('SB-')) {
                const pfx = (item.code.includes('0045') || (item.amt && item.amt <= 100000)) ? 'ASFF' : 'ASFS';
                item.code = item.code.replace(/^SB-\d+-?/, pfx + '26');
              }
              return item;
            });
            localStorage.setItem(STORAGE_KEYS.PENDING_PAYMENTS, JSON.stringify(upgraded));
          }
        }
        const rawBookings = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
        if (rawBookings) {
          const bList = JSON.parse(rawBookings);
          if (Array.isArray(bList)) {
            const pitches = this.getPitches();
            let changed = false;
            const upgradedB = bList.map(b => {
              if (b.code && b.code.startsWith('SB-')) {
                const p = pitches.find(pitch => pitch.id === b.pitchId);
                let pfx = 'ASFS';
                if (p?.type === 5 || (b.pitchId && b.pitchId.startsWith('P5'))) pfx = 'ASFF';
                else if (p?.type === 11 || (b.pitchId && b.pitchId.startsWith('P11'))) pfx = 'ASFE';
                b.code = b.code.replace(/^SB-\d+-?/, pfx + '26');
                changed = true;
              }
              if (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) {
                b.status = 'Khách chưa đến';
                changed = true;
              }
              if (b.note && String(b.note).includes('No-Show')) {
                b.note = String(b.note)
                  .replace(/Hủy No-Show do quá 15p/g, 'Quá 15p khách chưa đến')
                  .replace(/No-Show/g, 'Quá 15p khách chưa đến');
                changed = true;
              }
              const tot = Number(b.totalPrice || 0);
              const dep = Number(b.depositAmount || Math.round(tot * 0.3));
              if (b.status === 'Hoàn thành') {
                if (!b.paidRemainingAmount || b.paidRemainingAmount <= 0) {
                  b.paidRemainingAmount = Math.max(0, tot - dep);
                  changed = true;
                }
                if (b.note && String(b.note).includes('phần còn lại 0đ')) {
                  b.note = String(b.note).replace('phần còn lại 0đ', `phần còn lại ${b.paidRemainingAmount.toLocaleString('vi-VN')}đ`);
                  changed = true;
                }
              } else if (b.status !== 'Đã hủy' && b.status !== 'Khách chưa đến' && typeof b.remainingAmount !== 'number') {
                b.remainingAmount = Math.max(0, tot - dep);
                changed = true;
              }
              return b;
            });
            if (changed) {
              localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(upgradedB));
            }
          }
        }
      } catch (e) {}

      this.syncFromServer();
    },

    async syncFromServer() {
      try {
        const res = await fetch(getRelativePath('api/pitches.php?all=1'));
        if (!res.ok) return;
        const jsonRes = await res.json();
        if (jsonRes?.csrf_token && window.SanBongHelpers?.setCsrfToken) {
          window.SanBongHelpers.setCsrfToken(jsonRes.csrf_token);
        }
        if (jsonRes && jsonRes.success && jsonRes.data) {
          const d = jsonRes.data;
          if (Array.isArray(d.pitches) && d.pitches.length > 0) {
            localStorage.setItem(STORAGE_KEYS.PITCHES, JSON.stringify(d.pitches));
          }
          if (Array.isArray(d.timeSlots) && d.timeSlots.length > 0) {
            localStorage.setItem(STORAGE_KEYS.TIME_SLOTS, JSON.stringify(d.timeSlots));
          }
          if (Array.isArray(d.extraServices) && d.extraServices.length > 0) {
            localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(d.extraServices));
          }
          if (Array.isArray(d.vouchers)) {
            localStorage.setItem(STORAGE_KEYS.VOUCHERS, JSON.stringify(d.vouchers));
          }
          if (Array.isArray(d.goldenHourRules)) {
            localStorage.setItem(STORAGE_KEYS.GOLDEN_HOURS, JSON.stringify(d.goldenHourRules));
          }
          if (Array.isArray(d.maintenanceSchedules)) {
            localStorage.setItem(STORAGE_KEYS.MAINTENANCE, JSON.stringify(d.maintenanceSchedules));
          }
          if (d.bankInfo && typeof d.bankInfo === 'object') {
            const b = {
              bankName: d.bankInfo.bankName || d.bankInfo.bank_name || 'Vietcombank',
              bankCode: d.bankInfo.bankCode || d.bankInfo.bank_code || 'VCB',
              accountNo: d.bankInfo.accountNo || d.bankInfo.accountNumber || d.bankInfo.account_no || '0123456789',
              accountNumber: d.bankInfo.accountNumber || d.bankInfo.accountNo || d.bankInfo.account_no || '0123456789',
              accountName: d.bankInfo.accountName || d.bankInfo.account_holder || 'CONG TY CP SAN BONG PRO'
            };
            localStorage.setItem(STORAGE_KEYS.BANK, JSON.stringify(b));
          }
          if (d.settings && typeof d.settings === 'object') {
            const prevCfg = this.getSystemConfig ? this.getSystemConfig() : DEFAULT_SYSTEM_CONFIG;
            const autoRaw = d.settings.autoCancelEnabled ?? d.settings.auto_cancel_enabled;
            const mmEnabledRaw = d.settings.matchmakingEnabled ?? d.settings.matchmaking_enabled;
            const mmApprovalRaw = d.settings.matchmakingRequireApproval ?? d.settings.matchmaking_require_approval;
            const cfg = {
              depositRate: Number(d.settings.depositRate ?? d.settings.deposit_rate ?? prevCfg.depositRate ?? DEFAULT_SYSTEM_CONFIG.depositRate),
              hotline: d.settings.hotline || prevCfg.hotline || DEFAULT_SYSTEM_CONFIG.hotline,
              openHours: d.settings.openHours || d.settings.open_hours || prevCfg.openHours || DEFAULT_SYSTEM_CONFIG.openHours,
              holdMinutes: Number(d.settings.holdMinutes ?? d.settings.hold_minutes ?? prevCfg.holdMinutes ?? DEFAULT_SYSTEM_CONFIG.holdMinutes),
              waitlistHoldMinutes: Number(d.settings.waitlistHoldMinutes ?? d.settings.waitlist_hold_minutes ?? prevCfg.waitlistHoldMinutes ?? DEFAULT_SYSTEM_CONFIG.waitlistHoldMinutes),
              refundFullHours: Number(d.settings.refundFullHours ?? d.settings.refund_full_hours ?? prevCfg.refundFullHours ?? DEFAULT_SYSTEM_CONFIG.refundFullHours),
              refundPartialHours: Number(d.settings.refundPartialHours ?? d.settings.refund_partial_hours ?? prevCfg.refundPartialHours ?? DEFAULT_SYSTEM_CONFIG.refundPartialHours),
              autoCancelEnabled: autoRaw === undefined ? (prevCfg.autoCancelEnabled ?? DEFAULT_SYSTEM_CONFIG.autoCancelEnabled) : (autoRaw === true || autoRaw === 1 || autoRaw === '1' || autoRaw === 'true'),
              matchmakingEnabled: mmEnabledRaw === undefined ? (prevCfg.matchmakingEnabled ?? true) : (mmEnabledRaw === true || mmEnabledRaw === 1 || mmEnabledRaw === '1' || mmEnabledRaw === 'true'),
              matchmakingRequireApproval: mmApprovalRaw === undefined ? (prevCfg.matchmakingRequireApproval ?? false) : (mmApprovalRaw === true || mmApprovalRaw === 1 || mmApprovalRaw === '1' || mmApprovalRaw === 'true'),
              pricingTable: d.settings.pricingTable || prevCfg.pricingTable || null
            };
            localStorage.setItem('sb_system_config', JSON.stringify(cfg));
          }
          window.dispatchEvent(new CustomEvent('sb-data-synced', { detail: d }));
        }
      } catch (e) {}
    },

    getSystemConfig() {
      try {
        const cfg = JSON.parse(localStorage.getItem('sb_system_config') || '{}');
        const autoRaw = cfg.autoCancelEnabled ?? cfg.auto_cancel_enabled;
        const mmEnabledRaw = cfg.matchmakingEnabled ?? cfg.matchmaking_enabled;
        const mmApprovalRaw = cfg.matchmakingRequireApproval ?? cfg.matchmaking_require_approval;
        return {
          depositRate: Number(cfg.depositRate ?? cfg.deposit_rate ?? DEFAULT_SYSTEM_CONFIG.depositRate) || 30,
          hotline: cfg.hotline || DEFAULT_SYSTEM_CONFIG.hotline,
          openHours: cfg.openHours || cfg.open_hours || DEFAULT_SYSTEM_CONFIG.openHours,
          holdMinutes: Math.max(5, Math.min(120, Number(cfg.holdMinutes ?? cfg.hold_minutes ?? DEFAULT_SYSTEM_CONFIG.holdMinutes) || 15)),
          waitlistHoldMinutes: Math.max(5, Math.min(120, Number(cfg.waitlistHoldMinutes ?? cfg.waitlist_hold_minutes ?? DEFAULT_SYSTEM_CONFIG.waitlistHoldMinutes) || 15)),
          refundFullHours: Math.max(1, Math.min(168, Number(cfg.refundFullHours ?? cfg.refund_full_hours ?? DEFAULT_SYSTEM_CONFIG.refundFullHours) || 24)),
          refundPartialHours: Math.max(0, Math.min(48, Number(cfg.refundPartialHours ?? cfg.refund_partial_hours ?? DEFAULT_SYSTEM_CONFIG.refundPartialHours) ?? 4)),
          autoCancelEnabled: autoRaw === undefined ? DEFAULT_SYSTEM_CONFIG.autoCancelEnabled : (autoRaw === true || autoRaw === 1 || autoRaw === '1' || autoRaw === 'true'),
          matchmakingEnabled: mmEnabledRaw === undefined ? true : (mmEnabledRaw === true || mmEnabledRaw === 1 || mmEnabledRaw === '1' || mmEnabledRaw === 'true'),
          matchmakingRequireApproval: mmApprovalRaw === undefined ? false : (mmApprovalRaw === true || mmApprovalRaw === 1 || mmApprovalRaw === '1' || mmApprovalRaw === 'true'),
          pricingTable: cfg.pricingTable || null
        };
      } catch (e) {
        return Object.assign({}, DEFAULT_SYSTEM_CONFIG);
      }
    },

    getGoldenHourRules() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.GOLDEN_HOURS) || '[]') || [];
      } catch (e) {
        return [];
      }
    },

    getMaintenanceSchedules() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.MAINTENANCE) || '[]') || [];
      } catch (e) {
        return [];
      }
    },

    findMaintenanceForSlot(pitchId, dateStr, slotTime = '') {
      const list = this.getMaintenanceSchedules();
      if (!Array.isArray(list) || !list.length || !pitchId || !dateStr) return null;
      const d = String(dateStr).slice(0, 10);
      const parseMin = (hhmm) => {
        const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
        return m ? (parseInt(m[1], 10) * 60 + parseInt(m[2], 10)) : null;
      };
      const slotMatch = String(slotTime || '').match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
      const sStart = slotMatch ? parseMin(slotMatch[1]) : null;
      const sEnd = slotMatch ? parseMin(slotMatch[2]) : null;
      for (const m of list) {
        if (m.pitchId !== pitchId && m.pitch_id !== pitchId) continue;
        const st = String(m.status || 'scheduled');
        if (st !== 'scheduled' && st !== 'in_progress') continue;
        const mStartDate = String(m.startDate || m.start_date || '');
        const mEndDate = String(m.endDate || m.end_date || '');
        if (!mStartDate || !mEndDate || d < mStartDate || d > mEndDate) continue;
        if (sStart === null || sEnd === null) return m;
        const mStart = parseMin(m.startTime || m.start_time || '05:30') ?? (5 * 60 + 30);
        const mEnd = parseMin(m.endTime || m.end_time || '23:00') ?? (23 * 60);
        if (mEnd <= mStart || (sStart < mEnd && mStart < sEnd)) return m;
      }
      return null;
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

    getExtraServices() {
      return this.getServices();
    },

    getVouchers() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.VOUCHERS)) || [];
      } catch (e) {
        return window.SanBongData?.DEFAULT_VOUCHERS || [];
      }
    },

    getPackagePromotions() {
      return window.SanBongData?.PACKAGE_PROMOTIONS || {};
    },

    getPackagePromotion(weeks) {
      const all = this.getPackagePromotions();
      const w = parseInt(weeks, 10) || 1;
      if (w >= 12) return all[12] || null;
      if (w >= 8) return all[8] || null;
      if (w >= 4) return all[4] || null;
      return null;
    },

    saveVoucher(v) {
      if (!v || !v.code) return null;
      const code = String(v.code).trim().toUpperCase();
      const origCode = v.originalCode ? String(v.originalCode).trim().toUpperCase() : code;
      const list = this.getVouchers();
      const origIdx = list.findIndex(x => String(x.code).toUpperCase() === origCode);
      const existingIdx = origIdx >= 0 ? origIdx : list.findIndex(x => String(x.code).toUpperCase() === code);
      const prevActive = existingIdx >= 0 && list[existingIdx].isActive !== undefined ? Boolean(list[existingIdx].isActive) : true;
      const item = {
        code,
        description: String(v.description || '').trim() || `Ưu đãi mã ${code}`,
        type: v.type === 'fixed' ? 'fixed' : 'percent',
        value: Math.max(0, Number(v.value) || 0),
        minOrder: Math.max(0, Number(v.minOrder) || 0),
        maxUsage: Math.max(0, Number(v.maxUsage ?? v.max_usage ?? 100)),
        usedCount: Math.max(0, Number(v.usedCount ?? v.used_count ?? (existingIdx >= 0 ? list[existingIdx].usedCount : 0) ?? 0)),
        validFrom: v.validFrom ?? v.valid_from ?? null,
        validTo: v.validTo ?? v.valid_to ?? null,
        pitchTypeLimit: (v.pitchTypeLimit ?? v.pitch_type_limit) ? Number(v.pitchTypeLimit ?? v.pitch_type_limit) : null,
        isActive: v.isActive !== undefined ? Boolean(v.isActive) : prevActive
      };
      if (existingIdx >= 0) {
        list[existingIdx] = item;
      } else {
        list.unshift(item);
      }
      localStorage.setItem(STORAGE_KEYS.VOUCHERS, JSON.stringify(list));
      return item;
    },

    toggleVoucherActive(code) {
      if (!code) return null;
      const target = String(code).trim().toUpperCase();
      const list = this.getVouchers();
      const idx = list.findIndex(x => String(x.code).toUpperCase() === target);
      if (idx < 0) return null;
      list[idx].isActive = list[idx].isActive === false ? true : false;
      localStorage.setItem(STORAGE_KEYS.VOUCHERS, JSON.stringify(list));
      return list[idx];
    },

    deleteVoucher(code) {
      if (!code) return false;
      const target = String(code).trim().toUpperCase();
      const list = this.getVouchers().filter(x => String(x.code).toUpperCase() !== target);
      localStorage.setItem(STORAGE_KEYS.VOUCHERS, JSON.stringify(list));
      return true;
    },

    getBankInfo() {
      try {
        const b = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANK)) || {};
        if (b.accountNo && !b.accountNumber) b.accountNumber = b.accountNo;
        if (b.accountNumber && !b.accountNo) b.accountNo = b.accountNumber;
        return b;
      } catch (e) {
        return window.SanBongData?.DEFAULT_BANK_INFO || {};
      }
    },

    getUser() {
      try {
        let sessionUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
        if (!sessionUser) {
          sessionUser = JSON.parse(localStorage.getItem('sb_current_user') || 'null');
          if (sessionUser) {
            try { sessionStorage.setItem('sb_current_user', JSON.stringify(sessionUser)); } catch (e) {}
          }
        }
        if (sessionUser && sessionUser.full_name) {
          const customerTier = String(sessionUser.customer_tier || sessionUser.customerTier || sessionUser.tier || 'standard').trim().toLowerCase();
          const tierLabels = { standard: 'Hội viên', bronze: 'Hội viên Đồng', silver: 'Hội viên Bạc', regular: 'Khách thân thiết', gold: 'Hội viên Vàng', vip: 'Khách VIP', diamond: 'Hội viên Kim Cương' };
          return {
            id: sessionUser.id,
            name: sessionUser.full_name,
            phone: sessionUser.phone || '',
            email: sessionUser.email || '',
            team: sessionUser.team || '',
            role: sessionUser.role || 'user',
            customer_tier: customerTier,
            tier: sessionUser.role === 'admin'
              ? 'Quản trị viên'
              : (sessionUser.role === 'manager'
                ? 'Quản lý sân'
                : (sessionUser.role === 'staff' ? 'Nhân viên trực sân' : (sessionUser.tier || tierLabels[customerTier] || 'Hội viên'))),
            points: Number(sessionUser.points) || 0,
            avatar: sessionUser.full_name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase(),
            totalBookings: 0,
            favoritePitch: ''
          };
        }
        return null;
      } catch (e) {
        return null;
      }
    },

    getCurrentUser() {
      return this.getUser();
    },

    updateUser(updates) {
      try {
        let sessionUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
        if (!sessionUser) {
          sessionUser = JSON.parse(localStorage.getItem('sb_current_user') || 'null');
        }
        if (sessionUser) {
          const updated = Object.assign({}, sessionUser, updates);
          sessionStorage.setItem('sb_current_user', JSON.stringify(updated));
          try { localStorage.setItem('sb_current_user', JSON.stringify(updated)); } catch (e) {}
          return updated;
        }
        return null;
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

      const bookings = this.getAllBookings().filter(b => b.pitchId === pitchId && b.date === dateStr && b.status !== 'Đã hủy' && b.status !== 'Khách chưa đến' && b.status !== 'Vắng mặt (No-Show)' && b.paymentStatus !== 'Tịch thu cọc 30%');

      return slots.map(slot => {
        if (isPitchMaintenance) {
          return { ...slot, status: 'Bảo trì', booking: null, maintenanceReason: pitch?.maintenanceReason || 'Sân đang bảo trì' };
        }
        const mWin = this.findMaintenanceForSlot ? this.findMaintenanceForSlot(pitchId, dateStr, slot.time) : null;
        if (mWin) {
          return { ...slot, status: 'Bảo trì', booking: null, maintenanceReason: mWin.reason || 'Bảo trì định kỳ' };
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

    calculatePrice(pitchId, dateStr, slotIdOrTime, servicesList = [], voucherCode = '', weeksCount = 1) {
      const pitch = this.getPitchById(pitchId);
      if (!pitch) return null;

      const weeks = Math.max(1, parseInt(weeksCount, 10) || 1);
      const slots = this.getTimeSlots();
      const slot = slots.find(s => s.id === slotIdOrTime || s.time === slotIdOrTime);
      const isPeak = slot ? slot.isPeak : false;

      let isWeekend = false;
      let dayIso = 1;
      if (dateStr) {
        const dObj = new Date(String(dateStr).split(' ')[0] + 'T00:00:00');
        if (!isNaN(dObj.getTime())) {
          const day = dObj.getDay();
          isWeekend = (day === 0 || day === 6);
          dayIso = day === 0 ? 7 : day;
        }
      }

      let hourlyRate = isPeak ? Number(pitch.peakPrice || pitch.basePrice || 0) : Number(pitch.basePrice || 0);
      if (isWeekend && Number(pitch.weekendPrice) > 0) {
        hourlyRate = isPeak ? Math.max(Number(pitch.peakPrice || 0), Number(pitch.weekendPrice)) : Number(pitch.weekendPrice);
      }

      let singlePitchPrice = hourlyRate;
      if (slot && slot.duration && slot.duration > 1) {
        singlePitchPrice = Math.round(singlePitchPrice * slot.duration);
      }
      const rawPitchTotal = singlePitchPrice * weeks;

      let singleServiceTotal = 0;
      const allServices = this.getServices();
      const appliedServices = [];

      if (Array.isArray(servicesList)) {
        servicesList.forEach(item => {
          const srvDef = allServices.find(s => s.id === item.id);
          if (srvDef && item.quantity > 0) {
            const lineTotal = srvDef.price * item.quantity * weeks;
            singleServiceTotal += srvDef.price * item.quantity;
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

      const serviceTotal = singleServiceTotal * weeks;
      const packagePromotion = this.getPackagePromotion(weeks);
      let monthlyDiscountRate = packagePromotion ? packagePromotion.discountRate : 0;
      if (!monthlyDiscountRate) {
        if (weeks >= 12) monthlyDiscountRate = 0.15;
        else if (weeks >= 8) monthlyDiscountRate = 0.10;
        else if (weeks >= 4) monthlyDiscountRate = 0.05;
      }

      const pitchPriceBeforeRule = Math.round(rawPitchTotal * (1 - monthlyDiscountRate));
      const monthlyDiscountAmount = Math.max(0, rawPitchTotal - pitchPriceBeforeRule);

      // Quy tắc giá giờ vàng / thấp điểm (giống resolve_golden_hour_adjustment ở server)
      let netPitchPrice = pitchPriceBeforeRule;
      let goldenHourRule = null;
      let goldenHourDelta = 0;
      const ghRules = this.getGoldenHourRules ? this.getGoldenHourRules() : [];
      if (Array.isArray(ghRules) && ghRules.length > 0 && pitchPriceBeforeRule > 0) {
        const pitchType = Number(pitch.type || 7);
        const sId = slot ? slot.id : String(slotIdOrTime || '');
        const matchingRules = ghRules.filter(r => {
          const rType = r.pitchType ?? r.pitch_type ?? null;
          const rDay = r.dayOfWeek ?? r.day_of_week ?? null;
          const rSlot = r.slotId ?? r.slot_id ?? null;
          if (rType !== null && rType !== '' && Number(rType) !== pitchType) return false;
          if (rDay !== null && rDay !== '' && Number(rDay) !== dayIso) return false;
          if (rSlot !== null && rSlot !== '' && String(rSlot) !== String(sId)) return false;
          return true;
        }).map(r => {
          const rType = r.pitchType ?? r.pitch_type ?? null;
          const rDay = r.dayOfWeek ?? r.day_of_week ?? null;
          const rSlot = r.slotId ?? r.slot_id ?? null;
          const score = (rType !== null && rType !== '' ? 1 : 0) + (rDay !== null && rDay !== '' ? 2 : 0) + (rSlot !== null && rSlot !== '' ? 4 : 0);
          return { r, score };
        }).sort((a, b) => (b.score - a.score) || (Number(b.r.id || 0) - Number(a.r.id || 0)));

        if (matchingRules.length > 0) {
          const best = matchingRules[0].r;
          const adjType = best.priceAdjustmentType || best.price_adjustment_type || 'fixed';
          const adjVal = Number(best.adjustmentValue ?? best.adjustment_value ?? 0);
          if (adjType === 'fixed') {
            netPitchPrice = Math.max(50000, pitchPriceBeforeRule + adjVal);
          } else if (adjType === 'percent_discount') {
            const pct = Math.max(0, Math.min(90, adjVal));
            netPitchPrice = Math.max(50000, Math.round(pitchPriceBeforeRule * (1 - pct / 100)));
          } else if (adjType === 'percent_surcharge') {
            const pct = Math.max(0, Math.min(200, adjVal));
            netPitchPrice = Math.round(pitchPriceBeforeRule * (1 + pct / 100));
          }
          goldenHourDelta = netPitchPrice - pitchPriceBeforeRule;
          goldenHourRule = best;
        }
      }

      const pitchPrice = rawPitchTotal;
      const subtotal = netPitchPrice + serviceTotal;

      let discountAmount = 0;
      let appliedVoucher = null;
      let voucherError = '';
      if (voucherCode) {
        const todayLocal = window.SanBongHelpers?.getLocalTodayISO
          ? window.SanBongHelpers.getLocalTodayISO()
          : new Date().toISOString().split('T')[0];
        const v = this.getVouchers().find(vc => vc.code.toUpperCase() === voucherCode.trim().toUpperCase() && vc.isActive !== false);
        if (!v) {
          voucherError = 'Mã giảm giá không tồn tại hoặc đã ngừng áp dụng.';
        } else if ((v.validFrom && todayLocal < v.validFrom) || (v.validTo && todayLocal > v.validTo)) {
          voucherError = 'Mã giảm giá chưa đến ngày áp dụng hoặc đã hết hạn.';
        } else if (v.pitchTypeLimit && Number(v.pitchTypeLimit) !== Number(pitch.type)) {
          voucherError = `Mã giảm giá này chỉ áp dụng riêng cho Sân ${v.pitchTypeLimit} người.`;
        } else if (Number(v.maxUsage || 0) > 0 && Number(v.usedCount || 0) >= Number(v.maxUsage)) {
          voucherError = 'Mã giảm giá đã hết lượt sử dụng.';
        } else if (v.code.toUpperCase() === 'VIPGOLD' || (v.requiredTier || v.required_tier)) {
          const curUser = this.getUser ? this.getUser() : null;
          const requiredTier = String(v.requiredTier || v.required_tier || 'vip,regular').trim().toLowerCase();
          const unrestricted = requiredTier === 'standard' || requiredTier === 'all';
          if ((!curUser || !curUser.name) && !unrestricted) {
            voucherError = 'Bạn chưa đủ điều kiện. Vui lòng đăng nhập tài khoản thành viên Vàng / Kim Cương để dùng mã này.';
          } else {
            const rawTier = String(curUser?.customer_tier || curUser?.tier || 'standard').trim().toLowerCase();
            const legacyTiers = { 'hội viên vàng': 'gold', 'hội viên kim cương': 'diamond', 'khách vip': 'vip', 'khách thân thiết': 'regular' };
            const canonicalTier = legacyTiers[rawTier] || rawTier;
            const tierRank = { standard: 1, bronze: 2, silver: 3, regular: 4, gold: 4, vip: 5, diamond: 5 };
            const requiredTiers = requiredTier.split(',').map(t => t.trim()).filter(Boolean);
            const isQualified = unrestricted || requiredTiers.some(t => (tierRank[canonicalTier] || 1) >= (tierRank[t] || 99));
            if (!isQualified) {
              voucherError = 'Bạn chưa đủ điều kiện. Mã này chỉ dành riêng cho hội viên hạng Vàng và Kim Cương.';
            } else if (subtotal < (v.minOrder || 0)) {
              voucherError = `Đơn hàng chưa đạt tối thiểu ${Number(v.minOrder || 0).toLocaleString('vi-VN')}đ.`;
            } else {
              appliedVoucher = v;
              if (v.type === 'percent') {
                discountAmount = Math.round((subtotal * v.value) / 100);
              } else {
                discountAmount = Math.min(v.value, subtotal);
              }
            }
          }
        } else if (subtotal < (v.minOrder || 0)) {
          voucherError = `Đơn hàng chưa đạt tối thiểu ${Number(v.minOrder || 0).toLocaleString('vi-VN')}đ.`;
        } else {
          appliedVoucher = v;
          if (v.type === 'percent') {
            discountAmount = Math.round((subtotal * v.value) / 100);
          } else {
            discountAmount = Math.min(v.value, subtotal);
          }
        }
      }

      const totalDiscount = monthlyDiscountAmount + discountAmount + Math.max(0, -goldenHourDelta);
      const totalPrice = Math.max(0, subtotal - discountAmount);
      const sysCfg = this.getSystemConfig ? this.getSystemConfig() : { depositRate: 30 };
      const depositRate = Math.max(10, Math.min(100, Number(sysCfg.depositRate) || 30)) / 100;
      const depositAmount = Math.round(totalPrice * depositRate);
      const remainingAmount = totalPrice - depositAmount;

      return {
        pitchPrice,
        netPitchPrice,
        singlePitchPrice,
        isPeak,
        isWeekend,
        goldenHourRule,
        goldenHourDelta,
        serviceTotal,
        singleServiceTotal,
        appliedServices,
        subtotal: rawPitchTotal + serviceTotal,
        netSubtotal: subtotal,
        weeksCount: weeks,
        packagePromotion,
        monthlyDiscountRate,
        monthlyDiscountAmount,
        voucherCode: appliedVoucher ? appliedVoucher.code : '',
        voucherError,
        discountAmount,
        totalDiscount,
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
      const weeksCount = Math.max(1, parseInt(bookingInput.weeksCount, 10) || 1);

      const pricing = this.calculatePrice(
        bookingInput.pitchId,
        bookingInput.date,
        bookingInput.slotId || bookingInput.slotTime,
        bookingInput.services || [],
        bookingInput.voucherCode || '',
        weeksCount
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
        bookingMode: bookingInput.bookingMode || (weeksCount > 1 ? 'monthly' : 'single'),
        weeksCount: weeksCount,
        packagePromotion: pricing?.packagePromotion || this.getPackagePromotion(weeksCount) || null,
        monthlyDates: Array.isArray(bookingInput.monthlyDates) ? bookingInput.monthlyDates : [],
        monthlyDiscountAmount: pricing ? pricing.monthlyDiscountAmount : 0,
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
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (booking) {
        const oldStatus = booking.status;
        booking.status = 'Đang đá';
        booking.checkinTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        if (!booking.paymentStatus || booking.paymentStatus === 'Chờ duyệt cọc' || booking.paymentStatus === 'Chờ cọc 30%') {
          booking.paymentStatus = 'Đã cọc 30%';
        }
        if (typeof booking.remainingAmount !== 'number' || booking.remainingAmount <= 0) {
          const total = Number(booking.totalPrice || 0);
          const dep = Number(booking.depositAmount || Math.round(total * 0.3));
          booking.remainingAmount = Math.max(0, total - dep);
        }
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
        this.addAuditLog('CHECKIN', bookingCode, `Trạng thái: ${oldStatus}`, `Trạng thái: Đang đá (${booking.checkinTime})`);
        return booking;
      }
      return null;
    },

    addOvertimeToBooking(bookingCode, minutes, fee) {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (!booking) return null;
      const mins = Math.max(0, parseInt(minutes, 10) || 0);
      const extraFee = Math.max(0, parseInt(fee, 10) || 0);
      booking.overtimeMinutes = (Number(booking.overtimeMinutes) || 0) + mins;
      booking.overtimeFee = (Number(booking.overtimeFee) || 0) + extraFee;
      booking.totalPrice = (Number(booking.totalPrice) || 0) + extraFee;
      booking.remainingAmount = (Number(booking.remainingAmount) || 0) + extraFee;
      booking.note = (booking.note ? booking.note + ' | ' : '') + `[Đá thêm ${mins}p: +${extraFee.toLocaleString('vi-VN')}đ]`;
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      return booking;
    },

    changePitchForBooking(bookingCode, newPitchId, adjustPrice = false, reason = '') {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      const newPitch = this.getPitchById(newPitchId);
      if (!booking || !newPitch) return null;
      const oldPitchName = booking.pitchName || booking.pitchId;
      booking.pitchId = newPitch.id;
      booking.pitchName = newPitch.name;

      let diff = 0;
      if (adjustPrice) {
        const slots = this.getTimeSlots();
        const slot = slots.find(s => s.id === booking.slotId || s.time === booking.slotTime);
        const isPeak = slot ? slot.isPeak : false;
        const duration = (slot && slot.duration) ? slot.duration : 1;
        const weeks = Math.max(1, Number(booking.weeksCount) || 1);
        const newPitchPrice = Math.round((isPeak ? newPitch.peakPrice : newPitch.basePrice) * duration) * weeks;
        const oldPitchPrice = Number(booking.pitchPrice || 0);
        diff = newPitchPrice - oldPitchPrice;
        booking.pitchPrice = newPitchPrice;
        booking.totalPrice = Math.max(0, Number(booking.totalPrice || 0) + diff);
        booking.remainingAmount = Math.max(0, Number(booking.remainingAmount || 0) + diff);
      }
      const diffNote = adjustPrice && diff !== 0 ? ` (${diff > 0 ? '+' : ''}${diff.toLocaleString('vi-VN')}đ)` : ' (Giữ nguyên giá)';
      booking.note = (booking.note ? booking.note + ' | ' : '') + `[Đổi sân: ${oldPitchName} -> ${newPitch.name}${diffNote}${reason ? ' - Lý do: ' + reason : ''}]`;
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      this.addAuditLog('TRANSFER_PITCH', bookingCode, `Sân: ${oldPitchName}`, `Sân: ${newPitch.name}${diffNote}${reason ? ' (' + reason + ')' : ''}`);
      return booking;
    },

    addInPlayService(bookingCode, serviceId, quantity = 1) {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      const srvDef = this.getServices().find(s => s.id === serviceId);
      if (!booking || !srvDef) return null;
      const qty = Math.max(1, parseInt(quantity, 10) || 1);
      const addedCost = srvDef.price * qty;

      if (!Array.isArray(booking.services)) booking.services = [];
      const existing = booking.services.find(s => s.id === srvDef.id);
      if (existing) {
        existing.quantity = (Number(existing.quantity) || 0) + qty;
        existing.lineTotal = existing.quantity * srvDef.price;
      } else {
        booking.services.push({
          id: srvDef.id,
          name: srvDef.name,
          price: srvDef.price,
          quantity: qty,
          unit: srvDef.unit,
          lineTotal: addedCost
        });
      }

      booking.totalPrice = (Number(booking.totalPrice) || 0) + addedCost;
      booking.remainingAmount = (Number(booking.remainingAmount) || 0) + addedCost;
      booking.note = (booking.note ? booking.note + ' | ' : '') + `[Gọi thêm: ${srvDef.name} x${qty} (+${addedCost.toLocaleString('vi-VN')}đ)]`;
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      this.deductServiceStock(srvDef.id, qty);
      return booking;
    },

    cancelBookingEarly(bookingCode, policy = 'refund_100', reason = '') {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (!booking) return null;
      const oldStatus = booking.status;
      const oldPay = booking.paymentStatus;
      const policyMap = {
        'refund_100': 'Đã hoàn cọc 100%',
        'reserve': 'Bảo lưu cọc 30%',
        'forfeit_50': 'Phạt 50% cọc'
      };
      booking.status = 'Đã hủy';
      booking.paymentStatus = policyMap[policy] || 'Đã hoàn cọc 100%';
      booking.remainingAmount = 0;
      booking.cancelPolicy = policy;
      booking.cancelReason = reason || 'Hủy lịch trước thời hạn';
      booking.note = (booking.note ? booking.note + ' | ' : '') + `[Hủy trước hạn - ${booking.paymentStatus}${reason ? ': ' + reason : ''}]`;
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      this.addAuditLog('CANCEL_BOOKING', bookingCode, `${oldStatus} (${oldPay})`, `Đã hủy (${booking.paymentStatus}) - Lý do: ${booking.cancelReason}`);
      return booking;
    },

    completeAndPayRemaining(bookingCode, payMethod = 'Tiền mặt tại quầy') {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (!booking) return null;
      const total = Number(booking.totalPrice || 0);
      const deposit = Number(booking.depositAmount || Math.round(total * 0.3));
      const calcRem = (typeof booking.remainingAmount === 'number' && booking.remainingAmount > 0)
        ? booking.remainingAmount
        : Math.max(0, total - deposit);
      const paidRem = Number(booking.paidRemainingAmount || calcRem);
      booking.paidRemainingAmount = paidRem;
      booking.remainingPaymentMethod = payMethod;
      booking.remainingAmount = 0;
      booking.status = 'Hoàn thành';
      booking.paymentStatus = 'Đã thanh toán 100%';
      booking.completedAt = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      if (!String(booking.note || '').includes('Đã tất toán phần còn lại')) {
        booking.note = (booking.note ? booking.note + ' | ' : '') + `[Đã tất toán phần còn lại ${paidRem.toLocaleString('vi-VN')}đ qua ${payMethod}]`;
      }
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      this.addAuditLog('COLLECT_PAYMENT', bookingCode, `Còn nợ: ${calcRem.toLocaleString('vi-VN')}đ`, `Thu đủ ${paidRem.toLocaleString('vi-VN')}đ (${payMethod})`);
      return booking;
    },

    releaseNoShowBooking(bookingCode) {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (booking) {
        const oldStatus = booking.status;
        booking.status = 'Khách chưa đến';
        booking.paymentStatus = 'Tịch thu cọc 30%';
        booking.note = (booking.note ? booking.note + ' | ' : '') + '[Quá 15p khách chưa đến - Đã nhả sân trống]';
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
        this.addAuditLog('NOSHOW_RELEASE', bookingCode, `Trạng thái: ${oldStatus}`, 'Khách chưa đến (Tịch thu cọc 30% & Nhả sân)');
        return booking;
      }
      return null;
    },

    restoreBooking(bookingCode) {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (booking) {
        const oldStatus = booking.status;
        booking.status = 'Đã xác nhận';
        booking.paymentStatus = 'Đã cọc 30%';
        booking.remainingAmount = Math.max(0, Number(booking.totalPrice || 0) - Number(booking.depositAmount || 0));
        booking.note = (booking.note ? booking.note + ' | ' : '') + '[Đã khôi phục lại ca đá]';
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
        this.addAuditLog('RESTORE_BOOKING', bookingCode, `Trạng thái: ${oldStatus}`, 'Đã xác nhận (Khôi phục ca đá)');
        return booking;
      }
      return null;
    },

    upsertPitch(pitchData) {
      if (!pitchData || !pitchData.id) return null;
      const list = this.getPitches();
      const cleanId = String(pitchData.id).trim().toUpperCase();
      const existingIdx = list.findIndex(p => String(p.id).toUpperCase() === cleanId);
      const oldPitch = existingIdx >= 0 ? Object.assign({}, list[existingIdx]) : null;
      const pType = Number(pitchData.type) || (cleanId.startsWith('P11') ? 11 : (cleanId.startsWith('P7') ? 7 : 5));
      const basePrice = Math.max(0, Number(pitchData.basePrice) || (pType === 11 ? 900000 : (pType === 7 ? 450000 : 250000)));
      const peakPrice = Math.max(0, Number(pitchData.peakPrice) || (pType === 11 ? 1200000 : (pType === 7 ? 650000 : 350000)));
      const weekendPrice = Math.max(0, Number(pitchData.weekendPrice) || (pType === 11 ? 1400000 : (pType === 7 ? 700000 : 380000)));

      const updatedPitch = Object.assign({}, oldPitch || {}, {
        id: cleanId,
        name: String(pitchData.name || cleanId).trim(),
        type: pType,
        typeLabel: `Sân ${pType} người`,
        size: String(pitchData.size || (oldPitch ? oldPitch.size : '') || (pType === 11 ? '60m x 95m' : (pType === 7 ? '40m x 60m' : '22m x 42m'))).trim(),
        grass: String(pitchData.grass || (oldPitch ? oldPitch.grass : '') || 'Cỏ nhân tạo FIFA Quality · Đèn LED 400W').trim(),
        basePrice,
        peakPrice,
        weekendPrice,
        status: pitchData.status || (oldPitch ? oldPitch.status : 'Hoạt động'),
        badge: oldPitch?.badge || `Sân ${pType} Tiêu Chuẩn`,
        rating: oldPitch?.rating || 4.9,
        reviews: oldPitch?.reviews || 20,
        amenities: oldPitch?.amenities || ['Đèn LED chống chói', 'Lưới chắn mới', 'Nước uống tại sân']
      });

      if (existingIdx >= 0) {
        list[existingIdx] = updatedPitch;
      } else {
        list.push(updatedPitch);
      }
      localStorage.setItem(STORAGE_KEYS.PITCHES, JSON.stringify(list));
      this.addAuditLog(
        'PITCH_UPSERT',
        cleanId,
        oldPitch ? `${oldPitch.name} (${oldPitch.basePrice.toLocaleString('vi-VN')}đ / ${oldPitch.peakPrice.toLocaleString('vi-VN')}đ) [${oldPitch.status}]` : 'Tạo sân mới',
        `${updatedPitch.name} (Thường: ${basePrice.toLocaleString('vi-VN')}đ | Cao điểm: ${peakPrice.toLocaleString('vi-VN')}đ | Cuối tuần: ${weekendPrice.toLocaleString('vi-VN')}đ) [${updatedPitch.status}]`
      );
      return updatedPitch;
    },

    saveServiceItem(srvData) {
      if (!srvData || !srvData.id) return null;
      const list = this.getServices();
      const cleanId = String(srvData.id).trim().toUpperCase();
      const idx = list.findIndex(s => String(s.id).toUpperCase() === cleanId);
      const item = {
        id: cleanId,
        name: String(srvData.name || cleanId).trim(),
        price: Math.max(0, Number(srvData.price) || 0),
        unit: String(srvData.unit || 'cái').trim(),
        stockQty: Math.max(0, parseInt(srvData.stockQty, 10) || 0),
        minStockWarning: Math.max(0, parseInt(srvData.minStockWarning, 10) || 5),
        icon: srvData.icon || (idx >= 0 ? list[idx].icon : '🥤')
      };
      if (idx >= 0) {
        list[idx] = item;
      } else {
        list.push(item);
      }
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(list));
      return item;
    },

    deleteServiceItem(serviceId) {
      if (!serviceId) return false;
      const target = String(serviceId).trim().toUpperCase();
      const list = this.getServices().filter(s => String(s.id).toUpperCase() !== target);
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(list));
      return true;
    },

    restockService(serviceId, addQty) {
      const list = this.getServices();
      const item = list.find(s => String(s.id).toUpperCase() === String(serviceId).toUpperCase());
      const qty = Math.max(0, parseInt(addQty, 10) || 0);
      if (!item || qty <= 0) return null;
      item.stockQty = Math.max(0, Number(item.stockQty || 0)) + qty;
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(list));
      return item;
    },

    deductServiceStock(serviceId, deductQty) {
      const list = this.getServices();
      const item = list.find(s => String(s.id).toUpperCase() === String(serviceId).toUpperCase());
      const qty = Math.max(0, parseInt(deductQty, 10) || 0);
      if (!item || qty <= 0) return null;
      item.stockQty = Math.max(0, Number(item.stockQty || 0) - qty);
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(list));
      return item;
    },

    getCounterSales() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.COUNTER_SALES) || '[]') || [];
      } catch (e) {
        return [];
      }
    },

    recordCounterSale({ serviceId, quantity, payMethod, paymentMethod, note }) {
      const resolvedPayMethod = payMethod || paymentMethod || 'Tiền mặt tại quầy';
      const list = this.getServices();
      const srv = list.find(s => String(s.id).toUpperCase() === String(serviceId).toUpperCase());
      if (!srv) return null;
      const qty = Math.max(1, parseInt(quantity, 10) || 1);
      const oldStock = Number(srv.stockQty ?? 20);
      const newStock = Math.max(0, oldStock - qty);
      srv.stockQty = newStock;
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(list));

      const totalAmount = Number(srv.price || 0) * qty;
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const user = this.getUser();
      const sale = {
        id: 'POS-' + Date.now().toString().slice(-6),
        serviceId: srv.id,
        serviceName: srv.name,
        quantity: qty,
        unitPrice: srv.price,
        totalAmount,
        payMethod: resolvedPayMethod,
        note: note || '',
        createdAt: timestamp,
        staffName: user ? user.name : 'Nhân viên trực sân'
      };
      const sales = this.getCounterSales();
      sales.unshift(sale);
      localStorage.setItem(STORAGE_KEYS.COUNTER_SALES, JSON.stringify(sales));
      this.addAuditLog(
        'COUNTER_SALE',
        sale.id,
        `Tồn kho ${srv.name}: ${oldStock} ${srv.unit}`,
        `Bán ${qty} ${srv.unit} (${totalAmount.toLocaleString('vi-VN')}đ - ${sale.payMethod}) · Tồn còn: ${newStock}`
      );
      return { sale, service: srv };
    },

    getAuditLogs() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS) || '[]') || [];
      } catch (e) {
        return [];
      }
    },

    addAuditLog(action, targetCode, oldValue, newValue) {
      try {
        const logs = this.getAuditLogs();
        const user = this.getUser();
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const createdAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        const entry = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          created_at: createdAt,
          actor_name: user ? user.name : 'Quản Trị Viên',
          actor_role: user ? user.role : 'admin',
          action: String(action || 'SYSTEM'),
          target_code: String(targetCode || '---'),
          old_value: typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue || '---'),
          new_value: typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue || '---'),
          ip_address: '127.0.0.1'
        };
        logs.unshift(entry);
        localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, 300)));
        return entry;
      } catch (e) {
        return null;
      }
    },

    getPhoneNoShowAndDebt(phone) {
      const clean = String(phone || '').replace(/\D+/g, '');
      if (clean.length < 9) {
        return { phone: clean, noShowCount: 0, debtCount: 0, debtAmount: 0 };
      }
      const bookings = this.getAllBookings();
      let noShowCount = 0;
      let debtCount = 0;
      let debtAmount = 0;
      bookings.forEach(b => {
        const bPhone = String(b.phone || '').replace(/\D+/g, '');
        if (!bPhone || (!bPhone.endsWith(clean.slice(-9)) && bPhone !== clean)) return;
        const st = String(b.status || '');
        const paySt = String(b.paymentStatus || '');
        if (st === 'Khách chưa đến' || st.includes('No-Show') || paySt === 'Tịch thu cọc 30%') {
          noShowCount += 1;
        }
        const rem = Number(b.remainingAmount || 0);
        if (rem > 0 && st !== 'Đã hủy' && st !== 'Khách chưa đến' && !st.includes('No-Show') && st !== 'Hoàn thành') {
          debtCount += 1;
          debtAmount += rem;
        }
      });
      return { phone: clean, noShowCount, debtCount, debtAmount };
    },

    getCurrentShiftStats() {
      const startTime = localStorage.getItem('sb_active_shift_start') || 'Hôm nay, 06:00';
      const startDatePart = String(startTime).split(' ')[0];
      const bookings = this.getAllBookings();
      let cashTotal = 0;
      let transferTotal = 0;

      bookings.forEach(b => {
        if (b.status === 'Đã hủy') return;
        const bDate = String(b.createdAt || b.date || '').split(' ')[0];
        if (startDatePart && bDate && bDate < startDatePart && b.date !== startDatePart) return;

        const dep = Number(b.depositAmount || 0);
        const payMethod = String(b.paymentMethod || '');
        const payStatus = String(b.paymentStatus || '');
        if (dep > 0 && (payStatus.includes('Đã cọc') || payStatus.includes('Đã thanh toán') || payStatus.includes('Tịch thu cọc'))) {
          if (payMethod.includes('Tiền mặt')) {
            cashTotal += dep;
          } else {
            transferTotal += dep;
          }
        }
        if (b.status === 'Hoàn thành') {
          const paidRem = Number(b.paidRemainingAmount || 0);
          const remMethod = String(b.remainingPaymentMethod || 'Tiền mặt tại quầy');
          if (paidRem > 0) {
            if (remMethod.includes('VietQR') || remMethod.includes('Chuyển khoản')) {
              transferTotal += paidRem;
            } else {
              cashTotal += paidRem;
            }
          }
        }
      });

      const sales = this.getCounterSales();
      sales.forEach(s => {
        const sDate = String(s.createdAt || '').split(' ')[0];
        if (startDatePart && sDate && sDate < startDatePart) return;
        const amt = Number(s.totalAmount || 0);
        if (String(s.payMethod || '').includes('VietQR') || String(s.payMethod || '').includes('Chuyển khoản')) {
          transferTotal += amt;
        } else {
          cashTotal += amt;
        }
      });

      return { startTime, cashTotal, transferTotal };
    },

    getShifts() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.SHIFTS) || '[]') || [];
      } catch (e) {
        return [];
      }
    },

    closeShift(note = '') {
      const stats = this.getCurrentShiftStats();
      const user = this.getUser();
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const shiftId = `CA-${String(now.getFullYear()).slice(-2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;

      const newShift = {
        id: shiftId,
        staff_name: user ? user.name : 'Nhân viên trực sân',
        staff_username: user ? (user.username || user.role) : 'staff',
        opened_at: stats.startTime,
        closed_at: nowStr,
        cash_declared: stats.cashTotal,
        transfer_declared: stats.transferTotal,
        actual_cash: null,
        diff_amount: null,
        status: 'closed',
        note: String(note || '').trim()
      };

      const shifts = this.getShifts();
      shifts.unshift(newShift);
      localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
      localStorage.setItem('sb_active_shift_start', nowStr);

      this.addAuditLog(
        'SHIFT_CLOSE',
        shiftId,
        `Mở ca: ${stats.startTime}`,
        `Chốt ca: TM ${stats.cashTotal.toLocaleString('vi-VN')}đ | CK ${stats.transferTotal.toLocaleString('vi-VN')}đ${note ? ' (' + note + ')' : ''}`
      );
      return newShift;
    },

    confirmShift(shiftId, actualCash) {
      const shifts = this.getShifts();
      const shift = shifts.find(s => String(s.id) === String(shiftId));
      if (!shift) return null;
      const actual = Math.max(0, Number(actualCash) || 0);
      const declared = Number(shift.cash_declared || 0);
      const diff = actual - declared;
      shift.actual_cash = actual;
      shift.diff_amount = diff;
      shift.status = 'confirmed';
      localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));

      this.addAuditLog(
        'SHIFT_CONFIRM',
        shift.id,
        `Tiền mặt kê khai: ${declared.toLocaleString('vi-VN')}đ`,
        `Thực nhận: ${actual.toLocaleString('vi-VN')}đ · Chênh lệch: ${diff === 0 ? 'Khớp 0đ' : (diff > 0 ? '+' + diff.toLocaleString('vi-VN') + 'đ' : diff.toLocaleString('vi-VN') + 'đ')}`
      );
      return shift;
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

      let processed = [];
      try {
        processed = JSON.parse(localStorage.getItem('sb_processed_receipts_v1') || '[]');
        if (!Array.isArray(processed)) processed = [];
      } catch (e) {
        processed = [];
      }

      list = list.filter(item => !processed.includes(item.code));

      const pendingBookings = this.getAllBookings().filter(b => b.paymentStatus === 'Chờ duyệt cọc' && b.status !== 'Đã hủy' && !processed.includes(b.code));
      pendingBookings.forEach(pb => {
        if (!list.some(item => item.code === pb.code)) {
          list.push({
            time: pb.createdAt ? pb.createdAt.split(' ')[1] || 'Vừa xong' : 'Vừa xong',
            code: pb.code,
            name: pb.customerName,
            amt: pb.depositAmount || Math.round(pb.totalPrice * 0.3),
            bank: pb.paymentMethod && pb.paymentMethod.includes('MB') ? 'MB Bank' : 'Vietcombank'
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

      try {
        let processed = JSON.parse(localStorage.getItem('sb_processed_receipts_v1') || '[]');
        if (!Array.isArray(processed)) processed = [];
        if (!processed.includes(bookingCode)) processed.push(bookingCode);
        localStorage.setItem('sb_processed_receipts_v1', JSON.stringify(processed));
      } catch (e) {}
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

      try {
        let processed = JSON.parse(localStorage.getItem('sb_processed_receipts_v1') || '[]');
        if (!Array.isArray(processed)) processed = [];
        if (!processed.includes(bookingCode)) processed.push(bookingCode);
        localStorage.setItem('sb_processed_receipts_v1', JSON.stringify(processed));
      } catch (e) {}
      return true;
    },

    getBankTransactions(filter = 'all') {
      let list = [];
      try {
        list = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANK_TRANSACTIONS) || '[]') || [];
        if (!Array.isArray(list)) list = [];
      } catch (e) {
        list = [];
      }
      if (filter === 'pending') {
        return list.filter(tx => {
          const st = String(tx.status || '').toLowerCase();
          const mst = String(tx.match_status || '').toLowerCase();
          return st !== 'resolved' && st !== 'ignored' && st !== 'matched' && mst !== 'matched' && mst !== 'resolved';
        });
      }
      if (filter === 'resolved') {
        return list.filter(tx => {
          const st = String(tx.status || '').toLowerCase();
          const mst = String(tx.match_status || '').toLowerCase();
          return st === 'resolved' || st === 'ignored' || st === 'matched' || mst === 'matched' || mst === 'resolved';
        });
      }
      return list;
    },

    addBankTransaction(tx) {
      if (!tx) return null;
      const list = this.getBankTransactions('all');
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const entry = Object.assign({
        id: 'TX-' + Date.now().toString().slice(-6),
        reference_code: 'FT' + Date.now().toString().slice(-8),
        transaction_date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
        bank_name: 'MBBank',
        content: '',
        detected_code: '',
        booking_code: '',
        amount_in: 0,
        expected_amount: 0,
        diff_amount: 0,
        match_status: 'unmatched',
        status: 'pending',
        note: ''
      }, tx);
      list.unshift(entry);
      localStorage.setItem(STORAGE_KEYS.BANK_TRANSACTIONS, JSON.stringify(list));
      return entry;
    },

    resolveBankTransaction(txId, payloadOrStatus = 'resolved') {
      const list = this.getBankTransactions('all');
      const idx = list.findIndex(tx => String(tx.id) === String(txId) || String(tx.reference_code) === String(txId));
      if (idx < 0) return null;
      const tx = list[idx];
      const payload = (typeof payloadOrStatus === 'string') ? { status: payloadOrStatus } : (payloadOrStatus || {});
      const user = this.getUser();
      const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

      if (payload.booking_code) {
        const cleanCode = String(payload.booking_code).trim().toUpperCase();
        tx.booking_code = cleanCode;
        tx.match_status = 'matched';
        const bookings = this.getAllBookings();
        const b = bookings.find(item => String(item.code).toUpperCase() === cleanCode);
        if (b) {
          const amtIn = Number(tx.transfer_amount ?? tx.amount_in ?? tx.amount ?? 0);
          let targetPay = payload.target_payment_status || payload.target_status || 'auto';
          if (targetPay === 'auto') {
            targetPay = amtIn >= Number(b.totalPrice || 0) ? 'Đã thanh toán 100%' : 'Đã cọc 30%';
          }
          if (targetPay === 'Đã thanh toán 100%') {
            b.status = 'Hoàn thành';
            b.paymentStatus = 'Đã thanh toán 100%';
            b.remainingAmount = 0;
          } else {
            b.status = b.status === 'Chờ duyệt cọc' ? 'Đã xác nhận' : (b.status || 'Đã xác nhận');
            b.paymentStatus = 'Đã cọc 30%';
            b.remainingAmount = Math.max(0, Number(b.totalPrice || 0) - amtIn);
          }
          b.note = (b.note ? b.note + ' | ' : '') + `[Đối soát GD ${tx.reference_code || tx.id}: +${amtIn.toLocaleString('vi-VN')}đ${payload.note ? ' - ' + payload.note : ''}]`;
          localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
          tx.expected_amount = targetPay === 'Đã thanh toán 100%' ? Number(b.totalPrice || 0) : Number(b.depositAmount || 0);
          tx.diff_amount = amtIn - tx.expected_amount;
        }
      }

      tx.status = payload.status || 'resolved';
      if (payload.note) tx.note = payload.note;
      tx.resolved_at = nowStr;
      tx.resolved_by = user ? user.name : 'Quản lý';
      list[idx] = tx;
      localStorage.setItem(STORAGE_KEYS.BANK_TRANSACTIONS, JSON.stringify(list));
      this.addAuditLog(
        payload.booking_code ? 'RECONCILE_MANUAL' : 'RECONCILE_RESOLVE',
        tx.booking_code || tx.id,
        `GD ${tx.reference_code || tx.id} (${Number(tx.transfer_amount ?? tx.amount_in ?? 0).toLocaleString('vi-VN')}đ)`,
        tx.booking_code ? `Khớp đơn ${tx.booking_code} (${tx.note || 'Đã đối soát'})` : `${tx.status === 'ignored' ? 'Bỏ qua' : 'Đã xử lý'}: ${tx.note || tx.status}`
      );
      return tx;
    },

    getSlotsWithStatus(pitchId, dateStr) {
      return this.getSlots(pitchId, dateStr);
    }
  };

  SanBongDB.init();

  window.SanBongDB = SanBongDB;

})();

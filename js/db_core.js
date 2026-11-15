(function () {
  'use strict';
  window.SanBongDB = window.SanBongDB || {};
  Object.assign(window.SanBongDB, {
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
            actor_name: 'Quáº£n Trá»‹ ViÃªn',
            actor_role: 'admin',
            action: 'CHECKIN',
            target_code: 'ASFS260039',
            old_value: 'Tráº¡ng thÃ¡i: ÄÃ£ xÃ¡c nháº­n',
            new_value: 'Tráº¡ng thÃ¡i: Äang Ä‘Ã¡ (Check-in 08:15)',
            ip_address: '127.0.0.1'
          },
          {
            id: 2,
            created_at: '2026-11-06 09:05:11',
            actor_name: 'Nguyá»…n VÄƒn BÃ¬nh (Ca 1)',
            actor_role: 'staff',
            action: 'COLLECT_PAYMENT',
            target_code: 'ASFF260038',
            old_value: 'CÃ²n ná»£: 210.000Ä‘',
            new_value: 'Thu Ä‘á»§ 210.000Ä‘ (Tiá»n máº·t táº¡i quáº§y)',
            ip_address: '127.0.0.1'
          }
        ];
        localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(initLogs));
      }

      if (!localStorage.getItem(STORAGE_KEYS.SHIFTS)) {
        const initShifts = [
          {
            id: 'CA-261105-02',
            staff_name: 'Nguyá»…n VÄƒn BÃ¬nh (Trá»±c sÃ¢n)',
            staff_username: 'staff1',
            opened_at: '2026-11-05 14:00',
            closed_at: '2026-11-05 22:30',
            cash_declared: 2450000,
            transfer_declared: 1850000,
            actual_cash: 2450000,
            diff_amount: 0,
            status: 'confirmed',
            note: 'BÃ n giao Ä‘á»§ tiá»n máº·t cuá»‘i ngÃ y cho Quáº£n lÃ½'
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
            note: 'Thiáº¿u mÃ£ Ä‘Æ¡n Ä‘áº·t sÃ¢n trong ná»™i dung chuyá»ƒn khoáº£n'
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
            note: 'KhÃ¡ch chuyá»ƒn thiáº¿u 50.000Ä‘ tiá»n cá»c yÃªu cáº§u'
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
            note: 'KhÃ¡ch chuyá»ƒn dÆ° +250.000Ä‘ (cÃ³ thá»ƒ Ä‘Ã£ chuyá»ƒn Ä‘á»§ 100%)'
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
            note: 'Tá»± Ä‘á»™ng Ä‘á»‘i soÃ¡t khá»›p 100% qua SePay Webhook'
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
        if (sUser && (sUser.username === 'user' || sUser.full_name === 'Tráº§n Minh HoÃ ng')) {
          sessionStorage.removeItem('sb_current_user');
        }
      } catch (e) {}
      const currentBank = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANK) || '{}');
      if (!localStorage.getItem(STORAGE_KEYS.BANK) || currentBank.accountName === 'NGUYEN VAN HUNG' || currentBank.branch?.includes('Nam SÃ i GÃ²n')) {
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
          { time: '10:12', code: 'ASFS260042', name: 'Tráº§n Minh HoÃ ng', amt: 306000, bank: 'Vietcombank' },
          { time: '11:05', code: 'ASFS260044', name: 'Pháº¡m Quá»‘c Báº£o', amt: 126000, bank: 'Vietcombank' },
          { time: '13:40', code: 'ASFF260045', name: 'Äá»— ThÃ nh Long', amt: 90000, bank: 'MB Bank' }
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
              if (b.status === 'Váº¯ng máº·t (No-Show)' || String(b.status || '').includes('No-Show')) {
                b.status = 'KhÃ¡ch chÆ°a Ä‘áº¿n';
                changed = true;
              }
              if (b.note && String(b.note).includes('No-Show')) {
                b.note = String(b.note)
                  .replace(/Há»§y No-Show do quÃ¡ 15p/g, 'QuÃ¡ 15p khÃ¡ch chÆ°a Ä‘áº¿n')
                  .replace(/No-Show/g, 'QuÃ¡ 15p khÃ¡ch chÆ°a Ä‘áº¿n');
                changed = true;
              }
              const tot = Number(b.totalPrice || 0);
              const dep = Number(b.depositAmount || Math.round(tot * 0.3));
              if (b.status === 'HoÃ n thÃ nh') {
                if (!b.paidRemainingAmount || b.paidRemainingAmount <= 0) {
                  b.paidRemainingAmount = Math.max(0, tot - dep);
                  changed = true;
                }
                if (b.note && String(b.note).includes('pháº§n cÃ²n láº¡i 0Ä‘')) {
                  b.note = String(b.note).replace('pháº§n cÃ²n láº¡i 0Ä‘', `pháº§n cÃ²n láº¡i ${b.paidRemainingAmount.toLocaleString('vi-VN')}Ä‘`);
                  changed = true;
                }
              } else if (b.status !== 'ÄÃ£ há»§y' && b.status !== 'KhÃ¡ch chÆ°a Ä‘áº¿n' && typeof b.remainingAmount !== 'number') {
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
        description: String(v.description || '').trim() || `Æ¯u Ä‘Ã£i mÃ£ ${code}`,
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

  });
})();

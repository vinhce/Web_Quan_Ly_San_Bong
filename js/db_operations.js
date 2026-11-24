(function () {
  'use strict';
  window.SanBongDB = window.SanBongDB || {};
  Object.assign(window.SanBongDB, {
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
      const dNow = new Date();
      const pad2 = n => String(n).padStart(2, '0');
      const nowStr = `${dNow.getFullYear()}-${pad2(dNow.getMonth() + 1)}-${pad2(dNow.getDate())} ${pad2(dNow.getHours())}:${pad2(dNow.getMinutes())}:${pad2(dNow.getSeconds())}`;

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
  });
  if (typeof window.SanBongDB.init === 'function') window.SanBongDB.init();
})();

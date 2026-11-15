(function () {
  'use strict';
  window.SanBongDB = window.SanBongDB || {};
  Object.assign(window.SanBongDB, {
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
        customerName: bookingInput.customerName || 'KhÃ¡ch vÃ£ng lai',
        phone: bookingInput.phone || '',
        email: bookingInput.email || '',
        pitchId: bookingInput.pitchId,
        pitchName: pitch ? pitch.name : 'SÃ¢n bÃ³ng',
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
        status: bookingInput.status || 'Chá» duyá»‡t cá»c',
        paymentStatus: bookingInput.paymentStatus || 'Chá» cá»c 30%',
        paymentMethod: bookingInput.paymentMethod || 'Chuyá»ƒn khoáº£n Ä‘áº·t cá»c',
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
        booking.status = 'Äang Ä‘Ã¡';
        booking.checkinTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        if (!booking.paymentStatus || booking.paymentStatus === 'Chá» duyá»‡t cá»c' || booking.paymentStatus === 'Chá» cá»c 30%') {
          booking.paymentStatus = 'ÄÃ£ cá»c 30%';
        }
        if (typeof booking.remainingAmount !== 'number' || booking.remainingAmount <= 0) {
          const total = Number(booking.totalPrice || 0);
          const dep = Number(booking.depositAmount || Math.round(total * 0.3));
          booking.remainingAmount = Math.max(0, total - dep);
        }
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
        this.addAuditLog('CHECKIN', bookingCode, `Tráº¡ng thÃ¡i: ${oldStatus}`, `Tráº¡ng thÃ¡i: Äang Ä‘Ã¡ (${booking.checkinTime})`);
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
      booking.note = (booking.note ? booking.note + ' | ' : '') + `[ÄÃ¡ thÃªm ${mins}p: +${extraFee.toLocaleString('vi-VN')}Ä‘]`;
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
      const diffNote = adjustPrice && diff !== 0 ? ` (${diff > 0 ? '+' : ''}${diff.toLocaleString('vi-VN')}Ä‘)` : ' (Giá»¯ nguyÃªn giÃ¡)';
      booking.note = (booking.note ? booking.note + ' | ' : '') + `[Äá»•i sÃ¢n: ${oldPitchName} -> ${newPitch.name}${diffNote}${reason ? ' - LÃ½ do: ' + reason : ''}]`;
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      this.addAuditLog('TRANSFER_PITCH', bookingCode, `SÃ¢n: ${oldPitchName}`, `SÃ¢n: ${newPitch.name}${diffNote}${reason ? ' (' + reason + ')' : ''}`);
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
      booking.note = (booking.note ? booking.note + ' | ' : '') + `[Gá»i thÃªm: ${srvDef.name} x${qty} (+${addedCost.toLocaleString('vi-VN')}Ä‘)]`;
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
        'refund_100': 'ÄÃ£ hoÃ n cá»c 100%',
        'reserve': 'Báº£o lÆ°u cá»c 30%',
        'forfeit_50': 'Pháº¡t 50% cá»c'
      };
      booking.status = 'ÄÃ£ há»§y';
      booking.paymentStatus = policyMap[policy] || 'ÄÃ£ hoÃ n cá»c 100%';
      booking.remainingAmount = 0;
      booking.cancelPolicy = policy;
      booking.cancelReason = reason || 'Há»§y lá»‹ch trÆ°á»›c thá»i háº¡n';
      booking.note = (booking.note ? booking.note + ' | ' : '') + `[Há»§y trÆ°á»›c háº¡n - ${booking.paymentStatus}${reason ? ': ' + reason : ''}]`;
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      this.addAuditLog('CANCEL_BOOKING', bookingCode, `${oldStatus} (${oldPay})`, `ÄÃ£ há»§y (${booking.paymentStatus}) - LÃ½ do: ${booking.cancelReason}`);
      return booking;
    },

    completeAndPayRemaining(bookingCode, payMethod = 'Tiá»n máº·t táº¡i quáº§y') {
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
      booking.status = 'HoÃ n thÃ nh';
      booking.paymentStatus = 'ÄÃ£ thanh toÃ¡n 100%';
      booking.completedAt = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      if (!String(booking.note || '').includes('ÄÃ£ táº¥t toÃ¡n pháº§n cÃ²n láº¡i')) {
        booking.note = (booking.note ? booking.note + ' | ' : '') + `[ÄÃ£ táº¥t toÃ¡n pháº§n cÃ²n láº¡i ${paidRem.toLocaleString('vi-VN')}Ä‘ qua ${payMethod}]`;
      }
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      this.addAuditLog('COLLECT_PAYMENT', bookingCode, `CÃ²n ná»£: ${calcRem.toLocaleString('vi-VN')}Ä‘`, `Thu Ä‘á»§ ${paidRem.toLocaleString('vi-VN')}Ä‘ (${payMethod})`);
      return booking;
    },

    releaseNoShowBooking(bookingCode) {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (booking) {
        const oldStatus = booking.status;
        booking.status = 'KhÃ¡ch chÆ°a Ä‘áº¿n';
        booking.paymentStatus = 'Tá»‹ch thu cá»c 30%';
        booking.note = (booking.note ? booking.note + ' | ' : '') + '[QuÃ¡ 15p khÃ¡ch chÆ°a Ä‘áº¿n - ÄÃ£ nháº£ sÃ¢n trá»‘ng]';
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
        this.addAuditLog('NOSHOW_RELEASE', bookingCode, `Tráº¡ng thÃ¡i: ${oldStatus}`, 'KhÃ¡ch chÆ°a Ä‘áº¿n (Tá»‹ch thu cá»c 30% & Nháº£ sÃ¢n)');
        return booking;
      }
      return null;
    },

    restoreBooking(bookingCode) {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (booking) {
        const oldStatus = booking.status;
        booking.status = 'ÄÃ£ xÃ¡c nháº­n';
        booking.paymentStatus = 'ÄÃ£ cá»c 30%';
        booking.remainingAmount = Math.max(0, Number(booking.totalPrice || 0) - Number(booking.depositAmount || 0));
        booking.note = (booking.note ? booking.note + ' | ' : '') + '[ÄÃ£ khÃ´i phá»¥c láº¡i ca Ä‘Ã¡]';
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
        this.addAuditLog('RESTORE_BOOKING', bookingCode, `Tráº¡ng thÃ¡i: ${oldStatus}`, 'ÄÃ£ xÃ¡c nháº­n (KhÃ´i phá»¥c ca Ä‘Ã¡)');
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
        typeLabel: `SÃ¢n ${pType} ngÆ°á»i`,
        size: String(pitchData.size || (oldPitch ? oldPitch.size : '') || (pType === 11 ? '60m x 95m' : (pType === 7 ? '40m x 60m' : '22m x 42m'))).trim(),
        grass: String(pitchData.grass || (oldPitch ? oldPitch.grass : '') || 'Cá» nhÃ¢n táº¡o FIFA Quality Â· ÄÃ¨n LED 400W').trim(),
        basePrice,
        peakPrice,
        weekendPrice,
        status: pitchData.status || (oldPitch ? oldPitch.status : 'Hoáº¡t Ä‘á»™ng'),
        badge: oldPitch?.badge || `SÃ¢n ${pType} TiÃªu Chuáº©n`,
        rating: oldPitch?.rating || 4.9,
        reviews: oldPitch?.reviews || 20,
        amenities: oldPitch?.amenities || ['ÄÃ¨n LED chá»‘ng chÃ³i', 'LÆ°á»›i cháº¯n má»›i', 'NÆ°á»›c uá»‘ng táº¡i sÃ¢n']
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
        oldPitch ? `${oldPitch.name} (${oldPitch.basePrice.toLocaleString('vi-VN')}Ä‘ / ${oldPitch.peakPrice.toLocaleString('vi-VN')}Ä‘) [${oldPitch.status}]` : 'Táº¡o sÃ¢n má»›i',
        `${updatedPitch.name} (ThÆ°á»ng: ${basePrice.toLocaleString('vi-VN')}Ä‘ | Cao Ä‘iá»ƒm: ${peakPrice.toLocaleString('vi-VN')}Ä‘ | Cuá»‘i tuáº§n: ${weekendPrice.toLocaleString('vi-VN')}Ä‘) [${updatedPitch.status}]`
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
        unit: String(srvData.unit || 'cÃ¡i').trim(),
        stockQty: Math.max(0, parseInt(srvData.stockQty, 10) || 0),
        minStockWarning: Math.max(0, parseInt(srvData.minStockWarning, 10) || 5),
        icon: srvData.icon || (idx >= 0 ? list[idx].icon : 'ðŸ¥¤')
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
      const resolvedPayMethod = payMethod || paymentMethod || 'Tiá»n máº·t táº¡i quáº§y';
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
        staffName: user ? user.name : 'NhÃ¢n viÃªn trá»±c sÃ¢n'
      };
      const sales = this.getCounterSales();
      sales.unshift(sale);
      localStorage.setItem(STORAGE_KEYS.COUNTER_SALES, JSON.stringify(sales));
      this.addAuditLog(
        'COUNTER_SALE',
        sale.id,
        `Tá»“n kho ${srv.name}: ${oldStock} ${srv.unit}`,
        `BÃ¡n ${qty} ${srv.unit} (${totalAmount.toLocaleString('vi-VN')}Ä‘ - ${sale.payMethod}) Â· Tá»“n cÃ²n: ${newStock}`
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
          actor_name: user ? user.name : 'Quáº£n Trá»‹ ViÃªn',
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
        if (st === 'KhÃ¡ch chÆ°a Ä‘áº¿n' || st.includes('No-Show') || paySt === 'Tá»‹ch thu cá»c 30%') {
          noShowCount += 1;
        }
        const rem = Number(b.remainingAmount || 0);
        if (rem > 0 && st !== 'ÄÃ£ há»§y' && st !== 'KhÃ¡ch chÆ°a Ä‘áº¿n' && !st.includes('No-Show') && st !== 'HoÃ n thÃ nh') {
          debtCount += 1;
          debtAmount += rem;
        }
      });
      return { phone: clean, noShowCount, debtCount, debtAmount };
    },

  });
})();

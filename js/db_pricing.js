(function () {
  'use strict';
  window.SanBongDB = window.SanBongDB || {};
  Object.assign(window.SanBongDB, {
    getUser() {
      try {
        let sessionUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
        if (!sessionUser) {
          sessionUser = JSON.parse(localStorage.getItem('sb_current_user') || 'null');
          if (sessionUser) {
            try { sessionStorage.setItem('sb_current_user', JSON.stringify(sessionUser)); } catch (e) {}
          }
        }
        const rawName = sessionUser ? (sessionUser.full_name || sessionUser.name || sessionUser.username) : '';
        if (sessionUser && rawName) {
          const customerTier = String(sessionUser.customer_tier || sessionUser.customerTier || sessionUser.tier || 'standard').trim().toLowerCase();
          const tierLabels = { standard: 'Hội viên', bronze: 'Hội viên Đồng', silver: 'Hội viên Bạc', regular: 'Khách thân thiết', gold: 'Hội viên Vàng', vip: 'Khách VIP', diamond: 'Hội viên Kim Cương' };
          return {
            id: sessionUser.id,
            name: rawName,
            full_name: rawName,
            username: sessionUser.username || rawName,
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
            avatar: rawName.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() || 'VIP',
            totalBookings: 0,
            favoritePitch: ''
          };
        }
        return null;
      } catch (e) {
        return null;
      }
    },

    getCustomer() {
      const u = this.getUser();
      if (!u) return null;
      if (['admin', 'manager', 'staff'].includes(String(u.role).toLowerCase())) {
        return null;
      }
      return u;
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
        return JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.BOOKINGS || window.SanBongDB?.STORAGE_KEYS?.BOOKINGS || 'sb_bookings_v1')) || [];
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

  });
})();

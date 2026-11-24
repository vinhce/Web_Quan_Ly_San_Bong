(function () {
  'use strict';
  window.SanBongDB = window.SanBongDB || {};
  Object.assign(window.SanBongDB, {
    getUser() {
      try {
        const sessionUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
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
      return this.getUser();
    },

    getCurrentUser() {
      return this.getUser();
    },

    updateUser(updates) {
      try {
        const sessionUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
        if (sessionUser) {
          const updated = Object.assign({}, sessionUser, updates);
          sessionStorage.setItem('sb_current_user', JSON.stringify(updated));
          try { localStorage.removeItem('sb_current_user'); } catch (e) {}
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

      let singlePitchPrice = Math.round(hourlyRate);
      const rawPitchTotal = singlePitchPrice * weeks;

      let singleServiceTotal = 0;
      const allServices = this.getServices();
      const appliedServices = [];

      if (Array.isArray(servicesList)) {
        servicesList.forEach(item => {
          const srvDef = allServices.find(s => s.id === item.id);
          if (srvDef && item.quantity > 0) {
            const lineTotal = srvDef.price * item.quantity;
            singleServiceTotal += lineTotal;
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

      const serviceTotal = singleServiceTotal;
      const packagePromotion = this.getPackagePromotion(weeks);
      let monthlyDiscountRate = packagePromotion ? packagePromotion.discountRate : 0;
      if (!monthlyDiscountRate) {
        if (weeks >= 12) monthlyDiscountRate = 0.15;
        else if (weeks >= 8) monthlyDiscountRate = 0.10;
        else if (weeks >= 4) monthlyDiscountRate = 0.05;
      }

      let monthlyDiscountAmount = monthlyDiscountRate > 0 ? Math.round(rawPitchTotal * monthlyDiscountRate) : 0;
      const pitchPriceBeforeRule = Math.max(0, rawPitchTotal - monthlyDiscountAmount);

      // Tính năng quy tắc giá giờ vàng / thấp điểm đã được gỡ bỏ
      let netPitchPrice = pitchPriceBeforeRule;
      let goldenHourRule = null;
      let goldenHourDelta = 0;
      const ghRules = [];
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
      const rawSubtotal = rawPitchTotal + serviceTotal + goldenHourDelta;
      const netPitchPriceFull = Math.max(0, rawPitchTotal + goldenHourDelta);

      let discountAmount = 0;
      let appliedVoucher = null;
      let rejectedVoucherCode = '';
      let voucherError = '';
      if (voucherCode) {
        const todayLocal = window.SanBongHelpers?.getLocalTodayISO
          ? window.SanBongHelpers.getLocalTodayISO()
          : new Date().toISOString().split('T')[0];
        const targetCode = voucherCode.trim().toUpperCase();
        const rawList = typeof this.getVouchers === 'function' ? this.getVouchers() : [];
        const normFn = typeof this.normalizeVoucher === 'function'
          ? (vc => this.normalizeVoucher(vc))
          : (vc => {
              if (!vc || !vc.code) return null;
              const code = String(vc.code).trim().toUpperCase();
              const rawType = String(vc.type ?? vc.discount_type ?? 'percent').trim().toLowerCase();
              const type = rawType === 'fixed' ? 'fixed' : 'percent';
              const value = Math.max(0, Number(vc.value ?? vc.discount_value ?? 0) || 0);
              const minOrder = Math.max(0, Number(vc.minOrder ?? vc.min_order ?? 0) || 0);
              const maxDiscountAmount = Math.max(0, Number(vc.maxDiscountAmount ?? vc.max_discount_amount ?? 0) || 0);
              const maxUsage = Math.max(0, Number(vc.maxUsage ?? vc.max_usage ?? 0) || 0);
              const usedCount = Math.max(0, Number(vc.usedCount ?? vc.used_count ?? 0) || 0);
              const rawFrom = vc.validFrom ?? vc.valid_from ?? null;
              const validFrom = rawFrom ? String(rawFrom).trim().slice(0, 10) : null;
              const rawTo = vc.validTo ?? vc.valid_to ?? null;
              const validTo = rawTo ? String(rawTo).trim().slice(0, 10) : null;
              const rawPitchLimit = vc.pitchTypeLimit ?? vc.pitch_type_limit ?? null;
              const pitchTypeLimit = (rawPitchLimit !== null && rawPitchLimit !== '' && Number(rawPitchLimit) > 0) ? Number(rawPitchLimit) : null;
              const requiredTier = String(vc.requiredTier ?? vc.required_tier ?? (code === 'VIPGOLD' ? 'vip,regular' : '')).trim();
              const rawActive = vc.isActive ?? vc.is_active;
              const isActive = rawActive === undefined ? true : !(rawActive === false || rawActive === 0 || rawActive === '0' || String(rawActive).toLowerCase() === 'false');
              return { code, description: vc.description || '', type, value, minOrder, maxDiscountAmount, maxUsage, usedCount, validFrom, validTo, pitchTypeLimit, requiredTier, isActive };
            });
        const v = rawList.map(normFn).find(vc => vc && vc.code === targetCode && vc.isActive !== false);
        if (!v) {
          voucherError = 'Mã giảm giá không tồn tại hoặc đã ngừng áp dụng.';
        } else if ((v.validFrom && todayLocal < v.validFrom) || (v.validTo && todayLocal > v.validTo)) {
          voucherError = 'Mã giảm giá chưa đến ngày áp dụng hoặc đã hết hạn.';
        } else if (v.pitchTypeLimit && Number(v.pitchTypeLimit) !== Number(pitch.type)) {
          voucherError = `Mã giảm giá này chỉ áp dụng riêng cho Sân ${v.pitchTypeLimit} người.`;
        } else if (Number(v.maxUsage || 0) > 0 && Number(v.usedCount || 0) >= Number(v.maxUsage)) {
          voucherError = 'Mã giảm giá đã hết lượt sử dụng.';
        } else if (rawSubtotal < (v.minOrder || 0)) {
          voucherError = `Đơn hàng chưa đạt giá trị tối thiểu (${Number(v.minOrder || 0).toLocaleString('vi-VN')}đ) để dùng mã này.`;
        } else {
          const requiredTier = String(v.requiredTier || (v.code === 'VIPGOLD' ? 'vip,regular' : '')).trim().toLowerCase();
          const unrestricted = !requiredTier || requiredTier === 'standard' || requiredTier === 'all';
          let tierValid = true;
          if (!unrestricted) {
            const curUser = this.getUser ? this.getUser() : null;
            if (!curUser || !curUser.name) {
              tierValid = false;
              voucherError = 'Mã giảm giá này chỉ áp dụng cho thành viên hạng ưu đãi đã đăng nhập tài khoản.';
            } else {
              const rawTier = String(curUser.customer_tier || curUser.tier || 'standard').trim().toLowerCase();
              const legacyTiers = {
                'hội viên': 'standard',
                'hội viên đồng': 'bronze',
                'hội viên bạc': 'silver',
                'hội viên vàng': 'gold',
                'hội viên kim cương': 'diamond',
                'khách vip': 'vip',
                'khách thân thiết': 'regular'
              };
              const canonicalTier = legacyTiers[rawTier] || rawTier;
              const tierRank = { standard: 1, bronze: 2, silver: 3, regular: 4, gold: 4, vip: 5, diamond: 5 };
              const requiredTiers = requiredTier.split(',').map(t => t.trim()).filter(Boolean);
              const isQualified = requiredTiers.some(t => (tierRank[canonicalTier] || 1) >= (tierRank[t] || 99));
              if (!isQualified) {
                tierValid = false;
                voucherError = 'Hạng thành viên hiện tại chưa đủ điều kiện áp dụng mã ưu đãi này.';
              }
            }
          }
          if (tierValid) {
            appliedVoucher = v;
            if (v.type === 'percent') {
              discountAmount = Math.round((rawSubtotal * v.value) / 100);
              const maxDisc = Number(v.maxDiscountAmount || 0);
              if (maxDisc > 0 && discountAmount > maxDisc) discountAmount = maxDisc;
            } else {
              discountAmount = Math.min(v.value, rawSubtotal);
            }
          }
        }
      }

      // Non-stacking: chọn ưu đãi có lợi nhất giữa gói tháng và voucher
      let appliedDiscountSource = 'none';
      if (discountAmount > 0 && monthlyDiscountAmount > 0) {
        if (discountAmount >= monthlyDiscountAmount) {
          monthlyDiscountAmount = 0;
          appliedDiscountSource = 'voucher';
        } else {
          discountAmount = 0;
          rejectedVoucherCode = appliedVoucher ? appliedVoucher.code : '';
          appliedVoucher = null;
          appliedDiscountSource = 'monthly_package';
        }
      } else if (discountAmount > 0) {
        appliedDiscountSource = 'voucher';
      } else if (monthlyDiscountAmount > 0) {
        appliedDiscountSource = 'monthly_package';
      }

      const totalDiscount = monthlyDiscountAmount + discountAmount + Math.max(0, -goldenHourDelta);
      const totalPrice = Math.max(0, rawSubtotal - (monthlyDiscountAmount + discountAmount));
      netPitchPrice = Math.max(0, netPitchPriceFull - monthlyDiscountAmount);
      const isMonthly = Number(weeks) > 1;
      const sysCfg = this.getSystemConfig ? this.getSystemConfig() : { depositRate: 30 };
      const defaultDepositRate = isMonthly ? 60 : (Number(sysCfg.depositRate) || 30);
      const depositRate = Math.max(10, Math.min(100, defaultDepositRate)) / 100;
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
        subtotal: rawSubtotal,
        netSubtotal: rawSubtotal,
        weeksCount: weeks,
        packagePromotion,
        isMonthly,
        depositRatePct: isMonthly ? 60 : Math.round(depositRate * 100),
        monthlyDiscountRate,
        monthlyDiscountAmount,
        appliedDiscountSource,
        voucherCode: appliedVoucher ? appliedVoucher.code : '',
        rejectedVoucherCode,
        voucherDiscountAmount: discountAmount,
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

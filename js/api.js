
window.SanBongApp = window.SanBongApp || {};

window.SanBongApp.SanBongAPI = {
  _initialDataPromises: {},
  _initialDataCaches: {},
  _bookedSlotsInFlight: {},
  _bookedSlotsCache: {},

  async fetchInitialData(force = false) {
    const isAdminPortal = Boolean(typeof window !== 'undefined' && window.location && String(window.location.pathname || '').includes('portal-admin'));
    const cacheKey = isAdminPortal ? 'admin' : 'public';
    const now = Date.now();
    const cached = this._initialDataCaches[cacheKey];
    if (!force && cached && (now - cached.at) < 5000) {
      return cached.data;
    }
    if (!force && this._initialDataPromises[cacheKey]) {
      return this._initialDataPromises[cacheKey];
    }

    const promise = (async () => {
      try {
        const apiUrl = window.SanBongApp.getRelativePath(isAdminPortal ? 'api/pitches.php?all=1&include_hidden=1' : 'api/pitches.php?all=1');
        const response = await fetch(apiUrl, { credentials: 'same-origin' });
        if (response.ok) {
          const jsonRes = await response.json();
          if (jsonRes?.csrf_token && window.SanBongHelpers?.setCsrfToken) {
            window.SanBongHelpers.setCsrfToken(jsonRes.csrf_token);
          }
          if (jsonRes.success && jsonRes.data && jsonRes.data.pitches) {
            const d = jsonRes.data;
            const db = window.SanBongDB || window.SanBongApp?.SanBongDB;
            try {
              localStorage.setItem('sb_pitches_v2', JSON.stringify(d.pitches));
              if (Array.isArray(d.timeSlots) && d.timeSlots.length > 0) {
                localStorage.setItem('sb_slots_v1', JSON.stringify(d.timeSlots));
              }
              if (Array.isArray(d.extraServices) && d.extraServices.length > 0) {
                localStorage.setItem('sb_services_v1', JSON.stringify(d.extraServices));
              }
              if (Array.isArray(d.vouchers)) {
                localStorage.setItem('sb_vouchers_v1', JSON.stringify(d.vouchers));
              }
              if (Array.isArray(d.goldenHourRules)) {
                localStorage.setItem('sb_golden_hours_v1', JSON.stringify(d.goldenHourRules));
              }
              if (Array.isArray(d.maintenanceSchedules)) {
                localStorage.setItem('sb_maintenance_v1', JSON.stringify(d.maintenanceSchedules));
              }
              if (d.bankInfo && typeof d.bankInfo === 'object') {
                const b = Object.assign({}, d.bankInfo, {
                  bankName: d.bankInfo.bankName || d.bankInfo.bank_name || 'Vietcombank',
                  bankCode: d.bankInfo.bankCode || d.bankInfo.bank_code || 'VCB',
                  accountNo: d.bankInfo.accountNo || d.bankInfo.accountNumber || d.bankInfo.account_no || '',
                  accountNumber: d.bankInfo.accountNumber || d.bankInfo.accountNo || d.bankInfo.account_no || '',
                  accountName: d.bankInfo.accountName || d.bankInfo.account_holder || 'CONG TY CP SAN BONG PRO'
                });
                localStorage.setItem('sb_bank_v1', JSON.stringify(b));
              }
              if (d.settings && typeof d.settings === 'object') {
                const prevCfg = db?.getSystemConfig ? db.getSystemConfig() : (window.DEFAULT_SYSTEM_CONFIG || {});
                const autoRaw = d.settings.autoCancelEnabled ?? d.settings.auto_cancel_enabled;
                const mmEnabledRaw = d.settings.matchmakingEnabled ?? d.settings.matchmaking_enabled;
                const mmApprovalRaw = d.settings.matchmakingRequireApproval ?? d.settings.matchmaking_require_approval;
                const cfg = {
                  depositRate: Number(d.settings.depositRate ?? d.settings.deposit_rate ?? prevCfg.depositRate ?? 30),
                  hotline: d.settings.hotline || prevCfg.hotline || '0352 313 548',
                  openHours: d.settings.openHours || d.settings.open_hours || prevCfg.openHours || '05:30 - 22:30 hàng ngày (kể cả Lễ, Tết)',
                  holdMinutes: Number(d.settings.holdMinutes ?? d.settings.hold_minutes ?? prevCfg.holdMinutes ?? 15),
                  waitlistHoldMinutes: Number(d.settings.waitlistHoldMinutes ?? d.settings.waitlist_hold_minutes ?? prevCfg.waitlistHoldMinutes ?? 15),
                  refundFullHours: Number(d.settings.refundFullHours ?? d.settings.refund_full_hours ?? prevCfg.refundFullHours ?? 24),
                  refundPartialHours: Number(d.settings.refundPartialHours ?? d.settings.refund_partial_hours ?? prevCfg.refundPartialHours ?? 4),
                  autoCancelEnabled: autoRaw === undefined ? (prevCfg.autoCancelEnabled ?? true) : (autoRaw === true || autoRaw === 1 || autoRaw === '1' || autoRaw === 'true'),
                  matchmakingEnabled: mmEnabledRaw === undefined ? (prevCfg.matchmakingEnabled ?? true) : (mmEnabledRaw === true || mmEnabledRaw === 1 || mmEnabledRaw === '1' || mmEnabledRaw === 'true'),
                  matchmakingRequireApproval: mmApprovalRaw === undefined ? (prevCfg.matchmakingRequireApproval ?? false) : (mmApprovalRaw === true || mmApprovalRaw === 1 || mmApprovalRaw === '1' || mmApprovalRaw === 'true'),
                  loyaltyBottleCostPoints: Math.max(1, Number(d.settings.loyaltyBottleCostPoints ?? d.settings.loyalty_bottle_cost_points ?? prevCfg.loyaltyBottleCostPoints ?? 100) || 100),
                  pricingTable: d.settings.pricingTable || prevCfg.pricingTable || null
                };
                localStorage.setItem('sb_system_config', JSON.stringify(cfg));
              }
              if (d.publicStats) {
                localStorage.setItem('sb_public_stats_v1', JSON.stringify(d.publicStats));
              }
              window.dispatchEvent(new CustomEvent('sb-data-synced', { detail: d }));
            } catch (e) {}

            const normalized = {
              pitches: d.pitches,
              timeSlots: d.timeSlots || db?.getTimeSlots?.() || [],
              extraServices: d.extraServices || db?.getServices?.() || [],
              vouchers: d.vouchers || db?.getVouchers?.() || [],
              goldenHourRules: d.goldenHourRules || db?.getGoldenHourRules?.() || [],
              maintenanceSchedules: d.maintenanceSchedules || db?.getMaintenanceSchedules?.() || [],
              bankInfo: d.bankInfo || db?.getBankInfo?.() || {},
              settings: d.settings || db?.getSystemConfig?.() || {},
              publicStats: d.publicStats || null
            };
            this._initialDataCaches[cacheKey] = { at: Date.now(), data: normalized };
            return normalized;
          }
        }
      } catch (e) {
      }

      try {
        const dataUrl = window.SanBongApp.getRelativePath('data/data.json');
        const response = await fetch(dataUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonData = await response.json();
        this._initialDataCaches[cacheKey] = { at: Date.now(), data: jsonData };
        return jsonData;
      } catch (error) {
        return {
          pitches: window.SanBongApp.SanBongDB?.getPitches() || window.SanBongData?.DEFAULT_PITCHES || [],
          timeSlots: window.SanBongApp.SanBongDB?.getTimeSlots() || window.SanBongData?.DEFAULT_TIME_SLOTS || [],
          extraServices: window.SanBongApp.SanBongDB?.getServices?.() || window.SanBongData?.DEFAULT_EXTRA_SERVICES || [],
          vouchers: window.SanBongApp.SanBongDB?.getVouchers() || window.SanBongData?.DEFAULT_VOUCHERS || [],
          bankInfo: window.SanBongApp.SanBongDB?.getBankInfo() || window.SanBongData?.DEFAULT_BANK_INFO || {}
        };
      }
    })();

    this._initialDataPromises[cacheKey] = promise;
    try {
      return await promise;
    } finally {
      delete this._initialDataPromises[cacheKey];
    }
  },

  async getPitches(force = false) {
    const data = await this.fetchInitialData(force);
    return data.pitches || window.SanBongApp.SanBongDB.getPitches();
  },

  async fetchBookedSlots(pitchId, date, force = false) {
    if (!pitchId || !date) {
      return { bookedList: [], bookedIds: [], maintenanceWindows: [] };
    }
    const key = `${pitchId}__${date}`;
    const now = Date.now();
    const cached = this._bookedSlotsCache[key];
    if (!force && cached && (now - cached.at) < 3000) {
      return cached.data;
    }
    if (!force && this._bookedSlotsInFlight[key]) {
      return this._bookedSlotsInFlight[key];
    }

    const promise = (async () => {
      try {
        const getRel = window.SanBongApp?.getRelativePath || (p => '/' + String(p || '').replace(/^\/+/, ''));
        const url = getRel(`api/bookings.php?action=booked_slots&pitch_id=${encodeURIComponent(pitchId)}&date=${encodeURIComponent(date)}`);
        const res = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json && json.success) {
            const list = Array.isArray(json.data) ? json.data : [];
            const entry = {
              bookedList: list,
              bookedIds: list,
              maintenanceWindows: Array.isArray(json.maintenanceWindows) ? json.maintenanceWindows : []
            };
            this._bookedSlotsCache[key] = { at: Date.now(), data: entry };
            return entry;
          }
        }
      } catch (e) {}
      return this._bookedSlotsCache[key]?.data || { bookedList: [], bookedIds: [], maintenanceWindows: [] };
    })();

    this._bookedSlotsInFlight[key] = promise;
    try {
      return await promise;
    } finally {
      delete this._bookedSlotsInFlight[key];
    }
  },

  async fetchWeather() {
    try {
      const weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.7684&current_weather=true';
      const response = await fetch(weatherUrl);
      if (!response.ok) throw new Error('Không thể tải thời tiết');
      const data = await response.json();
      const current = data.current_weather;

      let conditionText = 'Trời đẹp, khô ráo';
      let icon = '☀️';
      if (current.weathercode >= 51 && current.weathercode <= 67) {
        conditionText = 'Có mưa nhỏ, sân cỏ thoát nước tốt';
        icon = '🌧️';
      } else if (current.weathercode > 67) {
        conditionText = 'Mưa to, có đèn che khán đài';
        icon = '⛈️';
      } else if (current.temperature < 20) {
        conditionText = 'Se lạnh, lý tưởng thi đấu';
        icon = '🌤️';
      }

      return {
        temperature: Math.round(current.temperature),
        windSpeed: current.windspeed,
        condition: conditionText,
        icon: icon,
        time: current.time
      };
    } catch (err) {
      console.warn('Fetch thời tiết thất bại, dùng giá trị mặc định:', err.message);
      return {
        temperature: 26,
        windSpeed: 2.5,
        condition: 'Trời khô ráo, lý tưởng thi đấu',
        icon: '🌤️'
      };
    }
  },

  async fetchBanks() {
    try {
      const response = await fetch('https://api.vietqr.io/v2/banks');
      if (!response.ok) throw new Error('Lỗi fetch ngân hàng');
      const json = await response.json();
      if (json && json.data) {
        return json.data;
      }
      return [];
    } catch (err) {
      console.warn('Fetch VietQR banks thất bại:', err.message);
      return [
        { name: 'Vietcombank', code: 'VCB', shortName: 'Vietcombank' },
        { name: 'MB Bank', code: 'MB', shortName: 'MBBank' },
        { name: 'Techcombank', code: 'TCB', shortName: 'Techcombank' }
      ];
    }
  },

  async requestJSON(path, payload, _csrfRetried = false) {
    try {
      const app = window.SanBongApp;
      if (payload !== undefined && app.ensureCsrfToken) {
        await app.ensureCsrfToken();
      }
      const base = String(app.getAppBase?.() || '').replace(/\/+$/, '');
      const apiUrl = app.getRelativePath ? app.getRelativePath(path) : `${base}/${path}`;
      const options = { credentials: 'same-origin', cache: 'no-store' };
      if (payload !== undefined) {
        options.method = 'POST';
        options.headers = app.getAuthFetchHeaders ? app.getAuthFetchHeaders() : { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(payload);
      }
      const response = await fetch(apiUrl, options);
      const setToken = app.setCsrfToken || window.SanBongHelpers?.setCsrfToken;
      const tokenHeader = response.headers?.get('X-CSRF-Token');
      if (tokenHeader && setToken) setToken(tokenHeader);
      const result = await response.json().catch(() => null);
      if (result?.csrf_token && setToken) setToken(result.csrf_token);

      if (payload !== undefined && response.status === 403 && !_csrfRetried) {
        const ref = String(result?.ref_code || '').toUpperCase();
        const msg = String(result?.message || '');
        if (ref === 'ERR_CSRF_INVALID' || /csrf|mã bảo mật/i.test(msg)) {
          const ensureFn = app.ensureCsrfToken || window.SanBongHelpers?.ensureCsrfToken;
          if (ensureFn) {
            const freshToken = await ensureFn(true);
            let nextPayload = payload;
            if (freshToken && payload && typeof payload === 'object' && !Array.isArray(payload) && Object.prototype.hasOwnProperty.call(payload, 'csrf_token')) {
              nextPayload = Object.assign({}, payload, { csrf_token: freshToken });
            }
            return this.requestJSON(path, nextPayload, true);
          }
        }
      }

      if (!result || typeof result !== 'object' || Array.isArray(result) || typeof result.success !== 'boolean') {
        return {
          success: false,
          status: response.status,
          ref_code: 'ERR_INVALID_RESPONSE',
          message: 'Phản hồi máy chủ không hợp lệ. Vui lòng thử lại để kiểm tra trạng thái đơn.'
        };
      }
      return Object.assign({}, result, {
        success: response.ok && result.success === true,
        status: response.status,
        message: result.message || (response.ok && result.success === true ? '' : 'Không thể xử lý yêu cầu trên máy chủ.')
      });
    } catch (e) {
      return {
        success: false,
        status: 0,
        ref_code: 'ERR_NETWORK',
        message: 'Không thể kết nối máy chủ. Vui lòng thử lại để kiểm tra trạng thái đơn.'
      };
    }
  },

  postBooking(bookingPayload) {
    return this.requestJSON('api/bookings.php', bookingPayload);
  },

  getBooking(code) {
    return this.requestJSON('api/bookings.php?code=' + encodeURIComponent(code));
  },

  updateBookingRedemption(code, redeemedBottles) {
    return this.requestJSON('api/bookings.php?action=update_redemption', { code, redeemedBottles });
  },

  redirectToLogin(route, options = {}) {
    const expired = Boolean(options && options.expired);
    const notice = String(options && options.notice ? options.notice : '').trim();
    const useReplace = options && options.replace !== undefined ? Boolean(options.replace) : expired;
    try {
      sessionStorage.removeItem('sb_current_user');
      sessionStorage.removeItem('sb_csrf_token');
      localStorage.removeItem('sb_current_user');
      if (notice && !expired) {
        sessionStorage.setItem('sb_login_notice', notice);
      }
    } catch (e) {}
    if (typeof window !== 'undefined') {
      window.sb_current_user = null;
      if (expired && window._sbRedirecting401) return;
      if (expired) window._sbRedirecting401 = true;
      const cleanRoute = String(route || '').trim().replace(/^\/+/, '').replace(/\.html(?=$|[?#])/, '') || 'history';
      const query = `login?redirect=${encodeURIComponent(cleanRoute)}${expired ? '&expired=1' : ''}`;
      const targetUrl = window.SanBongApp?.getRelativePath
        ? window.SanBongApp.getRelativePath(query)
        : (window.SanBongHelpers?.getRelativePath ? window.SanBongHelpers.getRelativePath(query) : '/' + query);
      if (useReplace) {
        window.location.replace(targetUrl);
      } else {
        window.location.href = targetUrl;
      }
    }
  },

  checkPayment(code) {
    return this.requestJSON('api/check_payment.php?code=' + encodeURIComponent(code) + '&_t=' + Date.now());
  }
};
window.SanBongApp.redirectToLogin = window.SanBongApp.SanBongAPI.redirectToLogin.bind(window.SanBongApp.SanBongAPI);


window.SanBongApp = window.SanBongApp || {};

window.SanBongApp.SanBongAPI = {
  async fetchInitialData() {
    try {
      const apiUrl = window.SanBongApp.getRelativePath('api/pitches.php?all=1');
      const response = await fetch(apiUrl);
      if (response.ok) {
        const jsonRes = await response.json();
        if (jsonRes?.csrf_token && window.SanBongHelpers?.setCsrfToken) {
          window.SanBongHelpers.setCsrfToken(jsonRes.csrf_token);
        }
        if (jsonRes.success && jsonRes.data && jsonRes.data.pitches) {
          if (window.SanBongApp?.SanBongDB?.syncFromServer) {
            try {
              localStorage.setItem('sb_pitches_v2', JSON.stringify(jsonRes.data.pitches));
              if (Array.isArray(jsonRes.data.vouchers)) {
                localStorage.setItem('sb_vouchers_v1', JSON.stringify(jsonRes.data.vouchers));
              }
              if (Array.isArray(jsonRes.data.goldenHourRules)) {
                localStorage.setItem('sb_golden_hours_v1', JSON.stringify(jsonRes.data.goldenHourRules));
              }
              if (Array.isArray(jsonRes.data.maintenanceSchedules)) {
                localStorage.setItem('sb_maintenance_v1', JSON.stringify(jsonRes.data.maintenanceSchedules));
              }
              if (jsonRes.data.bankInfo) {
                const b = Object.assign({}, jsonRes.data.bankInfo, {
                  accountNo: jsonRes.data.bankInfo.accountNo || jsonRes.data.bankInfo.accountNumber || '',
                  accountNumber: jsonRes.data.bankInfo.accountNumber || jsonRes.data.bankInfo.accountNo || ''
                });
                localStorage.setItem('sb_bank_v1', JSON.stringify(b));
              }
              if (jsonRes.data.settings) {
                localStorage.setItem('sb_system_config', JSON.stringify(jsonRes.data.settings));
              }
              if (jsonRes.data.publicStats) {
                localStorage.setItem('sb_public_stats_v1', JSON.stringify(jsonRes.data.publicStats));
              }
            } catch (e) {}
          }
          return {
            pitches: jsonRes.data.pitches,
            timeSlots: jsonRes.data.timeSlots || window.SanBongApp.SanBongDB?.getTimeSlots() || [],
            extraServices: jsonRes.data.extraServices || window.SanBongApp.SanBongDB?.getServices?.() || [],
            vouchers: jsonRes.data.vouchers || window.SanBongApp.SanBongDB?.getVouchers() || [],
            goldenHourRules: jsonRes.data.goldenHourRules || window.SanBongApp.SanBongDB?.getGoldenHourRules?.() || [],
            maintenanceSchedules: jsonRes.data.maintenanceSchedules || window.SanBongApp.SanBongDB?.getMaintenanceSchedules?.() || [],
            bankInfo: jsonRes.data.bankInfo || window.SanBongApp.SanBongDB?.getBankInfo() || {},
            settings: jsonRes.data.settings || window.SanBongApp.SanBongDB?.getSystemConfig?.() || {},
            publicStats: jsonRes.data.publicStats || null
          };
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
      return await response.json();
    } catch (error) {
      return {
        pitches: window.SanBongApp.SanBongDB?.getPitches() || window.SanBongData?.DEFAULT_PITCHES || [],
        timeSlots: window.SanBongApp.SanBongDB?.getTimeSlots() || window.SanBongData?.DEFAULT_TIME_SLOTS || [],
        extraServices: window.SanBongApp.SanBongDB?.getServices?.() || window.SanBongData?.DEFAULT_EXTRA_SERVICES || [],
        vouchers: window.SanBongApp.SanBongDB?.getVouchers() || window.SanBongData?.DEFAULT_VOUCHERS || [],
        bankInfo: window.SanBongApp.SanBongDB?.getBankInfo() || window.SanBongData?.DEFAULT_BANK_INFO || {}
      };
    }
  },

  async getPitches() {
    const data = await this.fetchInitialData();
    return data.pitches || window.SanBongApp.SanBongDB.getPitches();
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

  async requestJSON(path, payload) {
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

  checkPayment(code) {
    return this.requestJSON('api/check_payment.php?code=' + encodeURIComponent(code) + '&_t=' + Date.now());
  }
};

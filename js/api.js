/**
 * SÂN BÓNG PRO - API & FETCH SERVICE (api.js)
 * Tích hợp chuẩn Fetch API (async/await) để tải dữ liệu JSON, thời tiết & ngân hàng
 */

window.SanBongApp = window.SanBongApp || {};

window.SanBongApp.SanBongAPI = {
  /**
   * 1. Fetch dữ liệu sân bóng từ CSDL MySQL (api/pitches.php) hoặc fallback data/data.json
   */
  async fetchInitialData() {
    try {
      const apiUrl = window.SanBongApp.getRelativePath('api/pitches.php?all=1');
      const response = await fetch(apiUrl);
      if (response.ok) {
        const jsonRes = await response.json();
        if (jsonRes.success && jsonRes.data && jsonRes.data.pitches) {
          return {
            pitches: jsonRes.data.pitches,
            timeSlots: jsonRes.data.timeSlots || window.SanBongApp.SanBongDB.getTimeSlots(),
            extraServices: jsonRes.data.extraServices || window.SanBongApp.SanBongDB.getExtraServices(),
            vouchers: jsonRes.data.vouchers || window.SanBongApp.SanBongDB.getVouchers(),
            bankInfo: window.SanBongApp.SanBongDB.getBankInfo()
          };
        }
      }
    } catch (e) {
      // Bỏ qua nếu môi trường tĩnh chưa bật PHP, chuyển sang fallback
    }

    try {
      const dataUrl = window.SanBongApp.getRelativePath('data/data.json');
      const response = await fetch(dataUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      // Fallback an toàn nếu mở qua giao thức file:// không qua web server
      return {
        pitches: window.SanBongApp.SanBongDB.getPitches(),
        timeSlots: window.SanBongApp.SanBongDB.getTimeSlots(),
        extraServices: window.SanBongApp.SanBongDB.getExtraServices(),
        vouchers: window.SanBongApp.SanBongDB.getVouchers(),
        bankInfo: window.SanBongApp.SanBongDB.getBankInfo()
      };
    }
  },

  /**
   * 2. Fetch danh sách sân bóng
   */
  async getPitches() {
    const data = await this.fetchInitialData();
    return data.pitches || window.SanBongApp.SanBongDB.getPitches();
  },

  /**
   * 3. Fetch thời tiết sân bóng theo thời gian thực (Khu liên hợp Mỹ Đình, Hà Nội)
   * Sử dụng Open-Meteo Public API (CORS enabled, không cần API key)
   */
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

  /**
   * 4. Fetch danh sách các ngân hàng từ VietQR Open API
   */
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

  /**
   * 5. Gửi dữ liệu đặt sân (POST request qua CSDL PHP hoặc fallback an toàn)
   */
  async postBooking(bookingPayload) {
    try {
      const apiUrl = window.SanBongApp.getRelativePath('api/bookings.php');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingPayload)
      });
      if (response.ok) {
        const result = await response.json();
        return { success: true, data: result.data || result };
      }
    } catch (e) {
      // Fallback nếu chạy môi trường không có PHP
    }

    return { success: false, localOnly: true };
  }
};

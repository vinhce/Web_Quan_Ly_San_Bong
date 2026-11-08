/**
 * SÂN BÓNG PRO - CENTRAL ORCHESTRATOR & APPLICATION SHELL (app.js)
 * Gom nối các module: helpers.js, db.js, ui.js
 * Đảm bảo 100% tương thích ngược với window.SanBongApp và window.SanBongDB
 */

(function () {
  'use strict';

  const helpers = window.SanBongHelpers || {};
  const db = window.SanBongDB || {};
  const ui = window.SanBongUI || {};

  window.SanBongApp = {
    escapeHTML: helpers.escapeHTML || (s => s),
    formatVND: helpers.formatVND || (n => Number(n).toLocaleString('vi-VN') + 'đ'),
    formatDateVN: helpers.formatDateVN || (d => d),
    getRelativePath: helpers.getRelativePath || (p => p),
    Icons: helpers.Icons || {},
    renderPitchSVG: helpers.renderPitchSVG || (() => ''),
    statusPill: helpers.statusPill || (s => `<span>${s}</span>`),
    getVietQRUrl: helpers.getVietQRUrl || (() => ''),
    renderQRCodeSVG: helpers.renderQRCodeSVG || (() => ''),
    SanBongDB: db,
    renderNavbar: ui.renderNavbar || (() => ''),
    renderFooter: ui.renderFooter || (() => ''),
    handleLogout: ui.handleLogout || (() => {}),
    showToast: ui.showToast || ((m) => console.log(m)),
    showModal: ui.showModal || ((cfg) => { if (confirm(cfg.message || cfg.title)) cfg.onConfirm && cfg.onConfirm(); })
  };

  // Tự động gán nếu DOM đã có sẵn placeholder #app-navbar và #app-footer
  document.addEventListener('DOMContentLoaded', () => {
    // Tự động khởi tạo DB
    if (window.SanBongDB && typeof window.SanBongDB.init === 'function') {
      window.SanBongDB.init();
    }

    const currentUI = window.SanBongUI || ui;
    const navPlaceholder = document.getElementById('app-navbar');
    if (navPlaceholder && currentUI.renderNavbar) {
      navPlaceholder.innerHTML = navPlaceholder.dataset.activePage
        ? currentUI.renderNavbar(navPlaceholder.dataset.activePage)
        : currentUI.renderNavbar();
    }

    const footerPlaceholder = document.getElementById('app-footer');
    if (footerPlaceholder && currentUI.renderFooter) {
      footerPlaceholder.innerHTML = currentUI.renderFooter();
    }
  });

})();

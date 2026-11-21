const fs = require('fs');

const qrcodeLib = fs.existsSync('js/vendor/qrcode.min.js') ? fs.readFileSync('js/vendor/qrcode.min.js', 'utf8') : '';
const helpersCode = fs.readFileSync('js/helpers.js', 'utf8');
const dbCode = fs.readFileSync('js/db.js', 'utf8');
const uiCode = fs.readFileSync('js/ui.js', 'utf8');

const orchestrator = `(function () {
  'use strict';

  const helpers = window.SanBongHelpers || {};
  const db = window.SanBongDB || {};
  const ui = window.SanBongUI || {};

  window.SanBongApp = Object.assign(window.SanBongApp || {}, {
    escapeHTML: helpers.escapeHTML || (s => s),
    formatVND: helpers.formatVND || (n => Number(n).toLocaleString('vi-VN') + 'đ'),
    formatDateVN: helpers.formatDateVN || (d => d),
    getLocalTodayISO: helpers.getLocalTodayISO || (() => {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }),
    getCsrfToken: helpers.getCsrfToken || (() => ''),
    setCsrfToken: helpers.setCsrfToken || (() => {}),
    clearCsrfToken: helpers.clearCsrfToken || (() => {}),
    ensureCsrfToken: helpers.ensureCsrfToken || (() => Promise.resolve('')),
    secureFetch: helpers.secureFetch || fetch,
    getAuthFetchHeaders: helpers.getAuthFetchHeaders || ((extra) => Object.assign({ 'Content-Type': 'application/json' }, extra || {})),
    getAppBase: helpers.getAppBase || (() => ''),
    getRelativePath: helpers.getRelativePath || (p => p),
    Icons: helpers.Icons || {},
    renderPitchSVG: helpers.renderPitchSVG || (() => ''),
    statusPill: helpers.statusPill || (s => '<span>' + s + '</span>'),
    getVietQRUrl: helpers.getVietQRUrl || (() => ''),
    renderQRCodeSVG: helpers.renderQRCodeSVG || (() => ''),
    downloadTicketQR: helpers.downloadTicketQR || (() => {}),
    playScanBeep: helpers.playScanBeep || (() => {}),
    SanBongDB: db,
    renderNavbar: ui.renderNavbar || (() => ''),
    renderFooter: ui.renderFooter || (() => ''),
    handleLogout: ui.handleLogout || (() => {}),
    showToast: ui.showToast || ((m) => console.log(m)),
    showModal: ui.showModal || ((cfg) => { if (confirm(cfg.message || cfg.title)) cfg.onConfirm && cfg.onConfirm(); }),
    syncAuthMe: ui.syncAuthMe || (typeof syncAuthMe !== 'undefined' ? syncAuthMe : (() => Promise.resolve(null))),
    handleUnauthorizedSession: ui.handleUnauthorizedSession || (typeof handleUnauthorizedSession !== 'undefined' ? handleUnauthorizedSession : ((route) => {
      try { sessionStorage.removeItem('sb_current_user'); sessionStorage.removeItem('sb_csrf_token'); localStorage.removeItem('sb_current_user'); } catch (e) {}
      window.location.replace(\`login?redirect=\${encodeURIComponent(route || 'history')}&expired=1\`);
    }))
  });

  function renderShellNavbar() {
    const currentUI = window.SanBongUI || ui;
    const navPlaceholder = document.getElementById('app-navbar');
    if (navPlaceholder && currentUI.renderNavbar) {
      const activePage = navPlaceholder.dataset ? navPlaceholder.dataset.activePage : navPlaceholder.getAttribute?.('data-active-page');
      navPlaceholder.innerHTML = activePage
        ? currentUI.renderNavbar(activePage)
        : currentUI.renderNavbar();
    }

    if (!window._sbUserMenuBound && typeof document !== 'undefined') {
      window._sbUserMenuBound = true;
      document.addEventListener('click', function (e) {
        const btn = e.target.closest('#user-menu-btn');
        const container = e.target.closest('#user-menu-container');
        const menu = document.getElementById('user-dropdown-menu');
        if (!menu) return;

        if (btn) {
          e.preventDefault();
          const isOpen = menu.classList.toggle('!block');
          btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        } else if (!container) {
          menu.classList.remove('!block');
          const boundBtn = document.getElementById('user-menu-btn');
          if (boundBtn) boundBtn.setAttribute('aria-expanded', 'false');
        }
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          const menu = document.getElementById('user-dropdown-menu');
          if (menu) {
            menu.classList.remove('!block');
            const btn = document.getElementById('user-menu-btn');
            if (btn) btn.setAttribute('aria-expanded', 'false');
          }
        }
      });
    }
  }

  function renderShellFooter() {
    const currentUI = window.SanBongUI || ui;
    const footerPlaceholder = document.getElementById('app-footer');
    if (footerPlaceholder && currentUI.renderFooter) {
      footerPlaceholder.innerHTML = currentUI.renderFooter();
    }
  }

  function initAppShell() {
    if (window.SanBongDB && typeof window.SanBongDB.init === 'function') {
      window.SanBongDB.init();
    }

    renderShellNavbar();
    renderShellFooter();

    if (!window._sbNavSyncBound && typeof window.addEventListener === 'function') {
      window._sbNavSyncBound = true;
      window.addEventListener('sb-data-synced', function () {
        renderShellNavbar();
        renderShellFooter();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAppShell);
  } else {
    initAppShell();
  }
})();
`;

const bundle = (qrcodeLib ? qrcodeLib + '\n;\n' : '') + orchestrator;
fs.writeFileSync('js/app.js', bundle, 'utf8');
console.log('Successfully bundled js/app.js! Size:', bundle.length, 'bytes');

const fs = require('fs');
const { execSync } = require('child_process');
const appContent = execSync('git show HEAD:js/app.js', { encoding: 'utf8' });

const m1 = '// 1. CHỐNG XSS HELPER';
const m2 = '// 7. CENTRAL STATE & LOCALSTORAGE DATABASE';
const m3 = '  function handleLogout()';
const m4 = '// 11. GẮN VÀO WINDOW';

const p1 = appContent.indexOf(m1);
const p2 = appContent.indexOf(m2);
const p3 = appContent.indexOf(m3);
const p4 = appContent.indexOf(m4);

console.log('Offsets:', { p1, p2, p3, p4 });

if (p1 === -1 || p2 === -1 || p3 === -1 || p4 === -1) {
  console.error('Marker missing!');
  process.exit(1);
}

const helpersBody = appContent.substring(p1, p2).trim();
const dbBody = appContent.substring(p2, p3).trim();
const uiBody = appContent.substring(p3, p4).trim();

console.log('Lengths:', {
  helpersBody: helpersBody.length,
  dbBody: dbBody.length,
  uiBody: uiBody.length
});

const helpersContent = `/**
 * SÂN BÓNG PRO - HELPERS & SVG RENDERERS (helpers.js)
 * Tách module nhẹ: XSS security, formatting, clean path, SVG pitch generator, badges, VietQR
 */

(function () {
  'use strict';

${helpersBody}

  // Xuất ra window.SanBongHelpers
  window.SanBongHelpers = {
    escapeHTML,
    formatVND,
    formatDateVN,
    getAppBase,
    getRelativePath,
    Icons,
    renderPitchSVG,
    statusPill,
    getVietQRUrl,
    renderQRCodeSVG
  };

  // Expose các hàm tiện ích thường dùng trực tiếp ra window
  window.escapeHTML = escapeHTML;
  window.formatVND = formatVND;
  window.formatDateVN = formatDateVN;
  window.getRelativePath = getRelativePath;

})();
`;

const dbContent = `/**
 * SÂN BÓNG PRO - LOCALSTORAGE DATABASE ENGINE (db.js)
 * Tách module nhẹ: Quản lý CSDL đặt sân, khung giờ (slots), cọc VietQR, khách hàng, no-show
 */

(function () {
  'use strict';

  // Helper getRelativePath fallback nếu helpers.js load sau
  function getRelativePath(target) {
    if (window.SanBongHelpers && typeof window.SanBongHelpers.getRelativePath === 'function') {
      return window.SanBongHelpers.getRelativePath(target);
    }
    const pathname = window.location.pathname.replace(/\\\\/g, '/');
    const match = pathname.match(/^(.*?\\/Quan_Ly_San_Bong)/i);
    const base = match ? match[1] : '';
    if (!target || target === 'index.html' || target === '/' || target === '') {
      return base ? \`\${base}/\` : '/';
    }
    const cleanTarget = String(target).replace(/^\\.\\.\\//, '').replace(/^html\\//, '').replace(/^\\//, '').replace(/\\.html$/, '');
    if (cleanTarget === 'portal-admin' || cleanTarget === 'portal-admin/') {
      return base ? \`\${base}/portal-admin/\` : '/portal-admin/';
    }
    return base ? \`\${base}/\${cleanTarget}\` : \`/\${cleanTarget}\`;
  }

${dbBody}

  // Xuất ra window.SanBongDB
  window.SanBongDB = SanBongDB;

})();
`;

const uiContent = `/**
 * SÂN BÓNG PRO - UI SHELLS & NOTIFICATION SYSTEM (ui.js)
 * Tách module nhẹ: Navbar, Footer, Modern Toast & Modal Dialog (thay thế alert/confirm)
 */

(function () {
  'use strict';

  // Sử dụng helpers & db đã khởi tạo
  const escapeHTML = (str) => (window.SanBongHelpers ? window.SanBongHelpers.escapeHTML(str) : String(str || ''));
  const getRelativePath = (t) => (window.SanBongHelpers ? window.SanBongHelpers.getRelativePath(t) : t);
  const Icons = (window.SanBongHelpers && window.SanBongHelpers.Icons) ? window.SanBongHelpers.Icons : {};

${uiBody}

  // Chuyển hướng an toàn toàn bộ window.alert cũ sang modern toast
  window.alert = function (msg) {
    showToast(String(msg), 'warning');
  };

  // Xuất ra window.SanBongUI
  window.SanBongUI = {
    renderNavbar,
    renderFooter,
    handleLogout,
    showToast,
    showModal
  };

  // Expose trực tiếp các hàm thông báo ra window
  window.showToast = showToast;
  window.showModal = showModal;

})();
`;

const appOrchestratorContent = `/**
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
    statusPill: helpers.statusPill || (s => \`<span>\${s}</span>\`),
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
`;

fs.writeFileSync('js/helpers.js', helpersContent, 'utf8');
fs.writeFileSync('js/db.js', dbContent, 'utf8');
fs.writeFileSync('js/ui.js', uiContent, 'utf8');
fs.writeFileSync('js/app.js', appOrchestratorContent, 'utf8');

console.log('Successfully written all 4 modular files!');
console.log('- js/helpers.js:', fs.statSync('js/helpers.js').size, 'bytes');
console.log('- js/db.js:', fs.statSync('js/db.js').size, 'bytes');
console.log('- js/ui.js:', fs.statSync('js/ui.js').size, 'bytes');
console.log('- js/app.js:', fs.statSync('js/app.js').size, 'bytes');

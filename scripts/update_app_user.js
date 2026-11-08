const fs = require('fs');
let c = fs.readFileSync('js/app.js', 'utf8');

// 1. Update cleanup in init
const oldCleanup = /\/\/ Tự động dọn dẹp tài khoản demo[\s\S]*?\} catch \(e\) \{\}/;
const newCleanup = `// Luôn dọn dẹp tài khoản demo trong LocalStorage để người dùng truy cập là Khách vãng lai
      try {
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem('sb_user');
        const sUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
        if (sUser && (sUser.username === 'user' || sUser.full_name === 'Trần Minh Hoàng')) {
          sessionStorage.removeItem('sb_current_user');
        }
      } catch (e) {}`;
c = c.replace(oldCleanup, newCleanup);

// 2. Update getUser and updateUser
const oldUserBlock = /getUser\(\) \{[\s\S]*?updateUser\(updates\) \{[\s\S]*?return null;\s*\}\s*\}/;
const newUserBlock = `getUser() {
      try {
        const sessionUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
        if (sessionUser && sessionUser.full_name) {
          return {
            id: sessionUser.id,
            name: sessionUser.full_name,
            phone: sessionUser.phone || '',
            email: sessionUser.email || '',
            team: sessionUser.team || '',
            tier: sessionUser.role === 'admin' ? 'Quản trị viên' : (sessionUser.tier || 'Hội viên'),
            points: sessionUser.role === 'admin' ? 9999 : (sessionUser.points || 0),
            avatar: sessionUser.full_name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase(),
            totalBookings: 0,
            favoritePitch: ''
          };
        }
        return null;
      } catch (e) {
        return null;
      }
    },

    updateUser(updates) {
      try {
        const sessionUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
        if (sessionUser) {
          const updated = Object.assign({}, sessionUser, updates);
          sessionStorage.setItem('sb_current_user', JSON.stringify(updated));
          return updated;
        }
        return null;
      } catch (e) {
        return null;
      }
    }`;
c = c.replace(oldUserBlock, newUserBlock);

fs.writeFileSync('js/app.js', c, 'utf8');
console.log('Successfully updated init and getUser in js/app.js');

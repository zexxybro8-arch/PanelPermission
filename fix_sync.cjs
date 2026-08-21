const fs = require('fs');
let code = fs.readFileSync('src/store/appStore.ts', 'utf8');

const searchStr = `      // 2. Modules / Panels real-time listener`;
const replaceStr = `      // QR Configs real-time listener
      onSnapshot(collection(db, 'qrConfigs'), (snapshot) => {
        const list: QrConfig[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as QrConfig);
        });
        if (list.length > 0) {
          this.state.qrConfigs = list;
          this.saveToStorageOnly();
          this.notify();
        }
      }, (err) => console.warn('Firestore qrConfigs sync error:', err));

      // 2. Modules / Panels real-time listener`;

code = code.replace(searchStr, replaceStr);
fs.writeFileSync('src/store/appStore.ts', code);

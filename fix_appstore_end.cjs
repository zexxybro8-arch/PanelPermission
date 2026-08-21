const fs = require('fs');
let code = fs.readFileSync('src/store/appStore.ts', 'utf8');

code = code.replace(/export const appStore = new AppStore\(\);/g, '}\n\nexport const appStore = new AppStore();');

fs.writeFileSync('src/store/appStore.ts', code);

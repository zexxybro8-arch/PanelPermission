const fs = require('fs');
let code = fs.readFileSync('src/store/appStore.ts', 'utf8');

const search = `    if (!matchedQr) {
      throw new Error(\`QR not configured for Panel \${mod ? mod.name : moduleId} (\${durationKey}). Please contact administrator.\`);
    }`;

const replace = `    if (!matchedQr) {
      // Don't throw, just pass empty so the UI can show "QR NOT CONFIGURED"
    }`;

code = code.replace(search, replace);

const search2 = `    return {
      order: newOrder,
      upiQrImageUrl: matchedQr.qrImageUrl,
    };`;

const replace2 = `    return {
      order: newOrder,
      upiQrImageUrl: matchedQr ? matchedQr.qrImageUrl : '',
    };`;

code = code.replace(search2, replace2);
fs.writeFileSync('src/store/appStore.ts', code);

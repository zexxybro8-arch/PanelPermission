const fs = require('fs');
let code = fs.readFileSync('src/store/appStore.ts', 'utf8');

const searchStr = `    this.state.orders.unshift(newOrder);
    this.saveToStorage();

    return {
      order: newOrder,
      upiQrImageUrl: this.state.settings.upiQrImageUrl,
    };`;

const replaceStr = `    // Find QR Config
    let matchedQr = null;
    if (this.state.qrConfigs) {
      matchedQr = this.state.qrConfigs.find(
        (q) => q.enabled && q.panelId === moduleId && q.duration === durationKey && q.customerId === targetUserId
      );
      if (!matchedQr) {
        matchedQr = this.state.qrConfigs.find(
          (q) => q.enabled && q.panelId === moduleId && q.duration === durationKey && !q.customerId
        );
      }
    }
    
    if (!matchedQr) {
      throw new Error(\`QR not configured for Panel \${mod ? mod.name : moduleId} (\${durationKey}). Please contact administrator.\`);
    }

    this.state.orders.unshift(newOrder);
    this.saveToStorage();

    return {
      order: newOrder,
      upiQrImageUrl: matchedQr.qrImageUrl,
    };`;

code = code.replace(searchStr, replaceStr);
fs.writeFileSync('src/store/appStore.ts', code);

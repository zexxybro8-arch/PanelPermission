const fs = require('fs');
let code = fs.readFileSync('src/store/appStore.ts', 'utf8');

// Find the last occurrence of updateSettings
const searchStr = "return { success: true, message: 'Settings updated successfully', settings: this.state.settings };";
const splitIdx = code.indexOf(searchStr);

if (splitIdx !== -1) {
  code = code.substring(0, splitIdx + searchStr.length);
}

const qrMethods = `
  }

  // ==========================================
  // QR CONFIG MANAGEMENT
  // ==========================================
  public async getQrConfigs(): Promise<QrConfig[]> {
    return this.state.qrConfigs || [];
  }

  public async saveQrConfig(config: QrConfig): Promise<{ success: boolean; message: string; config: QrConfig }> {
    if (!this.state.qrConfigs) {
      this.state.qrConfigs = [];
    }
    const idx = this.state.qrConfigs.findIndex((q) => q.id === config.id);
    if (idx !== -1) {
      this.state.qrConfigs[idx] = config;
    } else {
      this.state.qrConfigs.push(config);
    }
    this.saveToStorage();
    await this.syncDocToFirestore('qrConfigs', config.id, config);
    return { success: true, message: 'QR config saved', config };
  }

  public async deleteQrConfig(id: string): Promise<void> {
    if (!this.state.qrConfigs) return;
    this.state.qrConfigs = this.state.qrConfigs.filter(q => q.id !== id);
    this.saveToStorage();
    await this.deleteDocFromFirestore('qrConfigs', id);
  }
}

export const appStore = new AppStore();
`;

fs.writeFileSync('src/store/appStore.ts', code + qrMethods);

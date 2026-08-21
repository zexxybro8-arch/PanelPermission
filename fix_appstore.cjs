const fs = require('fs');
let code = fs.readFileSync('src/store/appStore.ts', 'utf8');

code = code.replace(/raw_password\?: string;\s*export interface StoredUserAccount/g, 'raw_password?: string;\n}\n\nexport interface StoredUserAccount');
code = code.replace(/lastLoginAt\?: string;\s*export interface AppStoreState/g, 'lastLoginAt?: string;\n}\n\nexport interface AppStoreState');
code = code.replace(/qrConfigs: QrConfig\[\];\s*const STORAGE_KEY/g, 'qrConfigs: QrConfig[];\n}\n\nconst STORAGE_KEY');

fs.writeFileSync('src/store/appStore.ts', code);

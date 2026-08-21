const fs = require('fs');
let code = fs.readFileSync('src/services/apiClient.ts', 'utf8');

code = code.replace(
  /return appStore.deleteQrConfig\(id\);\n  }\n  exportAppState/g,
  'return appStore.deleteQrConfig(id);\n  },\n  exportAppState'
);

fs.writeFileSync('src/services/apiClient.ts', code);

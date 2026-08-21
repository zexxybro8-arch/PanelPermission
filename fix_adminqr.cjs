const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminQrManagementTab.tsx', 'utf8');

code = code.replace(
  /setCustomers\(fetchedCustomers\);/,
  'setCustomers((fetchedCustomers as any).customers || []);'
);

fs.writeFileSync('src/components/admin/AdminQrManagementTab.tsx', code);

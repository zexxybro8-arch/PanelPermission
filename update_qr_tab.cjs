const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminQrManagementTab.tsx', 'utf8');

code = code.replace(/interface AdminQrManagementTabProps {\n  customers: Customer\[\];\n  modules: CyberModule\[\];\n}/, '');
code = code.replace(/export const AdminQrManagementTab: React\.FC<AdminQrManagementTabProps> = \({ customers, modules }\) => {/, 'export const AdminQrManagementTab: React.FC = () => {');

const newLoadData = `
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [modules, setModules] = useState<CyberModule[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedConfigs, fetchedCustomers, fetchedModules] = await Promise.all([
        apiClient.getQrConfigs(),
        apiClient.getCustomers(),
        apiClient.getModules()
      ]);
      setConfigs(fetchedConfigs);
      setCustomers(fetchedCustomers);
      setModules(fetchedModules);
    } catch (err) {
      setMessage({ type: 'error', text: extractErrorMessage(err, 'Failed to load QR configs') });
    } finally {
      setLoading(false);
    }
  };
`;
code = code.replace(/const loadData = async \(\) => {[\s\S]*?};/, newLoadData);

fs.writeFileSync('src/components/admin/AdminQrManagementTab.tsx', code);

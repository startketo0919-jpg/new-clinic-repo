const fs = require('fs');
let code = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

code = code.replace(
  "const [activeTab, setActiveTab] = useState<'general' | 'whatsapp' | 'templates' | 'bulk' | 'email'>('general');",
  "const [activeTab, setActiveTab] = useState<string>('general');\n  const [showDelhiveryPassword, setShowDelhiveryPassword] = useState(false);\n  const [delhiveryPasswordInput, setDelhiveryPasswordInput] = useState('');\n  const [newWarehouse, setNewWarehouse] = useState('');"
);

fs.writeFileSync('src/pages/SettingsPage.tsx', code);

const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('SettingsPage')) {
  code = code.replace(
    /import Dashboard from '\.\/pages\/Dashboard';/,
    `import Dashboard from './pages/Dashboard';\nimport SettingsPage from './pages/SettingsPage';`
  );

  code = code.replace(
    /<Route path="\/dashboard" element={<Dashboard \/>} \/>/,
    `<Route path="/dashboard" element={<Dashboard />} />\n          <Route path="/settings" element={<SettingsPage />} />`
  );
  
  fs.writeFileSync('src/App.tsx', code);
}

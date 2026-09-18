const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const logoutFn = `
  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login');
  };
`;

code = code.replace(
  /const \[userRole, setUserRole\] = useState<string \| null>\(null\);\n  const \[username, setUsername\] = useState<string \| null>\(null\);/,
  `const [userRole, setUserRole] = useState<string | null>(null);\n  const [username, setUsername] = useState<string | null>(null);\n${logoutFn}`
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);

const fs = require('fs');
let code = fs.readFileSync('src/components/CheckInForm.tsx', 'utf8');

code = code.replace(
  "const [phone,\n      email, setPhone] = useState('');",
  "const [phone, setPhone] = useState('');"
);

fs.writeFileSync('src/components/CheckInForm.tsx', code);

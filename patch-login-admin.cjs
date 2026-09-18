const fs = require('fs');
let code = fs.readFileSync('src/pages/Login.tsx', 'utf8');

const replacement = `
    const targetEmail = user.email || (user.username === 'admin' ? 'skgservicesin@gmail.com' : null);
    if (!targetEmail) {
      setError('No email registered for this user. Please contact admin.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, fullName: user.username, type: 'login' })
      });
      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.error || 'Failed to send OTP');
      }
      setUserEmail(targetEmail);
      setStep('otp');
`;

code = code.replace(
  /if \(!user\.email\) \{\s*setError\('No email registered for this user\. Please contact admin\.'\);\s*return;\s*\}\s*setLoading\(true\);\s*setError\(''\);\s*try \{\s*const res = await fetch\('\/api\/send-otp', \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(\{ email: user\.email, fullName: user\.username, type: 'login' \}\)\s*\}\);\s*if \(!res\.ok\) \{\s*const data = await res\.json\(\);\s*throw new Error\(data\.error \|\| 'Failed to send OTP'\);\s*\}\s*setUserEmail\(user\.email\);\s*setStep\('otp'\);/,
  replacement
);

fs.writeFileSync('src/pages/Login.tsx', code);

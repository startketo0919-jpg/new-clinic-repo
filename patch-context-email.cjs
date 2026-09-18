const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

code = code.replace(
  "deleteUser: (id: string) => void;",
  "deleteUser: (id: string) => void;\n  updateUserEmail: (id: string, email: string) => void;"
);

const updateUserEmailFunc = `
  const updateUserEmail = (id: string, email: string) => {
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === id ? { ...u, email } : u)
    }));
    dispatchAction('UPDATE_USER_EMAIL', { id, email });
  };
`;

code = code.replace(
  "const deleteUser = (id: string) => {",
  updateUserEmailFunc + "\n  const deleteUser = (id: string) => {"
);

code = code.replace(
  "updateFollowUpDate, addUser, deleteUser, updateUserPassword,",
  "updateFollowUpDate, addUser, deleteUser, updateUserEmail, updateUserPassword,"
);

fs.writeFileSync('src/context/ClinicContext.tsx', code);

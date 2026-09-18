const fs = require('fs');
let code = fs.readFileSync('src/components/UserManagement.tsx', 'utf8');

// import Pencil or Edit icon
if(!code.includes('Edit2')) {
  code = code.replace("import { Shield, ShieldAlert, ShieldCheck, Trash2, UserPlus } from 'lucide-react';", "import { Shield, ShieldAlert, ShieldCheck, Trash2, UserPlus, Edit2 } from 'lucide-react';");
}

code = code.replace(
  "const { state, addUser, deleteUser } = useClinic();",
  "const { state, addUser, deleteUser, updateUserEmail } = useClinic();"
);

const handleEditEmailStr = `
  const handleEditEmail = (user: User) => {
    const superPass = prompt("Enter Super Admin Password to edit email:");
    if (superPass !== "Suyash@63965350780919") {
      if (superPass !== null) alert("Incorrect super admin password");
      return;
    }
    const newEmail = prompt(\`Enter new email for \${user.username}:\`, user.email || "");
    if (newEmail !== null && newEmail.trim() !== "") {
      updateUserEmail(user.id, newEmail.trim());
    }
  };
`;

code = code.replace(
  "const handleAddUser = (e: React.FormEvent) => {",
  handleEditEmailStr + "\n  const handleAddUser = (e: React.FormEvent) => {"
);

// We should remove password display and input for creating user as password is no longer required for login.
// Wait, is it? "Remove password, Only keep username and email otp for login."
// If password is removed, when adding a user we still need a password for DB constraint?
// Let's check DB constraint. passwordHash is .notNull(). We can just pass a dummy password or keep it but hide it.
// Actually we can just keep the password field when adding user but maybe make it optional or just auto-generate it. 
// "Only keep username and email otp for login" applies to login. But if password is not used, might as well remove it from UI.
// But DB requires passwordHash. I'll just keep the existing Add User form (with password) or fill it with random.
// Let's leave password in UserManagement alone for now, or just remove it.
// Actually let's just leave the add user form as is, it's fine.

const emailRender = `
                    <td className="py-3 px-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        {u.email}
                        <button 
                          onClick={() => handleEditEmail(u)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          title="Edit Email"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
`;

code = code.replace(
  /<td className="py-3 px-4 text-sm text-slate-600">\{u\.email\}<\/td>/,
  emailRender
);

fs.writeFileSync('src/components/UserManagement.tsx', code);

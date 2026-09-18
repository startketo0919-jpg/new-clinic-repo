import React, { useState } from 'react';
import { useClinic } from '../context/ClinicContext';
import { User, Role } from '../types';
import { Shield, ShieldAlert, ShieldCheck, Trash2, UserPlus, Edit2 } from 'lucide-react';

export default function UserManagement() {
  const { state, addUser, deleteUser, updateUserEmail } = useClinic();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('staff');

  
  const handleEditEmail = (user: User) => {
    const superPass = prompt("Enter Super Admin Password to edit email:");
    if (superPass !== "Suyash@63965350780919") {
      if (superPass !== null) alert("Incorrect super admin password");
      return;
    }
    const newEmail = prompt(`Enter new email for ${user.username}:`, user.email || "");
    if (newEmail !== null && newEmail.trim() !== "") {
      updateUserEmail(user.id, newEmail.trim());
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      if (state.users.some(u => u.username === username)) {
        alert("Username already exists");
        return;
      }
      addUser({ username, passwordHash: password, role, email });
      setUsername('');
      setPassword('');
      setEmail('');
      setRole('staff');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Shield className="w-6 h-6 text-teal-600" />
          User Management (Admin Only)
        </h2>
        <p className="text-slate-500 text-sm mt-1">Create and manage access for clinic staff and doctors.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Add User Form */}
        <div className="md:col-span-1 bg-slate-50 rounded-xl p-5 border border-slate-100 h-fit">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-slate-500" /> Add New User
          </h3>
          <form onSubmit={handleAddUser} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Username</label>
              <input 
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Password</label>
              <input 
                type="text"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email (For OTP Login)</label>
              <input 
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Role</label>
              <select 
                value={role}
                onChange={e => setRole(e.target.value as Role)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              >
                <option value="staff">Staff (Reception)</option>
                <option value="doctor">Doctor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button 
              type="submit"
              className="mt-2 w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 rounded-lg transition-colors text-sm"
            >
              Create User
            </button>
          </form>
        </div>

        {/* Users List */}
        <div className="md:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Username</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                  
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800">{u.username}</td>
                    
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

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                          u.role === 'doctor' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-700'}`}>
                        {u.role === 'admin' && <ShieldAlert className="w-3 h-3" />}
                        {u.role === 'doctor' && <ShieldCheck className="w-3 h-3" />}
                        {u.role}
                      </span>
                    </td>
                    
                    <td className="py-3 px-4 text-right">
                      {u.username !== 'admin' && (
                        <button 
                          onClick={() => deleteUser(u.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

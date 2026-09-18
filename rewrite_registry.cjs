const fs = require('fs');

const content = `import React, { useState, useMemo } from 'react';
import { useClinic } from '../context/ClinicContext';
import { Search, Calendar, UserMinus, FileText, Filter, List } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function PatientHistory({ userRole }: { userRole: string | null }) {
  const { state, deletePatientRecord, updateFollowUpDate } = useClinic();
  
  const [activeTab, setActiveTab] = useState<'pid' | 'date'>('pid');
  const [search, setSearch] = useState('');
  
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const filteredPatients = state.patientRegistry.filter(p => {
    const q = search.toLowerCase();
    return p.fullName.toLowerCase().includes(q) || p.phone.includes(q) || p.clinicId.toLowerCase().includes(q);
  }).sort((a, b) => (b.lastVisited || 0) - (a.lastVisited || 0));
  
  const dateWiseVisits = useMemo(() => {
    const targetDate = new Date(selectedDate);
    const y = targetDate.getFullYear();
    const m = targetDate.getMonth();
    const d = targetDate.getDate();
    
    return state.patients
      .filter(p => p.status === 'Completed')
      .filter(p => {
        const cTime = p.completedTime || p.checkInTime;
        const cDate = new Date(cTime);
        return cDate.getFullYear() === y && cDate.getMonth() === m && cDate.getDate() === d;
      })
      .sort((a, b) => {
        // Sort by token number
        const numA = parseInt(a.token.split('-')[1] || '0', 10);
        const numB = parseInt(b.token.split('-')[1] || '0', 10);
        return numA - numB;
      });
  }, [state.patients, selectedDate]);

  const handleDelete = (clinicId: string) => {
    if (window.confirm("Are you sure you want to delete this patient record? This cannot be undone.")) {
      deletePatientRecord(clinicId);
    }
  };

  const handleDateChange = (clinicId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    if (dateStr) {
      const timestamp = new Date(dateStr).getTime();
      updateFollowUpDate(clinicId, timestamp);
    } else {
      updateFollowUpDate(clinicId, 0); // clear
    }
  };

  const canDelete = userRole === 'admin' || userRole === 'doctor';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-140px)]">
      
      <div className="p-6 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-teal-600" />
            Patient Registry
          </h2>
          
          <div className="flex bg-slate-200/70 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('pid')}
              className={cn("px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2", activeTab === 'pid' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              <List className="w-4 h-4" /> PID Wise (All)
            </button>
            <button
              onClick={() => setActiveTab('date')}
              className={cn("px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2", activeTab === 'date' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              <Calendar className="w-4 h-4" /> Date Wise Visits
            </button>
          </div>
        </div>

        {activeTab === 'pid' ? (
          <div className="relative w-full">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search all patients by name, phone, or Clinic ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all shadow-sm"
            />
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
              <Calendar className="w-5 h-5 text-teal-600" />
              <label className="text-sm font-semibold text-slate-600">Select Date:</label>
              <input 
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="border-none focus:ring-0 text-slate-800 font-medium cursor-pointer outline-none"
              />
            </div>
            {selectedDate === todayStr && (
              <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                Today
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-0">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            {activeTab === 'pid' ? (
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Clinic ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone / Demographics</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Visited</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Follow-up Date</th>
                {canDelete && <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>}
              </tr>
            ) : (
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Token</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Clinic ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone / Age</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Follow-up Date</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activeTab === 'pid' ? (
              filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={canDelete ? 6 : 5} className="px-6 py-12 text-center text-slate-500">
                    No patients found.
                  </td>
                </tr>
              ) : (
                filteredPatients.map(patient => (
                  <tr key={patient.clinicId} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-mono text-sm text-teal-700 font-medium">
                      {patient.clinicId}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{patient.fullName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-700">{patient.phone}</p>
                      <p className="text-xs text-slate-500">{patient.age}y • {patient.gender}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {patient.lastVisited ? format(new Date(patient.lastVisited), 'MMM d, yyyy') : 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        type="date" 
                        className="text-sm border border-slate-200 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:border-teal-500"
                        value={patient.followUpDate ? format(new Date(patient.followUpDate), 'yyyy-MM-dd') : ''}
                        onChange={(e) => handleDateChange(patient.clinicId, e)}
                      />
                    </td>
                    {canDelete && (
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDelete(patient.clinicId)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Delete Patient"
                        >
                          <UserMinus className="w-5 h-5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )
            ) : (
              dateWiseVisits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No completed visits on this date.
                  </td>
                </tr>
              ) : (
                dateWiseVisits.map(visit => {
                  const registryRecord = state.patientRegistry.find(r => r.clinicId === visit.clinicId);
                  return (
                    <tr key={visit.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-teal-100 text-teal-800 font-black text-lg">
                          {visit.token.split('-')[1]}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-600">
                        {visit.clinicId}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{visit.fullName}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-700">{visit.phone}</p>
                        <p className="text-xs text-slate-500">{visit.age} yrs • {visit.gender}</p>
                      </td>
                      <td className="px-6 py-4">
                        {registryRecord ? (
                          <input 
                            type="date" 
                            className="text-sm border border-slate-200 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:border-teal-500"
                            value={registryRecord.followUpDate ? format(new Date(registryRecord.followUpDate), 'yyyy-MM-dd') : ''}
                            onChange={(e) => handleDateChange(registryRecord.clinicId, e)}
                          />
                        ) : (
                          <span className="text-slate-400 text-sm">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/components/PatientHistory.tsx', content);

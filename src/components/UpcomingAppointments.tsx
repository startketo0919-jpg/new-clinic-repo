import React from 'react';
import { useClinic } from '../context/ClinicContext';
import { Calendar, User, Phone, XCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

import { getLocalTodayString } from '../lib/dateUtils';

export default function UpcomingAppointments() {
  const { state, cancelAppointment, approveAppointment } = useClinic();
  
  const sortedAppointments = [...state.appointments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Group by date
  const groupedAppointments = sortedAppointments.reduce((acc, app) => {
    if (!acc[app.date]) {
      acc[app.date] = [];
    }
    acc[app.date].push(app);
    return acc;
  }, {} as Record<string, typeof sortedAppointments>);

  const todayStr = getLocalTodayString();

  const handleApprove = (app: any) => {
    approveAppointment(app);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-140px)] overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-teal-600" />
            Appointments
          </h2>
          <p className="text-slate-500 text-sm mt-1">Review requests and scheduled visits.</p>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {Object.keys(groupedAppointments).length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No upcoming appointments or requests.
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {Object.entries(groupedAppointments).map(([date, apps]) => (
              <div key={date}>
                <h3 className="font-bold text-lg text-slate-800 mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-500" />
                  {date === todayStr ? 'Today (Pending Approvals)' : format(new Date(date), 'MMMM d, yyyy')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(apps as any[]).map(app => (
                    <div key={app.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-slate-800 text-lg">{app.fullName}</p>
                          <p className="text-sm text-slate-500">{app.age} yrs • {app.gender}</p>
                        </div>
                        <span className="inline-flex px-2 py-1 rounded text-xs font-semibold bg-indigo-100 text-indigo-700">
                          {app.visitType}
                        </span>
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
                          <Phone className="w-4 h-4" /> {app.phone}
                        </div>
                        {app.clinicId && (
                          <div className="text-xs font-mono bg-slate-200 text-slate-700 inline-block px-2 py-0.5 rounded mt-1">
                            {app.clinicId}
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-auto flex items-center gap-2 pt-3 border-t border-slate-200">
                        <button 
                          onClick={() => handleApprove(app)}
                          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-lg text-sm font-semibold transition-colors flex justify-center items-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" /> Approve
                        </button>
                        <button 
                          onClick={() => {
                            if(window.confirm('Cancel this appointment?')) cancelAppointment(app.id);
                          }}
                          className="flex-1 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 py-2 rounded-lg text-sm font-semibold transition-colors flex justify-center items-center gap-1"
                        >
                          <XCircle className="w-4 h-4" /> Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

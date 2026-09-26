import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Video, Phone, Mail, Download, RefreshCw, Search, Filter, ChevronDown, ChevronUp, Check, X, Trash2, FileText, MapPin, ExternalLink, CalendarDays, List } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import { getLocalTodayString } from '../lib/dateUtils';

interface OnlineAppointment {
  id: string;
  patientName: string;
  phone: string;
  clinicId?: string;
  date: string; // ISO string
  time: string;
  healthConcern: string;
  paymentStatus: 'Paid' | 'Free' | 'Refunded' | 'Pending';
  amount: number;
  meetLink?: string;
  status: 'Confirmed' | 'Rescheduled' | 'Completed' | 'Cancelled' | 'Pending_slot';
  files: Array<{ name: string; url: string }>;
  courierRequested: boolean;
  courierInfo?: {
    address: string;
    pincode: string;
    contact: string;
  };
  rescheduleCount: number;
  createdAt: string;
}

export default function OnlineAppointments({ userRole }: { userRole?: string | null }) {
  const [appointments, setAppointments] = useState<OnlineAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/online-appointments');
      if (res.ok) {
        const data = await res.json();
        const rawList: any[] = data.appointments || [];
        const mapped: OnlineAppointment[] = rawList.map(a => ({
          id: a.id,
          patientName: a.patient_name || a.patientName,
          phone: a.phone,
          clinicId: a.clinic_id || a.clinicId,
          date: a.appointment_date || a.date || '',
          time: a.time_slot || a.time || '',
          healthConcern: a.health_concern || a.healthConcern || '',
          paymentStatus: (
            a.payment_status === 'paid'
              ? 'Paid'
              : a.is_follow_up_free
                ? 'Free'
                : a.payment_status === 'refunded'
                  ? 'Refunded'
                  : 'Pending'
          ),
          amount: a.payment_amount ? a.payment_amount / 100 : 0,
          meetLink: a.meet_link || a.meetLink,
          status: (a.status ? a.status.charAt(0).toUpperCase() + a.status.slice(1) : 'Confirmed') as any,
          files: a.files || [],
          courierRequested: !!a.wants_courier_medicine,
          courierInfo: a.wants_courier_medicine ? {
            address: a.courier_address || '',
            pincode: a.courier_pincode || '',
            contact: a.courier_contact || ''
          } : undefined,
          rescheduleCount: a.reschedule_count || 0,
          createdAt: a.created_at || a.createdAt || ''
        }));
        setAppointments(mapped);
      } else {
        setAppointments([]);
      }
    } catch (error) {
      console.error('Failed to fetch online appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      if (event.data === 'update') {
        fetchAppointments();
      }
    };
    return () => eventSource.close();
  }, []);

  const handleAction = async (action: 'complete' | 'refund' | 'delete', app: OnlineAppointment) => {
    try {
      if (action === 'complete') {
        const res = await fetch('/api/online-appointments/' + app.id + '/complete', {
          method: 'PATCH'
        });
        if (res.ok) {
          setAppointments(prev => prev.map(a => a.id === app.id ? { ...a, status: 'Completed' } : a));
        } else {
          const err = await res.json().catch(() => ({}));
          alert(err.error || 'Failed to complete appointment');
        }
      } else if (action === 'refund') {
        if (!window.confirm(`Are you sure you want to cancel and refund ₹${app.amount} for ${app.patientName}?`)) {
          return;
        }
        const res = await fetch('/api/appointments/refund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointmentId: app.id })
        });
        if (res.ok) {
          setAppointments(prev => prev.map(a => a.id === app.id ? { ...a, status: 'Cancelled', paymentStatus: 'Refunded' } : a));
        } else {
          const err = await res.json().catch(() => ({}));
          alert(err.error || 'Refund failed');
        }
      } else if (action === 'delete') {
        if (!window.confirm(`Are you sure you want to delete the appointment for ${app.patientName}? This action cannot be undone.`)) {
          return;
        }
        const res = await fetch('/api/online-appointments/' + app.id, {
          method: 'DELETE'
        });
        if (res.ok) {
          setAppointments(prev => prev.filter(a => a.id !== app.id));
        } else {
          const err = await res.json().catch(() => ({}));
          alert(err.error || 'Failed to delete appointment');
        }
      }
    } catch (e: any) {
      console.error('Action failed:', e);
      alert('Action failed: ' + (e?.message || 'Unknown error'));
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter(app => {
      if (statusFilter !== 'All' && app.status !== statusFilter) return false;
      if (dateFilter && app.date !== dateFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          app.patientName.toLowerCase().includes(q) ||
          app.phone.includes(q) ||
          (app.clinicId && app.clinicId.toLowerCase().includes(q)) ||
          app.id.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => {
      const timeA = a.date && a.time ? new Date(`${a.date}T${a.time}`).getTime() : 0;
      const timeB = b.date && b.time ? new Date(`${b.date}T${b.time}`).getTime() : 0;
      return timeB - timeA;
    });
  }, [appointments, statusFilter, dateFilter, searchQuery]);

  // Calendar logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getAppointmentsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return appointments.filter(a => a.date === dayStr);
  };

  const handleDayClick = (day: Date) => {
    setDateFilter(format(day, 'yyyy-MM-dd'));
    setViewMode('table');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-140px)] overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Video className="w-6 h-6 text-indigo-600" />
            Online Appointments
          </h2>
          <p className="text-slate-500 text-sm mt-1">Manage video consultations and digital payments</p>
        </div>

        <div className="flex bg-slate-200/70 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('table')}
            className={cn("px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2", viewMode === 'table' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            <List className="w-4 h-4" /> Table View
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={cn("px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2", viewMode === 'calendar' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            <CalendarDays className="w-4 h-4" /> Calendar View
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex flex-col">
        {viewMode === 'table' ? (
          <>
            {/* Table Filters */}
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center bg-white sticky top-0 z-10">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search by name, phone, PID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                />
              </div>
              
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50">
                <Filter className="w-4 h-4 text-slate-500" />
                <select 
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-700 outline-none cursor-pointer"
                >
                  <option value="All">All Status</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Rescheduled">Rescheduled</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Pending_slot">Pending Slot</option>
                </select>
              </div>

              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50">
                <Calendar className="w-4 h-4 text-slate-500" />
                <input 
                  type="date"
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-700 outline-none cursor-pointer"
                />
                {dateFilter && (
                  <button onClick={() => setDateFilter('')} className="ml-1 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date & Time</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Patient</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Health Concern</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Payment</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Meet Link</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                        Loading appointments...
                      </td>
                    </tr>
                  ) : filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        No online appointments found.
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments.map(app => (
                      <React.Fragment key={app.id}>
                        <tr className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => toggleRow(app.id)}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">
                              {app.date ? (() => {
                                try { return format(parseISO(app.date), 'MMM d, yyyy'); }
                                catch { return app.date; }
                              })() : 'Date Pending'}
                            </div>
                            <div className="text-sm text-slate-500">{app.time || 'Pending'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800">{app.patientName}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" /> {app.phone}
                            </div>
                            {app.clinicId && (
                              <div className="text-xs font-mono text-indigo-600 mt-0.5">{app.clinicId}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <p className="text-sm text-slate-700 truncate" title={app.healthConcern}>{app.healthConcern}</p>
                            {app.files.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                <FileText className="w-3 h-3" /> {app.files.length} file(s)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {app.paymentStatus === 'Paid' ? (
                              <span className="inline-flex px-2 py-1 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">
                                ₹{app.amount} Paid
                              </span>
                            ) : app.paymentStatus === 'Free' ? (
                              <span className="inline-flex px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                                FREE
                              </span>
                            ) : app.paymentStatus === 'Refunded' ? (
                              <span className="inline-flex px-2 py-1 rounded text-xs font-semibold bg-rose-100 text-rose-700">
                                Refunded
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                {app.amount > 0 ? `₹${app.amount} Unpaid` : 'Pending'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {app.meetLink ? (
                              <a 
                                href={app.meetLink} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                onClick={e => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                              >
                                <ExternalLink className="w-4 h-4" /> Join
                              </a>
                            ) : (
                              <span className="text-sm text-slate-400">N/A</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border", {
                              'bg-emerald-50 text-emerald-700 border-emerald-200': app.status === 'Confirmed',
                              'bg-blue-50 text-blue-700 border-blue-200': app.status === 'Rescheduled',
                              'bg-slate-100 text-slate-700 border-slate-300': app.status === 'Completed',
                              'bg-rose-50 text-rose-700 border-rose-200': app.status === 'Cancelled',
                              'bg-amber-50 text-amber-700 border-amber-200': (app.status as string) === 'Pending_slot' || (app.status as string).toLowerCase().includes('pending'),
                            })}>
                              {(app.status as string) === 'Pending_slot' ? 'Pending Slot' : app.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                              {app.status !== 'Completed' && app.status !== 'Cancelled' && (
                                <button 
                                  onClick={() => handleAction('complete', app)}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
                                  title="Mark Complete"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              {app.paymentStatus === 'Paid' && app.status !== 'Cancelled' && (
                                <button 
                                  onClick={() => handleAction('refund', app)}
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-200"
                                  title="Cancel & Refund"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                              <button 
                                onClick={() => handleAction('delete', app)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                                title="Delete Appointment"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors ml-1">
                                {expandedRows.has(app.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {/* Expanded Content */}
                        {expandedRows.has(app.id) && (
                          <tr className="bg-slate-50/50 border-b border-slate-200">
                            <td colSpan={7} className="px-6 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div>
                                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Details</h4>
                                  <div className="text-sm text-slate-700 space-y-1">
                                    <p><b>Created:</b> {app.createdAt ? (() => {
                                      try { return format(new Date(app.createdAt), 'MMM d, yyyy h:mm a'); }
                                      catch { return String(app.createdAt); }
                                    })() : 'N/A'}</p>
                                    <p><b>Rescheduled:</b> {app.rescheduleCount} time(s)</p>
                                    <p><b>Email:</b> {app.patientName.replace(/\s+/g, '').toLowerCase()}@example.com</p>
                                  </div>
                                </div>
                                
                                {app.files.length > 0 && (
                                  <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Uploaded Files</h4>
                                    <div className="space-y-2">
                                      {app.files.map((f, i) => (
                                        <a 
                                          key={i} 
                                          href={f.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="flex items-center justify-between p-2 rounded border border-slate-200 bg-white hover:border-indigo-300 transition-colors group"
                                        >
                                          <div className="flex items-center gap-2 text-sm text-slate-600 truncate">
                                            <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                            <span className="truncate">{f.name}</span>
                                          </div>
                                          <Download className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {app.courierRequested && app.courierInfo && (
                                  <div className="lg:col-span-2">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                      <MapPin className="w-3.5 h-3.5" /> Medicine Courier Requested
                                    </h4>
                                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-slate-700">
                                      <p><b>Address:</b> {app.courierInfo.address}</p>
                                      <p className="mt-1"><b>Pincode:</b> {app.courierInfo.pincode}</p>
                                      <p className="mt-1"><b>Contact:</b> {app.courierInfo.contact}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* Calendar View */
          <div className="p-6 flex-1 bg-slate-50/50 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">
                {format(currentMonth, 'MMMM yyyy')}
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm text-sm font-medium hover:bg-slate-50"
                >
                  Previous
                </button>
                <button 
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm text-sm font-medium hover:bg-slate-50"
                >
                  Today
                </button>
                <button 
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm text-sm font-medium hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden shadow-sm flex-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="bg-slate-100 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                  {day}
                </div>
              ))}
              
              {calendarDays.map((day, i) => {
                const isWednesday = day.getDay() === 3;
                const dayApps = getAppointmentsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isCurrentDay = isToday(day);

                return (
                  <div 
                    key={day.toISOString()}
                    onClick={() => { if(dayApps.length > 0) handleDayClick(day); }}
                    className={cn(
                      "min-h-[100px] p-2 flex flex-col bg-white transition-colors relative",
                      !isCurrentMonth && "bg-slate-50/50 text-slate-400",
                      isCurrentDay && "ring-2 ring-inset ring-indigo-500",
                      isWednesday && "bg-slate-50",
                      dayApps.length > 0 ? "cursor-pointer hover:bg-indigo-50/50" : ""
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <span className={cn(
                        "text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full",
                        isCurrentDay ? "bg-indigo-600 text-white" : "text-slate-700",
                        !isCurrentMonth && !isCurrentDay && "text-slate-400"
                      )}>
                        {format(day, 'd')}
                      </span>
                    </div>

                    {isWednesday ? (
                      <div className="mt-auto text-center">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Closed</span>
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-col gap-1">
                        {dayApps.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {dayApps.slice(0, 3).map(a => (
                              <div key={a.id} className={cn("w-2 h-2 rounded-full", {
                                'bg-emerald-500': a.status === 'Confirmed',
                                'bg-blue-500': a.status === 'Rescheduled',
                                'bg-slate-400': a.status === 'Completed',
                                'bg-rose-500': a.status === 'Cancelled',
                              })} title={`${a.patientName} - ${a.time}`} />
                            ))}
                            {dayApps.length > 3 && (
                              <span className="text-[10px] text-slate-500 font-medium leading-none">
                                +{dayApps.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        {dayApps.length > 0 && (
                          <div className="text-xs text-indigo-600 font-medium mt-1">
                            {dayApps.length} Appt{dayApps.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

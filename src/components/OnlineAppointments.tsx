import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Video, Phone, Mail, Download, RefreshCw, Search, Filter, ChevronDown, ChevronUp, Check, X, Trash2, FileText, MapPin, ExternalLink, CalendarDays, List, IndianRupee, Eye, Truck } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import { getLocalTodayString } from '../lib/dateUtils';

export interface AppointmentFile {
  id: string;
  name: string;
  mimeType?: string;
  sizeBytes?: number;
  url: string;
  downloadUrl: string;
  uploadedAt?: string;
}

export interface OnlineAppointment {
  id: string;
  patientName: string;
  age?: number | string;
  gender?: string;
  phone: string;
  email: string;
  clinicId?: string;
  date: string; // ISO string
  time: string;
  healthConcern: string;
  paymentStatus: 'Paid' | 'Free' | 'Refunded' | 'Pending';
  amount: number;
  meetLink?: string;
  status: 'Confirmed' | 'Rescheduled' | 'Completed' | 'Cancelled' | 'Pending_slot';
  files: AppointmentFile[];
  courierRequested: boolean;
  courierInfo?: {
    address: string;
    pincode: string;
    contact: string;
  };
  patientType?: string;
  shortAddress?: string;
  lastVisitDate?: string;
  rescheduleCount: number;
  createdAt: string;
}

interface OnlineAppointmentsProps {
  userRole?: string | null;
  onAutofillDelhivery?: (data: {
    consigneeName: string;
    consigneePhone: string;
    consigneeAddress: string;
    consigneePincode: string;
  }) => void;
}

export default function OnlineAppointments({ userRole, onAutofillDelhivery }: OnlineAppointmentsProps) {
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

  // Fee Decider Modal
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [feeSettings, setFeeSettings] = useState({
    normalFee: 199,
    followUpFee: 0,
    followUpDays: 7
  });
  const [savingFees, setSavingFees] = useState(false);

  const fetchFees = async () => {
    try {
      const res = await fetch('/api/appointments/config');
      if (res.ok) {
        const data = await res.json();
        setFeeSettings({
          normalFee: data.normalFee ?? 199,
          followUpFee: data.followUpFee ?? 0,
          followUpDays: data.followUpDays ?? 7
        });
      }
    } catch (e) {
      console.error('Failed to load fees:', e);
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  const handleSaveFees = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFees(true);
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'UPDATE_SETTINGS',
          payload: {
            consultationFee: (feeSettings.normalFee || 0) * 100,
            followUpFee: (feeSettings.followUpFee || 0) * 100,
            followUpFreeDays: feeSettings.followUpDays || 7
          }
        })
      });
      if (res.ok) {
        setShowFeeModal(false);
        alert('Consultation fees updated successfully!');
      } else {
        alert('Failed to save fees');
      }
    } catch (err: any) {
      alert('Error saving fees: ' + err.message);
    } finally {
      setSavingFees(false);
    }
  };

  // File Preview Modal State
  const [previewFile, setPreviewFile] = useState<{
    id: string;
    name: string;
    url: string;
    downloadUrl: string;
    isPdf: boolean;
    isImage: boolean;
  } | null>(null);

  const handleViewFile = (file: AppointmentFile) => {
    const token = sessionStorage.getItem('staffAuthToken') || '';
    const fileUrl = `${file.url}?token=${encodeURIComponent(token)}`;
    const downloadUrl = `${file.downloadUrl}?token=${encodeURIComponent(token)}`;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const isPdf = ext === 'pdf' || file.mimeType === 'application/pdf';
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) || (file.mimeType?.startsWith('image/') ?? false);

    setPreviewFile({
      id: file.id,
      name: file.name,
      url: fileUrl,
      downloadUrl,
      isPdf,
      isImage
    });
  };

  const handleDownloadFile = (file: AppointmentFile) => {
    const token = sessionStorage.getItem('staffAuthToken') || '';
    const downloadUrl = `${file.downloadUrl}?token=${encodeURIComponent(token)}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDeleteFile = async (appointmentId: string, fileId: string, fileName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/appointments/files/${fileId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete file');
      }

      setAppointments(prev => prev.map(a => {
        if (a.id === appointmentId) {
          return {
            ...a,
            files: a.files.filter(f => f.id !== fileId)
          };
        }
        return a;
      }));
    } catch (err: any) {
      alert('Error deleting file: ' + err.message);
    }
  };

  const handleSendViaDelhivery = (app: OnlineAppointment) => {
    if (!onAutofillDelhivery) {
      alert('Delhivery courier dispatcher is not connected.');
      return;
    }
    const name = app.patientName || '';
    const phone = app.courierInfo?.contact || app.phone || '';
    const address = app.courierInfo?.address || app.shortAddress || '';
    const pincode = app.courierInfo?.pincode || '';

    onAutofillDelhivery({
      consigneeName: name,
      consigneePhone: phone,
      consigneeAddress: address,
      consigneePincode: pincode
    });
  };

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
          age: a.age,
          gender: a.gender,
          phone: a.phone,
          email: a.email || '',
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
          files: (a.files || []).map((f: any) => ({
            id: f.id,
            name: f.name || f.original_name,
            mimeType: f.mimeType || f.mime_type,
            sizeBytes: f.sizeBytes || f.size_bytes,
            url: f.url || `/api/appointments/files/view/${f.id}`,
            downloadUrl: f.downloadUrl || `/api/appointments/files/download/${f.id}`,
            uploadedAt: f.uploadedAt || f.uploaded_at
          })),
          courierRequested: !!a.wants_courier_medicine,
          courierInfo: a.wants_courier_medicine ? {
            address: a.courier_address || '',
            pincode: a.courier_pincode || '',
            contact: a.courier_contact || ''
          } : undefined,
          patientType: a.patient_type || '',
          shortAddress: a.short_address || '',
          lastVisitDate: a.last_visit_date || '',
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

        <div className="flex items-center gap-2">
          {userRole === 'admin' && (
            <button
              onClick={() => { fetchFees(); setShowFeeModal(true); }}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-xl border border-indigo-200 transition-colors flex items-center gap-1.5 shadow-sm"
              title="Configure consultation fees"
            >
              <IndianRupee className="w-4 h-4" /> Fee Decider
            </button>
          )}

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
                                  <div className="text-sm text-slate-700 space-y-1.5">
                                    <p><b>Created:</b> {app.createdAt ? (() => {
                                      try { return format(new Date(app.createdAt), 'MMM d, yyyy h:mm a'); }
                                      catch { return String(app.createdAt); }
                                    })() : 'N/A'}</p>
                                    <p><b>Rescheduled:</b> {app.rescheduleCount} time(s)</p>
                                    <p><b>Email:</b> <span className="font-medium text-slate-900">{app.email || 'N/A'}</span></p>
                                    {app.age && <p><b>Age / Gender:</b> {app.age} yrs {app.gender ? `/ ${app.gender}` : ''}</p>}
                                    {app.clinicId && <p><b>Patient ID:</b> <span className="font-mono font-semibold text-slate-800">{app.clinicId}</span></p>}
                                  </div>

                                  {/* Offline Clinic Records Section (Request 2) */}
                                  {(app.shortAddress || app.lastVisitDate) ? (
                                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                                      <div className="font-bold flex items-center gap-1.5 mb-1.5 text-blue-800">
                                        <MapPin className="w-3.5 h-3.5 text-blue-600" /> Offline Clinic Record Info
                                      </div>
                                      {app.shortAddress && (
                                        <p className="mb-1"><b>Short Address:</b> <span className="font-medium text-slate-900">{app.shortAddress}</span></p>
                                      )}
                                      {app.lastVisitDate && (
                                        <p><b>Last Offline Visit:</b> <span className="font-medium text-slate-900">{app.lastVisitDate}</span></p>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="mt-2 text-xs text-slate-400 italic">
                                      No offline clinic records noted
                                    </div>
                                  )}

                                  {/* Send via Delhivery (if courier was not explicitly requested, can still dispatch from here) */}
                                  {!app.courierRequested && onAutofillDelhivery && (
                                    <div className="mt-3 pt-2 border-t border-slate-200">
                                      <button
                                        type="button"
                                        onClick={() => handleSendViaDelhivery(app)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold rounded-lg border border-teal-200 transition-colors shadow-xs"
                                        title="Prefill patient details into Delhivery New Order"
                                      >
                                        <Truck className="w-3.5 h-3.5 text-teal-600" /> Send via Delhivery
                                      </button>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Uploaded Files Section (Request 4) */}
                                <div className="lg:col-span-1">
                                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center justify-between">
                                    <span>Uploaded Files ({app.files.length})</span>
                                  </h4>
                                  {app.files.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic bg-white p-3 rounded-lg border border-slate-200">
                                      No reports or files uploaded.
                                    </p>
                                  ) : (
                                    <div className="space-y-2">
                                      {app.files.map((file) => (
                                        <div 
                                          key={file.id} 
                                          className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white hover:border-teal-300 transition-colors shadow-xs"
                                        >
                                          <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                                            <div className="p-1 bg-teal-50 text-teal-600 rounded flex-shrink-0">
                                              <FileText className="w-4 h-4 text-teal-600" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <p className="text-xs font-semibold text-slate-800 truncate" title={file.name}>
                                                {file.name}
                                              </p>
                                              {file.sizeBytes && (
                                                <p className="text-[10px] text-slate-400">
                                                  {(file.sizeBytes / 1024).toFixed(1)} KB
                                                </p>
                                              )}
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1 flex-shrink-0">
                                            {/* VIEW */}
                                            <button
                                              type="button"
                                              onClick={() => handleViewFile(file)}
                                              className="p-1 text-teal-700 hover:bg-teal-50 rounded transition-colors"
                                              title="View file"
                                            >
                                              <Eye className="w-3.5 h-3.5" />
                                            </button>

                                            {/* DOWNLOAD */}
                                            <button
                                              type="button"
                                              onClick={() => handleDownloadFile(file)}
                                              className="p-1 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors"
                                              title="Download file"
                                            >
                                              <Download className="w-3.5 h-3.5" />
                                            </button>

                                            {/* DELETE */}
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteFile(app.id, file.id, file.name)}
                                              className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors"
                                              title="Delete file"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {app.courierRequested && app.courierInfo && (
                                  <div className="lg:col-span-2">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                      <MapPin className="w-3.5 h-3.5 text-amber-600" /> Medicine Courier Requested
                                    </h4>
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-sm text-slate-700 space-y-1">
                                      <p><b>Address:</b> <span className="font-medium text-slate-900">{app.courierInfo.address}</span></p>
                                      <p><b>Pincode:</b> <span className="font-mono font-medium text-slate-900">{app.courierInfo.pincode}</span></p>
                                      <p><b>Contact:</b> <span className="font-medium text-slate-900">{app.courierInfo.contact}</span></p>
                                      
                                      {/* Send via Delhivery (Request 3) */}
                                      {onAutofillDelhivery && (
                                        <div className="mt-3 pt-2.5 border-t border-amber-200/70 flex items-center justify-between">
                                          <span className="text-xs text-amber-900 font-medium">Ready to dispatch package?</span>
                                          <button
                                            type="button"
                                            onClick={() => handleSendViaDelhivery(app)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                                          >
                                            <Truck className="w-3.5 h-3.5" /> Send via Delhivery
                                          </button>
                                        </div>
                                      )}
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

      {/* Fee Decider Modal */}
      {showFeeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-indigo-600" /> Fee Decider
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Set consultation fees for normal bookings vs. 7-day follow-up window.</p>
              </div>
              <button 
                onClick={() => setShowFeeModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFees} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">Standard Consultation Fee (₹)</label>
                <p className="text-xs text-slate-500 mb-2">Charged for normal/new appointments or bookings outside the follow-up window.</p>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                  <input 
                    type="number"
                    min="0"
                    value={feeSettings.normalFee}
                    onChange={e => setFeeSettings(prev => ({ ...prev, normalFee: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl text-base font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="199"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">Follow-up Window Fee (₹)</label>
                <p className="text-xs text-slate-500 mb-2">Charged within the 7-day window. Set to <strong>0 for completely FREE</strong>.</p>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                  <input 
                    type="number"
                    min="0"
                    value={feeSettings.followUpFee}
                    onChange={e => setFeeSettings(prev => ({ ...prev, followUpFee: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl text-base font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">Follow-up Window (Days)</label>
                <p className="text-xs text-slate-500 mb-2">Period after previous visit/appointment eligible for follow-up fee.</p>
                <input 
                  type="number"
                  min="1"
                  value={feeSettings.followUpDays}
                  onChange={e => setFeeSettings(prev => ({ ...prev, followUpDays: parseInt(e.target.value, 10) || 7 }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-base font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="7"
                  required
                />
              </div>

              <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-xl text-xs text-indigo-900 space-y-1">
                <div>• Normal Fee: <strong>₹{feeSettings.normalFee}</strong></div>
                <div>• Follow-up Fee ({feeSettings.followUpDays} days): <strong>{feeSettings.followUpFee === 0 ? 'FREE (₹0)' : `₹${feeSettings.followUpFee}`}</strong></div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFeeModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFees}
                  className="px-6 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm disabled:opacity-50"
                >
                  {savingFees ? 'Saving...' : 'Save Fees'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 truncate mr-4">
                <FileText className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <h3 className="font-semibold text-slate-800 truncate" title={previewFile.name}>
                  {previewFile.name}
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={previewFile.downloadUrl}
                  download={previewFile.name}
                  className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Tab
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-4 overflow-auto bg-slate-100 flex items-center justify-center min-h-[350px]">
              {previewFile.isImage ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-sm mx-auto"
                />
              ) : previewFile.isPdf ? (
                <iframe
                  src={previewFile.url}
                  title={previewFile.name}
                  className="w-full h-[75vh] rounded-lg border border-slate-200 bg-white"
                />
              ) : (
                <div className="text-center p-8 bg-white rounded-xl border border-slate-200">
                  <FileText className="w-16 h-16 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700 mb-1">{previewFile.name}</p>
                  <p className="text-xs text-slate-500 mb-4">Preview not available for this file type</p>
                  <a
                    href={previewFile.downloadUrl}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    <Download className="w-4 h-4" /> Download to View
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

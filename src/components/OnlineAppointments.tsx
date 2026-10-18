import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Video, Phone, Download, RefreshCw, Search, Filter, ChevronDown, ChevronUp, Check, X, Trash2, FileText, MapPin, ExternalLink, CalendarDays, List, IndianRupee, Eye, Truck, Link2, UserPlus, Sparkles, Copy, Plus, AlertCircle, CheckCircle2, MessageSquare, Send, Sliders } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, parseISO } from 'date-fns';
import { cn } from '../lib/utils';

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
    sameConcernFee: 199,
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
          sameConcernFee: data.sameConcernFee ?? data.normalFee ?? 199,
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
            sameConcernFee: (feeSettings.sameConcernFee || 0) * 100,
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

  const isDoctorOrAdmin = userRole === 'admin' || userRole === 'doctor';

  // Special Concession Whitelist States
  const [showSpecialConcessionModal, setShowSpecialConcessionModal] = useState(false);
  const [specialPatients, setSpecialPatients] = useState<any[]>([]);
  const [loadingSpecialPatients, setLoadingSpecialPatients] = useState(false);
  const [newSpecialPhone, setNewSpecialPhone] = useState('');
  const [newSpecialName, setNewSpecialName] = useState('');
  const [newSpecialNotes, setNewSpecialNotes] = useState('');
  const [addingSpecialPatient, setAddingSpecialPatient] = useState(false);
  const [specialError, setSpecialError] = useState('');
  const [specialSuccess, setSpecialSuccess] = useState('');

  const fetchSpecialPatients = async () => {
    const token = sessionStorage.getItem('staffAuthToken') || '';
    setLoadingSpecialPatients(true);
    try {
      const res = await fetch('/api/special-fee-patients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSpecialPatients(data.patients || []);
      }
    } catch (e) {
      console.error('Failed to fetch special patients:', e);
    } finally {
      setLoadingSpecialPatients(false);
    }
  };

  const handleAddSpecialPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSpecialError('');
    setSpecialSuccess('');
    const cleanPhone = newSpecialPhone.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setSpecialError('Please enter a valid 10-digit mobile number starting with 6-9');
      return;
    }
    setAddingSpecialPatient(true);
    try {
      const token = sessionStorage.getItem('staffAuthToken') || '';
      const res = await fetch('/api/special-fee-patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          phone: cleanPhone,
          patientName: newSpecialName.trim() || undefined,
          notes: newSpecialNotes.trim() || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSpecialSuccess('Patient mobile added to concession whitelist!');
        setNewSpecialPhone('');
        setNewSpecialName('');
        setNewSpecialNotes('');
        fetchSpecialPatients();
      } else {
        setSpecialError(data.error || 'Failed to add patient');
      }
    } catch (err: any) {
      setSpecialError(err.message || 'Network error');
    } finally {
      setAddingSpecialPatient(false);
    }
  };

  const handleDeleteSpecialPatient = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this patient from the concession list?')) return;
    try {
      const token = sessionStorage.getItem('staffAuthToken') || '';
      const res = await fetch(`/api/special-fee-patients/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSpecialPatients(prev => prev.filter(p => p.id !== id));
      }
    } catch (err: any) {
      alert('Failed to delete: ' + err.message);
    }
  };

  // Custom Booking Links States
  const [showCustomLinkModal, setShowCustomLinkModal] = useState(false);
  const [customLinks, setCustomLinks] = useState<any[]>([]);
  const [loadingCustomLinks, setLoadingCustomLinks] = useState(false);
  const [newCustomAmount, setNewCustomAmount] = useState('');
  const [newCustomPatientName, setNewCustomPatientName] = useState('');
  const [newCustomPhone, setNewCustomPhone] = useState('');
  const [newCustomNotes, setNewCustomNotes] = useState('');
  const [generatingCustomLink, setGeneratingCustomLink] = useState(false);
  const [createdLinkUrl, setCreatedLinkUrl] = useState('');
  const [createdLinkData, setCreatedLinkData] = useState<{
    bookingUrl: string;
    amount: number;
    patientName?: string;
    phone?: string;
  } | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [customLinkError, setCustomLinkError] = useState('');

  // WhatsApp Messaging for Custom Links
  const DEFAULT_CUSTOM_LINK_WA_TEMPLATE = `Dear {patientName},

Greetings from Dr. Sunil Kumar (Krishna Homoeopathic Clinic)! 🙏

As discussed, here is your special appointment booking link with customized consultation charges:

📋 *Consultation Fee Breakdown:*
• Standard Consultation Fee: ₹{normalFee}
• Post Follow-Up Window Fee: ₹{sameConcernFee}
• Follow-Up (within {followUpDays} days): {followUpFeeDisplay}
👉 *Special Consultation Fee for You: ₹{customAmount}*

🔗 *Book Your Appointment Slot Here:*
{bookingUrl}

Please click the link above, choose your convenient date & time slot, and confirm your consultation.
_(Note: This is a secure one-time booking link created specifically for you)._

Warm regards,
*Dr. Sunil Kumar BHMS*
Krishna Homoeopathic Clinic`;

  const [waTemplate, setWaTemplate] = useState<string>(() => {
    return localStorage.getItem('custom_link_wa_template') || DEFAULT_CUSTOM_LINK_WA_TEMPLATE;
  });
  const [whatsAppPhoneNew, setWhatsAppPhoneNew] = useState('');
  const [showMessagePreviewNew, setShowMessagePreviewNew] = useState(false);
  const [activeWhatsAppLinkId, setActiveWhatsAppLinkId] = useState<string | null>(null);
  const [whatsAppPhoneForList, setWhatsAppPhoneForList] = useState('');
  const [sendingWhatsAppForId, setSendingWhatsAppForId] = useState<string | null>(null);
  const [whatsAppSuccessMessage, setWhatsAppSuccessMessage] = useState<string | null>(null);
  const [whatsAppErrorMessage, setWhatsAppErrorMessage] = useState<string | null>(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [templateSavedNotice, setTemplateSavedNotice] = useState(false);

  const buildWhatsAppMessage = (params: {
    patientName?: string;
    customAmount: number | string;
    bookingUrl: string;
  }) => {
    const pName = params.patientName?.trim() ? params.patientName.trim() : 'Patient';
    const followUpDisplay = (feeSettings.followUpFee || 0) === 0 ? 'FREE' : `₹${feeSettings.followUpFee}`;
    return waTemplate
      .replace(/\{patientName\}/g, pName)
      .replace(/\{customAmount\}/g, String(params.customAmount))
      .replace(/\{bookingUrl\}/g, params.bookingUrl)
      .replace(/\{normalFee\}/g, String(feeSettings.normalFee || 199))
      .replace(/\{sameConcernFee\}/g, String(feeSettings.sameConcernFee || 199))
      .replace(/\{followUpDays\}/g, String(feeSettings.followUpDays || 7))
      .replace(/\{followUpFeeDisplay\}/g, followUpDisplay);
  };

  const handleSendWhatsApp = async (phone: string, messageText: string, linkId: string = 'NEW') => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setWhatsAppErrorMessage('Please enter a valid 10-digit Indian mobile number starting with 6-9');
      return;
    }
    setSendingWhatsAppForId(linkId);
    setWhatsAppErrorMessage(null);
    setWhatsAppSuccessMessage(null);
    try {
      const token = sessionStorage.getItem('staffAuthToken') || '';
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phone: cleanPhone,
          content: messageText
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setWhatsAppSuccessMessage(`✓ WhatsApp message sent to ${cleanPhone}!`);
      } else {
        setWhatsAppErrorMessage(data.error || 'Failed to send WhatsApp message. (You can still use "Open in WhatsApp")');
      }
    } catch (err: any) {
      setWhatsAppErrorMessage(err.message || 'Network error while sending WhatsApp message');
    } finally {
      setSendingWhatsAppForId(null);
    }
  };

  const openWhatsAppDirect = (phone: string, messageText: string) => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const target = cleanPhone ? `91${cleanPhone}` : '';
    const url = `https://api.whatsapp.com/send?phone=${target}&text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  const handleSaveTemplate = () => {
    localStorage.setItem('custom_link_wa_template', waTemplate);
    setTemplateSavedNotice(true);
    setTimeout(() => setTemplateSavedNotice(false), 2500);
  };

  const handleResetTemplate = () => {
    setWaTemplate(DEFAULT_CUSTOM_LINK_WA_TEMPLATE);
    localStorage.removeItem('custom_link_wa_template');
  };

  const fetchCustomLinks = async () => {
    const token = sessionStorage.getItem('staffAuthToken') || '';
    setLoadingCustomLinks(true);
    try {
      const res = await fetch('/api/custom-booking-links', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCustomLinks(data.links || []);
      }
    } catch (e) {
      console.error('Failed to fetch custom links:', e);
    } finally {
      setLoadingCustomLinks(false);
    }
  };

  const handleCreateCustomLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomLinkError('');
    setCreatedLinkUrl('');
    setCreatedLinkData(null);
    const amt = parseFloat(newCustomAmount);
    if (isNaN(amt) || amt < 0) {
      setCustomLinkError('Please enter a valid amount (₹)');
      return;
    }
    setGeneratingCustomLink(true);
    try {
      const token = sessionStorage.getItem('staffAuthToken') || '';
      const res = await fetch('/api/custom-booking-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          amount: amt,
          patientName: newCustomPatientName.trim() || undefined,
          phone: newCustomPhone.trim() || undefined,
          notes: newCustomNotes.trim() || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedLinkUrl(data.bookingUrl);
        setCreatedLinkData({
          bookingUrl: data.bookingUrl,
          amount: amt,
          patientName: newCustomPatientName.trim() || undefined,
          phone: newCustomPhone.trim() || undefined
        });
        setWhatsAppPhoneNew(newCustomPhone.trim());
        setWhatsAppSuccessMessage(null);
        setWhatsAppErrorMessage(null);
        setNewCustomAmount('');
        setNewCustomPatientName('');
        setNewCustomPhone('');
        setNewCustomNotes('');
        fetchCustomLinks();
      } else {
        setCustomLinkError(data.error || 'Failed to generate custom link');
      }
    } catch (err: any) {
      setCustomLinkError(err.message || 'Network error');
    } finally {
      setGeneratingCustomLink(false);
    }
  };

  const handleDeleteCustomLink = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this custom booking link?')) return;
    try {
      const token = sessionStorage.getItem('staffAuthToken') || '';
      const res = await fetch(`/api/custom-booking-links/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setCustomLinks(prev => prev.filter(l => l.id !== id));
      }
    } catch (err: any) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLinkId(id);
      setTimeout(() => setCopiedLinkId(null), 2500);
    } catch (e) {
      console.error('Clipboard copy failed:', e);
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

        <div className="flex items-center gap-2 flex-wrap">
          {isDoctorOrAdmin && (
            <>
              <button
                onClick={() => { fetchSpecialPatients(); setShowSpecialConcessionModal(true); }}
                className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 shadow-sm"
                title="Manage offline patient concession whitelist"
              >
                <UserPlus className="w-4 h-4" /> Concession Whitelist
              </button>

              <button
                onClick={() => { fetchCustomLinks(); setShowCustomLinkModal(true); }}
                className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-semibold rounded-xl border border-amber-200 transition-colors flex items-center gap-1.5 shadow-sm"
                title="Create custom amount booking link"
              >
                <Link2 className="w-4 h-4" /> Custom Link
              </button>
            </>
          )}

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
                <label className="block text-sm font-bold text-slate-800 mb-1">Same Concern (Post Follow-up) Fee (₹)</label>
                <p className="text-xs text-slate-500 mb-2">Charged when a returning patient books for the <strong>same health concern after the follow-up window has passed</strong>.</p>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                  <input 
                    type="number"
                    min="0"
                    value={feeSettings.sameConcernFee}
                    onChange={e => setFeeSettings(prev => ({ ...prev, sameConcernFee: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl text-base font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="199"
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
                <div>• Tier 1 - Follow-up Fee ({feeSettings.followUpDays} days): <strong>{feeSettings.followUpFee === 0 ? 'FREE (₹0)' : `₹${feeSettings.followUpFee}`}</strong></div>
                <div>• Tier 2 - Same Concern (Post-Window): <strong>₹{feeSettings.sameConcernFee}</strong></div>
                <div>• Tier 3 - Standard / New Case: <strong>₹{feeSettings.normalFee}</strong></div>
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

      {/* Special Concession Modal (Doctor & Admin) */}
      {showSpecialConcessionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-lg">Special Fee Concession Whitelist</h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowSpecialConcessionModal(false); setSpecialError(''); setSpecialSuccess(''); }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 leading-relaxed">
                Add offline/walk-in patient mobile numbers to this list. When this patient books online, the app automatically charges the <strong>Same Health Concern (Post Follow-up) Fee (₹{feeSettings.sameConcernFee})</strong> for <strong>one-time only</strong>, saves their health concern, and creates their profile.
              </div>

              {specialError && (
                <div className="p-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {specialError}
                </div>
              )}

              {specialSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> {specialSuccess}
                </div>
              )}

              {/* Add form */}
              <form onSubmit={handleAddSpecialPatient} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="font-semibold text-xs uppercase tracking-wider text-slate-500">Add New Patient to Whitelist</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={newSpecialPhone}
                      onChange={e => setNewSpecialPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit mobile"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Name (Optional)</label>
                    <input
                      type="text"
                      value={newSpecialName}
                      onChange={e => setNewSpecialName(e.target.value)}
                      placeholder="e.g. Ramesh Sharma"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Offline History (Optional)</label>
                  <input
                    type="text"
                    value={newSpecialNotes}
                    onChange={e => setNewSpecialNotes(e.target.value)}
                    placeholder="e.g. In-clinic consultation last month"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={addingSpecialPatient || !newSpecialPhone}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-colors"
                  >
                    {addingSpecialPatient ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Add to Whitelist
                  </button>
                </div>
              </form>

              {/* Whitelist records */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs uppercase tracking-wider text-slate-500">
                    Enrolled Patients ({specialPatients.length})
                  </span>
                  <button
                    type="button"
                    onClick={fetchSpecialPatients}
                    className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <RefreshCw className={cn("w-3 h-3", loadingSpecialPatients && "animate-spin")} /> Refresh
                  </button>
                </div>

                {specialPatients.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No patients currently on the concession whitelist.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {specialPatients.map((p) => (
                      <div key={p.id} className="p-3 sm:p-4 flex items-center justify-between gap-3 text-sm">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800">{p.phone}</span>
                            {p.patientName && <span className="font-medium text-slate-700">({p.patientName})</span>}
                            {p.isUsed ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Used on {p.usedAt ? format(new Date(p.usedAt), 'dd MMM yyyy') : 'Appointment'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5" /> Active (1 Use Left)
                              </span>
                            )}
                          </div>
                          {p.notes && <div className="text-xs text-slate-500 mt-1 truncate">{p.notes}</div>}
                          <div className="text-[11px] text-slate-400 mt-1">
                            Added {format(new Date(p.createdAt), 'dd MMM yyyy, hh:mm a')} by {p.createdBy || 'staff'}
                          </div>
                        </div>

                        {!p.isUsed && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSpecialPatient(p.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remove from whitelist"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Booking Links Modal (Doctor & Admin) */}
      {showCustomLinkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-800 text-lg">One-Time Custom Fee Booking Links</h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowCustomLinkModal(false); setCustomLinkError(''); setCreatedLinkUrl(''); }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 leading-relaxed">
                Generate a single-use booking link with any custom consultation fee (e.g. ₹100, ₹250). When the patient opens this link, their fee is locked to that exact amount for one booking.
              </div>

              {createdLinkUrl && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Custom Link Generated Successfully!
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={createdLinkUrl}
                      className="flex-1 px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-mono text-slate-700 select-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdLinkUrl, 'NEW')}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
                    >
                      {copiedLinkId === 'NEW' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedLinkId === 'NEW' ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>

                  {/* Send to WhatsApp Block */}
                  <div className="pt-2 border-t border-emerald-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-700" /> Send via WhatsApp (Reply / Direct)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowMessagePreviewNew(!showMessagePreviewNew)}
                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline"
                      >
                        {showMessagePreviewNew ? 'Hide Framed Message' : 'Preview Framed Message'}
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="relative flex-1">
                        <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="tel"
                          maxLength={10}
                          placeholder="10-digit Patient WhatsApp Mobile"
                          value={whatsAppPhoneNew}
                          onChange={e => setWhatsAppPhoneNew(e.target.value.replace(/\D/g, ''))}
                          className="w-full pl-8 pr-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={sendingWhatsAppForId === 'NEW' || !whatsAppPhoneNew}
                        onClick={() => handleSendWhatsApp(whatsAppPhoneNew, buildWhatsAppMessage({
                          patientName: createdLinkData?.patientName,
                          customAmount: createdLinkData?.amount ?? 0,
                          bookingUrl: createdLinkUrl
                        }), 'NEW')}
                        className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors shrink-0"
                        title="Send directly using Meta WhatsApp Cloud API as a customer reply"
                      >
                        {sendingWhatsAppForId === 'NEW' ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        Send WhatsApp API
                      </button>

                      <button
                        type="button"
                        onClick={() => openWhatsAppDirect(whatsAppPhoneNew, buildWhatsAppMessage({
                          patientName: createdLinkData?.patientName,
                          customAmount: createdLinkData?.amount ?? 0,
                          bookingUrl: createdLinkUrl
                        }))}
                        className="px-3 py-2 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shrink-0"
                        title="Open in WhatsApp Web / App with message pre-typed"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open in WhatsApp
                      </button>
                    </div>

                    {whatsAppSuccessMessage && sendingWhatsAppForId === null && (
                      <div className="p-2 bg-white text-emerald-700 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {whatsAppSuccessMessage}
                      </div>
                    )}

                    {whatsAppErrorMessage && sendingWhatsAppForId === null && (
                      <div className="p-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs flex items-center justify-between gap-2">
                        <span>{whatsAppErrorMessage}</span>
                        <button
                          type="button"
                          onClick={() => openWhatsAppDirect(whatsAppPhoneNew, buildWhatsAppMessage({
                            patientName: createdLinkData?.patientName,
                            customAmount: createdLinkData?.amount ?? 0,
                            bookingUrl: createdLinkUrl
                          }))}
                          className="text-[11px] underline font-bold shrink-0 text-emerald-800"
                        >
                          Open in Web Instead
                        </button>
                      </div>
                    )}

                    {showMessagePreviewNew && (
                      <div className="bg-white p-3 rounded-lg border border-emerald-200 text-xs font-sans whitespace-pre-wrap text-slate-700 leading-relaxed max-h-48 overflow-auto">
                        {buildWhatsAppMessage({
                          patientName: createdLinkData?.patientName,
                          customAmount: createdLinkData?.amount ?? 0,
                          bookingUrl: createdLinkUrl
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {customLinkError && (
                <div className="p-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {customLinkError}
                </div>
              )}

              {/* Generate Form */}
              <form onSubmit={handleCreateCustomLink} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="font-semibold text-xs uppercase tracking-wider text-slate-500">Create New Custom Link</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Custom Amount (₹) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-bold text-sm">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={newCustomAmount}
                        onChange={e => setNewCustomAmount(e.target.value)}
                        placeholder="e.g. 150"
                        className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Name (Optional)</label>
                    <input
                      type="text"
                      value={newCustomPatientName}
                      onChange={e => setNewCustomPatientName(e.target.value)}
                      placeholder="e.g. Anita Sharma"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone (Optional)</label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={newCustomPhone}
                      onChange={e => setNewCustomPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit mobile"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Notes (Optional)</label>
                  <input
                    type="text"
                    value={newCustomNotes}
                    onChange={e => setNewCustomNotes(e.target.value)}
                    placeholder="e.g. Special concession for repeat review"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={generatingCustomLink || !newCustomAmount}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-colors"
                  >
                    {generatingCustomLink ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Generate Link
                  </button>
                </div>
              </form>

              {/* Customize Message Template Section */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                <button
                  type="button"
                  onClick={() => setShowTemplateEditor(!showTemplateEditor)}
                  className="w-full p-3 text-left flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" /> Customize Framed WhatsApp Message & Price List
                  </span>
                  <span className="text-slate-400 font-normal">{showTemplateEditor ? '▲ Close' : '▼ Edit & Save Template'}</span>
                </button>
                
                {showTemplateEditor && (
                  <div className="p-4 border-t border-slate-200 bg-white space-y-3">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      This template is automatically populated with the link and price list when replying on WhatsApp. Variables: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-[11px]">&#123;patientName&#125;</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-[11px]">&#123;customAmount&#125;</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-[11px]">&#123;bookingUrl&#125;</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-[11px]">&#123;normalFee&#125;</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-[11px]">&#123;sameConcernFee&#125;</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-[11px]">&#123;followUpDays&#125;</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-[11px]">&#123;followUpFeeDisplay&#125;</code>.
                    </p>
                    <textarea
                      rows={8}
                      value={waTemplate}
                      onChange={e => setWaTemplate(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                    />
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={handleResetTemplate}
                        className="text-xs text-slate-500 hover:text-slate-700 underline"
                      >
                        Reset to Default
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveTemplate}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" /> {templateSavedNotice ? 'Template Saved!' : 'Save Template'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Existing links */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs uppercase tracking-wider text-slate-500">
                    Generated Links ({customLinks.length})
                  </span>
                  <button
                    type="button"
                    onClick={fetchCustomLinks}
                    className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <RefreshCw className={cn("w-3 h-3", loadingCustomLinks && "animate-spin")} /> Refresh
                  </button>
                </div>

                {customLinks.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No custom booking links generated yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {customLinks.map((l) => {
                      const linkUrl = `https://app.drsunilkumarbhms.in/book-appointment?customToken=${l.token}`;
                      return (
                        <div key={l.id} className="divide-y divide-slate-100">
                          <div className="p-3 sm:p-4 flex items-center justify-between gap-3 text-sm">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-xs">
                                  ₹{l.amount}
                                </span>
                                {l.patientName && <span className="font-bold text-slate-800">{l.patientName}</span>}
                                {l.phone && <span className="text-xs text-slate-500">({l.phone})</span>}
                                {l.isUsed ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                    Used {l.usedAt ? format(new Date(l.usedAt), 'dd MMM yyyy') : ''}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    Active (Unused)
                                  </span>
                                )}
                              </div>
                              {l.notes && <div className="text-xs text-slate-500 mt-1 truncate">{l.notes}</div>}
                              <div className="text-[11px] text-slate-400 mt-1">
                                Created {format(new Date(l.createdAt), 'dd MMM yyyy, hh:mm a')} by {l.createdBy || 'doctor'}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {!l.isUsed && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (activeWhatsAppLinkId === l.id) {
                                      setActiveWhatsAppLinkId(null);
                                    } else {
                                      setActiveWhatsAppLinkId(l.id);
                                      setWhatsAppPhoneForList(l.phone || '');
                                      setWhatsAppSuccessMessage(null);
                                      setWhatsAppErrorMessage(null);
                                    }
                                  }}
                                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors ${
                                    activeWhatsAppLinkId === l.id
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  }`}
                                  title="Send link via WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                                </button>
                              )}

                              {!l.isUsed && (
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(linkUrl, l.id)}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                                  title="Copy booking link"
                                >
                                  {copiedLinkId === l.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                  {copiedLinkId === l.id ? 'Copied' : 'Copy'}
                                </button>
                              )}

                              {!l.isUsed && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomLink(l.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete link"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Inline WhatsApp Send Panel for this link */}
                          {!l.isUsed && activeWhatsAppLinkId === l.id && (
                            <div className="p-3.5 bg-emerald-50/60 border-t border-emerald-100 space-y-2.5 animate-in fade-in">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                                  <MessageSquare className="w-3.5 h-3.5 text-emerald-700" /> Send Link to Patient WhatsApp
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setActiveWhatsAppLinkId(null)}
                                  className="text-[11px] text-slate-400 hover:text-slate-600"
                                >
                                  Close
                                </button>
                              </div>

                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <div className="relative flex-1">
                                  <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                                  <input
                                    type="tel"
                                    maxLength={10}
                                    placeholder="10-digit WhatsApp Mobile"
                                    value={whatsAppPhoneForList}
                                    onChange={e => setWhatsAppPhoneForList(e.target.value.replace(/\D/g, ''))}
                                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                  />
                                </div>

                                <button
                                  type="button"
                                  disabled={sendingWhatsAppForId === l.id || !whatsAppPhoneForList}
                                  onClick={() => handleSendWhatsApp(whatsAppPhoneForList, buildWhatsAppMessage({
                                    patientName: l.patientName,
                                    customAmount: l.amount,
                                    bookingUrl: linkUrl
                                  }), l.id)}
                                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors shrink-0"
                                  title="Send directly using Meta WhatsApp Cloud API"
                                >
                                  {sendingWhatsAppForId === l.id ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Send className="w-3.5 h-3.5" />
                                  )}
                                  Send WhatsApp API
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openWhatsAppDirect(whatsAppPhoneForList, buildWhatsAppMessage({
                                    patientName: l.patientName,
                                    customAmount: l.amount,
                                    bookingUrl: linkUrl
                                  }))}
                                  className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shrink-0"
                                  title="Open in WhatsApp Web / App"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" /> Open in Web
                                </button>
                              </div>

                              {whatsAppSuccessMessage && sendingWhatsAppForId === null && (
                                <div className="p-2 bg-white text-emerald-700 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {whatsAppSuccessMessage}
                                </div>
                              )}

                              {whatsAppErrorMessage && sendingWhatsAppForId === null && (
                                <div className="p-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs flex items-center justify-between gap-2">
                                  <span>{whatsAppErrorMessage}</span>
                                  <button
                                    type="button"
                                    onClick={() => openWhatsAppDirect(whatsAppPhoneForList, buildWhatsAppMessage({
                                      patientName: l.patientName,
                                      customAmount: l.amount,
                                      bookingUrl: linkUrl
                                    }))}
                                    className="text-[11px] underline font-bold shrink-0 text-emerald-800"
                                  >
                                    Open in Web Instead
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
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

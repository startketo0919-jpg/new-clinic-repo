import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Store, 
  Split, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  Plus, 
  Search, 
  Filter, 
  ArrowLeft, 
  Trash2, 
  Eye, 
  Download, 
  Printer, 
  Upload, 
  X, 
  DollarSign, 
  IndianRupee, 
  Check, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  Package, 
  ShieldCheck, 
  User, 
  ExternalLink,
  ChevronRight,
  PieChart as PieIcon,
  BarChart3
} from 'lucide-react';
import { Wholesaler, PurchaseInvoice, PurchaseItem, DestinationType, PurchasePaymentStatus } from '../types';

export default function PurchasesPage() {
  const navigate = useNavigate();

  // Authentication Guard: Ensure user is logged in
  const isAuth = sessionStorage.getItem('staffAuthenticated') === 'true';
  useEffect(() => {
    if (!isAuth) {
      sessionStorage.setItem('postLoginRedirect', '/purchases');
      navigate('/login');
    }
  }, [isAuth, navigate]);

  // User session & role
  const userRole = sessionStorage.getItem('userRole') || 'staff';
  const username = sessionStorage.getItem('username') || 'Staff User';
  const isAdminOrDoctor = userRole === 'admin' || userRole === 'doctor';

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'analytics' | 'invoices' | 'new-entry' | 'wholesalers'>('analytics');

  // State
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [staffWindowDays, setStaffWindowDays] = useState(30);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [destinationFilter, setDestinationFilter] = useState<'All' | 'Clinic' | 'Store' | 'Split'>('All');
  const [paymentFilter, setPaymentFilter] = useState<'All' | 'Paid' | 'Unpaid'>('All');
  const [wholesalerFilter, setWholesalerFilter] = useState<string>('All');

  // Custom Date Interval Filter State
  const [dateInterval, setDateInterval] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'last_month' | 'last_30_days' | 'last_90_days' | 'fy' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modals
  const [selectedInvoiceForSlip, setSelectedInvoiceForSlip] = useState<PurchaseInvoice | null>(null);
  const [selectedInvoiceItems, setSelectedInvoiceItems] = useState<PurchaseItem[]>([]);
  const [selectedBillUrl, setSelectedBillUrl] = useState<string | null>(null);
  
  // ERP Document Number Modal
  const [erpModalInvoiceId, setErpModalInvoiceId] = useState<string | null>(null);
  const [erpDocInput, setErpDocInput] = useState('');
  const [erpSaving, setErpSaving] = useState(false);

  // New Wholesaler Modal
  const [showWholesalerModal, setShowWholesalerModal] = useState(false);
  const [wsForm, setWsForm] = useState({
    name: '',
    city: '',
    state: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstNumber: '',
    address: '',
    paymentTerms: '15 Days Credit'
  });
  const [wsSaving, setWsSaving] = useState(false);

  // New Invoice Form State
  const [newInvoice, setNewInvoice] = useState<{
    invoiceNumber: string;
    wholesalerId: string;
    invoiceDate: string;
    destinationType: DestinationType;
    totalAmount: number;
    clinicAmount: number;
    storeAmount: number;
    paymentStatus: PurchasePaymentStatus;
    paidAmount: number;
    paidDate: string;
    paymentMode: string;
    dueDate: string;
    originalBillUrl: string;
    handwrittenSlipUrl: string;
    notes: string;
    items: Array<{
      medicineName: string;
      potencyOrPack: string;
      batchNumber: string;
      expiryDate: string;
      quantity: number;
      unit: string;
      purchasePrice: number;
      gstPercent: number;
      totalAmount: number;
      allocatedTo: 'Clinic' | 'Store';
    }>;
  }>({
    invoiceNumber: '',
    wholesalerId: '',
    invoiceDate: new Date().toISOString().substring(0, 10),
    destinationType: 'Clinic',
    totalAmount: 0,
    clinicAmount: 0,
    storeAmount: 0,
    paymentStatus: 'Unpaid',
    paidAmount: 0,
    paidDate: '',
    paymentMode: 'Cash',
    dueDate: '',
    originalBillUrl: '',
    handwrittenSlipUrl: '',
    notes: '',
    items: []
  });

  const [uploadingBill, setUploadingBill] = useState(false);
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [invoiceSuccessMsg, setInvoiceSuccessMsg] = useState('');
  const [invoiceErrorMsg, setInvoiceErrorMsg] = useState('');

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = {
        'x-user-role': userRole,
        'Authorization': `Bearer ${sessionStorage.getItem('staffAuthToken') || ''}`
      };

      const [invRes, wsRes, anaRes] = await Promise.all([
        fetch('/api/purchases?all=true', { headers }),
        fetch('/api/wholesalers', { headers }),
        fetch('/api/purchases/analytics', { headers })
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        setInvoices(invData.invoices || []);
        if (invData.windowDays) setStaffWindowDays(invData.windowDays);
      }

      if (wsRes.ok) {
        const wsData = await wsRes.json();
        setWholesalers(wsData || []);
      }

      if (anaRes.ok) {
        const anaData = await anaRes.json();
        setAnalytics(anaData);
      }
    } catch (err) {
      console.error('Failed to load purchases data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userRole]);

  // Handle Bill Upload
  const handleFileUpload = async (file: File, type: 'bill' | 'slip') => {
    const formData = new FormData();
    formData.append('file', file);
    if (type === 'bill') setUploadingBill(true);
    else setUploadingSlip(true);

    try {
      const res = await fetch('/api/purchases/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (type === 'bill') {
          setNewInvoice(prev => ({ ...prev, originalBillUrl: data.fileUrl }));
        } else {
          setNewInvoice(prev => ({ ...prev, handwrittenSlipUrl: data.fileUrl }));
        }
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err: any) {
      alert('Upload error: ' + err.message);
    } finally {
      if (type === 'bill') setUploadingBill(false);
      else setUploadingSlip(false);
    }
  };

  // Add Item to New Invoice
  const handleAddItem = () => {
    setNewInvoice(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          medicineName: '',
          potencyOrPack: '',
          batchNumber: '',
          expiryDate: '',
          quantity: 1,
          unit: 'Bottles',
          purchasePrice: 0,
          gstPercent: 12,
          totalAmount: 0,
          allocatedTo: prev.destinationType === 'Store' ? 'Store' : 'Clinic'
        }
      ]
    }));
  };

  // Update item field
  const handleUpdateItem = (index: number, field: string, value: any) => {
    setNewInvoice(prev => {
      const updated = [...prev.items];
      const item = { ...updated[index], [field]: value };

      if (field === 'quantity' || field === 'purchasePrice' || field === 'gstPercent') {
        const q = field === 'quantity' ? Number(value) : item.quantity;
        const p = field === 'purchasePrice' ? Number(value) : item.purchasePrice;
        const g = field === 'gstPercent' ? Number(value) : item.gstPercent;
        const subtotal = q * p;
        item.totalAmount = Math.round(subtotal + (subtotal * g) / 100);
      }

      updated[index] = item;

      // Recalculate totals and split if items exist
      let sumTotal = 0;
      let sumClinic = 0;
      let sumStore = 0;
      updated.forEach(it => {
        sumTotal += it.totalAmount;
        if (it.allocatedTo === 'Store') sumStore += it.totalAmount;
        else sumClinic += it.totalAmount;
      });

      return {
        ...prev,
        items: updated,
        totalAmount: sumTotal > 0 ? sumTotal : prev.totalAmount,
        clinicAmount: prev.destinationType === 'Split' ? sumClinic : (prev.destinationType === 'Store' ? 0 : sumTotal),
        storeAmount: prev.destinationType === 'Split' ? sumStore : (prev.destinationType === 'Store' ? sumTotal : 0)
      };
    });
  };

  const handleRemoveItem = (index: number) => {
    setNewInvoice(prev => {
      const updated = prev.items.filter((_, i) => i !== index);
      let sumTotal = 0;
      let sumClinic = 0;
      let sumStore = 0;
      updated.forEach(it => {
        sumTotal += it.totalAmount;
        if (it.allocatedTo === 'Store') sumStore += it.totalAmount;
        else sumClinic += it.totalAmount;
      });
      return {
        ...prev,
        items: updated,
        totalAmount: sumTotal > 0 ? sumTotal : prev.totalAmount,
        clinicAmount: prev.destinationType === 'Split' ? sumClinic : (prev.destinationType === 'Store' ? 0 : sumTotal),
        storeAmount: prev.destinationType === 'Split' ? sumStore : (prev.destinationType === 'Store' ? sumTotal : 0)
      };
    });
  };

  // Submit New Invoice
  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvoiceErrorMsg('');
    setInvoiceSuccessMsg('');

    if (!newInvoice.invoiceNumber.trim()) {
      setInvoiceErrorMsg('Invoice number is required.');
      return;
    }
    if (!newInvoice.wholesalerId) {
      setInvoiceErrorMsg('Please select a wholesaler.');
      return;
    }
    if (newInvoice.totalAmount <= 0) {
      setInvoiceErrorMsg('Total amount must be greater than 0.');
      return;
    }

    const selectedWs = wholesalers.find(w => w.id === newInvoice.wholesalerId);

    setSavingInvoice(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify({
          ...newInvoice,
          wholesalerName: selectedWs?.name || '',
          wholesalerCity: selectedWs?.city || '',
          createdBy: username
        })
      });

      const data = await res.json();
      setSavingInvoice(false);

      if (res.ok && data.success) {
        setInvoiceSuccessMsg('Purchase invoice saved successfully!');
        // Reset form
        setNewInvoice({
          invoiceNumber: '',
          wholesalerId: '',
          invoiceDate: new Date().toISOString().substring(0, 10),
          destinationType: 'Clinic',
          totalAmount: 0,
          clinicAmount: 0,
          storeAmount: 0,
          paymentStatus: 'Unpaid',
          paidAmount: 0,
          paidDate: '',
          paymentMode: 'Cash',
          dueDate: '',
          originalBillUrl: '',
          handwrittenSlipUrl: '',
          notes: '',
          items: []
        });
        fetchData();
        setTimeout(() => setActiveTab('invoices'), 1200);
      } else {
        setInvoiceErrorMsg(data.error || 'Failed to save invoice.');
      }
    } catch (err: any) {
      setSavingInvoice(false);
      setInvoiceErrorMsg('Network error: ' + err.message);
    }
  };

  // 1-Click Paid / Unpaid Toggle
  const handleTogglePayment = async (inv: PurchaseInvoice) => {
    const nextStatus = inv.paymentStatus === 'Paid' ? 'Unpaid' : 'Paid';
    try {
      const res = await fetch(`/api/purchases/${inv.id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus: nextStatus,
          paidAmount: nextStatus === 'Paid' ? inv.totalAmount : 0,
          paidDate: nextStatus === 'Paid' ? new Date().toISOString().substring(0, 10) : null,
          paymentMode: nextStatus === 'Paid' ? 'UPI' : null
        })
      });
      if (res.ok) {
        setInvoices(prev => prev.map(item => item.id === inv.id ? { ...item, paymentStatus: nextStatus } : item));
        // Refresh analytics in background
        fetch('/api/purchases/analytics').then(r => r.json()).then(data => setAnalytics(data)).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to toggle payment:', err);
    }
  };

  // Submit ERP Document Number
  const handleSaveErpDoc = async () => {
    if (!erpModalInvoiceId) return;
    if (!erpDocInput.trim()) {
      alert('Please enter the ERP Document / Voucher Number generated by your software.');
      return;
    }

    setErpSaving(true);
    try {
      const res = await fetch(`/api/purchases/${erpModalInvoiceId}/erp-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          erpStatus: 'Completed',
          erpDocumentNumber: erpDocInput.trim(),
          updatedBy: username
        })
      });

      if (res.ok) {
        setInvoices(prev => prev.map(inv => 
          inv.id === erpModalInvoiceId 
            ? { ...inv, erpStatus: 'Completed', erpDocumentNumber: erpDocInput.trim(), erpUpdatedBy: username } 
            : inv
        ));
        setErpModalInvoiceId(null);
        setErpDocInput('');
      } else {
        alert('Failed to update ERP status.');
      }
    } catch (err: any) {
      alert('Error updating ERP status: ' + err.message);
    } finally {
      setErpSaving(false);
    }
  };

  // Delete Invoice (Admin/Doctor Only)
  const handleDeleteInvoice = async (id: string, invoiceNumber: string) => {
    if (!isAdminOrDoctor) {
      alert('Only Admin and Doctor are authorized to delete invoices.');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete Invoice #${invoiceNumber}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/purchases/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': userRole }
      });
      if (res.ok) {
        setInvoices(prev => prev.filter(inv => inv.id !== id));
        fetchData();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to delete invoice.');
      }
    } catch (err: any) {
      alert('Delete error: ' + err.message);
    }
  };

  // View Store Transfer Slip
  const handleOpenTransferSlip = async (inv: PurchaseInvoice) => {
    setSelectedInvoiceForSlip(inv);
    try {
      const res = await fetch(`/api/purchases/${inv.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedInvoiceItems(data.items || []);
      }
    } catch (err) {
      console.error('Failed to load invoice items:', err);
    }
  };

  // Create Wholesaler Submit
  const handleSaveWholesaler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsForm.name.trim() || !wsForm.city.trim()) {
      alert('Wholesaler Name and City are required.');
      return;
    }

    setWsSaving(true);
    try {
      const res = await fetch('/api/wholesalers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wsForm)
      });
      const data = await res.json();
      setWsSaving(false);

      if (res.ok && data.success) {
        setShowWholesalerModal(false);
        setWsForm({
          name: '',
          city: '',
          state: '',
          contactPerson: '',
          phone: '',
          email: '',
          gstNumber: '',
          address: '',
          paymentTerms: '15 Days Credit'
        });
        fetchData();
      } else {
        alert(data.error || 'Failed to save wholesaler.');
      }
    } catch (err: any) {
      setWsSaving(false);
      alert('Error: ' + err.message);
    }
  };

  // Calculate Effective Date Boundaries from selected Interval
  const { effectiveStartDate, effectiveEndDate, intervalLabel } = useMemo(() => {
    const today = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (dateInterval === 'today') {
      const d = toYMD(today);
      return { effectiveStartDate: d, effectiveEndDate: d, intervalLabel: `Today (${d})` };
    }
    if (dateInterval === 'this_week') {
      const curr = new Date(today);
      const day = curr.getDay(); // 0 is Sun
      const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(curr.setDate(diff));
      return { effectiveStartDate: toYMD(mon), effectiveEndDate: toYMD(today), intervalLabel: 'This Week' };
    }
    if (dateInterval === 'this_month') {
      const start = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
      return { effectiveStartDate: start, effectiveEndDate: toYMD(today), intervalLabel: `This Month (${today.toLocaleString('default', { month: 'short', year: 'numeric' })})` };
    }
    if (dateInterval === 'last_month') {
      const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      return { effectiveStartDate: toYMD(prev), effectiveEndDate: toYMD(lastDay), intervalLabel: `Last Month (${prev.toLocaleString('default', { month: 'short', year: 'numeric' })})` };
    }
    if (dateInterval === 'last_30_days') {
      const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return { effectiveStartDate: toYMD(d), effectiveEndDate: toYMD(today), intervalLabel: 'Last 30 Days' };
    }
    if (dateInterval === 'last_90_days') {
      const d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      return { effectiveStartDate: toYMD(d), effectiveEndDate: toYMD(today), intervalLabel: 'Last 90 Days' };
    }
    if (dateInterval === 'fy') {
      const year = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      const start = `${year}-04-01`;
      const end = `${year + 1}-03-31`;
      return { effectiveStartDate: start, effectiveEndDate: end, intervalLabel: `FY ${year}-${year + 1}` };
    }
    if (dateInterval === 'custom') {
      return { 
        effectiveStartDate: customStartDate, 
        effectiveEndDate: customEndDate, 
        intervalLabel: (customStartDate || customEndDate) ? `${customStartDate || 'Any'} to ${customEndDate || 'Present'}` : 'Custom Date Interval' 
      };
    }
    return { effectiveStartDate: '', effectiveEndDate: '', intervalLabel: 'All-Time' };
  }, [dateInterval, customStartDate, customEndDate]);

  // Filtered invoices with Search, Categories, and Custom Date Intervals
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = 
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.wholesalerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.wholesalerCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.erpDocumentNumber && inv.erpDocumentNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDest = destinationFilter === 'All' || inv.destinationType === destinationFilter;
      const matchesPay = paymentFilter === 'All' || inv.paymentStatus === paymentFilter;
      const matchesWs = wholesalerFilter === 'All' || inv.wholesalerId === wholesalerFilter;

      let matchesDate = true;
      const invDate = inv.invoiceDate || '';
      if (effectiveStartDate && invDate < effectiveStartDate) matchesDate = false;
      if (effectiveEndDate && invDate > effectiveEndDate) matchesDate = false;

      return matchesSearch && matchesDest && matchesPay && matchesWs && matchesDate;
    });
  }, [invoices, searchQuery, destinationFilter, paymentFilter, wholesalerFilter, effectiveStartDate, effectiveEndDate]);

  // Dynamic Real-Time Analytics derived from filtered entries
  const computedAnalytics = useMemo(() => {
    let totalSpend = 0;
    let totalClinic = 0;
    let totalStore = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;
    let pendingErpCount = 0;

    const wholesalerMap: Record<string, { name: string; city: string; amount: number; count: number }> = {};
    const monthlyMap: Record<string, { month: string; clinic: number; store: number; total: number }> = {};
    const cityMap: Record<string, number> = {};

    filteredInvoices.forEach(inv => {
      const amt = Number(inv.totalAmount || 0);
      const cAmt = Number(inv.clinicAmount || (inv.destinationType === 'Clinic' ? amt : 0));
      const sAmt = Number(inv.storeAmount || (inv.destinationType === 'Store' ? amt : 0));

      totalSpend += amt;
      totalClinic += cAmt;
      totalStore += sAmt;

      if (inv.paymentStatus === 'Paid') {
        totalPaid += (Number(inv.paidAmount) || amt);
      } else {
        totalUnpaid += amt;
      }

      if (inv.erpStatus !== 'Completed') {
        pendingErpCount += 1;
      }

      const wsKey = inv.wholesalerId || inv.wholesalerName;
      if (!wholesalerMap[wsKey]) {
        wholesalerMap[wsKey] = { name: inv.wholesalerName, city: inv.wholesalerCity, amount: 0, count: 0 };
      }
      wholesalerMap[wsKey].amount += amt;
      wholesalerMap[wsKey].count += 1;

      const city = inv.wholesalerCity || 'Other';
      cityMap[city] = (cityMap[city] || 0) + amt;

      const monthKey = inv.invoiceDate ? inv.invoiceDate.substring(0, 7) : 'Recent';
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { month: monthKey, clinic: 0, store: 0, total: 0 };
      }
      monthlyMap[monthKey].clinic += cAmt;
      monthlyMap[monthKey].store += sAmt;
      monthlyMap[monthKey].total += amt;
    });

    const topWholesalers = Object.values(wholesalerMap).sort((a, b) => b.amount - a.amount);
    const monthlyTrend = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
    const cityBreakdown = Object.entries(cityMap).map(([city, amount]) => ({ city, amount })).sort((a, b) => b.amount - a.amount);

    return {
      totalSpend,
      totalClinic,
      totalStore,
      totalPaid,
      totalUnpaid,
      totalInvoices: filteredInvoices.length,
      pendingErpCount,
      topWholesalers,
      monthlyTrend,
      cityBreakdown
    };
  }, [filteredInvoices]);

  // Merged Active Analytics (Live Client-Side Calculation + Backend Fallback)
  const activeAnalytics = useMemo(() => {
    // If we have invoices loaded or filtered, computedAnalytics is authoritative for the selected date interval
    if (invoices.length > 0 || (effectiveStartDate || effectiveEndDate)) {
      return computedAnalytics;
    }
    return analytics || computedAnalytics;
  }, [invoices.length, effectiveStartDate, effectiveEndDate, computedAnalytics, analytics]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      
      {/* Top Navigation Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-400">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  Purchase & Stock Management
                </h1>
                <p className="text-[11px] text-slate-400">Krishna Homoeopathic Clinic & Store</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* User role pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs">
              <span className="w-2 h-2 rounded-full bg-teal-400"></span>
              <span className="text-slate-300 font-medium">{username}</span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                {userRole}
              </span>
            </div>

            <button
              onClick={() => {
                sessionStorage.clear();
                navigate('/login');
              }}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              Log Out
            </button>
          </div>

        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 sm:space-x-2 border-t border-slate-800/80 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'analytics'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics Dashboard
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'invoices'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Invoices Ledger ({invoices.length})
          </button>

          <button
            onClick={() => setActiveTab('new-entry')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'new-entry'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Plus className="w-4 h-4" />
            New Purchase Entry
          </button>

          <button
            onClick={() => setActiveTab('wholesalers')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'wholesalers'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Wholesaler Directory ({wholesalers.length})
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1">

        {/* ========================================================================= */}
        {/* TAB 1: ANALYTICS DASHBOARD                                               */}
        {/* ========================================================================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">

            {/* Date Interval Bar for Analytics */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <h3 className="font-bold text-slate-800 text-sm">Analytics Date Interval</h3>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                    {intervalLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing procurement metrics for {filteredInvoices.length} matching {filteredInvoices.length === 1 ? 'bill' : 'bills'}
                </p>
              </div>

              {/* Interval Preset Pills */}
              <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                {[
                  { id: 'all', label: 'All-Time' },
                  { id: 'today', label: 'Today' },
                  { id: 'this_week', label: 'This Week' },
                  { id: 'this_month', label: 'This Month' },
                  { id: 'last_month', label: 'Last Month' },
                  { id: 'last_30_days', label: '30 Days' },
                  { id: 'last_90_days', label: '90 Days' },
                  { id: 'custom', label: 'Custom Range' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setDateInterval(p.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      dateInterval === p.id 
                        ? 'bg-teal-600 text-white shadow-sm' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Range Date Pickers (Shown if Custom Range is selected) */}
            {dateInterval === 'custom' && (
              <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 flex flex-wrap items-center gap-4 text-xs">
                <span className="font-bold text-teal-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-teal-600" /> Custom Range:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-medium">From:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-medium">To:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                {(customStartDate || customEndDate) && (
                  <button
                    onClick={() => { setCustomStartDate(''); setCustomEndDate(''); setDateInterval('all'); }}
                    className="ml-auto text-xs font-semibold text-rose-600 hover:text-rose-800 underline"
                  >
                    Reset to All-Time
                  </button>
                )}
              </div>
            )}
            
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Purchases</span>
                  <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-black text-slate-900">
                    ₹{(activeAnalytics.totalSpend || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <span>{activeAnalytics.totalInvoices || 0} total invoices recorded</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Clinic vs Store Split</span>
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                    <Split className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-slate-600 font-medium flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block"></span>
                      Clinic:
                    </span>
                    <strong className="text-slate-900 font-bold">₹{(activeAnalytics.totalClinic || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex items-baseline justify-between text-sm mt-1">
                    <span className="text-slate-600 font-medium flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
                      Store:
                    </span>
                    <strong className="text-slate-900 font-bold">₹{(activeAnalytics.totalStore || 0).toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Payment Status</span>
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-emerald-700 font-medium">Paid:</span>
                    <strong className="text-emerald-700 font-bold">₹{(activeAnalytics.totalPaid || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex items-baseline justify-between text-sm mt-1">
                    <span className="text-rose-600 font-medium">Unpaid Dues:</span>
                    <strong className="text-rose-600 font-bold">₹{(activeAnalytics.totalUnpaid || 0).toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">ERP Stock Status</span>
                  <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
                    <Package className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-black text-slate-900">
                    {activeAnalytics.pendingErpCount || 0}
                  </div>
                  <div className="text-xs text-amber-600 font-semibold mt-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Pending ERP Document Entry
                  </div>
                </div>
              </div>

            </div>

            {/* Visual Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Wholesaler Breakdown Chart & Rankings (Span 2 cols) */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Wholesaler-Wise Procurement</h3>
                    <p className="text-xs text-slate-500">Ranked by total purchase value across cities ({intervalLabel})</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
                    {activeAnalytics.topWholesalers?.length || 0} Suppliers
                  </span>
                </div>

                <div className="space-y-3.5 mt-4">
                  {activeAnalytics.topWholesalers && activeAnalytics.topWholesalers.length > 0 ? (
                    activeAnalytics.topWholesalers.slice(0, 6).map((ws: any, idx: number) => {
                      const maxAmount = activeAnalytics.topWholesalers[0].amount || 1;
                      const percent = Math.min(100, Math.round((ws.amount / maxAmount) * 100));

                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                                {idx + 1}
                              </span>
                              <strong className="text-slate-800 text-sm font-semibold">{ws.name}</strong>
                              <span className="text-slate-400 font-normal">({ws.city})</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-500">{ws.count} bills</span>
                              <strong className="text-slate-900 font-bold text-sm">
                                ₹{ws.amount.toLocaleString('en-IN')}
                              </strong>
                            </div>
                          </div>
                          {/* Progress Bar */}
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-400 italic py-6 text-center">No wholesaler purchase data recorded for this date interval.</p>
                  )}
                </div>
              </div>

              {/* City Breakdown & Destination Split (1 col) */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base mb-1">Procurement by City</h3>
                  <p className="text-xs text-slate-500 mb-4">Distribution of orders from various cities ({intervalLabel})</p>

                  <div className="space-y-3">
                    {activeAnalytics.cityBreakdown && activeAnalytics.cityBreakdown.length > 0 ? (
                      activeAnalytics.cityBreakdown.slice(0, 5).map((c: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                            <span className="font-bold text-slate-800">{c.city}</span>
                          </div>
                          <strong className="text-slate-900 font-bold">₹{c.amount.toLocaleString('en-IN')}</strong>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400 italic py-4 text-center">No city data available for this date interval.</p>
                    )}
                  </div>
                </div>

                {/* Quick Split Progress */}
                <div className="pt-6 border-t border-slate-100 mt-6">
                  <div className="flex justify-between text-xs font-semibold text-slate-600 mb-2">
                    <span>Clinic Share ({activeAnalytics.totalSpend > 0 ? Math.round((activeAnalytics.totalClinic / activeAnalytics.totalSpend) * 100) : 0}%)</span>
                    <span>Store Share ({activeAnalytics.totalSpend > 0 ? Math.round((activeAnalytics.totalStore / activeAnalytics.totalSpend) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-indigo-500 flex overflow-hidden">
                    <div
                      className="bg-teal-500 h-full transition-all duration-500"
                      style={{
                        width: `${activeAnalytics.totalSpend > 0 ? (activeAnalytics.totalClinic / activeAnalytics.totalSpend) * 100 : 50}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>

            </div>

            {/* Monthly Expense Trend */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 text-base mb-1">Monthly Procurement Trend</h3>
              <p className="text-xs text-slate-500 mb-6">Tracking medicine purchase expenditure over time</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {activeAnalytics.monthlyTrend && activeAnalytics.monthlyTrend.length > 0 ? (
                  activeAnalytics.monthlyTrend.map((m: any, i: number) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 text-center flex flex-col justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{m.month}</span>
                      <div className="my-2">
                        <span className="text-base font-black text-slate-900">₹{(m.total || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 border-t border-slate-200 pt-1.5 space-y-0.5">
                        <div className="flex justify-between">
                          <span>Clinic:</span>
                          <span className="font-semibold text-teal-700">₹{(m.clinic || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Store:</span>
                          <span className="font-semibold text-indigo-700">₹{(m.store || 0).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 italic py-6 col-span-full text-center">No monthly trend data recorded yet.</p>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: INVOICES LEDGER                                                    */}
        {/* ========================================================================= */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            
            {/* Control Bar: Filters & Search */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
              
              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search bill #, wholesaler, city, ERP doc #..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Destination Filter */}
                <select
                  value={destinationFilter}
                  onChange={e => setDestinationFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 text-xs font-semibold py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="All">All Destinations</option>
                  <option value="Clinic">Clinic Only</option>
                  <option value="Store">Store Only</option>
                  <option value="Split">Split Orders</option>
                </select>

                {/* Payment Filter */}
                <select
                  value={paymentFilter}
                  onChange={e => setPaymentFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 text-xs font-semibold py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="All">All Payments</option>
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid / Dues</option>
                </select>

                {/* Wholesaler Filter */}
                <select
                  value={wholesalerFilter}
                  onChange={e => setWholesalerFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-semibold py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 max-w-[150px] truncate"
                >
                  <option value="All">All Wholesalers</option>
                  {wholesalers.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.city})</option>
                  ))}
                </select>

                {/* Date Interval Filter */}
                <select
                  value={dateInterval}
                  onChange={e => setDateInterval(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 text-xs font-semibold py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="last_30_days">Last 30 Days</option>
                  <option value="last_90_days">Last 90 Days</option>
                  <option value="fy">Financial Year</option>
                  <option value="custom">Custom Date Range...</option>
                </select>

                {dateInterval === 'custom' && (
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">From:</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={e => setCustomStartDate(e.target.value)}
                      className="bg-white border border-slate-200 text-xs py-1 px-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">To:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={e => setCustomEndDate(e.target.value)}
                      className="bg-white border border-slate-200 text-xs py-1 px-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                )}

                <button
                  onClick={() => setActiveTab('new-entry')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Bill
                </button>
              </div>

            </div>

            {/* Filter Summary & Count Badge */}
            <div className="flex flex-wrap items-center justify-between text-xs px-1 text-slate-500 gap-2">
              <div className="flex items-center gap-2">
                <span>Showing <strong>{filteredInvoices.length}</strong> of <strong>{invoices.length}</strong> invoices</span>
                {intervalLabel !== 'All-Time' && (
                  <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-medium text-[11px] flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {intervalLabel}
                  </span>
                )}
              </div>
              {(searchQuery || destinationFilter !== 'All' || paymentFilter !== 'All' || wholesalerFilter !== 'All' || dateInterval !== 'all' || customStartDate || customEndDate) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setDestinationFilter('All');
                    setPaymentFilter('All');
                    setWholesalerFilter('All');
                    setDateInterval('all');
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                  className="text-teal-600 hover:text-teal-800 font-semibold text-xs flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear All Filters
                </button>
              )}
            </div>

            {/* Role Notice for Staff */}
            {!isAdminOrDoctor && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs text-amber-800">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Staff View: Showing purchase bills received within the last <strong>{staffWindowDays} days (1 month)</strong>.
                  </span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                  Staff Access
                </span>
              </div>
            )}

            {/* Invoices Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 font-semibold uppercase text-[11px] tracking-wider">
                      <th className="py-3 px-4">Bill Info</th>
                      <th className="py-3 px-4">Wholesaler</th>
                      <th className="py-3 px-4">Destination</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4 text-center">Payment Status (1-Click)</th>
                      <th className="py-3 px-4">ERP Stock Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.length > 0 ? (
                      filteredInvoices.map(inv => {
                        const isSplit = inv.destinationType === 'Split';
                        const isStore = inv.destinationType === 'Store';
                        const isPaid = inv.paymentStatus === 'Paid';
                        const isErpCompleted = inv.erpStatus === 'Completed';

                        return (
                          <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                            
                            {/* Bill Info */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 text-sm">{inv.invoiceNumber}</div>
                              <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {inv.invoiceDate}
                              </div>
                            </td>

                            {/* Wholesaler */}
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-800">{inv.wholesalerName}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-teal-600" />
                                {inv.wholesalerCity}
                              </div>
                            </td>

                            {/* Destination */}
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                isSplit 
                                  ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                                  : isStore 
                                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                                    : 'bg-teal-100 text-teal-700 border border-teal-200'
                              }`}>
                                {isSplit && <Split className="w-3 h-3" />}
                                {isStore && <Store className="w-3 h-3" />}
                                {!isSplit && !isStore && <Building2 className="w-3 h-3" />}
                                {inv.destinationType}
                              </span>
                            </td>

                            {/* Amount breakdown */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 text-sm">
                                ₹{inv.totalAmount.toLocaleString('en-IN')}
                              </div>
                              {isSplit && (
                                <div className="text-[10px] text-slate-500 mt-0.5 space-x-1.5">
                                  <span>Clinic: ₹{inv.clinicAmount.toLocaleString('en-IN')}</span>
                                  <span>•</span>
                                  <span className="text-indigo-600 font-semibold">Store: ₹{inv.storeAmount.toLocaleString('en-IN')}</span>
                                </div>
                              )}
                            </td>

                            {/* 1-Click Paid/Unpaid Toggle */}
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleTogglePayment(inv)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-sm ${
                                  isPaid
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300'
                                }`}
                                title="Click to toggle Paid / Unpaid status"
                              >
                                {isPaid ? (
                                  <>
                                    <Check className="w-3 h-3 stroke-[3]" />
                                    <span>PAID</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3" />
                                    <span>UNPAID</span>
                                  </>
                                )}
                              </button>
                              {isPaid && inv.paidDate && (
                                <div className="text-[10px] text-slate-400 mt-1">{inv.paidDate}</div>
                              )}
                            </td>

                            {/* ERP Stock Status & Document Number */}
                            <td className="py-3.5 px-4">
                              {isErpCompleted ? (
                                <div>
                                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Entered in ERP
                                  </span>
                                  {inv.erpDocumentNumber && (
                                    <div className="text-xs font-mono font-semibold text-slate-700 mt-1">
                                      Doc: <span className="bg-slate-100 px-1 py-0.5 rounded">{inv.erpDocumentNumber}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setErpModalInvoiceId(inv.id);
                                    setErpDocInput('');
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-medium transition-colors"
                                >
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Mark Stock Entered</span>
                                </button>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                
                                {/* Store Transfer Slip (if mixed/split order) */}
                                {(isSplit || isStore) && (
                                  <button
                                    onClick={() => handleOpenTransferSlip(inv)}
                                    className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                                    title="View & Print Store Transfer Slip"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                )}

                                {/* View Attached Bill Photo/PDF */}
                                {inv.originalBillUrl && (
                                  <button
                                    onClick={() => setSelectedBillUrl(inv.originalBillUrl || null)}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                    title="View Original Wholesaler Bill"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Delete (Admin/Doctor only) */}
                                {isAdminOrDoctor && (
                                  <button
                                    onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNumber)}
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                                    title="Delete invoice (Admin only)"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}

                              </div>
                            </td>

                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                          No purchase invoices match your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: NEW PURCHASE ENTRY FORM                                           */}
        {/* ========================================================================= */}
        {activeTab === 'new-entry' && (
          <div className="max-w-4xl mx-auto bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">New Purchase Invoice Entry</h2>
                <p className="text-xs text-slate-500">Record incoming medicine bills and split stocks between Clinic & Store</p>
              </div>
              <button
                type="button"
                onClick={() => setShowWholesalerModal(true)}
                className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Wholesaler
              </button>
            </div>

            {invoiceSuccessMsg && (
              <div className="p-3 mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{invoiceSuccessMsg}</span>
              </div>
            )}

            {invoiceErrorMsg && (
              <div className="p-3 mb-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{invoiceErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitInvoice} className="space-y-6">
              
              {/* Wholesaler & Bill Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Wholesaler *
                  </label>
                  <select
                    value={newInvoice.wholesalerId}
                    onChange={e => setNewInvoice(prev => ({ ...prev, wholesalerId: e.target.value }))}
                    required
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="">Select Wholesaler</option>
                    {wholesalers.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.city})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Invoice Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-2026-904"
                    value={newInvoice.invoiceNumber}
                    onChange={e => setNewInvoice(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Bill Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newInvoice.invoiceDate}
                    onChange={e => setNewInvoice(prev => ({ ...prev, invoiceDate: e.target.value }))}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

              </div>

              {/* Order Destination Selector (Clinic / Store / Split) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Order Destination & Allocation
                </label>
                <div className="grid grid-cols-3 gap-3">
                  
                  <button
                    type="button"
                    onClick={() => setNewInvoice(prev => ({ ...prev, destinationType: 'Clinic', clinicAmount: prev.totalAmount, storeAmount: 0 }))}
                    className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                      newInvoice.destinationType === 'Clinic'
                        ? 'bg-teal-50 border-teal-500 text-teal-800 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Building2 className="w-5 h-5 text-teal-600" />
                    <span>Clinic Only</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewInvoice(prev => ({ ...prev, destinationType: 'Store', clinicAmount: 0, storeAmount: prev.totalAmount }))}
                    className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                      newInvoice.destinationType === 'Store'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-800 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Store className="w-5 h-5 text-indigo-600" />
                    <span>Store Only</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewInvoice(prev => ({ ...prev, destinationType: 'Split' }))}
                    className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                      newInvoice.destinationType === 'Split'
                        ? 'bg-purple-50 border-purple-500 text-purple-800 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Split className="w-5 h-5 text-purple-600" />
                    <span>Split (Clinic + Store)</span>
                  </button>

                </div>
              </div>

              {/* Amount Breakdown if Split */}
              {newInvoice.destinationType === 'Split' && (
                <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-purple-900 mb-1">
                      🏥 Clinic Share (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="Amount for Clinic"
                      value={newInvoice.clinicAmount || ''}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setNewInvoice(prev => ({
                          ...prev,
                          clinicAmount: val,
                          totalAmount: val + prev.storeAmount
                        }));
                      }}
                      className="w-full py-2 px-3 bg-white border border-purple-300 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-purple-900 mb-1">
                      🏪 Store Share (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="Amount for Store"
                      value={newInvoice.storeAmount || ''}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setNewInvoice(prev => ({
                          ...prev,
                          storeAmount: val,
                          totalAmount: prev.clinicAmount + val
                        }));
                      }}
                      className="w-full py-2 px-3 bg-white border border-purple-300 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Gross Total & Payment Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Total Bill Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="Total Invoice Amount"
                    value={newInvoice.totalAmount || ''}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setNewInvoice(prev => ({
                        ...prev,
                        totalAmount: val,
                        clinicAmount: prev.destinationType === 'Clinic' ? val : prev.clinicAmount,
                        storeAmount: prev.destinationType === 'Store' ? val : prev.storeAmount
                      }));
                    }}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={newInvoice.paymentStatus}
                    onChange={e => setNewInvoice(prev => ({ ...prev, paymentStatus: e.target.value as any }))}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Unpaid">Unpaid / Credit</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={newInvoice.dueDate}
                    onChange={e => setNewInvoice(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

              </div>

              {/* Line Items Table (Optional details) */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Medicine Line Items (Optional)</h4>
                    <p className="text-xs text-slate-500">Add medicines to generate detailed Store Transfer Slips</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Medicine
                  </button>
                </div>

                {newInvoice.items.length > 0 && (
                  <div className="space-y-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    {newInvoice.items.map((item, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-6 gap-2 text-xs items-center">
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            placeholder="Medicine Name (e.g. Arnica 200)"
                            value={item.medicineName}
                            onChange={e => handleUpdateItem(idx, 'medicineName', e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium"
                          />
                        </div>

                        <div>
                          <input
                            type="text"
                            placeholder="Batch #"
                            value={item.batchNumber}
                            onChange={e => handleUpdateItem(idx, 'batchNumber', e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                          />
                        </div>

                        <div>
                          <input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={e => handleUpdateItem(idx, 'quantity', e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold"
                          />
                        </div>

                        <div>
                          <select
                            value={item.allocatedTo}
                            onChange={e => handleUpdateItem(idx, 'allocatedTo', e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold"
                          >
                            <option value="Clinic">Clinic</option>
                            <option value="Store">Store</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between gap-1">
                          <input
                            type="number"
                            placeholder="₹ Price"
                            value={item.totalAmount || ''}
                            onChange={e => handleUpdateItem(idx, 'totalAmount', e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* File Uploads (Original Bill & Handwritten Slip) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                
                {/* Upload Original Bill */}
                <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-center">
                  <Upload className="w-6 h-6 text-slate-400 mb-2" />
                  <span className="text-xs font-bold text-slate-700">Attach Original Wholesaler Bill</span>
                  <p className="text-[11px] text-slate-400 mb-2">Photo or PDF (Max 25MB)</p>
                  
                  {newInvoice.originalBillUrl ? (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Bill Attached
                    </span>
                  ) : (
                    <label className="cursor-pointer text-xs font-semibold px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors">
                      {uploadingBill ? 'Uploading...' : 'Choose File'}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'bill')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Upload Handwritten Slip */}
                <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-center">
                  <FileText className="w-6 h-6 text-slate-400 mb-2" />
                  <span className="text-xs font-bold text-slate-700">Attach Handwritten Slip (If Any)</span>
                  <p className="text-[11px] text-slate-400 mb-2">Store segregation note or handwritten slip</p>
                  
                  {newInvoice.handwrittenSlipUrl ? (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Slip Attached
                    </span>
                  ) : (
                    <label className="cursor-pointer text-xs font-semibold px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors">
                      {uploadingSlip ? 'Uploading...' : 'Choose File'}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'slip')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('invoices')}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingInvoice}
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2"
                >
                  {savingInvoice ? 'Saving...' : 'Save Purchase Invoice'}
                </button>
              </div>

            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: WHOLESALER DIRECTORY                                              */}
        {/* ========================================================================= */}
        {activeTab === 'wholesalers' && (
          <div className="space-y-4">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Wholesaler Directory</h2>
                <p className="text-xs text-slate-500">Manage medicine suppliers across cities</p>
              </div>
              <button
                onClick={() => setShowWholesalerModal(true)}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Wholesaler
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wholesalers.map(w => (
                <div key={w.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                        {w.city}
                      </span>
                      {w.gstNumber && (
                        <span className="text-[10px] font-mono text-slate-400">GST: {w.gstNumber}</span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">{w.name}</h3>
                    {w.contactPerson && (
                      <p className="text-xs text-slate-600 mt-1">Contact: {w.contactPerson}</p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-500">
                    {w.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{w.phone}</span>
                      </div>
                    )}
                    {w.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{w.email}</span>
                      </div>
                    )}
                    {w.paymentTerms && (
                      <div className="text-[11px] text-slate-400 font-medium mt-1">
                        Terms: {w.paymentTerms}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: ERP DOCUMENT NUMBER PROMPT                                      */}
      {/* ========================================================================= */}
      {erpModalInvoiceId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Confirm ERP Stock Entry</h3>
                <p className="text-xs text-slate-500">Enter the voucher / document # generated by your ERP</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                ERP Document Number / Voucher Number *
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. GRN-10492 or DOC-9821"
                value={erpDocInput}
                onChange={e => setErpDocInput(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400">
                This document number will be permanently saved with the purchase invoice for cross-referencing.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setErpModalInvoiceId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveErpDoc}
                disabled={erpSaving}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm flex items-center gap-1.5"
              >
                {erpSaving ? 'Saving...' : 'Confirm Stock Entered'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PRINTABLE STORE TRANSFER SLIP                                    */}
      {/* ========================================================================= */}
      {selectedInvoiceForSlip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 print:hidden">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Store Transfer & Handover Slip</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs flex items-center gap-1 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Slip
                </button>
                <button
                  onClick={() => setSelectedInvoiceForSlip(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Slip Content */}
            <div className="p-6 border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/30 font-mono text-xs">
              <div className="text-center border-b border-indigo-200 pb-3 mb-3">
                <h4 className="text-sm font-extrabold text-slate-900 uppercase">KRISHNA HOMOEOPATHIC CLINIC & STORE</h4>
                <p className="text-[11px] text-slate-500">Store Stock Transfer & Segregation Note</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div>
                  <span className="text-slate-500">Original Invoice #:</span>
                  <strong className="text-slate-900 ml-1">{selectedInvoiceForSlip.invoiceNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Invoice Date:</span>
                  <span className="text-slate-900 ml-1">{selectedInvoiceForSlip.invoiceDate}</span>
                </div>
                <div>
                  <span className="text-slate-500">Wholesaler:</span>
                  <strong className="text-slate-900 ml-1">{selectedInvoiceForSlip.wholesalerName}</strong>
                </div>
                <div>
                  <span className="text-slate-500">City:</span>
                  <span className="text-slate-900 ml-1">{selectedInvoiceForSlip.wholesalerCity}</span>
                </div>
              </div>

              <div className="mb-4">
                <h5 className="font-bold text-slate-800 uppercase mb-2">Medicines Segregated for Store:</h5>
                <table className="w-full text-left border-collapse border border-indigo-200 text-xs">
                  <thead>
                    <tr className="bg-indigo-100 text-indigo-900 font-bold">
                      <th className="p-1.5 border border-indigo-200">#</th>
                      <th className="p-1.5 border border-indigo-200">Medicine Name</th>
                      <th className="p-1.5 border border-indigo-200">Batch</th>
                      <th className="p-1.5 border border-indigo-200">Qty</th>
                      <th className="p-1.5 border border-indigo-200 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoiceItems.filter(it => it.allocatedTo === 'Store').length > 0 ? (
                      selectedInvoiceItems.filter(it => it.allocatedTo === 'Store').map((it, idx) => (
                        <tr key={it.id}>
                          <td className="p-1.5 border border-indigo-200">{idx + 1}</td>
                          <td className="p-1.5 border border-indigo-200 font-bold">{it.medicineName}</td>
                          <td className="p-1.5 border border-indigo-200">{it.batchNumber || '-'}</td>
                          <td className="p-1.5 border border-indigo-200">{it.quantity} {it.unit}</td>
                          <td className="p-1.5 border border-indigo-200 text-right">₹{it.totalAmount}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-2 text-center text-slate-500 italic">
                          Order marked as Store allocation (₹{selectedInvoiceForSlip.storeAmount.toLocaleString('en-IN')})
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-indigo-200 pt-3 flex justify-between items-center text-sm font-bold">
                <span>Total Store Medicine Value:</span>
                <span className="text-indigo-900">₹{selectedInvoiceForSlip.storeAmount.toLocaleString('en-IN')}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8 pt-4 border-t border-indigo-200 text-center text-[10px] text-slate-500">
                <div>
                  <div className="border-b border-slate-400 w-32 mx-auto mb-1"></div>
                  <span>Segregated By (Clinic Staff)</span>
                </div>
                <div>
                  <div className="border-b border-slate-400 w-32 mx-auto mb-1"></div>
                  <span>Received By (Store Staff)</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: VIEW BILL PHOTO / PDF                                            */}
      {/* ========================================================================= */}
      {selectedBillUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-4 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <span className="font-bold text-sm text-slate-800">Attached Wholesaler Bill</span>
              <button
                onClick={() => setSelectedBillUrl(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-slate-100 rounded-xl">
              {selectedBillUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe src={selectedBillUrl} className="w-full h-[600px] rounded-lg" title="PDF Bill" />
              ) : (
                <img src={selectedBillUrl} alt="Bill Preview" className="max-w-full max-h-[600px] object-contain rounded-lg" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ADD WHOLESALER                                                   */}
      {/* ========================================================================= */}
      {showWholesalerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Add New Wholesaler</h3>
              <button
                onClick={() => setShowWholesalerModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWholesaler} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Wholesaler / Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shree Homoeo Agencies"
                  value={wsForm.name}
                  onChange={e => setWsForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kolkata"
                    value={wsForm.city}
                    onChange={e => setWsForm(p => ({ ...p, city: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    placeholder="e.g. West Bengal"
                    value={wsForm.state}
                    onChange={e => setWsForm(p => ({ ...p, state: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="Mobile / Phone"
                    value={wsForm.phone}
                    onChange={e => setWsForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">GST Number</label>
                  <input
                    type="text"
                    placeholder="GSTIN"
                    value={wsForm.gstNumber}
                    onChange={e => setWsForm(p => ({ ...p, gstNumber: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium uppercase focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Terms</label>
                <input
                  type="text"
                  placeholder="e.g. 15 Days Credit, Cash on Delivery"
                  value={wsForm.paymentTerms}
                  onChange={e => setWsForm(p => ({ ...p, paymentTerms: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowWholesalerModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={wsSaving}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-sm"
                >
                  {wsSaving ? 'Saving...' : 'Save Wholesaler'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

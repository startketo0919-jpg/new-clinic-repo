import React, { useState } from 'react';
import { useClinic } from '../context/ClinicContext';
import { PatientShipment } from '../types';
import { 
  Package, CheckCircle2, Clock, Phone, Mail, MapPin, Copy, Check, 
  Search, ExternalLink, MessageSquare, Trash2, ArrowRight, Truck, 
  Share2, AlertCircle, RefreshCw 
} from 'lucide-react';

interface ShipmentManagementProps {
  onAutofillDelhivery?: (data: {
    consigneeName: string;
    consigneePhone: string;
    consigneeAddress: string;
    consigneePincode: string;
  }) => void;
}

export default function ShipmentManagement({ onAutofillDelhivery }: ShipmentManagementProps) {
  const { state, markShipmentStatus, deleteShipment } = useClinic();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Completed'>('All');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAddressId, setCopiedAddressId] = useState<string | null>(null);

  const shipments = state.shipments || [];

  const patientFormUrl = `${window.location.origin}/shipment`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(patientFormUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`Hello! Please provide your delivery address for your medicine shipment from Krishna Homoeopathic Clinic by clicking this link: ${patientFormUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleCopyAddress = (s: PatientShipment) => {
    const fullText = `${s.patientName}\nPhone: ${s.phone}\n${s.address}\nPIN: ${s.pincode}`;
    navigator.clipboard.writeText(fullText);
    setCopiedAddressId(s.id);
    setTimeout(() => setCopiedAddressId(null), 2000);
  };

  // Filtered shipments
  const filtered = shipments.filter(s => {
    const matchStatus = filterStatus === 'All' || s.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || 
      s.patientName.toLowerCase().includes(q) || 
      s.phone.includes(q) || 
      s.address.toLowerCase().includes(q) || 
      s.pincode.includes(q);
    return matchStatus && matchSearch;
  });

  const pendingCount = shipments.filter(s => s.status === 'Pending').length;
  const completedCount = shipments.filter(s => s.status === 'Completed').length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Share */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-900 rounded-2xl p-6 text-white shadow-sm border border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-6 h-6 text-teal-400" />
            <h2 className="text-xl font-bold">Patient Courier Shipments</h2>
          </div>
          <p className="text-slate-300 text-xs sm:text-sm">
            Direct form submissions from patients for medicine dispatch and home delivery.
          </p>
        </div>

        {/* Share buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow transition-colors"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
            <span>{copiedLink ? "Form Link Copied!" : "Copy Patient Link"}</span>
          </button>
          
          <button
            onClick={handleShareWhatsApp}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Share on WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Requests</span>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{shipments.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-amber-600 font-medium">Pending Shipments</span>
            <p className="text-2xl font-bold text-amber-700 mt-0.5">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-600 font-medium">Completed / Dispatched</span>
            <p className="text-2xl font-bold text-emerald-700 mt-0.5">{completedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Controls: Search & Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Status Filters */}
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1 w-full sm:w-auto">
          {(['All', 'Pending', 'Completed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterStatus(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterStatus === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab} {tab === 'Pending' ? `(${pendingCount})` : tab === 'Completed' ? `(${completedCount})` : `(${shipments.length})`}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search patient, phone, pin..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Shipments List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Shipments Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery 
              ? "No patient submissions match your search query." 
              : "No shipment submissions recorded yet. Share the patient link via WhatsApp to receive addresses!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((s) => {
            const isCompleted = s.status === 'Completed';
            const dateFormatted = new Date(s.createdAt).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div 
                key={s.id}
                className={`bg-white rounded-2xl p-5 border shadow-sm transition-all ${
                  isCompleted 
                    ? 'border-slate-200 bg-slate-50/50 opacity-90' 
                    : 'border-amber-200/80 bg-white ring-1 ring-amber-500/10'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  
                  {/* Left: Patient Info & Details */}
                  <div className="space-y-3 flex-1">
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-base font-bold text-slate-900">{s.patientName}</h3>
                      
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isCompleted 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        {s.status}
                      </span>

                      <span className="text-xs text-slate-400">
                        Received: {dateFormatted}
                      </span>
                    </div>

                    {/* Contact details */}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-slate-800 font-mono font-medium">
                        <Phone className="w-3.5 h-3.5 text-teal-600" />
                        <span>+91 {s.phone}</span>
                      </div>

                      <a
                        href={`https://api.whatsapp.com/send?phone=91${s.phone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>

                      {s.email && (
                        <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{s.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Address Block */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-medium text-slate-800">{s.address}</span>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-mono">
                                PIN: {s.pincode}
                              </span>
                              {s.notes && (
                                <span className="text-slate-500 italic">
                                  Note: {s.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleCopyAddress(s)}
                          className="flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded-md shadow-xs hover:bg-slate-100 transition-colors whitespace-nowrap"
                        >
                          {copiedAddressId === s.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-400" />
                              <span>Copy Address</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Right: Actions */}
                  <div className="flex lg:flex-col items-center lg:items-end justify-end gap-2.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    
                    {/* Autofill Delhivery Courier Button */}
                    {onAutofillDelhivery && (
                      <button
                        onClick={() => onAutofillDelhivery({
                          consigneeName: s.patientName,
                          consigneePhone: s.phone,
                          consigneeAddress: s.address,
                          consigneePincode: s.pincode,
                        })}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
                        title="Autofill this patient in Delhivery New Order"
                      >
                        <Truck className="w-3.5 h-3.5 text-teal-400" />
                        <span>Send via Delhivery</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    )}

                    {/* Mark Complete / Incomplete Button */}
                    <button
                      onClick={() => markShipmentStatus(s.id, isCompleted ? 'Pending' : 'Completed')}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs whitespace-nowrap ${
                        isCompleted
                          ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isCompleted ? "Mark as Pending" : "Mark as Complete"}</span>
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete shipment record for ${s.patientName}?`)) {
                          deleteShipment(s.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

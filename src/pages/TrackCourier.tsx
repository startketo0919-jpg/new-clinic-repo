import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Search, 
  Package, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Copy, 
  Check, 
  ExternalLink, 
  Phone, 
  RefreshCw, 
  RotateCcw,
  Sparkles,
  Stethoscope,
  ShieldCheck,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ScanEvent {
  ScanDetail?: {
    Scan?: string;
    ScanDateTime?: string;
    ScannedLocation?: string;
    Instructions?: string;
    StatusCode?: string;
  };
  scan?: string;
  scanDateTime?: string;
  location?: string;
  instructions?: string;
}

interface ShipmentData {
  AWB?: string;
  ReferenceNo?: string;
  Status?: {
    Status?: string;
    StatusDateTime?: string;
    StatusLocation?: string;
    Instructions?: string;
    StatusCode?: string;
  };
  Origin?: string;
  Destination?: string;
  PickupLocation?: string;
  Consignee?: {
    Name?: string;
    City?: string;
    PinCode?: string;
    State?: string;
  };
  ExpectedDeliveryDate?: string;
  OrderType?: string;
  InvoiceAmount?: number;
  Scans?: ScanEvent[];
}

interface LocalOrder {
  orderId?: string;
  awb?: string;
  consigneeName?: string;
  pincode?: string;
  address?: string;
  items?: string;
  status?: string;
  timestamp?: string;
}

interface PackageItem {
  id: string;
  orderId: string;
  awb: string | null;
  consigneeName: string;
  pincode: string;
  address?: string;
  items: string;
  status: string;
  timestamp: string;
}

export default function TrackCourier() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'awb' | 'phone'>('awb');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Results
  const [resultType, setResultType] = useState<'awb' | 'phone' | null>(null);
  const [phonePackages, setPhonePackages] = useState<PackageItem[]>([]);
  const [selectedAwb, setSelectedAwb] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<LocalOrder | null>(null);
  const [liveShipment, setLiveShipment] = useState<ShipmentData | null>(null);
  const [copiedAwb, setCopiedAwb] = useState(false);

  // Check URL query params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramVal = params.get('awb') || params.get('waybill') || params.get('order') || params.get('orderId') || params.get('phone') || params.get('q');
    if (paramVal && paramVal.trim()) {
      setSearchQuery(paramVal.trim());
      const cleanDigits = paramVal.replace(/\D/g, '');
      if (cleanDigits.length === 10 && /^[6-9]\d{9}$/.test(cleanDigits)) {
        setSearchMode('phone');
      } else {
        setSearchMode('awb');
      }
      performTrack(paramVal.trim());
    }
  }, []);

  const performTrack = async (queryToSearch: string) => {
    const query = queryToSearch.trim();
    if (!query) {
      setErrorMsg("Please enter an AWB number, Order ID, or 10-digit Mobile Number.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setResultType(null);
    setPhonePackages([]);
    setLocalOrder(null);
    setLiveShipment(null);

    // Update URL query without refreshing
    const newUrl = new URL(window.location.href);
    if (/^[6-9]\d{9}$/.test(query.replace(/\D/g, ''))) {
      newUrl.searchParams.set('phone', query);
      newUrl.searchParams.delete('awb');
    } else {
      newUrl.searchParams.set('awb', query);
      newUrl.searchParams.delete('phone');
    }
    window.history.replaceState({}, '', newUrl.toString());

    try {
      const res = await fetch(`/api/courier/track?q=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || "No courier order found for this query.");
      }

      setResultType(data.type);

      if (data.type === 'phone') {
        setPhonePackages(data.packages || []);
        if (data.selectedAwb) {
          setSelectedAwb(data.selectedAwb);
        } else if (data.packages?.[0]?.awb) {
          setSelectedAwb(data.packages[0].awb);
        }
        if (data.order) {
          setLocalOrder(data.order);
        }
        if (data.liveTracking) {
          setLiveShipment(data.liveTracking);
        }
      } else {
        setSelectedAwb(data.awb);
        setLocalOrder(data.order || null);
        setLiveShipment(data.liveTracking || null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to retrieve tracking. Please check the details or try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performTrack(searchQuery);
  };

  // Select package from phone packages list without clearing list
  const selectPackage = async (pkg: PackageItem) => {
    setSelectedAwb(pkg.awb);
    setLocalOrder({
      orderId: pkg.orderId,
      awb: pkg.awb || undefined,
      consigneeName: pkg.consigneeName,
      pincode: pkg.pincode,
      address: pkg.address,
      status: pkg.status,
      timestamp: pkg.timestamp
    });
    setLiveShipment(null);

    if (pkg.awb) {
      setLoading(true);
      try {
        const res = await fetch(`/api/courier/track?awb=${encodeURIComponent(pkg.awb)}`);
        const data = await res.json();
        if (data.success) {
          if (data.liveTracking) setLiveShipment(data.liveTracking);
          if (data.order) setLocalOrder(data.order);
        }
      } catch (err) {
        console.warn('Failed to fetch package live tracking:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCopyAwb = (awbNumber: string) => {
    navigator.clipboard.writeText(awbNumber);
    setCopiedAwb(true);
    setTimeout(() => setCopiedAwb(false), 2000);
  };

  // Determine stage (1 to 5) for visual stepper
  const currentStatusString = (
    liveShipment?.Status?.Status ||
    liveShipment?.Status?.Instructions ||
    localOrder?.status ||
    'Manifested'
  ).toLowerCase();

  let activeStep = 1;
  let isCancelled = false;

  if (currentStatusString.includes('cancel')) {
    isCancelled = true;
    activeStep = 1;
  } else if (currentStatusString.includes('deliver') && !currentStatusString.includes('out for')) {
    activeStep = 5;
  } else if (currentStatusString.includes('out for delivery') || currentStatusString.includes('dispatched')) {
    activeStep = 4;
  } else if (currentStatusString.includes('in transit') || currentStatusString.includes('reached') || currentStatusString.includes('transit')) {
    activeStep = 3;
  } else if (currentStatusString.includes('picked up') || currentStatusString.includes('pickup') || currentStatusString.includes('inscan')) {
    activeStep = 2;
  } else {
    activeStep = 1; // Manifested / Booked
  }

  // Format scans timeline
  const scansList = liveShipment?.Scans || [];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* Sticky Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="/track-courier" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm group-hover:bg-teal-700 transition-colors">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg text-slate-900 leading-tight">
                Krishna Homoeopathic Clinic
              </h1>
              <p className="text-xs text-teal-700 font-medium">Dr. Sunil Kumar (BHMS) • Medicine Delivery</p>
            </div>
          </a>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <a 
              href="/book-appointment" 
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 text-xs font-semibold transition-colors"
            >
              Book Consultation
            </a>
            
            {/* Call Reception: 05676350536 */}
            <a 
              href="tel:05676350536" 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold transition-colors shadow-2xs"
              title="Call Clinic Reception"
            >
              <Phone className="w-3.5 h-3.5 text-teal-600" />
              <span>Call (05676350536)</span>
            </a>

            {/* WhatsApp Helpline: +91 6396535078 */}
            <a 
              href="https://wa.me/916396535078?text=Hello%20Doctor%2C%20I%20have%20an%20inquiry%20regarding%20my%20medicine%20courier." 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-2xs"
              title="WhatsApp Helpline"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        
        {/* Hero Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-2xl relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-medium mb-3 border border-teal-500/30">
              <Truck className="w-3.5 h-3.5" />
              <span>Real-Time Courier Tracking</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Track Your Medicine Order
            </h2>
            <p className="text-slate-300 text-sm mt-2 leading-relaxed">
              Track the dispatch, transit, and expected doorstep delivery of your homoeopathic medicines sent via Delhivery Express.
            </p>

            {/* Mode Switcher */}
            <div className="flex bg-slate-800/80 p-1 rounded-xl w-fit mt-6 border border-slate-700">
              <button
                type="button"
                onClick={() => setSearchMode('awb')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  searchMode === 'awb' 
                    ? 'bg-teal-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Track by AWB / Order ID
              </button>
              <button
                type="button"
                onClick={() => setSearchMode('phone')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  searchMode === 'phone' 
                    ? 'bg-teal-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Track by Mobile Number
              </button>
            </div>

            {/* Search Input Form */}
            <form onSubmit={handleSearchSubmit} className="mt-4 flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={searchMode === 'phone' ? 'tel' : 'text'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    searchMode === 'phone'
                      ? 'Enter 10-digit registered mobile number'
                      : 'Enter Delhivery AWB number (e.g. 141234567890) or Order ID'
                  }
                  className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white/15 transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-teal-500 hover:bg-teal-400 active:scale-[0.98] text-slate-950 font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 shrink-0 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Tracking...</span>
                  </>
                ) : (
                  <>
                    <span>Track Order</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-[11px] text-slate-400 mt-2">
              Tip: You can also track using the link sent to your registered WhatsApp/SMS.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3 text-rose-900 animate-fade-in shadow-2xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <h4 className="font-bold">Shipment Not Found or Error</h4>
              <p className="text-rose-700 mt-0.5 leading-relaxed">{errorMsg}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setErrorMsg(null);
                  }}
                  className="px-3 py-1 bg-white border border-rose-200 rounded-lg font-medium text-rose-700 hover:bg-rose-100"
                >
                  Clear and Try Again
                </button>
                <a
                  href="tel:05676350536"
                  className="px-3 py-1 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900"
                >
                  Call Reception (05676350536)
                </a>
                <a
                  href="https://wa.me/916396535078?text=Hello%20Doctor%2C%20I%20am%20trying%20to%20track%20my%20medicine%20delivery%20and%20need%20assistance."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
                >
                  WhatsApp Support
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Multiple Packages by Phone Number */}
        {resultType === 'phone' && phonePackages.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-teal-600" />
                  Packages for Mobile (+91 {searchQuery.replace(/\D/g, '').slice(-10)})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Found {phonePackages.length} medicine shipment(s). Select an order to view its live tracking timeline.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {phonePackages.map((pkg, idx) => {
                const isSelected = (selectedAwb && pkg.awb && selectedAwb === pkg.awb) || 
                                  (!selectedAwb && localOrder?.orderId === pkg.orderId);

                return (
                  <div
                    key={pkg.id || idx}
                    className={`border rounded-xl p-4 transition-all hover:shadow-md cursor-pointer ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50/40 ring-2 ring-teal-500/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                    onClick={() => selectPackage(pkg)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">{pkg.consigneeName}</span>
                        {pkg.pincode && (
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            PIN: {pkg.pincode}
                          </span>
                        )}
                      </div>
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 shrink-0">
                        {pkg.status}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        {pkg.awb ? (
                          <div className="font-mono text-teal-700 font-semibold text-[11px]">
                            AWB: {pkg.awb}
                          </div>
                        ) : (
                          <div className="text-amber-600 font-medium text-[11px]">
                            Processing for Dispatch
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400">
                          {pkg.timestamp ? new Date(pkg.timestamp).toLocaleDateString() : ''}
                        </div>
                      </div>

                      {pkg.awb ? (
                        <span className="inline-flex items-center gap-1 text-teal-600 font-semibold text-xs hover:underline">
                          Track <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Awaiting AWB</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Tracking Details Card (Shown when AWB or Live Data Available) */}
        {(liveShipment || localOrder || selectedAwb) && (
          <div className="space-y-6">
            
            {/* Status Header Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Current Delivery Status
                  </span>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex px-3.5 py-1.5 rounded-full text-sm font-extrabold ${
                      isCancelled 
                        ? 'bg-rose-100 text-rose-800' 
                        : activeStep === 5 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : activeStep === 4 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-teal-100 text-teal-800'
                    }`}>
                      {liveShipment?.Status?.Status || localOrder?.status || 'Manifested'}
                    </span>
                    {liveShipment?.Status?.StatusDateTime && (
                      <span className="text-xs text-slate-500">
                        Updated {new Date(liveShipment.Status.StatusDateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>

                  {liveShipment?.Status?.Instructions && (
                    <p className="text-sm font-medium text-slate-700 mt-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 inline-block">
                      {liveShipment.Status.Instructions}
                      {liveShipment.Status.StatusLocation ? ` • ${liveShipment.Status.StatusLocation}` : ''}
                    </p>
                  )}
                </div>

                {liveShipment?.ExpectedDeliveryDate && (
                  <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-right">
                    <span className="text-[11px] font-semibold uppercase text-teal-700 tracking-wider block">
                      Expected Delivery
                    </span>
                    <span className="text-lg font-bold text-teal-950 font-mono">
                      {new Date(liveShipment.ExpectedDeliveryDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>

              {/* 5-Step Visual Stepper */}
              <div className="py-8">
                <div className="relative">
                  {/* Background Track Line */}
                  <div className="absolute top-1/2 left-4 right-4 h-1.5 bg-slate-100 -translate-y-1/2 rounded-full z-0" />
                  {/* Active Track Progress Line */}
                  <div 
                    className={`absolute top-1/2 left-4 h-1.5 -translate-y-1/2 rounded-full z-0 transition-all duration-700 ${
                      isCancelled ? 'bg-rose-500' : 'bg-teal-600'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, ((activeStep - 1) / 4) * 100))}%` }}
                  />

                  {/* 5 Checkpoints */}
                  <div className="flex justify-between relative z-10">
                    {[
                      { step: 1, label: 'Manifested', desc: 'Prescription packed' },
                      { step: 2, label: 'Picked Up', desc: 'Collected by courier' },
                      { step: 3, label: 'In Transit', desc: 'Hub to hub movement' },
                      { step: 4, label: 'Out for Delivery', desc: 'With local delivery agent' },
                      { step: 5, label: 'Delivered', desc: 'Arrived at destination' },
                    ].map((st) => {
                      const isCompleted = activeStep > st.step;
                      const isCurrent = activeStep === st.step;

                      return (
                        <div key={st.step} className="flex flex-col items-center text-center max-w-[80px] sm:max-w-[120px]">
                          <div 
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all shadow-sm ${
                              isCompleted
                                ? 'bg-teal-600 text-white ring-4 ring-teal-50'
                                : isCurrent
                                ? isCancelled 
                                  ? 'bg-rose-600 text-white ring-4 ring-rose-100 animate-pulse'
                                  : 'bg-teal-600 text-white ring-4 ring-teal-100 animate-pulse'
                                : 'bg-white border-2 border-slate-200 text-slate-400'
                            }`}
                          >
                            {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : st.step}
                          </div>
                          <span className={`text-[11px] sm:text-xs font-bold mt-2.5 leading-tight ${
                            isCurrent ? 'text-teal-900 font-extrabold' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                          }`}>
                            {st.label}
                          </span>
                          <span className="hidden sm:block text-[10px] text-slate-400 mt-0.5 leading-tight">
                            {st.desc}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Order Meta Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">AWB / Waybill</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {liveShipment?.AWB || selectedAwb || localOrder?.awb || 'N/A'}
                    </span>
                    {(liveShipment?.AWB || selectedAwb || localOrder?.awb) && (
                      <button
                        type="button"
                        onClick={() => handleCopyAwb(liveShipment?.AWB || selectedAwb || localOrder?.awb || '')}
                        className="p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors"
                        title="Copy AWB number"
                      >
                        {copiedAwb ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Destination</span>
                  <span className="font-bold text-slate-800 block text-sm mt-0.5">
                    {liveShipment?.Consignee?.PinCode 
                      ? `Pin: ${liveShipment.Consignee.PinCode}` 
                      : (localOrder?.pincode ? `Pin: ${localOrder.pincode}` : (liveShipment?.Destination || 'India'))}
                  </span>
                  <span className="text-slate-500 text-[11px] truncate block">
                    {liveShipment?.Consignee?.City || liveShipment?.Destination || ''}
                  </span>
                </div>

                {/* Patient / Recipient: ONLY patient name shown */}
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Patient / Recipient</span>
                  <span className="font-bold text-slate-800 block text-sm mt-0.5 truncate">
                    {localOrder?.consigneeName || liveShipment?.Consignee?.Name || 'Patient'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Courier Partner</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="font-bold text-slate-800 text-sm">Delhivery Express</span>
                  </div>
                  {(liveShipment?.AWB || selectedAwb) && (
                    <a
                      href={`https://www.delhivery.com/track/package/${liveShipment?.AWB || selectedAwb}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-teal-600 font-semibold hover:underline mt-0.5"
                    >
                      <span>Carrier Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Scans Timeline Section */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-teal-600" />
                  Live Tracking Timeline & Activity Log
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {scansList.length} Event(s)
                </span>
              </h3>

              {scansList.length > 0 ? (
                <div className="mt-6 space-y-4 border-l-2 border-teal-200 ml-3 pl-5 py-1">
                  {scansList.map((item, idx) => {
                    const sd = item.ScanDetail || item;
                    const isLatest = idx === 0;

                    return (
                      <div key={idx} className="relative text-xs sm:text-sm">
                        {/* Dot on timeline */}
                        <div 
                          className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full ring-4 ring-white ${
                            isLatest ? 'bg-teal-600 animate-pulse' : 'bg-slate-300'
                          }`}
                        />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
                          <span className={`font-bold ${isLatest ? 'text-teal-900 text-sm' : 'text-slate-800'}`}>
                            {sd.Scan || sd.Instructions || 'Package in transit'}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {sd.ScanDateTime ? new Date(sd.ScanDateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                          </span>
                        </div>

                        {(sd.ScannedLocation || sd.Instructions) && (
                          <div className="text-slate-600 text-xs flex items-center gap-1.5 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{sd.ScannedLocation || ''}</span>
                            {sd.Instructions && sd.Instructions !== sd.Scan && (
                              <span className="text-slate-400">• {sd.Instructions}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Truck className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-slate-800 text-sm">Awaiting First Physical Carrier Scan</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Your medicine package has been prepared and manifested in the Delhivery courier network. Detailed checkpoint scans will appear as soon as the courier scans the package at the pickup hub.
                  </p>
                </div>
              )}
            </div>

            {/* Medicine Care & Delivery Instructions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-5 text-xs text-teal-900 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-sm text-teal-950">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  Homoeopathic Medicine Care Upon Receipt
                </div>
                <p className="leading-relaxed text-teal-800">
                  Store medicine bottles in a clean, cool, and dry place away from direct sunlight, mobile radiation, and strong aromatic substances like camphor, menthol, or perfumes.
                </p>
              </div>

              <div className="bg-slate-100/80 border border-slate-200 rounded-2xl p-5 text-xs text-slate-700 space-y-3">
                <div className="font-bold flex items-center gap-1.5 text-sm text-slate-900">
                  <Phone className="w-4 h-4 text-slate-700" />
                  Need Help With Your Delivery?
                </div>
                <p className="leading-relaxed text-slate-600">
                  If you have any questions regarding your package dispatch, delivery ETA, or medicine dosage, reach out to our clinic reception:
                </p>
                
                {/* Contact Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <a
                    href="tel:05676350536"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs transition-colors shadow-2xs"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Reception (05676350536)</span>
                  </a>
                  <a
                    href={`https://wa.me/916396535078?text=${encodeURIComponent(`Hello Doctor, I am tracking my medicine order (AWB: ${selectedAwb || 'N/A'}). I need assistance.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors shadow-2xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp (+91 6396535078)</span>
                  </a>
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Krishna Homoeopathic Clinic. All rights reserved.</p>
        <p className="mt-1">
          Dr. Sunil Kumar (BHMS) • Helpline: 05676350536 • WhatsApp: +91 6396535078
        </p>
      </footer>
    </div>
  );
}

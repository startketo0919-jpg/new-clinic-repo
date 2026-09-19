import React, { useState, useEffect } from 'react';
import { Package, Truck, FileText, Search, Plus, Trash2, CheckCircle2, History as HistoryIcon, Download, XCircle, Copy, AlertCircle, Calendar, Clock, ChevronDown, ChevronUp, RefreshCw, MessageSquare, Phone, MapPin, ExternalLink, Send } from 'lucide-react';
import { useClinic } from '../context/ClinicContext';

interface DelhiveryCourierProps {
  prefillData?: {
    consigneeName: string;
    consigneePhone: string;
    consigneeAddress: string;
    consigneePincode: string;
  } | null;
}

export default function DelhiveryCourier({ prefillData }: DelhiveryCourierProps = {}) {
  const { state } = useClinic();
  const [activeTab, setActiveTab] = useState<'new_order' | 'pickup' | 'manage' | 'history'>('new_order');
  
  // New Order State
  const [orderId, setOrderId] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [consigneeName, setConsigneeName] = useState('');
  const [consigneePhone, setConsigneePhone] = useState('');
  const [consigneeAddress, setConsigneeAddress] = useState('');
  const [consigneePincode, setConsigneePincode] = useState('');

  useEffect(() => {
    if (prefillData) {
      if (prefillData.consigneeName) setConsigneeName(prefillData.consigneeName);
      if (prefillData.consigneePhone) setConsigneePhone(prefillData.consigneePhone);
      if (prefillData.consigneeAddress) setConsigneeAddress(prefillData.consigneeAddress);
      if (prefillData.consigneePincode) setConsigneePincode(prefillData.consigneePincode);
      setActiveTab('new_order');
    }
  }, [prefillData]);
  const [consigneeCity, setConsigneeCity] = useState('');
  const [consigneeState, setConsigneeState] = useState('');
  const [packageType, setPackageType] = useState<'Box' | 'Flyer'>('Box');
  const [weight, setWeight] = useState(500); // grams
  const [length, setLength] = useState(10);
  const [width, setWidth] = useState(10);
  const [height, setHeight] = useState(10);
  const [paymentMode, setPaymentMode] = useState('Pre-paid');
  const [items, setItems] = useState([{ name: 'Medicine Charge', price: 0 }, { name: 'Delivery Charge', price: 150 }]);
  
  const [rates, setRates] = useState<{ express?: number, surface?: number } | null>(null);
  const [selectedRate, setSelectedRate] = useState<'Express' | 'Surface' | null>(null);
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [createdAwb, setCreatedAwb] = useState<string | null>(null);

  // Pickup State
  const [pickupDate, setPickupDate] = useState(() => {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    return tmr.toISOString().split('T')[0];
  });
  const [pickupPackages, setPickupPackages] = useState(1);
  const [customPickupLocation, setCustomPickupLocation] = useState('');
  const [isSchedulingPickup, setIsSchedulingPickup] = useState(false);
  const [showRawReply, setShowRawReply] = useState(false);
  const [pickupResult, setPickupResult] = useState<{
    scheduled: boolean;
    pickup_id?: string | number | null;
    incoming_center_name?: string | null;
    pickup_time?: string;
    pickup_date?: string;
    pickup_location?: string;
    expected_package_count?: number;
    problem?: string | null;
    hint?: string | null;
    status_code?: number;
    raw?: any;
    request_payload?: any;
  } | null>(null);
  
  // Manage State (Track, Cancel, PDF)
  const [manageAwb, setManageAwb] = useState('');
  const [manageAction, setManageAction] = useState('');
  const [manageResult, setManageResult] = useState('');
  const [trackData, setTrackData] = useState<any>(null);
  const [isTrackLoading, setIsTrackLoading] = useState(false);

  // WhatsApp Notification State
  const [sendingWhatsappAwb, setSendingWhatsappAwb] = useState<string | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<{ awb: string; success: boolean; message: string } | null>(null);

  // History State
  const [history, setHistory] = useState<any[]>([]);
  
  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/delhivery/orders');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'history' || activeTab === 'manage') {
      fetchHistory();
    }
  }, [activeTab]);

  const warehouses = JSON.parse(state.settings.delhiveryWarehouses || '[]').map((w: any) => typeof w === 'string' ? { name: w, pincode: '' } : w);
  
  // If warehouse empty, set first as default
  useEffect(() => {
    if (!warehouse && warehouses.length > 0) {
      setWarehouse(JSON.stringify(warehouses[0]));
    }
  }, [warehouses, warehouse]);

  const fetchRates = async () => {
    if (!warehouse || !consigneePincode) return alert("Select warehouse and enter delivery pincode");
    setIsFetchingRates(true);
    try {
      const w = JSON.parse(warehouse);
      const res = await fetch('/api/delhivery/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickup_pincode: w.pincode, delivery_pincode: consigneePincode, weight })
      });
      const data = await res.json();
      
      let expPrice = 0;
      let surPrice = 0;
      
      console.log('Delhivery rates response:', data);

      if (Array.isArray(data.express) && data.express.length > 0) expPrice = data.express[0].total_amount;
      else if (data.express && data.express[0] && data.express[0].total_amount) expPrice = data.express[0].total_amount;
      
      if (Array.isArray(data.surface) && data.surface.length > 0) surPrice = data.surface[0].total_amount;
      else if (data.surface && data.surface[0] && data.surface[0].total_amount) surPrice = data.surface[0].total_amount;
      
      if (!expPrice && !surPrice) {
        alert("Could not fetch rates. Please check the pincodes, weight, or your API key. (See console for details)");
        setIsFetchingRates(false);
        return;
      }
      
      setRates({ express: expPrice, surface: surPrice });
      setIsFetchingRates(false);
    } catch (e) {
      console.error(e);
      setIsFetchingRates(false);
      alert('Failed to fetch rates');
    }
  };

  const createOrder = async () => {
    if (!orderId || !consigneeName || !consigneePhone || !consigneeAddress || !consigneePincode || !warehouse) {
      return alert("Please fill all required fields");
    }
    setIsCreatingOrder(true);
    try {
      const res = await fetch('/api/delhivery/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          warehouse: warehouse ? JSON.parse(warehouse).name : '',
          name: consigneeName,
          phone: consigneePhone,
          address: consigneeAddress,
          pincode: consigneePincode,
          city: consigneeCity,
          state: consigneeState,
          weight,
          length,
          width,
          height,
          paymentMode,
          items,
          shippingMode: selectedRate || 'Surface',
          packageType
        })
      });
      const data = await res.json();
      setIsCreatingOrder(false);
      
      const pkg = data.packages?.[0];
      const awb = pkg?.waybill || data.upload_wbn || data.waybill || null;
      
      if (awb || data.success || (pkg && pkg.status === 'Success')) {
          setCreatedAwb(awb || 'Order Placed');
          setOrderId(''); setConsigneeName(''); setConsigneePhone(''); setConsigneeAddress(''); setConsigneePincode(''); setConsigneeCity(''); setConsigneeState(''); setRates(null); setSelectedRate(null);
          fetchHistory();
      } else {
          const errMsg = (pkg?.remarks && pkg.remarks.length > 0) ? pkg.remarks.join(', ') : (data.error || data.rmk || JSON.stringify(data));
          alert('Failed to create order: ' + errMsg);
      }
    } catch (e: any) {
      setIsCreatingOrder(false);
      alert('Failed to create order: ' + (e.message || 'Network error'));
    }
  };

  const schedulePickup = async () => {
    const selectedLocation = customPickupLocation.trim() || (warehouse ? (JSON.parse(warehouse).name || '') : '');
    if (!selectedLocation) {
      alert("Please select or enter a pickup location / warehouse name");
      return;
    }
    if (!pickupDate) {
      alert("Please select a pickup date");
      return;
    }

    setIsSchedulingPickup(true);
    setPickupResult(null);

    try {
      const res = await fetch('/api/delhivery/pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_date: pickupDate,
          pickup_location: selectedLocation,
          expected_package_count: Number(pickupPackages) || 1
        })
      });
      const data = await res.json();
      setIsSchedulingPickup(false);
      setPickupResult(data);
    } catch (e: any) {
      setIsSchedulingPickup(false);
      setPickupResult({
        scheduled: false,
        problem: `Connection failed: ${e.message || 'Unknown network error'}`,
        hint: 'Please check your internet connection or verify the server status.'
      });
    }
  };
  
  const trackOrderInApp = async (awbNumber: string, orderIdRef?: string) => {
    if (!awbNumber) return;
    setIsTrackLoading(true);
    setTrackData(null);
    setManageResult('Fetching live tracking from Delhivery API...');
    try {
      const refQuery = orderIdRef ? `?ref_ids=${encodeURIComponent(orderIdRef)}` : '';
      const res = await fetch(`/api/delhivery/track/${encodeURIComponent(awbNumber.trim())}${refQuery}`);
      const data = await res.json();
      setIsTrackLoading(false);
      setTrackData(data);
      if (data.ShipmentData && data.ShipmentData.length > 0) {
        setManageResult(`Live tracking retrieved for AWB ${awbNumber}`);
      } else if (data.error) {
        setManageResult(`Tracking Error: ${data.error}`);
      } else {
        setManageResult(`No active scans found yet for AWB ${awbNumber}`);
      }
    } catch (e: any) {
      setIsTrackLoading(false);
      setManageResult(`Tracking failed: ${e.message || 'Network error'}`);
    }
  };

  const sendWhatsAppNotification = async (order: any) => {
    if (!order || !order.awb) {
      alert("Order does not have a valid AWB number.");
      return;
    }
    if (!order.consigneePhone) {
      alert("Consignee phone number is missing.");
      return;
    }

    setSendingWhatsappAwb(order.awb);
    setWhatsappStatus(null);

    try {
      // Template: "order_shipped"
      // {{1}} = Consignee Name
      // {{2}} = AWB Number
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: order.consigneePhone,
          templateName: 'order_shipped',
          templateLanguage: 'en',
          templateComponents: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: order.consigneeName || 'Customer' },
                { type: 'text', text: String(order.awb) }
              ]
            }
          ]
        })
      });

      const data = await res.json();
      setSendingWhatsappAwb(null);

      if (res.ok && (data.success || !data.error)) {
        setWhatsappStatus({
          awb: order.awb,
          success: true,
          message: `WhatsApp notification sent to ${order.consigneePhone} using template "order_shipped"!`
        });
      } else {
        setWhatsappStatus({
          awb: order.awb,
          success: false,
          message: data.error || 'Failed to send WhatsApp message. Check WhatsApp API settings.'
        });
      }
    } catch (e: any) {
      setSendingWhatsappAwb(null);
      setWhatsappStatus({
        awb: order.awb,
        success: false,
        message: e.message || 'Network error sending WhatsApp message'
      });
    }
  };

  const handleManage = async (action: 'track' | 'cancel' | 'pdf') => {
    if (!manageAwb) return alert("Enter AWB first");
    setManageAction(action);
    setManageResult('Loading...');
    try {
      if (action === 'cancel') {
        const res = await fetch('/api/delhivery/cancel', {
           method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ waybill: manageAwb })
        });
        setManageResult("Order cancelled successfully.");
        fetchHistory();
      } else if (action === 'track') {
        await trackOrderInApp(manageAwb);
      } else if (action === 'pdf') {
        const res = await fetch(`/api/delhivery/label-url/${manageAwb}`);
        const data = await res.json();
        if (data.url) {
            if (data.url.startsWith('data:')) {
                const a = document.createElement('a');
                a.href = data.url;
                a.download = `${manageAwb}.pdf`;
                a.click();
                setManageResult('Downloaded Label PDF.');
            } else {
                window.open(data.url, '_blank');
                setManageResult(`Label opened in new tab: ${data.url}`);
            }
        } else {
            setManageResult('Could not fetch label URL.');
        }
      }
    } catch (e) {
      setManageResult(`Failed to ${action}`);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Truck className="w-6 h-6 text-indigo-600" />
          Delhivery Courier Integration
        </h2>
        
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setActiveTab('new_order')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'new_order' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}>New Order</button>
          <button onClick={() => setActiveTab('pickup')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'pickup' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}>Schedule Pickup</button>
          <button onClick={() => setActiveTab('manage')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'manage' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}>Track / Cancel / PDF</button>
          <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'history' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}>History</button>
        </div>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'new_order' && (
          createdAwb ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center max-w-lg mx-auto mt-8">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Order Manifested!</h3>
              <p className="text-slate-600 mb-6">Your order has been successfully created with Delhivery.</p>
              
              <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-slate-500 font-medium mb-1 uppercase tracking-wide">AWB Number</p>
                <div className="text-3xl font-bold text-indigo-700 tracking-wider font-mono">{createdAwb}</div>
              </div>
              
              <div className="flex gap-3 justify-center">
                <button onClick={async () => {
                  try {
                    const res = await fetch(`/api/delhivery/label-url/${createdAwb}`);
                    const data = await res.json();
                    if (data.url) {
                        navigator.clipboard.writeText(data.url);
                        alert('Label URL copied to clipboard!');
                    } else {
                        alert('Could not fetch label URL.');
                    }
                  } catch(e) {
                      alert('Error fetching label URL');
                  }
                }} className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
                  <Copy size={18} />
                  Copy URL
                </button>
                <button onClick={async () => {
                  try {
                    const res = await fetch(`/api/delhivery/label-url/${createdAwb}`);
                    const data = await res.json();
                    if (data.url) {
                        if (data.url.startsWith('data:')) {
                            const a = document.createElement('a');
                            a.href = data.url;
                            a.download = `${createdAwb}.pdf`;
                            a.click();
                        } else {
                            window.open(data.url, '_blank');
                        }
                    } else {
                        alert('Could not fetch label PDF.');
                    }
                  } catch(e) {
                      alert('Error fetching label PDF');
                  }
                }} className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm">
                  <Download size={18} />
                  Download PDF
                </button>
                <button onClick={() => setCreatedAwb(null)} className="px-6 py-3 bg-white text-slate-700 border border-slate-300 font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                  Create Another
                </button>
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-slate-700 mb-4 border-b pb-2">Order Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Order ID</label>
                    <input type="text" value={orderId} onChange={e => setOrderId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. ORD-101" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Warehouse</label>
                    <select value={warehouse} onChange={e => setWarehouse(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                      {warehouses.map((w: any, i: number) => <option key={i} value={JSON.stringify(w)}>{w.name} {w.pincode ? `(${w.pincode})` : ''}</option>)}
                      {warehouses.length === 0 && <option value="">No warehouse in settings</option>}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Payment Mode</label>
                    <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                      <option value="Pre-paid">Prepaid</option>
                      <option value="COD">COD</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-4 border-b pb-2">Consignee Details</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Name</label>
                    <input type="text" value={consigneeName} onChange={e => setConsigneeName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Phone</label>
                    <input type="text" value={consigneePhone} onChange={e => setConsigneePhone(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Complete Address</label>
                    <input type="text" value={consigneeAddress} onChange={e => setConsigneeAddress(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pincode</label>
                    <input type="text" value={consigneePincode} onChange={e => setConsigneePincode(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">City (Optional)</label>
                    <input type="text" placeholder="e.g. Gurugram" value={consigneeCity} onChange={e => setConsigneeCity(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">State (Optional)</label>
                    <input type="text" placeholder="e.g. Haryana" value={consigneeState} onChange={e => setConsigneeState(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between border-b pb-2 mb-4">
                  <h3 className="font-bold text-slate-700">Package Metrics & Type</h3>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setPackageType('Box')}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                        packageType === 'Box'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      📦 Box
                    </button>
                    <button
                      type="button"
                      onClick={() => setPackageType('Flyer')}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                        packageType === 'Flyer'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ✉️ Flyer
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Weight (g)</label>
                    <input type="number" value={weight} onChange={e => setWeight(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Length (cm)</label>
                    <input type="number" value={length} onChange={e => setLength(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Width (cm)</label>
                    <input type="number" value={width} onChange={e => setWidth(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Height (cm)</label>
                    <input type="number" value={height} onChange={e => setHeight(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center justify-between">
                  Item Ledger
                  <button onClick={() => setItems([...items, { name: '', price: 0 }])} className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"><Plus className="w-4 h-4"/> Add Item</button>
                </h3>
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-3 items-center">
                      <input type="text" value={item.name} onChange={e => {
                        const newItems = [...items];
                        newItems[idx].name = e.target.value;
                        setItems(newItems);
                      }} className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder="Item Name" />
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400">₹</span>
                        <input type="number" value={item.price} onChange={e => {
                          const newItems = [...items];
                          newItems[idx].price = Number(e.target.value);
                          setItems(newItems);
                        }} className="w-24 pl-7 pr-3 py-2 border rounded-lg text-sm" />
                      </div>
                      <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  ))}
                  <div className="flex justify-between pt-3 border-t font-semibold text-slate-700">
                    <span>Total Order Value:</span>
                    <span>₹{items.reduce((sum, item) => sum + item.price, 0)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <h3 className="font-bold text-slate-700 mb-4">Shipping Rates</h3>
                {!rates ? (
                  <button onClick={fetchRates} disabled={isFetchingRates} className="w-full py-3 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
                    {isFetchingRates ? 'Fetching...' : 'Fetch Rates (Express & Surface)'}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <label className={`block border rounded-xl p-4 cursor-pointer transition-all ${selectedRate === 'Express' ? 'border-indigo-500 bg-indigo-50' : 'bg-white hover:border-slate-300'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input type="radio" name="rate" checked={selectedRate === 'Express'} onChange={() => setSelectedRate('Express')} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                          <div>
                            <div className="font-semibold text-slate-800">Express Delivery</div>
                            <div className="text-xs text-slate-500">Fastest transit time</div>
                          </div>
                        </div>
                        <div className="font-bold text-indigo-700">₹{rates.express}</div>
                      </div>
                    </label>
                    <label className={`block border rounded-xl p-4 cursor-pointer transition-all ${selectedRate === 'Surface' ? 'border-indigo-500 bg-indigo-50' : 'bg-white hover:border-slate-300'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input type="radio" name="rate" checked={selectedRate === 'Surface'} onChange={() => setSelectedRate('Surface')} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                          <div>
                            <div className="font-semibold text-slate-800">Surface Delivery</div>
                            <div className="text-xs text-slate-500">Economical ground transport</div>
                          </div>
                        </div>
                        <div className="font-bold text-indigo-700">₹{rates.surface}</div>
                      </div>
                    </label>

                    <button onClick={createOrder} disabled={!selectedRate || isCreatingOrder} className="w-full mt-4 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-semibold transition-colors shadow-sm disabled:opacity-50">
                      {isCreatingOrder ? 'Creating Order...' : 'Create Forward Order'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          )
        )}

        {activeTab === 'pickup' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Truck className="w-5 h-5 text-indigo-600" />
                  First Mile (FM) Pickup Creation
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Schedule warehouse pickup request via Delhivery Production FM API. Automatically selects the first available slot.
                </p>
              </div>

              <div className="space-y-4">
                {/* Warehouse Location */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Pickup Location / Warehouse Name
                    </label>
                    <span className="text-[11px] text-slate-400">Must match registered Delhivery warehouse</span>
                  </div>
                  {warehouses.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {warehouses.map((w: any, idx: number) => {
                        const isSelected = (!customPickupLocation && warehouse && JSON.parse(warehouse).name === w.name) || customPickupLocation === w.name;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setWarehouse(JSON.stringify(w));
                              setCustomPickupLocation(w.name);
                            }}
                            className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            🏬 {w.name} {w.pincode ? `(${w.pincode})` : ''}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <input
                    type="text"
                    value={customPickupLocation || (warehouse ? (JSON.parse(warehouse).name || '') : '')}
                    onChange={(e) => setCustomPickupLocation(e.target.value)}
                    placeholder="e.g. Home or Warehouse name"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Pickup Date & Package Count */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Pickup Date
                      </label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setPickupDate(new Date().toISOString().split('T')[0])}
                          className="text-[11px] text-indigo-600 hover:underline font-medium"
                        >
                          Today
                        </button>
                        <span className="text-slate-300 text-[11px]">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 1);
                            setPickupDate(d.toISOString().split('T')[0]);
                          }}
                          className="text-[11px] text-indigo-600 hover:underline font-medium"
                        >
                          Tomorrow
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="date"
                        value={pickupDate}
                        onChange={(e) => setPickupDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                      Expected Package Count
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={pickupPackages}
                      onChange={(e) => setPickupPackages(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Slot Info Badge */}
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                  <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    <strong>Pickup Slot:</strong> Automatically chooses the earliest available carrier slot (10:00 AM / 11:00 AM / 2:00 PM) for the selected date.
                  </span>
                </div>

                {/* Submit button */}
                <button
                  type="button"
                  onClick={schedulePickup}
                  disabled={isSchedulingPickup || !pickupDate}
                  className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 flex justify-center items-center gap-2 text-sm"
                >
                  {isSchedulingPickup ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Booking Earliest Available Slot...
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4" />
                      Book Earliest Available Pickup
                    </>
                  )}
                </button>
              </div>

              {/* Status & Reply Verification */}
              {pickupResult && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                  {pickupResult.scheduled ? (
                    /* SUCCESS CARD */
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-900 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-base text-emerald-950">
                            Pickup Scheduled Successfully!
                          </h4>
                          <p className="text-xs text-emerald-700">
                            Delhivery carrier pickup request has been accepted and confirmed.
                          </p>
                        </div>
                      </div>

                      {pickupResult.pickup_id && (
                        <div className="bg-white/80 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                          <div>
                            <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
                              Pickup Request ID (PR ID)
                            </p>
                            <p className="text-lg font-mono font-bold text-emerald-950">
                              {pickupResult.pickup_id}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(String(pickupResult.pickup_id));
                              alert('Copied Pickup ID: ' + pickupResult.pickup_id);
                            }}
                            className="p-2 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors"
                            title="Copy Pickup ID"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                        <div className="bg-white/60 p-2.5 rounded-lg border border-emerald-100">
                          <span className="text-emerald-600 font-medium block">Date & Time</span>
                          <span className="font-semibold text-slate-800">
                            {pickupResult.pickup_date} at {pickupResult.pickup_time}
                          </span>
                        </div>
                        <div className="bg-white/60 p-2.5 rounded-lg border border-emerald-100">
                          <span className="text-emerald-600 font-medium block">Location</span>
                          <span className="font-semibold text-slate-800">
                            {pickupResult.pickup_location}
                          </span>
                        </div>
                        <div className="bg-white/60 p-2.5 rounded-lg border border-emerald-100">
                          <span className="text-emerald-600 font-medium block">Expected Packages</span>
                          <span className="font-semibold text-slate-800">
                            {pickupResult.expected_package_count || 1} pkg
                          </span>
                        </div>
                        {pickupResult.incoming_center_name && (
                          <div className="bg-white/60 p-2.5 rounded-lg border border-emerald-100 col-span-2 sm:col-span-3">
                            <span className="text-emerald-600 font-medium block">Assigned Dispatch Hub</span>
                            <span className="font-semibold text-slate-800">
                              {pickupResult.incoming_center_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* ERROR / NOT SCHEDULED CARD */
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-rose-900 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-base text-rose-950">
                            Pickup Not Scheduled
                          </h4>
                          <p className="text-xs text-rose-700">
                            Carrier rejected or could not fulfill the pickup creation request.
                          </p>
                        </div>
                      </div>

                      {/* Problem highlighted */}
                      {pickupResult.problem && (
                        <div className="bg-white border border-rose-200 rounded-xl p-3.5">
                          <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wide mb-1">
                            Problem In Carrier Response
                          </p>
                          <p className="text-sm font-medium text-slate-800">
                            {pickupResult.problem}
                          </p>
                        </div>
                      )}

                      {/* Actionable Hint / Solution */}
                      {pickupResult.hint && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                          <span className="text-base leading-none">💡</span>
                          <div>
                            <span className="font-bold block mb-0.5">Recommended Action:</span>
                            <span>{pickupResult.hint}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Collapsible raw carrier response inspection */}
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setShowRawReply(!showRawReply)}
                      className="text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                    >
                      {showRawReply ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {showRawReply ? 'Hide Technical Response' : 'Inspect Raw Carrier Reply & Payload'}
                    </button>

                    {showRawReply && (
                      <div className="mt-2 p-3.5 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto space-y-2">
                        <div className="flex justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1.5">
                          <span>Endpoint: https://track.delhivery.com/fm/request/new/</span>
                          <span>HTTP Status: {pickupResult.status_code || 'N/A'}</span>
                        </div>
                        {pickupResult.request_payload && (
                          <div>
                            <span className="text-indigo-400 block font-semibold mb-0.5">// Request Payload Sent:</span>
                            <pre className="text-slate-300">{JSON.stringify(pickupResult.request_payload, null, 2)}</pre>
                          </div>
                        )}
                        <div>
                          <span className="text-emerald-400 block font-semibold mb-0.5">// Raw Reply Received:</span>
                          <pre className="text-slate-300">{JSON.stringify(pickupResult.raw, null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="max-w-3xl mx-auto space-y-6">
             <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
               
              <h3 className="font-bold text-slate-800 text-lg mb-2 flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-600" />
                Manage & In-App Tracking
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                Track shipments in real time directly inside this web app via Delhivery's live packages API, or download labels and cancel shipments.
              </p>

              <div className="flex flex-col gap-3 mb-6">
                <input 
                  type="text" 
                  list="saved-awbs"
                  value={manageAwb} 
                  onChange={e => setManageAwb(e.target.value)} 
                  placeholder="Enter or select saved AWB Number (e.g. 44526910000840)..." 
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-base font-mono bg-white" 
                />
                <datalist id="saved-awbs">
                  {history.map(h => (
                    <option key={h.awb} value={h.awb}>
                      {h.consigneeName} ({h.consigneePhone || 'No Phone'}) - {h.orderId}
                    </option>
                  ))}
                </datalist>
              </div>

               <div className="grid grid-cols-3 gap-3">
                 <button 
                   type="button"
                   onClick={() => handleManage('track')} 
                   disabled={isTrackLoading}
                   className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition-all font-semibold text-slate-700 shadow-2xs group"
                 >
                   <Search className={`w-5 h-5 mb-1.5 text-indigo-600 group-hover:scale-110 transition-transform ${isTrackLoading ? 'animate-spin' : ''}`} />
                   <span className="text-sm">Track In-App</span>
                   <span className="text-[11px] text-slate-400 font-normal">Delhivery API</span>
                 </button>
                 <button 
                   type="button"
                   onClick={() => handleManage('pdf')} 
                   className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:text-emerald-600 transition-all font-semibold text-slate-700 shadow-2xs group"
                 >
                   <FileText className="w-5 h-5 mb-1.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                   <span className="text-sm">Print Label (PDF)</span>
                   <span className="text-[11px] text-slate-400 font-normal">Thermal / Packing Slip</span>
                 </button>
                 <button 
                   type="button"
                   onClick={() => handleManage('cancel')} 
                   className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-rose-500 hover:text-rose-600 transition-all font-semibold text-slate-700 shadow-2xs group"
                 >
                   <XCircle className="w-5 h-5 mb-1.5 text-rose-500 group-hover:scale-110 transition-transform" />
                   <span className="text-sm">Cancel Order</span>
                   <span className="text-[11px] text-slate-400 font-normal">Void AWB</span>
                 </button>
               </div>
               
               {manageResult && (
                 <div className="mt-5 p-3.5 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-700 flex items-center justify-between">
                   <span>{manageResult}</span>
                   {isTrackLoading && <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />}
                 </div>
               )}

               {/* In-App Live Tracking Details View */}
               {trackData && trackData.ShipmentData && trackData.ShipmentData.length > 0 && (
                 <div className="mt-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
                   {trackData.ShipmentData.map((item: any, idx: number) => {
                     const s = item.Shipment;
                     if (!s) return null;
                     const currentStatus = s.Status?.Status || s.Status?.Instructions || 'Active';
                     const scans = s.Scans || [];

                     return (
                       <div key={idx} className="space-y-4">
                         {/* Shipment Header */}
                         <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-100">
                           <div>
                             <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Waybill / AWB</span>
                             <div className="text-lg font-mono font-bold text-indigo-600">{s.AWB}</div>
                             <div className="text-xs text-slate-500 mt-0.5">
                               Ref Order: <span className="font-medium text-slate-700">{s.ReferenceNo || 'N/A'}</span>
                             </div>
                           </div>
                           <div className="text-right">
                             <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                               currentStatus.toLowerCase().includes('cancel')
                                 ? 'bg-rose-100 text-rose-700'
                                 : currentStatus.toLowerCase().includes('deliver')
                                 ? 'bg-emerald-100 text-emerald-700'
                                 : 'bg-indigo-100 text-indigo-700'
                             }`}>
                               {currentStatus}
                             </span>
                             {s.Status?.StatusDateTime && (
                               <div className="text-[11px] text-slate-400 mt-1">
                                 {new Date(s.Status.StatusDateTime).toLocaleString()}
                               </div>
                             )}
                           </div>
                         </div>

                         {/* Details Grid */}
                         <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                           <div>
                             <span className="text-slate-400 block text-[10px] uppercase font-semibold">Origin</span>
                             <span className="font-semibold text-slate-800">{s.PickupLocation || 'Warehouse'}</span>
                             <span className="block text-slate-500 truncate text-[11px]">{s.Origin || ''}</span>
                           </div>
                           <div>
                             <span className="text-slate-400 block text-[10px] uppercase font-semibold">Destination</span>
                             <span className="font-semibold text-slate-800">{s.Destination || 'N/A'}</span>
                             <span className="block text-slate-500 text-[11px]">Pin: {s.Consignee?.PinCode || 'N/A'}</span>
                           </div>
                           <div>
                             <span className="text-slate-400 block text-[10px] uppercase font-semibold">Consignee</span>
                             <span className="font-semibold text-slate-800">{s.Consignee?.Name || 'Customer'}</span>
                             <span className="block text-slate-500 text-[11px]">{s.Consignee?.City || ''}</span>
                           </div>
                           <div>
                             <span className="text-slate-400 block text-[10px] uppercase font-semibold">Payment & Type</span>
                             <span className="font-semibold text-slate-800">{s.OrderType || 'Pre-paid'}</span>
                             <span className="block text-slate-500 text-[11px]">₹{s.InvoiceAmount || 0}</span>
                           </div>
                         </div>

                         {/* Status Instructions / Details */}
                         {s.Status?.Instructions && (
                           <div className="text-xs p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2">
                             <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                             <div>
                               <strong>Latest Update:</strong> {s.Status.Instructions}
                               {s.Status.StatusLocation ? ` (${s.Status.StatusLocation})` : ''}
                             </div>
                           </div>
                         )}

                         {/* Scans Timeline */}
                         {scans.length > 0 && (
                           <div>
                             <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                               Tracking Timeline & Scan Events ({scans.length})
                             </h4>
                             <div className="space-y-2 border-l-2 border-indigo-200 ml-2 pl-4 py-1">
                               {scans.map((scanItem: any, scanIdx: number) => {
                                 const sd = scanItem.ScanDetail;
                                 if (!sd) return null;
                                 return (
                                   <div key={scanIdx} className="relative text-xs">
                                     <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                                     <div className="font-semibold text-slate-800 flex items-center gap-2">
                                       <span>{sd.Scan || sd.Instructions}</span>
                                       <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                         {sd.StatusCode}
                                       </span>
                                     </div>
                                     <div className="text-slate-500 text-[11px]">
                                       {sd.ScannedLocation} • {new Date(sd.ScanDateTime || sd.StatusDateTime).toLocaleString()}
                                     </div>
                                     {sd.Instructions && sd.Instructions !== sd.Scan && (
                                       <div className="text-slate-600 text-[11px] mt-0.5 italic">
                                         "{sd.Instructions}"
                                       </div>
                                     )}
                                   </div>
                                 );
                               })}
                             </div>
                           </div>
                         )}
                       </div>
                     );
                   })}
                 </div>
               )}
             </div>
          </div>
        )}

        {activeTab === 'history' && (
           <div className="space-y-4">
             <div className="flex items-center justify-between">
               <div>
                 <h3 className="font-bold text-slate-800 text-lg">Order History</h3>
                 <p className="text-xs text-slate-500">Track shipments in-app or notify customers via WhatsApp</p>
               </div>
               <button 
                 onClick={fetchHistory} 
                 className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
               >
                 <RefreshCw className="w-3.5 h-3.5" /> Refresh
               </button>
             </div>

             {/* WhatsApp Feedback Banner */}
             {whatsappStatus && (
               <div className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
                 whatsappStatus.success 
                   ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                   : 'bg-rose-50 border-rose-200 text-rose-900'
               }`}>
                 <div className="flex items-center gap-2">
                   {whatsappStatus.success ? (
                     <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                   ) : (
                     <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                   )}
                   <span>{whatsappStatus.message}</span>
                 </div>
                 <button 
                   type="button" 
                   onClick={() => setWhatsappStatus(null)}
                   className="text-slate-400 hover:text-slate-700 font-bold ml-2"
                 >
                   ✕
                 </button>
               </div>
             )}
             
             <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead className="bg-slate-50 border-b border-slate-200">
                     <tr>
                       <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                       <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
                       <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">AWB Number</th>
                       <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Consignee & Mobile</th>
                       <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                       <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {history.map((order, i) => (
                       <tr key={i} className="hover:bg-slate-50 transition-colors">
                         <td className="px-4 py-4 text-xs text-slate-600 whitespace-nowrap">
                           {new Date(order.timestamp).toLocaleDateString()}
                           <span className="block text-[11px] text-slate-400">
                             {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </span>
                         </td>
                         <td className="px-4 py-4 text-xs font-medium text-slate-800">
                           {order.orderId}
                         </td>
                         <td className="px-4 py-4">
                           <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 block w-max">
                             {order.awb}
                           </span>
                         </td>
                         <td className="px-4 py-4 text-xs text-slate-700">
                           <div className="font-semibold text-slate-900">{order.consigneeName}</div>
                           {/* Mobile Number Display */}
                           <div className="flex items-center gap-1 text-slate-500 mt-0.5">
                             <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                             <span className="font-mono text-xs font-medium text-slate-700">
                               {order.consigneePhone || 'No phone'}
                             </span>
                           </div>
                           <div className="text-[11px] text-slate-400 mt-0.5">
                             {order.consigneePincode}
                           </div>
                         </td>
                         <td className="px-4 py-4">
                           <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full inline-block ${
                             order.status === 'Cancelled' 
                               ? 'bg-rose-100 text-rose-700' 
                               : 'bg-emerald-100 text-emerald-700'
                           }`}>
                             {order.status}
                           </span>
                         </td>
                         <td className="px-4 py-4 text-right whitespace-nowrap">
                           <div className="flex items-center justify-end gap-2">
                             {/* WhatsApp Notification Button */}
                             <button
                               type="button"
                               onClick={() => sendWhatsAppNotification(order)}
                               disabled={sendingWhatsappAwb === order.awb || !order.consigneePhone}
                               title="Send WhatsApp shipment notification with template 'order_shipped'"
                               className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50 shadow-2xs"
                             >
                               {sendingWhatsappAwb === order.awb ? (
                                 <>
                                   <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                   <span>Sending...</span>
                                 </>
                               ) : (
                                 <>
                                   <MessageSquare className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white" />
                                   <span>Send WhatsApp</span>
                                 </>
                               )}
                             </button>

                             {/* In-App Tracking Button */}
                             <button 
                               type="button"
                               onClick={() => {
                                 setManageAwb(order.awb);
                                 setActiveTab('manage');
                                 trackOrderInApp(order.awb, order.orderId);
                               }}
                               className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-white hover:bg-indigo-600 font-semibold text-xs border border-indigo-200 px-3 py-1.5 rounded-lg bg-indigo-50 transition-all shadow-2xs"
                             >
                               <Search className="w-3.5 h-3.5" />
                               <span>Track In-App</span>
                             </button>
                           </div>
                         </td>
                       </tr>
                     ))}
                     {history.length === 0 && (
                       <tr>
                         <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-xs">
                           No orders found in history.
                         </td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
             </div>
           </div>
        )}
      </div>
    </div>
  );
}

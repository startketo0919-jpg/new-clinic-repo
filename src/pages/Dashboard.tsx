import React, { useEffect, useState } from 'react';
import { useClinic } from '../context/ClinicContext';
import CheckInForm from '../components/CheckInForm';
import QueueControl from '../components/QueueControl';
import QueueList from '../components/QueueList';
import PatientHistory from '../components/PatientHistory';
import UpcomingAppointments from '../components/UpcomingAppointments';
import UserManagement from '../components/UserManagement';
import DelhiveryCourier from '../components/DelhiveryCourier';
import ShipmentManagement from '../components/ShipmentManagement';
import OnlineAppointments from '../components/OnlineAppointments';
import { LogOut, Activity, Users, Clock, CheckCircle, XCircle, LayoutDashboard, History, Settings, UserCog, Calendar, Package, Truck, Video } from 'lucide-react';
import { getLocalTodayString, isSameDayLocal } from "../lib/dateUtils";
import WhatsAppWidget from "../components/WhatsAppWidget";
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { state, updateUserPassword, updateSettings, resetDatabase, sendWhatsAppMessage } = useClinic();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'queue' | 'history' | 'users' | 'appointments' | 'online-appointments' | 'courier' | 'shipments'>('queue');
  const [delhiveryPrefill, setDelhiveryPrefill] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  const handleAutofillDelhivery = (data: any) => {
    setDelhiveryPrefill(data);
    setActiveTab('courier');
  };
  
  useEffect(() => {
    const auth = sessionStorage.getItem('staffAuthenticated');
    if (!auth) {
      navigate('/login');
      return;
    }
    setUserRole(sessionStorage.getItem('userRole'));
    setUsername(sessionStorage.getItem('username'));
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login');
  };

  
  
  const todayStr = getLocalTodayString();
  const todaysPatients = state.patients.filter(p => isSameDayLocal(p.checkInTime, todayStr));

  const totalPatients = todaysPatients.length;
  const currentlyWaiting = todaysPatients.filter(p => p.status === 'Waiting').length;
  const patientsWaitingApproval = state.appointments.filter(a => isSameDayLocal(a.date, todayStr)).length;
  const completed = todaysPatients.filter(p => p.status === 'Completed').length;
  const skipped = todaysPatients.filter(p => p.status === 'Skipped').length;
  
  // Calculate avg wait time for completed patients
  const completedPatients = todaysPatients.filter(p => p.status === 'Completed' && p.completedTime);
  let avgWait = 0;
  if (completedPatients.length > 0) {
    const totalWait = completedPatients.reduce((acc, p) => acc + (p.completedTime! - p.checkInTime) / 60000, 0);
    avgWait = Math.round(totalWait / completedPatients.length);
  }

  const pendingShipmentsCount = (state.shipments || []).filter(s => s.status === 'Pending').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 text-white px-6 py-4 shadow-md flex justify-between items-center sticky top-0 z-20 overflow-x-auto">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-teal-400" />
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">Krishna Homoeopathic Clinic</h1>
            <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded-md ml-2 font-medium capitalize hidden md:inline-block">Role: {userRole}</span>
          </div>
          
          <div className="flex bg-slate-900 rounded-lg p-1 gap-1 border border-slate-700 whitespace-nowrap">
            <button 
              onClick={() => setActiveTab('queue')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'queue' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Live Queue
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'history' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-4 h-4" /> Patient Registry
            </button>
            <button 
              onClick={() => setActiveTab('appointments')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'appointments' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" /> Appointments
            </button>
            <button 
              onClick={() => setActiveTab('online-appointments')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'online-appointments' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Video className="w-4 h-4" /> Online Consults
            </button>
            <button 
              onClick={() => setActiveTab('shipments')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'shipments' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Truck className="w-4 h-4" /> Shipments
              {pendingShipmentsCount > 0 && (
                <span className="bg-amber-500 text-slate-950 font-extrabold text-[10px] px-1.5 py-0.5 rounded-full ml-0.5">
                  {pendingShipmentsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('courier')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'courier' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Package className="w-4 h-4" /> Courier
            </button>
  {userRole === 'admin' && (
              <button 
                onClick={() => setActiveTab('users')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'users' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserCog className="w-4 h-4" /> Manage Users
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 ml-4">
          <button 
            onClick={() => navigate('/settings')}
            className="flex items-center justify-center p-2 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg whitespace-nowrap"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <WhatsAppWidget />
      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {activeTab === 'queue' && (
          <>
            {/* Left Column: Form & Metrics */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <CheckInForm />
              
              {/* Quick Metrics */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">End-of-Day Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <MetricBox icon={Users} label="Waiting Now" value={currentlyWaiting} color="text-blue-600" bg="bg-blue-50" />
   <MetricBox icon={Calendar} label="Pending Approval" value={patientsWaitingApproval} color="text-indigo-600" bg="bg-indigo-50" />
                  <MetricBox icon={Clock} label="Avg Wait" value={`${avgWait}m`} color="text-amber-600" bg="bg-amber-50" />
                  <MetricBox icon={CheckCircle} label="Completed" value={completed} color="text-emerald-600" bg="bg-emerald-50" />
                  <MetricBox icon={XCircle} label="No-Shows" value={skipped} color="text-rose-600" bg="bg-rose-50" />
                </div>
              </div>
            </div>

            {/* Right Column: Queue Control & List */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <QueueControl />
              <QueueList />
            </div>
          </>
        )}
        
        {activeTab === 'history' && (
          <div className="lg:col-span-12">
            <PatientHistory userRole={userRole} />
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="lg:col-span-12">
            <UpcomingAppointments />
          </div>
        )}

        {activeTab === 'online-appointments' && (
          <div className="lg:col-span-12">
            <OnlineAppointments userRole={userRole} />
          </div>
        )}

        {activeTab === 'users' && userRole === 'admin' && (
          <div className="lg:col-span-12">
            <UserManagement />
          </div>
        )}
        {activeTab === 'shipments' && (
          <div className="lg:col-span-12">
            <ShipmentManagement onAutofillDelhivery={handleAutofillDelhivery} />
          </div>
        )}
        {activeTab === 'courier' && (
          <div className="lg:col-span-12">
            <DelhiveryCourier prefillData={delhiveryPrefill} />
          </div>
        )}

      </main>
    </div>
  );
}

function MetricBox({ icon: Icon, label, value, color, bg }: any) {
  return (
    <div className={`p-4 rounded-xl ${bg} flex flex-col items-center justify-center text-center`}>
      <Icon className={`w-6 h-6 mb-2 ${color}`} />
      <span className="text-2xl font-bold text-slate-800">{value}</span>
      <span className="text-xs font-medium text-slate-600 mt-1">{label}</span>
    </div>
  );
}


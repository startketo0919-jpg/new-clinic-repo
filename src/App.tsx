/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ClinicProvider } from './context/ClinicContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SettingsPage from './pages/SettingsPage';
import WaitingRoom from './pages/WaitingRoom';
import PatientTracker from './pages/PatientTracker';
import PatientShipmentForm from './pages/PatientShipmentForm';
import SetupPage from './pages/SetupPage';
import BookAppointment from './pages/BookAppointment';
import RescheduleAppointment from './pages/RescheduleAppointment';
import TrackCourier from './pages/TrackCourier';
import PurchasesPage from './pages/PurchasesPage';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 max-w-md w-full text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">!</div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-500 mb-6">{this.state.error?.message || 'An unexpected error occurred.'}</p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm"
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={() => { window.location.href = '/dashboard'; }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ClinicProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/admin/setup" element={<SetupPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/tv" element={<WaitingRoom />} />
            <Route path="/track" element={<PatientTracker />} />
            <Route path="/shipment" element={<PatientShipmentForm />} />
            <Route path="/shipment-form" element={<PatientShipmentForm />} />
            <Route path="/book-appointment" element={<BookAppointment />} />
            <Route path="/book" element={<BookAppointment />} />
            <Route path="/reschedule" element={<RescheduleAppointment />} />
            <Route path="/track-courier" element={<TrackCourier />} />
            <Route path="/track-order" element={<TrackCourier />} />
            <Route path="/courier-tracking" element={<TrackCourier />} />
            <Route path="/purchases" element={<PurchasesPage />} />
            <Route path="/purchase" element={<PurchasesPage />} />
            <Route path="/invoices" element={<PurchasesPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ClinicProvider>
    </ErrorBoundary>
  );
}

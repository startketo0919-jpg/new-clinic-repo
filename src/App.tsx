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

export default function App() {
  return (
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
          <Route path="/courier-form" element={<PatientShipmentForm />} />
        </Routes>
      </BrowserRouter>
    </ClinicProvider>
  );
}

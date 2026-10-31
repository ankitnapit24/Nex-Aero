import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/Layout/AppShell';
import Dashboard from './pages/Dashboard';
import EngineDetails from './pages/EngineDetails';
import Predictions from './pages/Predictions';
import Maintenance from './pages/Maintenance';
import ModelAnalytics from './pages/ModelAnalytics';
import AnomalyDetection from './pages/AnomalyDetection';
import PredictionHistory from './pages/PredictionHistory';
import SystemHealth from './pages/SystemHealth';

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/engines" element={<EngineDetails />} />
          <Route path="/engines/:id" element={<EngineDetails />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/analytics" element={<ModelAnalytics />} />
          <Route path="/anomalies" element={<AnomalyDetection />} />
          <Route path="/history" element={<PredictionHistory />} />
          <Route path="/system" element={<SystemHealth />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/Layout/AppShell';
import Dashboard from './pages/Dashboard';
import EngineFleet from './pages/EngineFleet';
import EngineDetails from './pages/EngineDetails';
import Predictions from './pages/Predictions';
import AnomalyDetection from './pages/AnomalyDetection';
import Maintenance from './pages/Maintenance';
import PredictionHistory from './pages/PredictionHistory';

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/engines" element={<EngineFleet />} />
          <Route path="/engines/:id" element={<EngineDetails />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/anomalies" element={<AnomalyDetection />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/history" element={<PredictionHistory />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import Dashboard from './pages/Dashboard';
import EngineDetails from './pages/EngineDetails';
import Predictions from './pages/Predictions';
import Maintenance from './pages/Maintenance';
import ModelAnalytics from './pages/ModelAnalytics';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-cyan-500 selection:text-white">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/engines" element={<EngineDetails />} />
            <Route path="/engines/:id" element={<EngineDetails />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/analytics" element={<ModelAnalytics />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

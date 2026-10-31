import React, { useEffect, useState } from 'react';
import { Activity, ArrowUpRight, Languages, Menu, Moon, Sun, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import api, { getApiErrorMessage } from '../../services/api';
import { usePreferences } from '../../i18n/Preferences';

const navigation = [
  { label: 'Overview', to: '/', end: true },
  { label: 'Engines', to: '/engines' },
  { label: 'Predictions', to: '/predictions' },
  { label: 'Anomaly detection', to: '/anomalies' },
  { label: 'Maintenance', to: '/maintenance' },
  { label: 'History', to: '/history' },
];

export default function AppShell({ children }) {
  const { theme, setTheme, language, setLanguage, t } = usePreferences();
  const [health, setHealth] = useState({ state: 'checking', modelLoaded: false });
  const [healthError, setHealthError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const checkHealth = async () => {
      try {
        const result = await api.getHealth();
        if (active) {
          setHealth({ state: result.status === 'online' ? 'online' : 'offline', modelLoaded: Boolean(result.model_loaded) });
          setHealthError('');
        }
      } catch (error) {
        if (active) {
          setHealth({ state: 'offline', modelLoaded: false });
          setHealthError(getApiErrorMessage(error));
        }
      }
    };
    checkHealth();
    const interval = window.setInterval(checkHealth, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    document.title = language === 'hi'
      ? 'एयरोगार्ड AI — इंजन स्वास्थ्य जानकारी'
      : 'AeroGuard AI — Engine Health Intelligence';
  }, [language]);

  const closeMenu = () => setMenuOpen(false);
  const healthLabel = t(health.state === 'checking'
    ? 'Checking system'
    : health.state === 'offline'
      ? 'Backend unavailable'
      : health.modelLoaded
        ? 'Model ready'
        : 'Model unavailable');

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <NavLink to="/" className="brand" onClick={closeMenu} aria-label={t('AeroGuard AI overview')}>
            <span className="brand-mark"><Activity size={17} strokeWidth={2.2} /></span>
            <span>AeroGuard <span className="brand-light">AI</span></span>
          </NavLink>
          <button
            className="mobile-menu-button"
            type="button"
            aria-label={t(menuOpen ? 'Close navigation' : 'Open navigation')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <nav className={`main-nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Main navigation">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={closeMenu}
                className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
              >
                {t(item.label)}
              </NavLink>
            ))}
          </nav>
          <div className="header-preferences">
            <button
              className="preference-button"
              type="button"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              aria-label={t(theme === 'light' ? 'Dark theme' : 'Light theme')}
              title={t(theme === 'light' ? 'Dark theme' : 'Light theme')}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <label className="language-control">
              <Languages size={15} aria-hidden="true" />
              <span className="sr-only">{t('Language')}</span>
              <select aria-label={t('Language')} value={language} onChange={(event) => setLanguage(event.target.value)}>
                <option value="en">EN</option>
                <option value="hi">हिन्दी</option>
              </select>
            </label>
          </div>
          <div className="header-status" title={healthError || undefined} aria-live="polite">
            <span className={`status-dot status-${health.state}`} />
            <span>{healthLabel}</span>
            <ArrowUpRight size={13} className="status-arrow" aria-hidden="true" />
          </div>
        </div>
      </header>
      <main className="main-content">{children}</main>
      <footer className="site-footer">
        <span>AeroGuard AI · NASA C-MAPSS FD001</span>
        <span>{t('Research prototype · Not for flight operations')}</span>
      </footer>
    </div>
  );
}

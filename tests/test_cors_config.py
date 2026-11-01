"""
Tests for robust CORS_ORIGINS parsing in Settings and FastAPI initialization.
Verifies support for both comma-separated strings and JSON arrays from environment variables.
"""

import os
import sys
from importlib import reload
import pytest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

def test_cors_comma_separated_env(monkeypatch):
    """Test Render-style comma-separated environment variable string."""
    monkeypatch.setenv("CORS_ORIGINS", "https://nex-aero.vercel.app, http://localhost:5173, https://app.example.com")
    import backend.app.core.config as config_module
    reload(config_module)

    settings = config_module.Settings()
    assert isinstance(settings.CORS_ORIGINS, list)
    assert settings.CORS_ORIGINS == [
        "https://nex-aero.vercel.app",
        "http://localhost:5173",
        "https://app.example.com"
    ]

def test_cors_json_array_env(monkeypatch):
    """Test JSON array formatted environment variable string."""
    monkeypatch.setenv("CORS_ORIGINS", '["https://nex-aero.vercel.app", "http://localhost:5173"]')
    import backend.app.core.config as config_module
    reload(config_module)

    settings = config_module.Settings()
    assert isinstance(settings.CORS_ORIGINS, list)
    assert settings.CORS_ORIGINS == [
        "https://nex-aero.vercel.app",
        "http://localhost:5173"
    ]

def test_cors_default_preserves_local_development(monkeypatch):
    """Test that default local development origins are preserved when env var is absent."""
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    import backend.app.core.config as config_module
    reload(config_module)

    settings = config_module.Settings()
    assert isinstance(settings.CORS_ORIGINS, list)
    assert "http://localhost:5173" in settings.CORS_ORIGINS
    assert "http://127.0.0.1:5173" in settings.CORS_ORIGINS

def test_fastapi_app_startup_with_render_env(monkeypatch):
    """Simulate exact Render Free production environment variables and verify app import."""
    monkeypatch.setenv("PORT", "10000")
    monkeypatch.setenv("HOST", "0.0.0.0")
    monkeypatch.setenv("CORS_ORIGINS", "https://nex-aero.vercel.app,http://localhost:5173")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///./data/nex_aero.db")
    
    import backend.app.core.config as config_module
    reload(config_module)
    import backend.app.main as main_module
    reload(main_module)

    app = main_module.app
    assert app.title == "Nex Aero"
    assert config_module.settings.CORS_ORIGINS == [
        "https://nex-aero.vercel.app",
        "http://localhost:5173"
    ]

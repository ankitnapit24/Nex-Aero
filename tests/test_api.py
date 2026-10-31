"""
AeroGuard AI - Backend API Integration Tests
Directly tests API route handlers, database persistence, and validation logic.
"""

import os
import sys
import pytest
from fastapi import HTTPException

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.app.api.routes.health import get_health
from backend.app.api.routes.engine import get_engines, get_engine
from backend.app.api.routes.prediction import predict_rul, get_prediction_history, get_model_metadata
from backend.app.schemas.prediction import TelemetryInput
from backend.app.database.session import SessionLocal

@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    yield session
    session.close()

def test_api_health():
    res = get_health()
    assert res["status"] == "online"
    assert res["model_loaded"] is True
    assert res["metadata_loaded"] is True
    assert "disclaimer" in res

def test_list_engines():
    engines = get_engines()
    assert len(engines) == 100
    first = engines[0]
    assert first.engine_id > 0
    assert first.predicted_rul is not None
    assert first.urgency_tier in ["CRITICAL", "WARNING", "MODERATE", "NOMINAL"]

def test_get_single_engine():
    detail = get_engine(1)
    assert detail.engine_id == 1
    assert len(detail.telemetry_history) > 0
    assert detail.urgency_tier in ["CRITICAL", "WARNING", "MODERATE", "NOMINAL"]
    assert detail.recommendation is not None

def test_get_invalid_engine():
    with pytest.raises(HTTPException) as exc:
        get_engine(999)
    assert exc.value.status_code == 404

def test_predict_and_persistence(db):
    payload = TelemetryInput(
        engine_id=1,
        cycle=100,
        setting_1=-0.0007,
        setting_2=-0.0004,
        setting_3=100.0,
        sensor_2=642.5,
        sensor_3=1585.0,
        sensor_4=1400.0,
        sensor_6=21.61,
        sensor_7=554.0,
        sensor_8=2388.05,
        sensor_9=9050.0,
        sensor_11=47.3,
        sensor_12=521.8,
        sensor_13=2388.08,
        sensor_14=8130.0,
        sensor_15=8.42,
        sensor_17=392.0,
        sensor_20=39.0,
        sensor_21=23.4
    )
    result = predict_rul(payload, db=db)
    assert result["engine_id"] == 1
    assert result["predicted_rul_cycles"] >= 0.0
    assert result["urgency_tier"] in ["CRITICAL", "WARNING", "MODERATE", "NOMINAL"]

    # Verify persisted in database
    history = get_prediction_history(limit=5, db=db)
    assert len(history) >= 1
    assert history[0].engine_id == 1

def test_model_metadata():
    meta = get_model_metadata()
    assert meta["model_name"] == "RandomForestRegressor_FD001"
    assert "cv_validation_metrics" in meta
    assert "nasa_test_metrics" in meta

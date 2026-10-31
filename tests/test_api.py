"""
Nex Aero - Backend API Integration Tests
Directly tests API route handlers, database persistence, replay simulation, and anomaly detection.
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
from backend.app.api.routes.prediction import (
    predict_rul,
    get_prediction_history,
    get_model_metadata,
    replay_engine_history,
    get_anomalies,
    explain_engine_prediction
)
from backend.app.api.routes.alert import list_alerts, create_alert, update_alert_status
from backend.app.schemas.prediction import TelemetryInput
from backend.app.schemas.alert import AlertCreate, AlertUpdate
from backend.app.database.session import SessionLocal

@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    yield session
    session.close()

def test_api_health():
    res = get_health()
    assert res["status"] == "online"
    assert res["system_state"] in ["ONLINE", "DEGRADED"]
    assert res["database_status"] == "CONNECTED"
    assert res["rul_model_status"] == "LOADED"
    assert res["anomaly_detector_status"] == "LOADED"
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
    assert detail.telemetry_history[-1].sensor_6 is not None
    assert detail.urgency_tier in ["CRITICAL", "WARNING", "MODERATE", "NOMINAL"]
    assert detail.recommendation is not None
    # Verify sensor_6 data integrity in telemetry history
    first_pt = detail.telemetry_history[0]
    assert hasattr(first_pt, "sensor_6")
    assert isinstance(first_pt.sensor_6, float)
    assert first_pt.sensor_6 > 20.0  # nominal ~21.61 psia

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
    assert "anomaly_score" in result
    assert "is_anomalous" in result
    assert "top_sensor_drifts" in result

    # Verify persisted in database
    history = get_prediction_history(limit=5, db=db)
    assert len(history) >= 1
    assert history[0].engine_id == 1

def test_model_metadata():
    meta = get_model_metadata()
    assert meta["model_name"] == "RandomForestRegressor_FD001"
    assert "cv_validation_metrics" in meta
    assert "nasa_test_metrics" in meta
    assert isinstance(meta["anomaly_detector_loaded"], bool)

def test_replay_endpoint():
    res = replay_engine_history(engine_id=34, sample_stride=10)
    assert res["engine_id"] == 34
    assert res["mode"] == "SIMULATED_HISTORICAL_REPLAY"
    assert "timeline_steps" in res
    assert len(res["timeline_steps"]) > 0
    first_step = res["timeline_steps"][0]
    assert "predicted_rul" in first_step
    assert "is_anomalous" in first_step
    assert "anomaly_score" in first_step
    assert "top_sensor_drifts" in first_step
    assert "key_telemetry" in first_step

def test_anomaly_detection_endpoint():
    res = get_anomalies(limit=10)
    assert res["status"] == "success"
    assert res["total_evaluated"] >= 10
    assert "detector_algorithm" in res
    assert len(res["items"]) <= 10
    if len(res["items"]) > 0:
        item = res["items"][0]
        assert "engine_id" in item
        assert "is_anomalous" in item
        assert "predicted_rul" in item

def test_explainability_endpoint():
    res = explain_engine_prediction(engine_id=1)
    assert res["engine_id"] == 1
    assert "explanation" in res
    exp = res["explanation"]
    assert exp["method"] in ["TreeSHAP", "FeatureImportanceFallback"]
    assert "contributions" in exp
    assert len(exp["contributions"]) > 0
    first_contrib = exp["contributions"][0]
    assert "feature" in first_contrib
    assert "shap_value" in first_contrib
    assert "direction" in first_contrib

def test_alerts_lifecycle(db):
    # Test listing and seeding
    alert_list = list_alerts(limit=50, db=db)
    assert alert_list.total_count >= 0
    assert hasattr(alert_list, "open_count")

    # Test creating custom alert
    payload = AlertCreate(
        engine_id=99,
        cycle=120,
        predicted_rul=18.5,
        risk_level="CRITICAL",
        trigger_reason="Test alert creation",
        threshold_value=25.0
    )
    new_alert = create_alert(payload, db=db)
    assert new_alert.id > 0
    assert new_alert.status == "OPEN"

    # Test updating alert status
    updated = update_alert_status(new_alert.id, AlertUpdate(status="ACKNOWLEDGED"), db=db)
    assert updated.status == "ACKNOWLEDGED"
    assert updated.acknowledged_at is not None

    resolved = update_alert_status(new_alert.id, AlertUpdate(status="RESOLVED"), db=db)
    assert resolved.status == "RESOLVED"
    assert resolved.resolved_at is not None

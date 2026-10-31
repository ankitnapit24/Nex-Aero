"""
Nex Aero - Unit Tests for ML Inference and Prediction Service
"""

import os
import sys
import pytest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ml.inference.predictor import RULPredictor

def test_inference_and_clamping():
    """Validates inference behavior on a representative telemetry reading."""
    model_path = os.path.join(BASE_DIR, "ml", "models", "rf_fd001_pipeline.joblib")
    if not os.path.exists(model_path):
        pytest.skip("Model artifact not yet generated, skipping inference test.")

    predictor = RULPredictor()
    
    # Construct a sample reading matching schema
    sample_input = {
        "cycle": 150,
        "setting_1": -0.0007,
        "setting_2": -0.0004,
        "setting_3": 100.0,
        "sensor_2": 642.5,
        "sensor_3": 1585.0,
        "sensor_4": 1400.0,
        "sensor_6": 21.61,
        "sensor_7": 554.0,
        "sensor_8": 2388.05,
        "sensor_9": 9050.0,
        "sensor_11": 47.3,
        "sensor_12": 521.8,
        "sensor_13": 2388.08,
        "sensor_14": 8130.0,
        "sensor_15": 8.42,
        "sensor_17": 392.0,
        "sensor_20": 39.0,
        "sensor_21": 23.4
    }

    result = predictor.predict_single_row(sample_input, engine_id=42)
    
    assert "predicted_rul_cycles" in result
    assert result["predicted_rul_cycles"] >= 0.0
    assert result["urgency_tier"] in ["CRITICAL", "WARNING", "MODERATE", "NOMINAL"]
    assert len(result["recommendation"]) > 10
    assert "disclaimer" in result

def test_urgency_tier_boundaries():
    """Verify tier assignment logic."""
    model_path = os.path.join(BASE_DIR, "ml", "models", "rf_fd001_pipeline.joblib")
    if not os.path.exists(model_path):
        pytest.skip("Model artifact not yet generated.")

    predictor = RULPredictor()
    
    tier_crit, _ = predictor.assess_urgency(15.0)
    assert tier_crit == "CRITICAL"
    
    tier_warn, _ = predictor.assess_urgency(35.0)
    assert tier_warn == "WARNING"
    
    tier_mod, _ = predictor.assess_urgency(65.0)
    assert tier_mod == "MODERATE"
    
    tier_nom, _ = predictor.assess_urgency(95.0)
    assert tier_nom == "NOMINAL"

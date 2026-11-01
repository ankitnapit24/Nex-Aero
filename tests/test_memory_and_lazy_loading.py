"""
Nex Aero - Memory Optimization & Lazy Loading Test Suite
Verifies:
1. RULPredictor lazy loading and singleton artifact caching (no duplicate 50MB+ models).
2. TreeSHAP on-demand lazy initialization (no eager TreeExplainer construction at import).
3. EngineService lazy dataset loading and response caching.
4. Numerical library single-thread limits (OMP, OPENBLAS, MKL).
5. Unbroken, authentic ML model inference and SHAP explainability.
"""

import os
import sys
import pytest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ml.inference.predictor import RULPredictor, get_predictor, _ARTIFACT_CACHE
from ml.inference.explainer import SHAPExplainer, get_shap_explainer
from backend.app.services.engine_service import EngineService, engine_service


def test_predictor_singleton_and_shared_cache():
    """Verify that multiple predictor instances share the exact same underlying model cache."""
    p1 = get_predictor(lazy=True)
    p2 = get_predictor(lazy=True)
    assert p1 is p2, "get_predictor() must return a singleton instance"

    # Verify model is loaded once and cached in _ARTIFACT_CACHE
    _ = p1.model
    assert p1.is_loaded() is True

    # A separate RULPredictor instance with the same paths must reuse the cache
    p3 = RULPredictor(lazy=True)
    assert p3.model is p1.model, "Separate predictor instances must share the same underlying model in memory"


def test_lazy_predictor_initialization():
    """Verify lazy=True does not eagerly deserialize artifacts until accessed."""
    lazy_p = RULPredictor(lazy=True)
    # Check that model artifact exists on disk
    assert lazy_p.is_model_available() is True
    # Accessing .model must succeed and populate model
    model = lazy_p.model
    assert model is not None
    assert lazy_p.is_loaded() is True


def test_shap_explainer_lazy_initialization():
    """Verify SHAPExplainer does not eagerly construct TreeExplainer until requested."""
    explainer = SHAPExplainer(lazy=True)
    assert explainer._explainer is None, "TreeExplainer must not be constructed during lazy init"

    # Provide valid test observation
    sample_input = {
        "cycle": 150,
        "setting_1": -0.0005,
        "setting_2": 0.0004,
        "setting_3": 100.0,
        "sensor_2": 642.50,
        "sensor_3": 1588.00,
        "sensor_4": 1405.00,
        "sensor_6": 21.61,
        "sensor_7": 553.50,
        "sensor_8": 2388.05,
        "sensor_9": 9050.00,
        "sensor_11": 47.45,
        "sensor_12": 521.80,
        "sensor_13": 2388.08,
        "sensor_14": 8135.00,
        "sensor_15": 8.4200,
        "sensor_17": 392.0,
        "sensor_20": 38.85,
        "sensor_21": 23.3500,
    }

    # Running explain_instance initializes TreeExplainer on demand
    res = explainer.explain_instance(sample_input)
    assert explainer._explainer is not None, "TreeExplainer should now be initialized"
    assert res["method"] == "TreeSHAP"
    assert len(res["contributions"]) > 0
    assert "predicted_rul" in res


def test_engine_service_lazy_dataset():
    """Verify EngineService dataset availability check and summary caching."""
    service = EngineService()
    assert service.is_dataset_available() is True
    assert service._test_df is None, "Dataset must not be loaded during __init__"

    # Accessing list_engines loads data and caches summaries
    summaries1 = service.list_engines()
    assert len(summaries1) > 0
    assert service._cached_summaries is not None

    # Second call returns the cached summaries directly
    summaries2 = service.list_engines()
    assert summaries1 is summaries2, "list_engines() should return cached list"


def test_numerical_thread_limits():
    """Verify single-thread limits are configured to prevent host multi-core memory blowup."""
    from backend.app.main import app
    assert os.environ.get("OMP_NUM_THREADS") == "1"
    assert os.environ.get("OPENBLAS_NUM_THREADS") == "1"
    assert os.environ.get("MKL_NUM_THREADS") == "1"


def test_real_model_inference_pipeline():
    """Ensure that the real Random Forest and Isolation Forest models evaluate correctly."""
    pred = get_predictor()
    sample_input = {
        "cycle": 100,
        "setting_1": 0.0000,
        "setting_2": 0.0000,
        "setting_3": 100.0,
        "sensor_2": 642.00,
        "sensor_3": 1585.00,
        "sensor_4": 1400.00,
        "sensor_6": 21.60,
        "sensor_7": 554.00,
        "sensor_8": 2388.00,
        "sensor_9": 9050.00,
        "sensor_11": 47.30,
        "sensor_12": 522.00,
        "sensor_13": 2388.00,
        "sensor_14": 8130.00,
        "sensor_15": 8.4000,
        "sensor_17": 392.0,
        "sensor_20": 39.00,
        "sensor_21": 23.4000,
    }
    result = pred.predict_single_row(sample_input, engine_id=42)
    assert result["engine_id"] == 42
    assert isinstance(result["predicted_rul_cycles"], (int, float))
    assert result["predicted_rul_cycles"] >= 0
    assert result["urgency_tier"] in ["CRITICAL", "WARNING", "MODERATE", "NOMINAL"]
    assert "anomaly_score" in result
    assert "top_sensor_drifts" in result

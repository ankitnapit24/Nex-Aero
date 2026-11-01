"""
Nex Aero - Deployment Smoke Test Suite
Verifies that a live deployed backend instance (Render, Railway, or external staging)
is operating correctly across all endpoints, model inferences, and persistence layers.

Usage:
    python scripts/deployment_smoke_test.py --url https://nex-aero-api.onrender.com
    or set NEX_AERO_API_URL environment variable:
    export NEX_AERO_API_URL=https://nex-aero-api.onrender.com
    python scripts/deployment_smoke_test.py
"""

import sys
import os
import argparse
import time
import httpx

DEFAULT_URL = os.environ.get("NEX_AERO_API_URL", "http://localhost:8000")

def run_smoke_tests(base_url: str):
    base_url = base_url.rstrip("/")
    print("=" * 68)
    print(f"Nex Aero - Cloud Deployment Smoke Test Suite")
    print(f"Target Base URL: {base_url}")
    print("=" * 68)

    client = httpx.Client(base_url=base_url, timeout=30.0)
    tests_passed = 0
    tests_failed = 0

    def record_test(name: str, check_fn):
        nonlocal tests_passed, tests_failed
        t0 = time.time()
        try:
            check_fn()
            elapsed_ms = (time.time() - t0) * 1000
            print(f"[PASS] {name:40s} ({elapsed_ms:6.1f} ms)")
            tests_passed += 1
        except Exception as exc:
            elapsed_ms = (time.time() - t0) * 1000
            print(f"[FAIL] {name:40s} ({elapsed_ms:6.1f} ms) -> {exc}")
            tests_failed += 1

    # 1. Root /
    def test_root():
        res = client.get("/")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        assert "Nex Aero" in data.get("message", "") or data.get("status") == "online"
    record_test("Root Gateway Endpoint (/)", test_root)

    # 2. Comprehensive Health Check (/api/health)
    def test_health():
        res = client.get("/api/health")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        assert data.get("status") == "online", f"Status is not online: {data}"
        assert data.get("rul_model_status") == "LOADED", f"RUL model not loaded: {data}"
        assert data.get("database_status") == "CONNECTED", f"Database not connected: {data}"
    record_test("System Health Endpoint (/api/health)", test_health)

    # 3. Liveness Probe (/api/health/live)
    def test_liveness():
        res = client.get("/api/health/live")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        assert res.json().get("status") == "alive"
    record_test("Liveness Probe (/api/health/live)", test_liveness)

    # 4. Readiness Probe (/api/health/ready)
    def test_readiness():
        res = client.get("/api/health/ready")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        assert res.json().get("ready") is True
    record_test("Readiness Probe (/api/health/ready)", test_readiness)

    # 5. Model Metadata (/api/model-metadata)
    def test_metadata():
        res = client.get("/api/model-metadata")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        assert "features" in data
        assert len(data["features"]) >= 14
    record_test("Model Metadata (/api/model-metadata)", test_metadata)

    # 6. Engine Fleet Catalog (/api/engines)
    def test_engines():
        res = client.get("/api/engines")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        engines = res.json()
        assert isinstance(engines, list)
        assert len(engines) > 0, "Expected at least 1 engine"
    record_test("Engine Fleet Listing (/api/engines)", test_engines)

    # 7. Single Engine Telemetry (/api/engines/1)
    def test_single_engine():
        res = client.get("/api/engines/1")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        assert data.get("engine_id") == 1
        assert "telemetry_history" in data
        assert len(data["telemetry_history"]) > 0
    record_test("Single Engine Detail (/api/engines/1)", test_single_engine)

    # 8. Real-Time Inference & Persistence (/api/predict)
    def test_predict():
        payload = {
            "engine_id": 1,
            "cycle": 192,
            "setting_1": -0.0007,
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
            "sensor_21": 23.3500
        }
        res = client.post("/api/predict", json=payload)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "predicted_rul_cycles" in data
        assert data["predicted_rul_cycles"] >= 0
        assert data["urgency_tier"] in ["CRITICAL", "WARNING", "MODERATE", "NOMINAL"]
    record_test("ML Inference (/api/predict)", test_predict)

    # 9. Prediction History Audit Trail (/api/predictions)
    def test_predictions_history():
        res = client.get("/api/predictions?limit=10")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        records = res.json()
        assert isinstance(records, list)
        assert len(records) > 0, "Prediction history should have at least 1 record"
    record_test("Prediction History (/api/predictions)", test_predictions_history)

    # 10. Persistent Alerts Workflow (/api/alerts)
    def test_alerts():
        res = client.get("/api/alerts")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        assert "total_count" in data
        assert "alerts" in data
    record_test("Maintenance Alerts (/api/alerts)", test_alerts)

    # 11. Anomaly Detection (/api/anomalies)
    def test_anomalies():
        res = client.get("/api/anomalies?limit=10")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        assert data.get("status") == "success"
        assert "items" in data
    record_test("Anomaly Detection (/api/anomalies)", test_anomalies)

    # 12. Local TreeSHAP Explanation (/api/explain/1)
    def test_explain():
        res = client.get("/api/explain/1")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        assert "explanation" in data
        assert "contributions" in data["explanation"]
    record_test("TreeSHAP Local Explainability (/api/explain/1)", test_explain)

    print("=" * 68)
    print(f"Results Summary: {tests_passed} passed, {tests_failed} failed.")
    print("=" * 68)

    client.close()
    return tests_failed == 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Nex Aero Cloud Deployment Smoke Test Suite")
    parser.add_argument("--url", default=DEFAULT_URL, help=f"Base URL of API (default: {DEFAULT_URL})")
    args = parser.parse_args()

    success = run_smoke_tests(args.url)
    sys.exit(0 if success else 1)

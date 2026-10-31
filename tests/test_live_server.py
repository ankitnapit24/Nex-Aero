import urllib.request
import json
import socket
import pytest

def is_socket_allowed():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.5)
        s.connect(("127.0.0.1", 8000))
        s.close()
        return True
    except Exception:
        return False

@pytest.mark.skipif(not is_socket_allowed(), reason="Live HTTP socket connection to 127.0.0.1:8000 not permitted in current sandbox mode")
def test_live_endpoints():
    def fetch(url, method="GET", data=None):
        req = urllib.request.Request(url, method=method)
        if data:
            req.add_header("Content-Type", "application/json")
            body = json.dumps(data).encode("utf-8")
        else:
            body = None
        with urllib.request.urlopen(req, data=body) as response:
            return response.status, json.loads(response.read().decode())

    # Health
    status, h = fetch("http://127.0.0.1:8000/api/health")
    assert status == 200
    assert h["system_state"] == "ONLINE"
    assert h["rul_model_status"] == "LOADED"
    assert h["anomaly_detector_status"] == "LOADED"
    assert h["database_status"] == "CONNECTED"

    # Engines
    status, engines = fetch("http://127.0.0.1:8000/api/engines")
    assert status == 200
    assert len(engines) == 100

    # Single Engine & Sensor_6
    status, e1 = fetch("http://127.0.0.1:8000/api/engines/1")
    assert status == 200
    assert "telemetry_history" in e1
    assert "sensor_6" in e1["telemetry_history"][0]
    assert e1["telemetry_history"][0]["sensor_6"] > 20.0

    # Anomalies
    status, anom = fetch("http://127.0.0.1:8000/api/anomalies?limit=5")
    assert status == 200
    assert anom["status"] == "success"
    assert len(anom["items"]) <= 5
    assert "top_sensor_drifts" in anom["items"][0]

    # SHAP Explanations
    status, exp = fetch("http://127.0.0.1:8000/api/explain/1")
    assert status == 200
    assert exp["explanation"]["method"] == "TreeSHAP"
    assert len(exp["explanation"]["contributions"]) > 0

    # Alerts List & Status Update
    status, alerts = fetch("http://127.0.0.1:8000/api/alerts")
    assert status == 200
    assert alerts["total_count"] > 0
    first_id = alerts["alerts"][0]["id"]

    status, updated = fetch(f"http://127.0.0.1:8000/api/alerts/{first_id}", method="PATCH", data={"status": "ACKNOWLEDGED"})
    assert status == 200
    assert updated["status"] == "ACKNOWLEDGED"

if __name__ == "__main__":
    test_live_endpoints()
    print("ALL LIVE ENDPOINT TESTS PASSED!")

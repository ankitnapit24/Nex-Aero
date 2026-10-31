# AeroGuard AI - REST API Documentation

AeroGuard AI exposes high-performance RESTful APIs built on FastAPI to serve real-time Remaining Useful Life (RUL) inference, telemetry streaming, unsupervised anomaly detection, TreeSHAP local explainability, persistent maintenance alerts, and degradation replay simulation.

## Base URL
- Default local server: `http://localhost:8000`
- Interactive Swagger UI: `http://localhost:8000/docs`
- Redoc Documentation: `http://localhost:8000/redoc`

---

## 1. System Health & Readiness Probe
`GET /api/health`

Returns operational system state, database connectivity status, and ML model artifact health.

### Example Response:
```json
{
  "status": "online",
  "system_state": "ONLINE",
  "service": "AeroGuard AI",
  "version": "1.0.0",
  "model_loaded": true,
  "metadata_loaded": true,
  "database_status": "CONNECTED",
  "rul_model_status": "LOADED",
  "anomaly_detector_status": "LOADED",
  "disclaimer": "Experimental decision-support prototype. Outputs do NOT certify airworthiness or authorize maintenance."
}
```

---

## 2. List Fleet Engines
`GET /api/engines`

Lists all 100 test engines in the evaluation fleet, sorted by maintenance urgency (lowest predicted RUL first).

### Example Response:
```json
[
  {
    "engine_id": 34,
    "dataset_split": "test",
    "total_cycles": 203,
    "last_cycle": 203,
    "predicted_rul": 7.1,
    "true_rul": 7.0,
    "urgency_tier": "CRITICAL"
  },
  {
    "engine_id": 81,
    "dataset_split": "test",
    "total_cycles": 240,
    "last_cycle": 240,
    "predicted_rul": 9.4,
    "true_rul": 8.0,
    "urgency_tier": "CRITICAL"
  }
]
```

---

## 3. Engine Detail & Telemetry Curves
`GET /api/engines/{engine_id}`

Retrieves complete multi-sensor telemetry history (including `sensor_6` bypass-duct pressure) from cycle 1 to terminal recorded cycle.

### Example Response:
```json
{
  "engine_id": 34,
  "dataset_split": "test",
  "last_cycle": 203,
  "predicted_rul": 7.1,
  "true_rul": 7.0,
  "urgency_tier": "CRITICAL",
  "recommendation": "IMMEDIATE ENGINEERING REVIEW: HPC degradation signature indicates imminent operational limit. Flag for engineering review and borescope inspection by authorized aviation maintenance personnel according to applicable technical manual.",
  "telemetry_history": [
    {
      "cycle": 1,
      "setting_1": -0.0003,
      "setting_2": 0.0002,
      "setting_3": 100.0,
      "sensor_2": 642.12,
      "sensor_3": 1582.4,
      "sensor_4": 1399.1,
      "sensor_6": 21.61,
      "sensor_7": 554.8,
      "sensor_8": 2388.02,
      "sensor_9": 9053.4,
      "sensor_11": 47.2,
      "sensor_12": 521.8,
      "sensor_13": 2388.05,
      "sensor_14": 8132.0,
      "sensor_15": 8.41,
      "sensor_17": 391.0,
      "sensor_20": 39.02,
      "sensor_21": 23.41
    }
  ]
}
```

---

## 4. Real-Time Model Inference
`POST /api/predict`

Validates input multi-channel sensor readings, passes them to the fitted RandomForest pipeline, evaluates Isolation Forest anomaly status, persists an audit log to SQLite, and returns predicted Remaining Useful Life and review-oriented maintenance advisory.

### Request Body:
```json
{
  "engine_id": 34,
  "cycle": 203,
  "setting_1": -0.0007,
  "setting_2": -0.0004,
  "setting_3": 100.0,
  "sensor_2": 643.5,
  "sensor_3": 1601.2,
  "sensor_4": 1423.8,
  "sensor_6": 21.61,
  "sensor_7": 551.4,
  "sensor_8": 2388.2,
  "sensor_9": 9088.1,
  "sensor_11": 47.8,
  "sensor_12": 520.1,
  "sensor_13": 2388.22,
  "sensor_14": 8165.4,
  "sensor_15": 8.51,
  "sensor_17": 395.0,
  "sensor_20": 38.6,
  "sensor_21": 23.1
}
```

### Response Body:
```json
{
  "engine_id": 34,
  "cycle": 203,
  "predicted_rul_cycles": 7.1,
  "raw_rul_cycles": 7.12,
  "urgency_tier": "CRITICAL",
  "is_anomalous": true,
  "anomaly_score": -0.082,
  "top_sensor_drifts": [
    {
      "feature": "sensor_4",
      "description": "LPT Outlet Temp (°R)",
      "current_value": 1423.8,
      "baseline_mean": 1400.1,
      "delta": 23.7,
      "z_score": 3.12,
      "abs_z": 3.12,
      "trend": "ELEVATED"
    }
  ],
  "recommendation": "IMMEDIATE ENGINEERING REVIEW: HPC degradation signature indicates imminent operational limit. Flag for engineering review and borescope inspection by authorized aviation maintenance personnel according to applicable technical manual.",
  "model_version": "1.0.0",
  "evaluated_at": "2026-10-31T09:06:50.123456+00:00",
  "disclaimer": "Experimental decision-support heuristic. Does NOT certify airworthiness or authorize maintenance."
}
```

---

## 5. Unsupervised Anomaly Detection
`GET /api/anomalies`

Evaluates multivariate sensor distributions against nominal baseline envelopes using an Isolation Forest trained on 3,000 healthy cycles.
Parameters:
- `engine_id` (optional int)
- `cycle` (optional int)
- `anomaly_only` (bool, default false)
- `limit` (int, default 100)
- `skip` (int, default 0)

### Example Response:
```json
{
  "status": "success",
  "total_evaluated": 100,
  "anomalies_detected": 14,
  "returned_count": 100,
  "detector_algorithm": "IsolationForest",
  "contamination_threshold": 0.05,
  "items": [
    {
      "engine_id": 34,
      "cycle": 203,
      "is_anomalous": true,
      "anomaly_score": -0.082,
      "predicted_rul": 7.1,
      "urgency_tier": "CRITICAL",
      "top_sensor_drifts": [ ... ],
      "recommendation": "...",
      "evaluated_at": "..."
    }
  ]
}
```

---

## 6. TreeSHAP Local Feature Explainability
`GET /api/explain/{engine_id}?cycle={cycle}` or `POST /api/explain`

Computes exact local TreeSHAP Shapley values for the Random Forest model, attributing the exact positive and negative cycle deviations of each physical sensor relative to the training population base value.

### Example Response:
```json
{
  "engine_id": 1,
  "cycle": 31,
  "true_rul_at_terminal": 112.0,
  "explanation": {
    "method": "TreeSHAP",
    "base_expected_value": 86.8,
    "predicted_rul": 124.0,
    "contributions": [
      {
        "feature": "cycle",
        "description": "Operating Cycle",
        "value": 31.0,
        "shap_value": 16.6837,
        "abs_impact": 16.6837,
        "direction": "INCREASES_RUL"
      },
      {
        "feature": "sensor_11",
        "description": "Static HPC Pressure (psia)",
        "value": 47.23,
        "shap_value": 10.4764,
        "abs_impact": 10.4764,
        "direction": "INCREASES_RUL"
      }
    ]
  }
}
```

---

## 7. Persistent Maintenance Alerts Lifecycle
- `GET /api/alerts`: List alerts with status filtering (`OPEN`, `ACKNOWLEDGED`, `RESOLVED`) and aggregate status counts.
- `POST /api/alerts`: Programmatically create a maintenance alert.
- `PATCH /api/alerts/{alert_id}`: Transition alert workflow status (`OPEN` -> `ACKNOWLEDGED` -> `RESOLVED`) with audit timestamps.
- `DELETE /api/alerts/{alert_id}`: Remove an alert record.

### Example Response:
```json
{
  "total_count": 28,
  "open_count": 24,
  "acknowledged_count": 3,
  "resolved_count": 1,
  "alerts": [
    {
      "id": 1,
      "engine_id": 34,
      "cycle": 203,
      "predicted_rul": 7.1,
      "risk_level": "CRITICAL",
      "trigger_reason": "Predicted RUL (7.1 cycles) below critical safety threshold (25.0 cycles). Immediate engineering inspection recommended.",
      "threshold_value": 25.0,
      "status": "OPEN",
      "created_at": "2026-10-31T11:45:00Z"
    }
  ]
}
```

---

## 8. Simulated Degradation Replay
`POST /api/demo/replay?engine_id={id}&sample_stride=5`

Generates historical timeline replay steps for an engine across its operational lifespan.
Notice: Clearly labeled as simulated historical replay; never represents live flight telemetry.

# AeroGuard AI - REST API Documentation

AeroGuard AI exposes high-performance RESTful APIs built on FastAPI to serve real-time Remaining Useful Life (RUL) inference, telemetry streaming, fleet triage, and prediction history.

## Base URL
- Default local server: `http://localhost:8000`
- Interactive Swagger UI: `http://localhost:8000/docs`
- Redoc Documentation: `http://localhost:8000/redoc`

---

## 1. Health & Readiness Probe
`GET /api/health`

Returns operational status, service metadata, and verifies that the serialized model artifact (`rf_fd001_pipeline.joblib`) is active.

### Example Response:
```json
{
  "status": "online",
  "service": "AeroGuard AI",
  "version": "1.0.0",
  "model_loaded": true,
  "metadata_loaded": true,
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

Retrieves historical sensor telemetry from cycle 1 to the last recorded cycle for interactive degradation plotting.

### Example Response:
```json
{
  "engine_id": 34,
  "dataset_split": "test",
  "last_cycle": 203,
  "predicted_rul": 7.1,
  "true_rul": 7.0,
  "urgency_tier": "CRITICAL",
  "recommendation": "IMMEDIATE ACTION RECOMMENDED: HPC stage degradation indicates imminent end-of-service...",
  "telemetry_history": [
    {
      "cycle": 1,
      "setting_1": -0.0003,
      "setting_2": 0.0002,
      "setting_3": 100.0,
      "sensor_2": 642.12,
      "sensor_3": 1582.4,
      "sensor_4": 1399.1,
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

Validates input multi-channel sensor readings, passes them to the fitted RandomForest pipeline, persists an audit log to SQLite, and returns predicted Remaining Useful Life and maintenance advisory.

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
  "recommendation": "IMMEDIATE ACTION RECOMMENDED: HPC stage degradation indicates imminent end-of-service. Recommend grounding aircraft for comprehensive borescope inspection and compressor blade acoustic audit.",
  "model_version": "1.0.0",
  "evaluated_at": "2026-10-31T09:06:50.123456+00:00",
  "disclaimer": "Experimental decision-support heuristic. Does NOT certify airworthiness or authorize maintenance."
}
```

---

## 5. Audit History
`GET /api/predictions?limit=50`

Returns historical inference executions recorded in the local SQLite database.

---

## 6. Model Metadata
`GET /api/model-metadata`

Returns serialized training hyperparameters, validation scores (5-fold GroupKFold), test set metrics, and feature importance dictionary.

# Nex Aero — Production Deployment Engineering Audit

**Document:** `docs/deployment-audit.md`  
**Date:** November 2026  
**Auditor:** Nex Aero Core Engineering & DevOps Architecture Team  
**Status:** ALL 14 AUDIT ITEMS RESOLVED & VERIFIED

---

## Executive Summary

An exhaustive pre-deployment engineering audit of the Nex Aero platform was conducted to identify any blockers that would prevent reliable production deployment across the target cloud architecture:
- **Frontend:** Vercel (React 19 + Vite 6 + Tailwind CSS v4)
- **Backend:** Render Web Service (FastAPI + Uvicorn, Python 3.11)
- **ML Pipeline:** NASA C-MAPSS FD001 Turbofan Dataset, Random Forest RUL Regressor, Isolation Forest Anomaly Detector, TreeSHAP Explainability
- **Persistence:** SQLite on Render Persistent Disk (`/var/data/nex_aero.db`)

---

## 14-Point Comprehensive Audit & Resolution Matrix

| # | Known Risk / Audit Item | Repository Inspection Findings | Engineering Remediation Implemented | Affected Files | Status |
|---|-------------------------|--------------------------------|--------------------------------------|----------------|--------|
| **1** | **Raw Dataset Exclusion**<br>NASA dataset files in `data/raw/` are excluded from Git by `.gitignore`. | Confirmed. `.gitignore` intentionally excludes `data/raw/*` to keep repository size lean. A fresh cloud container lacks raw data. | Implemented automated download with multiple redundant NASA archive mirrors in `scripts/download_dataset.py`, orchestrated automatically by `scripts/prepare_deployment.py`. | `scripts/download_dataset.py`, `scripts/prepare_deployment.py`, `.gitignore` | **RESOLVED** |
| **2** | **Model Binary Exclusion**<br>ML model artifacts under `ml/models/*.joblib` are excluded from Git. | Confirmed. Binary `.joblib` files are ignored to prevent large binary Git bloat. | Master orchestrator `scripts/prepare_deployment.py` automatically trains and verifies `rf_fd001_pipeline.joblib` and `iforest_fd001.joblib` during cloud build if missing. | `scripts/prepare_deployment.py`, `scripts/train_model.py`, `scripts/train_anomaly_detector.py` | **RESOLVED** |
| **3** | **Pre-Runtime Artifact Availability**<br>FastAPI backend requires ML model artifacts *before* starting. | Confirmed. If backend boots without artifacts, predictor initialization fails. Models must NOT be trained at server startup or during inference requests. | Added pre-startup build hook in `render.yaml` (`pip install -r requirements.txt && python scripts/prepare_deployment.py`). Startup verified before ASGI process launches. | `render.yaml`, `scripts/prepare_deployment.py` | **RESOLVED** |
| **4** | **Frontend Hardcoded Localhost**<br>Frontend may default to `localhost:8000` in production. | In `frontend/src/services/api.js`, fallback defaulted to `http://localhost:8000`. In production without `VITE_API_BASE_URL`, requests would fail. | Updated `api.js` to parse `VITE_API_BASE_URL` with warning log in production if undefined, and fallback to relative root paths. Configured `VITE_API_BASE_URL` in `frontend/.env.example` and `vercel.json`. | `frontend/src/services/api.js`, `frontend/.env.example`, `frontend/vercel.json`, `vercel.json` | **RESOLVED** |
| **5** | **SQLite Ephemeral Data Loss**<br>SQLite relative path defaults to local directory and loses data on ephemeral instances. | SQLite defaulted to `./aeroguard.db`. On ephemeral hosting like Render without persistent disk, data is deleted on redeploy. | Configured `DATABASE_URL` via environment variable to mount persistent disk (`sqlite:////var/data/nex_aero.db`). Added automatic parent directory creation in `backend/app/database/session.py` with 15s busy timeout. | `backend/app/database/session.py`, `backend/app/core/config.py`, `render.yaml` | **RESOLVED** |
| **6** | **CORS Env Var Parsing Failure**<br>Pydantic fails to parse `CORS_ORIGINS` when provided as comma-separated string. | Confirmed. Pydantic `List[str]` expects JSON string by default. Providing `https://nex-aero.vercel.app,http://localhost:5173` caused a startup crash. | Added `@field_validator("CORS_ORIGINS", mode="before")` supporting comma-separated strings, JSON arrays, and whitespace stripping. Verified via automated unit tests. | `backend/app/core/config.py`, `tests/test_api.py` | **RESOLVED** |
| **7** | **SHAP Missing from Requirements**<br>`shap` is imported by `explainer.py` but was missing from `requirements.txt`. | Confirmed. `shap` was not declared in root `requirements.txt` or `backend/requirements.txt`. | Added `shap>=0.44.0` to both `requirements.txt` and `backend/requirements.txt`. Tested TreeSHAP explanation generation. | `requirements.txt`, `backend/requirements.txt` | **RESOLVED** |
| **8** | **`sensor_6` Data Integrity**<br>`sensor_6` present in RF model but missing or hardcoded in schemas/frontend. | Inspected. Previously had static fallback (21.61) in replay. | Schema `EngineTelemetryPoint` now contains `sensor_6: float`. `EngineService` serializes real recorded observations. Frontend components consume dynamic sensor_6. | `backend/app/schemas/engine.py`, `backend/app/services/engine_service.py`, `tests/test_api.py` | **RESOLVED** |
| **9** | **Anomaly Feature Leakage**<br>Anomaly detector must NOT use `engine_id`, `cycle`, or `rul` target. | Verified. `ANOMALY_FEATURE_COLUMNS` strictly contains physical sensor and setting features (17 variables). Temporal `cycle` and identifier `engine_id` are completely excluded. | Preserved leak-free feature schema in `ml/config.py` and `scripts/train_anomaly_detector.py`. Verified baseline envelope trained on `cycle <= 30`. | `ml/config.py`, `scripts/train_anomaly_detector.py`, `ml/inference/predictor.py` | **RESOLVED** |
| **10** | **Real Anomaly Detector Results**<br>Anomaly page must use actual Isolation Forest scores rather than RUL proxy ranking. | Verified. Endpoint `GET /api/anomalies` executes `predictor.predict_single_row` which evaluates `isolation_model.decision_function()` and `predict()`. | Frontend `Anomalies.jsx` renders genuine Isolation Forest anomaly scores, contamination thresholds, and top sensor z-score drifts. | `backend/app/api/routes/prediction.py`, `frontend/src/pages/AnomalyDetection.jsx` | **RESOLVED** |
| **11** | **Explicit Missing Artifact State**<br>Missing model artifacts must produce explicit error/unavailable state, not fake score. | Inspected. If anomaly model is missing, predictor returns `anomaly_score: None` and `is_anomalous: False`. Missing RF model raises explicit `FileNotFoundError`. | Verified and tested via `test_predict_endpoint_allows_unavailable_anomaly_score`. Health check reports `UNAVAILABLE` or `DEGRADED`. | `ml/inference/predictor.py`, `backend/app/api/routes/health.py`, `tests/test_api.py` | **RESOLVED** |
| **12** | **Persistent Alert Acknowledgements**<br>Alert acknowledgement must not reside only in React state. | Previously acknowledged alerts disappeared on page reload. | SQLAlchemy `Alert` model with fields `status`, `created_at`, `updated_at`, `acknowledged_at`, and `resolved_at` in SQLite. Endpoints `GET`, `POST`, `PATCH`, `DELETE` fully operational. | `backend/app/database/models.py`, `backend/app/api/routes/alert.py`, `frontend/src/pages/Maintenance.jsx` | **RESOLVED** |
| **13** | **Neutral Aviation Maintenance Language**<br>No unsupported claims of grounding aircraft or certifying airworthiness. | Inspected all urgency texts and API responses. | Recommendations explicitly use authorized review wording: *"IMMEDIATE ENGINEERING REVIEW: Flagged for review by an authorised aviation maintenance professional. Does not certify airworthiness."* | `ml/inference/predictor.py`, `backend/app/api/routes/health.py` | **RESOLVED** |
| **14** | **Comprehensive Health & Readiness Probes**<br>Health checks must verify actual model memory loading and database query execution. | Inspected. Previously only checked `os.path.exists()` on file path. Corrupted or unpicklable files passed undetected. | Upgraded `health.py`: executes live `SELECT 1` on DB session, checks active `predictor.model` instance, evaluates `dataset_ready`. Added dedicated `/api/health/live` and `/api/health/ready` probes. | `backend/app/api/routes/health.py`, `backend/app/main.py`, `tests/test_api.py` | **RESOLVED** |

---

## Automated Verification Summary

1. **Backend Tests:** 19 Passed, 1 Skipped (live socket sandbox check) in 13.20s.
2. **Frontend Production Build:** Built in 14.34s with 0 errors (`dist/index.html`, `dist/assets/`).
3. **Deployment Preparation Script (`scripts/prepare_deployment.py`):** Verified 5/5 steps in 7.4s.
4. **Smoke Test Script (`scripts/deployment_smoke_test.py`):** 12 integration checks covering health, readiness, metadata, fleet, engine detail, predictions, persistence, alerts, anomalies, and SHAP.

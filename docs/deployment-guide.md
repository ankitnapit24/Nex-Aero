# Nex Aero — Production Cloud Deployment Guide

**Target Cloud Architecture:**
```
[User Browser]
       │
       ▼
[Vercel: React 19 + Vite 6 + Tailwind CSS v4 Frontend]
       │  (HTTPS API calls via VITE_API_BASE_URL)
       ▼
[Render: Python 3.11 + FastAPI + Uvicorn Web Service]
       ├── ML Inference Engine (Random Forest RUL Regressor + Isolation Forest + TreeSHAP)
       ├── NASA C-MAPSS FD001 Dataset Storage (data/raw/)
       └── Persistent Storage (Render Disk mounted at /var/data -> nex_aero.db)
```

---

## A. Architecture Overview

Nex Aero delivers predictive maintenance intelligence for turbofan aircraft engines based on the NASA C-MAPSS FD001 dataset. The production deployment separates concerns into a high-performance static frontend and a resilient, persistent ML API service:

1. **Frontend (Vercel):** Single Page Application (SPA) compiled to optimized HTML/CSS/JS chunks. Handles routing, data visualization, real-time inference forms, replay timeline playback, and maintenance triage.
2. **Backend (Render):** FastAPI ASGI service running on Python 3.11 with Uvicorn. Exposes REST endpoints for health, fleet catalog, single-engine telemetry, live inference, historical audit logs, anomaly detection, TreeSHAP explanations, and alert lifecycle management.
3. **Machine Learning Pipeline:** Leak-free Random Forest regressor with piecewise-linear RUL target capping (125 cycles) and an Isolation Forest sensor anomaly detector trained on nominal baseline envelopes.
4. **Database Persistence:** SQLite database stored on an attached Render Persistent Disk at `/var/data/nex_aero.db`, ensuring prediction logs and maintenance alerts survive service restarts, deploys, and container migrations.

---

## B. Local Development Quickstart

### Prerequisites
- Python 3.11 (or 3.10+)
- Node.js 18+ and npm
- Git

### 1. Backend Setup
```bash
# Clone the repository
git clone https://github.com/ankitnapit24/Nex-Aero.git
cd Nex-Aero

# Create and activate Python virtual environment
python -m venv .venv

# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Run automated deployment preparation (downloads data, trains models, verifies artifacts)
python scripts/prepare_deployment.py

# Start local FastAPI server on port 8000
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive Swagger documentation is available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup
```bash
# In a new terminal window:
cd frontend

# Install Node dependencies
npm install

# Start Vite dev server on port 5173
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## C. Dataset Preparation

The application relies on the NASA C-MAPSS turbofan engine degradation dataset (FD001):
- **Raw Files Required:** `train_FD001.txt`, `test_FD001.txt`, `RUL_FD001.txt`.
- **Automated Ingestion:** Executing `python scripts/download_dataset.py` queries official NASA archive endpoints and GitHub mirror fallbacks, extracts the archive to `data/raw/`, and validates checksums and row counts.
- **Preprocessing:** `python scripts/prepare_dataset.py` calculates piecewise-linear Remaining Useful Life targets (capped at 125 cycles) and stores tabular CSVs in `data/processed/`.

---

## D. Machine Learning Artifacts

All models are prepared pre-runtime so the API starts instantly without training delays:
1. **Random Forest Pipeline (`ml/models/rf_fd001_pipeline.joblib`):**
   - 100 decision trees, max depth 16, leak-free GroupKFold (5-fold) validation.
   - Evaluated against official NASA test split: `test_FD001.txt` + `RUL_FD001.txt`.
   - Feature count: 19 physical engine parameters (including `sensor_6`). Excludes constant sensors (1, 5, 10, 16, 18, 19).
2. **Isolation Forest Anomaly Detector (`ml/models/iforest_fd001.joblib`):**
   - Trained on healthy baseline operating cycles (`cycle <= 30`) across 100 training engines.
   - Input features strictly physical (`ANOMALY_FEATURE_COLUMNS`). Temporal `cycle`, identifier `engine_id`, and target `rul` are completely excluded to prevent temporal or identity bias.
3. **Baseline Statistics (`ml/models/baseline_sensor_stats.json`):**
   - Mean and standard deviation per sensor used for local z-score sensor drift attribution.
4. **TreeSHAP Explainability:**
   - Computes exact local Shapley values via `TreeExplainer`, attributing specific cycle RUL increases and decreases to physical sensor deviations.

---

## E. Render Backend Deployment

Deploy the FastAPI backend to Render using a Web Service.

### Option 1: Automatic Blueprint (Recommended)
The repository includes a ready-to-use `render.yaml` Blueprint:
1. In the [Render Dashboard](https://dashboard.render.com/), click **New +** -> **Blueprint**.
2. Connect repository `ankitnapit24/Nex-Aero`.
3. Render reads `render.yaml` and provisions:
   - Web Service `nex-aero-api`
   - Persistent Disk `nex-aero-data` (1 GB) mounted at `/var/data`
4. Click **Apply**.

### Option 2: Manual Web Service Setup
If creating the service manually via the Render UI:

| Setting | Value to Enter |
|---|---|
| **Service Type** | Web Service |
| **Name** | `nex-aero-api` |
| **Region** | Oregon (US West) or closest region |
| **Branch** | `main` |
| **Root Directory** | *(leave empty / repository root)* |
| **Runtime** | `Python` |
| **Build Command** | `pip install --upgrade pip && pip install -r requirements.txt && python scripts/prepare_deployment.py` |
| **Start Command** | `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT` |
| **Plan** | Starter (or Free for testing; Starter required for Persistent Disks) |
| **Health Check Path** | `/api/health` |

#### Persistent Disk Setup (Required for SQLite Persistence):
1. Scroll down to **Disks** in the Web Service settings.
2. Click **Add Disk**:
   - **Name:** `nex-aero-data`
   - **Mount Path:** `/var/data`
   - **Size:** `1 GB`

#### Environment Variables to Set on Render:
| Key | Example Value | Description |
|---|---|---|
| `PYTHON_VERSION` | `3.11.10` | Enforces Python 3.11 runtime |
| `PYTHONPATH` | `.` | Ensures root imports resolve cleanly |
| `DATABASE_URL` | `sqlite:////var/data/nex_aero.db` | Persistent SQLite file on mounted disk |
| `CORS_ORIGINS` | `https://nex-aero.vercel.app,http://localhost:5173` | Comma-separated list of allowed frontend domains |

Once deployed, copy your Render service URL (e.g., `https://nex-aero-api.onrender.com`).

---

## F. Vercel Frontend Deployment

Deploy the React + Vite frontend to Vercel.

1. Go to the [Vercel Dashboard](https://vercel.com/) and click **Add New...** -> **Project**.
2. Import repository `ankitnapit24/Nex-Aero`.
3. Configure the Project Settings:

| Setting | Value to Enter | Notes |
|---|---|---|
| **Framework Preset** | `Vite` | Auto-detected |
| **Root Directory** | `frontend` | **Crucial:** click Edit and select `frontend` |
| **Build Command** | `npm run build` | Default |
| **Output Directory** | `dist` | Default |
| **Install Command** | `npm install` | Default |

4. In **Environment Variables**, add:
   - **Name:** `VITE_API_BASE_URL`
   - **Value:** `https://nex-aero-api.onrender.com` *(use your actual Render backend URL)*
5. Click **Deploy**.

Vercel will compile the application and provide a production domain (e.g. `https://nex-aero.vercel.app`).

---

## G. CORS Configuration

To allow your Vercel frontend to communicate with your Render backend:
1. In the **Render Dashboard**, open your `nex-aero-api` Web Service.
2. Navigate to **Environment**.
3. Set `CORS_ORIGINS` to include your Vercel domain:
   ```env
   CORS_ORIGINS=https://nex-aero.vercel.app,https://your-custom-domain.com,http://localhost:5173
   ```
4. Click **Save Changes**. Render will automatically restart the backend with the new origins active.
*Note: The backend parser supports comma-separated strings or JSON arrays, with automatic whitespace trimming.*

---

## H. SQLite Persistence Architecture

When hosting on Render, the default container filesystem is ephemeral; changes are wiped on restart or redeployment. To ensure prediction logs and maintenance alerts are permanently preserved:
1. Render mounts a persistent SSD volume at `/var/data`.
2. Setting `DATABASE_URL=sqlite:////var/data/nex_aero.db` directs SQLite to write to the persistent volume.
3. `backend/app/database/session.py` automatically validates and creates the `/var/data` directory if missing.
4. SQLite connection pooling is configured with `timeout: 15` (busy timeout) and `check_same_thread: False` for thread-safe FastAPI concurrency.

---

## I. Deployment Smoke Testing

To verify an active deployment from any machine or CI pipeline:
```bash
# Test remote deployed backend:
python scripts/deployment_smoke_test.py --url https://nex-aero-api.onrender.com

# Or set environment variable:
export NEX_AERO_API_URL=https://nex-aero-api.onrender.com
python scripts/deployment_smoke_test.py
```

The smoke test runs 12 automated checks:
1. Root Gateway `/`
2. System Health `/api/health`
3. Liveness Probe `/api/health/live`
4. Readiness Probe `/api/health/ready`
5. Model Metadata `/api/model-metadata`
6. Engine Catalog `/api/engines`
7. Engine Detail `/api/engines/1`
8. Live Inference `/api/predict`
9. Prediction Audit Log `/api/predictions`
10. Maintenance Alerts `/api/alerts`
11. Anomaly Detection `/api/anomalies`
12. TreeSHAP Explanation `/api/explain/1`

---

## J. Troubleshooting Guide

### 1. Render Build Error: "ModuleNotFoundError: No module named 'backend'"
- **Cause:** `PYTHONPATH` not pointing to repository root during execution.
- **Fix:** Ensure `PYTHONPATH=.` is set in Render environment variables, or ensure you are running Uvicorn from the root directory.

### 2. Vercel 404 Error on Page Refresh (`/engines`, `/predictions`, etc.)
- **Cause:** Static server attempting to locate an `engines.html` file instead of delegating to React Router.
- **Fix:** Verified `frontend/vercel.json` contains the SPA route rewrite:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```

### 3. Frontend API Calls Failing (CORS or Network Error)
- **Check 1:** Verify `VITE_API_BASE_URL` in Vercel does NOT have a trailing slash (`https://nex-aero-api.onrender.com`, not `https://nex-aero-api.onrender.com/`).
- **Check 2:** Verify `CORS_ORIGINS` on Render contains your exact Vercel frontend URL, including `https://`.
- **Check 3:** Note Render free-tier cold starts can take 30–50 seconds to spin up from sleep. The frontend API client is configured with a 20-second timeout (`VITE_API_TIMEOUT_MS=20000`).

### 4. Database File Missing on Render Redeploy
- **Cause:** `DATABASE_URL` pointing to local `./aeroguard.db` instead of the persistent disk.
- **Fix:** Upgrade to Render Starter plan ($7/mo for Web Service + $0.25/mo for 1GB Disk) and configure `DATABASE_URL=sqlite:////var/data/nex_aero.db`.

### 5. Missing ML Models on Fresh Clone
- **Fix:** Run `python scripts/prepare_deployment.py`. This script automatically downloads the NASA raw dataset, generates tabular features, trains the Random Forest and Isolation Forest models, and validates their deserialization.

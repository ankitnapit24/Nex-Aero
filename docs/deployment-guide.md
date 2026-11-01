# Nex Aero — Free-Tier Cloud Deployment Guide (100% Free / Zero-Cost)

**Target Free-Tier Architecture:**
```
[User Browser]
       │
       ▼
[Vercel Hobby: React 19 + Vite 6 + Tailwind CSS v4 Frontend]
       │  (HTTPS API calls via VITE_API_BASE_URL)
       ▼
[Render Free Web Service: Python 3.11 + FastAPI + Uvicorn]
       ├── ML Inference Engine (Random Forest RUL Regressor + Isolation Forest + TreeSHAP)
       ├── NASA C-MAPSS FD001 Dataset Storage (data/raw/)
       └── Ephemeral Database Layer (Writable Local SQLite -> ./data/nex_aero.db)
```

---

## A. Architecture Overview

Nex Aero delivers predictive maintenance intelligence for turbofan aircraft engines based on the NASA C-MAPSS FD001 dataset. The zero-cost production deployment separates concerns into a high-performance static frontend and a resilient, free-tier backend:

1. **Frontend (Vercel Hobby — Free):** Single Page Application (SPA) compiled to optimized HTML/CSS/JS chunks. Handles routing, data visualization, real-time inference forms, replay timeline playback, and maintenance triage.
2. **Backend (Render Free Web Service — Free):** FastAPI ASGI service running on Python 3.11 with Uvicorn. Exposes REST endpoints for health, fleet catalog, single-engine telemetry, live inference, historical audit logs, anomaly detection, TreeSHAP explanations, and alert lifecycle management.
3. **Machine Learning Pipeline:** Leak-free Random Forest regressor with piecewise-linear RUL target capping (125 cycles) and an Isolation Forest sensor anomaly detector trained on nominal baseline envelopes. Memory-optimized for Render's 512 MB RAM footprint.
4. **Database Storage (Free-Tier Ephemeral SQLite):** SQLite database stored in the writable local directory at `./data/nex_aero.db`. Requires zero payment or credit card. Records persist during the active process lifetime and reset upon container sleep/redeploy.

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

## E. Render Free Web Service Deployment (100% Free — No Credit Card)

Deploy the FastAPI backend to Render using the Free Plan.

### Option 1: Automatic Blueprint (Recommended)
The repository includes a 100% free `render.yaml` Blueprint with **no paid disks and no paid plans**:
1. In the [Render Dashboard](https://dashboard.render.com/), click **New +** -> **Blueprint**.
2. Connect your GitHub repository `ankitnapit24/Nex-Aero`.
3. Render reads `render.yaml` and provisions:
   - Web Service `nex-aero-api`
   - Plan: `Free`
   - Persistent Disk: *None (Zero credit card requirement)*
4. Click **Apply**.
5. Wait for the build to finish (takes ~2-3 minutes).
6. Copy your public backend URL (e.g., `https://nex-aero-api.onrender.com`).

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
| **Plan** | **Free** *(Important: select Free)* |
| **Health Check Path** | `/api/health` |

#### Environment Variables to Set on Render:
| Key | Example Value | Description |
|---|---|---|
| `PYTHON_VERSION` | `3.11.10` | Enforces Python 3.11 runtime |
| `PYTHONPATH` | `.` | Ensures root imports resolve cleanly |
| `DATABASE_URL` | `sqlite:///./data/nex_aero.db` | Writable local SQLite file (No paid disk required) |
| `CORS_ORIGINS` | `https://nex-aero.vercel.app,http://localhost:5173` | Comma-separated list of allowed frontend domains |

---

## F. Vercel Frontend Deployment (100% Free)

Deploy the React + Vite frontend to Vercel Hobby.

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
   - **Name:** `VITE_API_TIMEOUT_MS`
   - **Value:** `45000` *(allows cold-start spin-up)*
5. Click **Deploy**.

Vercel will compile the application and provide a free production domain (e.g. `https://nex-aero.vercel.app`).

---

## G. CORS Configuration

To allow your Vercel frontend to communicate with your Render backend:
1. In the **Render Dashboard**, open your `nex-aero-api` Web Service.
2. Navigate to **Environment**.
3. Set `CORS_ORIGINS` to include your Vercel domain:
   ```env
   CORS_ORIGINS=https://nex-aero.vercel.app,http://localhost:5173
   ```
4. Click **Save Changes**. Render will automatically restart the backend with the new origins active.
*Note: The backend parser supports comma-separated strings or JSON arrays, with automatic whitespace trimming.*

---

## H. SQLite Ephemeral Storage & Cold-Start Behavior

- **No Paid Disk Required:** By setting `DATABASE_URL=sqlite:///./data/nex_aero.db`, the application writes directly into the container's writable directory.
- **Data Persistence Scope:** SQLite records (prediction audit trail, newly created alerts) persist throughout the container's active process lifetime. Whenever Render spins down the free container due to 15 minutes of inactivity or restarts it during a redeploy, SQLite reinitializes automatically from scratch without crashing.
- **Cold-Start Handling:** Render Free containers sleep after 15 minutes of inactivity. When a user visits the site, Render takes ~30–50 seconds to spin up. The frontend client has an extended 45-second timeout and automatically displays:
  *"Backend waking up (free tier)..."*
  while safe read-only queries automatically retry after 3 seconds.

---

## I. Deployment Smoke Testing

To verify an active deployment from any machine:
```bash
# Test remote deployed backend:
python scripts/deployment_smoke_test.py --url https://nex-aero-api.onrender.com
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

### 1. Render Requests Credit Card on Blueprint
- **Cause:** A persistent disk or starter plan was previously defined in `render.yaml`.
- **Fix:** Verified `render.yaml` now uses `plan: free` with **NO** disk block. The Blueprint deploys 100% free with zero payment prompts.

### 2. Initial Page Load Shows "Backend waking up (free tier)..."
- **Cause:** Normal Render Free tier spin-down after 15 minutes of inactivity.
- **Fix:** Wait 30–45 seconds. The frontend will automatically detect the wake-up and load all engine cards and metrics.

### 3. Vercel 404 Error on Page Refresh
- **Cause:** SPA routes trying to find static HTML files.
- **Fix:** Handled by `frontend/vercel.json` rewrites mapping all sub-routes to `/index.html`.

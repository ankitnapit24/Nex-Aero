# AeroGuard AI: Turbofan Engine Predictive Maintenance Platform

[![Python](https://img.shields.io/badge/Python-3.11%2B%20%7C%203.14-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646cff.svg)](https://vite.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com)
[![NASA C-MAPSS](https://img.shields.io/badge/NASA%20Data-C--MAPSS%20FD001-orange.svg)](https://data.nasa.gov)

AeroGuard AI is an end-to-end, leak-free machine-learning prototype designed to estimate Remaining Useful Life (RUL) of aircraft turbofan engines based on multi-sensor telemetry from the NASA C-MAPSS dataset.

> **DEMO & RESEARCH PROTOTYPE DISCLAIMER:**
> This software is an experimental decision-support prototype. Outputs do **NOT** certify aircraft airworthiness, diagnose real-world flight hardware, or autonomously authorize maintenance actions without certified human engineering approval.

---

## Architecture Overview

```mermaid
flowchart LR
    A[NASA C-MAPSS FD001] --> B[Data Ingestion & GroupKFold Split]
    B --> C[RandomForest Regressor Baseline]
    C --> D[Joblib Model & JSON Metadata]
    D --> E[FastAPI REST Backend & SQLite]
    E --> F[React 19 + Tailwind CSS Dashboard]
```

- **Machine Learning Core:** Scikit-learn `RandomForestRegressor` (120 estimators) trained with engine-wise `GroupKFold` cross-validation (strict zero-leakage guarantee).
- **Backend API:** FastAPI serving REST endpoints for fleet summaries, telemetry history, on-demand inference, and SQLite audit persistence.
- **Frontend Dashboard:** Modern dark-mode aviation dashboard built with React 19, Vite, Tailwind CSS v4, Recharts, and Lucide icons.

---

## Model Benchmark Performance (NASA C-MAPSS FD001)

| Split / Benchmark | Metric | Result |
|:---|:---|:---:|
| **5-Fold GroupKFold (Cross-Validation)** | Mean MAE | **11.45 ± 0.61 cycles** |
| | Mean RMSE | **16.76 ± 0.72 cycles** |
| | Mean $R^2$ | **0.838** |
| **Official NASA Test Set (100 Engines)** | Test MAE | **12.53 cycles** |
| | Test RMSE | **16.94 cycles** |
| | Test $R^2$ | **0.821** |
| | NASA Asymmetric Penalty | **500.0** |

---

## Quick Start Guide

### Prerequisites
- Python 3.11+ (verified up to Python 3.14)
- Node.js 18+ (verified on Node 24 LTS)
- Git

### 1. Clone & Setup Environment
```bash
# Clone the repository
git clone <repo-url>
cd AeroGuard-AI

# Create Python virtual environment
python -m venv .venv

# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt
```

### 2. Download Dataset & Train Model
```bash
# 1. Download NASA C-MAPSS FD001 data files into data/raw/
python scripts/download_dataset.py

# 2. Preprocess data and generate ground-truth labels
python scripts/prepare_dataset.py

# 3. Train leak-free RandomForest pipeline & evaluate on test fleet
python scripts/train_model.py
```

### 3. Run Automated Tests
```bash
pytest tests/ -v
```

### 4. Start the Application

#### Start Backend (Terminal 1)
```bash
# Windows PowerShell:
$env:PYTHONPATH = "$PWD"
.\.venv\Scripts\uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

# macOS/Linux:
export PYTHONPATH="$PWD"
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive Swagger API documentation will be available at: [http://localhost:8000/docs](http://localhost:8000/docs)

#### Start Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```
Open your browser to: [http://localhost:5173](http://localhost:5173)

---

## Demo Walkthrough for Judges

1. **Fleet Health Overview (`/`):**
   - View all 100 test turbofan engines prioritized by urgency (lowest RUL first).
   - Filter by urgency tier (Critical: RUL ≤ 25c, Warning: 25-50c, Moderate: 50-80c, Nominal: >80c).
   - Observe ground truth comparisons (`ENG-034` predicted 7.1 cycles vs NASA ground truth 7.0 cycles).

2. **Sensor Telemetry Curves (`/engines/34`):**
   - Inspect historical multi-channel degradation trends (LPC/HPC/LPT temperatures, HPC pressure, rotor speeds).
   - Observe non-linear degradation drift towards end-of-service.

3. **Live ML Inference Simulator (`/predictions`):**
   - Select an engine to populate authentic sensor readings.
   - Adjust cycle count or temperature/pressure sliders.
   - Click **Run Real-Time ML Inference** to invoke the model backend and observe instant output with SQLite audit logging.

4. **Maintenance Planning Queue (`/maintenance`):**
   - Interact with dynamic urgency threshold sliders.
   - Click any flagged engine to review an engineering work order draft with recommended borescope inspection procedures.

5. **Model Transparency (`/analytics`):**
   - Inspect feature importances, zero-leakage cross-validation methodology, and NASA benchmark scores.

---

## License & Attribution
- NASA C-MAPSS dataset provided by NASA Ames Research Center Prognostics Center of Excellence (PCoE).
- Developed for demonstration and research purposes under the AeroGuard AI initiative.

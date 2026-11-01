# Nex Aero — Free-Tier Infrastructure Architecture & Limitations

**Document:** `docs/free-tier-limitations.md`  
**Applicable Hosting:** Render Free Web Service + Vercel Hobby  
**Total Cost:** **$0.00 / month (Zero Credit Card Requirement)**  
**Classification:** Experimental Prototype & Academic Research Demo

---

## 1. Executive Summary

Nex Aero is configured to operate entirely within cloud provider free tiers without requiring any payment method or credit card authorization:
- **Frontend:** Hosted on **Vercel Hobby** (free global CDN, instant edge delivery, zero cold-starts).
- **Backend & ML Services:** Hosted on **Render Free Web Service** (Python 3.11 ASGI service with Uvicorn).
- **Database:** Local SQLite engine using writable ephemeral container storage (`./data/nex_aero.db`).

---

## 2. Cloud Provider Free-Tier Specifications

### Render Free Web Service
- **Cost:** $0.00 / month (No credit card required).
- **Compute:** Shared 0.1 vCPU.
- **Memory (RAM):** 512 MB.
- **Inactivity Spin-Down:** The backend automatically spins down (enters sleep state) after **15 minutes of zero incoming HTTP traffic**.
- **Cold-Start Duration:** When a new visitor opens the application while the backend is asleep, Render spins up the container, taking **30 to 50 seconds** to respond to the initial request.
- **Bandwidth:** 100 GB / month free outbound bandwidth.
- **Filesystem Ephemerality:** Stateless container. Any files written to the local disk during runtime (such as SQLite database rows) are discarded when the instance restarts, sleeps, or is redeployed.

### Vercel Hobby
- **Cost:** $0.00 / month.
- **Compute:** Edge Network / Global Serverless CDN.
- **Availability:** Always online, 0s cold start for frontend assets.
- **Bandwidth:** 100 GB / month free bandwidth.

---

## 3. Impact on Platform Features

| Platform Feature | Free-Tier Status | Behavioral Notes |
|---|---|---|
| **Remaining Useful Life (RUL) Inference** | **100% Fully Functional** | Random Forest model is pre-loaded into memory. Single-row inference executes in < 30 ms. |
| **Isolation Forest Anomaly Detection** | **100% Fully Functional** | Multivariate sensor evaluations and nominal baseline scoring execute in real time. |
| **TreeSHAP Feature Attributions** | **100% Fully Functional** | Game-theoretic local Shapley value attributions run on demand for any engine cycle. |
| **Fleet Catalog (100 Engines)** | **100% Fully Functional** | Terminal state summaries and NASA test split metrics load from pre-processed caches. |
| **Historical Degradation Replay** | **100% Fully Functional** | Simulated cycle-by-cycle degradation playback runs smoothly. |
| **Maintenance Alert Lifecycle** | **Fully Functional During Process Lifetime** | Creating alerts, filtering, and transitioning status (`OPEN` -> `ACKNOWLEDGED` -> `RESOLVED`) works seamlessly in SQLite. |
| **Cross-Session Data Persistence** | **Ephemeral (Resets on Restart)** | Because free hosting does not include a persistent disk, prediction history logs and newly created alerts will reset whenever Render restarts or sleeps. |
| **Initial Page Load Experience** | **Cold-Start Notice Displayed** | If the backend is asleep, the frontend displays: *"Backend waking up (free tier)..."* and automatically retries safe GET requests. |

---

## 4. Engineering Mitigations for Free-Tier Constraints

1. **Pre-Runtime Model Artifact Preparation:**
   - Models are NOT trained during server boot or during incoming user requests.
   - The build command runs `python scripts/prepare_deployment.py`, which checks for artifacts, downloads dataset files if missing, and verifies deserialization before Uvicorn starts.

2. **Memory Footprint Optimization (< 200 MB of 512 MB Budget):**
   - Inference uses `n_jobs=1` to prevent spawning multiple worker processes that would exceed the 512 MB RAM limit.
   - Plotting libraries (`matplotlib`, `seaborn`) are restricted to offline evaluation scripts and not loaded in memory by the core API runtime.

3. **Client-Side Cold Start Resilience:**
   - The frontend Axios timeout is set to 45 seconds (`VITE_API_TIMEOUT_MS=45000`).
   - Idempotent GET calls (health checks, fleet listings) automatically perform an asynchronous retry if the backend was spinning up.
   - Prediction requests (POST) are strictly single-flight (no automatic duplicate submissions).

4. **Transparent User Interface Disclosures:**
   - Non-intrusive notices appear in the application footer and status bar, informing users about free-tier cold-starts and ephemeral demo database storage.

---

## 5. Domain & Regulatory Disclaimer

Nex Aero is an experimental decision-support prototype developed for academic demonstration and machine learning research using the NASA C-MAPSS FD001 benchmark dataset.

Free-tier cloud hosting is intended exclusively for interactive demonstration, portfolio presentation, and evaluation. It is **NOT** engineered, certified, or intended for operational flight environments, mission-critical systems, or certified aviation maintenance authorization.

# Nex Aero — Free-Tier Deployment Audit & Paid-Resource Removal

**Document:** `docs/free-deployment-audit.md`  
**Date:** November 2026  
**Status:** COMPLETE — 100% FREE TIER READY (NO CREDIT CARD REQUIRED)

---

## 1. Root Cause of Previous Payment Prompt

When attempting to apply the Render Blueprint previously, Render requested payment information / credit card activation due to two specific paid directives in `render.yaml`:

1. **`plan: starter` ($7/month):**
   - The Blueprint explicitly configured the web service instance type as `starter` instead of `free`.
2. **`disk:` Persistent SSD Disk ($0.25/GB/month):**
   - The Blueprint requested a 1 GB persistent disk named `nex-aero-data` mounted at `/var/data`.
   - On Render, persistent disks are strictly a paid feature and cannot be attached to free-tier web services.
   - Any Blueprint containing a `disk` block triggers Render's automated billing check.

---

## 2. Paid-to-Free Conversion Actions

| Configuration Item | Previous Paid Setting | New 100% Free Setting | Impact / Trade-off |
|---|---|---|---|
| **Render Web Service Plan** | `plan: starter` ($7/mo) | `plan: free` ($0/mo) | Web service runs within Render's free tier (512 MB RAM, 0.1 CPU). Service enters sleep state after 15 minutes of inactivity. |
| **Persistent Disk** | `disk: name: nex-aero-data, mountPath: /var/data, sizeGB: 1` | **REMOVED ENTIRELY** | Zero credit card requirement. Database storage is now local/ephemeral. |
| **Database Path** | `DATABASE_URL=sqlite:////var/data/nex_aero.db` | `DATABASE_URL=sqlite:///./data/nex_aero.db` | SQLite writes directly into the writable `./data/` application directory. Data resets on container redeploy/spin-down. |
| **Frontend Hosting** | Vercel Hobby (Free) | Vercel Hobby (Free) | Preserved. Unchanged free-tier deployment. |
| **Cold-Start Handling** | Standard 20s timeout | Configured 45s timeout + UI waking message | Mitigates the 30-50s free tier spin-up delay on initial visitor request. |

---

## 3. Operational Integrity Assessment

Can Nex Aero retain full operational capabilities on the free tier?

- **Random Forest RUL Inference:** **YES.** The serialized model (`rf_fd001_pipeline.joblib`) is ~51.8 MB on disk. When deserialized into memory with `n_jobs=1`, memory consumption is approximately 140–180 MB, well within Render's 512 MB RAM limit.
- **Isolation Forest Anomaly Detection:** **YES.** The model artifact is ~1.15 MB and executes lightweight decision-function scoring.
- **NASA C-MAPSS FD001 Dataset:** **YES.** Automatically ingested, unpacked, and verified during the build step via `scripts/prepare_deployment.py`.
- **TreeSHAP Attributions:** **YES.** Exact Shapley feature contribution calculations run on-demand for individual engine cycles.
- **Maintenance Alert Workflow:** **YES.** Alert creation, status updates (`OPEN` -> `ACKNOWLEDGED` -> `RESOLVED`), and filtering function normally during the process lifetime.
- **Data Persistence:** **EPHEMERAL LIMITATION.** Since Render Free containers are stateless, SQLite records are reset whenever Render replaces the instance or wakes up from an idle spin-down. The application UI and documentation clearly disclose this non-intrusive demo limitation.

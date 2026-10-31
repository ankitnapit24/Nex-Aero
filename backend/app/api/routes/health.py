from fastapi import APIRouter
import os
from sqlalchemy import text
from backend.app.core.config import settings
from backend.app.database.session import SessionLocal

router = APIRouter()

@router.get("/health")
def get_health():
    """
    Check backend health status, database connectivity, and ML model artifacts.
    Returns overall system state: ONLINE, DEGRADED, or UNAVAILABLE.
    """
    model_exists = os.path.exists(settings.MODEL_PATH)
    metadata_exists = os.path.exists(settings.METADATA_PATH)
    # Project root is 4 levels up from this file (routes -> api -> app -> backend -> root)
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
    anomaly_path = os.path.join(project_root, "ml", "models", "iforest_fd001.joblib")
    anomaly_exists = os.path.exists(anomaly_path)

    # Database connectivity check
    db_ok = False
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_ok = True
    except Exception:
        db_ok = False

    # Determine overall system state
    if model_exists and db_ok and anomaly_exists:
        system_state = "ONLINE"
    elif model_exists and db_ok:
        system_state = "DEGRADED"
    else:
        system_state = "UNAVAILABLE"

    return {
        "status": "online" if system_state != "UNAVAILABLE" else "offline",
        "system_state": system_state,
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "model_loaded": model_exists,
        "metadata_loaded": metadata_exists,
        "database_status": "CONNECTED" if db_ok else "UNAVAILABLE",
        "rul_model_status": "LOADED" if model_exists else "UNAVAILABLE",
        "anomaly_detector_status": "LOADED" if anomaly_exists else "DEGRADED",
        "disclaimer": "Experimental decision-support prototype. Outputs do NOT certify airworthiness or authorize maintenance."
    }

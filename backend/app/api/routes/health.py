from fastapi import APIRouter, Response, status
from sqlalchemy import text
from backend.app.core.config import settings
from backend.app.database.session import SessionLocal
from backend.app.services.engine_service import engine_service
from ml.inference.predictor import get_predictor

router = APIRouter()

@router.get("/health")
def get_health():
    """
    Comprehensive health check: reports liveness, database status, ML models readiness, and dataset availability.
    Overall system state: ONLINE, DEGRADED, or UNAVAILABLE.
    """
    pred = get_predictor()
    rf_model_loaded = pred is not None and pred.model is not None
    anomaly_detector_loaded = pred is not None and pred.anomaly_model is not None
    metadata_loaded = pred is not None and bool(pred.metadata)

    # Check database connectivity via live query
    db_ok = False
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_ok = True
    except Exception:
        db_ok = False

    # Check dataset availability without loading 13k rows into memory
    dataset_ready = engine_service.is_dataset_available()

    # Determine overall system state
    if rf_model_loaded and db_ok and anomaly_detector_loaded and dataset_ready:
        system_state = "ONLINE"
    elif rf_model_loaded and db_ok:
        system_state = "DEGRADED"
    else:
        system_state = "UNAVAILABLE"

    return {
        "status": "online" if system_state != "UNAVAILABLE" else "offline",
        "system_state": system_state,
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "model_loaded": rf_model_loaded,
        "metadata_loaded": metadata_loaded,
        "database_status": "CONNECTED" if db_ok else "UNAVAILABLE",
        "rul_model_status": "LOADED" if rf_model_loaded else "UNAVAILABLE",
        "anomaly_detector_status": "LOADED" if anomaly_detector_loaded else "DEGRADED",
        "dataset_ready": dataset_ready,
        "disclaimer": "Experimental decision-support prototype. Outputs do NOT certify airworthiness or authorize maintenance."
    }

@router.get("/health/live")
def get_liveness():
    """
    Liveness probe: verifies that the FastAPI process is responsive.
    """
    return {
        "status": "alive",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

@router.get("/health/ready")
def get_readiness(response: Response = None):
    """
    Readiness probe: verifies the service is ready to accept incoming traffic (DB responsive & RF model loaded).
    Returns HTTP 200 if ready, HTTP 503 if unavailable.
    """
    pred = get_predictor()
    rf_model_loaded = pred is not None and pred.model is not None

    db_ok = False
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_ok = True
    except Exception:
        db_ok = False

    is_ready = rf_model_loaded and db_ok
    if not is_ready and response is not None:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "ready": is_ready,
        "database": "CONNECTED" if db_ok else "UNAVAILABLE",
        "rul_model": "LOADED" if rf_model_loaded else "UNAVAILABLE",
    }

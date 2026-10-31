from fastapi import APIRouter
import os
from backend.app.core.config import settings

router = APIRouter()

@router.get("/health")
def get_health():
    """
    Check backend health status and model artifact presence.
    """
    model_exists = os.path.exists(settings.MODEL_PATH)
    metadata_exists = os.path.exists(settings.METADATA_PATH)
    
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "model_loaded": model_exists,
        "metadata_loaded": metadata_exists,
        "disclaimer": "Experimental decision-support prototype. Outputs do NOT certify airworthiness or authorize maintenance."
    }

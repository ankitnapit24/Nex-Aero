from fastapi import APIRouter, HTTPException
from typing import List
from backend.app.schemas.engine import EngineSummary, EngineDetail
from backend.app.services.engine_service import engine_service

router = APIRouter()

@router.get("/engines", response_model=List[EngineSummary])
def get_engines():
    """
    List turbofan engines available in the NASA C-MAPSS FD001 evaluation fleet,
    ranked by maintenance urgency (lowest predicted RUL first).
    """
    engines = engine_service.list_engines()
    if not engines:
        raise HTTPException(status_code=503, detail="Dataset or model is not loaded.")
    return engines

@router.get("/engines/{engine_id}", response_model=EngineDetail)
def get_engine(engine_id: int):
    """
    Retrieve sensor history telemetry and status assessment for a specific engine.
    """
    detail = engine_service.get_engine_detail(engine_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Engine {engine_id} not found in fleet.")
    return detail

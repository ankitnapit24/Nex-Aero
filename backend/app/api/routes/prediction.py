from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json
import datetime

from backend.app.database.session import get_db, Base, engine
from backend.app.database.models import PredictionLog
from backend.app.schemas.prediction import TelemetryInput, PredictionResponse, PredictionRecordItem
from backend.app.services.engine_service import engine_service
from ml.inference.predictor import RULPredictor

# Ensure tables exist
Base.metadata.create_all(bind=engine)

router = APIRouter()
predictor = RULPredictor()

@router.post("/predict", response_model=PredictionResponse)
def predict_rul(payload: TelemetryInput, db: Session = Depends(get_db)):
    """
    Validate input telemetry, run machine-learning inference, record audit log in SQLite,
    and return RUL estimate with maintenance recommendation.
    """
    row_dict = payload.model_dump()
    engine_id = row_dict.pop("engine_id")
    
    try:
        result = predictor.predict_single_row(row_dict, engine_id=engine_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Inference error: {str(e)}")

    # Record in database
    log_entry = PredictionLog(
        engine_id=engine_id,
        cycle=result["cycle"],
        predicted_rul=result["predicted_rul_cycles"],
        raw_rul=result["raw_rul_cycles"],
        urgency_tier=result["urgency_tier"],
        recommendation=result["recommendation"],
        model_version=result["model_version"],
        features_json=json.dumps(row_dict),
        created_at=datetime.datetime.now(datetime.timezone.utc)
    )
    db.add(log_entry)
    db.commit()

    return result

@router.get("/predictions", response_model=List[PredictionRecordItem])
def get_prediction_history(limit: int = 50, db: Session = Depends(get_db)):
    """
    Retrieve audit history of past inferences recorded by the backend.
    """
    records = db.query(PredictionLog).order_by(PredictionLog.id.desc()).limit(limit).all()
    return [
        PredictionRecordItem(
            id=r.id,
            engine_id=r.engine_id,
            cycle=r.cycle,
            predicted_rul=r.predicted_rul,
            raw_rul=r.raw_rul,
            urgency_tier=r.urgency_tier,
            recommendation=r.recommendation,
            model_version=r.model_version,
            created_at=r.created_at.isoformat() if r.created_at else ""
        )
        for r in records
    ]

@router.get("/model-metadata")
def get_model_metadata():
    """
    Returns the loaded model metadata and training metrics.
    """
    return predictor.metadata

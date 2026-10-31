from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import json
import datetime

from backend.app.database.session import get_db, Base, engine
from backend.app.database.models import PredictionLog
from backend.app.schemas.prediction import TelemetryInput, PredictionResponse, PredictionRecordItem, ReplayStep
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
    and return RUL estimate with anomaly scores and maintenance recommendations.
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
    Returns the loaded model metadata, training metrics, and anomaly detector parameters.
    """
    return {
        **predictor.metadata,
        "anomaly_detector_loaded": predictor.anomaly_model is not None,
    }

@router.post("/demo/replay", response_model=Dict[str, Any])
def replay_engine_history(
    engine_id: int = Query(..., description="Engine ID to replay"),
    sample_stride: int = Query(5, description="Stride step between flight cycles for smooth replay")
):
    """
    Simulated historical replay of engine degradation over operating lifespan.
    Explicitly labeled as simulated historical data, never live aircraft telemetry.
    """
    detail = engine_service.get_engine_detail(engine_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Engine {engine_id} not found.")

    history = detail.telemetry_history
    if not history:
        raise HTTPException(status_code=404, detail="No telemetry available for replay.")

    # Stride sample to keep response snappy
    stride = max(1, sample_stride)
    sampled_steps = history[::stride]
    if history[-1] not in sampled_steps:
        sampled_steps.append(history[-1])

    replay_timeline = []
    for step in sampled_steps:
        row_dict = step.model_dump()
        row_dict["setting_1"] = step.setting_1
        row_dict["setting_2"] = step.setting_2
        row_dict["setting_3"] = step.setting_3
        row_dict["sensor_6"] = step.sensor_6
        
        try:
            pred = predictor.predict_single_row(row_dict, engine_id=engine_id)
            replay_timeline.append({
                "cycle": step.cycle,
                "predicted_rul": pred["predicted_rul_cycles"],
                "urgency_tier": pred["urgency_tier"],
                "is_anomalous": pred["is_anomalous"],
                "anomaly_score": pred["anomaly_score"],
                "top_sensor_drifts": pred["top_sensor_drifts"],
                "key_telemetry": {
                    "sensor_2_lpc_temp": step.sensor_2,
                    "sensor_3_hpc_temp": step.sensor_3,
                    "sensor_4_lpt_temp": step.sensor_4,
                    "sensor_7_hpc_pres": step.sensor_7,
                    "sensor_11_static_pres": step.sensor_11,
                    "sensor_12_fuel_flow": step.sensor_12,
                }
            })
        except Exception:
            continue

    return {
        "engine_id": engine_id,
        "mode": "SIMULATED_HISTORICAL_REPLAY",
        "notice": "Simulated/historical NASA C-MAPSS replay. Never represents live flight telemetry.",
        "total_historical_cycles": detail.last_cycle,
        "true_rul_at_terminal": detail.true_rul,
        "timeline_steps": replay_timeline
    }

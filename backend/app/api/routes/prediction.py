from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import json
import datetime

from backend.app.database.session import get_db, Base, engine
from backend.app.database.models import PredictionLog
from backend.app.schemas.prediction import TelemetryInput, PredictionResponse, PredictionRecordItem, ReplayStep
from backend.app.services.engine_service import engine_service
from ml.inference.predictor import get_predictor
from ml.inference.explainer import get_shap_explainer, shap_explainer

router = APIRouter()
predictor = get_predictor()

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

@router.get("/anomalies")
def get_anomalies(
    engine_id: Optional[int] = Query(None, description="Optional engine ID filter"),
    cycle: Optional[int] = Query(None, description="Optional flight cycle filter"),
    anomaly_only: bool = Query(False, description="Filter only records flagged as anomalous"),
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0)
):
    """
    Fleet-wide unsupervised anomaly detection using trained Isolation Forest.
    Evaluates multivariate sensor distributions against nominal baseline envelopes.
    """
    if engine_service.test_df is None:
        raise HTTPException(status_code=503, detail="Test dataset not loaded.")

    target_engine = engine_id if isinstance(engine_id, int) else None
    target_cycle = cycle if isinstance(cycle, int) else None
    is_anomaly_only = anomaly_only if isinstance(anomaly_only, bool) else False
    page_limit = limit if isinstance(limit, int) else 100
    page_skip = skip if isinstance(skip, int) else 0

    df = engine_service.test_df
    if target_engine is not None:
        df = df[df["engine_id"] == target_engine]
        if df.empty:
            raise HTTPException(status_code=404, detail=f"Engine {target_engine} not found.")

    if target_engine is not None and target_cycle is not None:
        target_rows = df[df["cycle"] == target_cycle]
        if target_rows.empty:
            raise HTTPException(status_code=404, detail=f"Engine {target_engine} cycle {target_cycle} not found.")
        rows_to_eval = [(target_engine, target_rows.iloc[0].to_dict())]
    elif target_engine is not None:
        rows_to_eval = [(target_engine, r.to_dict()) for _, r in df.iterrows()]
    else:
        # Fleet-wide: evaluate terminal cycle of each engine
        grouped = df.groupby("engine_id").last().reset_index()
        rows_to_eval = [(int(r["engine_id"]), r.to_dict()) for _, r in grouped.iterrows()]

    records = []
    total_evaluated = 0
    anomalies_detected = 0

    for eid, row in rows_to_eval:
        total_evaluated += 1
        try:
            pred = predictor.predict_single_row(row, engine_id=eid)
            is_anom = pred.get("is_anomalous", False)
            if is_anom:
                anomalies_detected += 1

            if is_anomaly_only and not is_anom:
                continue

            records.append({
                "engine_id": eid,
                "cycle": int(row["cycle"]),
                "is_anomalous": is_anom,
                "anomaly_score": pred.get("anomaly_score"),
                "predicted_rul": pred.get("predicted_rul_cycles"),
                "urgency_tier": pred.get("urgency_tier"),
                "top_sensor_drifts": pred.get("top_sensor_drifts", []),
                "recommendation": pred.get("recommendation"),
                "evaluated_at": pred.get("evaluated_at")
            })
        except Exception:
            continue

    paginated = records[page_skip : page_skip + page_limit]
    return {
        "status": "success",
        "total_evaluated": total_evaluated,
        "anomalies_detected": anomalies_detected,
        "returned_count": len(paginated),
        "detector_algorithm": "IsolationForest",
        "contamination_threshold": 0.05,
        "items": paginated
    }

@router.get("/explain/{engine_id}")
def explain_engine_prediction(
    engine_id: int,
    cycle: Optional[int] = Query(None, description="Optional operating cycle to explain")
):
    """
    Computes genuine local TreeSHAP explanations for a given engine observation,
    quantifying exact positive and negative feature contributions towards predicted RUL.
    """
    detail = engine_service.get_engine_detail(engine_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Engine {engine_id} not found.")

    if not detail.telemetry_history:
        raise HTTPException(status_code=404, detail=f"No telemetry history for engine {engine_id}.")

    target_cycle = cycle if isinstance(cycle, int) else None
    if target_cycle is not None:
        target_pts = [p for p in detail.telemetry_history if p.cycle == target_cycle]
        if not target_pts:
            raise HTTPException(status_code=404, detail=f"Cycle {target_cycle} not found for engine {engine_id}.")
        point = target_pts[0]
    else:
        point = detail.telemetry_history[-1]

    row_dict = point.model_dump()
    try:
        explanation = shap_explainer.explain_instance(row_dict)
        return {
            "engine_id": engine_id,
            "cycle": point.cycle,
            "true_rul_at_terminal": detail.true_rul,
            "explanation": explanation
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explanation calculation failed: {str(e)}")

@router.post("/explain")
def explain_custom_telemetry(payload: TelemetryInput):
    """
    Computes TreeSHAP feature attributions on arbitrary supplied telemetry.
    """
    row_dict = payload.model_dump()
    engine_id = row_dict.pop("engine_id")
    try:
        explanation = shap_explainer.explain_instance(row_dict)
        return {
            "engine_id": engine_id,
            "cycle": row_dict.get("cycle", 0),
            "explanation": explanation
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explanation calculation failed: {str(e)}")

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime

from backend.app.database.session import get_db, Base, engine
from backend.app.database.models import Alert
from backend.app.schemas.alert import AlertCreate, AlertUpdate, AlertResponse, AlertListResponse
from backend.app.services.engine_service import engine_service
from ml.inference.predictor import get_predictor

router = APIRouter()
predictor = get_predictor()

def _seed_alerts_if_empty(db: Session):
    """Seed initial alerts from fleet test set if database table is currently empty."""
    count = db.query(Alert).count()
    if count > 0:
        return

    if engine_service.test_df is None:
        return

    # Scan fleet terminal states
    grouped = engine_service.test_df.groupby("engine_id").last().reset_index()
    for _, row in grouped.iterrows():
        eid = int(row["engine_id"])
        row_dict = row.to_dict()
        pred = predictor.predict_single_row(row_dict, engine_id=eid)
        rul = pred["predicted_rul_cycles"]
        is_anom = pred.get("is_anomalous", False)
        anom_score = pred.get("anomaly_score")

        # Trigger conditions: Critical/Warning RUL, or Sensor Anomaly
        if rul <= 25.0:
            alert = Alert(
                engine_id=eid,
                cycle=int(row["cycle"]),
                predicted_rul=rul,
                risk_level="CRITICAL",
                trigger_reason=f"Predicted RUL ({rul:.1f} cycles) below critical safety threshold (25.0 cycles). Immediate engineering inspection recommended.",
                threshold_value=25.0,
                status="OPEN"
            )
            db.add(alert)
        elif rul <= 50.0:
            alert = Alert(
                engine_id=eid,
                cycle=int(row["cycle"]),
                predicted_rul=rul,
                risk_level="WARNING",
                trigger_reason=f"Predicted RUL ({rul:.1f} cycles) below warning envelope (50.0 cycles). Elevated HPC drift detected.",
                threshold_value=50.0,
                status="OPEN"
            )
            db.add(alert)
        elif is_anom:
            alert = Alert(
                engine_id=eid,
                cycle=int(row["cycle"]),
                predicted_rul=rul,
                risk_level=pred["urgency_tier"] if pred["urgency_tier"] != "NOMINAL" else "WARNING",
                trigger_reason=f"Isolation Forest flagged multi-sensor correlation anomaly (score: {anom_score}).",
                threshold_value=0.0,
                status="OPEN"
            )
            db.add(alert)

    db.commit()

@router.get("", response_model=AlertListResponse)
def list_alerts(
    status: Optional[str] = Query(None, description="Filter by alert status: OPEN, ACKNOWLEDGED, RESOLVED"),
    risk_level: Optional[str] = Query(None, description="Filter by risk tier: CRITICAL, WARNING, MODERATE"),
    engine_id: Optional[int] = Query(None, description="Filter by engine unit ID"),
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    List persistent maintenance alerts with filtering and status breakdown.
    Automatically seeds from fleet evaluation if table is empty.
    """
    _seed_alerts_if_empty(db)

    target_status = status.upper() if isinstance(status, str) else None
    target_risk = risk_level.upper() if isinstance(risk_level, str) else None
    target_eid = engine_id if isinstance(engine_id, int) else None
    page_limit = limit if isinstance(limit, int) else 100
    page_skip = skip if isinstance(skip, int) else 0

    query = db.query(Alert)
    if target_status:
        query = query.filter(Alert.status == target_status)
    if target_risk:
        query = query.filter(Alert.risk_level == target_risk)
    if target_eid is not None:
        query = query.filter(Alert.engine_id == target_eid)

    total_count = query.count()
    alerts = query.order_by(Alert.id.desc()).offset(page_skip).limit(page_limit).all()

    # Aggregate status counts
    open_count = db.query(Alert).filter(Alert.status == "OPEN").count()
    ack_count = db.query(Alert).filter(Alert.status == "ACKNOWLEDGED").count()
    res_count = db.query(Alert).filter(Alert.status == "RESOLVED").count()

    return AlertListResponse(
        total_count=total_count,
        open_count=open_count,
        acknowledged_count=ack_count,
        resolved_count=res_count,
        alerts=alerts
    )

@router.post("", response_model=AlertResponse)
def create_alert(payload: AlertCreate, db: Session = Depends(get_db)):
    """
    Create a new persistent maintenance alert manually or programmatically.
    """
    alert = Alert(
        engine_id=payload.engine_id,
        cycle=payload.cycle,
        predicted_rul=payload.predicted_rul,
        risk_level=payload.risk_level.upper(),
        trigger_reason=payload.trigger_reason,
        threshold_value=payload.threshold_value,
        status="OPEN"
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert

@router.patch("/{alert_id}", response_model=AlertResponse)
def update_alert_status(alert_id: int, payload: AlertUpdate, db: Session = Depends(get_db)):
    """
    Update the status of an alert (OPEN -> ACKNOWLEDGED / RESOLVED).
    Sets audit timestamps for accountability.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found.")

    new_status = payload.status.upper()
    if new_status not in ["OPEN", "ACKNOWLEDGED", "RESOLVED"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be OPEN, ACKNOWLEDGED, or RESOLVED.")

    now = datetime.datetime.now(datetime.timezone.utc)
    alert.status = new_status
    alert.updated_at = now

    if new_status == "ACKNOWLEDGED" and alert.acknowledged_at is None:
        alert.acknowledged_at = now
    elif new_status == "RESOLVED":
        alert.resolved_at = now

    db.commit()
    db.refresh(alert)
    return alert

@router.delete("/{alert_id}")
def delete_alert(alert_id: int, db: Session = Depends(get_db)):
    """
    Delete an alert record.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found.")
    db.delete(alert)
    db.commit()
    return {"message": f"Alert {alert_id} deleted successfully."}

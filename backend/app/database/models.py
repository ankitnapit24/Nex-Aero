import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, Text
from backend.app.database.session import Base

class PredictionLog(Base):
    """Stores inference execution records and assessment results."""
    __tablename__ = "prediction_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    engine_id = Column(Integer, index=True, nullable=False)
    cycle = Column(Integer, nullable=False)
    predicted_rul = Column(Float, nullable=False)
    raw_rul = Column(Float, nullable=False)
    urgency_tier = Column(String(50), nullable=False)
    recommendation = Column(Text, nullable=False)
    model_version = Column(String(50), nullable=False)
    features_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

class Alert(Base):
    """Stores persistent maintenance review alerts with auditable workflow transitions."""
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    engine_id = Column(Integer, index=True, nullable=False)
    cycle = Column(Integer, nullable=False)
    predicted_rul = Column(Float, nullable=False)
    risk_level = Column(String(50), nullable=False, index=True)  # CRITICAL, WARNING, MODERATE, NOMINAL
    trigger_reason = Column(Text, nullable=False)
    threshold_value = Column(Float, nullable=True)
    status = Column(String(50), default="OPEN", index=True)  # OPEN, ACKNOWLEDGED, RESOLVED
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc))
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

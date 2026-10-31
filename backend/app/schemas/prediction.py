from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List

class TelemetryInput(BaseModel):
    engine_id: int = Field(..., examples=[1])
    cycle: int = Field(..., examples=[120])
    setting_1: float = Field(..., examples=[-0.0007])
    setting_2: float = Field(..., examples=[-0.0004])
    setting_3: float = Field(..., examples=[100.0])
    sensor_2: float = Field(..., examples=[642.5])
    sensor_3: float = Field(..., examples=[1585.0])
    sensor_4: float = Field(..., examples=[1400.0])
    sensor_6: float = Field(..., examples=[21.61])
    sensor_7: float = Field(..., examples=[554.0])
    sensor_8: float = Field(..., examples=[2388.05])
    sensor_9: float = Field(..., examples=[9050.0])
    sensor_11: float = Field(..., examples=[47.3])
    sensor_12: float = Field(..., examples=[521.8])
    sensor_13: float = Field(..., examples=[2388.08])
    sensor_14: float = Field(..., examples=[8130.0])
    sensor_15: float = Field(..., examples=[8.42])
    sensor_17: float = Field(..., examples=[392.0])
    sensor_20: float = Field(..., examples=[39.0])
    sensor_21: float = Field(..., examples=[23.4])

class PredictionResponse(BaseModel):
    engine_id: int
    cycle: int
    predicted_rul_cycles: float
    raw_rul_cycles: float
    urgency_tier: str
    is_anomalous: bool = False
    anomaly_score: Optional[float] = None
    top_sensor_drifts: List[Dict[str, Any]] = []
    recommendation: str
    model_version: str
    evaluated_at: str
    disclaimer: str

class PredictionRecordItem(BaseModel):
    id: int
    engine_id: int
    cycle: int
    predicted_rul: float
    raw_rul: float
    urgency_tier: str
    recommendation: str
    model_version: str
    created_at: str

class ReplayStep(BaseModel):
    engine_id: int
    cycle: int
    predicted_rul_cycles: float
    urgency_tier: str
    is_anomalous: bool
    telemetry: Dict[str, float]

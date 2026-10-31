from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class EngineSummary(BaseModel):
    engine_id: int = Field(..., description="Unique engine identifier")
    dataset_split: str = Field(..., description="'test' or 'train'")
    total_cycles: int = Field(..., description="Total operating cycles recorded")
    last_cycle: int = Field(..., description="Last observed operational cycle")
    predicted_rul: Optional[float] = Field(None, description="Predicted Remaining Useful Life in cycles")
    true_rul: Optional[float] = Field(None, description="Ground truth RUL if available (test set ground truth)")
    urgency_tier: Optional[str] = Field(None, description="CRITICAL, WARNING, MODERATE, or NOMINAL")

class EngineTelemetryPoint(BaseModel):
    cycle: int
    setting_1: float
    setting_2: float
    setting_3: float
    sensor_2: float
    sensor_3: float
    sensor_4: float
    sensor_7: float
    sensor_8: float
    sensor_9: float
    sensor_11: float
    sensor_12: float
    sensor_13: float
    sensor_14: float
    sensor_15: float
    sensor_17: float
    sensor_20: float
    sensor_21: float

class EngineDetail(BaseModel):
    engine_id: int
    dataset_split: str
    last_cycle: int
    predicted_rul: Optional[float]
    true_rul: Optional[float]
    urgency_tier: Optional[str]
    recommendation: Optional[str]
    telemetry_history: List[EngineTelemetryPoint]

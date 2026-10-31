from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class AlertBase(BaseModel):
    engine_id: int = Field(..., description="Target turbofan engine unit identifier")
    cycle: int = Field(..., description="Operating cycle when alert was triggered")
    predicted_rul: float = Field(..., description="Estimated Remaining Useful Life cycles")
    risk_level: str = Field(..., description="CRITICAL, WARNING, MODERATE, or NOMINAL")
    trigger_reason: str = Field(..., description="Explanation of heuristic or anomaly drift triggering alert")
    threshold_value: Optional[float] = Field(None, description="Quantitative limit or threshold crossed")

class AlertCreate(AlertBase):
    pass

class AlertUpdate(BaseModel):
    status: str = Field(..., description="New alert status: OPEN, ACKNOWLEDGED, or RESOLVED")

class AlertResponse(AlertBase):
    id: int
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class AlertListResponse(BaseModel):
    total_count: int
    open_count: int
    acknowledged_count: int
    resolved_count: int
    alerts: List[AlertResponse]

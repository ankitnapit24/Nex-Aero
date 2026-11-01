import os
import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Nex Aero"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
    ]
    DATABASE_URL: str = "sqlite:///./data/nex_aero.db"
    
    # Model configuration
    MODEL_PATH: str = os.path.join("ml", "models", "rf_fd001_pipeline.joblib")
    METADATA_PATH: str = os.path.join("ml", "models", "rf_fd001_metadata.json")
    
    # Demo thresholds (cycles) - non-authoritative illustrative thresholds
    CRITICAL_RUL_THRESHOLD: int = 25
    WARNING_RUL_THRESHOLD: int = 50
    MODERATE_RUL_THRESHOLD: int = 80

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return []
            if v.startswith("[") and v.endswith("]"):
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if str(item).strip()]
                except Exception:
                    pass
            # Comma-separated string format: "https://a.vercel.app,http://localhost:5173"
            return [item.strip() for item in v.split(",") if item.strip()]
        elif isinstance(v, list):
            return [str(item).strip() for item in v if str(item).strip()]
        return []

settings = Settings()

"""
AeroGuard AI - ML Inference Engine
Loads serialized model pipeline and executes schema-validated predictions for Remaining Useful Life.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone

from ml.config import DEFAULT_FEATURE_COLUMNS, CONSTANT_SENSORS

class RULPredictor:
    def __init__(self, model_path: Optional[str] = None, metadata_path: Optional[str] = None):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.model_path = model_path or os.path.join(base_dir, "ml", "models", "rf_fd001_pipeline.joblib")
        self.metadata_path = metadata_path or os.path.join(base_dir, "ml", "models", "rf_fd001_metadata.json")
        self.model = None
        self.metadata = {}
        self._load_artifacts()

    def _load_artifacts(self):
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(
                f"Model artifact not found at {self.model_path}. "
                f"Please run 'python scripts/train_model.py' first."
            )
        
        self.model = joblib.load(self.model_path)
        # Ensure single-threaded fast inference to avoid multiprocessing overhead / IPC issues
        if hasattr(self.model, "n_jobs"):
            self.model.n_jobs = 1
        
        if os.path.exists(self.metadata_path):
            with open(self.metadata_path, "r") as f:
                self.metadata = json.load(f)
        else:
            self.metadata = {
                "version": "1.0.0",
                "features": DEFAULT_FEATURE_COLUMNS
            }

    @property
    def expected_features(self) -> List[str]:
        return self.metadata.get("features", DEFAULT_FEATURE_COLUMNS)

    def assess_urgency(self, predicted_rul: float) -> Tuple[str, str]:
        """
        Calculates illustrative urgency category and operational maintenance advisory.
        Thresholds are non-authoritative demo heuristics.
        """
        if predicted_rul <= 25.0:
            urgency = "CRITICAL"
            recommendation = (
                "IMMEDIATE ACTION RECOMMENDED: HPC stage degradation indicates imminent end-of-service. "
                "Recommend grounding aircraft for comprehensive borescope inspection and compressor blade acoustic audit."
            )
        elif predicted_rul <= 50.0:
            urgency = "WARNING"
            recommendation = (
                "ELEVATED ATTENTION: High-pressure compressor telemetry exhibits accelerated drift. "
                "Schedule priority maintenance hangar inspection at next turn or within 10 flight cycles."
            )
        elif predicted_rul <= 80.0:
            urgency = "MODERATE"
            recommendation = (
                "ROUTINE MONITORING: Operating parameters are within acceptable parameters with moderate wear. "
                "Flag engine for routine oil analysis and sensor calibration during next scheduled C-check."
            )
        else:
            urgency = "NOMINAL"
            recommendation = (
                "OPTIMAL STATUS: Turbofan operating within nominal engineering tolerances. "
                "No immediate maintenance intervention required."
            )
        return urgency, recommendation

    def predict_single_row(self, row_dict: Dict[str, Any], engine_id: int) -> Dict[str, Any]:
        """
        Predicts Remaining Useful Life for a single operating cycle observation.
        """
        features = self.expected_features
        missing_keys = [f for f in features if f not in row_dict]
        if missing_keys:
            raise ValueError(f"Input telemetry missing required features: {missing_keys}")

        # Construct single-row DataFrame in exact expected column order
        df = pd.DataFrame([{col: float(row_dict[col]) for col in features}])
        raw_rul = float(self.model.predict(df)[0])
        clamped_rul = max(0.0, raw_rul)
        urgency, recommendation = self.assess_urgency(clamped_rul)

        return {
            "engine_id": engine_id,
            "cycle": int(row_dict.get("cycle", 0)),
            "predicted_rul_cycles": round(clamped_rul, 1),
            "raw_rul_cycles": round(raw_rul, 2),
            "urgency_tier": urgency,
            "recommendation": recommendation,
            "model_version": self.metadata.get("version", "1.0.0"),
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
            "disclaimer": "Experimental decision-support heuristic. Does NOT certify airworthiness or authorize maintenance."
        }

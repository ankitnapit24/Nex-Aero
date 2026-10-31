"""
AeroGuard AI - ML Inference Engine
Loads serialized model pipeline and executes schema-validated predictions for Remaining Useful Life.
Includes Isolation Forest anomaly detection and local sensor drift attribution.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone

from ml.config import DEFAULT_FEATURE_COLUMNS, ANOMALY_FEATURE_COLUMNS, CONSTANT_SENSORS

# Human-readable sensor naming for explainability
SENSOR_DESCRIPTIONS = {
    "sensor_2": "LPC Outlet Temp (°R)",
    "sensor_3": "HPC Outlet Temp (°R)",
    "sensor_4": "LPT Outlet Temp (°R)",
    "sensor_6": "Bypass-Duct Pressure (psia)",
    "sensor_7": "Total HPC Pressure (psia)",
    "sensor_8": "Physical Fan Speed (rpm)",
    "sensor_9": "Physical Core Speed (rpm)",
    "sensor_11": "Static HPC Pressure (psia)",
    "sensor_12": "Fuel Flow Ratio (pps/psia)",
    "sensor_13": "Corrected Fan Speed (rpm)",
    "sensor_14": "Corrected Core Speed (rpm)",
    "sensor_15": "Bypass Ratio",
    "sensor_17": "Bleed Enthalpy",
    "sensor_20": "HPT Coolant Bleed (lbm/s)",
    "sensor_21": "LPT Coolant Bleed (lbm/s)",
}

class RULPredictor:
    def __init__(self, model_path: Optional[str] = None, metadata_path: Optional[str] = None):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.model_path = model_path or os.path.join(base_dir, "ml", "models", "rf_fd001_pipeline.joblib")
        self.metadata_path = metadata_path or os.path.join(base_dir, "ml", "models", "rf_fd001_metadata.json")
        self.anomaly_path = os.path.join(base_dir, "ml", "models", "iforest_fd001.joblib")
        self.anomaly_meta_path = os.path.join(base_dir, "ml", "models", "iforest_metadata.json")
        self.baseline_stats_path = os.path.join(base_dir, "ml", "models", "baseline_sensor_stats.json")
        
        self.model = None
        self.anomaly_model = None
        self.anomaly_features = ANOMALY_FEATURE_COLUMNS
        self.baseline_stats = {}
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

        # Load Isolation Forest if present
        if os.path.exists(self.anomaly_path):
            try:
                self.anomaly_model = joblib.load(self.anomaly_path)
                if hasattr(self.anomaly_model, "n_jobs"):
                    self.anomaly_model.n_jobs = 1
                if os.path.exists(self.anomaly_meta_path):
                    with open(self.anomaly_meta_path, "r") as f:
                        meta = json.load(f)
                        self.anomaly_features = meta.get("features", ANOMALY_FEATURE_COLUMNS)
            except Exception:
                self.anomaly_model = None
        else:
            self.anomaly_model = None

        # Load baseline reference statistics
        if os.path.exists(self.baseline_stats_path):
            try:
                with open(self.baseline_stats_path, "r") as f:
                    self.baseline_stats = json.load(f)
            except Exception:
                self.baseline_stats = {}

    @property
    def expected_features(self) -> List[str]:
        return self.metadata.get("features", DEFAULT_FEATURE_COLUMNS)

    def assess_urgency(self, predicted_rul: float) -> Tuple[str, str]:
        """
        Calculates illustrative urgency category and operational maintenance advisory.
        Uses review-oriented recommendations in compliance with aviation engineering standards.
        """
        if predicted_rul <= 25.0:
            urgency = "CRITICAL"
            recommendation = (
                "IMMEDIATE ENGINEERING REVIEW: HPC degradation signature indicates imminent operational limit. "
                "Flag for engineering review and borescope inspection by authorized aviation maintenance personnel according to applicable technical manual."
            )
        elif predicted_rul <= 50.0:
            urgency = "WARNING"
            recommendation = (
                "PRIORITY MAINTENANCE REVIEW: Elevated multi-sensor drift observed in high-pressure turbine/compressor. "
                "Schedule engineering evaluation and sensor verification during next scheduled maintenance window."
            )
        elif predicted_rul <= 80.0:
            urgency = "MODERATE"
            recommendation = (
                "ROUTINE MONITORING: Operating parameters indicate moderate component wear within permissible limits. "
                "Continue standard fleet monitoring and inspect at next scheduled service check."
            )
        else:
            urgency = "NOMINAL"
            recommendation = (
                "NOMINAL CRUISE TOLERANCES: Operating parameters nominal. "
                "Continue standard fleet monitoring per maintenance schedule."
            )
        return urgency, recommendation

    def explain_sensor_drift(self, row_dict: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Calculates local feature drift explanations relative to healthy nominal baseline.
        Returns top anomalous sensor deviations sorted by magnitude of standard deviations (z-score).
        """
        explanations = []
        for feature, stats in self.baseline_stats.items():
            if feature in row_dict and feature.startswith("sensor_"):
                val = float(row_dict[feature])
                mean = stats["mean"]
                std = stats["std"]
                z_score = (val - mean) / std
                delta = val - mean
                
                explanations.append({
                    "feature": feature,
                    "description": SENSOR_DESCRIPTIONS.get(feature, feature),
                    "current_value": round(val, 2),
                    "baseline_mean": round(mean, 2),
                    "delta": round(delta, 2),
                    "z_score": round(z_score, 2),
                    "abs_z": abs(z_score),
                    "trend": "ELEVATED" if delta > 0 else "DEPRESSED"
                })

        # Sort by absolute z-score descending
        explanations.sort(key=lambda x: x["abs_z"], reverse=True)
        return explanations[:5]

    def predict_single_row(self, row_dict: Dict[str, Any], engine_id: int) -> Dict[str, Any]:
        """
        Predicts Remaining Useful Life and evaluates sensor anomaly scores.
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

        # Anomaly scoring strictly on physical parameters (excluding cycle, engine_id, rul)
        is_anomalous = False
        anomaly_score = None
        if self.anomaly_model is not None:
            try:
                anomaly_cols = getattr(self, "anomaly_features", ANOMALY_FEATURE_COLUMNS)
                anomaly_df = pd.DataFrame([{col: float(row_dict[col]) for col in anomaly_cols if col in row_dict}])
                if anomaly_df.shape[1] == len(anomaly_cols):
                    # decision_function returns negative values for anomalies, positive for nominal
                    raw_score = float(self.anomaly_model.decision_function(anomaly_df)[0])
                    is_anomalous = bool(self.anomaly_model.predict(anomaly_df)[0] == -1)
                    anomaly_score = round(raw_score, 3)
            except Exception:
                is_anomalous = False
                anomaly_score = None

        # Local sensor drift explanations
        drift_explanations = self.explain_sensor_drift(row_dict)

        return {
            "engine_id": engine_id,
            "cycle": int(row_dict.get("cycle", 0)),
            "predicted_rul_cycles": round(clamped_rul, 1),
            "raw_rul_cycles": round(raw_rul, 2),
            "urgency_tier": urgency,
            "is_anomalous": is_anomalous,
            "anomaly_score": anomaly_score,
            "top_sensor_drifts": drift_explanations,
            "recommendation": recommendation,
            "model_version": self.metadata.get("version", "1.0.0"),
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
            "disclaimer": "Experimental decision-support heuristic. Does NOT certify airworthiness or authorize maintenance."
        }

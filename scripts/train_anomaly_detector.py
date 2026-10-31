"""
AeroGuard AI - Unsupervised Anomaly Detection Module
Trains an IsolationForest model on healthy baseline turbofan cycles (first 30 cycles of engines)
to establish nominal multi-sensor operating boundaries and identify degradation anomalies.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ml.config import DEFAULT_FEATURE_COLUMNS, RANDOM_STATE
from ml.data_processing.loader import load_cmapss_train

DATA_DIR = os.path.join(BASE_DIR, "data", "raw")
MODELS_DIR = os.path.join(BASE_DIR, "ml", "models")

def train_isolation_forest():
    print("=" * 60)
    print("AeroGuard AI - Training Isolation Forest Sensor Anomaly Detector")
    print("=" * 60)

    train_df = load_cmapss_train(DATA_DIR)
    
    # Establish baseline healthy envelope using early operational cycles (cycle <= 30)
    # where turbofan components have not developed structural HPC degradation
    healthy_df = train_df[train_df["cycle"] <= 30].copy()
    
    features = DEFAULT_FEATURE_COLUMNS
    X_healthy = healthy_df[features]
    print(f"Training on {len(X_healthy)} nominal baseline cycles across {healthy_df['engine_id'].nunique()} engines.")

    # Isolation Forest
    iso_forest = IsolationForest(
        n_estimators=100,
        contamination=0.05,
        random_state=RANDOM_STATE,
        n_jobs=1
    )
    iso_forest.fit(X_healthy)

    # Compute baseline reference statistics (mean & std per sensor) for local attribution
    baseline_stats = {}
    for col in features:
        mean_val = float(healthy_df[col].mean())
        std_val = float(healthy_df[col].std())
        baseline_stats[col] = {
            "mean": round(mean_val, 4),
            "std": round(std_val if std_val > 1e-6 else 1.0, 4)
        }

    # Save model artifact
    model_path = os.path.join(MODELS_DIR, "iforest_fd001.joblib")
    joblib.dump(iso_forest, model_path)
    print(f"[OK] Anomaly model artifact saved to: {model_path}")

    # Save baseline stats JSON
    stats_path = os.path.join(MODELS_DIR, "baseline_sensor_stats.json")
    with open(stats_path, "w") as f:
        json.dump(baseline_stats, f, indent=2)
    print(f"[OK] Baseline sensor distribution statistics saved to: {stats_path}")

if __name__ == "__main__":
    train_anomaly_detector = train_isolation_forest
    train_anomaly_detector()

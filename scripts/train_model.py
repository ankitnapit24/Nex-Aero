"""
Nex Aero - Model Training & Evaluation Pipeline
Trains a leak-free RandomForestRegressor on NASA C-MAPSS FD001.
Evaluates with GroupKFold engine-wise cross-validation and official NASA test set.
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import json
import datetime
import numpy as np
import pandas as pd
import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import GroupKFold
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from ml.config import (
    DEFAULT_FEATURE_COLUMNS,
    RANDOM_STATE,
    N_ESTIMATORS,
    RUL_CAP_DEFAULT,
    CONSTANT_SENSORS
)
from ml.data_processing.loader import load_cmapss_train, load_cmapss_test, load_cmapss_test_rul

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data", "raw")
MODELS_DIR = os.path.join(BASE_DIR, "ml", "models")
EVAL_DIR = os.path.join(BASE_DIR, "ml", "evaluation")

def compute_nasa_score(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """
    Official NASA Prognostics asymmetric scoring function:
    d = y_pred - y_true
    Late predictions (d > 0) are penalized much more heavily than early predictions (d < 0).
    """
    d = y_pred - y_true
    score = 0.0
    for diff in d:
        if diff < 0:
            score += np.exp(-diff / 13.0) - 1.0
        else:
            score += np.exp(diff / 10.0) - 1.0
    return float(score)

def train_and_evaluate(cap_rul: int = RUL_CAP_DEFAULT):
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(EVAL_DIR, exist_ok=True)

    print("=" * 60)
    print("Nex Aero - Turbofan RUL Baseline Model Training")
    print(f"Dataset: NASA C-MAPSS FD001 | Target Cap: {cap_rul} cycles")
    print("=" * 60)

    # 1. Load Data
    train_df = load_cmapss_train(DATA_DIR, cap_rul=cap_rul)
    test_df = load_cmapss_test(DATA_DIR)
    test_rul_true = load_cmapss_test_rul(DATA_DIR)

    features = DEFAULT_FEATURE_COLUMNS
    print(f"\nModel Features ({len(features)}): {features}")
    print(f"Excluded Constant Sensors: {CONSTANT_SENSORS}")

    X = train_df[features].copy()
    y = train_df["rul"].values
    groups = train_df["engine_id"].values

    # 2. Engine-Wise Grouped Cross-Validation (5-Fold)
    gkf = GroupKFold(n_splits=5)
    cv_maes, cv_rmses, cv_r2s = [], [], []

    print("\n--- Running 5-Fold Engine-Wise Cross-Validation ---")
    for fold, (train_idx, val_idx) in enumerate(gkf.split(X, y, groups=groups), 1):
        X_tr, y_tr = X.iloc[train_idx], y[train_idx]
        X_val, y_val = X.iloc[val_idx], y[val_idx]

        rf_fold = RandomForestRegressor(
            n_estimators=N_ESTIMATORS,
            max_depth=16,
            min_samples_split=4,
            min_samples_leaf=2,
            random_state=RANDOM_STATE + fold,
            n_jobs=-1
        )
        rf_fold.fit(X_tr, y_tr)
        preds_val = rf_fold.predict(X_val)

        mae = mean_absolute_error(y_val, preds_val)
        rmse = np.sqrt(mean_squared_error(y_val, preds_val))
        r2 = r2_score(y_val, preds_val)

        cv_maes.append(mae)
        cv_rmses.append(rmse)
        cv_r2s.append(r2)
        print(f"Fold {fold}: MAE = {mae:.2f} cycles | RMSE = {rmse:.2f} cycles | R² = {r2:.3f}")

    mean_cv_mae = float(np.mean(cv_maes))
    mean_cv_rmse = float(np.mean(cv_rmses))
    mean_cv_r2 = float(np.mean(cv_r2s))
    print(f"\n[Validation Aggregate] Mean MAE: {mean_cv_mae:.2f} ± {np.std(cv_maes):.2f} cycles")
    print(f"[Validation Aggregate] Mean RMSE: {mean_cv_rmse:.2f} ± {np.std(cv_rmses):.2f} cycles")
    print(f"[Validation Aggregate] Mean R²: {mean_cv_r2:.3f}")

    # 3. Fit Final Production Model on Full Training Dataset
    print("\n--- Training Production Model on 100% Training Fleet ---")
    final_model = RandomForestRegressor(
        n_estimators=N_ESTIMATORS,
        max_depth=16,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=RANDOM_STATE,
        n_jobs=-1
    )
    final_model.fit(X, y)

    # 4. Official NASA Test Set Evaluation
    # For each test engine, extract the last available observed cycle
    last_test_rows = test_df.groupby("engine_id").last().reset_index()
    last_test_rows = last_test_rows.sort_values(by="engine_id")
    
    # Verify engine_id alignment with test_rul_true
    assert (last_test_rows["engine_id"].values == test_rul_true.index.values).all(), "Test Engine IDs do not match ground truth!"

    X_test_last = last_test_rows[features]
    test_preds = final_model.predict(X_test_last)

    # Note: Clamping negative predictions to 0 for business logic
    test_preds_clamped = np.clip(test_preds, 0, None)
    y_test_ground_truth = test_rul_true.values

    # If evaluating against capped ground-truth (standard literature practice)
    y_test_capped = np.clip(y_test_ground_truth, 0, cap_rul)

    test_mae = float(mean_absolute_error(y_test_capped, test_preds_clamped))
    test_rmse = float(np.sqrt(mean_squared_error(y_test_capped, test_preds_clamped)))
    test_r2 = float(r2_score(y_test_capped, test_preds_clamped))
    nasa_score = compute_nasa_score(y_test_capped, test_preds_clamped)

    # Also compute uncapped test metrics for transparency
    test_mae_uncapped = float(mean_absolute_error(y_test_ground_truth, test_preds_clamped))
    test_rmse_uncapped = float(np.sqrt(mean_squared_error(y_test_ground_truth, test_preds_clamped)))

    print("\n--- Official NASA Test Split Performance ---")
    print(f"Test MAE (Capped target): {test_mae:.2f} cycles")
    print(f"Test RMSE (Capped target): {test_rmse:.2f} cycles")
    print(f"Test R²: {test_r2:.3f}")
    print(f"NASA Asymmetric Penalty Score: {nasa_score:.1f}")
    print(f"Test MAE (Uncapped target): {test_mae_uncapped:.2f} cycles")
    print(f"Test RMSE (Uncapped target): {test_rmse_uncapped:.2f} cycles")

    # 5. Save Artifacts
    model_path = os.path.join(MODELS_DIR, "rf_fd001_pipeline.joblib")
    joblib.dump(final_model, model_path)
    print(f"\n[OK] Model artifact successfully saved to: {model_path}")

    # Feature Importances
    importances = dict(zip(features, [float(v) for v in final_model.feature_importances_]))
    sorted_importances = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))

    metadata = {
        "model_name": "RandomForestRegressor_FD001",
        "version": "1.0.0",
        "dataset": "NASA C-MAPSS FD001",
        "training_date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "random_state": RANDOM_STATE,
        "n_estimators": N_ESTIMATORS,
        "target_convention": f"Piecewise-linear RUL capped at {cap_rul} cycles",
        "features": features,
        "feature_importances": sorted_importances,
        "excluded_constant_sensors": CONSTANT_SENSORS,
        "cv_validation_metrics": {
            "n_folds": 5,
            "mean_mae_cycles": round(mean_cv_mae, 2),
            "mean_rmse_cycles": round(mean_cv_rmse, 2),
            "mean_r2": round(mean_cv_r2, 3)
        },
        "nasa_test_metrics": {
            "test_engines": len(test_preds),
            "test_mae_cycles": round(test_mae, 2),
            "test_rmse_cycles": round(test_rmse, 2),
            "test_r2": round(test_r2, 3),
            "nasa_score": round(nasa_score, 1),
            "test_mae_uncapped_cycles": round(test_mae_uncapped, 2),
            "test_rmse_uncapped_cycles": round(test_rmse_uncapped, 2)
        },
        "disclaimer": "This model provides experimental decision-support estimates. Not certified for flight operations or maintenance authorization."
    }

    metadata_path = os.path.join(MODELS_DIR, "rf_fd001_metadata.json")
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"[OK] Model metadata saved to: {metadata_path}")

    # 6. Generate Diagnostic Evaluation Plot
    plt.figure(figsize=(12, 5))

    # Predicted vs Actual
    plt.subplot(1, 2, 1)
    plt.scatter(y_test_capped, test_preds_clamped, alpha=0.7, color="#0284c7", edgecolors="none")
    plt.plot([0, cap_rul], [0, cap_rul], 'r--', lw=2, label="Ideal 1:1 Reference")
    plt.xlabel("Actual RUL (cycles)")
    plt.ylabel("Predicted RUL (cycles)")
    plt.title(f"Test Set: Actual vs Predicted (MAE={test_mae:.1f}c)")
    plt.legend()
    plt.grid(True, linestyle=":", alpha=0.6)

    # Residual Distribution
    plt.subplot(1, 2, 2)
    residuals = test_preds_clamped - y_test_capped
    plt.hist(residuals, bins=20, color="#0f766e", edgecolor="black", alpha=0.8)
    plt.axvline(0, color="red", linestyle="--", label="Zero Error")
    plt.xlabel("Residual (Predicted - Actual cycles)")
    plt.ylabel("Count of Engines")
    plt.title("Error Residuals Distribution")
    plt.legend()
    plt.grid(True, linestyle=":", alpha=0.6)

    plt.tight_layout()
    plot_path = os.path.join(EVAL_DIR, "rf_fd001_evaluation.png")
    plt.savefig(plot_path, dpi=200)
    plt.close()
    print(f"[OK] Evaluation diagnostic plot saved to: {plot_path}")

if __name__ == "__main__":
    train_and_evaluate()

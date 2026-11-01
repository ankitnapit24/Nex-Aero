"""
Nex Aero - Master Cloud Deployment Preparation Orchestrator
Idempotently prepares NASA C-MAPSS dataset, verifies data integrity,
trains/verifies Random Forest and Isolation Forest models, and validates inference readiness.

Used by Render build command, Docker container builds, and CI workflows:
    python scripts/prepare_deployment.py
"""

import os
import sys
import argparse
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

RAW_DATA_DIR = os.path.join(BASE_DIR, "data", "raw")
PROCESSED_DATA_DIR = os.path.join(BASE_DIR, "data", "processed")
MODELS_DIR = os.path.join(BASE_DIR, "ml", "models")

REQUIRED_RAW_FILES = ["train_FD001.txt", "test_FD001.txt", "RUL_FD001.txt"]
REQUIRED_PROCESSED_FILES = ["train_fd001.csv", "test_fd001.csv", "test_rul_fd001.csv"]
REQUIRED_MODEL_FILES = [
    "rf_fd001_pipeline.joblib",
    "rf_fd001_metadata.json",
    "iforest_fd001.joblib",
    "iforest_metadata.json",
    "baseline_sensor_stats.json",
]


def check_files_exist(directory: str, file_list: list) -> bool:
    for filename in file_list:
        path = os.path.join(directory, filename)
        if not os.path.isfile(path) or os.path.getsize(path) == 0:
            return False
    return True


def step_dataset(force: bool = False):
    print("\n[Step 1/5] Checking NASA C-MAPSS FD001 Dataset Availability...")
    os.makedirs(RAW_DATA_DIR, exist_ok=True)
    
    raw_ready = check_files_exist(RAW_DATA_DIR, REQUIRED_RAW_FILES)
    if not raw_ready or force:
        print("Raw dataset files missing or incomplete. Initiating automated download...")
        from scripts.download_dataset import download_and_extract
        success = download_and_extract()
        if not success or not check_files_exist(RAW_DATA_DIR, REQUIRED_RAW_FILES):
            raise RuntimeError("CRITICAL: Failed to download or verify NASA C-MAPSS FD001 dataset.")
        print("[OK] Dataset downloaded and verified in data/raw/.")
    else:
        print("[OK] Raw FD001 dataset already present and verified.")


def step_preprocess(force: bool = False):
    print("\n[Step 2/5] Checking Processed Dataset Cache...")
    os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)
    
    processed_ready = check_files_exist(PROCESSED_DATA_DIR, REQUIRED_PROCESSED_FILES)
    if not processed_ready or force:
        print("Generating processed tabular dataset artifacts...")
        from scripts.prepare_dataset import prepare_data
        prepare_data()
        if not check_files_exist(PROCESSED_DATA_DIR, REQUIRED_PROCESSED_FILES):
            raise RuntimeError("CRITICAL: Failed to generate processed dataset files.")
        print("[OK] Processed dataset successfully cached.")
    else:
        print("[OK] Processed dataset cache verified.")


def step_models(force: bool = False):
    print("\n[Step 3/5] Checking Machine Learning Model Artifacts...")
    os.makedirs(MODELS_DIR, exist_ok=True)

    # 1. Random Forest RUL Predictor
    rf_ready = (
        os.path.isfile(os.path.join(MODELS_DIR, "rf_fd001_pipeline.joblib")) and
        os.path.isfile(os.path.join(MODELS_DIR, "rf_fd001_metadata.json"))
    )
    if not rf_ready or force:
        print("Random Forest model artifact missing. Training production model...")
        from scripts.train_model import train_and_evaluate
        train_and_evaluate()
        print("[OK] Random Forest model training complete.")
    else:
        print("[OK] Random Forest model artifact already present.")

    # 2. Isolation Forest Anomaly Detector
    if_ready = (
        os.path.isfile(os.path.join(MODELS_DIR, "iforest_fd001.joblib")) and
        os.path.isfile(os.path.join(MODELS_DIR, "iforest_metadata.json")) and
        os.path.isfile(os.path.join(MODELS_DIR, "baseline_sensor_stats.json"))
    )
    if not if_ready or force:
        print("Isolation Forest anomaly detector artifact missing. Training anomaly model...")
        from scripts.train_anomaly_detector import train_isolation_forest
        train_isolation_forest()
        print("[OK] Isolation Forest model training complete.")
    else:
        print("[OK] Isolation Forest anomaly detector already present.")


def step_verify_artifacts():
    print("\n[Step 4/5] Verifying Artifact Integrity and Deserialization...")
    for filename in REQUIRED_MODEL_FILES:
        path = os.path.join(MODELS_DIR, filename)
        if not os.path.isfile(path):
            raise FileNotFoundError(f"Missing required model artifact: {path}")
        size_kb = os.path.getsize(path) / 1024.0
        print(f" - {filename:30s} {size_kb:8.1f} KB [FOUND]")

    # Validate JSON formats
    for json_file in ["rf_fd001_metadata.json", "iforest_metadata.json", "baseline_sensor_stats.json"]:
        json_path = os.path.join(MODELS_DIR, json_file)
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            assert isinstance(data, dict), f"{json_file} must be a valid JSON dictionary"
    print("[OK] All artifact files and JSON schemas verified.")


def step_inference_smoke_test():
    print("\n[Step 5/5] Executing End-to-End Inference Verification...")
    from ml.inference.predictor import RULPredictor
    from ml.inference.explainer import SHAPExplainer

    predictor = RULPredictor()
    if predictor.model is None:
        raise RuntimeError("Predictor failed to deserialize Random Forest model.")
    if predictor.anomaly_model is None:
        raise RuntimeError("Predictor failed to deserialize Isolation Forest model.")

    # Run realistic test observation
    sample_input = {
        "cycle": 150,
        "setting_1": -0.0005,
        "setting_2": 0.0004,
        "setting_3": 100.0,
        "sensor_2": 642.50,
        "sensor_3": 1588.00,
        "sensor_4": 1405.00,
        "sensor_6": 21.61,
        "sensor_7": 553.50,
        "sensor_8": 2388.05,
        "sensor_9": 9050.00,
        "sensor_11": 47.45,
        "sensor_12": 521.80,
        "sensor_13": 2388.08,
        "sensor_14": 8135.00,
        "sensor_15": 8.4200,
        "sensor_17": 392.0,
        "sensor_20": 38.85,
        "sensor_21": 23.3500,
    }

    result = predictor.predict_single_row(sample_input, engine_id=1)
    print(f" - Sample Prediction Output:")
    print(f"   Engine ID:        {result['engine_id']}")
    print(f"   Predicted RUL:    {result['predicted_rul_cycles']} cycles")
    print(f"   Urgency Tier:     {result['urgency_tier']}")
    print(f"   Anomaly Score:    {result['anomaly_score']}")
    print(f"   Is Anomalous:     {result['is_anomalous']}")

    assert result["predicted_rul_cycles"] >= 0, "RUL must be non-negative"
    assert result["urgency_tier"] in ["CRITICAL", "WARNING", "MODERATE", "NOMINAL"], "Invalid urgency tier"

    # Verify SHAP Explainer
    explainer = SHAPExplainer()
    explanation = explainer.explain_instance(sample_input)
    print(f" - Local Attribution Method: {explanation['method']}")
    print(f"   Contributions Count:      {len(explanation['contributions'])}")
    assert len(explanation["contributions"]) > 0, "SHAP should output feature contributions"

    print("\n=======================================================")
    print("SUCCESS: Nex Aero deployment preparation is 100% complete!")
    print("All models, metadata, and data pipelines are verified.")
    print("=======================================================\n")


def main():
    parser = argparse.ArgumentParser(description="Prepare Nex Aero for deployment")
    parser.add_argument("--force-download", action="store_true", help="Force re-download of dataset")
    parser.add_argument("--force-train", action="store_true", help="Force model retraining")
    args = parser.parse_args()

    try:
        step_dataset(force=args.force_download)
        step_preprocess(force=args.force_train)
        step_models(force=args.force_train)
        step_verify_artifacts()
        step_inference_smoke_test()
    except Exception as exc:
        print(f"\n[DEPLOYMENT PREPARATION FAILED]: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

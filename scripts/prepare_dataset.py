"""
AeroGuard AI - Dataset Preparation Script
Loads raw NASA C-MAPSS FD001 data, calculates RUL labels, and saves structured processed data.
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import pandas as pd
from ml.data_processing.loader import load_cmapss_train, load_cmapss_test, load_cmapss_test_rul
from ml.config import RUL_CAP_DEFAULT
RAW_DATA_DIR = os.path.join(BASE_DIR, "data", "raw")
PROCESSED_DATA_DIR = os.path.join(BASE_DIR, "data", "processed")

def prepare_data():
    print(f"Loading raw C-MAPSS dataset from {RAW_DATA_DIR}...")
    os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)
    
    # 1. Load training data and compute RUL
    train_df = load_cmapss_train(RAW_DATA_DIR, cap_rul=RUL_CAP_DEFAULT)
    print(f"[OK] Loaded {len(train_df)} training records across {train_df['engine_id'].nunique()} engines.")
    
    # 2. Load test data
    test_df = load_cmapss_test(RAW_DATA_DIR)
    print(f"[OK] Loaded {len(test_df)} test records across {test_df['engine_id'].nunique()} engines.")
    
    # 3. Load official ground-truth test RUL
    test_rul = load_cmapss_test_rul(RAW_DATA_DIR)
    print(f"[OK] Loaded {len(test_rul)} test ground-truth targets.")
    
    # 4. Save processed artifacts
    train_out = os.path.join(PROCESSED_DATA_DIR, "train_fd001.csv")
    test_out = os.path.join(PROCESSED_DATA_DIR, "test_fd001.csv")
    test_rul_out = os.path.join(PROCESSED_DATA_DIR, "test_rul_fd001.csv")
    
    train_df.to_csv(train_out, index=False)
    test_df.to_csv(test_out, index=False)
    test_rul.to_frame(name="true_rul").to_csv(test_rul_out, index_label="engine_id")
    
    print("\nDataset preparation successfully saved to data/processed/:")
    print(f" - {train_out} ({len(train_df)} rows)")
    print(f" - {test_out} ({len(test_df)} rows)")
    print(f" - {test_rul_out} ({len(test_rul)} rows)")

    # Print summary statistics
    min_cycles = train_df.groupby("engine_id")["cycle"].max().min()
    max_cycles = train_df.groupby("engine_id")["cycle"].max().max()
    avg_cycles = train_df.groupby("engine_id")["cycle"].max().mean()
    print("\nTraining Engine Lifespan Profile:")
    print(f" - Min lifespan: {min_cycles} cycles")
    print(f" - Max lifespan: {max_cycles} cycles")
    print(f" - Mean lifespan: {avg_cycles:.1f} cycles")

if __name__ == "__main__":
    prepare_data()

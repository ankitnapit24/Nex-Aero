"""
AeroGuard AI - Unit Tests for Data Ingestion and RUL Target Generation
"""

import os
import sys
import pytest
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ml.data_processing.loader import compute_rul_targets, load_cmapss_train, load_cmapss_test, load_cmapss_test_rul
from ml.config import ALL_COLUMNS

RAW_DIR = os.path.join(BASE_DIR, "data", "raw")

def test_hand_checkable_rul_calculation():
    """Verify RUL calculation logic on a tiny synthetic hand-checkable dataset."""
    sample_data = pd.DataFrame({
        "engine_id": [1, 1, 1, 1, 2, 2],
        "cycle": [1, 2, 3, 4, 1, 2]
    })
    
    # Uncapped test
    result = compute_rul_targets(sample_data, cap_rul=None)
    # Engine 1 max cycle is 4: RUL should be [3, 2, 1, 0]
    expected_e1 = [3, 2, 1, 0]
    # Engine 2 max cycle is 2: RUL should be [1, 0]
    expected_e2 = [1, 0]
    
    actual_e1 = result[result["engine_id"] == 1]["rul"].tolist()
    actual_e2 = result[result["engine_id"] == 2]["rul"].tolist()
    
    assert actual_e1 == expected_e1, f"Expected {expected_e1}, got {actual_e1}"
    assert actual_e2 == expected_e2, f"Expected {expected_e2}, got {actual_e2}"

def test_capped_rul_calculation():
    """Verify piece-wise linear capping at 2 cycles."""
    sample_data = pd.DataFrame({
        "engine_id": [1, 1, 1, 1, 1],
        "cycle": [1, 2, 3, 4, 5]
    })
    # Max cycle is 5: uncapped is [4, 3, 2, 1, 0]. With cap=2, should be [2, 2, 2, 1, 0]
    result = compute_rul_targets(sample_data, cap_rul=2)
    expected = [2, 2, 2, 1, 0]
    actual = result["rul"].tolist()
    assert actual == expected, f"Expected capped {expected}, got {actual}"

def test_raw_dataset_integrity():
    """Validate raw NASA C-MAPSS FD001 data files."""
    train_df = load_cmapss_train(RAW_DIR)
    test_df = load_cmapss_test(RAW_DIR)
    test_rul = load_cmapss_test_rul(RAW_DIR)
    
    # Verify train shape and properties
    assert len(train_df) == 20631
    assert train_df["engine_id"].nunique() == 100
    assert not train_df.isnull().any().any(), "Training data contains unexpected NaNs"
    
    # Verify test shape
    assert len(test_df) == 13096
    assert test_df["engine_id"].nunique() == 100
    assert not test_df.isnull().any().any(), "Test data contains unexpected NaNs"
    
    # Verify ground-truth RUL count
    assert len(test_rul) == 100
    assert (test_rul > 0).all(), "All test RUL targets must be positive"

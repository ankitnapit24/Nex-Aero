"""
Nex Aero - Data Ingestion & Preprocessing Loader
Parses NASA C-MAPSS FD001 text files, validates data integrity, and computes RUL labels.
"""

import os
import pandas as pd
import numpy as np
from typing import Tuple, Optional
from ml.config import ALL_COLUMNS, INDEX_COLUMNS, SENSOR_COLUMNS

def read_raw_cmapss_file(filepath: str) -> pd.DataFrame:
    """
    Reads whitespace-delimited C-MAPSS raw text file.
    Validates that rows contain expected 26 values without unexpected missing values.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"C-MAPSS data file not found at: {filepath}")

    # Read space-delimited text without header
    df = pd.read_csv(filepath, sep=r"\s+", header=None)
    
    # In some C-MAPSS distributions, trailing whitespaces may produce extra NaN columns
    if df.shape[1] > 26:
        # Drop excess empty columns
        df = df.iloc[:, :26]
    elif df.shape[1] < 26:
        raise ValueError(f"File {filepath} has invalid column count: {df.shape[1]}, expected 26.")

    df.columns = ALL_COLUMNS
    df["engine_id"] = df["engine_id"].astype(int)
    df["cycle"] = df["cycle"].astype(int)

    # Sanity check for unexpected nulls
    if df.isnull().any().any():
        raise ValueError(f"Unexpected NaN values detected in {filepath}")

    return df

def compute_rul_targets(train_df: pd.DataFrame, cap_rul: Optional[int] = 125) -> pd.DataFrame:
    """
    Computes Remaining Useful Life (RUL) for each engine row in run-to-failure training data.
    - uncapped RUL = max_cycle_for_engine - current_cycle
    - capped RUL = min(uncapped_rul, cap_rul) if cap_rul is provided
    """
    df = train_df.copy()
    
    # Calculate last observed cycle per engine
    max_cycles = df.groupby("engine_id")["cycle"].max().reset_index()
    max_cycles = max_cycles.rename(columns={"cycle": "max_cycle"})
    
    df = df.merge(max_cycles, on="engine_id", how="left")
    df["rul_uncapped"] = df["max_cycle"] - df["cycle"]
    
    if cap_rul is not None and cap_rul > 0:
        df["rul"] = df["rul_uncapped"].clip(upper=cap_rul)
    else:
        df["rul"] = df["rul_uncapped"]

    return df

def load_cmapss_train(data_dir: str, cap_rul: Optional[int] = 125) -> pd.DataFrame:
    """Loads and computes targets for train_FD001.txt."""
    filepath = os.path.join(data_dir, "train_FD001.txt")
    raw_df = read_raw_cmapss_file(filepath)
    return compute_rul_targets(raw_df, cap_rul=cap_rul)

def load_cmapss_test(data_dir: str) -> pd.DataFrame:
    """Loads test_FD001.txt."""
    filepath = os.path.join(data_dir, "test_FD001.txt")
    return read_raw_cmapss_file(filepath)

def load_cmapss_test_rul(data_dir: str) -> pd.Series:
    """
    Loads official ground-truth test Remaining Useful Life from RUL_FD001.txt.
    Returns Series of RUL integers indexed 1..N (matching test engine IDs).
    """
    filepath = os.path.join(data_dir, "RUL_FD001.txt")
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"RUL ground truth file not found at: {filepath}")
    
    rul_df = pd.read_csv(filepath, sep=r"\s+", header=None)
    rul_series = rul_df.iloc[:, 0].astype(int)
    # Set index 1-based matching engine_id
    rul_series.index = pd.RangeIndex(start=1, stop=len(rul_series) + 1, step=1)
    rul_series.name = "true_rul"
    return rul_series

"""
Nex Aero - Feature Engineering & Pipeline Utilities
Ensures zero data leakage: transforms and window calculations are strictly chronological per engine.
"""

import pandas as pd
import numpy as np
from typing import List, Tuple
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from ml.config import INFORMATIVE_SENSORS, SETTING_COLUMNS, CONSTANT_SENSORS

class CMAPSSFeatureExtractor(BaseEstimator, TransformerMixin):
    """
    Chronological feature extractor for C-MAPSS data.
    Computes rolling mean and trend features per engine strictly using past and current cycles.
    """
    def __init__(self, window_size: int = 5, sensors: List[str] = None):
        self.window_size = window_size
        self.sensors = sensors if sensors is not None else INFORMATIVE_SENSORS

    def fit(self, X, y=None):
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        df = X.copy()
        
        # Ensure correct ordering
        if "engine_id" in df.columns and "cycle" in df.columns:
            df = df.sort_values(by=["engine_id", "cycle"])
            
            # Compute rolling statistics strictly grouped per engine
            for s in self.sensors:
                if s in df.columns:
                    roll_mean = df.groupby("engine_id")[s].transform(
                        lambda g: g.rolling(self.window_size, min_periods=1).mean()
                    )
                    df[f"{s}_roll_mean"] = roll_mean
                    # Delta from rolling mean to capture short-term fluctuation
                    df[f"{s}_diff"] = df[s] - df[f"{s}_roll_mean"]
        return df

def get_feature_columns(include_rolling: bool = False) -> List[str]:
    """Returns ordered list of feature column names used for training and inference."""
    base_features = ["cycle"] + SETTING_COLUMNS + INFORMATIVE_SENSORS
    if not include_rolling:
        return base_features
    
    rolling_features = []
    for s in INFORMATIVE_SENSORS:
        rolling_features.append(f"{s}_roll_mean")
        rolling_features.append(f"{s}_diff")
    return base_features + rolling_features

import os
import threading
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional

from backend.app.schemas.engine import EngineSummary, EngineDetail, EngineTelemetryPoint
from ml.data_processing.loader import load_cmapss_test, load_cmapss_test_rul
from ml.inference.predictor import RULPredictor, get_predictor

class EngineService:
    def __init__(self):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        self.data_dir = os.path.join(base_dir, "data", "raw")
        self._test_df: Optional[pd.DataFrame] = None
        self._test_rul: Optional[pd.Series] = None
        self._cached_summaries: Optional[List[EngineSummary]] = None
        self._lock = threading.Lock()

    @property
    def predictor(self) -> RULPredictor:
        return get_predictor()

    def is_dataset_available(self) -> bool:
        """Checks if raw test dataset files exist on disk without loading into RAM."""
        return os.path.exists(os.path.join(self.data_dir, "test_FD001.txt"))

    def _ensure_data_loaded(self):
        if self._test_df is not None:
            return
        with self._lock:
            if self._test_df is not None:
                return
            if os.path.exists(os.path.join(self.data_dir, "test_FD001.txt")):
                self._test_df = load_cmapss_test(self.data_dir)
                self._test_rul = load_cmapss_test_rul(self.data_dir)

    @property
    def test_df(self) -> Optional[pd.DataFrame]:
        if self._test_df is None:
            self._ensure_data_loaded()
        return self._test_df

    @test_df.setter
    def test_df(self, df: Optional[pd.DataFrame]):
        self._test_df = df
        self._cached_summaries = None

    @property
    def test_rul(self) -> Optional[pd.Series]:
        if self._test_rul is None:
            self._ensure_data_loaded()
        return self._test_rul

    @test_rul.setter
    def test_rul(self, rul: Optional[pd.Series]):
        self._test_rul = rul
        self._cached_summaries = None

    def list_engines(self) -> List[EngineSummary]:
        if self._cached_summaries is not None:
            return self._cached_summaries

        if self.test_df is None:
            return []

        # Extract last row of each engine in a single batch
        last_rows_df = self.test_df.groupby("engine_id").last().reset_index()
        last_rows_df = last_rows_df.sort_values(by="engine_id")
        
        # Batch predict for maximum efficiency
        features = self.predictor.expected_features
        X_batch = last_rows_df[features].copy()
        raw_preds = self.predictor.model.predict(X_batch)
        clamped_preds = np.clip(raw_preds, 0.0, None)

        summaries = []
        for idx, row in last_rows_df.iterrows():
            eid = int(row["engine_id"])
            pred_rul = float(round(clamped_preds[idx], 1))
            urgency, _ = self.predictor.assess_urgency(pred_rul)
            true_rul = float(self.test_rul.get(eid, 0)) if self.test_rul is not None else None
            
            summaries.append(EngineSummary(
                engine_id=eid,
                dataset_split="test",
                total_cycles=int(row["cycle"]),
                last_cycle=int(row["cycle"]),
                predicted_rul=pred_rul,
                true_rul=true_rul,
                urgency_tier=urgency
            ))

        # Sort by urgency: lowest predicted RUL first
        summaries.sort(key=lambda e: e.predicted_rul if e.predicted_rul is not None else 9999)
        self._cached_summaries = summaries
        return summaries

    def get_engine_detail(self, engine_id: int) -> Optional[EngineDetail]:
        if self.test_df is None:
            return None

        engine_data = self.test_df[self.test_df["engine_id"] == engine_id]
        if engine_data.empty:
            return None

        last_row = engine_data.iloc[-1].to_dict()
        pred = self.predictor.predict_single_row(last_row, engine_id=engine_id)
        true_rul = float(self.test_rul.get(engine_id, 0)) if self.test_rul is not None else None

        # Build telemetry points
        points = []
        for _, row in engine_data.iterrows():
            points.append(EngineTelemetryPoint(
                cycle=int(row["cycle"]),
                setting_1=round(float(row["setting_1"]), 4),
                setting_2=round(float(row["setting_2"]), 4),
                setting_3=round(float(row["setting_3"]), 1),
                sensor_2=round(float(row["sensor_2"]), 2),
                sensor_3=round(float(row["sensor_3"]), 2),
                sensor_4=round(float(row["sensor_4"]), 2),
                sensor_6=round(float(row["sensor_6"]), 4),
                sensor_7=round(float(row["sensor_7"]), 2),
                sensor_8=round(float(row["sensor_8"]), 2),
                sensor_9=round(float(row["sensor_9"]), 2),
                sensor_11=round(float(row["sensor_11"]), 2),
                sensor_12=round(float(row["sensor_12"]), 2),
                sensor_13=round(float(row["sensor_13"]), 2),
                sensor_14=round(float(row["sensor_14"]), 2),
                sensor_15=round(float(row["sensor_15"]), 4),
                sensor_17=round(float(row["sensor_17"]), 1),
                sensor_20=round(float(row["sensor_20"]), 2),
                sensor_21=round(float(row["sensor_21"]), 4)
            ))

        return EngineDetail(
            engine_id=engine_id,
            dataset_split="test",
            last_cycle=int(last_row["cycle"]),
            predicted_rul=pred["predicted_rul_cycles"],
            true_rul=true_rul,
            urgency_tier=pred["urgency_tier"],
            recommendation=pred["recommendation"],
            telemetry_history=points
        )

# Global singleton
engine_service = EngineService()

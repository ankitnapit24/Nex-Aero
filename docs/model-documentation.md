# AeroGuard AI - Machine Learning Model Documentation

## 1. Executive Summary
- **Target Variable:** Remaining Useful Life (RUL) in operating cycles.
- **Dataset:** NASA Commercial Modular Aero-Propulsion System Simulation (C-MAPSS) FD001.
- **Core Algorithm:** Scikit-learn `RandomForestRegressor` with 120 estimators and $max\_depth = 16$.
- **Validation Strategy:** 5-Fold Engine-Wise `GroupKFold` cross-validation (strict zero-leakage guarantee).
- **Official NASA Test Performance:**
  - **MAE:** 12.53 cycles
  - **RMSE:** 16.94 cycles
  - **$R^2$:** 0.821
  - **NASA Penalty Score:** 500.0

---

## 2. Methodology & Leakage Prevention

### Engine-Wise Grouping
In turbofan degradation datasets, standard row-wise $k$-fold cross-validation results in severe data leakage because adjacent cycles from the same engine appear in both train and validation folds. In AeroGuard AI:
- `GroupKFold(n_splits=5)` groups by `engine_id`.
- 100% of telemetry rows belonging to an individual engine reside exclusively within the training or validation fold in any given split.

### Feature Selection & Constant Filtering
In the FD001 dataset, the ambient operating conditions are constant (sea-level). As a result, 6 sensor channels exhibit constant or near-zero variance and provide no prognostic information:
- `sensor_1`: Fan inlet temperature (518.67 constant)
- `sensor_5`: Fan inlet pressure (14.62 constant)
- `sensor_10`: Engine pressure ratio (1.30 constant)
- `sensor_16`: Burner fuel-air ratio (0.03 constant)
- `sensor_18`: Demanded fan speed (100 constant)
- `sensor_19`: Demanded corrected fan speed (100 constant)

These constant channels are systematically filtered out. The final model utilizes 19 features:
`["cycle", "setting_1", "setting_2", "setting_3", "sensor_2", "sensor_3", "sensor_4", "sensor_6", "sensor_7", "sensor_8", "sensor_9", "sensor_11", "sensor_12", "sensor_13", "sensor_14", "sensor_15", "sensor_17", "sensor_20", "sensor_21"]`.

### Target Formulation
For training engines run to failure:
- Uncapped RUL: $RUL_{\text{uncapped}}(i, t) = \max(\text{cycle}_i) - t$.
- Capped RUL (Piecewise Linear): In actual turbofan operation, early cycles show negligible structural degradation. Capping RUL at 125 cycles prevents the regression algorithm from over-fitting healthy baseline noise.

---

## 3. Evaluation Metrics

### Cross-Validation Aggregate (5-Fold GroupKFold)
- **Mean MAE:** 11.45 ± 0.61 cycles
- **Mean RMSE:** 16.76 ± 0.72 cycles
- **Mean $R^2$:** 0.838

### Official NASA Test Split (100 Engines)
Evaluation performed at the terminal observed cycle for each engine against official ground truth in `RUL_FD001.txt`:
- **MAE:** 12.53 cycles
- **RMSE:** 16.94 cycles
- **$R^2$:** 0.821
- **NASA Asymmetric Penalty Score:** 500.0

The NASA asymmetric scoring function is defined as:
$$s = \sum_{i=1}^{100} s_i, \quad s_i = \begin{cases} e^{-d_i / 13} - 1 & \text{if } d_i < 0 \text{ (late prediction, critical hazard)} \\ e^{d_i / 10} - 1 & \text{if } d_i \ge 0 \text{ (early prediction, economic penalty)} \end{cases}$$
where $d_i = \hat{y}_i - y_i$.

---

## 4. Operational Urgency Thresholds (Demo Heuristics)
- **Critical (RUL $\le 25$ cycles):** Recommend immediate borescope inspection and compressor blade acoustic testing.
- **Warning ($25 < \text{RUL} \le 50$ cycles):** Plan hangar maintenance within 10 operating cycles.
- **Moderate ($50 < \text{RUL} \le 80$ cycles):** Routine trend monitoring and scheduled C-check inspection.
- **Nominal ($\text{RUL} > 80$ cycles):** Normal operation within design envelopes.

---

## 5. Disclaimers and Limitations
1. Predictions are generated for research and demonstration purposes only.
2. The outputs do NOT certify aircraft airworthiness, diagnose real-world civil or military aircraft, or autonomously authorize dispatch decisions.
3. Decision-support recommendations must be evaluated by licensed aircraft maintenance engineers.

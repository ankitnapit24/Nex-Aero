"""
Nex Aero - ML Configuration & Column Constants
Standard definitions for NASA C-MAPSS FD001 dataset processing.
"""

# Standard NASA C-MAPSS 26-column names
INDEX_COLUMNS = ["engine_id", "cycle"]
SETTING_COLUMNS = ["setting_1", "setting_2", "setting_3"]
SENSOR_COLUMNS = [f"sensor_{i}" for i in range(1, 22)]
ALL_COLUMNS = INDEX_COLUMNS + SETTING_COLUMNS + SENSOR_COLUMNS

# In FD001 (single operating condition), several sensors exhibit zero or near-zero variance.
# Dropping non-informative constant sensors improves generalization and reduces noise.
CONSTANT_SENSORS = [
    "sensor_1",   # Fan inlet temp (518.67 constant)
    "sensor_5",   # Fan inlet pressure (14.62 constant)
    "sensor_10",  # Engine pressure ratio (1.30 constant)
    "sensor_16",  # Burner fuel-air ratio (0.03 constant)
    "sensor_18",  # Demanded fan speed (100 constant)
    "sensor_19",  # Demanded corrected fan speed (100 constant)
]

# Informative sensors with meaningful degradation trends
INFORMATIVE_SENSORS = [s for s in SENSOR_COLUMNS if s not in CONSTANT_SENSORS]

# Standard baseline feature set for RUL prediction (excluding engine_id to prevent identity leakage)
DEFAULT_FEATURE_COLUMNS = ["cycle"] + SETTING_COLUMNS + INFORMATIVE_SENSORS

# Dedicated feature set for unsupervised anomaly detection (strictly physical parameters: excluding cycle, engine_id, and RUL)
ANOMALY_FEATURE_COLUMNS = SETTING_COLUMNS + INFORMATIVE_SENSORS

# Evaluation and Target Parameters
RUL_CAP_DEFAULT = 125  # Standard literature piece-wise linear RUL ceiling
RANDOM_STATE = 42
N_ESTIMATORS = 120
TEST_SIZE_ENGINES = 0.2

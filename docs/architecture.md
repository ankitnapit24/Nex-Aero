# Nex Aero - System Architecture

Nex Aero is an end-to-end predictive-maintenance decision-support prototype for aircraft turbofan engines, trained on the NASA C-MAPSS dataset.

## System Overview

```mermaid
flowchart TD
    subgraph Data Layer ["Data & Preprocessing Layer"]
        RAW["NASA C-MAPSS FD001<br/>(100 train engines, 100 test engines)"] --> INGEST["Loader & Validator<br/>(data_processing/loader.py)"]
        INGEST --> CLEAN["Sensor Cleaning & Rolling Engine<br/>(features/pipeline.py)"]
        CLEAN --> TRAIN_SET["Engine-Wise Grouped Splits<br/>(GroupKFold / Leave-Engines-Out)"]
    end

    subgraph ML Pipeline ["Machine Learning Pipeline"]
        TRAIN_SET --> MODEL["Random Forest Regressor<br/>(Baseline Estimator)"]
        MODEL --> EVAL["Evaluation Engine<br/>(MAE, RMSE, NASA scoring)"]
        EVAL --> ARTIFACTS["Serialized Pipeline & Metadata<br/>(Joblib + JSON schema)"]
    end

    subgraph Backend ["FastAPI Backend Layer"]
        ARTIFACTS --> INF["Inference Service<br/>(ml/inference/predictor.py)"]
        DB[("SQLite Database<br/>(Prediction logs & telemetry)")] <--> ORM["SQLAlchemy Models & Engine"]
        INF --> API["FastAPI REST Routes<br/>/api/health<br/>/api/engines<br/>/api/predict<br/>/api/predictions"]
        ORM --> API
    end

    subgraph Frontend ["React 19 + Tailwind CSS Dashboard"]
        API <--> AXIOS["Centralized Axios API Client<br/>(services/api.js)"]
        AXIOS --> VIEWS["Interactive UI Views<br/>- Fleet Overview & Urgent Triage<br/>- Engine Telemetry & Degradation<br/>- On-Demand Inference & History<br/>- Maintenance Priority Assessment"]
    end
```

## Key Architectural Principles

1. **Strict Data Leakage Prevention:**
   - Preprocessing transforms and scalers are fitted solely on training engines.
   - Validation splits are grouped strictly by unit ID (`GroupKFold` / `GroupShuffleSplit`). Rows from an individual engine never span train and test sets.
   - Test labels (`RUL_FD001.txt`) are reserved exclusively for terminal cycle evaluation and never used during training, feature selection, or tuning.

2. **Aviation Safety & Responsible AI Framing:**
   - Nex Aero outputs are non-authoritative research estimates for maintenance planning triage.
   - Outputs are explicitly disclaimed as decision-support heuristics; they do not certify aircraft airworthiness.
   - Negative predicted values are bounded to zero only as a presentation guard, with raw model output logged.

3. **Modularity & Extensibility:**
   - Clean decoupling between data parsing, ML training, inference serving, database storage, and presentation.
   - Configurable urgency thresholds:
     - **Critical Assessment:** Estimated RUL $\le 25$ operating cycles.
     - **Warning Assessment:** $25 < \text{RUL} \le 50$ operating cycles.
     - **Moderate Monitoring:** $50 < \text{RUL} \le 80$ operating cycles.
     - **Nominal Condition:** $\text{RUL} > 80$ operating cycles.

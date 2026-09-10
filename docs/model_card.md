# AeroPredict MRO model card

Purpose: prioritize academic engineering reviews from simulated engine histories.

Model: Random forest. Training: 60 NASA FD001 engine trajectories. Validation: 20 disjoint engines. Interval calibration: 20 additional engines. Official test: 100 separate engines. Target: training RUL capped at 125. Features: 61 causal features from cycle and 15 nonconstant sensors.

| Metric | Official test result |
|---|---:|
| MAE | 14.1259 |
| RMSE | 18.8587 |
| R2 | 0.7940 |
| NASA_score | 648.2540 |


Classification recall: 0.840. Precision: 0.875. F1: 0.857. ROC-AUC: 0.9824. Average precision: 0.9357. Brier score: 0.0510. Probabilities are uncalibrated.

Interval target: 80% marginal coverage. Observed test coverage: 97%. Radius: 41.72 cycles. These intervals are wide; coverage alone is not evidence of useful precision.

Known limitations: simulation-to-reality gap, one operating condition, one fault mode, limited calibration/validation sample, capped early-life targets, endpoint distribution mismatch, and no industrial calibration. Failure modes include unfamiliar regimes, missing or shifted sensors, unobserved physical faults and misleading extrapolation outside FD001.

Intended use: portfolio demonstration, reproducible ML evaluation, academic explanation. Out of scope: maintenance authorization, real aircraft risk prediction, dispatch or safety decisions. See methodology.md for exact preprocessing, evaluation conventions and split IDs.

Academic predictive-maintenance demonstrator inspired by publicly described MRO predictive-maintenance principles. Built exclusively with the public NASA C-MAPSS dataset. This project is not affiliated with Air France-KLM or AFI KLM E&M and does not reproduce PROGNOS proprietary algorithms.

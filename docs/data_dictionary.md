# Data dictionary

| Field | Meaning | Role |
|---|---|---|
| unit | Engine trajectory ID within each split | Grouping only, not a feature |
| cycle | Simulated operational cycle, starts at 1 | Model feature |
| op1, op2, op3 | Operational settings in supplied order | Data quality context, omitted in FD001 model |
| s1 through s21 | 21 sensor measurements in supplied order | Nonconstant sensors retained |
| RUL_FD001 row i | Official remaining life after last observed test cycle for unit i | Evaluation only |
| engine | Display ID ENG-001 through ENG-100 | UI only |
| rul | Nonnegative model remaining-life prediction | Cycles |
| lower, upper | Calibrated interval bounds | Cycles, 80% nominal marginal target |
| failure_probability | Uncalibrated classifier output for RUL <= 30 | Supplementary information |
| health | Clipped linear rescaling of RUL to 0-100 | Synthetic score |
| risk | HEALTHY, WATCH or CRITICAL | Academic threshold rule |
| priority | Rescaled lower-bound urgency, 0-100 | Review ordering |
| actual_rul | Official test truth | Evaluation only, excluded from planning export |

The NASA readme has a final-column numbering typo: this project checks 26 total columns, comprising two identifiers, three settings and 21 sensors. Sensor chart axes use dataset units rather than inventing engineering units or uncertain physical names. Retained sensors: s2, s3, s4, s6, s7, s8, s9, s11, s12, s13, s14, s15, s17, s20, s21. Excluded constant sensors: s1, s5, s10, s16, s18, s19.

## Predictive Diagnostic input columns

`cycle` plus the 15 retained sensors above (same column names and order); an optional `engine_id` is accepted as metadata only and is stripped before features are built — it never enters `X`. Target/output columns (`rul`, `health`, `risk`, …) are rejected if submitted as input, since they are model outputs, not observations.

## Data domains, kept separate

| Domain | Source | Participates in training/metrics? |
|---|---|---|
| NASA FD001 raw | `data/raw/` | Yes — the only modeled dataset |
| Processed benchmark outputs | `data/processed/`, `artifacts/` | Derived from the above |
| Synthetic diagnostic sandbox | `data/synthetic/diagnostic_engines.csv` | **No** — inference demonstration only, excluded from training, validation, calibration and official metrics |
| Synthetic equipment scenarios | `data/synthetic/equipment_signals.csv` | **No** — illustrative aircraft-studio data, unrelated to the NASA model |

The diagnostic sandbox's 5 engines × 30 observations are training-derived, perturbed histories (see the top-level README's "Synthetic diagnostic database" section for the exact generation method), not independent validation engines.

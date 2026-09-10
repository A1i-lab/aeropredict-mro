"""Render documentation from measured artifacts. Never embed invented scores."""
import json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from src.config import ROOT,DISCLAIMER
m=json.loads((ROOT/'artifacts/metrics/results.json').read_text()); q=json.loads((ROOT/'artifacts/metrics/quality.json').read_text())
metrics=m['test_raw']; c=m['classification']; inter=m['interval']
def write(path,text):
    assert '\u2014' not in text
    (ROOT/path).write_text(text.strip()+'\n')
refs='''1. [NASA PCoE dataset repository](https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/). Saxena, A. and Goebel, K. (2008), Turbofan Engine Degradation Simulation Data Set.
2. Saxena, A., Goebel, K., Simon, D. and Eklund, N. (2008). Damage Propagation Modeling for Aircraft Engine Run-to-Failure Simulation. PHM08. Original paper included in the source archive.
3. [AFI KLM E&M public PROGNOS presentation](https://vimeo.com/220937470). Public operational inspiration only.
4. [Streamlit Community Cloud deployment](https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app).
5. [Streamlit navigation API](https://docs.streamlit.io/develop/api-reference/navigation/st.navigation).'''
result_table='| Metric | Official test result |\n|---|---:|\n'+''.join(f'| {k} | {v:.4f} |\n' for k,v in metrics.items())
write('DISCLAIMER.md',DISCLAIMER+'\n\nNo operational aircraft safety decisions. Recommendations are academic review categories. No affiliation, proprietary algorithms, internal aviation data or airline logos. The aircraft rendering is illustrative.')
method='''# Methodology

## Data and scope
FD001 is the main and only modeled subset: 100 training and 100 test engines, one operating condition, high-pressure compressor degradation. Training contains 20,631 rows and test contains 13,096 rows. Each observation is a simulated engine cycle. IDs are not aircraft registrations. Different engine endpoints do not represent a synchronized fleet date.

## RUL definition and capping
Raw training RUL is the engine's last cycle minus its current cycle. Training targets are clipped at 125 cycles, configured in src/config.py. The cap expresses a modeling assumption that early-life sensor behavior carries limited remaining-life resolution. It is not a NASA physical threshold or a validated operational horizon. A literature search surfaced the 125-cycle convention but did not yield a verified primary full-text justification; this project therefore declares it as a configurable design assumption, not an established optimum. A future engine-separated cap sensitivity study is required. Both raw and capped official test metrics are published so that capping cannot conceal errors on long-life engines.

## Engine-separated protocol
A fixed seed of 42 permutes 100 train engine IDs into 60 training, 20 validation and 20 calibration engines. The exact IDs are saved in results.json. Validation and calibration each use one randomly selected endpoint per engine, after cycle 40 (seeds 43 and 44). This approximates truncated histories but may differ from official test truncation. It avoids scoring only the final run-to-failure row, where all labels would be zero. Model selection uses uncapped validation RMSE. Only then is the selected artifact evaluated at the official test endpoints.

The small single validation split is a substantial limitation. It does not establish a stable cross-validated model ranking. The production model remains fitted on the 60 training engines to preserve independence from calibration. No refit is performed after calibration.

## Causal features and preprocessing
Sensors that are constant within the training engines (standard deviation at most 1e-8) are excluded. Operational settings are documented but not modeled because FD001 contains one operating regime; this choice must be reconsidered for FD002/FD004. Features are current cycle, retained sensor readings, trailing 10-cycle mean, trailing population standard deviation and a five-cycle difference divided by five. Initial rolling windows use available observations; initial deltas are set to zero. Every transformation is grouped by engine. No centered windows or future values are used. Engine ID and labels never enter X. Ridge scaling is fitted inside its training-only pipeline.

## Model comparison
The median baseline, standardized Ridge, Random Forest and histogram Gradient Boosting receive the same training features and targets. Hyperparameters are fixed before test evaluation. Tree ensemble early stopping is disabled to avoid a hidden random row validation split. The chosen model minimizes uncapped validation RMSE. Training times are recorded but are specific to this runtime. Model size, deployment simplicity and inference behavior remain review considerations; no latency claim is made from the selection scores alone.

## Uncertainty
Split-conformal absolute residual calibration uses 20 held-out engines and one sampled endpoint per engine. For nominal coverage 0.8, the order statistic is ceil((n+1)*0.8), with a maximum of n. The interval is max(0, prediction-radius) to prediction+radius. Coverage is marginal under exchangeability, not conditional on an individual engine. The small calibration sample and endpoint distribution shift limit the interpretation. Wide intervals can provide high coverage with weak precision. Historical intervals are shown for context, but calibration coverage is only evaluated at endpoints, not across entire trajectories.

## Classification and decision rules
An independent HistGradientBoostingClassifier estimates P(raw RUL <= 30). It is trained on training-engine rows, with fixed hyperparameters, and evaluated at test endpoints using threshold 0.5. Its probabilities are uncalibrated and are not presented as confidence. PR-AUC refers to average precision. The classifier is supplementary and does not override the RUL status rules.

CRITICAL means predicted RUL <= 20. WATCH means 20 < predicted RUL <= 50. Otherwise HEALTHY. Health = clip(100*RUL/125, 0, 100), a synthetic visualization score. Maintenance priority = 100*(1-clip(lower interval bound,0,125)/125). Ties are broken by lower predicted RUL. The health score is not added again to avoid double counting the same RUL signal. Actions are Monitor, Schedule inspection or Priority inspection. Capacity is a user-selected scenario, not resource-validated maintenance scheduling.

## Evaluation and explainability
MAE expresses average absolute cycle error, RMSE emphasizes large misses and R2 compares to a constant test-mean baseline. For e = predicted minus true RUL, the NASA-style asymmetric score sums exp(-e/13)-1 for negative errors and exp(e/10)-1 for nonnegative errors. This convention penalizes late predictions more heavily. The source paper's prose motivates late-error penalties but its printed parameter labels are inconsistent with that direction; the implemented convention is explicitly stated and tested. Scores are not comparable across different sample counts or RUL caps without qualification.

Global permutation importance measures the increase in validation MAE after shuffling a feature (five repeats, seed 42). Only 20 validation endpoints are available, so ranking is noisy. Correlated features share information. Sensor plots show observed trends, not causal fault diagnoses or local model attributions. Anomaly detection was omitted because additional operational value has not been established.

## Reproducibility
Run the download, train, documentation and notebook scripts from the repository root. The archive URL and SHA256 are stored in data/raw/provenance.json. Prepared outputs load without training or network access. Models are serialized with joblib; only load trusted artifacts. Pinned dependency versions must match training.
'''
write('docs/methodology.md',method+'\n## References\n'+refs)
write('docs/model_card.md',f'''# AeroPredict MRO model card

Purpose: prioritize academic engineering reviews from simulated engine histories.

Model: {m['selected']}. Training: 60 NASA FD001 engine trajectories. Validation: 20 disjoint engines. Interval calibration: 20 additional engines. Official test: 100 separate engines. Target: training RUL capped at 125. Features: {len(m['features'])} causal features from cycle and {len(m['sensors'])} nonconstant sensors.

{result_table}

Classification recall: {c['recall']:.3f}. Precision: {c['precision']:.3f}. F1: {c['F1']:.3f}. ROC-AUC: {c['ROC_AUC']:.4f}. Average precision: {c['PR_AUC']:.4f}. Brier score: {c['Brier']:.4f}. Probabilities are uncalibrated.

Interval target: 80% marginal coverage. Observed test coverage: {inter['test_coverage']:.0%}. Radius: {inter['radius']:.2f} cycles. These intervals are wide; coverage alone is not evidence of useful precision.

Known limitations: simulation-to-reality gap, one operating condition, one fault mode, limited calibration/validation sample, capped early-life targets, endpoint distribution mismatch, and no industrial calibration. Failure modes include unfamiliar regimes, missing or shifted sensors, unobserved physical faults and misleading extrapolation outside FD001.

Intended use: portfolio demonstration, reproducible ML evaluation, academic explanation. Out of scope: maintenance authorization, real aircraft risk prediction, dispatch or safety decisions. See methodology.md for exact preprocessing, evaluation conventions and split IDs.

{DISCLAIMER}''')
write('docs/data_dictionary.md','''# Data dictionary

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

The NASA readme has a final-column numbering typo: this project checks 26 total columns, comprising two identifiers, three settings and 21 sensors. Sensor chart axes use dataset units rather than inventing engineering units or uncertain physical names. Retained sensors: '''+', '.join(m['sensors'])+'. Excluded constant sensors: '+', '.join(q['excluded_sensors'])+'.')
write('docs/architecture.md','''# Architecture

Offline acquisition validates and fingerprints the NASA archive. Feature engineering and model training share the same functions as inference. Inference produces per-cycle histories and a last-observed-cycle fleet snapshot. The runtime caches prepared data and renders seven views; it never trains models.

```mermaid
flowchart TD
 A["NASA FD001"] --> B["Quality and causal features"]
 B --> C["RUL regressor"]
 B --> D["30-cycle classifier"]
 C --> E["Calibrated RUL interval"]
 E --> F["Review rules and priority"]
 D --> G["Prepared fleet histories"]
 F --> G
 G --> H["Streamlit workspace"]
```

src/config.py centralizes thresholds. data_loader.py validates input. features.py contains causal transforms. inference.py reuses these transforms. business_rules.py isolates academic decisions. views.py contains page composition and ui.py centralizes visual tokens and components. artifacts/metrics stores actual results, not manually entered claims.
''')
write('README.md',f'''# AeroPredict MRO
### Predictive Aircraft Engine Health & Maintenance Decision Support

A clear review workspace for simulated turbofan engines: understand fleet health, inspect remaining-life estimates and prioritize engineering attention. Built as an independent end-to-end academic product using public NASA C-MAPSS FD001.

## Live demo
Cloud publication is pending GitHub account connection and Streamlit authentication. No public URL is claimed. The application runs locally with the commands below.

## Problem and business value
Sensor histories are difficult to prioritize directly. AeroPredict turns them into RUL estimates, uncertainty intervals and transparent inspection review categories. It demonstrates a decision workflow, not quantified real-world savings or operational safety performance.

## Results
Selected model: **{m['selected']}**, selected on a separate 20-engine validation sample. These results are measured on all 100 official FD001 test endpoints, using uncapped truth.

{result_table}

Classifier recall: **{c['recall']:.2f}**, precision: **{c['precision']:.3f}**, F1: **{c['F1']:.3f}**. Interval coverage: **{inter['test_coverage']:.0%}**, versus 80% nominal target; intervals are wide (radius {inter['radius']:.1f} cycles). Coverage must be assessed alongside width. The uncertainty method does not establish individual-engine safety.

## Application
1. Fleet Overview: executive KPIs, fleet balance, remaining-life map and priority engines.
2. Engine Health: engine selection, RUL history, uncertainty, sensor trajectories and revealed historical truth.
3. Prognostics & Alerts: filterable endpoint review queue with reasons and recommendations.
4. Maintenance Planner: capacity scenario, ranked reviews, priority matrix and CSV export.
5. Model Performance: comparison, residuals, classification, importance and operational interpretation.
6. Data & Model Transparency: pipeline, quality controls, leakage prevention and scope.
7. About: product purpose, architecture, references and independence statement.

## Architecture and dataset
See [architecture](docs/architecture.md), [data dictionary](docs/data_dictionary.md) and [methodology](docs/methodology.md). FD001 has 100 training and 100 test engines, 20,631 train observations and 13,096 test observations. Training engines split 60/20/20 for fit, selection and calibration. Raw data and prepared artifacts are included for a self-contained demo.

## Installation and usage
Python 3.12 is the tested runtime. From the repository directory:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m streamlit run app.py
```

On Windows, activate with `.venv\\Scripts\\activate`.

## Rebuild and evaluate
```bash
python scripts/download_data.py
python scripts/train_models.py
python scripts/build_documentation.py
python scripts/build_notebooks.py
python -m pytest -q
python -m compileall -q src scripts app.py
```

Training is offline. Streamlit reads cached prepared files only. It does not download data or train at startup. Pinning scikit-learn is required to load the saved model consistently. Load joblib files only from trusted sources.

## Repository structure
| Directory | Purpose |
|---|---|
| src/ | Shared features, inference, decisions and interface |
| scripts/ | Data acquisition, training, documentation and notebooks |
| data/raw/ | Official FD001 data and provenance |
| data/processed/ | Precomputed fleet and sensor histories |
| artifacts/models/ | Trained models |
| artifacts/metrics/ | Actual evaluation outputs |
| notebooks/ | Executed educational analysis |
| tests/ | Leakage, inference, rule and interface checks |
| docs/ | Methodology, architecture, model card and design |
| reports/ | Academic report |

## Validation and screenshots
See [validation status](docs/validation.md) for exactly which checks were completed. Browser screenshot verification and cloud validation are tracked separately from Python execution tests.

## Limitations
One simulated operating regime and fault mode. A small single validation split. No cap sensitivity analysis, external industrial validation or calibrated failure probability. Health and priority scores are transparent academic constructions. No anomaly detector is retained without evidence of added value.

## Disclaimer
{DISCLAIMER}

## License
MIT for original code. Dataset and source paper remain subject to their original NASA/source terms; the code license does not relicense them. The original AI-generated aircraft image is decorative and is not a technical diagram.

## References
{refs}
''')
sections=[('Abstract',f'AeroPredict MRO connects sensor histories to academic maintenance review priorities. The selected {m["selected"]} achieves MAE {metrics["MAE"]:.2f} and RMSE {metrics["RMSE"]:.2f} cycles on 100 official uncapped FD001 test endpoints. These simulation results do not establish real-world maintenance reliability.'),('Industrial context','Predictive maintenance aims to help engineering teams identify degradation before an observed failure threshold. Public predictive MRO descriptions provide the operational framing, while all modeled observations here come from NASA simulation.'),('Predictive maintenance problem','Given only current and past sensor readings, estimate remaining cycles and present a justified review order. Monitoring, prediction, rules and human decisions are separate layers.'),('Public inspiration','Public AFI KLM E&M presentations describe predictive monitoring across aircraft and engines. AeroPredict adopts this broad decision-support framing without proprietary data, logos, model reconstruction or claims of equivalent capability.'),('NASA C-MAPSS dataset',f'FD001 has 100 run-to-failure training and 100 truncated test trajectories. Observed train lifetime summary: {json.dumps(q["lifetime_summary"])}.'),('Data preparation',f'Missing values: {q["missing"]}; duplicate engine-cycle keys: {q["duplicate_cycles"]}. Constant sensors removed: {", ".join(q["excluded_sensors"])}. Operational settings are retained for inspection but not modeled.'),('Exploratory analysis','Run-to-failure lifetimes vary across engines. Nonconstant sensor trajectories combine noise and degradation trends. The executed EDA notebook examines these patterns; differences do not establish physical causality.'),('RUL modeling','The raw target is final cycle minus current cycle. The 125-cycle training cap is an explicit configurable assumption. Causal rolling features summarize recent conditions. Median, Ridge, Random Forest and histogram Gradient Boosting models are compared using the same engine-separated sample.'),('Failure risk classification',f'The auxiliary classifier targets RUL at most 30 cycles. Precision {c["precision"]:.3f}, recall {c["recall"]:.3f}, F1 {c["F1"]:.3f} and ROC-AUC {c["ROC_AUC"]:.4f} are measured at official test endpoints. Its uncalibrated probability remains supplementary. There are {c["confusion_matrix"][1][0]} false negatives and {c["confusion_matrix"][0][1]} false positives at threshold 0.5.'),('Model evaluation',result_table+f'\nThe nominal 80% prediction interval covers {inter["test_coverage"]:.0%} of official endpoints, with radius {inter["radius"]:.2f} cycles. This conservative width limits precision. Validation and calibration each contain only 20 engines.'),('Decision-support layer','Status is determined by predicted RUL thresholds of 20 and 50 cycles. Synthetic health rescales RUL. Priority uses the lower bound and avoids double counting health. These are review heuristics, not certified maintenance instructions.'),('Streamlit application','Seven pages share a restrained navy and off-white visual identity, consistent status colors and original aircraft imagery. Prepared outputs are cached; runtime training is deliberately excluded. The planner exports a review list without evaluation truth.'),('Limitations','The model covers one simulated condition and one failure mode. Raw-versus-capped target mismatch, limited validation, broad intervals and uncalibrated classification limit generalization. No local causal explanation, industrial reliability, economic savings or fleet availability gain is claimed.'),('Future work','Repeat engine-level validation, compare caps using validation alone, evaluate interval width and conditional coverage, assess probability calibration, test new operating regimes and study real industrial requirements with appropriate data governance.'),('Conclusion','This project demonstrates an end-to-end reproducible academic data product. Predictive outputs become understandable review priorities while data provenance, limitations and human interpretation remain explicit.'),('References',refs)]
write('reports/academic_report.md','# AeroPredict MRO: academic report\n\n'+'\n\n'.join(f'## {i}. {title}\n\n{body}' for i,(title,body) in enumerate(sections,1))+'\n\n'+DISCLAIMER)
write('docs/design_system.md','''# Design system

AeroPredict is an original identity with an angular A mark and technical wordmark. Navy #0C1829 defines navigation, off-white #F4F6F9 supports analysis, blue #2878E8 marks emphasis, green #16826C indicates HEALTHY, amber #B47916 WATCH and red #C6454D CRITICAL. Status always appears as text as well as color.

Cards use thin neutral borders, 5-10px corner radii and restrained spacing. Page hierarchy starts with the practical answer, then charts and a sortable table. Detailed statistics appear inside expanders. System sans-serif fonts provide fast, reliable rendering without third-party font calls. SVG favicon and a compressed WebP hero are bundled locally.

The original aircraft asset was generated with imagegen using a premium unbranded twin-engine studio-render brief on deep navy, with free space for headline text. It serves visual context on Fleet Overview and About. See assets/aircraft-prompt.txt for the generation brief. It is neither an aircraft diagram nor a model architecture illustration.

Refinement pass 1: consistent card spacing, explicit uncertainty language, restrained headline size, status labels, chart palette, table formatting and empty states. Responsive CSS stacks custom panels at narrow widths. Browser evidence is reported separately in validation.md; CSS intent is not proof of mobile QA.
''')
print('Documentation regenerated from measured artifacts.')

# Methodology

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

## References
1. [NASA PCoE dataset repository](https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/). Saxena, A. and Goebel, K. (2008), Turbofan Engine Degradation Simulation Data Set.
2. Saxena, A., Goebel, K., Simon, D. and Eklund, N. (2008). Damage Propagation Modeling for Aircraft Engine Run-to-Failure Simulation. PHM08. Original paper included in the source archive.
3. [AFI KLM E&M public PROGNOS presentation](https://vimeo.com/220937470). Public operational inspiration only.
4. [Streamlit Community Cloud deployment](https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app).
5. [Streamlit navigation API](https://docs.streamlit.io/develop/api-reference/navigation/st.navigation).

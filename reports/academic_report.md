# AeroPredict MRO: academic report

## 1. Abstract

AeroPredict MRO connects sensor histories to academic maintenance review priorities. The selected Random forest achieves MAE 14.13 and RMSE 18.86 cycles on 100 official uncapped FD001 test endpoints. These simulation results do not establish real-world maintenance reliability.

## 2. Industrial context

Predictive maintenance aims to help engineering teams identify degradation before an observed failure threshold. Public predictive MRO descriptions provide the operational framing, while all modeled observations here come from NASA simulation.

## 3. Predictive maintenance problem

Given only current and past sensor readings, estimate remaining cycles and present a justified review order. Monitoring, prediction, rules and human decisions are separate layers.

## 4. Public inspiration

Public AFI KLM E&M presentations describe predictive monitoring across aircraft and engines. AeroPredict adopts this broad decision-support framing without proprietary data, logos, model reconstruction or claims of equivalent capability.

## 5. NASA C-MAPSS dataset

FD001 has 100 run-to-failure training and 100 truncated test trajectories. Observed train lifetime summary: {"count": 100.0, "mean": 206.31, "std": 46.3427492067573, "min": 128.0, "25%": 177.0, "50%": 199.0, "75%": 229.25, "max": 362.0}.

## 6. Data preparation

Missing values: 0; duplicate engine-cycle keys: 0. Constant sensors removed: s1, s5, s10, s16, s18, s19. Operational settings are retained for inspection but not modeled.

## 7. Exploratory analysis

Run-to-failure lifetimes vary across engines. Nonconstant sensor trajectories combine noise and degradation trends. The executed EDA notebook examines these patterns; differences do not establish physical causality.

## 8. RUL modeling

The raw target is final cycle minus current cycle. The 125-cycle training cap is an explicit configurable assumption. Causal rolling features summarize recent conditions. Median, Ridge, Random Forest and histogram Gradient Boosting models are compared using the same engine-separated sample.

## 9. Failure risk classification

The auxiliary classifier targets RUL at most 30 cycles. Precision 0.875, recall 0.840, F1 0.857 and ROC-AUC 0.9824 are measured at official test endpoints. Its uncalibrated probability remains supplementary. There are 4 false negatives and 3 false positives at threshold 0.5.

## 10. Model evaluation

| Metric | Official test result |
|---|---:|
| MAE | 14.1259 |
| RMSE | 18.8587 |
| R2 | 0.7940 |
| NASA_score | 648.2540 |

The nominal 80% prediction interval covers 97% of official endpoints, with radius 41.72 cycles. This conservative width limits precision. Validation and calibration each contain only 20 engines.

## 11. Decision-support layer

Status is determined by predicted RUL thresholds of 20 and 50 cycles. Synthetic health rescales RUL. Priority uses the lower bound and avoids double counting health. These are review heuristics, not certified maintenance instructions.

## 12. Streamlit application

Seven pages share a restrained navy and off-white visual identity, consistent status colors and original aircraft imagery. Prepared outputs are cached; runtime training is deliberately excluded. The planner exports a review list without evaluation truth.

## 13. Limitations

The model covers one simulated condition and one failure mode. Raw-versus-capped target mismatch, limited validation, broad intervals and uncalibrated classification limit generalization. No local causal explanation, industrial reliability, economic savings or fleet availability gain is claimed.

## 14. Future work

Repeat engine-level validation, compare caps using validation alone, evaluate interval width and conditional coverage, assess probability calibration, test new operating regimes and study real industrial requirements with appropriate data governance.

## 15. Conclusion

This project demonstrates an end-to-end reproducible academic data product. Predictive outputs become understandable review priorities while data provenance, limitations and human interpretation remain explicit.

## 16. References

1. [NASA PCoE dataset repository](https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/). Saxena, A. and Goebel, K. (2008), Turbofan Engine Degradation Simulation Data Set.
2. Saxena, A., Goebel, K., Simon, D. and Eklund, N. (2008). Damage Propagation Modeling for Aircraft Engine Run-to-Failure Simulation. PHM08. Original paper included in the source archive.
3. [AFI KLM E&M public PROGNOS presentation](https://vimeo.com/220937470). Public operational inspiration only.
4. [Streamlit Community Cloud deployment](https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app).
5. [Streamlit navigation API](https://docs.streamlit.io/develop/api-reference/navigation/st.navigation).

Academic predictive-maintenance demonstrator inspired by publicly described MRO predictive-maintenance principles. Built exclusively with the public NASA C-MAPSS dataset. This project is not affiliated with Air France-KLM or AFI KLM E&M and does not reproduce PROGNOS proprietary algorithms.

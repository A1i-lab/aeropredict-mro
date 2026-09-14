# Predictive Diagnostic local validation

Implemented on top of refined A350 commit 184c19bef1ff19fd8fadf49aabc00d5cfffce1bb.

Architecture: src/diagnostic.py validates a single-engine history and delegates to the unchanged src.inference.predict; src/diagnostic_view.py provides the cached Streamlit workspace. No external service is needed. The three input modes are demo, editable manual table and CSV upload. Results are hidden after input changes until the next inference request.

The actual bundle retains 15 sensors and 61 features; it uses Random forest regression and the original 30-cycle classifier, calibration radius and decision rules. Diagnostic history predictions begin at observation 5; windows before observation 10 have partial context. Consecutive cycles are required because the current features use observation-count windows.

AppTest exercises demo input, switching demo profiles, stale-result protection, blank manual rejection, loading/editable example data, manual inference and CSV-mode rendering/inference with an uploaded in-memory CSV. CSV parsing/validation is also unit tested. A known NASA engine produces the same predictions as the original pipeline to numerical tolerance. Global classic navigation is tested by the Workspace label, since the new page introduces a second radio widget.

Local Streamlit was launched, then stopped after HTTP 200 checks on health, root, the diagnostic query URL and the separate A350 asset. This validates server delivery, not pixel layout. Interactive visual review and screenshots were unavailable due to the browser's previously blocked local navigation. Browser-specific CSV chooser, paste and GPU interactions still require review on the Mac. No production verification is claimed.

The saved model, results.json, official importance.csv, prepared fleet data, A350 GLB and aircraft/engine/assembly camera files were compared byte-for-byte with the baseline and remain unchanged. The frontend rebuild reproduces the existing packaged studio. No retraining, push, GitHub connection or deployment was performed.

The accompanying diagnostic-demo-results.csv records genuine saved-model inference, not target labels. Demo histories are based on a fitted-training engine with bounded perturbations; they must not be interpreted as independent performance evaluation.

The optional feature-selection review summarizes existing validation permutation importance. Eighteen of 61 estimates are nonpositive. Top 20/30 selection merits a later validation-only experiment, but correlation and the small validation sample prevent concluding that omitted features are useless. No reduced-feature models or claimed performance improvements were produced.

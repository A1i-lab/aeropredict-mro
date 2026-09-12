# Validation status

Verified in the development runtime on 10/09/2026, Python 3.12:

- Official NASA archive downloaded successfully, SHA256 recorded.
- Four regressors trained and evaluated on separate validation engines.
- Selected model evaluated on 100 official test engines using uncapped truth.
- Classifier and interval metrics generated from actual outputs.
- Eight pytest tests passed in 3.14 seconds.
- All seven Streamlit pages execute without Python exceptions.
- Engine selections ENG-001, ENG-050 and ENG-100 execute correctly.
- Alert filtering handles an empty result.
- Planner capacity changes execute correctly.
- Model inference matches the precomputed fleet predictions.
- Future sensor changes leave past features unchanged.
- Rolling features reset at engine boundaries.
- Python compileall completed successfully.
- Four educational notebooks executed in order, with captured outputs.
- Streamlit server launched locally on port 8502.

Browser-produced screenshots were not recovered. The remote browser's local URL request returned net::ERR_BLOCKED_BY_CLIENT. A browser verification was reported by the user, but no screenshot artifact is available in this workspace. This does not invalidate the completed Python and Streamlit execution checks. Browser-level chart interactions, the downloaded CSV bytes, mobile visual QA and final screenshot-based design review remain unverified here.

## Update — 12/09/2026: GitHub publication and cloud deployment

- Local sanity pass: Python 3.10 (Python 3.12 was unusable on this machine — the Homebrew 3.12.14 bottle hit a `libexpat` ABI mismatch against this macOS build, breaking `pip`/`plistlib`; not a project issue). `compileall` clean, 8/8 pytest tests passed (with expected `InconsistentVersionWarning` from the scikit-learn 1.7.2 vs 1.8.0 mismatch — harmless, resolved by CI below). All seven pages loaded locally on `streamlit run app.py` with zero console errors.
- Pushed the real project history to `github.com/A1i-lab/aeropredict-mro` (`main`), replacing a placeholder initial commit that held only an auto-generated README.
- GitHub Actions CI (`.github/workflows/ci.yml`) ran on push with the exact pinned `requirements.txt` on Python 3.12, Ubuntu: `pip install`, `compileall`, and all 8 pytest tests passed. This is the authoritative pinned-dependency check. Run: https://github.com/A1i-lab/aeropredict-mro/actions.
- Deployed to Streamlit Community Cloud: [aeropredict-mro.streamlit.app](https://aeropredict-mro.streamlit.app/), branch `main`, entrypoint `app.py`, Python 3.12.14 (build log confirmed). No secrets required.
- Verified in the live cloud app via browser automation: all seven pages render with real data and zero console errors; engine selector tested (ENG-081 → ENG-001, values updated correctly); Prognostics & Alerts empty-result filter tested (searching a nonexistent engine ID correctly showed "No engines match these filters" with zero counts, no exception); Maintenance Planner capacity slider tested (moved to 33, planned reviews/critical-in-plan/chart updated correctly, reset to 10). Screenshots captured from the live app and saved to `docs/screenshots/`.
- Not verified in this pass: scrolling within the live app to reach content below the fold (CSV download button, full priority-matrix and residual charts, narrow-screen layout) — the browser automation tool could not deliver scroll/wheel events into Streamlit Community Cloud's cross-origin embedding iframe (confirmed via script: the top document reports zero scrollable height and two iframes; mouse clicks reach the iframe correctly, scroll events do not). This is a tool limitation encountered during this session, not an observed app defect — the corresponding logic (CSV export excludes `actual_rul`, planner ranking, empty-filter handling) is covered by the pytest suite, which passes. A manual scroll-through and CSV download check by a human is recommended before treating narrow-screen/scrolled-content QA as complete.


## Interactive studio, 12/09/2026

- Recovered the published GitHub revision 9985089 before authoring the redesign.
- Ten Python tests pass locally, including the original seven views, explicit
  studio payload parity, exclusion of actual_rul and the studio Streamlit shell.
- Production Vite build succeeds; scripts, fonts and data are bundled locally.
- Deployed preview inspected in the Cloud Browser at the actual Streamlit URL.
- Software-rendered turbine displayed successfully. The validation browser reports
  WebGL disabled, so GPU rendering is not claimed as visually verified.
- Five-part guided tour, engine selections 001/050/100, empty search, overview with
  100 clickable engines, 31 alerts and the 18-engine watch filter verified.
- Planner verified at capacities 1 and 100; selected engine remains available in
  the manual selection tab. Downloaded CSV bytes verified for ENG-001, rank 1,
  source-consistent predictions and no actual_rul column.
- Results, data/method and About tabs verified against the prepared metrics.
- Selection is local to the active visit, not a shared or persistent work order.
- The cloud browser download event timed out, but the file was successfully
  downloaded and inspected in the synchronized download directory.

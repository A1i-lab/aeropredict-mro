# Deployment handoff

The project contains the trained artifact and all prepared runtime data. Never run training during Streamlit startup. Use Python 3.12 and requirements.txt. No secrets or API keys are required by the application.

## GitHub
Create a public repository named aeropredict-mro after connecting the intended account. Push the existing main branch. The remote URL must come from the created repository, never from a guessed username. The MIT license covers original code; retain dataset provenance and the disclaimer.

## Streamlit Community Cloud
Use the current official deployment instructions linked in README.md. Select the repository, branch main, entrypoint app.py and Python 3.12. Wait for the build and examine logs if it fails. No Live Demo link should be inserted until the public app actually loads.

## Final cloud checks
Open all seven pages. Select several engines. Filter alerts, including an empty result. Change planner capacity and download its CSV. Verify that export rows match the chosen plan, and that actual_rul is excluded. Review chart interactions and tables on desktop and narrow screens. Take polished screenshots of Fleet Overview, Engine Health, Maintenance Planner and Model Performance. Save them in docs/screenshots, add the real Live Demo URL and screenshots to README.md, then commit and push.

Current state: published. Repository: [github.com/A1i-lab/aeropredict-mro](https://github.com/A1i-lab/aeropredict-mro). Live app: [aeropredict-mro.streamlit.app](https://aeropredict-mro.streamlit.app/) (Python 3.12, branch `main`, entrypoint `app.py`). GitHub Actions CI passes on the pinned `requirements.txt`. Current screenshots (A350 Home, Equipment Exploration, Predictive Diagnostic, Engine Health, Model Performance) are in `docs/screenshots/` and linked from the README. See [validation status](validation.md) for exactly what was checked in the live app and what remains for manual follow-up (scrolled content and CSV download on the cloud deployment, narrow-screen QA).


## Engine Studio delivery

`app.py` serves the precompiled `frontend/studio.html` by default and preserves
all original views through `?experience=classic`. No Node installation or model
training is required on Streamlit Cloud. Rebuild the frontend before committing
any changes to frontend sources or prepared prediction data; see frontend/README.md.
GitHub Actions rebuilds the bundle and rejects stale checked-in HTML.

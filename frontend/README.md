# AeroPredict Engine Studio

React + Three.js interface, delivered inside the existing Streamlit application.
The original seven scientific views remain available with `?experience=classic`.

## Rebuild

From the repository root, with Node 20.19+ and the Python dependencies installed:

```sh
python scripts/export_studio_data.py
npm ci --prefix frontend
npm run build --prefix frontend
python scripts/package_studio.py
python -m pytest -q
```

Commit `frontend/studio.html` after every frontend or data change. Streamlit does
not install Node or train models at startup. The generated source `src/data.json`
is intentionally ignored and regenerated from the tracked Python artifacts.
The delivered HTML includes scripts, fonts and styles without external CDNs.
The regular Vite `dist` output is also deployable on any static hosting platform.
For standalone development: `npm run dev --prefix frontend -- --host 127.0.0.1`.

## Data and scientific boundaries

The decision payload exports an explicit column allowlist without actual_rul.
Predictions and uncertainty are copied from the existing prepared NASA artifacts,
not invented for the design. History and sensor graphs use recorded trajectories.
Engine lists are sorted by priority descending, RUL ascending and engine ID.
The planning CSV has explicit decision columns and preserves that order.
User selections persist only within the current visit; CSV export saves a copy.

The turbine is original procedural teaching geometry. It is not certified CAD,
a replica of a named engine, a physical simulation or a part-level fault model.
The selectable components and airflow are educational. Selection highlighting is
independent of engine risk. No operational maintenance instructions are inferred.

## Interaction and accessibility

Pointer rotation/zoom, touch orbit controls, assembly/cutaway/exploded views,
optional rotor animation and airflow, component selection and guided tour.
Every component is accessible through standard buttons outside the 3D canvas.
Animation defaults to off. Reduced-motion users have no automatic transitions.
A WebGL failure leaves all data views, selection and CSV export available.
Fonts are bundled with OFL licenses in `public/licenses/`.

## Integration

`app.py` selects the studio or delegates to `classic_app.py`. The studio uses the
supported `st.iframe` HTML surface, so no separate API, paid service or new host
is necessary. Classic views retain the full original evaluation and report access.

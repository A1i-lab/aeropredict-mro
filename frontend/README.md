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
When WebGL is unavailable, a Canvas 2D software renderer projects the same 3D geometry. Rotation, component selection and exploded views remain available, at reduced detail. Data and CSV export are unchanged.
Fonts are bundled with OFL licenses in `public/licenses/`.

## Integration

`app.py` selects the studio or delegates to `classic_app.py`. The studio uses the
supported `st.iframe` HTML surface, so no separate API, paid service or new host
is necessary. Classic views retain the full original evaluation and report access.

For a narrow-layout review on Streamlit, use `?preview=mobile` (390 px frame).

## Aircraft welcome and multi-equipment scenarios (V3)

The default landing page explains predictive maintenance before opening a data
workspace. It includes an original procedural, stylised A320-family aircraft,
with six accessible zones and eased camera transitions. This is not Airbus CAD;
locations and geometry are illustrative. The five non-engine systems have
synthetic histories for twelve fictitious aircraft, with no mapping to NASA
engine identifiers. NASA FD001 predictions remain unchanged and separate.

Regenerate scenarios with `python scripts/generate_aircraft_scenarios.py` before
building. This writes 3,600 observations to `data/synthetic/equipment_signals.csv`
and the corresponding frontend JSON. The generator is deterministic.

`prediction.js` fits the last 20 available observations and projects a linear
crossing of a deliberately illustrative threshold. Replay truncates the history
before fitting. This is not validated RUL or a calibrated failure probability.
Thresholds are not OEM limits. The NASA evaluation metrics do not apply to these
new scenarios. Selection and review status last for the active visit only;
export uses the final cycle-60 snapshot and explicitly names the synthetic source.

Run `node --test frontend/tests/*.test.js` for projection edge cases and schema
checks. CI regenerates scenarios and verifies that tracked data and the packaged
interface match a fresh build. The aircraft renderer reuses the existing Canvas2D
fallback when WebGL is unavailable, observes visibility, and honors reduced motion.

Product inspiration: [AFI KLM E&M PROGNOS](https://www.afiklmem.com/en/solutions/about-prognos).
AeroPredict is an independent academic demonstrator, not an affiliated product
or a reproduction of proprietary methods or airline operational data.

## Aircraft and equipment continuity (13/09/2026)

The new procedural airframe uses a smooth fuselage loft, six windscreen panes,
profiled wings, joined winglets, hollow intakes and paired gear wheels. Screen-space
leader lines place zone labels outside the airframe. CPU depth buffering prevents
flush windows and panel details from drawing through the fuselage. The original
engine geometry and its software rendering path are preserved.

Selecting an aircraft zone (or a nearby surface) focuses the camera before opening
its destination. View Transitions share the scene between aircraft and equipment;
returning to the aircraft restores the wide camera. Browsers without View
Transitions use a fade/scale fallback. Reduced-motion settings skip this motion.
Five non-engine equipment assemblies have component framing, exploded views and a
measurement reference. These are original mechanical teaching illustrations,
not manufacturer CAD or part-specific failure localisation. All source data,
thresholds and original NASA predictions are unchanged.

Validation (13/09/2026): the production build and seven JavaScript tests pass,
including finite geometry, restoration after explosion and depth occlusion.
CPU images of the airframe and five equipment models were inspected locally.
GitHub Actions run 34750005961 passed for release 5a94f06, including the pinned
Python suite and a fresh frontend build with packaged-HTML consistency checking.

The release was published with explicit user approval. Verified in the live
Streamlit application: aircraft-to-APU navigation, exploded-view control, sensor
framing control, return to aircraft, aircraft-to-engine navigation, and entry to
equipment from the lower welcome button. The cloud validation browser has WebGL
disabled, so these checks exercise the CPU fallback; GPU rendering performance
and physical mobile-device smoothness are not claimed as verified.

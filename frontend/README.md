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

## A320neo asset and single journey (13/09/2026, follow-up)

The earlier procedural aircraft has been replaced in the live renderer with the
FlightGear A320neo exterior and LEAP engines: 108,728 triangles and 176 meshes.
Source, GPL-2.0 license and reproducible conversion instructions are in
`third_party/flightgear-a320`. The named objects retain separate fans, gear
mechanisms, slats, spoilers, doors and sensors. Model loading is local from the
packaged HTML. Studio environment lighting and soft GPU shadows complement
material-specific metallic/roughness values. The CPU fallback now samples the
same textures with perspective-correct UVs, preserving 3D rotation and depth.

Aircraft selection starts one shared visual transition immediately, anchored on
the chosen zone. There is no awaited preliminary camera flight. Destination
geometry is synchronously prepared in exploded configuration before its first
snapshot, including the engine. All five equipment viewers start exploded.
Browsers without View Transitions use one reveal; reduced-motion skips motion.
The follow-up camera controller now moves the actual aircraft camera and target
on one 1.6-second timeline. The live canvas follows the destination layout while
the already-exploded detail scene fades in before camera travel ends. It is not a
physics simulation of the whole aircraft being disassembled.

`aircraft-camera.js` is driven by the existing aircraft animation loop. It locks
conflicting selections, handles cancellation, restores the canvas to its original
host, and reverses the camera journey on return. Escape safely returns home.
Reduced-motion users keep immediate access to every destination. CPU fallback
has no GPU lighting or shadow support; the aircraft geometry and texture UVs are
the same in both renderers.

The cloud validation browser has WebGL disabled. CPU renders can validate shape,
texture, loading and navigation; they cannot validate GPU shadows, shader lighting
or physical-device frame rates. The data and prediction methods are unchanged.

## A350-900 exterior and reversible assembly motion (14/09/2026, current)

The A320neo exterior above has since been replaced with the FlightGear A350XWB
source described in [third_party/flightgear-a350](../third_party/flightgear-a350/README.md);
the A320neo implementation remains recoverable at commit `426599f` and branch
`recovery/a320neo-426599f`. The aircraft is fetched on demand from
`app/static/models/a350-900.glb.gz` — Streamlit static serving must stay enabled —
and includes its own textures with no external CDN. Components land assembled,
with a reversible, staggered 1.2-second exploded transition instead of starting
pre-exploded. `aircraft-framing.js` binary-searches the camera distance so the
aircraft fills the desktop stage without clipping. NASA engine predictions and
synthetic equipment monitoring remain independent of the aircraft family.

This is the aircraft shown in the top-level README's screenshots. It is still an
original, simplified teaching model, not certified CAD or a component fault
diagnosis. Validation: `node --test frontend/tests/*.test.js` (12 tests, including
framing and assembly-motion coverage), `python -m pytest -q`, `npm --prefix
frontend run build` and `python scripts/package_studio.py` all pass; the packaged
`frontend/studio.html` is byte-identical to a fresh build, confirming
reproducibility.

## Predictive Diagnostic (14/09/2026)

A new Streamlit page, **Predictive Diagnostic**, ships alongside this frontend
(`src/diagnostic.py`, `src/diagnostic_view.py`) but is not part of the React
studio itself — it lives in the classic workspace (`?experience=classic`), next
to Engine Health. It runs the existing saved model on demo, manually entered or
uploaded engine histories; see the top-level README for details. No studio asset,
aircraft geometry or synthetic equipment scenario is changed by this addition.

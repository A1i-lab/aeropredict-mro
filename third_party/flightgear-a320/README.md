# FlightGear A320neo exterior

The aircraft exterior is adapted from [legoboyvdlp/A320-family](https://github.com/legoboyvdlp/A320-family), revision `e11abae58872d01691df15f70c5395f1409c1339` (branch dev). It is an independent simulator model, not Airbus CAD and not an endorsement by Airbus, CFM or its authors.

Copyright © 2025 Josh Davidson, Jonathan Redpath, merspieler, Matthew Maring, Thorsten Herrmann, Semir Gebran. The LEAP configuration also credits Josh Davidson (2026). See the original notices in COPYRIGHT.md and the XML source files.

The exterior, its textures, derivative GLB and conversion script are distributed under **GNU GPL version 2**. The complete license is in LICENSE. These terms apply to these third-party assets and their adaptations; no ownership of the original asset is claimed.

`source.zip` contains the editable AC3D exterior and LEAP geometry, original PNG textures, configuration XML and copyright/license notices. This is the preferred source format of the imported assets. The project distributes that source alongside the converted model, without a download account or an external model service.

Changes in AeroPredict (13 September 2026): polygon triangulation, crease-aware normals, semantic assembly grouping, omission of spinning-fan substitute surfaces, wingtip-fence alternative and hidden RAT/cargo props, opaque cockpit glazing, physically based material parameters, texture resolution capped at 2048 pixels, and gzip packaging. Geometry remains in metres in the asset; a 0.5 scene wrapper matches the existing application coordinates. The application material replaces primer colouring with neutral paint and a navy fin. FlightGear animations and operational systems are not imported. The simulator's original markings are illustrative and are not the identity of the synthetic fleet.

To rebuild with Node and Python (Pillow installed):

```sh
unzip third_party/flightgear-a320/source.zip -d /tmp/aeropredict-aircraft-source
npm --prefix frontend ci
node scripts/convert_aircraft.mjs /tmp/aeropredict-aircraft-source
npm --prefix frontend run build
python scripts/package_studio.py
```

Output: `frontend/src/assets/a320neo.glb.gz`. Vite embeds this local asset into the self-contained Streamlit HTML. The browser decompresses the GLB locally; model loading has no third-party network dependency.

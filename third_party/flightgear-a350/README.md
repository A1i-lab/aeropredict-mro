# FlightGear A350XWB exterior

Source: https://github.com/FGMEMBERS/A350XWB
Revision: `04da937ab1ba0b07dabfd71d91aa33eb38316b90`
Authors: Sbyx, Jormappapa and the FlightGear A350XWB contributors.
License: GPL-2.0-or-later, see COPYING. The editable AC3D mesh and every imported texture are in source.zip.

Conversion: extract source.zip, then run `node scripts/convert_a350.mjs /path/to/source` from the repository root. Requires frontend npm dependencies and Python Pillow.
The converter triangulates surfaces, retains UVs and smooth normals, resizes textures to at most 2048 pixels, adds maintenance selection metadata, recentres the aircraft and scales coordinates by 0.56. The viewer applies a further 0.5 scale for its existing camera system. Windshield material is opaque for web rendering. The original source remains unmodified in the archive.

This is a FlightGear-derived A350-900-inspired educational exterior, not an Airbus CAD model or certified maintenance digital twin. The original demonstrator livery is retained. There is no Airbus or airline affiliation. Predictive equipment models are independent teaching illustrations, not validated A350 component geometry.

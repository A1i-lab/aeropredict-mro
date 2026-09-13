# A350 inspection refinement

Baseline preserved: 5d57d64f47c705175d6d45d41baa1bfe4cb80b47.
No remote connection, push or deployment was performed.

## Layout
Streamlit iframe uses the viewport height. Desktop home headings and context panel are more compact. Equipment inspection uses a viewport-sized stage with a separately scrollable component/signal rail. Engine list and explanation panel scroll independently, while the central stage uses the remaining height. Small screens retain stacked content.

## Aircraft
The original GLB and textures are unchanged. Framing uses sampled model surfaces and centres their projected bounds. Offline renders at stage sizes corresponding to desktop layouts show 76 percent horizontal occupancy and no clipped extremity. Supporting callouts are smaller and closer to their anchors. Hemisphere fill and contact shadow contrast are adjusted; GPU appearance remains to be checked.

## Motion
Components land assembled. A shared 1200ms quintic timeline staggers parts and supports reversal from the current pose; repeated identical requests do not restart it. Camera distance follows the same progress, preserving user orientation. Engine shells fade when switching to the interior view. Reduced motion applies final poses immediately. Existing aircraft entry/return timeline is retained.

## Validation and limits
JavaScript tests cover motion, reversal, frame independence, reduced-motion endpoints, real A350 framing, finite geometry, depth ordering and prediction invariants. Python tests cover analytical views and packaging. Production build succeeds with the existing large-chunk advisory.
Offline CPU snapshots are attached for 1366, 1440 and 1920 layouts. These are scene renders, not browser screenshots. Interactive route clicks, final page height, browser console, GPU shadows and actual scroll behavior could not be verified because the available browser previously rejected local navigation. No claim of production verification is made.

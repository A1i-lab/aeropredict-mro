import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const assetUrl = new URL("app/static/models/a350-900.glb.gz", document.baseURI)
  .href;

// GPL-2.0-or-later FlightGear A350XWB exterior, vendored with editable source and conversion script.
// Asset coordinates are metres; the scene wrapper retains the app's half scale.
export function prepareAircraft(root) {
  root.name = "Aircraft";
  root.scale.setScalar(0.5);
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    const material = o.material;
    if (material.map) material.map.anisotropy = 4;
  });
  return root;
}
export async function loadAircraftModel() {
  const response = await fetch(assetUrl);
  if (!response.ok) throw new Error("Aircraft asset unavailable");
  const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
  const data = await new Response(stream).arrayBuffer();
  const gltf = await new GLTFLoader().parseAsync(data, "");
  return prepareAircraft(gltf.scene);
}
export function disposeAircraft(root) {
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set();
  root.traverse((o) => {
    if (!o.isMesh) return;
    geometries.add(o.geometry);
    materials.add(o.material);
    if (o.material.map) textures.add(o.material.map);
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => {
    t.image?.close?.();
    t.dispose();
  });
  root.removeFromParent();
}

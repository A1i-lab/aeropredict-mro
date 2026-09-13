import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import assetUrl from "./assets/a320neo.glb.gz?url";

// GPL-2.0 FlightGear exterior, vendored with editable source and conversion script.
// Asset coordinates are metres; the scene wrapper retains the app's half scale.
export function prepareAircraft(root) {
  root.name = "Aircraft";
  root.scale.setScalar(0.5);
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    const material = o.material;
    if (material.map) material.map.anisotropy = 4;
    if (material.userData.demonstratorPaint) {
      // Paint the source's bare-metal primer using a material, preserving the UV
      // panel/window detail. The original texture remains in the source archive.
      material.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader
          .replace(
            "#include <common>",
            "#include <common>\nvarying vec3 aircraftPosition;",
          )
          .replace(
            "#include <begin_vertex>",
            "#include <begin_vertex>\naircraftPosition = position;",
          );
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            "#include <common>\nvarying vec3 aircraftPosition;",
          )
          .replace(
            "#include <map_fragment>",
            `#include <map_fragment>
          float hi=max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b));
          float lo=min(diffuseColor.r,min(diffuseColor.g,diffuseColor.b));
          if(hi-lo>.035 && hi>.06) diffuseColor.rgb=vec3(.79,.82,.84)*(0.88+0.12*hi);
          if(aircraftPosition.x < -17.8 || (aircraftPosition.x > -10.0 && aircraftPosition.x < 0.0 && aircraftPosition.y < -.1)) diffuseColor.rgb=vec3(.79,.82,.84);
          if(aircraftPosition.y>2.0 && aircraftPosition.x>9.0 && abs(aircraftPosition.z)<.8) diffuseColor.rgb=vec3(.018,.044,.09);
        `,
          );
      };
      material.customProgramCacheKey = () => "aeropredict-neutral-paint-v1";
    }
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

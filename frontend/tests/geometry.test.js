import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildAircraftModel } from "../src/aircraft-model.js";
import {
  buildEquipmentModel,
  EQUIPMENT_DETAILS,
} from "../src/equipment-models.js";
import { DepthRenderer } from "../src/depth-renderer.js";

function finiteGeometry(root) {
  root.traverse((o) => {
    if (o.isMesh)
      for (const attr of Object.values(o.geometry.attributes))
        assert.ok(
          Array.from(attr.array).every(Number.isFinite),
          `${o.name} has a nonfinite vertex`,
        );
  });
}
test("airframe and every equipment remain finite through extraction and restore", () => {
  const scene = new T.Scene(),
    aircraft = buildAircraftModel(scene, { detail: 0 });
  finiteGeometry(aircraft.root);
  aircraft.dispose();
  assert.equal(scene.children.length, 0);
  for (const id of Object.keys(EQUIPMENT_DETAILS)) {
    const m = buildEquipmentModel(scene, id);
    const before = new T.Box3().setFromObject(m.root);
    m.setExplode(1);
    finiteGeometry(m.root);
    m.setExplode(0);
    const after = new T.Box3().setFromObject(m.root);
    assert.ok(before.min.distanceTo(after.min) < 1e-8);
    assert.ok(before.max.distanceTo(after.max) < 1e-8);
    m.dispose();
    assert.equal(scene.children.length, 0);
  }
});
test("depth rendering keeps foreground details visible regardless of scene order", () => {
  let output;
  const canvas = {
    width: 64,
    height: 64,
    style: {},
    getContext() {
      return {
        createImageData(w, h) {
          return { data: new Uint8ClampedArray(w * h * 4) };
        },
        putImageData(image) {
          output = image.data;
        },
      };
    },
  };
  const previous = global.document;
  global.document = {
    createElement() {
      return canvas;
    },
  };
  try {
    const renderer = new DepthRenderer();
    renderer.setSize(64, 64);
    const camera = new T.PerspectiveCamera(45, 1, 0.1, 20);
    camera.position.z = 5;
    camera.lookAt(0, 0, 0);
    const back = new T.Mesh(
      new T.PlaneGeometry(4, 4),
      new T.MeshBasicMaterial({ color: 0xff0000 }),
    );
    const front = new T.Mesh(
      new T.PlaneGeometry(1, 1),
      new T.MeshBasicMaterial({ color: 0x0000ff }),
    );
    front.position.z = 0.5;
    const scene = new T.Scene();
    scene.add(front, back);
    renderer.render(scene, camera);
    const first = output.slice();
    scene.clear();
    scene.add(back, front);
    renderer.render(scene, camera);
    assert.deepEqual(output, first);
    const centre = (32 * 64 + 32) * 4;
    assert.ok(output[centre + 2] > output[centre]);
    back.geometry.dispose();
    front.geometry.dispose();
    back.material.dispose();
    front.material.dispose();
    renderer.dispose();
  } finally {
    global.document = previous;
  }
});

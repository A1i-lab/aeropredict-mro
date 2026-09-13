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

test("externally served A350-900 preserves real geometry, semantic zones and local textures", async () => {
  const { readFileSync } = await import("node:fs");
  const { gunzipSync } = await import("node:zlib");
  const b = gunzipSync(
    readFileSync(
      new URL("../../static/models/a350-900.glb.gz", import.meta.url),
    ),
  );
  assert.equal(b.toString("ascii", 0, 4), "glTF");
  assert.equal(b.readUInt32LE(8), b.length);
  const doc = JSON.parse(b.toString("utf8", 20, 20 + b.readUInt32LE(12)));
  for (const name of [
    "Aircraft",
    "LeftEngine",
    "RightEngine",
    "LandingGear",
    "Sensors",
    "CockpitWindshield",
  ])
    assert.ok(
      doc.nodes.some((n) => n.name === name),
      name,
    );
  for (const zone of ["engine", "brakes", "actuator", "apu", "pack"])
    assert.ok(
      doc.nodes.some((n) => n.extras?.maintenanceZone === zone),
      zone,
    );
  for (const name of ["fan_eng1", "fan_eng2"]) {
    const mesh = doc.meshes.find((m) => m.name === name);
    assert.ok(
      mesh.primitives.reduce((s, p) => s + doc.accessors[p.indices].count, 0) >
        300,
    );
  }
  assert.ok(doc.images.every((i) => Number.isInteger(i.bufferView) && !i.uri));
  assert.ok(doc.buffers.every((b) => !b.uri));
  const binStart = 28 + b.readUInt32LE(12);
  for (const a of doc.accessors.filter((a) => a.componentType === 5126)) {
    const view = doc.bufferViews[a.bufferView],
      start = binStart + view.byteOffset;
    for (let j = 0; j < view.byteLength; j += 4)
      assert.ok(Number.isFinite(b.readFloatLE(start + j)));
  }
});

test('A350 framing fills the desktop stage without clipping its surfaces', async () => {
  const {readFileSync}=await import('node:fs');
  const {gunzipSync}=await import('node:zlib');
  const {frameAircraft}=await import('../src/aircraft-framing.js');
  const b=gunzipSync(readFileSync(new URL('../../static/models/a350-900.glb.gz',import.meta.url)));
  const doc=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
  const bin=28+b.readUInt32LE(12), root=new T.Group();root.scale.setScalar(.5);
  for(const mesh of doc.meshes) for(const primitive of mesh.primitives) {
    const a=doc.accessors[primitive.attributes.POSITION],v=doc.bufferViews[a.bufferView];
    const arr=new Float32Array(a.count*3);
    for(let i=0;i<arr.length;i++)arr[i]=b.readFloatLE(bin+v.byteOffset+i*4);
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(arr,3));
    root.add(new T.Mesh(geometry));
  }
  for(const [w,h] of [[812,513],[886,645],[1366,740]]) {
    const f=frameAircraft(root,w/h), camera=new T.PerspectiveCamera(38,w/h,.1,150);
    camera.position.copy(f.eye);camera.lookAt(f.target);camera.updateMatrixWorld(true);
    const box=new T.Box2();
    root.traverse(o=>{if(o.isMesh){const a=o.geometry.attributes.position;
      for(let i=0;i<a.count;i++){const p=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).project(camera);box.expandByPoint(new T.Vector2(p.x,p.y));}
    }});
    const fraction=(box.max.x-box.min.x)/2;
    assert.ok(fraction>=.68 && fraction<=.82,`stage ${w}: ${fraction}`);
    assert.ok(box.min.x> -1 && box.max.x<1 && box.min.y> -1 && box.max.y<1);
    assert.ok(box.getCenter(new T.Vector2()).length()<.08);
  }
  root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
});

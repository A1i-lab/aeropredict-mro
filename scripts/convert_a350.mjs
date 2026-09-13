/** GPL-2.0. Reproducible AC3D -> glTF conversion of the vendored FlightGear
 * A350XWB exterior. Run: node scripts/convert_a350.mjs /path/to/extracted/source
 * Requires the frontend's Three.js dependency; no Blender or asset CDN. */
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { gzipSync } from "node:zlib";
import * as T from "../frontend/node_modules/three/build/three.module.js";
const source = process.argv[2];
if (!source)
  throw new Error(
    "Pass the extracted third_party/flightgear-a350/source.zip directory",
  );
const binary = [],
  views = [],
  accessors = [],
  meshes = [],
  nodes = [],
  materials = [],
  textures = [],
  images = [];
let byteLength = 0;
function view(bytes) {
  const b = Buffer.from(bytes);
  const i = views.length;
  views.push({ buffer: 0, byteOffset: byteLength, byteLength: b.length });
  binary.push(b);
  byteLength += b.length;
  const pad = (4 - (byteLength % 4)) % 4;
  binary.push(Buffer.alloc(pad));
  byteLength += pad;
  return i;
}
function attr(values, type, componentType = 5126) {
  const size = { VEC3: 3, VEC2: 2, SCALAR: 1 }[type];
  const a =
    componentType === 5126 ? new Float32Array(values) : new Uint32Array(values);
  const o = {
    bufferView: view(Buffer.from(a.buffer)),
    componentType,
    count: values.length / size,
    type,
  };
  if (type === "VEC3") {
    o.min = [Infinity, Infinity, Infinity];
    o.max = [-Infinity, -Infinity, -Infinity];
    values.forEach((v, i) => {
      o.min[i % 3] = Math.min(o.min[i % 3], v);
      o.max[i % 3] = Math.max(o.max[i % 3], v);
    });
  }
  accessors.push(o);
  return accessors.length - 1;
}
const textureIndex = new Map();
function texture(name) {
  if (!textureIndex.has(name)) {
    const i = images.length;
    images.push({
      name,
      mimeType: "image/png",
      bufferView: view(
        execFileSync(
          "python",
          [
            "-c",
            'from PIL import Image; import sys; im=Image.open(sys.argv[1]); im.thumbnail((2048,2048),Image.Resampling.LANCZOS); im.save(sys.stdout.buffer,format="PNG",optimize=True)',
            path.join(source, "Models", name),
          ],
          { maxBuffer: 16 * 1024 * 1024 },
        ),
      ),
    });
    textures.push({ sampler: 0, source: i });
    textureIndex.set(name, i);
  }
  return textureIndex.get(name);
}
const skip = (n) =>
  /FanSpinning|Placards|WingtipFence|^navglass$|^Rat$|^RatSpinner$|^ULD45$|^NurbsPath/.test(
    n,
  );
const categories = [
  "Fuselage",
  "LeftWing",
  "RightWing",
  "LeftEngine",
  "RightEngine",
  "Tail",
  "LandingGear",
  "Sensors",
];
const root = { name: "Aircraft", children: [] };
nodes.push(root);
const cats = {};
for (const name of categories) {
  cats[name] = nodes.length;
  root.children.push(nodes.length);
  nodes.push({ name, children: [] });
}
function category(n, centre) {
  if (/eng|nacelle/i.test(n))
    return centre[2] > 0 ? "LeftEngine" : "RightEngine";
  if (/strut|scissor|tyres|arm|Cylinder|lgdoor|main.door/.test(n))
    return "LandingGear";
  if (/sensor|lamp|wiper/i.test(n)) return "Sensors";
  if (/rudder|elevator|hstab/i.test(n)) return "Tail";
  if (/wing|flap|slat|sb\d|aileron/i.test(n))
    return centre[2] > 0 ? "LeftWing" : "RightWing";
  return "Fuselage";
}
for (const file of ["A350XWB-900.ac"]) {
  const lines = fs
    .readFileSync(path.join(source, "Models", file), "utf8")
    .split(/\r?\n/);
  let cursor = 1;
  const acmat = [];
  while (lines[cursor]?.startsWith("MATERIAL")) {
    const l = lines[cursor++];
    acmat.push({
      name: l.match(/"([^"]+)"/)[1],
      color: l
        .match(/rgb ([\d.]+) ([\d.]+) ([\d.]+)/)
        .slice(1)
        .map(Number),
    });
  }
  function object() {
    const type = lines[cursor++].split(" ")[1];
    let name = type,
      tex = null,
      crease = 45,
      verts = [],
      surfs = [],
      loc = [0, 0, 0];
    while (cursor < lines.length) {
      let l = lines[cursor++],
        p = l.split(/\s+/);
      if (p[0] === "name") name = JSON.parse(l.slice(5));
      else if (p[0] === "texture") tex = JSON.parse(l.slice(8));
      else if (p[0] === "data") cursor++;
      else if (p[0] === "crease") crease = +p[1];
      else if (p[0] === "loc") loc = p.slice(1).map(Number);
      else if (p[0] === "numvert") {
        for (let j = 0; j < +p[1]; j++)
          verts.push(lines[cursor++].trim().split(/\s+/).map(Number));
      } else if (p[0] === "numsurf") {
        for (let j = 0; j < +p[1]; j++) {
          const flags = parseInt(lines[cursor++].split(" ")[1]);
          let m = 0;
          if (lines[cursor].startsWith("mat ")) m = +lines[cursor++].slice(4);
          const count = +lines[cursor++].slice(5),
            refs = [];
          for (let k = 0; k < count; k++)
            refs.push(lines[cursor++].trim().split(/\s+/).map(Number));
          if ((flags & 15) === 0) surfs.push({ flags, m, refs });
        }
      } else if (p[0] === "kids") {
        if (verts.length && !skip(name))
          emit(name, tex, crease, verts, surfs, loc, acmat);
        for (let j = 0; j < +p[1]; j++) object();
        return;
      }
    }
  }
  object();
}
function emit(name, tex, crease, verts, surfs, loc, acmat) {
  const triangles = [],
    normals = verts.map(() => []);
  for (const s of surfs) {
    if (s.refs.length < 3) continue;
    const ps = s.refs.map((r) => new T.Vector3(...verts[r[0]]));
    const normal = new T.Vector3();
    for (let i = 0; i < ps.length; i++) {
      const a = ps[i],
        b = ps[(i + 1) % ps.length];
      normal.x += (a.y - b.y) * (a.z + b.z);
      normal.y += (a.z - b.z) * (a.x + b.x);
      normal.z += (a.x - b.x) * (a.y + b.y);
    }
    normal.normalize();
    const axis = [
      Math.abs(normal.x),
      Math.abs(normal.y),
      Math.abs(normal.z),
    ].indexOf(
      Math.max(Math.abs(normal.x), Math.abs(normal.y), Math.abs(normal.z)),
    );
    const contour = ps.map((p) =>
      axis === 0
        ? new T.Vector2(p.y, p.z)
        : axis === 1
          ? new T.Vector2(p.x, p.z)
          : new T.Vector2(p.x, p.y),
    );
    for (const ids of T.ShapeUtils.triangulateShape(contour, [])) {
      const refs = ids.map((i) => s.refs[i]);
      const a = new T.Vector3(...verts[refs[0][0]]),
        b = new T.Vector3(...verts[refs[1][0]]),
        c = new T.Vector3(...verts[refs[2][0]]);
      if (b.sub(a).cross(c.sub(a)).dot(normal) < 0)
        [refs[1], refs[2]] = [refs[2], refs[1]];
      const tri = { refs, normal, m: s.m, smooth: !!(s.flags & 16) };
      triangles.push(tri);
      refs.forEach((r) => normals[r[0]].push(normal));
    }
  }
  const primitives = [];
  for (const m of new Set(triangles.map((t) => t.m))) {
    const pos = [],
      nor = [],
      uv = [],
      indices = [],
      keys = new Map();
    for (const t of triangles.filter((t) => t.m === m)) {
      for (const r of t.refs) {
        const n = t.smooth
          ? normals[r[0]]
              .reduce(
                (sum, n) =>
                  n.dot(t.normal) >= Math.cos((crease * Math.PI) / 180) - 1e-5
                    ? sum.add(n)
                    : sum,
                new T.Vector3(),
              )
              .normalize()
          : t.normal;
        const key = [...r, n.x.toFixed(4), n.y.toFixed(4), n.z.toFixed(4)].join(
          ",",
        );
        if (!keys.has(key)) {
          keys.set(key, pos.length / 3);
          pos.push(
            ...verts[r[0]].map(
              (v, i) => (v + loc[i] - (i === 0 ? 33.4 : 0)) * 0.56,
            ),
          );
          nor.push(...n.toArray());
          uv.push(r[1], 1 - r[2]);
        }
        indices.push(keys.get(key));
      }
    }
    let material = {
      name: name + " / " + acmat[m].name,
      pbrMetallicRoughness: {
        baseColorFactor: [1, 1, 1, 1],
        metallicFactor: 0.18,
        roughnessFactor: 0.4,
      },
      doubleSided: true,
    };
    if (/Windshield/.test(name)) {
      material.pbrMetallicRoughness = {
        baseColorFactor: [0.025, 0.055, 0.08, 1],
        metallicFactor: 0.5,
        roughnessFactor: 0.16,
      };
    } else if (tex)
      material.pbrMetallicRoughness.baseColorTexture = { index: texture(tex) };
    else material.pbrMetallicRoughness.baseColorFactor = [...acmat[m].color, 1];
    if (/SlidingTube|Torque|Intake|Exhaust/.test(name)) {
      material.pbrMetallicRoughness.metallicFactor = 0.72;
      material.pbrMetallicRoughness.roughnessFactor = 0.26;
    }
    if (/Fan|Inner|Wheels/.test(name)) {
      material.pbrMetallicRoughness.metallicFactor = 0.22;
      material.pbrMetallicRoughness.roughnessFactor = 0.65;
    }
    material.extras = {
      demonstratorPaint: false,
    };
    materials.push(material);
    primitives.push({
      attributes: {
        POSITION: attr(pos, "VEC3"),
        NORMAL: attr(nor, "VEC3"),
        TEXCOORD_0: attr(uv, "VEC2"),
      },
      indices: attr(indices, "SCALAR", 5125),
      material: materials.length - 1,
    });
  }
  if (!primitives.length) return;
  const c = verts.reduce(
    (a, v) => a.map((x, i) => x + v[i] / verts.length),
    [0, 0, 0],
  );
  const cat = category(
    name,
    c.map((v, i) => v + loc[i]),
  );
  nodes[cats[cat]].children.push(nodes.length);
  nodes.push({
    name: name
      .replace("Windshield", "CockpitWindshield")
      .replace("Windshild", "Windshield"),
    mesh: meshes.length,
    extras: {
      maintenanceZone: /Engine/.test(cat)
        ? "engine"
        : cat === "LandingGear"
          ? "brakes"
          : /Wing/.test(cat) || cat === "Tail"
            ? "actuator"
            : name === "Fuselage.003"
              ? "apu"
              : name === "Cube.005"
                ? "pack"
                : null,
    },
  });
  meshes.push({ name, primitives });
}
const doc = {
  asset: {
    version: "2.0",
    generator: "AeroPredict AC3D converter",
    copyright:
      "FlightGear A350XWB contributors. GPL-2.0. See third_party/flightgear-a350.",
  },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes,
  meshes,
  materials,
  textures,
  images,
  samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
  accessors,
  bufferViews: views,
  buffers: [{ byteLength }],
};
let json = Buffer.from(JSON.stringify(doc));
json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 32)]);
const bin = Buffer.concat(binary),
  head = Buffer.alloc(20),
  bh = Buffer.alloc(8);
head.write("glTF");
head.writeUInt32LE(2, 4);
head.writeUInt32LE(28 + json.length + bin.length, 8);
head.writeUInt32LE(json.length, 12);
head.write("JSON", 16);
bh.writeUInt32LE(bin.length);
bh.write("BIN\0", 4);
fs.writeFileSync(
  "static/models/a350-900.glb.gz",
  gzipSync(Buffer.concat([head, json, bh, bin]), { level: 9 }),
);
console.log({
  nodes: nodes.length,
  meshes: meshes.length,
  triangles: meshes.reduce(
    (s, m) =>
      s + m.primitives.reduce((a, p) => a + accessors[p.indices].count / 3, 0),
    0,
  ),
  bytes: 28 + json.length + bin.length,
});

import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SoftwareRenderer } from "./software-renderer";

export const ZONES = [
  { id: "engine", name: "Moteur", position: [-1.8, -0.85, 3.2] },
  { id: "apu", name: "APU", position: [8.1, 0.2, 0] },
  { id: "brakes", name: "Freins", position: [1.5, -1.65, 1.4] },
  { id: "hydraulic", name: "Hydraulique", position: [0.7, -0.65, 0] },
  { id: "pack", name: "Air cabine", position: [-0.7, -0.55, -1] },
  { id: "actuator", name: "Actionneur", position: [2.6, 0.12, 5.3] },
];
// Original, stylised A320-family teaching geometry. No manufacturer CAD or livery.
export function createAircraft(host, onSelect) {
  const scene = new T.Scene();
  let renderer;
  try {
    renderer = new T.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
  } catch {
    renderer = new SoftwareRenderer();
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0xffffff, 0);
  host.append(renderer.domElement);
  renderer.domElement.setAttribute(
    "aria-label",
    "Avion 3D inspiré de la famille A320. Glisser pour tourner. Les boutons permettent de choisir un équipement.",
  );
  const camera = new T.PerspectiveCamera(38, 1, 0.1, 150);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 3;
  controls.maxDistance = 65;
  scene.add(new T.HemisphereLight(0xffffff, 0x7c9091, 3));
  const sun = new T.DirectionalLight(0xffffff, 3);
  sun.position.set(-8, 15, 8);
  scene.add(sun);
  const white = new T.MeshStandardMaterial({
    color: 0xe3e9e7,
    metalness: 0.25,
    roughness: 0.4,
  });
  const green = new T.MeshStandardMaterial({
    color: 0x2b6658,
    metalness: 0.18,
    roughness: 0.45,
  });
  const dark = new T.MeshStandardMaterial({
    color: 0x243b42,
    metalness: 0.35,
    roughness: 0.35,
  });
  const metal = new T.MeshStandardMaterial({
    color: 0x8b9b9e,
    metalness: 0.7,
    roughness: 0.35,
  });
  const mesh = (g, m, p = [0, 0, 0]) => {
    const o = new T.Mesh(g, m);
    o.position.set(...p);
    scene.add(o);
    return o;
  };
  const lathe = (profile, m, p) => {
    const o = mesh(
      new T.LatheGeometry(
        profile.map(([r, x]) => new T.Vector2(r, x)),
        28,
      ),
      m,
      p,
    );
    o.rotation.z = -Math.PI / 2;
    return o;
  };
  lathe(
    [
      [0, -9.25],
      [0.22, -9],
      [0.54, -8.45],
      [0.82, -7.7],
      [0.97, -6.7],
      [1, -5.7],
      [1, 4.8],
      [0.86, 5.9],
      [0.57, 7.1],
      [0.28, 8.3],
      [0.06, 9.1],
    ],
    white,
  );
  function horizontal(points, y, thickness, material) {
    const shape = new T.Shape(points.map(([x, z]) => new T.Vector2(x, z)));
    const g = new T.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: false,
    });
    const o = mesh(g, material, [0, y, 0]);
    o.rotation.x = Math.PI / 2;
    return o;
  }
  for (const side of [-1, 1]) {
    horizontal(
      [
        [-2, 0.7],
        [1.55, 8.4],
        [2.15, 8.8],
        [3.15, 8.8],
        [3.2, 7.9],
        [2.5, 3.4],
        [3.55, 0.65],
      ].map(([x, z]) => [x, z * side]),
      -0.06,
      0.12,
      white,
    );
    horizontal(
      [
        [5.5, 0.55],
        [7.6, 3.65],
        [8.5, 3.65],
        [8.2, 0.35],
      ].map(([x, z]) => [x, z * side]),
      0.45,
      0.1,
      white,
    );
    horizontal(
      [
        [1.55, 8.4],
        [1.75, 8.6],
        [2.5, 8.6],
        [3.15, 8.8],
      ].map(([x, z]) => [x, z * side]),
      0.5,
      0.09,
      green,
    );
    horizontal(
      [
        [0.8, 3.5],
        [2.4, 7.4],
        [2.85, 7.4],
        [2.35, 3.5],
      ].map(([x, z]) => [x, z * side]),
      0.015,
      0.035,
      metal,
    );
    lathe(
      [
        [0.58, -1.25],
        [0.67, -1.1],
        [0.72, -0.7],
        [0.68, 0.5],
        [0.49, 1.05],
      ],
      white,
      [-1, -1, side * 3.15],
    );
    const fan = mesh(new T.CylinderGeometry(0.53, 0.53, 0.08, 24), dark, [
      -2.18,
      -1,
      side * 3.15,
    ]);
    fan.rotation.z = Math.PI / 2;
    for (let k = 0; k < 14; k++) {
      const a = (k * Math.PI * 2) / 14;
      const blade = mesh(new T.BoxGeometry(0.05, 0.36, 0.075), metal, [
        -2.24,
        -1 + Math.cos(a) * 0.28,
        side * 3.15 + Math.sin(a) * 0.28,
      ]);
      blade.rotation.x = a + 0.35;
    }
    const cone = mesh(new T.ConeGeometry(0.15, 0.35, 16), metal, [
      -2.38,
      -1,
      side * 3.15,
    ]);
    cone.rotation.z = Math.PI / 2;
    mesh(new T.BoxGeometry(1.2, 0.65, 0.17), white, [
      -0.65,
      -0.48,
      side * 3.15,
    ]);
    for (let i = 0; i < 30; i++) {
      const x = -5.7 + i * 0.34;
      const win = mesh(new T.SphereGeometry(0.087, 6, 6), dark, [
        x,
        0.4,
        side * 0.913,
      ]);
      win.scale.set(0.65, 1, 0.15);
    }
    for (const x of [-6.35, 4.6]) {
      const door = mesh(new T.BoxGeometry(0.32, 0.62, 0.025), metal, [
        x,
        0.2,
        side * 0.97,
      ]);
      mesh(new T.BoxGeometry(0.28, 0.57, 0.03), white, [x, 0.2, side * 0.99]);
    }
    const cockpit = mesh(new T.SphereGeometry(0.35, 8, 6), dark, [
      -7.65,
      0.42,
      side * 0.53,
    ]);
    cockpit.scale.set(1, 0.52, 0.55);
    cockpit.rotation.y = side * 0.4;
    mesh(new T.CylinderGeometry(0.06, 0.06, 0.85, 8), metal, [
      1.35,
      -1.3,
      side * 1.4,
    ]);
    const wheel = mesh(new T.CylinderGeometry(0.25, 0.25, 0.32, 12), dark, [
      1.35,
      -1.8,
      side * 1.4,
    ]);
    wheel.rotation.x = Math.PI / 2;
  }
  const tail = new T.Shape([
    new T.Vector2(5.05, 0.55),
    new T.Vector2(7.1, 3.65),
    new T.Vector2(8.45, 3.65),
    new T.Vector2(8.1, 0.25),
  ]);
  mesh(
    new T.ExtrudeGeometry(tail, { depth: 0.13, bevelEnabled: false }),
    green,
    [0, 0, -0.065],
  );
  mesh(new T.CylinderGeometry(0.05, 0.05, 0.7, 8), metal, [-6.2, -1.12, 0]);
  const noseWheel = mesh(
    new T.CylinderGeometry(0.19, 0.19, 0.22, 12),
    dark,
    [-6.2, -1.55, 0],
  );
  noseWheel.rotation.x = Math.PI / 2;
  const tailpipe = mesh(
    new T.CylinderGeometry(0.09, 0.09, 0.18, 12),
    dark,
    [9, 0.03, 0],
  );
  tailpipe.rotation.z = Math.PI / 2;
  let active = null,
    dirty = true,
    transition = true,
    disposed = false,
    visible = true,
    last = 0;
  const goalTarget = new T.Vector3(),
    goalCamera = new T.Vector3();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const markers = ZONES.map((zone) => {
    const button = document.createElement("button");
    button.className = "aircraft-hotspot";
    button.textContent = zone.name;
    button.setAttribute("aria-label", `Explorer : ${zone.name}`);
    button.addEventListener("click", () => onSelect(zone.id));
    host.append(button);
    return { zone, button };
  });
  function focus(id) {
    active = id;
    const zone = ZONES.find((z) => z.id === id);
    const aspect = Math.max(1, 1.35 / camera.aspect);
    if (zone) {
      goalTarget.set(...zone.position);
      goalCamera
        .copy(goalTarget)
        .add(new T.Vector3(-5, 3.4, 6).multiplyScalar(aspect));
    } else {
      goalTarget.set(0, 0, 0);
      goalCamera.set(-16, 12, 21).multiplyScalar(aspect);
    }
    transition = true;
    dirty = true;
    markers.forEach(({ zone, button }) =>
      button.setAttribute("aria-pressed", String(zone.id === id)),
    );
  }
  const resize = () => {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    focus(active);
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  controls.addEventListener("start", () => {
    transition = false;
  });
  controls.addEventListener("change", () => {
    dirty = true;
  });
  const observer = new IntersectionObserver((es) => {
    visible = es[0].isIntersecting;
    dirty = true;
  });
  observer.observe(host);
  resize();
  camera.position.copy(goalCamera);
  controls.target.copy(goalTarget);
  controls.update();
  let frame;
  function animate(t) {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    if (!visible || document.hidden || t - last < (renderer.software ? 60 : 16))
      return;
    last = t;
    if (transition) {
      camera.position.lerp(goalCamera, reduced ? 1 : 0.14);
      controls.target.lerp(goalTarget, reduced ? 1 : 0.14);
      dirty = true;
      if (camera.position.distanceTo(goalCamera) < 0.015) {
        camera.position.copy(goalCamera);
        controls.target.copy(goalTarget);
        transition = false;
      }
    }
    controls.update();
    if (dirty) {
      renderer.render(scene, camera);
      for (const { zone, button } of markers) {
        const p = new T.Vector3(...zone.position).project(camera);
        button.style.left = `${(p.x * 0.5 + 0.5) * 100}%`;
        button.style.top = `${(-p.y * 0.5 + 0.5) * 100}%`;
        button.style.visibility =
          Math.abs(p.x) > 1 || Math.abs(p.y) > 1 || p.z > 1
            ? "hidden"
            : "visible";
      }
      dirty = false;
    }
  }
  frame = requestAnimationFrame(animate);
  return {
    focus,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      observer.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose();
      });
      [white, green, dark, metal].forEach((m) => m.dispose());
      renderer.dispose?.();
      renderer.domElement.remove();
      markers.forEach((m) => m.button.remove());
    },
  };
}

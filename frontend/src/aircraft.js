import * as T from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DepthRenderer } from "./depth-renderer";
import { buildAircraftModel } from "./aircraft-model";

export const ZONES = [
  { id: "engine", name: "Moteur", position: [-2.5, -1.04, 2.78] },
  { id: "apu", name: "APU", position: [9.2, 0.46, 0] },
  { id: "brakes", name: "Freins", position: [1.22, -1.7, 1.3] },
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
    renderer = new DepthRenderer();
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
  let environment;
  if (!renderer.software) {
    const pmrem = new T.PMREMGenerator(renderer),
      room = new RoomEnvironment();
    environment = pmrem.fromScene(room, 0.04);
    scene.environment = environment.texture;
    room.dispose();
    pmrem.dispose();
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    const fill = new T.DirectionalLight(0xc9dded, 1.6);
    fill.position.set(3, 5, -12);
    scene.add(fill);
    const rim = new T.DirectionalLight(0xffffff, 2);
    rim.position.set(8, 8, 4);
    scene.add(rim);
  }
  const model = buildAircraftModel(scene, {
    detail: renderer.software ? 0 : 1,
  });
  let active = null,
    dirty = true,
    transition = true,
    disposed = false,
    visible = true,
    last = 0;
  let focusDone = null;
  const goalTarget = new T.Vector3(),
    goalCamera = new T.Vector3();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ns = "http://www.w3.org/2000/svg";
  const leaders = document.createElementNS(ns, "svg");
  leaders.classList.add("aircraft-leaders");
  leaders.setAttribute("aria-hidden", "true");
  host.append(leaders);
  const markers = ZONES.map((zone) => {
    const button = document.createElement("button");
    button.className = "aircraft-hotspot";
    button.textContent = zone.name;
    button.setAttribute("aria-label", `Explorer : ${zone.name}`);
    button.addEventListener("click", () => onSelect(zone.id));
    host.append(button);
    const line = document.createElementNS(ns, "path");
    const dot = document.createElementNS(ns, "circle");
    dot.setAttribute("r", "3");
    leaders.append(line, dot);
    return { zone, button, line, dot };
  });
  function focus(id) {
    focusDone?.(false);
    focusDone = null;
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
      goalCamera.set(-15.5, 8.2, 23).multiplyScalar(aspect);
    }
    transition = true;
    dirty = true;
    markers.forEach(({ zone, button }) =>
      button.setAttribute("aria-pressed", String(zone.id === id)),
    );
    return new Promise((resolve) => {
      focusDone = resolve;
    });
  }
  let down = null;
  const pointerDown = (e) => {
    down = [e.clientX, e.clientY];
  };
  const pointerUp = (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5)
      return;
    const rect = renderer.domElement.getBoundingClientRect();
    const ray = new T.Raycaster();
    ray.setFromCamera(
      new T.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        1 - ((e.clientY - rect.top) / rect.height) * 2,
      ),
      camera,
    );
    const hit = ray.intersectObject(model.root, true)[0];
    if (hit) {
      const nearest = ZONES.map((z) => ({
        z,
        d: new T.Vector3(...z.position).distanceTo(hit.point),
      })).sort((a, b) => a.d - b.d)[0];
      if (nearest.d < 2.1) onSelect(nearest.z.id);
    }
    down = null;
  };
  renderer.domElement.addEventListener("pointerdown", pointerDown);
  renderer.domElement.addEventListener("pointerup", pointerUp);
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
    focusDone?.(false);
    focusDone = null;
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
    const blend = reduced ? 1 : 1 - Math.exp(-Math.min(120, t - last) / 125);
    last = t;
    if (transition) {
      camera.position.lerp(goalCamera, blend);
      controls.target.lerp(goalTarget, blend);
      dirty = true;
      if (camera.position.distanceTo(goalCamera) < 0.015) {
        camera.position.copy(goalCamera);
        controls.target.copy(goalTarget);
        transition = false;
        focusDone?.(true);
        focusDone = null;
      }
    }
    controls.update();
    if (dirty) {
      renderer.render(scene, camera);
      const w = host.clientWidth,
        h = host.clientHeight;
      leaders.setAttribute("viewBox", `0 0 ${w} ${h}`);
      const projected = markers.map((m) => {
        const p = new T.Vector3(...m.zone.position).project(camera);
        return {
          ...m,
          x: (p.x * 0.5 + 0.5) * w,
          y: (-p.y * 0.5 + 0.5) * h,
          show:
            Math.abs(p.x) <= 1 &&
            Math.abs(p.y) <= 1 &&
            p.z <= 1 &&
            (!active || active === m.zone.id),
        };
      });
      // Labels occupy two gutters; their projected anchors stay on the actual geometry.
      const ordered = projected.filter((m) => m.show).sort((a, b) => a.x - b.x);
      const split = active
        ? ordered[0]?.x < w / 2
          ? 1
          : 0
        : Math.ceil(ordered.length / 2);
      for (const [side, group] of [
        [-1, ordered.slice(0, split)],
        [1, ordered.slice(split)],
      ]) {
        group.sort((a, b) => a.y - b.y);
        group.forEach((m, i) => {
          const half = m.button.offsetWidth / 2;
          const bx = side < 0 ? half + 15 : w - half - 15;
          const by = active
            ? Math.max(90, Math.min(h - 70, m.y))
            : h * (0.27 + i * 0.23);
          m.button.style.left = `${bx}px`;
          m.button.style.top = `${by}px`;
          const edge = bx - side * half;
          m.line.setAttribute(
            "d",
            `M${m.x},${m.y} L${edge - side * 16},${by} L${edge},${by}`,
          );
          m.dot.setAttribute("cx", m.x);
          m.dot.setAttribute("cy", m.y);
        });
      }
      for (const m of projected) {
        m.button.style.visibility = m.show ? "visible" : "hidden";
        m.line.style.display = m.dot.style.display = m.show ? "" : "none";
        m.line.classList.toggle("active", m.zone.id === active);
      }
      dirty = false;
    }
  }
  frame = requestAnimationFrame(animate);
  return {
    focus,
    dispose() {
      disposed = true;
      focusDone?.(false);
      focusDone = null;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      model.dispose();
      environment?.dispose();
      leaders.remove();
      renderer.dispose?.();
      renderer.domElement.remove();
      markers.forEach((m) => m.button.remove());
    },
  };
}

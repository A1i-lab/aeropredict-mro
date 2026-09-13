import * as T from "three";

export const flightProgress = (elapsed, duration = 1600) => {
  const t = Math.max(0, Math.min(1, elapsed / duration));
  return { t, eased: 1 - (1 - t) ** 3 };
};

// One timeline, driven by the existing scene RAF. The original live WebGL/CPU
// canvas travels across the layout while camera position and target interpolate.
// Destination parts are already exploded before their overlapping reveal.
export function createAircraftCamera({
  host,
  renderer,
  camera,
  controls,
  zones,
}) {
  let flight = null,
    lastZone = "engine";
  let overviewEye = camera.position.clone(),
    overviewTarget = controls.target.clone();
  function finish() {
    if (!flight) return;
    const f = flight;
    flight = null;
    host.append(renderer.domElement);
    f.overlay.remove();
    if (f.destination) {
      f.destination.style.opacity = "";
      f.destination.style.transform = "";
    }
    controls.enabled = true;
    document.documentElement.removeAttribute("data-flight-state");
    const main = document.getElementById("main");
    if (main) main.inert = false;
    camera.position.copy(overviewEye);
    controls.target.copy(overviewTarget);
    const w = host.clientWidth,
      h = host.clientHeight;
    if (w && h) {
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    controls.update();
    f.resolve();
  }
  async function start(id, swap, returning = false) {
    if (flight) return false;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      await swap();
      return true;
    }
    lastZone = id || lastZone;
    const zone = zones.find((z) => z.id === lastZone) || zones[0];
    const source = returning
      ? [...document.querySelectorAll(".engine-canvas,.equipment-canvas")].find(
          (e) => e.getClientRects().length,
        )
      : host;
    const from = source?.getBoundingClientRect();
    if (!from?.width || !from.height) {
      await swap();
      return true;
    }
    if (!returning) {
      overviewEye.copy(camera.position);
      overviewTarget.copy(controls.target);
    }
    const target = new T.Vector3(...zone.position);
    const close = target
      .clone()
      .add(
        new T.Vector3(-2.4, 1.25, 3.1).multiplyScalar(
          Math.max(1, 1.3 / camera.aspect),
        ),
      );
    const fromEye = returning ? close : camera.position.clone();
    const fromTarget = returning ? target : controls.target.clone();
    const toEye = returning ? overviewEye.clone() : close;
    const toTarget = returning ? overviewTarget.clone() : target;
    const overlay = document.createElement("div");
    overlay.className = "aircraft-flight-layer";
    overlay.setAttribute("aria-hidden", "true");
    Object.assign(overlay.style, {
      left: from.left + "px",
      top: from.top + "px",
      width: from.width + "px",
      height: from.height + "px",
    });
    overlay.append(renderer.domElement);
    let ghost;
    if (returning) {
      const previous = source.querySelector("canvas");
      if (previous) {
        ghost = document.createElement("canvas");
        ghost.width = previous.width;
        ghost.height = previous.height;
        ghost.getContext("2d").drawImage(previous, 0, 0);
        Object.assign(ghost.style, {
          position: "absolute",
          inset: "0",
          width: "100%",
          height: "100%",
        });
        overlay.append(ghost);
      }
    }
    document.body.append(overlay);
    controls.enabled = false;
    document.documentElement.dataset.flightState = returning
      ? "returning"
      : "focusing";
    let resolve;
    const done = new Promise((r) => {
      resolve = r;
    });
    const current = {
      overlay,
      ghost,
      resolve,
      from,
      fromEye,
      fromTarget,
      toEye,
      toTarget,
      returning,
      start: null,
      destination: null,
      to: from,
    };
    flight = current;
    try {
      await swap();
      if (flight !== current) return false;
      const destination = returning
        ? host
        : [
            ...document.querySelectorAll(".engine-canvas,.equipment-canvas"),
          ].find((e) => e.getClientRects().length);
      current.destination = destination;
      current.to = destination?.getBoundingClientRect() || from;
      if (destination) destination.style.opacity = "0";
      const main = document.getElementById("main");
      if (main) main.inert = true;
      // Start after the synchronous destination geometry preparation, without
      // a preliminary flight or a second camera animation at arrival.
      current.start = performance.now();
      await done;
      return true;
    } catch (error) {
      finish();
      throw error;
    }
  }
  function tick(now) {
    if (!flight || flight.start === null) return false;
    const f = flight,
      { t, eased } = flightProgress(now - f.start);
    camera.position.lerpVectors(f.fromEye, f.toEye, eased);
    controls.target.lerpVectors(f.fromTarget, f.toTarget, eased);
    const rect = {};
    for (const k of ["left", "top", "width", "height"])
      rect[k] = T.MathUtils.lerp(f.from[k], f.to[k], eased);
    Object.assign(f.overlay.style, {
      left: rect.left + "px",
      top: rect.top + "px",
      width: rect.width + "px",
      height: rect.height + "px",
    });
    renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height));
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    const reveal = T.MathUtils.smoothstep(t, 0.28, 0.9);
    if (f.ghost)
      f.ghost.style.opacity = String(1 - T.MathUtils.smoothstep(t, 0.05, 0.48));
    if (f.destination) {
      f.destination.style.opacity = String(f.returning ? 0 : reveal);
      if (!f.returning)
        f.destination.style.transform = `scale(${0.86 + 0.14 * eased})`;
    }
    f.overlay.style.opacity = String(f.returning ? 1 : 1 - reveal);
    if (t === 1) finish();
    return true;
  }
  return {
    start,
    tick,
    cancel: finish,
    get busy() {
      return !!flight;
    },
    get lastZone() {
      return lastZone;
    },
  };
}

import * as T from "three";
// Fit actual sampled surfaces, rather than the empty corners of a wing-sized box.
export function frameAircraft(root, aspect) {
  root.updateMatrixWorld(true);
  const points = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const a = o.geometry.attributes.position;
    for (let i = 0; i < a.count; i += Math.max(1, Math.floor(a.count / 180)))
      points.push(
        new T.Vector3().fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld),
      );
  });
  const target = new T.Box3().setFromObject(root).getCenter(new T.Vector3());
  const direction = new T.Vector3(-0.57, 0.28, 0.77).normalize();
  const camera = new T.PerspectiveCamera(38, aspect, 0.1, 150);
  function bounds(distance) {
    camera.position.copy(target).addScaledVector(direction, distance);
    camera.lookAt(target);
    camera.updateMatrixWorld(true);
    const ps = points.map((p) => p.clone().project(camera));
    return {
      x: Math.max(...ps.map((p) => p.x)) - Math.min(...ps.map((p) => p.x)),
      y: Math.max(...ps.map((p) => p.y)) - Math.min(...ps.map((p) => p.y)),
      ps,
    };
  }
  let low = 12,
    high = 75;
  for (let i = 0; i < 16; i++) {
    const d = (low + high) / 2,
      b = bounds(d);
    if (b.x > 1.52 || b.y > 1.32) low = d;
    else high = d;
  }
  const b = bounds(high);
  const cx =
    (Math.max(...b.ps.map((p) => p.x)) + Math.min(...b.ps.map((p) => p.x))) / 2;
  const cy =
    (Math.max(...b.ps.map((p) => p.y)) + Math.min(...b.ps.map((p) => p.y))) / 2;
  const halfHeight = high * Math.tan((19 * Math.PI) / 180);
  const right = new T.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const up = new T.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  target
    .addScaledVector(right, cx * halfHeight * aspect)
    .addScaledVector(up, cy * halfHeight);
  return { target, eye: target.clone().addScaledVector(direction, high) };
}

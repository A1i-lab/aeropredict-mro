import * as T from "three";
import { SoftwareRenderer } from "./software-renderer.js";

// CPU depth buffer for the airframe: small flush details need per-pixel occlusion.
// The existing engine renderer keeps its original rendering path.
export class DepthRenderer extends SoftwareRenderer {
  render(scene, camera) {
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const width = this.domElement.width,
      height = this.domElement.height;
    const buffer = this.context.createImageData(width, height),
      pixels = buffer.data;
    const depth = new Float32Array(width * height);
    depth.fill(Infinity);
    const vp = new T.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    const normalMatrix = new T.Matrix3(),
      mvp = new T.Matrix4(),
      v = new T.Vector3(),
      normal = new T.Vector3();
    const light = new T.Vector3(-0.5, 0.8, 0.75).normalize(),
      view = new T.Vector3();
    camera.getWorldDirection(view);
    const linearToByte = (x) =>
      Math.round(255 * Math.pow(Math.min(1, Math.max(0, x)), 1 / 2.2));
    scene.traverseVisible((obj) => {
      if (!obj.isMesh) return;
      const geo = obj.geometry,
        p = geo.attributes.position,
        n = geo.attributes.normal,
        idx = geo.index,
        mat = obj.material;
      if (!p || !mat.color) return;
      normalMatrix.getNormalMatrix(obj.matrixWorld);
      mvp.multiplyMatrices(vp, obj.matrixWorld);
      const vertices = [];
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(mvp);
        normal.fromBufferAttribute(n, i).applyMatrix3(normalMatrix).normalize();
        if (normal.dot(view) > 0) normal.negate();
        const intensity =
          0.38 +
          0.54 * Math.max(0, normal.dot(light)) +
          0.12 * Math.pow(Math.abs(normal.dot(view)), 8);
        vertices.push([
          (v.x * 0.5 + 0.5) * width,
          (-v.y * 0.5 + 0.5) * height,
          v.z,
          linearToByte(mat.color.r * intensity),
          linearToByte(mat.color.g * intensity),
          linearToByte(mat.color.b * intensity),
        ]);
      }
      for (let i = 0; i < (idx?.count ?? p.count); i += 3) {
        const a = vertices[idx ? idx.getX(i) : i],
          b = vertices[idx ? idx.getX(i + 1) : i + 1],
          c = vertices[idx ? idx.getX(i + 2) : i + 2];
        if (
          a[2] > 1 ||
          b[2] > 1 ||
          c[2] > 1 ||
          a[2] < -1 ||
          b[2] < -1 ||
          c[2] < -1
        )
          continue;
        const denominator =
          (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
        if (Math.abs(denominator) < 0.02) continue;
        const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))),
          x1 = Math.min(width - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
        const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))),
          y1 = Math.min(height - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
        for (let y = y0; y <= y1; y++)
          for (let x = x0; x <= x1; x++) {
            const u =
              ((b[1] - c[1]) * (x + 0.5 - c[0]) +
                (c[0] - b[0]) * (y + 0.5 - c[1])) /
              denominator;
            const w =
              ((c[1] - a[1]) * (x + 0.5 - c[0]) +
                (a[0] - c[0]) * (y + 0.5 - c[1])) /
              denominator;
            const t = 1 - u - w;
            if (u < 0 || w < 0 || t < 0) continue;
            const z = u * a[2] + w * b[2] + t * c[2],
              j = y * width + x;
            if (z >= depth[j]) continue;
            depth[j] = z;
            const q = j * 4;
            pixels[q] = u * a[3] + w * b[3] + t * c[3];
            pixels[q + 1] = u * a[4] + w * b[4] + t * c[4];
            pixels[q + 2] = u * a[5] + w * b[5] + t * c[5];
            pixels[q + 3] = 255;
          }
      }
    });
    this.context.putImageData(buffer, 0, 0);
  }
}

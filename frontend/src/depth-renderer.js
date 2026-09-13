import * as T from "three";
import { SoftwareRenderer } from "./software-renderer.js";

// CPU depth buffer for the airframe: small flush details need per-pixel occlusion.
// The existing engine renderer keeps its original rendering path.
export class DepthRenderer extends SoftwareRenderer {
  textureCache = new WeakMap();
  texturePixels(texture) {
    if (!texture?.image) return null;
    if (!this.textureCache.has(texture)) {
      const source = texture.image;
      const canvas = document.createElement("canvas");
      canvas.width = source.width;
      canvas.height = source.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(source, 0, 0);
      this.textureCache.set(
        texture,
        ctx.getImageData(0, 0, canvas.width, canvas.height),
      );
    }
    return this.textureCache.get(texture);
  }

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
      const uv = geo.attributes.uv,
        tex = this.texturePixels(mat.map);
      if (!p || !mat.color) return;
      normalMatrix.getNormalMatrix(obj.matrixWorld);
      mvp.multiplyMatrices(vp, obj.matrixWorld);
      const vertices = [];
      const clip = new T.Vector4();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(mvp);
        normal.fromBufferAttribute(n, i).applyMatrix3(normalMatrix).normalize();
        if (normal.dot(view) > 0) normal.negate();
        const intensity =
          0.23 +
          0.65 * Math.max(0, normal.dot(light)) +
          0.16 * Math.pow(Math.abs(normal.dot(view)), 16);
        clip.set(p.getX(i), p.getY(i), p.getZ(i), 1).applyMatrix4(mvp);
        const inverseW = 1 / clip.w;
        let color = mat.color;
        // Match the GPU demonstrator material, including the navy tail.
        if (
          mat.userData.demonstratorPaint &&
          p.getY(i) > 2 &&
          p.getX(i) > 9 &&
          Math.abs(p.getZ(i)) < 0.8
        )
          color = new T.Color(0.018, 0.044, 0.09);
        vertices.push([
          (v.x * 0.5 + 0.5) * width,
          (-v.y * 0.5 + 0.5) * height,
          v.z,
          linearToByte(color.r * intensity),
          linearToByte(color.g * intensity),
          linearToByte(color.b * intensity),
          (uv?.getX(i) ?? 0) * inverseW,
          (uv?.getY(i) ?? 0) * inverseW,
          inverseW,
          intensity,
          color !== mat.color ? 1 : 0,
          p.getX(i) * inverseW,
          p.getY(i) * inverseW,
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
            if (tex && !(a[10] && b[10] && c[10])) {
              const iw = u * a[8] + w * b[8] + t * c[8];
              const tx = (u * a[6] + w * b[6] + t * c[6]) / iw;
              const ty = (u * a[7] + w * b[7] + t * c[7]) / iw;
              const ti =
                (Math.min(
                  tex.height - 1,
                  Math.floor((((ty % 1) + 1) % 1) * tex.height),
                ) *
                  tex.width +
                  Math.min(
                    tex.width - 1,
                    Math.floor((((tx % 1) + 1) % 1) * tex.width),
                  )) *
                4;
              let red = (tex.data[ti] / 255) ** 2.2,
                green = (tex.data[ti + 1] / 255) ** 2.2,
                blue = (tex.data[ti + 2] / 255) ** 2.2;
              const hi = Math.max(red, green, blue),
                lo = Math.min(red, green, blue);
              if (
                mat.userData.demonstratorPaint &&
                hi - lo > 0.035 &&
                hi > 0.06
              ) {
                red = 0.79 * (0.88 + 0.12 * hi);
                green = 0.82 * (0.88 + 0.12 * hi);
                blue = 0.84 * (0.88 + 0.12 * hi);
              }
              const px = (u * a[11] + w * b[11] + t * c[11]) / iw,
                py = (u * a[12] + w * b[12] + t * c[12]) / iw;
              if (
                mat.userData.demonstratorPaint &&
                (px < -17.8 || (px > -10 && px < 0 && py < -0.1))
              ) {
                red = 0.79;
                green = 0.82;
                blue = 0.84;
              }
              const intensity = u * a[9] + w * b[9] + t * c[9];
              pixels[q] = linearToByte(red * mat.color.r * intensity);
              pixels[q + 1] = linearToByte(green * mat.color.g * intensity);
              pixels[q + 2] = linearToByte(blue * mat.color.b * intensity);
            }
            pixels[q + 3] = 255;
          }
      }
    });
    this.context.putImageData(buffer, 0, 0);
  }
}

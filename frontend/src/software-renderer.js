import * as THREE from "three";

// Canvas 2D projection of the same 3D geometry when WebGL is unavailable.
// This changes rendering only, never browser settings or data semantics.
export class SoftwareRenderer {
  constructor() {
    this.domElement = document.createElement("canvas");
    this.context = this.domElement.getContext("2d");
    if (!this.context) throw new Error("Canvas unavailable");
    this.ratio = 1;
    this.width = 600;
    this.height = 400;
    this.software = true;
  }
  setPixelRatio(r) {
    this.ratio = Math.min(r, 1.3);
  }
  setClearColor() {}
  setSize(w, h) {
    this.width = w;
    this.height = h;
    this.domElement.width = Math.round(w * this.ratio);
    this.domElement.height = Math.round(h * this.ratio);
    this.domElement.style.width = w + "px";
    this.domElement.style.height = h + "px";
  }
  render(scene, camera) {
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const ctx = this.context,
      w = this.width,
      h = this.height;
    ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const shadow = ctx.createRadialGradient(
      w * 0.5,
      h * 0.7,
      0,
      w * 0.5,
      h * 0.7,
      w * 0.4,
    );
    shadow.addColorStop(0, "rgba(53,67,78,.10)");
    shadow.addColorStop(1, "rgba(53,67,78,0)");
    ctx.save();
    ctx.translate(0, h * 0.56);
    ctx.scale(1, 0.22);
    ctx.fillStyle = shadow;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    const vp = new THREE.Matrix4().multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      ),
      world = new THREE.Matrix4(),
      instance = new THREE.Matrix4(),
      mvp = new THREE.Matrix4(),
      normalMatrix = new THREE.Matrix3();
    const light = new THREE.Vector3(-0.5, 0.8, 0.75).normalize();
    const viewDirection = new THREE.Vector3();
    camera.getWorldDirection(viewDirection);
    const normal = new THREE.Vector3(),
      a = new THREE.Vector3(),
      b = new THREE.Vector3(),
      c = new THREE.Vector3(),
      ab = new THREE.Vector3(),
      ac = new THREE.Vector3(),
      vertex = new THREE.Vector3(),
      base = new THREE.Color();
    const triangles = [];
    scene.traverseVisible((obj) => {
      if (!obj.isMesh) return;
      const geo = obj.geometry,
        pos = geo.attributes.position,
        index = geo.index;
      if (!pos) return;
      const count = obj.isInstancedMesh ? obj.count : 1;
      for (let inst = 0; inst < count; inst++) {
        world.copy(obj.matrixWorld);
        if (obj.isInstancedMesh) {
          obj.getMatrixAt(inst, instance);
          world.multiply(instance);
        }
        mvp.multiplyMatrices(vp, world);
        normalMatrix.getNormalMatrix(world);
        const points = new Array(pos.count);
        for (let i = 0; i < pos.count; i++) {
          vertex.fromBufferAttribute(pos, i).applyMatrix4(mvp);
          points[i] = [
            (vertex.x * 0.5 + 0.5) * w,
            (-vertex.y * 0.5 + 0.5) * h,
            vertex.z,
          ];
        }
        const n = index ? index.count : pos.count;
        for (let i = 0; i < n; i += 3) {
          const ia = index ? index.getX(i) : i,
            ib = index ? index.getX(i + 1) : i + 1,
            ic = index ? index.getX(i + 2) : i + 2;
          const pa = points[ia],
            pb = points[ib],
            pc = points[ic];
          if (!pa || !pb || !pc || pa[2] > 1 || pb[2] > 1 || pc[2] > 1)
            continue;
          const signed =
            (pb[0] - pa[0]) * (pc[1] - pa[1]) -
            (pb[1] - pa[1]) * (pc[0] - pa[0]);
          if (Math.abs(signed) < 0.13) continue;
          a.fromBufferAttribute(pos, ia);
          b.fromBufferAttribute(pos, ib);
          c.fromBufferAttribute(pos, ic);
          ab.subVectors(b, a);
          ac.subVectors(c, a);
          normal.crossVectors(ab, ac).applyMatrix3(normalMatrix).normalize();
          if (normal.dot(viewDirection) > 0) normal.negate();
          const intensity =
            0.38 +
            0.54 * Math.max(0, normal.dot(light)) +
            0.12 * Math.pow(Math.abs(normal.dot(viewDirection)), 8);
          base.copy(obj.material.color);
          const emissive = obj.material.emissive;
          const ei = obj.material.emissiveIntensity || 0;
          const rr = Math.round(
              255 *
                Math.min(
                  1,
                  Math.pow(
                    Math.max(0, base.r * intensity + (emissive?.r || 0) * ei),
                    0.4545,
                  ),
                ),
            ),
            gg = Math.round(
              255 *
                Math.min(
                  1,
                  Math.pow(
                    Math.max(0, base.g * intensity + (emissive?.g || 0) * ei),
                    0.4545,
                  ),
                ),
            ),
            bb = Math.round(
              255 *
                Math.min(
                  1,
                  Math.pow(
                    Math.max(0, base.b * intensity + (emissive?.b || 0) * ei),
                    0.4545,
                  ),
                ),
            );
          triangles.push([
            pa,
            pb,
            pc,
            (pa[2] + pb[2] + pc[2]) / 3,
            `rgb(${rr},${gg},${bb})`,
          ]);
        }
      }
    });
    triangles.sort((a, b) => b[3] - a[3]);
    for (const [a, b, c, , color] of triangles) {
      if (
        (a[0] < 0 && b[0] < 0 && c[0] < 0) ||
        (a[0] > w && b[0] > w && c[0] > w)
      )
        continue;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(c[0], c[1]);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }
    scene.traverseVisible((obj) => {
      if (!obj.isPoints) return;
      const attr = obj.geometry.attributes.position;
      mvp.multiplyMatrices(vp, obj.matrixWorld);
      ctx.fillStyle = "#528fd1";
      for (let i = 0; i < attr.count; i++) {
        vertex.fromBufferAttribute(attr, i).applyMatrix4(mvp);
        ctx.beginPath();
        ctx.arc(
          (vertex.x * 0.5 + 0.5) * w,
          (-vertex.y * 0.5 + 0.5) * h,
          1.6,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    });
  }
  dispose() {
    this.domElement.width = 0;
    this.domElement.height = 0;
  }
}

import * as THREE from "three";
import { SoftwareRenderer } from "./software-renderer";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// Original procedural teaching model. Not a CAD replica or a fault localisation.
export function createEngine(host, onSelect, onReady) {
  const scene = new THREE.Scene();
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
  } catch {
    renderer = new SoftwareRenderer();
  }
  const soft = renderer.software === true;
  let dirty = true;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.setClearColor(0xf3f5f7, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute(
    "aria-label",
    "Maquette 3D de turboréacteur, rotation par glissement. Les composants sont aussi accessibles par les boutons.",
  );
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(-6.7, 3.4, 8.0);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 7;
  controls.maxDistance = 22;
  controls.maxPolarAngle = Math.PI * 0.8;
  controls.target.set(0, 0, 0);
  let env;
  if (!soft) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    env = pmrem.fromScene(room, 0.04);
    scene.environment = env.texture;
    room.dispose();
    pmrem.dispose();
  }
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa0aabe, 2.5));
  const light = new THREE.DirectionalLight(0xffffff, 4);
  light.position.set(-3, 8, 6);
  scene.add(light);
  const rim = new THREE.DirectionalLight(0xa6cfff, 2);
  rim.position.set(4, 2, -5);
  scene.add(rim);
  const assembly = new THREE.Group();
  scene.add(assembly);
  const materials = [];
  function mat(color, metalness = 0.82, roughness = 0.32) {
    const m = new THREE.MeshStandardMaterial({
      color,
      metalness,
      roughness,
      side: THREE.DoubleSide,
    });
    materials.push(m);
    return m;
  }
  const silver = mat(0xafbdc9),
    dark = mat(0x344453),
    edge = mat(0xd9e1e7, 0.9, 0.2),
    hot = mat(0x8c7160, 0.8, 0.4),
    black = mat(0x25303b),
    blue = mat(0x5b889e);
  const sections = ["fan", "compressor", "combustor", "turbine", "exhaust"].map(
    (id, i) => {
      let g = new THREE.Group();
      g.userData.id = id;
      g.userData.offset = (i - 2) * 0.82;
      assembly.add(g);
      return g;
    },
  );
  const rotors = [],
    shells = [],
    all = [];
  function mesh(g, geo, m, x = 0) {
    const o = new THREE.Mesh(geo, m.clone());
    materials.push(o.material);
    o.position.x = x;
    o.userData.id = g.userData.id;
    g.add(o);
    all.push(o);
    return o;
  }
  function cylinder(
    g,
    r1,
    r2,
    length,
    x,
    m,
    open = false,
    start = 0,
    angle = Math.PI * 2,
  ) {
    const o = mesh(
      g,
      new THREE.CylinderGeometry(
        r1,
        r2,
        length,
        soft ? 24 : 64,
        1,
        open,
        start,
        angle,
      ),
      m,
      x,
    );
    o.rotation.z = Math.PI / 2;
    return o;
  }
  function ring(g, r, x, m = edge, t = 0.035) {
    const o = mesh(
      g,
      new THREE.TorusGeometry(r, t, soft ? 4 : 8, soft ? 40 : 80),
      m,
      x,
    );
    o.rotation.y = Math.PI / 2;
    return o;
  }
  function bladeGeometry(inner, outer, chord, twist) {
    const points = [],
      indices = [];
    const N = soft ? 5 : 10;
    for (let j = 0; j <= N; j++) {
      let t = j / N,
        r = inner + (outer - inner) * t;
      for (let k = 0; k <= 3; k++) {
        let q = k / 3 - 0.5;
        points.push(
          q * chord + Math.sin(t * Math.PI) * 0.13,
          r,
          q * chord * twist + t * t * 0.22,
        );
      }
    }
    for (let j = 0; j < N; j++)
      for (let k = 0; k < 3; k++) {
        let a = j * 4 + k;
        indices.push(a, a + 4, a + 1, a + 1, a + 4, a + 5);
      }
    let geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }
  function rotor(g, x, r, n, chord, m) {
    let group = new THREE.Group();
    group.position.x = x;
    g.add(group);
    rotors.push(group);
    const geo = bladeGeometry(r * 0.3, r, chord, 0.7);
    const blades = new THREE.InstancedMesh(geo, m.clone(), n);
    materials.push(blades.material);
    const matrix = new THREE.Matrix4();
    for (let k = 0; k < n; k++) {
      matrix.makeRotationX((k / n) * Math.PI * 2);
      blades.setMatrixAt(k, matrix);
    }
    blades.instanceMatrix.needsUpdate = true;
    blades.userData.id = g.userData.id;
    group.add(blades);
    all.push(blades);
    cylinder(g, r * 0.32, r * 0.32, 0.23, x, dark);
    ring(g, r * 0.34, x, edge, 0.035);
    return group;
  }
  const fan = sections[0];
  rotor(fan, -2.3, 1.68, 26, 0.56, silver);
  cylinder(fan, 0.06, 0.51, 0.9, -2.92, edge);
  ring(fan, 1.8, -2.46, edge, 0.08);
  ring(fan, 1.8, -1.88, edge, 0.06);
  const sh = cylinder(
    fan,
    1.83,
    1.83,
    0.65,
    -2.15,
    silver,
    true,
    0,
    Math.PI * 1.16,
  );
  shells.push(sh);
  const comp = sections[1];
  for (let i = 0; i < 7; i++) {
    const x = -1.48 + i * 0.27,
      r = 1.12 - i * 0.065;
    rotor(comp, x, r, 32, 0.2, i % 2 ? silver : edge);
    ring(comp, r + 0.035, x, blue, 0.019);
  }
  cylinder(comp, 0.32, 0.42, 1.85, -0.62, dark);
  const cs = cylinder(
    comp,
    1.22,
    0.77,
    1.98,
    -0.65,
    silver,
    true,
    0,
    Math.PI * 1.05,
  );
  shells.push(cs);
  [-1.63, 0.38].forEach((x) => ring(comp, x < 0 ? 1.24 : 0.8, x, edge, 0.06));
  const combust = sections[2];
  cylinder(combust, 0.65, 0.7, 1.05, 1.02, hot, true, 0, Math.PI * 1.25);
  cylinder(combust, 0.39, 0.39, 1.12, 1.02, dark);
  [0.55, 0.8, 1.05, 1.3, 1.52].forEach((x) =>
    ring(combust, 0.72, x, hot, 0.025),
  );
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const tube = cylinder(combust, 0.065, 0.065, 0.7, 1.0, edge);
    tube.position.y = Math.cos(a) * 0.6;
    tube.position.z = Math.sin(a) * 0.6;
  }
  const turbine = sections[3];
  for (let i = 0; i < 4; i++) {
    rotor(
      turbine,
      1.85 + i * 0.23,
      0.72 + i * 0.075,
      34,
      0.17,
      i % 2 ? hot : silver,
    );
    ring(turbine, 0.76 + i * 0.075, 1.85 + i * 0.23, edge, 0.028);
  }
  const ts = cylinder(
    turbine,
    0.78,
    1.02,
    1.02,
    2.18,
    dark,
    true,
    0,
    Math.PI * 1.03,
  );
  shells.push(ts);
  const exhaust = sections[4];
  cylinder(exhaust, 0.43, 0.16, 0.95, 3.05, dark);
  cylinder(exhaust, 1.05, 0.69, 0.8, 3.12, silver, true, 0, Math.PI * 1.25);
  ring(exhaust, 0.7, 3.53, edge, 0.045);
  // Shaft, fasteners and visible structural struts.
  cylinder(comp, 0.12, 0.12, 4.9, 0.05, edge);
  sections.forEach((g, i) => {
    const x = [-1.88, 0.35, 1.52, 2.7, 3.53][i],
      r = [1.8, 0.8, 0.75, 1.05, 0.7][i];
    for (let j = 0; j < 16; j++) {
      let a = (j / 16) * Math.PI * 2;
      const bolt = mesh(g, new THREE.SphereGeometry(0.032, 6, 5), dark, x);
      bolt.position.y = r * Math.sin(a);
      bolt.position.z = r * Math.cos(a);
    }
  });
  for (let i = 0; i < 8; i++) {
    let a = (i / 8) * Math.PI * 2;
    const o = mesh(fan, new THREE.BoxGeometry(0.12, 0.72, 0.045), dark, -1.86);
    o.position.y = Math.cos(a) * 1.36;
    o.position.z = Math.sin(a) * 1.36;
    o.rotation.x = a;
  }
  const flowPositions = new Float32Array(150 * 3);
  for (let i = 0; i < 150; i++) {
    const a = i * 2.399;
    let r = i % 3 === 0 ? 1.35 : 0.48;
    flowPositions[i * 3] = -3.6 + ((i % 30) / 30) * 7.6;
    flowPositions[i * 3 + 1] = Math.cos(a) * r;
    flowPositions[i * 3 + 2] = Math.sin(a) * r;
  }
  const flowGeo = new THREE.BufferGeometry();
  flowGeo.setAttribute("position", new THREE.BufferAttribute(flowPositions, 3));
  const flow = new THREE.Points(
    flowGeo,
    new THREE.PointsMaterial({
      color: 0x348cf0,
      size: 0.048,
      transparent: true,
      opacity: 0.7,
    }),
  );
  flow.visible = false;
  scene.add(flow);
  let selected = null,
    explode = 0,
    targetExplode = 0,
    cut = true,
    playing = false,
    flowing = false,
    visible = true,
    disposed = false,
    last = 0;
  const observer = new ResizeObserver(() => {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (w && h) {
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.position
        .set(-6.7, 3.4, 8.0)
        .multiplyScalar(
          Math.max(1, 1.35 / camera.aspect) * (targetExplode ? 1.22 : 1),
        );
      camera.updateProjectionMatrix();
      dirty = true;
    }
  });
  observer.observe(host);
  const io = new IntersectionObserver((e) => {
    visible = e[0].isIntersecting;
  });
  io.observe(host);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let down;
  function pointerDown(e) {
    down = [e.clientX, e.clientY];
  }
  function click(e) {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6)
      return;
    let rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    let hit = raycaster
      .intersectObjects(all)
      .find((h) => h.object.visible && h.object.parent.visible);
    if (hit) onSelect(hit.object.userData.id);
  }
  renderer.domElement.addEventListener("pointerdown", pointerDown);
  renderer.domElement.addEventListener("pointerup", click);
  controls.addEventListener("change", () => {
    dirty = true;
  });
  let animation;
  function frame(now) {
    animation = requestAnimationFrame(frame);
    if (disposed || !visible || document.hidden) return;
    if (soft && now - last < 65) return;
    let dt = Math.min((now - last) / 1000, 0.08);
    last = now;
    const moving = Math.abs(targetExplode - explode) > 0.002;
    explode += (targetExplode - explode) * (soft ? 0.28 : 0.1);
    sections.forEach((g) => {
      g.position.x = g.userData.offset * explode;
    });
    if (playing)
      rotors.forEach((r, i) => (r.rotation.x += dt * (i === 0 ? 0.36 : 0.65)));
    if (flowing) {
      for (let i = 0; i < 150; i++) {
        flowPositions[i * 3] += dt * 1.25;
        if (flowPositions[i * 3] > 3.7) flowPositions[i * 3] = -3.6;
      }
      flowGeo.attributes.position.needsUpdate = true;
    }
    controls.update();
    if (dirty || playing || flowing || moving) {
      renderer.render(scene, camera);
      dirty = false;
    }
  }
  animation = requestAnimationFrame(frame);
  onReady?.(soft);
  return {
    renderNow() {
      const w = host.clientWidth,
        h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      camera.position
        .set(-6.7, 3.4, 8.0)
        .multiplyScalar(
          Math.max(1, 1.35 / camera.aspect) * (targetExplode ? 1.22 : 1),
        );
      controls.update();
      renderer.render(scene, camera);
      dirty = false;
    },
    setSelected(id) {
      dirty = true;
      selected = id;
      all.forEach((o) => {
        o.material.emissive.setHex(o.userData.id === selected ? 0x19536c : 0);
        o.material.emissiveIntensity = o.userData.id === selected ? 0.32 : 0;
      });
    },
    setExplode(v, immediate = false) {
      dirty = true;
      if (Boolean(targetExplode) !== v)
        camera.position.multiplyScalar(v ? 1.22 : 1 / 1.22);
      targetExplode = v ? 1 : 0;
      if (immediate) {
        explode = targetExplode;
        sections.forEach((g) => {
          g.position.x = g.userData.offset * explode;
        });
      }
    },
    setCut(v) {
      dirty = true;
      cut = v;
      shells.forEach((o) => (o.visible = !v));
    },
    setPlaying(v) {
      playing = v;
    },
    setFlow(v) {
      dirty = true;
      flowing = v;
      flow.visible = v;
    },
    reset() {
      camera.position
        .set(-6.7, 3.4, 8.0)
        .multiplyScalar(
          Math.max(1, 1.35 / camera.aspect) * (targetExplode ? 1.22 : 1),
        );
      controls.target.set(0, 0, 0);
      controls.update();
    },
    zoom(delta) {
      camera.position.multiplyScalar(delta);
      controls.update();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(animation);
      observer.disconnect();
      io.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointerup", click);
      const geos = new Set();
      scene.traverse((o) => {
        if (o.geometry) geos.add(o.geometry);
      });
      geos.forEach((g) => g.dispose());
      new Set(materials).forEach((m) => m.dispose());
      flow.material.dispose();
      env?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

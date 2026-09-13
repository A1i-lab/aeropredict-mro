import * as T from "three";

export const EQUIPMENT_DETAILS = {
  apu: {
    title: "Groupe auxiliaire de puissance",
    subtitle: "Turbomachine compacte",
    sensor: "Capteur de vitesse",
    signal:
      "Le temps de démarrage est dérivé de la séquence de montée en vitesse.",
    parts: [
      "Entrée et compresseur",
      "Chambre de combustion",
      "Turbine et échappement",
      "Boîtier accessoires",
    ],
    sensorPosition: [-0.75, 0.85, 0.25],
  },
  brakes: {
    title: "Ensemble roue et frein",
    subtitle: "Empilement de disques",
    sensor: "Indicateur d’usure",
    signal: "Une mesure d’usure représente ici la perte d’épaisseur cumulée.",
    parts: [
      "Jante et moyeu",
      "Disques de frein",
      "Couronne de pistons",
      "Axe et fixation",
    ],
    sensorPosition: [0.7, 0.72, 0.2],
  },
  hydraulic: {
    title: "Pompe hydraulique",
    subtitle: "Pompe, collecteur et conduites",
    sensor: "Transducteur de pression",
    signal:
      "La récupération de pression est calculée après une sollicitation simulée.",
    parts: [
      "Corps de pompe",
      "Bloc de distribution",
      "Raccords et conduites",
      "Arbre d’entraînement",
    ],
    sensorPosition: [0.45, 1.03, 0.15],
  },
  pack: {
    title: "Pack de conditionnement d’air",
    subtitle: "Échangeur et machine à cycle d’air",
    sensor: "Sonde de température",
    signal:
      "L’écart entre température mesurée et consigne alimente le scénario.",
    parts: [
      "Échangeur thermique",
      "Machine à cycle d’air",
      "Conduits d’air",
      "Vanne de régulation",
    ],
    sensorPosition: [1.05, 0.65, 0.7],
  },
  actuator: {
    title: "Actionneur linéaire",
    subtitle: "Vérin et retour de position",
    sensor: "Capteur de position",
    signal:
      "Le temps de réponse est dérivé du mouvement entre deux positions commandées.",
    parts: [
      "Corps du vérin",
      "Tige chromée",
      "Chapes de fixation",
      "Retour de position",
    ],
    sensorPosition: [-0.5, 0.61, 0.24],
  },
};

// Mechanical teaching assemblies with recognizable construction, not OEM CAD.
export function buildEquipmentModel(scene, id) {
  const meta = EQUIPMENT_DETAILS[id];
  if (!meta) throw new Error("Unknown equipment");
  const root = new T.Group();
  scene.add(root);
  const mats = [];
  const mat = (color, metalness = 0.7, roughness = 0.3) => {
    const m = new T.MeshStandardMaterial({
      color,
      metalness,
      roughness,
      side: T.DoubleSide,
    });
    mats.push(m);
    return m;
  };
  const silver = mat(0xb6c2c9),
    edge = mat(0xe0e6e8),
    dark = mat(0x3d505e),
    hot = mat(0x927a64),
    black = mat(0x263039, 0.1, 0.75),
    blue = mat(0x648f9d),
    green = mat(0x497362),
    sensorMat = mat(0x3b797c);
  const groups = meta.parts.map((name, i) => {
    const g = new T.Group();
    g.name = name;
    g.userData.offset = (i - 1.5) * 0.43;
    root.add(g);
    return g;
  });
  function add(g, geo, m, p = [0, 0, 0]) {
    const o = new T.Mesh(geo, m);
    o.position.set(...p);
    g.add(o);
    return o;
  }
  const box = (g, size, m, p) => add(g, new T.BoxGeometry(...size), m, p);
  const cylinder = (g, r, len, m, p = [0, 0, 0], r2 = r) => {
    const o = add(g, new T.CylinderGeometry(r2, r, len, 40, 1, false), m, p);
    o.rotation.z = Math.PI / 2;
    return o;
  };
  const ring = (g, r, t, m, p) => {
    const o = add(g, new T.TorusGeometry(r, t, 10, 48), m, p);
    o.rotation.y = Math.PI / 2;
    return o;
  };
  const tube = (g, points, r, m) =>
    add(
      g,
      new T.TubeGeometry(
        new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
        28,
        r,
        8,
        false,
      ),
      m,
    );
  function bolts(g, x, r, n = 12) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const o = cylinder(g, 0.035, 0.055, dark, [
        x,
        Math.cos(a) * r,
        Math.sin(a) * r,
      ]);
      o.geometry.dispose();
      o.geometry = new T.CylinderGeometry(0.035, 0.035, 0.055, 6);
    }
  }
  function collar(g, x, r, m = silver) {
    cylinder(g, r, 0.1, m, [x, 0, 0]);
    ring(g, r, 0.022, edge, [x - 0.055, 0, 0]);
    bolts(g, x - 0.075, r * 0.84);
  }
  function blades(g, x, r, n, m) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2,
        vertices = [],
        indices = [];
      for (let j = 0; j <= 6; j++) {
        const v = 0.17 + ((r - 0.17) * j) / 6;
        for (let k = 0; k < 2; k++) {
          const angle = a + 0.32 * (v / r) + k * 0.13;
          vertices.push(x + k * 0.1, Math.cos(angle) * v, Math.sin(angle) * v);
        }
      }
      for (let j = 0; j < 6; j++) {
        const q = j * 2;
        indices.push(q, q + 1, q + 2, q + 1, q + 3, q + 2);
      }
      const geom = new T.BufferGeometry();
      geom.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
      geom.setIndex(indices);
      geom.computeVertexNormals();
      add(g, geom, m);
    }
    cylinder(g, 0.16, 0.22, edge, [x - 0.08, 0, 0]);
  }
  if (id === "apu") {
    collar(groups[0], -1.2, 0.8);
    cylinder(groups[0], 0.63, 0.65, dark, [-0.78, 0, 0], 0.77);
    blades(groups[0], -1.28, 0.68, 22, silver);
    cylinder(groups[1], 0.72, 0.8, hot, [0, 0, 0], 0.6);
    for (const x of [-0.42, -0.25, 0.25, 0.43])
      ring(groups[1], 0.68, 0.022, edge, [x, 0, 0]);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      tube(
        groups[1],
        [
          [-0.4, Math.cos(a) * 0.74, Math.sin(a) * 0.74],
          [0, Math.cos(a) * 0.86, Math.sin(a) * 0.86],
          [0.35, Math.cos(a) * 0.68, Math.sin(a) * 0.68],
        ],
        0.022,
        hot,
      );
    }
    collar(groups[2], 0.56, 0.64);
    cylinder(groups[2], 0.49, 0.7, dark, [1, 0, 0], 0.32);
    ring(groups[2], 0.33, 0.045, silver, [1.38, 0, 0]);
    blades(groups[2], 0.7, 0.43, 18, hot);
    box(groups[3], [0.62, 0.42, 0.58], silver, [-0.64, -0.73, 0]);
    cylinder(groups[3], 0.25, 0.7, blue, [-0.78, -0.78, 0.5]);
    tube(
      groups[3],
      [
        [-0.82, -0.6, 0.5],
        [-0.2, -0.9, 0.55],
        [0.3, -0.4, 0.62],
      ],
      0.036,
      silver,
    );
  } else if (id === "brakes") {
    // Axle is X. Alternating rotor/stator rings remain individually readable.
    cylinder(groups[3], 0.18, 2.7, edge, [0, 0, 0]);
    for (const x of [-0.9, -0.72])
      ring(groups[0], 0.88, 0.08, silver, [x, 0, 0]);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const spoke = box(groups[0], [0.2, 0.58, 0.095], silver, [
        -0.8,
        Math.cos(a) * 0.5,
        Math.sin(a) * 0.5,
      ]);
      spoke.rotation.x = a;
    }
    cylinder(groups[0], 0.26, 0.35, dark, [-0.8, 0, 0]);
    for (let i = 0; i < 8; i++) {
      const x = -0.46 + i * 0.14;
      ring(groups[1], 0.64, 0.11, i % 2 ? dark : hot, [x, 0, 0]);
      ring(groups[1], 0.43, 0.095, i % 2 ? dark : hot, [x, 0, 0]);
      for (let j = 0; j < 10; j++) {
        const a = (j / 10) * Math.PI * 2;
        const tooth = box(groups[1], [0.1, 0.09, 0.07], i % 2 ? dark : hot, [
          x,
          Math.cos(a) * 0.75,
          Math.sin(a) * 0.75,
        ]);
        tooth.rotation.x = a;
      }
    }
    collar(groups[2], 0.82, 0.79);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      cylinder(groups[2], 0.135, 0.27, silver, [
        0.95,
        Math.cos(a) * 0.53,
        Math.sin(a) * 0.53,
      ]);
    }
    bolts(groups[2], 1.1, 0.67, 12);
  } else if (id === "hydraulic") {
    cylinder(groups[0], 0.62, 1.5, silver, [-0.3, 0, 0]);
    collar(groups[0], -1.08, 0.71);
    collar(groups[0], 0.42, 0.67);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      tube(
        groups[0],
        [
          [-0.9, Math.cos(a) * 0.64, Math.sin(a) * 0.64],
          [0.28, Math.cos(a) * 0.64, Math.sin(a) * 0.64],
        ],
        0.04,
        dark,
      );
    }
    box(groups[1], [0.6, 1.05, 0.9], blue, [0.82, 0, 0]);
    for (const y of [-0.32, 0.32])
      for (const z of [-0.3, 0.3])
        cylinder(groups[1], 0.055, 0.06, dark, [1.15, y, z]);
    tube(
      groups[2],
      [
        [0.6, 0.5, 0.22],
        [0.6, 0.82, 0.22],
        [1.4, 0.82, 0.22],
        [1.65, 0.3, 0.22],
      ],
      0.09,
      silver,
    );
    tube(
      groups[2],
      [
        [0.65, -0.4, 0.28],
        [0.9, -0.76, 0.48],
        [-0.3, -0.76, 0.58],
        [-0.65, -0.42, 0.58],
      ],
      0.065,
      dark,
    );
    cylinder(groups[3], 0.22, 0.6, edge, [-1.4, 0, 0]);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      tube(
        groups[3],
        [
          [-1.65, Math.cos(a) * 0.22, Math.sin(a) * 0.22],
          [-1.25, Math.cos(a) * 0.22, Math.sin(a) * 0.22],
        ],
        0.018,
        dark,
      );
    }
  } else if (id === "pack") {
    box(groups[0], [1.1, 1.2, 1.22], dark, [-0.7, 0, 0]);
    for (let i = 0; i < 20; i++)
      box(groups[0], [0.045, 1.28, 1.4], silver, [-1.22 + i * 0.054, 0, 0]);
    for (let i = 0; i < 22; i++)
      box(groups[0], [0.038, 0.014, 1.4], silver, [
        -1.273,
        -0.6 + i * 0.057,
        0,
      ]);
    for (const y of [-0.7, 0.7])
      box(groups[0], [1.24, 0.06, 1.5], edge, [-0.7, y, 0]);
    cylinder(groups[1], 0.48, 0.72, blue, [0.65, 0, 0]);
    collar(groups[1], 0.28, 0.53);
    collar(groups[1], 1.04, 0.52);
    cylinder(groups[1], 0.26, 0.34, dark, [1.23, 0, 0]);
    tube(
      groups[2],
      [
        [-0.72, 0.7, 0.4],
        [-0.72, 1, 0.4],
        [0.45, 1, 0.4],
        [0.74, 0.4, 0.4],
      ],
      0.16,
      silver,
    );
    tube(
      groups[2],
      [
        [-0.7, -0.72, -0.3],
        [-0.7, -0.94, -0.3],
        [0.9, -0.94, -0.3],
        [0.9, -0.4, -0.3],
      ],
      0.15,
      hot,
    );
    cylinder(groups[3], 0.22, 0.35, silver, [1.2, 0.63, 0.5]);
    box(groups[3], [0.32, 0.25, 0.25], dark, [1.2, 0.87, 0.5]);
  } else {
    cylinder(groups[0], 0.43, 1.75, blue, [-0.52, 0, 0]);
    collar(groups[0], -1.4, 0.5);
    collar(groups[0], 0.36, 0.48);
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i / 4) * Math.PI * 2;
      tube(
        groups[0],
        [
          [-1.42, Math.cos(a) * 0.45, Math.sin(a) * 0.45],
          [0.4, Math.cos(a) * 0.45, Math.sin(a) * 0.45],
        ],
        0.022,
        edge,
      );
    }
    cylinder(groups[1], 0.2, 1.46, edge, [1.02, 0, 0]);
    cylinder(groups[1], 0.25, 0.16, dark, [0.44, 0, 0]);
    for (const x of [-1.68, 1.95]) {
      const o = ring(groups[2], 0.25, 0.11, silver, [x, 0, 0]);
      o.rotation.y = 0;
      box(groups[2], [0.34, 0.3, 0.3], silver, [
        x + (x < 0 ? 0.2 : -0.2),
        0,
        0,
      ]);
    }
    tube(
      groups[3],
      [
        [-1.1, 0.4, 0.17],
        [-1.1, 0.66, 0.17],
        [0.12, 0.66, 0.17],
        [0.12, 0.39, 0.17],
      ],
      0.045,
      edge,
    );
    cylinder(groups[3], 0.1, 1.08, dark, [-0.52, 0.56, 0.22]);
  }
  const sensor = new T.Group();
  sensor.name = meta.sensor;
  root.add(sensor);
  sensor.position.set(...meta.sensorPosition);
  if (id === "brakes") {
    cylinder(sensor, 0.06, 0.48, silver, [0, 0, 0]);
    cylinder(sensor, 0.09, 0.075, sensorMat, [0.22, 0, 0]);
    cylinder(sensor, 0.1, 0.07, edge, [-0.14, 0, 0]);
    for (const x of [-0.1, -0.04, 0.02, 0.08])
      ring(sensor, 0.061, 0.005, black, [x, 0, 0]);
  } else if (id === "actuator") {
    cylinder(sensor, 0.075, 0.73, sensorMat, [0, 0, 0]);
    cylinder(sensor, 0.033, 0.37, edge, [0.43, 0, 0]);
    tube(
      sensor,
      [
        [-0.4, 0, 0],
        [-0.53, 0.13, 0],
        [-0.55, 0.24, 0.25],
      ],
      0.022,
      dark,
    );
  } else {
    const base = cylinder(
      sensor,
      id === "pack" ? 0.085 : 0.115,
      0.22,
      sensorMat,
      [0, 0, 0],
    );
    base.rotation.z = 0;
    add(
      sensor,
      new T.CylinderGeometry(0.14, 0.14, 0.075, 6),
      edge,
      [0, -0.1, 0],
    );
    add(
      sensor,
      new T.CylinderGeometry(
        id === "pack" ? 0.025 : 0.048,
        id === "pack" ? 0.025 : 0.048,
        0.3,
        16,
      ),
      silver,
      [0, -0.27, 0],
    );
    tube(
      sensor,
      [
        [0, 0.11, 0],
        [0.05, 0.3, 0.05],
        [0.32, 0.36, 0.07],
        [0.58, 0.22, 0.12],
      ],
      0.025,
      dark,
    );
  }
  let explode = 0;
  return {
    root,
    sensor,
    meta,
    groups,
    setExplode(t) {
      explode = t;
      groups.forEach((g, i) => {
        g.position.x = g.userData.offset * t;
        g.position.y = id === "pack" ? (i - 1.5) * 0.15 * t : 0;
      });
    },
    highlight(value) {
      sensorMat.emissive.set(value ? 0x2b7566 : 0);
      sensorMat.emissiveIntensity = value ? 0.5 : 0;
    },
    dispose() {
      root.traverse((o) => o.geometry?.dispose());
      mats.forEach((m) => m.dispose());
      scene.remove(root);
    },
  };
}

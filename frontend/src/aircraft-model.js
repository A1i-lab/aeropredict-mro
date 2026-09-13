import * as T from "three";

// Original A320-inspired illustration. Half-scale proportions, not manufacturer CAD.
// X runs nose to tail, Y upwards, Z across the span. Surfaces are closed lofts.
export function buildAircraftModel(scene, { detail = 1 } = {}) {
  const materials = [];
  const mat = (color, metalness = 0.1, roughness = 0.36) => {
    const m = new T.MeshStandardMaterial({ color, metalness, roughness });
    materials.push(m);
    return m;
  };
  const paint = mat(0xeaf0ee, 0.16, 0.3);
  const wingPaint = mat(0xdbe3e2, 0.22, 0.36);
  const green = mat(0x275b50, 0.2, 0.29);
  const glass = mat(0x16313c, 0.55, 0.18);
  const trim = mat(0x657b82, 0.55, 0.3);
  const panel = mat(0x97a9ab, 0.2, 0.5);
  const alloy = mat(0xb2bfc3, 0.78, 0.23);
  const fanMetal = mat(0x526570, 0.65, 0.35);
  const rubber = mat(0x202b30, 0.05, 0.75);
  const cavity = mat(0x102027, 0, 0.8);
  const red = mat(0x963b35, 0.2, 0.3);
  const root = new T.Group();
  root.name = "AeroPredict airframe";
  scene.add(root);
  const add = (geometry, material, position = [0, 0, 0], parent = root) => {
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  };
  const tube = (points, radius, material, parent = root) =>
    add(
      new T.TubeGeometry(
        new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
        Math.max(6, points.length * 3),
        radius,
        5,
        false,
      ),
      material,
      [0, 0, 0],
      parent,
    );
  const rod = (a, b, r, material, parent = root) => {
    const start = new T.Vector3(...a),
      end = new T.Vector3(...b),
      d = end.clone().sub(start);
    const o = add(
      new T.CylinderGeometry(r, r, d.length(), 10),
      material,
      start.clone().add(end).multiplyScalar(0.5).toArray(),
      parent,
    );
    o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    return o;
  };
  const lathe = (
    profile,
    material,
    position = [0, 0, 0],
    segments = 48,
    parent = root,
  ) => {
    const o = add(
      new T.LatheGeometry(
        profile.map(([x, r]) => new T.Vector2(r, x)),
        segments,
      ),
      material,
      position,
      parent,
    );
    o.rotation.z = -Math.PI / 2;
    return o;
  };
  const surface = (rows, material, parent = root) => {
    const positions = [],
      indices = [],
      n = rows[0].length;
    for (const row of rows) for (const p of row) positions.push(...p);
    for (let j = 0; j < rows.length - 1; j++)
      for (let i = 0; i < n - 1; i++) {
        const a = j * n + i,
          b = a + n;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    // Mirrored and lofted surfaces use a common material and must remain visible on both sides.
    material.side = T.DoubleSide;
    return add(g, material, [0, 0, 0], parent);
  };

  // Smooth, blunt radome with the cockpit above its centreline and an upswept tail cone.
  const stations = [
    [-9.4, 0.006, -0.17],
    [-9.34, 0.19, -0.15],
    [-9.15, 0.39, -0.1],
    [-8.85, 0.6, -0.03],
    [-8.5, 0.76, 0.025],
    [-8.05, 0.87, 0.035],
    [-7.5, 0.96, 0.025],
    [-6.65, 0.995, 0.005],
    [-5.7, 1, 0],
    [4.4, 1, 0],
    [5.2, 0.95, 0.035],
    [6.15, 0.8, 0.12],
    [7.15, 0.58, 0.23],
    [8.05, 0.35, 0.34],
    [8.8, 0.16, 0.43],
    [9.35, 0.018, 0.47],
  ];
  const profile = new T.CatmullRomCurve3(
    stations.map((p) => new T.Vector3(...p)),
    false,
    "centripetal",
  );
  const samples = profile.getPoints(144);
  const section = (x) => {
    for (let i = 1; i < samples.length; i++)
      if (samples[i].x >= x) {
        const a = samples[i - 1],
          b = samples[i],
          u = (x - a.x) / (b.x - a.x);
        return {
          r: T.MathUtils.lerp(a.y, b.y, u),
          cy: T.MathUtils.lerp(a.z, b.z, u),
        };
      }
    return { r: 0.018, cy: 0.47 };
  };
  const rings = detail ? 56 : 40;
  surface(
    samples.map((p) =>
      Array.from({ length: rings + 1 }, (_, i) => {
        const a = (i / rings) * Math.PI * 2;
        return [p.x, p.z + p.y * Math.cos(a), p.y * Math.sin(a)];
      }),
    ),
    paint,
  );
  // Painted lower lobe follows the skin rather than floating as a separate solid.
  const belly = samples.filter((p) => p.x > -8.9 && p.x < 8.1);
  surface(
    belly.map((p, j) => {
      const fade = Math.min(1, j / 7, (belly.length - 1 - j) / 7);
      return Array.from({ length: 25 }, (_, i) => {
        const a = Math.PI + (i / 24 - 0.5) * 1.85 * fade;
        return [
          p.x,
          p.z + p.y * 1.002 * Math.cos(a),
          p.y * 1.002 * Math.sin(a),
        ];
      });
    }),
    green,
  );
  const skin = (x, y, side, offset = 0.008) => {
    const { r, cy } = section(x);
    return [
      x,
      y,
      side * (Math.sqrt(Math.max(0.0001, r * r - (y - cy) ** 2)) + offset),
    ];
  };
  const patch = (outline, material, side, offset = 0.012) => {
    const shape = new T.Shape(outline.map((p) => new T.Vector2(...p)));
    const flat = new T.ShapeGeometry(shape, 8).toNonIndexed();
    const positions = [],
      src = flat.attributes.position;
    const tessellate = (a, b, c, depth) => {
      if (!depth) {
        for (const v of [a, b, c])
          positions.push(...skin(v[0], v[1], side, offset));
        return;
      }
      const mid = (u, v) => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2];
      const ab = mid(a, b),
        bc = mid(b, c),
        ca = mid(c, a);
      tessellate(a, ab, ca, depth - 1);
      tessellate(ab, b, bc, depth - 1);
      tessellate(ca, bc, c, depth - 1);
      tessellate(ab, bc, ca, depth - 1);
    };
    const subdivisions =
      Math.max(...outline.map((p) => p[0])) -
        Math.min(...outline.map((p) => p[0])) >
      0.25
        ? 2
        : 0;
    for (let i = 0; i < src.count; i += 3)
      tessellate(
        [src.getX(i), src.getY(i)],
        [src.getX(i + 1), src.getY(i + 1)],
        [src.getX(i + 2), src.getY(i + 2)],
        subdivisions,
      );
    flat.dispose();
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    g.computeVertexNormals();
    material.side = T.DoubleSide;
    return add(g, material);
  };
  const roundedRect = (x, y, w, h, r) => {
    const pts = [];
    for (const [cx, cy, start] of [
      [x + w / 2 - r, y + h / 2 - r, 0],
      [x - w / 2 + r, y + h / 2 - r, 90],
      [x - w / 2 + r, y - h / 2 + r, 180],
      [x + w / 2 - r, y - h / 2 + r, 270],
    ]) {
      for (let k = 0; k <= 4; k++) {
        const a = ((start + k * 22.5) * Math.PI) / 180;
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
    }
    return pts;
  };
  // Windscreen glazing is a set of six flush trapezoid panes, not spherical blobs.
  for (const side of [-1, 1]) {
    const panes = [
      [
        [-8.57, 0.38],
        [-8.33, 0.65],
        [-7.96, 0.68],
        [-8.07, 0.34],
      ],
      [
        [-8.02, 0.34],
        [-7.91, 0.68],
        [-7.55, 0.64],
        [-7.56, 0.3],
      ],
      [
        [-7.5, 0.3],
        [-7.49, 0.62],
        [-7.24, 0.53],
        [-7.27, 0.28],
      ],
    ];
    for (const pane of panes) {
      patch(pane, glass, side, 0.018);
      tube(
        [...pane, pane[0]].map(([x, y]) => skin(x, y, side, 0.024)),
        0.012,
        trim,
      );
    }
    // Cabin glazing has a soft rectangular seal and two overwing exit gaps.
    for (let i = 0; i < 39; i++) {
      const x = -5.95 + i * 0.275;
      if (Math.abs(x + 0.7) < 0.22 || Math.abs(x - 0.02) < 0.19) continue;
      patch(roundedRect(x, 0.34, 0.125, 0.19, 0.05), trim, side, 0.01);
      patch(roundedRect(x, 0.344, 0.095, 0.154, 0.041), glass, side, 0.017);
    }
    for (const [x, w, h, y] of [
      [-6.63, 0.41, 0.9, 0.02],
      [5.19, 0.4, 0.87, 0.055],
      [-0.7, 0.32, 0.58, 0.12],
      [0.02, 0.32, 0.58, 0.12],
    ]) {
      const outline = roundedRect(x, y, w, h, 0.075);
      tube(
        [...outline, outline[0]].map(([xx, yy]) => skin(xx, yy, side, 0.014)),
        0.008,
        panel,
      );
      patch(roundedRect(x, y + 0.23, 0.082, 0.11, 0.03), glass, side, 0.025);
      rod(
        skin(x + 0.05, y - 0.04, side, 0.028),
        skin(x + 0.13, y - 0.04, side, 0.028),
        0.008,
        trim,
      );
    }
    // Fine longitudinal paint seam and forward/aft cargo hatch outlines.
    const stripe = Array.from({ length: 65 }, (_, i) =>
      skin(-6.1 + (i * 11.4) / 64, -0.19, side, 0.012),
    );
    tube(stripe, 0.01, green);
    for (const [x, w] of [
      [-4.3, 1.03],
      [3.86, 1.1],
    ]) {
      const p = roundedRect(x, -0.43, w, 0.53, 0.065);
      tube(
        [...p, p[0]].map(([xx, yy]) => skin(xx, yy, side, 0.012)),
        0.006,
        panel,
      );
    }
  }
  // Radome seam follows the curved cross-section.
  const noseSec = section(-8.71);
  tube(
    Array.from({ length: 49 }, (_, i) => [
      -8.71,
      noseSec.cy + noseSec.r * 1.005 * Math.cos((i / 48) * Math.PI * 2),
      noseSec.r * 1.005 * Math.sin((i / 48) * Math.PI * 2),
    ]),
    0.008,
    panel,
  );

  // Airfoils: cosine-spaced leading edges, camber, taper, sweep and dihedral.
  function foil(
    st,
    side,
    material,
    { vertical = false, thickness = 0.105 } = {},
  ) {
    const n = 24;
    const point = (s, u, upper, extra = 0) => {
      const chord = s[2] - s[1];
      const thick =
        5 *
        thickness *
        chord *
        (0.2969 * Math.sqrt(u) -
          0.126 * u -
          0.3516 * u * u +
          0.2843 * u ** 3 -
          0.1036 * u ** 4);
      const camber = 0.012 * chord * Math.sin(Math.PI * u);
      return vertical
        ? [
            s[1] + u * chord,
            s[0],
            side * (s[3] + (upper ? 1 : -1) * thick + extra),
          ]
        : [
            s[1] + u * chord,
            s[3] + camber + (upper ? 1 : -1) * thick + extra,
            side * s[0],
          ];
    };
    const rows = st.map((s) => {
      const p = [];
      for (let i = 0; i <= n; i++)
        p.push(point(s, (1 - Math.cos((i / n) * Math.PI)) / 2, true));
      for (let i = n - 1; i >= 0; i--)
        p.push(point(s, (1 - Math.cos((i / n) * Math.PI)) / 2, false));
      return p;
    });
    rows.push(rows.at(-1).map(() => point(st.at(-1), 0.5, true)));
    surface(rows, material);
    return point;
  }
  const wings = [
    [0.6, -2.05, 3.7, -0.42],
    [1.45, -1.82, 3.53, -0.33],
    [3.4, -0.96, 2.67, -0.16],
    [5.5, 0.28, 3.13, 0.03],
    [7.4, 1.42, 3.66, 0.24],
    [8.6, 2.14, 3.87, 0.4],
  ];
  const stabilizers = [
    [0.48, 5.14, 8.45, 0.48],
    [1.45, 5.66, 8.41, 0.59],
    [3.7, 7.0, 8.42, 0.88],
  ];
  for (const side of [-1, 1]) {
    const p = foil(wings, side, wingPaint);
    foil(stabilizers, side, paint, { thickness: 0.085 });
    // Delicate control-surface seams replace the old oversized grey rectangles.
    for (const u of [0.15, 0.73])
      tube(
        wings.map((s) => p(s, u, true, 0.009)),
        0.007,
        panel,
      );
    for (let i = 1; i < wings.length; i++)
      tube(
        Array.from({ length: 9 }, (_, k) =>
          p(wings[i], 0.17 + k * 0.069, true, 0.009),
        ),
        0.005,
        panel,
      );
    for (let i = 1; i < 4; i++) {
      const s = wings[i];
      tube(
        Array.from({ length: 6 }, (_, k) => p(s, 0.72 + k * 0.055, true, 0.01)),
        0.008,
        trim,
      );
      const fair = add(new T.SphereGeometry(1, 18, 10), paint, [
        s[2] - 0.3,
        s[3] - 0.14,
        side * s[0],
      ]);
      fair.scale.set(0.67, 0.11, 0.12);
    }
    // Blended wingtip rises from the wing, with no floating disconnected slab.
    foil(
      [
        [8.56, 2.12, 3.88, 0.4],
        [8.83, 2.3, 3.88, 0.63],
        [8.97, 2.52, 3.88, 0.98],
        [9.01, 2.83, 3.88, 1.35],
        [9.02, 3.15, 3.85, 1.67],
      ],
      side,
      green,
      { thickness: 0.052 },
    );
    tube(
      stabilizers.map((s) => [
        s[1] + (s[2] - s[1]) * 0.73,
        s[3] + 0.035,
        side * s[0],
      ]),
      0.007,
      panel,
    );

    // Sculpted pylon and hollow nacelle with separate intake lip, fan and exhaust.
    const ez = side * 2.78,
      ey = -1.04,
      ex = -1.8;
    foil(
      [
        [Math.abs(ez) - 0.105, -2.38, 0.6, -0.37],
        [Math.abs(ez), -2.42, 0.7, -0.31],
        [Math.abs(ez) + 0.105, -2.38, 0.6, -0.37],
      ],
      side,
      paint,
      { thickness: 0.27 },
    );
    const body = [
      [-1.18, 0.63],
      [-1.12, 0.7],
      [-0.98, 0.735],
      [-0.64, 0.765],
      [0.08, 0.74],
      [0.66, 0.61],
      [1.02, 0.46],
      [1.04, 0.4],
      [0.78, 0.39],
      [0.28, 0.45],
      [-0.64, 0.55],
      [-1.1, 0.57],
      [-1.18, 0.63],
    ];
    lathe(body, paint, [ex, ey, ez]);
    lathe(
      [
        [-1.2, 0.627],
        [-1.19, 0.65],
        [-1.13, 0.7],
        [-1.02, 0.73],
        [-1.0, 0.709],
        [-1.08, 0.651],
        [-1.13, 0.585],
        [-1.19, 0.598],
        [-1.2, 0.627],
      ],
      alloy,
      [ex, ey, ez],
    );
    lathe(
      [
        [-1.12, 0.577],
        [-0.83, 0.567],
        [-0.7, 0.556],
      ],
      cavity,
      [ex, ey, ez],
    );
    lathe(
      [
        [-0.5, 0],
        [-0.5, 0.558],
      ],
      cavity,
      [ex, ey, ez],
    );
    // Swept fan blades with a curved chord, individually visible during camera focus.
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2,
        rows = [];
      for (let j = 0; j <= 5; j++) {
        const r = 0.12 + j * 0.084,
          sweep = a + 0.38 * (r / 0.54) ** 1.4;
        rows.push(
          Array.from({ length: 4 }, (_, q) => {
            const angle = sweep + (q / 3 - 0.5) * (0.17 + 0.045 * (r / 0.54));
            return [
              ex - 0.9 + (0.13 * q) / 3 + 0.12 * (r / 0.54) ** 2,
              ey + Math.cos(angle) * r,
              ez + Math.sin(angle) * r,
            ];
          }),
        );
      }
      surface(rows, fanMetal);
    }
    lathe(
      [
        [-1.03, 0.003],
        [-0.99, 0.068],
        [-0.88, 0.13],
        [-0.69, 0.155],
      ],
      alloy,
      [ex, ey, ez],
    );
    lathe(
      [
        [0.67, 0.37],
        [1.1, 0.32],
        [1.34, 0.25],
        [1.35, 0.2],
        [0.85, 0.22],
      ],
      fanMetal,
      [ex, ey, ez],
    );
    lathe(
      [
        [0.8, 0.18],
        [1.28, 0.12],
        [1.52, 0.015],
      ],
      trim,
      [ex, ey, ez],
    );
    for (const xx of [-0.26, 0.42])
      tube(
        Array.from({ length: 49 }, (_, i) => [
          ex + xx,
          ey + 0.744 * Math.cos((i / 48) * Math.PI * 2),
          ez + 0.744 * Math.sin((i / 48) * Math.PI * 2),
        ]),
        0.006,
        panel,
      );

    // Main gear: paired tyres, recessed hubs, oleo strut and diagonal torque brace.
    const gx = 1.22,
      gz = side * 1.3;
    rod([gx, -0.65, gz], [gx, -1.61, gz], 0.062, alloy);
    rod([gx + 0.65, -0.56, side * 0.83], [gx, -1.36, gz], 0.035, trim);
    rod([gx, -1.4, gz], [gx + 0.14, -1.57, gz], 0.022, alloy);
    rod([gx, -1.68, gz - 0.32], [gx, -1.68, gz + 0.32], 0.06, alloy);
    for (const z of [gz - 0.22, gz + 0.22]) {
      const tyre = add(new T.TorusGeometry(0.205, 0.073, 10, 24), rubber, [
        gx,
        -1.7,
        z,
      ]);
      const hub = add(new T.CylinderGeometry(0.128, 0.128, 0.105, 20), alloy, [
        gx,
        -1.7,
        z,
      ]);
      hub.rotation.x = Math.PI / 2;
      const inset = add(new T.CylinderGeometry(0.052, 0.052, 0.112, 12), trim, [
        gx,
        -1.7,
        z,
      ]);
      inset.rotation.x = Math.PI / 2;
    }
  }
  // Fin has a proper airfoil section, dorsal fairing and a separate rudder seam.
  foil(
    [
      [0.48, 4.82, 8.68, 0],
      [1.13, 5.36, 8.67, 0],
      [3.34, 6.83, 8.62, 0],
      [3.72, 7.2, 8.58, 0],
    ],
    1,
    green,
    { vertical: true, thickness: 0.09 },
  );
  for (const side of [-1, 1])
    tube(
      [
        [7.87, 1.0, side * 0.105],
        [8.0, 2.0, side * 0.07],
        [8.18, 3.58, side * 0.032],
      ],
      0.008,
      trim,
    );
  // Small nose gear and upper-fuselage antenna details.
  rod([-6.85, -0.79, 0], [-6.85, -1.69, 0], 0.045, alloy);
  rod([-6.44, -0.8, 0], [-6.85, -1.44, 0], 0.027, trim);
  for (const z of [-0.11, 0.11]) {
    add(new T.TorusGeometry(0.137, 0.05, 8, 20), rubber, [-6.85, -1.76, z]);
    const hub = add(new T.CylinderGeometry(0.085, 0.085, 0.075, 16), alloy, [
      -6.85,
      -1.76,
      z,
    ]);
    hub.rotation.x = Math.PI / 2;
  }
  for (const x of [-3.0, 2.6]) {
    const antenna = add(new T.SphereGeometry(1, 12, 8), paint, [x, 0.99, 0]);
    antenna.scale.set(0.2, 0.115, 0.065);
  }
  add(new T.SphereGeometry(0.048, 12, 8), red, [-0.5, 1.04, 0]);
  lathe(
    [
      [-0.12, 0.1],
      [0.05, 0.08],
      [0.065, 0.045],
      [-0.06, 0.045],
    ],
    trim,
    [9.22, 0.46, 0],
    20,
  );
  return {
    root,
    dispose() {
      root.traverse((o) => o.geometry?.dispose());
      materials.forEach((m) => m.dispose());
      scene.remove(root);
    },
  };
}

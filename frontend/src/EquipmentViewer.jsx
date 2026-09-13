import React, { useLayoutEffect, useRef, useState } from "react";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RotateCcw, ScanLine, Layers3 } from "lucide-react";
import { DepthRenderer } from "./depth-renderer";
import { buildEquipmentModel, EQUIPMENT_DETAILS } from "./equipment-models";

export function EquipmentViewer({ systemId, metric, value, unit }) {
  const host = useRef(null),
    api = useRef(null);
  const [exploded, setExploded] = useState(false),
    [selected, setSelected] = useState(null),
    [error, setError] = useState(false);
  const meta = EQUIPMENT_DETAILS[systemId];
  useLayoutEffect(() => {
    setSelected(null);
    setExploded(false);
    setError(false);
    let renderer,
      model,
      controls,
      resize,
      observer,
      env,
      raf,
      disposed = false;
    try {
      const scene = new T.Scene();
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
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.4;
      host.current.append(renderer.domElement);
      renderer.domElement.setAttribute(
        "aria-label",
        `Vue 3D : ${meta.title}. Rotation par glissement, zoom par molette.`,
      );
      const camera = new T.PerspectiveCamera(34, 1, 0.1, 100);
      camera.position.set(-5, 3.2, 6.4);
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.minDistance = 2;
      controls.maxDistance = 16;
      if (!renderer.software) {
        const pmrem = new T.PMREMGenerator(renderer),
          room = new RoomEnvironment();
        env = pmrem.fromScene(room, 0.04);
        scene.environment = env.texture;
        room.dispose();
        pmrem.dispose();
      }
      scene.add(new T.HemisphereLight(0xffffff, 0x8798a9, 2.5));
      const light = new T.DirectionalLight(0xffffff, 3);
      light.position.set(-3, 8, 6);
      scene.add(light);
      model = buildEquipmentModel(scene, systemId);
      let dirty = true,
        visible = true,
        last = 0,
        explode = 0,
        goalExplode = 0,
        moving = true;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const goal = new T.Vector3(),
        eye = new T.Vector3(-5, 3.2, 6.4);
      const frameView = (part = null) => {
        goal.set(0, 0, 0);
        if (part === "sensor") {
          model.root.updateMatrixWorld(true);
          model.sensor.getWorldPosition(goal);
        } else if (Number.isInteger(part))
          new T.Box3().setFromObject(model.groups[part]).getCenter(goal);
        const factor = part === null ? 1 : part === "sensor" ? 0.4 : 0.68;
        eye
          .copy(goal)
          .add(
            new T.Vector3(-5, 3.2, 6.4).multiplyScalar(
              factor * Math.max(1, 1.3 / camera.aspect),
            ),
          );
        model.highlight(part === "sensor");
        moving = true;
        dirty = true;
      };
      api.current = {
        view: frameView,
        explode(v) {
          goalExplode = v ? 1 : 0;
          frameView(null);
        },
        reset() {
          goalExplode = 0;
          frameView(null);
        },
      };
      controls.addEventListener("start", () => {
        moving = false;
      });
      controls.addEventListener("change", () => {
        dirty = true;
      });
      resize = new ResizeObserver(() => {
        const w = host.current?.clientWidth,
          h = host.current?.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        frameView(null);
      });
      resize.observe(host.current);
      observer = new IntersectionObserver((es) => {
        visible = es[0].isIntersecting;
        dirty = true;
      });
      observer.observe(host.current);
      function animate(t) {
        if (disposed) return;
        raf = requestAnimationFrame(animate);
        if (
          !visible ||
          document.hidden ||
          t - last < (renderer.software ? 65 : 16)
        )
          return;
        const k = reduced ? 1 : 1 - Math.exp(-Math.min(100, t - last) / 125);
        last = t;
        if (moving) {
          camera.position.lerp(eye, k);
          controls.target.lerp(goal, k);
          dirty = true;
          if (camera.position.distanceTo(eye) < 0.01) moving = false;
        }
        if (Math.abs(explode - goalExplode) > 0.001) {
          explode = T.MathUtils.lerp(explode, goalExplode, k);
          model.setExplode(explode);
          dirty = true;
        }
        controls.update();
        if (dirty) {
          renderer.render(scene, camera);
          dirty = false;
        }
      }
      const width = host.current.clientWidth,
        height = host.current.clientHeight;
      if (width && height) {
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        frameView(null);
        camera.position.copy(eye);
        controls.target.copy(goal);
        controls.update();
        renderer.render(scene, camera);
        dirty = false;
        moving = false;
      }
      raf = requestAnimationFrame(animate);
    } catch (e) {
      setError(true);
      console.error("Equipment view unavailable", e);
    }
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resize?.disconnect();
      observer?.disconnect();
      controls?.dispose();
      model?.dispose();
      env?.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
      api.current = null;
    };
  }, [systemId]);
  function choose(id) {
    setSelected(id);
    api.current?.view(id);
  }
  return (
    <section
      className="equipment-viewer"
      aria-label={`Exploration de ${meta.title}`}
    >
      <div className="equipment-viewer-title">
        <div>
          <span className="eyebrow">DE L’AVION À L’ÉQUIPEMENT</span>
          <h2>{meta.title}</h2>
          <p>{meta.subtitle}</p>
        </div>
        <button
          className="icon-button"
          aria-label="Réinitialiser la pièce"
          onClick={() => {
            setSelected(null);
            setExploded(false);
            api.current?.reset();
          }}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <div
        className="equipment-canvas"
        ref={host}
        style={{ viewTransitionName: "airframe-scene" }}
      />
      {error && (
        <p role="status">
          La vue 3D est indisponible. Le signal et la revue restent accessibles.
        </p>
      )}
      <div className="equipment-viewer-controls">
        <button
          className={"button " + (!exploded ? "selected" : "")}
          aria-pressed={!exploded}
          onClick={() => {
            setExploded(false);
            api.current?.explode(false);
          }}
        >
          Assemblé
        </button>
        <button
          className={"button " + (exploded ? "selected" : "")}
          aria-pressed={exploded}
          onClick={() => {
            setExploded(true);
            api.current?.explode(true);
          }}
        >
          <Layers3 size={16} />
          Vue éclatée
        </button>
        <button
          className="button"
          aria-pressed={selected === "sensor"}
          onClick={() => choose("sensor")}
        >
          <ScanLine size={16} />
          {meta.sensor}
        </button>
      </div>
      <div className="equipment-components">
        {meta.parts.map((part, i) => (
          <button
            key={part}
            aria-pressed={selected === i}
            onClick={() => choose(i)}
          >
            <span>0{i + 1}</span>
            {part}
          </button>
        ))}
      </div>
      <div className="equipment-signal-note">
        <div>
          <span className="eyebrow">
            {selected === "sensor" ? meta.sensor : "LIEN AVEC LE SIGNAL"}
          </span>
          <p>{meta.signal}</p>
        </div>
        <strong>
          {value} <small>{unit}</small>
          <span>{metric}</span>
        </strong>
      </div>
      <small className="equipment-geometry-note">
        Formes mécaniques illustratives. Aucun modèle CAO constructeur ni
        localisation de panne validée.
      </small>
    </section>
  );
}

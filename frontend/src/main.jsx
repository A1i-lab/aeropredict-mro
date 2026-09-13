import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  Plane,
  Layers3,
  LayoutGrid,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Search,
  Box,
  ScanLine,
  RotateCcw,
  Plus,
  Minus,
  Play,
  Pause,
  Wind,
  Check,
  Download,
  SlidersHorizontal,
  Info,
  X,
  BookOpen,
  Activity,
  Menu,
  CheckCircle2,
  ArrowDown,
  Maximize2,
} from "lucide-react";
import { createEngine } from "./engine";
import DATA from "./data.json";
import { AircraftExperience } from "./AircraftExperience";
import "./style.css";

const FLEET = [...DATA.fleet].sort(
  (a, b) =>
    b.priority - a.priority ||
    a.rul - b.rul ||
    a.engine.localeCompare(b.engine),
);
const parts = [
  {
    id: "fan",
    n: "01",
    name: "Soufflante",
    verb: "Accélérer l’air",
    color: "#6390b9",
    body: "À l’entrée du moteur, cette grande roue met l’air en mouvement. Une partie de l’air entre dans le cœur du moteur, l’autre le contourne.",
    detail:
      "Le flux qui contourne le cœur contribue à la poussée d’un turboréacteur à double flux.",
    inspection:
      "Exemple pédagogique : inspection visuelle des aubes et recherche de dommages de surface.",
  },
  {
    id: "compressor",
    n: "02",
    name: "Compresseur",
    verb: "Comprimer l’air",
    color: "#577e92",
    body: "Plusieurs rangées d’aubes compriment progressivement l’air avant son arrivée dans la chambre de combustion.",
    detail:
      "Les étages successifs augmentent la pression. Les roues mobiles alternent avec des éléments fixes.",
    inspection:
      "Exemple pédagogique : inspection interne par endoscope. Aucune défaillance de pièce n’est localisée par ce modèle.",
  },
  {
    id: "combustor",
    n: "03",
    name: "Chambre de combustion",
    verb: "Apporter de l’énergie",
    color: "#a9794c",
    body: "Le carburant est mélangé à l’air comprimé puis brûlé. Les gaz chauds transmettent leur énergie aux turbines.",
    detail:
      "La combustion doit rester stable dans une zone soumise à des températures élevées.",
    inspection:
      "Exemple pédagogique : examen des parois internes selon une procédure de maintenance approuvée.",
  },
  {
    id: "turbine",
    n: "04",
    name: "Turbine",
    verb: "Entraîner les rotors",
    color: "#796a60",
    body: "Les gaz chauds font tourner les turbines. Par les arbres du moteur, elles entraînent le compresseur et la soufflante.",
    detail:
      "La rotation visible ici est une animation explicative. Elle ne reproduit pas la vitesse réelle d’un moteur.",
    inspection:
      "Exemple pédagogique : recherche de traces d’usure ou de dommages lors d’une inspection interne.",
  },
  {
    id: "exhaust",
    n: "05",
    name: "Échappement",
    verb: "Évacuer les gaz",
    color: "#74838e",
    body: "Les gaz quittent le cœur du moteur par la tuyère. Leur accélération contribue à la poussée.",
    detail:
      "Cette maquette montre le chemin de l’air et les principaux ensembles, avec une géométrie simplifiée.",
    inspection:
      "Exemple pédagogique : contrôle visuel de la zone de sortie. Ce démonstrateur ne prescrit aucune intervention réelle.",
  },
];
const status = {
  CRITICAL: { label: "Prioritaire", short: "Prioritaire", cls: "critical" },
  WATCH: { label: "À surveiller", short: "À surveiller", cls: "watch" },
  HEALTHY: { label: "Suivi normal", short: "Suivi normal", cls: "healthy" },
};
const fmt = (x, d = 0) =>
  Number(x).toLocaleString("fr-FR", { maximumFractionDigits: d });
function Badge({ risk }) {
  return (
    <span className={"badge " + status[risk].cls}>
      <i />
      {status[risk].label}
    </span>
  );
}
function IconButton({ label, children, ...props }) {
  return (
    <button className="icon-button" title={label} aria-label={label} {...props}>
      {children}
    </button>
  );
}
function Spark({ values, color = "#3a7468", width = 94, height = 27 }) {
  if (!values.length) return null;
  let low = Math.min(...values),
    high = Math.max(...values),
    range = high - low || 1;
  let points = values
    .map(
      (v, i) =>
        `${(i / (values.length - 1 || 1)) * width},${height - 3 - ((v - low) / range) * (height - 6)}`,
    )
    .join(" ");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}
function Chart({ rows, type = "rul", height = 160 }) {
  const [hover, setHover] = useState(null);
  const W = 700,
    H = height + 35,
    L = 40,
    T = 15,
    B = H - 27,
    R = W - 15;
  const idx = type === "s4" ? 4 : type === "s11" ? 5 : 1;
  const values = rows.map((r) => r[idx]);
  let min = type === "rul" ? 0 : Math.min(...values) - 2,
    max =
      type === "rul"
        ? Math.max(...rows.map((r) => r[3]), 140)
        : Math.max(...values) + 2;
  const x = (i) => L + (i / (rows.length - 1 || 1)) * (R - L),
    y = (v) => B - ((v - min) / (max - min)) * (B - T);
  const line = rows.map((r, i) => `${x(i)},${y(r[idx])}`).join(" ");
  const area =
    type === "rul"
      ? rows
          .map((r, i) => `${x(i)},${y(r[3])}`)
          .concat(rows.map((r, i) => `${x(i)},${y(r[2])}`).reverse())
          .join(" ")
      : "";
  return (
    <div className="chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={
          type === "rul"
            ? "Évolution de la durée restante estimée et de son intervalle"
            : "Historique du capteur " + type
        }
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover(
            Math.max(
              0,
              Math.min(
                rows.length - 1,
                Math.round(
                  ((((e.clientX - r.left) / r.width) * W - L) / (R - L)) *
                    (rows.length - 1),
                ),
              ),
            ),
          );
        }}
      >
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line
              x1={L}
              x2={R}
              y1={y(min + t * (max - min))}
              y2={y(min + t * (max - min))}
              stroke="#e1e6ea"
              strokeDasharray="3 4"
            />
            <text x={L - 8} y={y(min + t * (max - min)) + 4} textAnchor="end">
              {fmt(min + t * (max - min))}
            </text>
          </g>
        ))}
        {area && <polygon points={area} fill="#dce9e7" opacity=".8" />}
        {type === "rul" && (
          <line
            x1={L}
            x2={R}
            y1={y(20)}
            y2={y(20)}
            stroke="#c36957"
            strokeDasharray="4 5"
          />
        )}
        <polyline
          points={line}
          fill="none"
          stroke="#317268"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {[0, Math.floor((rows.length - 1) / 2), rows.length - 1].map((i, n) => (
          <text key={n} x={x(i)} y={H - 7} textAnchor="middle">
            {rows[i]?.[0]}
          </text>
        ))}
        {hover !== null && rows[hover] && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={T} y2={B} stroke="#6a7c83" />
            <circle
              cx={x(hover)}
              cy={y(rows[hover][idx])}
              r="4"
              fill="#183e36"
            />
          </g>
        )}
      </svg>
      <div className="chart-foot">
        <span>
          {hover !== null
            ? `Cycle ${rows[hover]?.[0]} · ${fmt(rows[hover]?.[idx], 1)}${type === "rul" ? " cycles estimés" : ""}`
            : "Cycles observés"}
        </span>
        <span>
          {type === "rul"
            ? "Bande : intervalle estimé"
            : "Valeurs observées, sans diagnostic de pièce"}
        </span>
      </div>
    </div>
  );
}
function EngineCanvas({
  selectedPart,
  onSelect,
  cut,
  exploded,
  playing,
  airflow,
  apiRef,
}) {
  const host = useRef(null),
    [error, setError] = useState(false),
    [ready, setReady] = useState(false),
    [software, setSoftware] = useState(false);
  const callback = useRef(onSelect);
  callback.current = onSelect;
  useLayoutEffect(() => {
    let api;
    try {
      api = createEngine(
        host.current,
        (id) => callback.current(id),
        (soft) => {
          setReady(true);
          setSoftware(soft);
        },
      );
      apiRef.current = api;
      api.setCut(cut);
      api.setSelected(selectedPart);
      api.setExplode(exploded, true);
      api.renderNow();
    } catch (e) {
      setError(true);
      console.error("3D unavailable", e);
    }
    return () => {
      api?.dispose();
      apiRef.current = null;
    };
  }, []);
  useEffect(() => {
    apiRef.current?.setSelected(selectedPart);
  }, [selectedPart]);
  useEffect(() => {
    apiRef.current?.setCut(cut);
  }, [cut]);
  useEffect(() => {
    apiRef.current?.setExplode(exploded);
  }, [exploded]);
  useEffect(() => {
    apiRef.current?.setPlaying(playing);
  }, [playing]);
  useEffect(() => {
    apiRef.current?.setFlow(airflow);
  }, [airflow]);
  return (
    <>
      <div
        ref={host}
        className="engine-canvas"
        data-ready={ready}
        style={{ viewTransitionName: "airframe-scene" }}
      />
      {software && (
        <span className="software-label">
          Rendu compatible · même maquette 3D
        </span>
      )}
      {error && (
        <div className="canvas-error">
          <Box size={36} />
          <h3>La 3D n’est pas disponible ici</h3>
          <p>
            Explorez les cinq composants avec les boutons ci-dessous. Toutes les
            données et la planification restent accessibles.
          </p>
        </div>
      )}
    </>
  );
}
function App() {
  const [page, setPage] = useState("home"),
    [engineId, setEngineId] = useState(81),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("ALL"),
    [partId, setPartId] = useState(null),
    [cut, setCut] = useState(true),
    [exploded, setExploded] = useState(true),
    [playing, setPlaying] = useState(false),
    [airflow, setAirflow] = useState(false),
    [capacity, setCapacity] = useState(10),
    [chosen, setChosen] = useState([]),
    [toast, setToast] = useState(""),
    [tour, setTour] = useState(false),
    [evidence, setEvidence] = useState(false),
    [menu, setMenu] = useState(false),
    [sensor, setSensor] = useState("s4"),
    [aboutTab, setAboutTab] = useState("results");
  const flightBridge = useRef(null),
    activeTransition = useRef(null),
    routeRequest = useRef(0);
  const api = useRef(null),
    toastTimer = useRef(null);
  const engine = FLEET.find((e) => e.unit === engineId) || FLEET[0],
    rows = DATA.history[String(engine.unit)],
    part = parts.find((p) => p.id === partId),
    critical = FLEET.filter((e) => e.risk === "CRITICAL").length,
    watch = FLEET.filter((e) => e.risk === "WATCH").length;
  const filtered = FLEET.filter(
    (e) =>
      (filter === "ALL" || e.risk === filter) &&
      e.engine.toLowerCase().includes(query.toLowerCase()),
  );
  const notify = (t) => {
    setToast(t);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3500);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const navigate = async (p, { direct = false } = {}) => {
    if (p === page) return;
    const request = ++routeRequest.current;
    if (
      !direct &&
      page === "home" &&
      (p === "studio" || p === "equipment") &&
      flightBridge.current
    ) {
      return flightBridge.current.enter(p === "studio" ? "engine" : "apu");
    }
    activeTransition.current?.skipTransition?.();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const update = () => {
      if (request !== routeRequest.current) return;
      flushSync(() => {
        if (p === "studio" && page === "home") setExploded(true);
        setPage(p);
        setMenu(false);
      });
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    if (document.startViewTransition && !reduced) {
      const transition = document.startViewTransition(update);
      activeTransition.current = transition;
      try {
        await transition.finished;
      } catch {
        /* Superseded by a newer destination. */
      }
    } else if (!reduced) {
      const main = document.getElementById("main");
      update();
      // A single reveal for browsers without the shared-element API.
      await main.animate(
        [
          { opacity: 0, transform: "scale(.92)" },
          { opacity: 1, transform: "scale(1)" },
        ],
        { duration: 1200, easing: "cubic-bezier(.16,1,.3,1)" },
      ).finished;
    } else update();
    if (request !== routeRequest.current) return;
    if (p === "home") flightBridge.current?.reset();
    const heading = document.querySelector("#main h1:not([hidden])");
    if (heading && heading.getClientRects().length) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  };
  const select = (e) => {
    setEngineId(e.unit);
    setEvidence(false);
    setFilter("ALL");
    setQuery("");
  };
  const add = () => {
    if (!chosen.includes(engine.unit)) {
      setChosen([...chosen, engine.unit]);
      notify(`${engine.engine} ajouté à votre sélection`);
    } else {
      setChosen(chosen.filter((x) => x !== engine.unit));
      notify(`${engine.engine} retiré de votre sélection`);
    }
  };
  const [planMode, setPlanMode] = useState("recommended");
  const plan =
    planMode === "recommended"
      ? FLEET.slice(0, capacity)
      : FLEET.filter((e) => chosen.includes(e.unit)).slice(0, capacity);
  const download = () => {
    const cols = [
      "rank",
      "engine",
      "unit",
      "cycle",
      "rul",
      "lower",
      "upper",
      "failure_probability",
      "health",
      "risk",
      "priority",
      "action",
    ];
    const actions = {
      CRITICAL: "Priority inspection",
      WATCH: "Schedule inspection",
      HEALTHY: "Monitor",
    };
    const csv = [
      cols.join(","),
      ...plan.map((e, i) =>
        cols
          .map((c) =>
            c === "rank" ? i + 1 : c === "action" ? actions[e.risk] : e[c],
          )
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "aeropredict-revues.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    notify(`${plan.length} moteurs exportés`);
  };
  const choosePart = (id) => {
    setPartId(id);
  };
  const nextTour = () => {
    const i = parts.findIndex((p) => p.id === partId);
    if (i === 4) {
      setTour(false);
      notify(
        "Exploration terminée. Vous pouvez sélectionner chaque composant.",
      );
    } else setPartId(parts[i + 1].id);
  };
  const nav = [
    ["home", Plane, "Accueil"],
    ["equipment", ScanLine, "Équipements avion"],
    ["overview", LayoutGrid, "Vue d’ensemble"],
    ["studio", Box, "Atelier moteur"],
    ["alerts", Activity, "Points à examiner"],
    ["planner", Layers3, "Préparer les inspections"],
    ["method", BookOpen, "Comprendre les résultats"],
  ];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Aller au contenu
      </a>
      <aside className={"sidebar " + (menu ? "open" : "")}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("home");
          }}
        >
          <span className="brand-mark">
            A<span>↗</span>
          </span>
          <span>
            AeroPredict<small>PREDICTIVE MAINTENANCE</small>
          </span>
        </a>
        <div className="workspace-label">ESPACE DE TRAVAIL</div>
        <nav aria-label="Navigation principale">
          {nav.map(([id, Icon, label]) => (
            <button
              key={id}
              className={"nav-item " + (page === id ? "active" : "")}
              onClick={() => navigate(id)}
              aria-current={page === id ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === "alerts" && <em>{critical + watch}</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="dataset">
            <span className="dataset-mark">N</span>
            <div>
              NASA + scénarios
              <small>100 moteurs · 60 équipements fictifs</small>
            </div>
          </div>
          <p>
            Un atelier pour comprendre.
            <br />
            Des données pour décider.
          </p>
          <button
            className="quiet-link"
            onClick={() => {
              setAboutTab("about");
              navigate("method");
            }}
          >
            À propos du projet <ArrowUpRight size={14} />
          </button>
          <span className="edition">DÉMONSTRATEUR ACADÉMIQUE · V3</span>
        </div>
      </aside>
      {menu && (
        <button
          className="menu-backdrop"
          aria-label="Fermer la navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <div>
            <IconButton
              label="Ouvrir la navigation"
              className="mobile-menu icon-button"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={20} />
            </IconButton>
            <span className="breadcrumb">Espace de travail</span>
            <ChevronRight size={13} />
            <strong>{nav.find((n) => n[0] === page)[2]}</strong>
          </div>
          <div className="topbar-right">
            <span className="snapshot">DONNÉES SIMULÉES</span>
            <span className="avatar">AA</span>
          </div>
        </header>
        <main id="main">
          <div hidden={page !== "home" && page !== "equipment"}>
            <AircraftExperience
              mode={page}
              navigate={navigate}
              flightBridge={flightBridge}
            />
          </div>
          {page === "studio" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    EXPLORER / COMPRENDRE / PRÉPARER
                  </div>
                  <h1>Chaque moteur a une histoire.</h1>
                  <p>
                    Explorez son fonctionnement. Comprenez ce qui mérite votre
                    attention.
                  </p>
                </div>
                <button
                  className="button secondary"
                  onClick={() => {
                    setTour(true);
                    setPartId("fan");
                    setCut(true);
                    setExploded(true);
                  }}
                >
                  Découvrir le moteur <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="studio-layout">
                <section
                  className="engine-list panel"
                  aria-label="Liste des moteurs"
                >
                  <div className="panel-top">
                    <h2>
                      Moteurs <span>{FLEET.length}</span>
                    </h2>
                    <SlidersHorizontal size={16} />
                  </div>
                  <label className="search">
                    <Search size={16} />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Rechercher un moteur"
                      aria-label="Rechercher un moteur"
                    />
                  </label>
                  <div className="list-filter">
                    <button
                      onClick={() => setFilter("ALL")}
                      className={filter === "ALL" ? "selected" : ""}
                    >
                      Tous
                    </button>
                    <button
                      onClick={() => setFilter("CRITICAL")}
                      className={filter === "CRITICAL" ? "selected" : ""}
                    >
                      Prioritaires <span>{critical}</span>
                    </button>
                  </div>
                  <div className="list-scroll">
                    {filtered.length ? (
                      filtered.map((e) => (
                        <button
                          className={
                            "engine-row " +
                            (e.unit === engineId ? "selected" : "")
                          }
                          key={e.unit}
                          onClick={() => select(e)}
                          aria-pressed={e.unit === engineId}
                        >
                          <span className="engine-row-top">
                            <b>{e.engine}</b>
                            <span
                              className={"status-dot " + status[e.risk].cls}
                            />
                          </span>
                          <span className="engine-row-bottom">
                            <span>
                              <strong>{fmt(e.rul)}</strong> cycles estimés
                            </span>
                            <Spark
                              values={DATA.history[String(e.unit)]
                                .filter((_, i) => i % 7 === 0)
                                .map((r) => r[1])}
                              color={
                                e.risk === "CRITICAL" ? "#bf6a4e" : "#789388"
                              }
                              width={50}
                              height={20}
                            />
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="empty">
                        Aucun moteur trouvé.
                        <button
                          onClick={() => {
                            setQuery("");
                            setFilter("ALL");
                          }}
                        >
                          Réinitialiser
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="list-legend">
                    <i className="status-dot critical" />
                    Priorité de revue du moteur
                  </div>
                </section>
                <section className="studio panel" aria-label="Exploration 3D">
                  <div className="studio-top">
                    <div>
                      <span className="eyebrow">
                        TURBORÉACTEUR À DOUBLE FLUX
                      </span>
                      <h2>
                        Au cœur du moteur
                        <span className="model-version">
                          MODÈLE PÉDAGOGIQUE
                        </span>
                      </h2>
                    </div>
                    <IconButton
                      label="Réinitialiser la vue"
                      onClick={() => api.current?.reset()}
                    >
                      <RotateCcw size={17} />
                    </IconButton>
                  </div>
                  <div className="viewport">
                    <div className="viewport-grid" />
                    <span className="view-coordinate">
                      VUE PERSPECTIVE / 01
                    </span>
                    <EngineCanvas
                      apiRef={api}
                      selectedPart={partId}
                      onSelect={choosePart}
                      cut={cut}
                      exploded={exploded}
                      playing={playing}
                      airflow={airflow}
                    />
                    <div className="air-label start">
                      ENTRÉE D’AIR <ArrowRight size={16} />
                    </div>
                    <div className="air-label end">
                      SORTIE DES GAZ <ArrowRight size={16} />
                    </div>
                    <div className="viewport-bottom">
                      <span>Glisser pour tourner · Molette pour zoomer</span>
                      <div>
                        <IconButton
                          label="Zoom avant"
                          onClick={() => api.current?.zoom(0.9)}
                        >
                          <Plus size={16} />
                        </IconButton>
                        <IconButton
                          label="Zoom arrière"
                          onClick={() => api.current?.zoom(1.1)}
                        >
                          <Minus size={16} />
                        </IconButton>
                      </div>
                    </div>
                  </div>
                  <div className="view-tools">
                    <div className="segmented">
                      <button
                        className={!cut && !exploded ? "selected" : ""}
                        onClick={() => {
                          setCut(false);
                          setExploded(false);
                        }}
                      >
                        <Box size={15} />
                        Assemblé
                      </button>
                      <button
                        className={cut && !exploded ? "selected" : ""}
                        onClick={() => {
                          setCut(true);
                          setExploded(false);
                        }}
                      >
                        <ScanLine size={15} />
                        Intérieur
                      </button>
                      <button
                        className={exploded ? "selected" : ""}
                        onClick={() => {
                          setExploded(true);
                          setCut(true);
                        }}
                      >
                        <Layers3 size={15} />
                        Vue éclatée
                      </button>
                    </div>
                    <div className="animation-tools">
                      <IconButton
                        label={
                          playing ? "Arrêter la rotation" : "Animer la rotation"
                        }
                        aria-pressed={playing}
                        onClick={() => setPlaying(!playing)}
                      >
                        {playing ? <Pause size={16} /> : <Play size={16} />}
                      </IconButton>
                      <IconButton
                        label="Afficher le flux d’air pédagogique"
                        aria-pressed={airflow}
                        onClick={() => setAirflow(!airflow)}
                      >
                        <Wind size={18} />
                      </IconButton>
                    </div>
                  </div>
                  <div className="part-strip">
                    {parts.map((p) => (
                      <button
                        className={partId === p.id ? "selected" : ""}
                        key={p.id}
                        onClick={() => {
                          setPartId(partId === p.id ? null : p.id);
                          setTour(false);
                        }}
                        aria-pressed={partId === p.id}
                      >
                        <span>{p.n}</span>
                        <b>
                          {p.name === "Chambre de combustion"
                            ? "Combustion"
                            : p.name}
                        </b>
                      </button>
                    ))}
                  </div>
                  <div className="studio-caption">
                    <Info size={13} />
                    <span>
                      Géométrie simplifiée. La couleur de sélection ne signale
                      pas une panne.
                    </span>
                  </div>
                </section>
                <aside className="insight panel">
                  {part ? (
                    <>
                      <div className="insight-kicker">
                        COMPRENDRE UNE PIÈCE
                        <IconButton
                          label="Revenir au moteur"
                          onClick={() => {
                            setPartId(null);
                            setTour(false);
                          }}
                        >
                          <X size={16} />
                        </IconButton>
                      </div>
                      <div className="part-number">
                        {part.n}
                        <span>/ 05</span>
                      </div>
                      <h2>{part.name}</h2>
                      <div className="part-verb">{part.verb}</div>
                      <p className="part-body">{part.body}</p>
                      <p className="small-copy">{part.detail}</p>
                      <div className="inspection-note">
                        <ScanLine size={19} />
                        <p>{part.inspection}</p>
                      </div>
                      {tour ? (
                        <button
                          className="button primary full"
                          onClick={nextTour}
                        >
                          {partId === "exhaust"
                            ? "Terminer la visite"
                            : "Composant suivant"}
                          <ArrowRight size={16} />
                        </button>
                      ) : (
                        <button
                          className="button secondary full"
                          onClick={() => setPartId(null)}
                        >
                          Revenir à {engine.engine}
                          <ArrowRight size={16} />
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="insight-kicker">
                        MOTEUR SÉLECTIONNÉ <span>↗</span>
                      </div>
                      <div className="engine-title">
                        <h2>{engine.engine}</h2>
                        <Badge risk={engine.risk} />
                      </div>
                      <div className="big-estimate">
                        <strong>{fmt(engine.rul)}</strong>
                        <span>
                          cycles
                          <br />
                          estimés restants
                        </span>
                      </div>
                      <div className="range-bar">
                        <i
                          style={{
                            width:
                              Math.min(100, (engine.rul / 180) * 100) + "%",
                          }}
                        />
                      </div>
                      <div className="range-values">
                        <span>Intervalle estimé</span>
                        <b>
                          {fmt(engine.lower)} à {fmt(engine.upper)} cycles
                        </b>
                      </div>
                      <p className="uncertainty">
                        Une estimation, pas une échéance certaine. L’intervalle
                        représente l’incertitude du modèle.
                      </p>
                      <div
                        className={"recommendation " + status[engine.risk].cls}
                      >
                        <span className="eyebrow">PROCHAINE ÉTAPE</span>
                        <h3>
                          {engine.risk === "CRITICAL"
                            ? "Examiner en priorité"
                            : engine.risk === "WATCH"
                              ? "Préparer une revue"
                              : "Poursuivre le suivi"}
                        </h3>
                        <p>
                          {engine.risk === "CRITICAL"
                            ? "L’estimation non arrondie est inférieure ou égale au seuil de 20 cycles retenu ici."
                            : engine.risk === "WATCH"
                              ? "L’estimation se situe entre 20 et 50 cycles selon la règle de cette démonstration."
                              : "L’estimation dépasse le seuil de surveillance de 50 cycles."}
                        </p>
                      </div>
                      <button
                        className={
                          "button full " +
                          (chosen.includes(engine.unit)
                            ? "secondary"
                            : "primary")
                        }
                        onClick={add}
                      >
                        {chosen.includes(engine.unit) ? (
                          <Check size={16} />
                        ) : (
                          <Plus size={16} />
                        )}{" "}
                        {chosen.includes(engine.unit)
                          ? "Dans ma sélection"
                          : "Ajouter à ma sélection"}
                      </button>
                      <button
                        className="text-button"
                        onClick={() => {
                          setEvidence(true);
                          setTimeout(
                            () =>
                              document
                                .getElementById("evidence")
                                ?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                }),
                            50,
                          );
                        }}
                      >
                        Comprendre cette estimation <ArrowDown size={14} />
                      </button>
                      <div className="observed">
                        Dernière observation <b>Cycle {engine.cycle}</b>
                      </div>
                    </>
                  )}
                </aside>
              </div>
              <section className="lower-grid" id="evidence">
                <div className="panel trajectory">
                  <div className="section-header">
                    <div>
                      <span className="eyebrow">
                        {engine.engine} / HISTORIQUE
                      </span>
                      <h2>Comment l’estimation évolue</h2>
                    </div>
                    <span className="chart-key">
                      <i />
                      Durée restante estimée
                    </span>
                  </div>
                  <Chart rows={rows} />
                </div>
                <div className="panel next-step">
                  <span className="eyebrow">DE L’OBSERVATION À LA REVUE</span>
                  <h2>
                    Une priorité.
                    <br />
                    Une raison claire.
                  </h2>
                  <p>
                    {critical} moteurs sont à examiner en priorité. Préparez une
                    liste adaptée à votre capacité de revue.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => navigate("planner")}
                  >
                    Préparer les inspections <ArrowUpRight size={17} />
                  </button>
                </div>
              </section>
              <button
                className="disclosure"
                onClick={() => setEvidence(!evidence)}
                aria-expanded={evidence}
              >
                <Activity size={17} /> {evidence ? "Masquer" : "Afficher"} les
                mesures et les détails du modèle{" "}
                <span>{evidence ? "−" : "+"}</span>
              </button>
              {evidence && (
                <section className="panel evidence">
                  <div className="section-header">
                    <h2>Mesures observées</h2>
                    <select
                      aria-label="Capteur à afficher"
                      value={sensor}
                      onChange={(e) => setSensor(e.target.value)}
                    >
                      <option value="s4">Capteur S4</option>
                      <option value="s11">Capteur S11</option>
                    </select>
                  </div>
                  <Chart rows={rows} type={sensor} />
                  <p className="small-copy">
                    S4 et S11 sont les identifiants du jeu NASA. Leur évolution
                    ne localise pas une panne sur la maquette.
                  </p>
                  <div className="detail-metrics">
                    <span>
                      Score de santé construit <b>{fmt(engine.health)} / 100</b>
                    </span>
                    <span>
                      Sortie du classifieur à 30 cycles{" "}
                      <b>{fmt(engine.failure_probability * 100, 1)} %</b>
                    </span>
                    <span>
                      Score de priorité <b>{fmt(engine.priority)} / 100</b>
                    </span>
                  </div>
                  <p className="small-copy">
                    La sortie du classifieur n’est pas une probabilité de panne
                    calibrée pour un avion réel. Le score de santé est une
                    transformation de la durée restante estimée.
                  </p>
                </section>
              )}
            </>
          )}
          {page === "overview" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">100 MOTEURS / UN INSTANTANÉ</span>
                  <h1>L’essentiel, à portée de regard.</h1>
                  <p>
                    Repérez les moteurs à examiner dans le jeu de simulation
                    NASA.
                  </p>
                </div>
                <button
                  className="button primary"
                  onClick={() => navigate("studio")}
                >
                  Ouvrir l’atelier <ArrowUpRight size={17} />
                </button>
              </div>
              <div className="overview-summary">
                <div className="summary-main">
                  <span className="eyebrow">
                    MOTEURS NÉCESSITANT UNE ATTENTION
                  </span>
                  <div className="summary-number">
                    {critical + watch}
                    <span>/ 100</span>
                  </div>
                  <p>
                    <b>{critical} prioritaires</b> et {watch} à surveiller selon
                    les seuils du démonstrateur.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => {
                      setFilter("CRITICAL");
                      navigate("alerts");
                    }}
                  >
                    Voir les priorités <ArrowRight size={18} />
                  </button>
                </div>
                <div className="fleet-map">
                  <div className="section-header">
                    <h2>La flotte, moteur par moteur</h2>
                    <span className="small-copy">Cliquez pour explorer</span>
                  </div>
                  <div className="engine-grid">
                    {[...FLEET]
                      .sort((a, b) => a.unit - b.unit)
                      .map((e) => (
                        <button
                          title={`${e.engine} · ${status[e.risk].label} · ${fmt(e.rul)} cycles`}
                          aria-label={`${e.engine}, ${status[e.risk].label}, explorer`}
                          key={e.unit}
                          className={status[e.risk].cls}
                          onClick={() => {
                            select(e);
                            navigate("studio");
                          }}
                        >
                          {String(e.unit).padStart(2, "0")}
                        </button>
                      ))}
                  </div>
                  <div className="map-legend">
                    {Object.keys(status).map((s) => (
                      <span key={s}>
                        <i className={"status-dot " + status[s].cls} />
                        {status[s].label} ·{" "}
                        {FLEET.filter((e) => e.risk === s).length}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="section-heading">
                <h2>À examiner en premier</h2>
                <button
                  className="text-button"
                  onClick={() => {
                    setFilter("ALL");
                    navigate("alerts");
                  }}
                >
                  Toute la liste <ArrowRight size={16} />
                </button>
              </div>
              <EngineTable
                list={FLEET.slice(0, 5)}
                onOpen={(e) => {
                  select(e);
                  navigate("studio");
                }}
              />
              <div className="overview-note">
                <Info size={19} />
                <p>
                  Les 100 moteurs appartiennent à un jeu de simulation. Cette
                  vue n’est ni une flotte réelle ni un suivi en temps réel.
                </p>
              </div>
            </>
          )}
          {page === "alerts" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">COMPRENDRE LES PRIORITÉS</span>
                  <h1>Ce qui mérite votre attention.</h1>
                  <p>
                    Chaque moteur est classé selon son estimation et une règle
                    explicite.
                  </p>
                </div>
                <span className="count-label">
                  {critical + watch} moteurs à examiner
                </span>
              </div>
              <div className="filter-bar">
                <label className="search">
                  <Search size={17} />
                  <input
                    aria-label="Rechercher dans les alertes"
                    placeholder="Rechercher un moteur"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <div className="segmented">
                  {[
                    ["ALL", "Toutes les alertes"],
                    ["CRITICAL", "Prioritaires"],
                    ["WATCH", "À surveiller"],
                  ].map(([v, l]) => (
                    <button
                      className={filter === v ? "selected" : ""}
                      key={v}
                      onClick={() => setFilter(v)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <button
                  className="quiet-link"
                  onClick={() => {
                    setFilter("ALL");
                    setQuery("");
                  }}
                >
                  Réinitialiser
                </button>
              </div>
              <EngineTable
                list={filtered.filter((e) => e.risk !== "HEALTHY")}
                onOpen={(e) => {
                  select(e);
                  setPartId(null);
                  navigate("studio");
                }}
              />
              <details className="explanation">
                <summary>Comment sont définies les alertes ?</summary>
                <p>
                  Prioritaire : durée restante estimée inférieure ou égale à 20
                  cycles. À surveiller : supérieure à 20 et inférieure ou égale
                  à 50 cycles. L’ordre repose sur la borne basse de
                  l’intervalle, puis l’estimation et l’identifiant du moteur.
                  Une alerte n’est pas un diagnostic de pièce.
                </p>
              </details>
            </>
          )}
          {page === "planner" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    PRÉPARER / COMPARER / EXPORTER
                  </span>
                  <h1>La bonne revue, dans le bon ordre.</h1>
                  <p>
                    Construisez une liste de moteurs à examiner. La capacité est
                    un scénario, pas un planning d’atelier réel.
                  </p>
                </div>
                <button
                  className="button primary"
                  disabled={!plan.length}
                  onClick={download}
                >
                  <Download size={16} />
                  Exporter la liste
                </button>
              </div>
              <div className="planner-controls panel">
                <div>
                  <span className="eyebrow">CAPACITÉ DE REVUE</span>
                  <h2>Combien de moteurs souhaitez-vous examiner ?</h2>
                  <div className="capacity">
                    <IconButton
                      label="Réduire la capacité"
                      disabled={capacity <= 1}
                      onClick={() => setCapacity(Math.max(1, capacity - 1))}
                    >
                      <Minus size={18} />
                    </IconButton>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      aria-label="Capacité de revue"
                      value={capacity}
                      onChange={(e) =>
                        setCapacity(
                          Math.min(
                            100,
                            Math.max(1, Number(e.target.value) || 1),
                          ),
                        )
                      }
                    />
                    <IconButton
                      label="Augmenter la capacité"
                      disabled={capacity >= 100}
                      onClick={() => setCapacity(Math.min(100, capacity + 1))}
                    >
                      <Plus size={18} />
                    </IconButton>
                    <span>moteurs</span>
                  </div>
                  <input
                    className="capacity-range"
                    aria-label="Ajuster la capacité"
                    type="range"
                    min="1"
                    max="100"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                  />
                </div>
                <div className="plan-impact">
                  <span className="eyebrow">DANS CETTE LISTE</span>
                  <div>
                    <strong>
                      {plan.filter((e) => e.risk === "CRITICAL").length}
                    </strong>
                    <span>
                      moteurs
                      <br />
                      prioritaires
                    </span>
                  </div>
                  <p>
                    {Math.max(
                      0,
                      critical -
                        plan.filter((e) => e.risk === "CRITICAL").length,
                    )}{" "}
                    autres moteurs prioritaires restent hors de cette liste.
                  </p>
                </div>
              </div>
              <div className="section-heading">
                <div className="segmented">
                  <button
                    className={planMode === "recommended" ? "selected" : ""}
                    onClick={() => setPlanMode("recommended")}
                  >
                    Ordre recommandé
                  </button>
                  <button
                    className={planMode === "selection" ? "selected" : ""}
                    onClick={() => setPlanMode("selection")}
                  >
                    Ma sélection ({chosen.length})
                  </button>
                </div>
                <span className="small-copy">
                  {plan.length} moteurs retenus · capacité {capacity}
                </span>
              </div>
              {planMode === "selection" && (
                <p className="small-copy">
                  Sélection conservée pendant cette visite. Ajoutez ou retirez
                  un moteur depuis sa fiche. L’export permet d’en garder une
                  copie.
                </p>
              )}
              <EngineTable
                list={plan}
                ranked
                onOpen={(e) => {
                  select(e);
                  navigate("studio");
                }}
              />
              {!plan.length && (
                <button
                  className="button secondary"
                  onClick={() => navigate("studio")}
                >
                  Choisir des moteurs <ArrowRight size={16} />
                </button>
              )}
              <details className="explanation">
                <summary>Pourquoi cet ordre ?</summary>
                <p>
                  Le score de priorité repose sur la borne basse de la durée
                  restante, limitée entre 0 et 125 cycles. Quand plusieurs
                  moteurs ont le même score, la durée restante estimée les
                  départage, puis leur identifiant. La vérité finale du jeu de
                  test n’entre jamais dans cette sélection. Ce fichier est une
                  liste de revue, pas un ordre de maintenance.
                </p>
              </details>
            </>
          )}
          {page === "method" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    TRANSPARENCE / REPRODUCTIBILITÉ
                  </span>
                  <h1>Comprendre avant de faire confiance.</h1>
                  <p>
                    Les résultats, les hypothèses et les limites du
                    démonstrateur.
                  </p>
                </div>
              </div>
              <div className="segmented method-tabs">
                {[
                  ["results", "Résultats du modèle"],
                  ["data", "Données et méthode"],
                  ["about", "À propos"],
                ].map(([v, l]) => (
                  <button
                    key={v}
                    className={aboutTab === v ? "selected" : ""}
                    onClick={() => setAboutTab(v)}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {aboutTab === "results" ? (
                <>
                  <div className="metrics-grid">
                    {[
                      [
                        "Erreur absolue moyenne",
                        DATA.metrics.test_raw.MAE,
                        "cycles",
                      ],
                      [
                        "Erreur quadratique moyenne",
                        DATA.metrics.test_raw.RMSE,
                        "cycles",
                      ],
                      [
                        "Variance expliquée",
                        DATA.metrics.test_raw.R2 * 100,
                        "%",
                      ],
                    ].map(([l, v, u]) => (
                      <div className="metric" key={l}>
                        <span>{l}</span>
                        <strong>
                          {fmt(v, 2)} <small>{u}</small>
                        </strong>
                      </div>
                    ))}
                  </div>
                  <div className="method-columns">
                    <section className="panel prose">
                      <span className="eyebrow">MODÈLE RETENU</span>
                      <h2>Forêt aléatoire</h2>
                      <p>
                        Sélection sur un groupe de moteurs de validation séparé,
                        puis évaluation sur les 100 moteurs du test officiel
                        FD001. La vérité du test n’est pas plafonnée pour les
                        résultats présentés ici.
                      </p>
                      <h3>Lire les intervalles</h3>
                      <p>
                        La couverture observée est de{" "}
                        {fmt(DATA.metrics.interval.test_coverage * 100)} %, pour
                        une cible nominale de{" "}
                        {fmt(DATA.metrics.interval.nominal_coverage * 100)} %.
                        Le rayon est d’environ{" "}
                        {fmt(DATA.metrics.interval.radius, 1)} cycles : ces
                        intervalles sont larges.
                      </p>
                      <p>
                        Une couverture élevée ne garantit pas la sécurité d’un
                        moteur individuel.
                      </p>
                    </section>
                    <section className="panel prose">
                      <span className="eyebrow">
                        CLASSIFICATION À 30 CYCLES
                      </span>
                      <h2>Détection sur le jeu de test</h2>
                      <dl>
                        {[
                          ["Rappel", DATA.metrics.classification.recall],
                          ["Précision", DATA.metrics.classification.precision],
                          ["Score F1", DATA.metrics.classification.F1],
                        ].map(([l, v]) => (
                          <div key={l}>
                            <dt>{l}</dt>
                            <dd>{fmt(v * 100, 1)} %</dd>
                          </div>
                        ))}
                      </dl>
                      <p>
                        Le pourcentage fourni pour un moteur est une sortie de
                        classification. Il n’a pas été calibré comme probabilité
                        de panne pour un moteur réel.
                      </p>
                    </section>
                  </div>
                </>
              ) : aboutTab === "data" ? (
                <div className="method-columns">
                  <section className="panel prose">
                    <span className="eyebrow">NASA C-MAPSS / FD001</span>
                    <h2>Des trajectoires de simulation</h2>
                    <p>
                      100 moteurs d’entraînement, 100 moteurs de test. 20 631
                      observations d’entraînement et 13 096 observations de
                      test. Un régime de fonctionnement et un mode de
                      dégradation dans FD001.
                    </p>
                    <h3>Une séparation par moteur</h3>
                    <p>
                      60 moteurs pour l’ajustement, 20 pour la sélection et 20
                      pour la calibration. Les variables temporelles utilisent
                      uniquement le présent et le passé du moteur concerné.
                    </p>
                    <a
                      href="https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Consulter la source NASA <ArrowUpRight size={15} />
                    </a>
                  </section>
                  <section className="panel prose">
                    <h2>Ce que montre la 3D</h2>
                    <p>
                      Une maquette originale et simplifiée des principaux
                      ensembles d’un turboréacteur à double flux. Elle permet de
                      comprendre le circuit de l’air et le rôle des composants.
                    </p>
                    <p>
                      La géométrie n’est pas celle d’un moteur certifié. La
                      rotation et les flux sont des illustrations, sans vitesse
                      physique simulée. Aucune donnée du modèle ne permet de
                      déclarer une pièce précise défectueuse.
                    </p>
                    <h3>Ce qui reste à valider</h3>
                    <p>
                      Robustesse sur d’autres données, incertitude et validation
                      industrielle. Aucun gain financier réel ni usage
                      opérationnel n’est démontré.
                    </p>
                  </section>
                </div>
              ) : (
                <section className="panel prose about">
                  <span className="eyebrow">AEROPREDICT / ENGINE STUDIO</span>
                  <h2>Relier la donnée à la compréhension.</h2>
                  <p>
                    Un projet académique indépendant d’Ali Abdelhamid, développé
                    pour explorer la maintenance prédictive et rendre ses
                    résultats accessibles.
                  </p>
                  <p>
                    Inspiré des principes publics de maintenance prédictive
                    aéronautique. Sans affiliation avec Air France-KLM ou AFI
                    KLM E&M, et sans reproduction d’algorithmes propriétaires de
                    PROGNOS.
                  </p>
                  <p>
                    Les données publiques NASA, le code, les modèles et la
                    documentation permettent d’examiner le travail et ses
                    limites.
                  </p>
                  <a
                    href="https://github.com/A1i-lab/aeropredict-mro"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Code, notebooks et documentation <ArrowUpRight size={16} />
                  </a>
                  <div className="about-signature">
                    ALI ABDELHAMID{" "}
                    <span>DATA SCIENCE / MAINTENANCE PRÉDICTIVE</span>
                  </div>
                </section>
              )}
            </>
          )}
          <footer>
            <span>
              AEROPREDICT <b>/</b> ENGINE STUDIO
            </span>
            <span>
              Données NASA simulées. Démonstrateur indépendant, sans usage
              opérationnel.
            </span>
            <button
              onClick={() => {
                setAboutTab("about");
                navigate("method");
              }}
            >
              Méthode & limites <ArrowUpRight size={12} />
            </button>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
function EngineTable({ list, onOpen, ranked = false }) {
  return (
    <div className="table-wrap panel">
      <table>
        <thead>
          <tr>
            {ranked && <th>Ordre</th>}
            <th>Moteur</th>
            <th>Statut</th>
            <th>Durée restante estimée</th>
            <th>Intervalle estimé</th>
            <th>Évolution</th>
            <th>
              <span className="sr-only">Explorer</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {list.map((e, i) => (
            <tr key={e.unit}>
              {ranked && (
                <td className="rank">{String(i + 1).padStart(2, "0")}</td>
              )}
              <td>
                <button className="engine-link" onClick={() => onOpen(e)}>
                  {e.engine}
                </button>
                <small>Observé au cycle {e.cycle}</small>
              </td>
              <td>
                <Badge risk={e.risk} />
              </td>
              <td>
                <strong>{fmt(e.rul, 1)}</strong>{" "}
                <span className="muted">cycles</span>
              </td>
              <td>
                {fmt(e.lower)} à {fmt(e.upper)}{" "}
                <span className="muted">cycles</span>
              </td>
              <td>
                <Spark
                  values={DATA.history[String(e.unit)]
                    .filter((_, i) => i % 5 === 0)
                    .map((r) => r[1])}
                />
              </td>
              <td>
                <IconButton
                  label={`Explorer ${e.engine}`}
                  onClick={() => onOpen(e)}
                >
                  <ArrowUpRight size={18} />
                </IconButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!list.length && (
        <div className="empty">
          <Search size={24} />
          <h3>Aucun moteur dans cette liste</h3>
          <p>Modifiez vos filtres ou ajoutez un moteur depuis l’atelier.</p>
        </div>
      )}
    </div>
  );
}
class Boundary extends React.Component {
  constructor(p) {
    super(p);
    this.state = { error: false };
  }
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="empty">
        <h1>L’atelier n’a pas pu se charger.</h1>
        <p>
          Rechargez la page. Les analyses classiques restent disponibles dans le
          lien sous l’atelier.
        </p>
        <button onClick={() => location.reload()}>Réessayer</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")).render(
  <Boundary>
    <App />
  </Boundary>,
);

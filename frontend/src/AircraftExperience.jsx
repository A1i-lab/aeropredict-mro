import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  RotateCcw,
  Check,
  Download,
  Plane,
  Activity,
  ChevronRight,
} from "lucide-react";
import { createAircraft, ZONES } from "./aircraft";
import AIRCRAFT from "./aircraft-data.json";
import { predict, STATUS } from "./prediction";
import "./aircraft.css";
const systems = AIRCRAFT.systems;
const aircraftIds = [...new Set(AIRCRAFT.records.map((r) => r.aircraft))];
const num = (n, d = 1) =>
  Number(n).toLocaleString("fr-FR", { maximumFractionDigits: d });
const horizon = (p) =>
  p.cycles === null
    ? "Non estimable"
    : p.cycles > 120
      ? "> 120 cycles"
      : `${Math.ceil(p.cycles)} cycles`;
function Trend({ history, system }) {
  const p = predict(history, system.limit),
    last = history.at(-1),
    end = last.cycle + Math.min(120, p.cycles ?? 30);
  const ymin = system.baseline,
    ymax = Math.max(system.limit * 1.12, ...history.map((p) => p.value)) * 1.03;
  const x = (v) => 48 + ((v - 1) / (Math.max(61, end) - 1)) * 584,
    y = (v) => 190 - ((v - ymin) / (ymax - ymin)) * 165;
  const line = history
    .map((v, i) => `${i ? "L" : "M"}${x(v.cycle)},${y(v.value)}`)
    .join(" ");
  return (
    <div className="equipment-trend">
      <svg
        viewBox="0 0 660 235"
        role="img"
        aria-label={`${system.metric} : observations simulées et projection linéaire vers un seuil illustratif`}
      >
        {[ymin, (system.limit + ymin) / 2, system.limit].map((v) => (
          <g key={v}>
            <line x1="48" x2="632" y1={y(v)} y2={y(v)} stroke="#dfe6e1" />
            <text x="40" y={y(v) + 4} textAnchor="end">
              {num(v)}
            </text>
          </g>
        ))}
        <rect
          x={x(last.cycle)}
          y="12"
          width={632 - x(last.cycle)}
          height="178"
          fill="#ebf1ec"
        />
        <line
          x1="48"
          x2="632"
          y1={y(system.limit)}
          y2={y(system.limit)}
          stroke="#b57b48"
          strokeDasharray="4 4"
        />
        <path d={line} fill="none" stroke="#2f6658" strokeWidth="2.5" />
        {p.fitted !== undefined && (
          <path
            d={`M${x(last.cycle)},${y(p.fitted)}L${x(end)},${y(p.fitted + p.slope * (end - last.cycle))}`}
            stroke="#507b68"
            strokeWidth="2"
            strokeDasharray="5 4"
            fill="none"
          />
        )}
        <circle cx={x(last.cycle)} cy={y(last.value)} r="4" fill="#2f6658" />
        {[1, last.cycle, Math.max(61, end)].map((v, i) => (
          <text key={i} x={x(v)} y="213" textAnchor="middle">
            {Math.round(v)}
          </text>
        ))}
        <text x="50" y="12">
          {system.unit}
        </text>
        <text x="632" y="232" textAnchor="end">
          Cycles de scénario
        </text>
      </svg>
      <div className="trend-legend">
        <span>● Signal simulé</span>
        <span>┄ Projection</span>
        <span>
          Seuil illustratif : {system.limit} {system.unit}
        </span>
      </div>
    </div>
  );
}
export function AircraftExperience({ mode, navigate }) {
  const [zone, setZone] = useState(null),
    [aircraft, setAircraft] = useState("DEMO-001"),
    [systemId, setSystemId] = useState("apu"),
    [cycle, setCycle] = useState(60),
    [statusFilter, setStatusFilter] = useState("all"),
    [queue, setQueue] = useState([]),
    [queueOnly, setQueueOnly] = useState(false),
    [reviewed, setReviewed] = useState([]),
    [notice, setNotice] = useState("");
  const host = useRef(null),
    api = useRef(null),
    selectRef = useRef(setZone);
  useEffect(() => {
    try {
      api.current = createAircraft(host.current, (id) => selectRef.current(id));
    } catch {
      setNotice(
        "La vue 3D n’est pas disponible. Tous les équipements restent accessibles par les boutons.",
      );
    }
    return () => api.current?.dispose();
  }, []);
  useEffect(() => {
    api.current?.focus(zone);
  }, [zone]);
  const selected = systems.find((s) => s.id === zone);
  const record = AIRCRAFT.records.find(
    (r) => r.aircraft === aircraft && r.system === systemId,
  );
  const system = systems.find((s) => s.id === systemId),
    history = record.history.slice(0, cycle),
    prediction = predict(history, system.limit);
  const all = AIRCRAFT.records
    .map((r) => ({
      ...r,
      p: predict(r.history, systems.find((s) => s.id === r.system).limit),
    }))
    .sort(
      (a, b) =>
        (a.p.cycles ?? Infinity) - (b.p.cycles ?? Infinity) ||
        a.id.localeCompare(b.id),
    );
  const filtered = all.filter(
    (r) =>
      (statusFilter === "all" || r.p.status === statusFilter) &&
      (!queueOnly || queue.includes(r.id)),
  );
  function openEquipment(id, ac = aircraft) {
    setSystemId(id);
    setAircraft(ac);
    setCycle(60);
    navigate("equipment");
  }
  function toggleQueue() {
    setQueue((q) =>
      q.includes(record.id)
        ? q.filter((id) => id !== record.id)
        : [...q, record.id],
    );
  }
  function download() {
    const rows = all.filter((r) => queue.includes(r.id));
    const lines = [
      [
        "aircraft",
        "equipment",
        "source",
        "signal",
        "unit",
        "illustrative_threshold",
        "projected_cycles_to_threshold",
        "review_status",
      ],
      ...rows.map((r) => {
        const s = systems.find((s) => s.id === r.system);
        return [
          r.aircraft,
          r.system,
          "synthetic-v1",
          r.history.at(-1).value,
          s.unit,
          s.limit,
          r.p.cycles === null ? "" : r.p.cycles.toFixed(2),
          reviewed.includes(r.id) ? "reviewed_in_demo" : "to_review",
        ];
      }),
    ];
    const csv = lines
      .map((row) =>
        row.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "aeropredict-equipements-simules.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="aircraft-experience">
      <section hidden={mode !== "home"}>
        <div className="welcome-heading">
          <div>
            <span className="eyebrow">
              LA MAINTENANCE PRÉDICTIVE, RENDUE VISIBLE
            </span>
            <h1>
              Comprendre les signaux.
              <br />
              <span>Anticiper la maintenance.</span>
            </h1>
          </div>
          <p>
            AeroPredict transforme des historiques de capteurs en tendances et
            en priorités de revue. Explorez l’avion, suivez un équipement et
            préparez les inspections à examiner.
          </p>
        </div>
        <div className="aircraft-stage">
          <div className="aircraft-visual">
            <div className="aircraft-caption">
              <span>
                <Plane size={18} /> A320 · EXPLORATION DES SYSTÈMES
              </span>
              <button
                className="icon-button"
                aria-label="Revenir à la vue complète de l’avion"
                onClick={() => {
                  setZone(null);
                  api.current?.focus(null);
                }}
              >
                <RotateCcw size={17} />
              </button>
            </div>
            <div className="aircraft-canvas" ref={host} />
            <div className="aircraft-scale">
              <span>Glisser pour tourner · Molette pour zoomer</span>
              <span>Maquette stylisée, positions indicatives</span>
            </div>
          </div>
          <aside className="aircraft-story" key={zone || "intro"}>
            <span className="eyebrow">
              {zone ? "EXPLORER UN ÉQUIPEMENT" : "BIENVENUE À BORD"}
            </span>
            <span className="story-number">
              {zone
                ? String(ZONES.findIndex((z) => z.id === zone) + 1).padStart(
                    2,
                    "0",
                  )
                : "01"}
              <small> / 06</small>
            </span>
            <h2>
              {zone === "engine"
                ? "Le moteur"
                : selected?.name || "De l’avion à la pièce."}
            </h2>
            <p>
              {zone === "engine"
                ? "Suivez l’évolution d’une estimation de durée restante à partir du jeu de simulation NASA C-MAPSS."
                : selected?.purpose ||
                  "Chaque équipement raconte une partie de l’état de l’avion. Choisissez un repère pour découvrir son rôle et les signaux que l’on peut suivre."}
            </p>
            <div className="story-note">
              {zone === "engine"
                ? "100 moteurs NASA indépendants. Ils ne sont pas les moteurs de cet A320."
                : selected
                  ? `${selected.location}. ${selected.observation}`
                  : "La maintenance prédictive consiste à repérer une évolution avant qu’elle ne devienne un problème, puis à faire examiner les éléments utiles."}
            </div>
            <button
              className="button primary"
              onClick={() =>
                zone === "engine"
                  ? navigate("studio")
                  : selected
                    ? openEquipment(zone)
                    : setZone("engine")
              }
            >
              {zone ? "Ouvrir le suivi" : "Explorer le moteur"}
              <ArrowRight size={17} />
            </button>
            <small>
              {zone === "engine"
                ? "Prédictions évaluées sur des simulations NASA"
                : selected
                  ? "Scénario synthétique · seuil non constructeur"
                  : "Projet indépendant · aucune affiliation constructeur ou compagnie"}
            </small>
          </aside>
        </div>
        {notice && <p role="status">{notice}</p>}
        <div className="aircraft-zones" aria-label="Équipements de l’avion">
          {ZONES.map((z, i) => (
            <button
              key={z.id}
              aria-pressed={zone === z.id}
              onClick={() => setZone(z.id)}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              {z.name}
              <ArrowUpRight size={15} />
            </button>
          ))}
        </div>
        <div className="welcome-steps">
          <article>
            <span>01 / OBSERVER</span>
            <h3>Lire les signaux.</h3>
            <p>
              Consultez les historiques de fonctionnement et distinguez une
              fluctuation d’une tendance persistante.
            </p>
          </article>
          <article>
            <span>02 / ANTICIPER</span>
            <h3>Comprendre l’évolution.</h3>
            <p>
              Explorez les estimations moteur ou la projection d’un signal vers
              un seuil de scénario.
            </p>
          </article>
          <article>
            <span>03 / PRÉPARER</span>
            <h3>Organiser la revue.</h3>
            <p>
              Sélectionnez les équipements à examiner et exportez une liste
              accompagnée de ses données sources.
            </p>
          </article>
        </div>
        <div className="evidence-entry">
          <div>
            <span className="eyebrow">DEUX SOURCES, UNE LECTURE CLAIRE</span>
            <h2>Un démonstrateur que l’on peut expliquer.</h2>
            <p>
              100 moteurs issus de NASA C-MAPSS pour les modèles évalués. 60
              équipements synthétiques répartis sur 12 avions fictifs pour
              explorer cinq autres systèmes. Aucun suivi de flotte réelle.
            </p>
          </div>
          <div>
            <button className="button" onClick={() => navigate("equipment")}>
              Explorer les équipements <ArrowRight size={16} />
            </button>
            <button className="quiet-link" onClick={() => navigate("method")}>
              Voir les résultats des modèles NASA <ArrowUpRight size={15} />
            </button>
            <a
              href="https://www.afiklmem.com/en/solutions/about-prognos"
              target="_blank"
              rel="noreferrer"
            >
              Découvrir PROGNOS®, source d’inspiration métier ↗
            </a>
          </div>
        </div>
      </section>
      {mode === "equipment" && (
        <section>
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                SUIVI MULTI-ÉQUIPEMENTS / SCÉNARIOS SYNTHÉTIQUES
              </span>
              <h1>Du signal à la revue.</h1>
              <p>
                Explorez 12 avions fictifs et cinq systèmes. Les seuils servent
                à la démonstration.
              </p>
            </div>
            <button className="button" onClick={() => navigate("home")}>
              <Plane size={17} /> Retour à l’avion
            </button>
          </div>
          <div className="equipment-selectors">
            <label>
              Avion de scénario
              <select
                value={aircraft}
                onChange={(e) => {
                  setAircraft(e.target.value);
                  setCycle(60);
                }}
              >
                {aircraftIds.map((id) => (
                  <option key={id}>{id}</option>
                ))}
              </select>
            </label>
            <label>
              Équipement
              <select
                value={systemId}
                onChange={(e) => {
                  setSystemId(e.target.value);
                  setCycle(60);
                }}
              >
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="synthetic-label">
              SOURCE SYNTHETIC-V1
              <br />
              <span>60 cycles observés par équipement</span>
            </div>
          </div>
          <div className="equipment-detail">
            <div className="equipment-history">
              <span className="eyebrow">
                {aircraft} / {system.short.toUpperCase()}
              </span>
              <h2>{system.metric}</h2>
              <Trend history={history} system={system} />
              <label className="history-slider">
                Rejouer l’historique <strong>Cycle {cycle} / 60</strong>
                <input
                  aria-label="Cycle observé de l’équipement"
                  type="range"
                  min="20"
                  max="60"
                  value={cycle}
                  onChange={(e) => setCycle(Number(e.target.value))}
                />
              </label>
              <p className="equipment-explanation">
                {system.observation} La projection utilise uniquement les
                observations disponibles jusqu’au cycle {cycle}.
              </p>
            </div>
            <aside className="equipment-insight">
              <span className={"equipment-status " + prediction.status}>
                {STATUS[prediction.status]}
              </span>
              <h2>{horizon(prediction)}</h2>
              <p>
                avant le seuil illustratif, si la tendance linéaire se poursuit.
              </p>
              <dl>
                <div>
                  <dt>Dernier signal</dt>
                  <dd>
                    {num(history.at(-1).value)} {system.unit}
                  </dd>
                </div>
                <div>
                  <dt>Seuil du scénario</dt>
                  <dd>
                    {system.limit} {system.unit}
                  </dd>
                </div>
                <div>
                  <dt>Tendance par cycle</dt>
                  <dd>
                    {num(prediction.slope, 3)} {system.unit}
                  </dd>
                </div>
              </dl>
              <p>{system.review}</p>
              <button className="button primary" onClick={toggleQueue}>
                {queue.includes(record.id) ? (
                  <Check size={16} />
                ) : (
                  <Activity size={16} />
                )}{" "}
                {queue.includes(record.id)
                  ? "Retirer de ma revue"
                  : "Ajouter à ma revue"}
              </button>
              <small>
                La liste exporte l’instantané final au cycle 60. Sélection
                conservée pendant cette visite.
              </small>
            </aside>
          </div>
          <details className="equipment-method">
            <summary>Comment cette projection est-elle calculée ?</summary>
            <p>
              {AIRCRAFT.method} Les valeurs et les seuils sont inventés pour la
              démonstration : ils ne représentent ni des limites de maintenance
              A320 ni une probabilité de panne.
            </p>
            <p>
              Une droite est ajustée aux 20 derniers cycles. On calcule son
              intersection avec le seuil. « À examiner » signifie 20 cycles ou
              moins, « À surveiller » 50 cycles ou moins. Ces catégories sont
              des règles de démonstration. Si la pente est nulle ou négative,
              aucun délai de franchissement n’est estimé.
            </p>
            <p>
              La projection n’est pas une durée de vie certifiée. Elle n’intègre
              ni contexte opérationnel réel ni modèle causal. Les scores NASA de
              la rubrique résultats concernent uniquement les moteurs NASA.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Cycle</th>
                  <th>
                    {system.metric} ({system.unit})
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.slice(-20).map((p) => (
                  <tr key={p.cycle}>
                    <td>{p.cycle}</td>
                    <td>{num(p.value, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
          <div className="equipment-list-heading">
            <div>
              <span className="eyebrow">
                LES 60 ÉQUIPEMENTS / INSTANTANÉ AU CYCLE 60
              </span>
              <h2>Préparer une revue documentée.</h2>
            </div>
            <button
              className="button"
              disabled={!queue.length}
              onClick={download}
            >
              <Download size={16} /> Exporter ma revue ({queue.length})
            </button>
          </div>
          <div className="equipment-list-filters">
            <label>
              Priorité
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tous les équipements</option>
                {Object.entries(STATUS)
                  .filter(([s]) => s !== "insufficient")
                  .map(([s, l]) => (
                    <option key={s} value={s}>
                      {l}
                    </option>
                  ))}
              </select>
            </label>
            <button
              className="button"
              aria-pressed={queueOnly}
              onClick={() => setQueueOnly(!queueOnly)}
            >
              {queueOnly
                ? "Afficher tous les équipements"
                : `Ma revue (${queue.length})`}
            </button>
            <span>
              {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="equipment-records">
            {filtered.length === 0 ? (
              <p>
                Aucun équipement dans cette vue. Ajoutez un équipement à votre
                revue ou changez le filtre.
              </p>
            ) : (
              filtered.map((r) => {
                const s = systems.find((s) => s.id === r.system);
                return (
                  <article
                    key={r.id}
                    className={r.id === record.id ? "selected" : ""}
                  >
                    <button onClick={() => openEquipment(r.system, r.aircraft)}>
                      <span>
                        {r.aircraft}
                        <small>{s.name}</small>
                      </span>
                      <span className={"equipment-status " + r.p.status}>
                        {STATUS[r.p.status]}
                      </span>
                      <span>
                        {horizon(r.p)}
                        <small>vers le seuil illustratif</small>
                      </span>
                      <ChevronRight size={17} />
                    </button>
                    <label>
                      <input
                        type="checkbox"
                        checked={queue.includes(r.id)}
                        onChange={() =>
                          setQueue((q) =>
                            q.includes(r.id)
                              ? q.filter((id) => id !== r.id)
                              : [...q, r.id],
                          )
                        }
                      />{" "}
                      Sélectionner {r.aircraft} {s.short}
                    </label>
                    {queue.includes(r.id) && (
                      <button
                        className="review-mark"
                        onClick={() =>
                          setReviewed((v) =>
                            v.includes(r.id)
                              ? v.filter((id) => id !== r.id)
                              : [...v, r.id],
                          )
                        }
                      >
                        {reviewed.includes(r.id)
                          ? "Examiné dans la démo ✓"
                          : "Marquer examiné"}
                      </button>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>
      )}
    </div>
  );
}

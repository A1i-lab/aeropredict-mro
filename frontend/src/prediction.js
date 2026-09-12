// An interpretable trend projection, not a calibrated remaining-life model.
export function predict(history, limit, window = 20) {
  const tail = history.slice(-window);
  if (tail.length < 3)
    return { cycles: null, slope: 0, status: "insufficient", fit: [] };
  const mx = tail.reduce((s, p) => s + p.cycle, 0) / tail.length;
  const my = tail.reduce((s, p) => s + p.value, 0) / tail.length;
  const denominator = tail.reduce((s, p) => s + (p.cycle - mx) ** 2, 0);
  const slope = denominator
    ? tail.reduce((s, p) => s + (p.cycle - mx) * (p.value - my), 0) /
      denominator
    : 0;
  const last = tail.at(-1);
  const fitted = my + slope * (last.cycle - mx);
  const cycles =
    last.value >= limit
      ? 0
      : slope > 1e-9
        ? Math.max(0, (limit - fitted) / slope)
        : null;
  return {
    cycles,
    slope,
    status:
      cycles === null
        ? "stable"
        : cycles <= 20
          ? "priority"
          : cycles <= 50
            ? "watch"
            : "stable",
    fit: tail.map((p) => ({
      cycle: p.cycle,
      value: my + slope * (p.cycle - mx),
    })),
    fitted,
  };
}
export const STATUS = {
  priority: "À examiner",
  watch: "À surveiller",
  stable: "Suivi courant",
  insufficient: "Données insuffisantes",
};

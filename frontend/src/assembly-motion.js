// A reversible timeline: each new request starts at the currently visible poses.
export function createAssemblyMotion(count, duration = 1200) {
  let values = Array(count).fill(0),
    from = [...values],
    target = 0,
    start = 0,
    active = false;
  return {
    get active() {
      return active;
    },
    get state() {
      return active
        ? target
          ? "component_exploding"
          : "component_collapsing"
        : target
          ? "component_exploded"
          : "component_assembled";
    },
    request(value, now, immediate = false) {
      this.sample(now);
      if (!immediate && target === (value ? 1 : 0)) return values;
      target = value ? 1 : 0;
      from = [...values];
      start = now;
      active = !immediate && values.some((v) => Math.abs(v - target) > 1e-6);
      if (!active) values.fill(target);
      return values;
    },
    sample(now) {
      if (active) {
        const elapsed = Math.max(0, now - start);
        values = from.map((v, i) => {
          const delay = count > 1 ? (i / (count - 1)) * duration * 0.18 : 0;
          const t = Math.max(
            0,
            Math.min(1, (elapsed - delay) / (duration * 0.82)),
          );
          const ease = t * t * t * (t * (6 * t - 15) + 10);
          return v + (target - v) * ease;
        });
        if (elapsed >= duration) {
          values.fill(target);
          active = false;
        }
      }
      return values;
    },
  };
}

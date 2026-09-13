import test from "node:test";
import assert from "node:assert/strict";
import { flightProgress } from "../src/aircraft-camera.js";

test("camera journey has one strictly progressing curve with no intermediate stop", () => {
  let previous = -1;
  for (let ms = 0; ms <= 1600; ms += 16) {
    const { eased } = flightProgress(ms);
    assert.ok(eased > previous);
    previous = eased;
  }
  assert.deepEqual(flightProgress(0), { t: 0, eased: 0 });
  assert.deepEqual(flightProgress(1600), { t: 1, eased: 1 });
  assert.deepEqual(flightProgress(3200), { t: 1, eased: 1 });
});

import { createAssemblyMotion } from "../src/assembly-motion.js";
test("assembly motion staggers, reverses without a pose jump and settles exactly", () => {
  for (const count of [3, 4, 5, 6]) {
    const motion = createAssemblyMotion(count);
    motion.request(true, 0);
    const midway = [...motion.sample(550)];
    assert.ok(midway[0] > midway[count - 1]);
    assert.ok(midway.every((v) => v > 0 && v < 1));
    motion.request(false, 550);
    assert.deepEqual(motion.sample(550), midway);
    assert.equal(motion.state, "component_collapsing");
    assert.deepEqual(motion.sample(1750), Array(count).fill(0));
    assert.equal(motion.active, false);
    motion.request(true, 1800, true);
    assert.deepEqual(motion.sample(1800), Array(count).fill(1));
    assert.equal(motion.state, "component_exploded");
  }
});
test("assembly timing is independent of frame rate and repeated requests do not stack", () => {
  const a = createAssemblyMotion(5),
    b = createAssemblyMotion(5);
  a.request(true, 0);
  b.request(true, 0);
  for (let t = 0; t < 700; t += 16) a.sample(t);
  assert.deepEqual(a.sample(700), b.sample(700));
  b.request(false, 700);
  b.request(true, 700);
  assert.deepEqual(a.sample(700), b.sample(700));
  assert.deepEqual(b.sample(1900), Array(5).fill(1));
});

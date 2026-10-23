import test from "node:test";
import assert from "node:assert/strict";
import {
  demoReply,
  emptySession,
  feedbackMetrics,
  initialState,
  restoreLocal,
} from "../src/model";
import { focusSchedule } from "../src/focus-schedule";

test("explicit preference survives a new concern and reload, then deletion clears it", () => {
  let session = demoReply(emptySession(), "Preparar informe ficticio", "1");
  session = demoReply(session, "MÁS PEQUEÑO", "2");
  session = demoReply(session, "NUEVO", "3");
  const reloaded = restoreLocal(JSON.stringify({ ...initialState(), session }));
  session = demoReply(reloaded.session, "Preparar otra clase ficticia", "4");
  assert.equal(session.plan?.minutes, 2);
  assert.equal(session.memory?.[0].evidence, "MÁS PEQUEÑO");
  session = demoReply(session, "BORRAR", "5");
  assert.equal(session.messages.length, 1);
  assert.equal(session.memory?.length, 0);
  assert.equal(session.plan, null);
});
test("feedback denominator includes only reviewed examples and replacing a vote is idempotent", () => {
  assert.deepEqual(feedbackMetrics({}), { reviewed: 0, correct: 0 });
  assert.deepEqual(
    feedbackMetrics({
      "demo-1": "correct",
      "demo-2": "should-wake",
      other: "correct",
    }),
    { reviewed: 2, correct: 1 },
  );
});
test("native schedule spans midnight once and rejects unsupported short sessions", () => {
  const now = new Date(2026, 9, 23, 23, 55, 0);
  const value = focusSchedule(15, now);
  assert.equal(value.schedule.intervalEnd.day, 24);
  assert.equal(value.schedule.repeats, false);
  assert.equal(Date.parse(value.endsAt) - now.getTime(), 15 * 60000);
  assert.throws(() => focusSchedule(2), /15, 30 o 60/);
});

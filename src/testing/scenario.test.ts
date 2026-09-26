import { assertRejects, assertThrows } from "@std/assert";
import { TraceabilityError } from "../core/errors.ts";
import { assertAbsent, assertEvents, assertOutcome, runScenario } from "./scenario.ts";
import type { ModeEvent } from "../core/events.ts";

const EVENTS: ModeEvent[] = [
  { type: "ModeStarted", mode: "list" },
  { type: "FilesScanned", count: 2 },
  { type: "IdsExtracted", total: 3, unique: 2 },
];

Deno.test("assertEvents - accepts expected events in order with gaps", () => {
  assertEvents(EVENTS, [{ type: "ModeStarted" }, { type: "IdsExtracted", unique: 2 }]);
});

Deno.test("assertEvents - rejects events in the wrong order", () => {
  assertThrows(() => assertEvents(EVENTS, [{ type: "IdsExtracted" }, { type: "FilesScanned" }]));
});

Deno.test("assertEvents - rejects a field mismatch", () => {
  assertThrows(() => assertEvents(EVENTS, [{ type: "FilesScanned", count: 3 }]));
});

Deno.test("assertEvents - exact rejects extra events", () => {
  assertThrows(() => assertEvents(EVENTS, [{ type: "ModeStarted" }], "exact"));
  assertEvents(EVENTS, [{ type: "ModeStarted" }, { type: "FilesScanned" }, {
    type: "IdsExtracted",
  }], "exact");
});

Deno.test("assertAbsent - rejects an occurred event", () => {
  assertThrows(() => assertAbsent(EVENTS, ["FilesScanned"]));
  assertAbsent(EVENTS, ["Stopped"]);
});

Deno.test("assertOutcome - checks error kind and fields", () => {
  const error = new TraceabilityError({ kind: "PathNotFound", path: "/x" });
  assertOutcome(error, { kind: "error", error: { kind: "PathNotFound", path: "/x" } });
  assertThrows(() =>
    assertOutcome(error, { kind: "error", error: { kind: "PathNotFound", path: "/y" } })
  );
  assertThrows(() => assertOutcome(error, { kind: "error", error: { kind: "ScanFailed" } }));
  assertThrows(() => assertOutcome(undefined, { kind: "error", error: { kind: "ScanFailed" } }));
  assertThrows(() => assertOutcome(error, { kind: "success" }));
});

Deno.test("runScenario - fails when the declared sequence does not happen", async () => {
  await assertRejects(() =>
    runScenario({
      name: "wrong order",
      given: {},
      when: (ctx) => {
        ctx.io.report({ type: "FilesScanned", count: 0 });
        ctx.io.report({ type: "ModeStarted", mode: "list" });
        return Promise.resolve();
      },
      then: {
        events: [{ type: "ModeStarted" }, { type: "FilesScanned" }],
        outcome: { kind: "success" },
      },
    })
  );
});

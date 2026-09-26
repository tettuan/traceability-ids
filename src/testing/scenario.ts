/**
 * Typed scenarios for testing sequential behavior.
 *
 * A scenario declares, as data checked by the type system:
 *
 * - `given`: the files that exist before the run,
 * - `when`:  the action (a mode run, a command),
 * - `then`:  the events expected **in this order** ("A happens, then B"),
 *            the events that must **not** happen, and the outcome
 *            (success, or failure with a specific error kind).
 *
 * `ExpectedEvent<E>` accepts only an existing event `type` together with a subset
 * of that event's own fields, so a step that cannot happen does not compile.
 *
 * @example
 * ```ts
 * defineScenario({
 *   name: "extract stops at a missing path",
 *   given: { "docs/a.md": "req:a:b-abc#v1" },
 *   when: (ctx) => runExtractMode({ ...opts, inputDir: [ctx.path("docs"), ctx.path("publish")] }, ctx.io),
 *   then: {
 *     events: [{ type: "TargetsLoaded", count: 1 }, { type: "ScanStarted" }],
 *     absent: ["FilesScanned"],
 *     outcome: { kind: "error", error: "PathNotFound" },
 *   },
 * });
 * ```
 *
 * @module
 */

import { assert, assertEquals, assertInstanceOf } from "@std/assert";
import type { ModeEvent, ModeEventType, ModeIO } from "../core/events.ts";
import { type ErrorDetail, type ErrorKind, TraceabilityError } from "../core/errors.ts";
import type { ModeOutcome } from "../core/outcome.ts";

/** An event any object with a string `type` */
export type TypedEvent = { readonly type: string };

/** Expected event: an existing `type` plus any subset of that event's fields */
export type ExpectedEvent<E extends TypedEvent = ModeEvent> = {
  [T in E["type"]]: { type: T } & Partial<Omit<Extract<E, { type: T }>, "type">>;
}[E["type"]];

/** Expected error: an existing `kind` plus any subset of that kind's fields */
export type ExpectedError = {
  [K in ErrorKind]: { kind: K } & Partial<Omit<Extract<ErrorDetail, { kind: K }>, "kind">>;
}[ErrorKind];

/** Expected mode result: an existing `status` plus any subset of its fields */
export type ExpectedResult = {
  [S in ModeOutcome["status"]]:
    & { status: S }
    & Partial<Omit<Extract<ModeOutcome, { status: S }>, "status">>;
}[ModeOutcome["status"]];

/** Expected outcome of the action: success (optionally with its result), or an error */
export type ExpectedOutcome =
  | { kind: "success"; result?: ExpectedResult }
  | { kind: "error"; error: ExpectedError };

/**
 * How expected events relate to the actual ones:
 * `inOrder` — each appears after the previous one, other events may come between;
 * `exact` — the actual events are exactly these, in this order.
 */
export type EventOrder = "inOrder" | "exact";

/** Files to create: path relative to the scenario root → content */
export type FileTree = Readonly<Record<string, string>>;

/** ModeIO that records everything */
export interface RecordingIO extends ModeIO {
  /** Events in the order reported */
  readonly events: ModeEvent[];
  /** Printed results in order */
  readonly printed: string[];
}

/** What the action and the checks can use */
export interface ScenarioContext {
  /** Temporary directory holding `given` */
  readonly root: string;
  /** Absolute path of a path relative to `root` */
  path(relative: string): string;
  /** IO to pass to the mode */
  readonly io: RecordingIO;
}

/** Expectations after the action */
export interface ScenarioThen {
  /** Events expected in order */
  events: readonly ExpectedEvent[];
  /** How `events` relate to the actual events (default: `inOrder`) */
  order?: EventOrder;
  /** Event types that must not occur */
  absent?: readonly ModeEventType[];
  /** Success, or failure with an error */
  outcome: ExpectedOutcome;
  /** Further checks on output and files */
  verify?: (ctx: ScenarioContext) => void | Promise<void>;
}

/** A typed scenario */
export interface Scenario {
  /** Test name */
  name: string;
  /** Files existing before the action */
  given: FileTree;
  /** The action */
  when: (ctx: ScenarioContext) => Promise<unknown>;
  /** Expectations */
  then: ScenarioThen;
}

/**
 * Create a recording IO
 */
export function recordingIO(): RecordingIO {
  const events: ModeEvent[] = [];
  const printed: string[] = [];
  return {
    events,
    printed,
    report: (event) => events.push(event),
    print: (content) => printed.push(content),
  };
}

/**
 * Whether `actual` has every field of `expected` with an equal value
 */
export function matches(actual: object, expected: object): boolean {
  const record = actual as Record<string, unknown>;
  return Object.entries(expected).every(([key, value]) =>
    JSON.stringify(record[key]) === JSON.stringify(value)
  );
}

/**
 * Assert that events occurred as expected
 */
export function assertEvents<E extends TypedEvent>(
  actual: readonly E[],
  expected: readonly ExpectedEvent<E>[],
  order: EventOrder = "inOrder",
): void {
  const trace = actual.map((e) => JSON.stringify(e)).join("\n  ");
  if (order === "exact") {
    assertEquals(
      actual.map((e) => e.type),
      expected.map((e) => e.type),
      `event types differ; actual:\n  ${trace}`,
    );
  }
  let from = 0;
  for (const [step, want] of expected.entries()) {
    const found = actual.findIndex((e, i) => i >= from && matches(e, want));
    assert(
      found !== -1,
      `step ${step + 1} ${JSON.stringify(want)} did not occur after step ${step};` +
        ` actual:\n  ${trace}`,
    );
    from = found + 1;
  }
}

/**
 * Assert that none of the event types occurred
 */
export function assertAbsent<E extends TypedEvent>(
  actual: readonly E[],
  types: readonly E["type"][],
): void {
  for (const type of types) {
    assert(!actual.some((e) => e.type === type), `unexpected event ${type}`);
  }
}

/**
 * Assert the outcome of an action (`thrown` is `undefined` on success)
 */
export function assertOutcome(
  thrown: unknown,
  outcome: ExpectedOutcome,
  returned?: unknown,
): void {
  if (outcome.kind === "success") {
    if (thrown !== undefined) throw thrown;
    if (outcome.result) {
      assert(
        typeof returned === "object" && returned !== null && matches(returned, outcome.result),
        `expected result ${JSON.stringify(outcome.result)}, got ${JSON.stringify(returned)}`,
      );
    }
    return;
  }
  assert(thrown !== undefined, `expected error ${outcome.error.kind}, but succeeded`);
  assertInstanceOf(thrown, TraceabilityError);
  assert(
    matches(thrown.detail, outcome.error),
    `expected ${JSON.stringify(outcome.error)}, got ${JSON.stringify(thrown.detail)}`,
  );
}

/**
 * Run a scenario (without registering a test)
 */
export async function runScenario(scenario: Scenario): Promise<void> {
  const root = await Deno.makeTempDir();
  const ctx: ScenarioContext = {
    root,
    path: (relative) => `${root}/${relative}`,
    io: recordingIO(),
  };
  try {
    for (const [relative, content] of Object.entries(scenario.given)) {
      const path = ctx.path(relative);
      await Deno.mkdir(path.substring(0, path.lastIndexOf("/")), { recursive: true });
      await Deno.writeTextFile(path, content);
    }

    let thrown: unknown = undefined;
    let returned: unknown = undefined;
    try {
      returned = await scenario.when(ctx);
    } catch (error) {
      thrown = error;
    }

    assertOutcome(thrown, scenario.then.outcome, returned);
    assertEvents(ctx.io.events, scenario.then.events, scenario.then.order);
    assertAbsent(ctx.io.events, scenario.then.absent ?? []);
    await scenario.then.verify?.(ctx);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
}

/**
 * Register a scenario as a Deno test
 */
export function defineScenario(scenario: Scenario): void {
  Deno.test(scenario.name, () => runScenario(scenario));
}

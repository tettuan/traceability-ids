import { assertEquals, assertInstanceOf, assertStringIncludes } from "@std/assert";
import {
  describeError,
  ERROR_CATEGORIES,
  type ErrorDetail,
  EXIT_CODES,
  fromReadError,
  isTraceabilityError,
  TraceabilityError,
} from "./errors.ts";

const SAMPLES: ErrorDetail[] = [
  { kind: "MissingArgument", argument: "--ids" },
  { kind: "EmptyIdList", source: "--ids" },
  { kind: "UnknownOption", option: "--x" },
  { kind: "InvalidOptionValue", option: "--format", value: "x", expected: "one of a, b" },
  { kind: "InvalidParameter", parameter: "epsilon", value: 0, constraint: "must be positive" },
  { kind: "PathNotFound", path: "/p" },
  { kind: "PathAccessDenied", path: "/p" },
  { kind: "ScanFailed", path: "/p", cause: "boom" },
  { kind: "FileReadFailed", path: "/p", cause: "boom" },
  { kind: "FileWriteFailed", path: "/p", cause: "boom" },
  { kind: "ExternalCommandFailed", command: "rg", cause: "boom" },
];

Deno.test("errors - every kind has a category, an exit code and a message", () => {
  assertEquals(SAMPLES.map((d) => d.kind).sort(), Object.keys(ERROR_CATEGORIES).sort());
  for (const detail of SAMPLES) {
    const error = new TraceabilityError(detail);
    assertEquals(error.kind, detail.kind);
    assertEquals(error.exitCode, EXIT_CODES[ERROR_CATEGORIES[detail.kind]]);
    assertEquals(error.message, describeError(detail));
  }
});

Deno.test("errors - exit codes are distinct per category", () => {
  const codes = Object.values(EXIT_CODES);
  assertEquals(new Set(codes).size, codes.length);
});

Deno.test("isTraceabilityError - narrows by kind", () => {
  const error: unknown = new TraceabilityError({ kind: "PathNotFound", path: "/p" });
  assertEquals(isTraceabilityError(error), true);
  assertEquals(isTraceabilityError(error, "ScanFailed"), false);
  if (isTraceabilityError(error, "PathNotFound")) assertEquals(error.detail.path, "/p");
  assertEquals(isTraceabilityError(new Error("x")), false);
});

Deno.test("fromReadError - maps file system errors to kinds", () => {
  assertEquals(
    fromReadError(new Deno.errors.NotFound("x"), "/a", "ScanFailed").kind,
    "PathNotFound",
  );
  assertEquals(
    fromReadError(new Deno.errors.PermissionDenied("x"), "/a", "ScanFailed").kind,
    "PathAccessDenied",
  );
  const other = fromReadError(new Error("disk"), "/a", "FileReadFailed");
  assertInstanceOf(other, TraceabilityError);
  assertEquals(other.detail, { kind: "FileReadFailed", path: "/a", cause: "disk" });
  assertStringIncludes(other.message, "disk");
});

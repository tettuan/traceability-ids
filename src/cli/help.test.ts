import { assert, assertStringIncludes } from "@std/assert";
import { command as analyze } from "../../analyze.ts";
import { command as extract } from "../../extract.ts";
import { command as graph } from "../../graph.ts";
import { command as list } from "../../list.ts";
import { command as relations } from "../../relations.ts";
import { command as search } from "../../search.ts";
import { command as cluster } from "../cli.ts";
import {
  DEFAULT_VERSION_MATCH,
  LIST_FORMATS,
  RELATION_DIRECTIONS,
  RELATIONS_FORMATS,
  VERSION_MATCH_DESCRIPTIONS,
  VERSION_MATCH_MODES,
} from "../core/options.ts";
import { DEFAULT_HASH_PATTERN } from "../core/id.ts";
import { RELATION_KINDS } from "../core/relations.ts";
import { DEFAULT_EXTENSIONS } from "../core/scanner.ts";
import { INPUT_OPTIONS_HELP, versionsOptionHelp } from "./help.ts";

const COMMANDS = { analyze, cluster, extract, graph, list, relations, search };

Deno.test("help - every command shows the shared input options", () => {
  for (const [name, spec] of Object.entries(COMMANDS)) {
    assert(spec.usage.includes(INPUT_OPTIONS_HELP), `${name} lacks the shared input options`);
  }
  assertStringIncludes(INPUT_OPTIONS_HELP, `(default: ${DEFAULT_EXTENSIONS.join(",")})`);
});

Deno.test("help - --versions lists every mode with its description and the default", () => {
  const text = versionsOptionHelp("IDs");
  assertStringIncludes(text, `(default: ${DEFAULT_VERSION_MATCH})`);
  for (const mode of VERSION_MATCH_MODES) {
    assertStringIncludes(text, `${mode}:`);
    assertStringIncludes(text, VERSION_MATCH_DESCRIPTIONS[mode]);
  }
  for (const spec of [extract, graph, list, relations]) {
    assertStringIncludes(spec.usage, "--versions <mode>");
    assertStringIncludes(spec.usage, "--allow-missing");
  }
});

Deno.test("help - list and relations name every format, direction and kind", () => {
  for (const format of LIST_FORMATS) assertStringIncludes(list.usage, `• ${format}:`);
  for (const format of RELATIONS_FORMATS) assertStringIncludes(relations.usage, `• ${format}:`);
  for (const direction of RELATION_DIRECTIONS) {
    assertStringIncludes(relations.usage, `• ${direction}:`);
  }
  for (const kind of RELATION_KINDS) assertStringIncludes(relations.usage, `• ${kind}:`);
  assertStringIncludes(INPUT_OPTIONS_HELP, DEFAULT_HASH_PATTERN);
});

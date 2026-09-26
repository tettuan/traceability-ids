import { assertStringIncludes } from "@std/assert";
import { RELATION_KINDS, RELATION_LABELS } from "../core/relations.ts";
import { SIMILARITY_LINK } from "./graph_data.ts";
import { generateHTML, RELATION_COLORS, relationLegendHTML } from "./html_template.ts";

Deno.test("html - legend and link styles come from the relation definitions", () => {
  const html = generateHTML({ nodes: [], links: [] });
  const legend = relationLegendHTML();
  assertStringIncludes(html, legend);
  for (const kind of RELATION_KINDS) {
    assertStringIncludes(legend, kind);
    assertStringIncludes(legend, RELATION_LABELS[kind]);
    assertStringIncludes(legend, RELATION_COLORS[kind]);
  }
  assertStringIncludes(html, `var RELATION_COLORS = ${JSON.stringify(RELATION_COLORS)};`);
  assertStringIncludes(html, `l.kind !== ${JSON.stringify(SIMILARITY_LINK)}`);
});

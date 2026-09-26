import { createClusteringAlgorithm } from "../cli/clustering-factory.ts";
import { createDistanceCalculator } from "../cli/distance-factory.ts";
import { consoleIO, type ModeIO } from "../core/events.ts";
import { COMPLETE, lookupOutcome, type ModeOutcome } from "../core/outcome.ts";
import { deduplicateIds } from "../core/extractor.ts";
import type {
  AlgorithmName,
  ClusteringOptions,
  ColorMode,
  DistanceName,
  Layout,
  VersionMatchMode,
} from "../core/options.ts";
import { extractRelations } from "../relations/extract.ts";
import { resolveRelations } from "../relations/resolve.ts";
import { createDistanceMatrix } from "../distance/calculator.ts";
import { buildGraphData, isRelationLink } from "../visualization/graph_data.ts";
import { generateHTML } from "../visualization/html_template.ts";
import { classicalMDS } from "../visualization/mds.ts";
import { collectIds, emitResult, hashRuleOf, type InputSpec } from "./pipeline.ts";

/** Options of graph mode */
export interface GraphModeOptions extends InputSpec {
  /** Output HTML file */
  outputFile: string;
  /** Distance calculator */
  distance: DistanceName;
  /** Clustering algorithm */
  algorithm: AlgorithmName;
  /** Algorithm parameters */
  clusteringOptions: ClusteringOptions;
  /** Distance below which an edge is drawn */
  edgeThreshold: number;
  /** Node coloring */
  colorBy: ColorMode;
  /** Initial layout */
  layout: Layout;
  /** Version resolution for relation targets given without a version (default: latest) */
  versions?: VersionMatchMode;
}

/**
 * グラフ可視化モードを実行
 *
 * Events: ModeStarted → CalculatorSelected → AlgorithmSelected → (collectIds)
 * → RelationIssueFound* → RelationsResolved → BrokenRelationFound*
 * → DistanceMatrixBuilt → ClustersFormed → GraphBuilt → OutputWritten
 *
 * @returns `partial` with the relation targets not found (broken links)
 */
export async function runGraphMode(
  options: GraphModeOptions,
  io: ModeIO = consoleIO,
): Promise<ModeOutcome> {
  io.report({ type: "ModeStarted", mode: "graph" });
  const calculator = createDistanceCalculator(options.distance, hashRuleOf(options));
  io.report({ type: "CalculatorSelected", name: options.distance });
  const algorithm = createClusteringAlgorithm(options.algorithm, options.clusteringOptions);
  io.report({ type: "AlgorithmSelected", name: options.algorithm });

  const collected = await collectIds(options, io);
  if (!collected) return COMPLETE;
  const ids = deduplicateIds(collected.rawIds);

  const extracted = await extractRelations(collected.files, options.frontmatter);
  for (const issue of extracted.issues) io.report({ type: "RelationIssueFound", issue });
  const relations = resolveRelations(
    extracted.declarations,
    extracted.referenceLines,
    collected.rawIds,
    options.versions,
  );
  io.report({
    type: "RelationsResolved",
    declared: extracted.declarations.length,
    edges: relations.edges.length,
    broken: relations.broken.length,
  });
  for (const relation of relations.broken) io.report({ type: "BrokenRelationFound", relation });

  const matrix = createDistanceMatrix(ids.map((id) => id.fullId), calculator);
  io.report({ type: "DistanceMatrixBuilt", size: ids.length });

  const clusters = algorithm.cluster(ids, matrix);
  io.report({ type: "ClustersFormed", count: clusters.length });

  const mdsCoordinates = options.layout === "mds" ? classicalMDS(matrix, 3).coordinates : undefined;
  const graphData = buildGraphData(
    ids,
    matrix,
    clusters,
    options.edgeThreshold,
    mdsCoordinates,
    relations.edges,
  );
  const drawn = graphData.links.filter(isRelationLink).length;
  io.report({
    type: "GraphBuilt",
    nodes: graphData.nodes.length,
    links: graphData.links.length - drawn,
    relations: drawn,
  });

  const html = generateHTML(graphData, { colorBy: options.colorBy, layout: options.layout });
  await emitResult(io, html, options.outputFile);
  return lookupOutcome([...new Set(relations.broken.map((relation) => relation.target))]);
}

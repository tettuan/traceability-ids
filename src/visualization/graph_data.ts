/**
 * Graph data transformation for 3D visualization
 *
 * Converts traceability IDs, distance matrix, and clustering results
 * into a graph data structure suitable for 3d-force-graph rendering.
 *
 * @module
 */

import type { Cluster, TraceabilityId } from "../core/types.ts";

/** A node in the 3D graph representing a traceability ID */
export interface GraphNode {
  id: string;
  fullId: string;
  level: string;
  scope: string;
  semantic: string;
  hash: string;
  version: string;
  filePath: string;
  lineNumber: number;
  clusterId: number;
  /** Sequential tab navigation index (0-based) */
  tabId: number;
  /** MDS coordinates (optional, used when layout=mds) */
  fx?: number;
  fy?: number;
  fz?: number;
}

/** A link in the 3D graph representing a relationship between two IDs */
export interface GraphLink {
  source: string;
  target: string;
  distance: number;
}

/** Complete graph data structure for visualization */
export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

/**
 * Build graph data from traceability IDs, distance matrix, and clusters.
 *
 * @param ids - Array of traceability IDs
 * @param distanceMatrix - n×n distance matrix between IDs
 * @param clusters - Clustering results
 * @param edgeThreshold - Only create edges for distances <= this value
 * @param mdsCoordinates - Optional MDS coordinates for fixed positioning
 * @returns GraphData with nodes and links
 */
export function buildGraphData(
  ids: TraceabilityId[],
  distanceMatrix: number[][],
  clusters: Cluster[],
  edgeThreshold: number,
  mdsCoordinates?: number[][],
): GraphData {
  // Build cluster membership map: fullId -> clusterId
  const clusterMap = new Map<string, number>();
  for (const cluster of clusters) {
    for (const item of cluster.items) {
      clusterMap.set(item.fullId, cluster.id);
    }
  }

  // Compute nearest-neighbor traversal order for tab navigation
  const tabOrder = nearestNeighborOrder(distanceMatrix);

  // Build nodes
  const nodes: GraphNode[] = ids.map((id, i) => {
    const node: GraphNode = {
      id: id.fullId,
      fullId: id.fullId,
      level: id.level,
      scope: id.scope,
      semantic: id.semantic,
      hash: id.hash,
      version: id.version,
      filePath: id.filePath,
      lineNumber: id.lineNumber,
      clusterId: clusterMap.get(id.fullId) ?? 0,
      tabId: tabOrder[i],
    };

    if (mdsCoordinates && mdsCoordinates[i]) {
      node.fx = mdsCoordinates[i][0] * 100;
      node.fy = mdsCoordinates[i][1] * 100;
      node.fz = mdsCoordinates[i][2] * 100;
    }

    return node;
  });

  // Build links (edges) for pairs within threshold
  const links: GraphLink[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const distance = distanceMatrix[i][j];
      if (distance <= edgeThreshold) {
        links.push({
          source: ids[i].fullId,
          target: ids[j].fullId,
          distance,
        });
      }
    }
  }

  // Sort nodes array by tabId so Tab traversal follows adjacency order
  nodes.sort((a, b) => a.tabId - b.tabId);

  return { nodes, links };
}

/**
 * Compute nearest-neighbor traversal order.
 * Starting from node 0, greedily visit the nearest unvisited node.
 * Returns an array where result[originalIndex] = tabId (visit order).
 */
function nearestNeighborOrder(distanceMatrix: number[][]): number[] {
  const n = distanceMatrix.length;
  if (n === 0) return [];

  const visited = new Array<boolean>(n).fill(false);
  const order = new Array<number>(n);
  let current = 0;
  visited[current] = true;
  order[current] = 0;

  for (let step = 1; step < n; step++) {
    let nearest = -1;
    let nearestDist = Infinity;
    for (let j = 0; j < n; j++) {
      if (!visited[j] && distanceMatrix[current][j] < nearestDist) {
        nearestDist = distanceMatrix[current][j];
        nearest = j;
      }
    }
    visited[nearest] = true;
    order[nearest] = step;
    current = nearest;
  }

  return order;
}

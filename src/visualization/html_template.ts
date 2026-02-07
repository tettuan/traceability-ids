/**
 * HTML template generator for 3D graph visualization
 *
 * Generates a self-contained HTML file using 3d-force-graph (CDN)
 * with interactive controls for exploring traceability ID relationships.
 *
 * @module
 */

import type { GraphData } from "./graph_data.ts";

/** Options for HTML generation */
export interface HTMLGenerationOptions {
  /** Initial color-by mode: cluster, scope, or level */
  colorBy?: "cluster" | "scope" | "level";
  /** Initial layout mode: force or mds */
  layout?: "force" | "mds";
  /** Title for the HTML page */
  title?: string;
}

/**
 * Generate a self-contained HTML file for 3D graph visualization.
 *
 * @param graphData - Graph data with nodes and links
 * @param options - Optional generation options
 * @returns Complete HTML string
 */
export function generateHTML(
  graphData: GraphData,
  options?: HTMLGenerationOptions,
): string {
  const colorBy = options?.colorBy ?? "cluster";
  const layout = options?.layout ?? "force";
  const title = options?.title ?? "Traceability ID - 3D Graph";
  const dataJson = JSON.stringify(graphData);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a1a; color: #e0e0e0; overflow: hidden; }
  #graph-container { width: 100vw; height: 100vh; }
  #controls { position: absolute; top: 12px; left: 12px; background: rgba(20,20,40,0.92); padding: 14px; border-radius: 8px; z-index: 10; min-width: 220px; font-size: 13px; }
  #controls h3 { margin-bottom: 10px; font-size: 14px; color: #8af; }
  .control-group { margin-bottom: 10px; }
  .control-group label { display: block; margin-bottom: 4px; color: #aab; font-size: 12px; }
  .control-group select, .control-group input[type=range] { width: 100%; background: #1a1a2e; color: #e0e0e0; border: 1px solid #334; border-radius: 4px; padding: 4px 6px; }
  .threshold-val { color: #8af; font-weight: bold; margin-left: 6px; }
  #detail-panel { position: absolute; top: 12px; right: 12px; background: rgba(20,20,40,0.95); padding: 16px; border-radius: 8px; z-index: 10; min-width: 280px; max-width: 360px; display: none; font-size: 13px; }
  #detail-panel h3 { color: #8af; margin-bottom: 10px; font-size: 14px; }
  #detail-panel .field { margin-bottom: 6px; }
  #detail-panel .field-label { color: #889; font-size: 11px; text-transform: uppercase; }
  #detail-panel .field-value { color: #dde; word-break: break-all; }
  #detail-panel .close-btn { position: absolute; top: 8px; right: 10px; cursor: pointer; color: #889; font-size: 18px; }
  #detail-panel .close-btn:hover { color: #fff; }
  #stats { position: absolute; bottom: 12px; left: 12px; background: rgba(20,20,40,0.85); padding: 8px 14px; border-radius: 6px; z-index: 10; font-size: 12px; color: #889; }
  .shortcuts { margin-top: 6px; padding-top: 8px; border-top: 1px solid #334; font-size: 11px; color: #778; line-height: 1.6; }
  .shortcuts kbd { background: #1a1a2e; border: 1px solid #445; border-radius: 3px; padding: 1px 5px; font-family: monospace; font-size: 11px; color: #aab; }
</style>
</head>
<body>
<div id="graph-container"></div>

<div id="controls">
  <h3>Controls</h3>
  <div class="control-group">
    <label>Color by</label>
    <select id="color-by">
      <option value="cluster"${colorBy === "cluster" ? " selected" : ""}>Cluster</option>
      <option value="scope"${colorBy === "scope" ? " selected" : ""}>Scope</option>
      <option value="level"${colorBy === "level" ? " selected" : ""}>Level</option>
    </select>
  </div>
  <div class="control-group">
    <label>Edge threshold <span class="threshold-val" id="threshold-display"></span></label>
    <input type="range" id="edge-threshold" min="0" max="1" step="0.01">
  </div>
  <div class="control-group">
    <label>Layout</label>
    <select id="layout-mode">
      <option value="force"${layout === "force" ? " selected" : ""}>Force-directed</option>
      <option value="mds"${layout === "mds" ? " selected" : ""}>MDS (fixed)</option>
    </select>
  </div>
  <div class="shortcuts">
    <kbd>+</kbd> <kbd>-</kbd> Zoom<br>
    <kbd>&larr;</kbd> <kbd>&rarr;</kbd> <kbd>&uarr;</kbd> <kbd>&darr;</kbd> Pan
  </div>
</div>

<div id="detail-panel">
  <span class="close-btn" id="close-detail">&times;</span>
  <h3>Node Detail</h3>
  <div id="detail-content"></div>
</div>

<div id="stats" id="stats-bar"></div>

<script src="https://unpkg.com/3d-force-graph@1"></script>
<script>
(function() {
  const rawData = ${dataJson};
  const allLinks = rawData.links.slice();

  // Color palettes
  const clusterColors = ['#ff6b6b','#4ecdc4','#45b7d1','#f9ca24','#6c5ce7','#a29bfe','#fd79a8','#00cec9','#e17055','#55efc4','#74b9ff','#dfe6e9','#fab1a0','#81ecec','#636e72'];
  function hashColor(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) { h = str.charCodeAt(i) + ((h << 5) - h); }
    return clusterColors[Math.abs(h) % clusterColors.length];
  }

  function getNodeColor(node, mode) {
    if (mode === 'cluster') return clusterColors[(node.clusterId - 1) % clusterColors.length] || '#888';
    if (mode === 'scope') return hashColor(node.scope);
    if (mode === 'level') return hashColor(node.level);
    return '#888';
  }

  // Initialize graph
  var container = document.getElementById('graph-container');
  var graph = ForceGraph3D()(container)
    .graphData({ nodes: rawData.nodes, links: rawData.links })
    .nodeLabel(function(n) { return n.fullId; })
    .nodeColor(function(n) { return getNodeColor(n, '${colorBy}'); })
    .nodeVal(4)
    .linkWidth(function(l) { return 1 - l.distance; })
    .linkOpacity(0.4)
    .linkColor(function() { return 'rgba(150,180,255,0.3)'; })
    .backgroundColor('#0a0a1a')
    .onNodeClick(function(node) { showDetail(node); });

  // Apply MDS fixed positions if layout is mds
  if ('${layout}' === 'mds') {
    applyMDS();
  }

  // Stats
  updateStats(rawData.nodes.length, rawData.links.length);

  // Edge threshold slider
  var maxDist = 0;
  allLinks.forEach(function(l) { if (l.distance > maxDist) maxDist = l.distance; });
  var slider = document.getElementById('edge-threshold');
  slider.max = Math.ceil(maxDist * 100) / 100 || 1;
  var currentThreshold = maxDist || 1;
  slider.value = currentThreshold;
  document.getElementById('threshold-display').textContent = currentThreshold.toFixed(2);

  slider.addEventListener('input', function() {
    currentThreshold = parseFloat(this.value);
    document.getElementById('threshold-display').textContent = currentThreshold.toFixed(2);
    filterEdges(currentThreshold);
  });

  // Color mode
  document.getElementById('color-by').addEventListener('change', function() {
    var mode = this.value;
    graph.nodeColor(function(n) { return getNodeColor(n, mode); });
  });

  // Layout mode
  document.getElementById('layout-mode').addEventListener('change', function() {
    if (this.value === 'mds') {
      applyMDS();
    } else {
      removeMDS();
    }
  });

  // Detail panel
  document.getElementById('close-detail').addEventListener('click', function() {
    document.getElementById('detail-panel').style.display = 'none';
  });

  function showDetail(node) {
    var panel = document.getElementById('detail-panel');
    var content = document.getElementById('detail-content');
    var fields = [
      ['Full ID', node.fullId],
      ['Level', node.level],
      ['Scope', node.scope],
      ['Semantic', node.semantic],
      ['Hash', node.hash],
      ['Version', node.version],
      ['File', node.filePath],
      ['Line', node.lineNumber],
      ['Cluster', node.clusterId]
    ];
    content.innerHTML = fields.map(function(f) {
      return '<div class="field"><div class="field-label">' + f[0] + '</div><div class="field-value">' + escapeHtml(String(f[1])) + '</div></div>';
    }).join('');
    panel.style.display = 'block';
  }

  function filterEdges(threshold) {
    var filtered = allLinks.filter(function(l) { return l.distance <= threshold; });
    graph.graphData({ nodes: rawData.nodes, links: filtered });
    updateStats(rawData.nodes.length, filtered.length);
  }

  function applyMDS() {
    rawData.nodes.forEach(function(n) {
      if (typeof n.fx === 'number') {
        n.__fx = n.fx; n.__fy = n.fy; n.__fz = n.fz;
      }
    });
    graph.d3Force('charge', null).d3Force('link', null).d3Force('center', null);
    graph.graphData({ nodes: rawData.nodes, links: graph.graphData().links });
  }

  function removeMDS() {
    rawData.nodes.forEach(function(n) {
      delete n.fx; delete n.fy; delete n.fz;
    });
    graph.d3Force('charge').strength(-120);
    graph.graphData({ nodes: rawData.nodes, links: graph.graphData().links });
    graph.numDimensions(3);
  }

  function updateStats(nodeCount, linkCount) {
    document.getElementById('stats').textContent = 'Nodes: ' + nodeCount + ' | Edges: ' + linkCount;
  }

  function escapeHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ---- Keyboard shortcuts ----
  var ZOOM_STEP = 0.85;   // multiplier per key press (< 1 = closer)
  var PAN_STEP = 30;       // pixels per key press

  document.addEventListener('keydown', function(e) {
    // Skip when a form control is focused
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;

    var camera = graph.camera();
    var controls = graph.controls();

    switch (e.key) {
      // Zoom in: + or =
      case '+':
      case '=': {
        var dir = camera.position.clone().sub(controls.target).multiplyScalar(1 - ZOOM_STEP);
        camera.position.sub(dir);
        controls.update();
        e.preventDefault();
        break;
      }
      // Zoom out: - or _
      case '-':
      case '_': {
        var dir2 = camera.position.clone().sub(controls.target).multiplyScalar(1 - 1/ZOOM_STEP);
        camera.position.sub(dir2);
        controls.update();
        e.preventDefault();
        break;
      }
      // Pan left / right: arrow keys move the graph center
      case 'ArrowLeft': {
        panCamera(-PAN_STEP, 0);
        e.preventDefault();
        break;
      }
      case 'ArrowRight': {
        panCamera(PAN_STEP, 0);
        e.preventDefault();
        break;
      }
      case 'ArrowUp': {
        panCamera(0, -PAN_STEP);
        e.preventDefault();
        break;
      }
      case 'ArrowDown': {
        panCamera(0, PAN_STEP);
        e.preventDefault();
        break;
      }
    }
  });

  function panCamera(dx, dy) {
    var camera = graph.camera();
    var controls = graph.controls();
    // Get camera's local right and up vectors
    var right = new THREE.Vector3();
    var up = new THREE.Vector3();
    camera.getWorldDirection(new THREE.Vector3());
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);

    // Scale pan amount relative to distance from target
    var dist = camera.position.distanceTo(controls.target);
    var scale = dist * 0.001;

    var offset = right.multiplyScalar(-dx * scale).add(up.multiplyScalar(dy * scale));
    camera.position.add(offset);
    controls.target.add(offset);
    controls.update();
  }
})();
</script>
</body>
</html>`;
}

/** Escape HTML special characters for safe embedding */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

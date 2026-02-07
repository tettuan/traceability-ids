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
  #node-indicator { position: absolute; bottom: 12px; right: 12px; background: rgba(20,20,40,0.9); padding: 8px 14px; border-radius: 6px; z-index: 10; font-size: 12px; color: #8af; display: none; }
  #stats { position: absolute; bottom: 12px; left: 12px; background: rgba(20,20,40,0.85); padding: 8px 14px; border-radius: 6px; z-index: 10; font-size: 12px; color: #889; }
  .shortcuts { margin-top: 6px; padding-top: 8px; border-top: 1px solid #334; font-size: 11px; color: #778; line-height: 1.6; }
  .shortcuts kbd { background: #1a1a2e; border: 1px solid #445; border-radius: 3px; padding: 1px 5px; font-family: monospace; font-size: 11px; color: #aab; }
  #select-rect { position: absolute; border: 2px solid #8af; background: rgba(138,170,255,0.15); pointer-events: none; z-index: 20; display: none; }
  #reset-selection { display: none; width: 100%; margin-top: 8px; padding: 6px 0; background: #e17055; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; }
  #reset-selection:hover { background: #d63031; }
  #mode-indicator { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); background: rgba(138,170,255,0.85); color: #fff; padding: 10px 24px; border-radius: 8px; font-size: 16px; font-weight: bold; z-index: 30; display: none; pointer-events: none; }
  body.select-mode { cursor: crosshair; }
  body.select-mode #graph-container { pointer-events: none; }
</style>
</head>
<body>
<div id="graph-container"></div>
<div id="select-rect"></div>
<div id="mode-indicator">SELECT MODE</div>

<div id="controls">
  <h3>Controls</h3>
  <div class="control-group">
    <label>Color by</label>
    <select id="color-by">
      <option value="edges" selected>Edges (gradient)</option>
      <option value="cluster">Cluster</option>
      <option value="scope">Scope</option>
      <option value="level">Level</option>
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
    <strong>Shape = Level</strong><br>
    &#9679; req &nbsp; &#9632; des &nbsp; &#9670; imp &nbsp; &#9650; tst<br><br>
    <kbd>+</kbd> <kbd>-</kbd> Zoom<br>
    <kbd>&larr;</kbd> <kbd>&rarr;</kbd> <kbd>&uarr;</kbd> <kbd>&darr;</kbd> Pan<br>
    <kbd>Shift</kbd>+<kbd>&larr;</kbd> <kbd>&rarr;</kbd> <kbd>&uarr;</kbd> <kbd>&darr;</kbd> Rotate<br>
    <kbd>Tab</kbd> Next node / <kbd>Shift</kbd>+<kbd>Tab</kbd> Prev<br>
    <kbd>&#8984;</kbd>+<kbd>Enter</kbd> Center nearest node<br>
    <kbd>S</kbd> Toggle select mode, then Drag
  </div>
  <button id="reset-selection">Reset Selection</button>
</div>

<div id="detail-panel">
  <span class="close-btn" id="close-detail">&times;</span>
  <h3>Node Detail</h3>
  <div id="detail-content"></div>
</div>

<div id="node-indicator"></div>
<div id="stats" id="stats-bar"></div>

<script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>
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

  // Compute max distance for edge styling
  var maxDist = 0;
  allLinks.forEach(function(l) { if (l.distance > maxDist) maxDist = l.distance; });

  // --- Edge-based node coloring ---
  var EDGE_COLOR_LIMIT = 12;
  var nodeEdges = {};
  allLinks.forEach(function(l) {
    var sid = l.source, tid = l.target;
    if (!nodeEdges[sid]) nodeEdges[sid] = [];
    if (!nodeEdges[tid]) nodeEdges[tid] = [];
    nodeEdges[sid].push(l.distance);
    nodeEdges[tid].push(l.distance);
  });
  Object.keys(nodeEdges).forEach(function(id) {
    nodeEdges[id].sort(function(a, b) { return a - b; });
    if (nodeEdges[id].length > EDGE_COLOR_LIMIT) nodeEdges[id] = nodeEdges[id].slice(0, EDGE_COLOR_LIMIT);
  });

  // HSL-based rainbow spectrum: close=red(0) → yellow(55) → green(120) → cyan(180) → blue(230) → purple(290)
  function distToHSL(d) {
    var t = maxDist > 0 ? d / maxDist : 0;
    var h = Math.round(t * 290);
    return 'hsl(' + h + ',90%,58%)';
  }

  function distToHSLA(d, a) {
    var t = maxDist > 0 ? d / maxDist : 0;
    var h = Math.round(t * 290);
    return 'hsla(' + h + ',90%,58%,' + a + ')';
  }

  var textureCache = {};
  function getEdgeTexture(nodeId) {
    if (textureCache[nodeId]) return textureCache[nodeId];
    var dists = nodeEdges[nodeId] || [];
    var size = 128;
    var canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    var ctx = canvas.getContext('2d');
    var cx = size / 2, cy = size / 2, rad = size / 2;

    if (dists.length === 0) {
      ctx.fillStyle = '#888888';
      ctx.fillRect(0, 0, size, size);
    } else if (dists.length === 1) {
      ctx.fillStyle = distToHSL(dists[0]);
      ctx.fillRect(0, 0, size, size);
    } else {
      // Vertical linear gradient: top (close/warm) → bottom (far/cool)
      // Position stops by cumulative probability distribution of distances
      var grad = ctx.createLinearGradient(0, 0, 0, size);
      var n = dists.length;
      var dMin = dists[0], dMax = dists[n - 1];
      var range = dMax - dMin;
      for (var i = 0; i < n; i++) {
        // Map each distance to its position in the CDF (0→1)
        var pos = range > 0 ? (dists[i] - dMin) / range : i / (n - 1);
        grad.addColorStop(pos, distToHSL(dists[i]));
        // Add midpoint blend between consecutive stops
        if (i < n - 1) {
          var midPos = range > 0
            ? ((dists[i] + dists[i + 1]) / 2 - dMin) / range
            : (i + 0.5) / (n - 1);
          grad.addColorStop(midPos, distToHSL((dists[i] + dists[i + 1]) / 2));
        }
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }
    var tex = new THREE.CanvasTexture(canvas);
    textureCache[nodeId] = tex;
    return tex;
  }

  // --- Level-based geometry ---
  var geoCache = {};
  function getLevelGeometry(level) {
    if (geoCache[level]) return geoCache[level];
    var geo;
    switch (level) {
      case 'req': geo = new THREE.SphereGeometry(5, 16, 12); break;
      case 'des': geo = new THREE.BoxGeometry(8, 8, 8); break;
      case 'imp': geo = new THREE.OctahedronGeometry(5); break;
      case 'tst': geo = new THREE.TetrahedronGeometry(6); break;
      default:    geo = new THREE.SphereGeometry(5, 16, 12); break;
    }
    geoCache[level] = geo;
    return geo;
  }

  // --- Node mesh management ---
  var nodeMeshes = {};
  function createNodeMesh(node, mode) {
    var geo = getLevelGeometry(node.level);
    var mat;
    if (mode === 'edges') {
      mat = new THREE.MeshBasicMaterial({ map: getEdgeTexture(node.id) });
    } else {
      mat = new THREE.MeshBasicMaterial({ color: getNodeColor(node, mode) });
    }
    var mesh = new THREE.Mesh(geo, mat);
    nodeMeshes[node.id] = mesh;
    return mesh;
  }

  // Initialize graph
  var container = document.getElementById('graph-container');
  var graph = ForceGraph3D()(container)
    .graphData({ nodes: rawData.nodes, links: rawData.links })
    .nodeLabel(function(n) {
      return '<div style="background:rgba(20,20,40,0.95);padding:8px 12px;border-radius:6px;font-size:12px;line-height:1.6;color:#e0e0e0;max-width:320px;pointer-events:none">'
        + '<div style="color:#8af;font-weight:bold;margin-bottom:4px">' + escapeHtml(n.fullId) + '</div>'
        + '<span style="color:#889">Level:</span> ' + escapeHtml(n.level)
        + ' &nbsp; <span style="color:#889">Scope:</span> ' + escapeHtml(n.scope) + '<br>'
        + '<span style="color:#889">File:</span> ' + escapeHtml(n.filePath) + ':' + n.lineNumber
        + '</div>';
    })
    .nodeThreeObject(function(n) { return createNodeMesh(n, currentColorMode); })
    .nodeThreeObjectExtend(false)
    .linkWidth(function(l) {
      var t = maxDist > 0 ? l.distance / maxDist : 0;
      return 3 * (1 - t) + 0.2;
    })
    .linkOpacity(0.6)
    .linkColor(function(l) {
      var a = maxDist > 0 ? 0.7 * (1 - l.distance / maxDist) + 0.15 : 0.5;
      return distToHSLA(l.distance, a);
    })
    .backgroundColor('#0a0a1a')
    .onNodeClick(function(node) { showDetail(node); });

  // ---- Tab navigation state ----
  var currentColorMode = 'edges';
  var focusedTabId = -1;  // -1 means no node focused
  var nodeIndicator = document.getElementById('node-indicator');

  function focusNode(tabId) {
    if (rawData.nodes.length === 0) return;
    clearFocus();
    focusedTabId = ((tabId % rawData.nodes.length) + rawData.nodes.length) % rawData.nodes.length;
    var node = rawData.nodes[focusedTabId];

    // Highlight focused mesh
    var mesh = nodeMeshes[node.id];
    if (mesh) {
      mesh.__origMat = mesh.material;
      mesh.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
      mesh.scale.set(1.8, 1.8, 1.8);
    }

    // Show indicator
    nodeIndicator.textContent = (focusedTabId + 1) + ' / ' + rawData.nodes.length + '  ' + node.fullId;
    nodeIndicator.style.display = 'block';

    // Show detail panel
    showDetail(node);

    // Move camera to focus on this node
    var dist = 150;
    graph.cameraPosition(
      { x: node.x + dist, y: node.y + dist * 0.3, z: node.z + dist },
      { x: node.x, y: node.y, z: node.z },
      600
    );
  }

  function clearFocus() {
    if (focusedTabId >= 0) {
      var prev = rawData.nodes[focusedTabId];
      var mesh = prev ? nodeMeshes[prev.id] : null;
      if (mesh && mesh.__origMat) {
        mesh.material = mesh.__origMat;
        mesh.scale.set(1, 1, 1);
      }
    }
    focusedTabId = -1;
    nodeIndicator.style.display = 'none';
  }

  function focusNearestToScreenCenter() {
    var camera = graph.camera();
    var renderer = graph.renderer();
    var w = renderer.domElement.width;
    var h = renderer.domElement.height;

    // Project each node to screen coordinates, find closest to center
    var bestDist = Infinity;
    var bestIdx = -1;
    var cx = w / 2, cy = h / 2;

    rawData.nodes.forEach(function(node, i) {
      if (typeof node.x !== 'number') return;
      // Project 3D -> 2D using camera
      var vx = node.x, vy = node.y, vz = node.z;
      // Apply view-projection matrix
      var mv = camera.matrixWorldInverse.elements;
      var pj = camera.projectionMatrix.elements;
      // View transform
      var ex = mv[0]*vx + mv[4]*vy + mv[8]*vz + mv[12];
      var ey = mv[1]*vx + mv[5]*vy + mv[9]*vz + mv[13];
      var ez = mv[2]*vx + mv[6]*vy + mv[10]*vz + mv[14];
      var ew = mv[3]*vx + mv[7]*vy + mv[11]*vz + mv[15];
      // Projection transform
      var px = pj[0]*ex + pj[4]*ey + pj[8]*ez + pj[12]*ew;
      var py = pj[1]*ex + pj[5]*ey + pj[9]*ez + pj[13]*ew;
      var pw = pj[3]*ex + pj[7]*ey + pj[11]*ez + pj[15]*ew;
      if (pw <= 0) return;  // behind camera
      // NDC to screen
      var sx = (px / pw * 0.5 + 0.5) * w;
      var sy = (-py / pw * 0.5 + 0.5) * h;
      var d = (sx - cx) * (sx - cx) + (sy - cy) * (sy - cy);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });

    if (bestIdx >= 0) {
      focusNode(bestIdx);
    }
  }

  // Apply MDS fixed positions if layout is mds
  if ('${layout}' === 'mds') {
    applyMDS();
  }

  // Stats
  updateStats(rawData.nodes.length, rawData.links.length);

  // Edge threshold slider
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
    currentColorMode = this.value;
    clearFocus();
    nodeMeshes = {};
    graph.nodeThreeObject(function(n) { return createNodeMesh(n, currentColorMode); });
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
      ['Cluster', node.clusterId],
      ['Tab ID', node.tabId]
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

  // ---- Rectangle selection (S key toggle mode) ----
  var selectRect = document.getElementById('select-rect');
  var resetBtn = document.getElementById('reset-selection');
  var modeIndicator = document.getElementById('mode-indicator');
  var selectMode = false;
  var isDragging = false;
  var selStart = { x: 0, y: 0 };
  var isFiltered = false;
  var fullNodes = rawData.nodes.slice();
  var fullLinks = allLinks.slice();

  function setSelectMode(on) {
    selectMode = on;
    if (on) {
      document.body.classList.add('select-mode');
      graph.controls().enabled = false;
      modeIndicator.style.display = 'block';
    } else {
      document.body.classList.remove('select-mode');
      graph.controls().enabled = true;
      modeIndicator.style.display = 'none';
      isDragging = false;
      selectRect.style.display = 'none';
    }
  }

  function projectToScreen(node) {
    var camera = graph.camera();
    var renderer = graph.renderer();
    var w = renderer.domElement.width;
    var h = renderer.domElement.height;
    var vx = node.x, vy = node.y, vz = node.z;
    if (typeof vx !== 'number') return null;
    var mv = camera.matrixWorldInverse.elements;
    var pj = camera.projectionMatrix.elements;
    var ex = mv[0]*vx + mv[4]*vy + mv[8]*vz + mv[12];
    var ey = mv[1]*vx + mv[5]*vy + mv[9]*vz + mv[13];
    var ez = mv[2]*vx + mv[6]*vy + mv[10]*vz + mv[14];
    var ew = mv[3]*vx + mv[7]*vy + mv[11]*vz + mv[15];
    var px = pj[0]*ex + pj[4]*ey + pj[8]*ez + pj[12]*ew;
    var py = pj[1]*ex + pj[5]*ey + pj[9]*ez + pj[13]*ew;
    var pw = pj[3]*ex + pj[7]*ey + pj[11]*ez + pj[15]*ew;
    if (pw <= 0) return null;
    var dpr = window.devicePixelRatio || 1;
    var sx = (px / pw * 0.5 + 0.5) * w / dpr;
    var sy = (-py / pw * 0.5 + 0.5) * h / dpr;
    return { x: sx, y: sy };
  }

  // In select mode, capture mouse on document (graph container has pointer-events:none)
  document.addEventListener('mousedown', function(e) {
    if (!selectMode || e.target.closest('#controls') || e.target.closest('#detail-panel')) return;
    isDragging = true;
    selStart = { x: e.clientX, y: e.clientY };
    selectRect.style.left = e.clientX + 'px';
    selectRect.style.top = e.clientY + 'px';
    selectRect.style.width = '0px';
    selectRect.style.height = '0px';
    selectRect.style.display = 'block';
    modeIndicator.style.display = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    var x = Math.min(e.clientX, selStart.x);
    var y = Math.min(e.clientY, selStart.y);
    var w = Math.abs(e.clientX - selStart.x);
    var h = Math.abs(e.clientY - selStart.y);
    selectRect.style.left = x + 'px';
    selectRect.style.top = y + 'px';
    selectRect.style.width = w + 'px';
    selectRect.style.height = h + 'px';
  });

  document.addEventListener('mouseup', function(e) {
    if (!isDragging) return;
    isDragging = false;
    selectRect.style.display = 'none';

    var rx1 = Math.min(e.clientX, selStart.x);
    var ry1 = Math.min(e.clientY, selStart.y);
    var rx2 = Math.max(e.clientX, selStart.x);
    var ry2 = Math.max(e.clientY, selStart.y);

    // Exit select mode after drag
    setSelectMode(false);

    // Ignore tiny drags (< 5px)
    if (rx2 - rx1 < 5 && ry2 - ry1 < 5) return;

    // Find nodes within the rectangle
    var sourceNodes = isFiltered ? graph.graphData().nodes : fullNodes;
    var selected = [];
    var selectedIds = {};
    sourceNodes.forEach(function(node) {
      var sp = projectToScreen(node);
      if (sp && sp.x >= rx1 && sp.x <= rx2 && sp.y >= ry1 && sp.y <= ry2) {
        selected.push(node);
        selectedIds[node.id] = true;
      }
    });

    if (selected.length === 0) return;

    // Filter links to only those between selected nodes
    var selectedLinks = fullLinks.filter(function(l) {
      var sid = typeof l.source === 'object' ? l.source.id : l.source;
      var tid = typeof l.target === 'object' ? l.target.id : l.target;
      return selectedIds[sid] && selectedIds[tid];
    });

    // Apply threshold filter
    selectedLinks = selectedLinks.filter(function(l) { return l.distance <= currentThreshold; });

    isFiltered = true;
    resetBtn.style.display = 'block';
    clearFocus();
    graph.graphData({ nodes: selected, links: selectedLinks });
    updateStats(selected.length, selectedLinks.length);
  });

  resetBtn.addEventListener('click', function() { resetSelection(); });

  function resetSelection() {
    if (!isFiltered) return;
    isFiltered = false;
    resetBtn.style.display = 'none';
    clearFocus();
    var filtered = fullLinks.filter(function(l) { return l.distance <= currentThreshold; });
    graph.graphData({ nodes: fullNodes, links: filtered });
    rawData.nodes = fullNodes;
    updateStats(fullNodes.length, filtered.length);
    // Re-apply MDS if in MDS mode
    if (document.getElementById('layout-mode').value === 'mds') {
      applyMDS();
    }
  }

  // ---- Keyboard shortcuts ----
  var ZOOM_STEP = 0.85;
  var PAN_STEP = 20;
  var ROTATE_STEP = 0.05;

  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;

    var camera = graph.camera();
    var ctrl = graph.controls();

    switch (e.key) {
      case 'Enter': {
        if (e.metaKey) {
          focusNearestToScreenCenter();
          e.preventDefault();
        }
        break;
      }
      case 'Tab': {
        if (e.shiftKey) {
          focusNode(focusedTabId <= 0 ? rawData.nodes.length - 1 : focusedTabId - 1);
        } else {
          focusNode(focusedTabId + 1);
        }
        e.preventDefault();
        break;
      }
      case 'Escape': {
        if (selectMode) {
          setSelectMode(false);
        } else {
          clearFocus();
          document.getElementById('detail-panel').style.display = 'none';
          resetSelection();
        }
        e.preventDefault();
        break;
      }
      case 's':
      case 'S': {
        setSelectMode(!selectMode);
        e.preventDefault();
        break;
      }
      case '+':
      case '=': {
        var v = camera.position.clone().sub(ctrl.target);
        v.multiplyScalar(ZOOM_STEP);
        camera.position.copy(ctrl.target).add(v);
        ctrl.update();
        e.preventDefault();
        break;
      }
      case '-':
      case '_': {
        var v2 = camera.position.clone().sub(ctrl.target);
        v2.multiplyScalar(1 / ZOOM_STEP);
        camera.position.copy(ctrl.target).add(v2);
        ctrl.update();
        e.preventDefault();
        break;
      }
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown': {
        if (e.shiftKey) {
          var dh = 0, dv = 0;
          if (e.key === 'ArrowLeft')  dh = -ROTATE_STEP;
          if (e.key === 'ArrowRight') dh =  ROTATE_STEP;
          if (e.key === 'ArrowUp')    dv = -ROTATE_STEP;
          if (e.key === 'ArrowDown')  dv =  ROTATE_STEP;
          rotateCamera(dh, dv);
        } else {
          var dx = 0, dy = 0;
          if (e.key === 'ArrowLeft')  dx =  PAN_STEP;
          if (e.key === 'ArrowRight') dx = -PAN_STEP;
          if (e.key === 'ArrowUp')    dy = -PAN_STEP;
          if (e.key === 'ArrowDown')  dy =  PAN_STEP;
          panCamera(dx, dy);
        }
        e.preventDefault();
        break;
      }
    }
  });

  // Rodrigues' rotation: rotate vector (vx,vy,vz) around axis (ax,ay,az) by angle
  function rotVec(vx, vy, vz, ax, ay, az, angle) {
    var c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
    var dot = ax * vx + ay * vy + az * vz;
    // cross = axis x vec
    var crx = ay * vz - az * vy;
    var cry = az * vx - ax * vz;
    var crz = ax * vy - ay * vx;
    return [
      vx * c + crx * s + ax * dot * t,
      vy * c + cry * s + ay * dot * t,
      vz * c + crz * s + az * dot * t
    ];
  }

  function rotateCamera(dh, dv) {
    var camera = graph.camera();
    var ctrl = graph.controls();

    // Orbit center: focused node position, or ctrl.target if no focus
    var cx, cy, cz;
    if (focusedTabId >= 0) {
      var fn = rawData.nodes[focusedTabId];
      cx = fn.x || 0;  cy = fn.y || 0;  cz = fn.z || 0;
    } else {
      cx = ctrl.target.x;  cy = ctrl.target.y;  cz = ctrl.target.z;
    }

    // Vector from center to camera
    var ox = camera.position.x - cx;
    var oy = camera.position.y - cy;
    var oz = camera.position.z - cz;
    var r = Math.sqrt(ox * ox + oy * oy + oz * oz);
    if (r < 0.001) return;

    // Camera-local right axis from matrixWorld
    var m = camera.matrixWorld.elements;
    var rightX = m[0], rightY = m[1], rightZ = m[2];
    var rLen = Math.sqrt(rightX * rightX + rightY * rightY + rightZ * rightZ);
    rightX /= rLen;  rightY /= rLen;  rightZ /= rLen;

    // World up axis for horizontal rotation
    var upX = 0, upY = 1, upZ = 0;

    // Horizontal rotation (around world Y axis)
    if (dh !== 0) {
      var rh = rotVec(ox, oy, oz, upX, upY, upZ, dh);
      ox = rh[0]; oy = rh[1]; oz = rh[2];
    }

    // Vertical rotation (around camera-local right axis) — no clamp
    if (dv !== 0) {
      var rv = rotVec(ox, oy, oz, rightX, rightY, rightZ, dv);
      ox = rv[0]; oy = rv[1]; oz = rv[2];
    }

    camera.position.x = cx + ox;
    camera.position.y = cy + oy;
    camera.position.z = cz + oz;
    camera.lookAt(cx, cy, cz);

    // Keep ctrl.target in sync
    ctrl.target.x = cx;  ctrl.target.y = cy;  ctrl.target.z = cz;
    ctrl.update();
  }

  function panCamera(dx, dy) {
    var camera = graph.camera();
    var ctrl = graph.controls();

    // Compute camera-local right / up axes from the view matrix
    var m = camera.matrixWorld.elements;
    var rx = m[0], ry = m[1], rz = m[2];   // right vector (column 0)
    var ux = m[4], uy = m[5], uz = m[6];   // up vector    (column 1)

    // Scale movement relative to distance so feel stays consistent
    var dist = camera.position.distanceTo(ctrl.target);
    var s = dist * 0.002;

    var ox = (rx * dx + ux * dy) * s;
    var oy = (ry * dx + uy * dy) * s;
    var oz = (rz * dx + uz * dy) * s;

    camera.position.x += ox;  camera.position.y += oy;  camera.position.z += oz;
    ctrl.target.x     += ox;  ctrl.target.y     += oy;  ctrl.target.z     += oz;
    ctrl.update();
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

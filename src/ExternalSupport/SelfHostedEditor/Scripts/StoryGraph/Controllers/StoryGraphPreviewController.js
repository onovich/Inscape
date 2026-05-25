import { ScriptDocumentModelBuilder } from "../../ProjectWorkspace/Models/ScriptDocumentModelBuilder.js";

export class StoryGraphPreviewController {
  constructor(panelElement) {
    this.panelElement = panelElement;
    this.edgeRetargetRequestedHandlers = [];
    this.nodeRenameRequestedHandlers = [];
    this.sourceLineSelectedHandlers = [];
    this.savedPositions = new Map();
    this.activeGraph = null;
    this.activeEdgeHighlight = null;
    this.connectionDragState = null;
    this.dragState = null;
    this.panState = null;
    this.pendingEdgeRefreshFrame = 0;
    this.viewportTransform = {
      scale: 1,
      x: 24,
      y: 24,
    };
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.scheduleEdgeRefresh());
      this.resizeObserver.observe(this.panelElement);
    }
  }

  onEdgeRetargetRequested(handler) {
    this.edgeRetargetRequestedHandlers.push(handler);
  }

  onNodeRenameRequested(handler) {
    this.nodeRenameRequestedHandlers.push(handler);
  }

  onSourceLineSelected(handler) {
    this.sourceLineSelectedHandlers.push(handler);
  }

  render(graphModel, fallbackScriptText = "") {
    const documentModel = graphModel || ScriptDocumentModelBuilder.build(fallbackScriptText);
    if ((documentModel.nodes || []).length === 0) {
      this.panelElement.replaceChildren(this.createEmptyState());
      return;
    }

    const graphEdges = documentModel.edges || this.createGraphEdges(documentModel.nodes);
    const projectedGraph = this.projectGraphForDisplay(documentModel.nodes, graphEdges);
    const layout = this.createGraphLayout(projectedGraph.nodes);
    const viewport = this.createGraphViewport();
    const graph = document.createElement("div");
    graph.className = "graph-board";
    graph.style.width = `${layout.width}px`;
    graph.style.height = `${layout.height}px`;
    const edgeLayer = this.createEdgeLayer(layout);
    graph.append(edgeLayer);
    viewport.append(this.createViewportControls(), graph);
    this.activeGraph = {
      edgeLayer,
      graph,
      graphEdges: projectedGraph.edges,
      layout,
      nodes: projectedGraph.nodes,
      viewport,
    };

    for (const node of projectedGraph.nodes) {
      graph.append(this.createNodeCard(node, layout.positions.get(node.graphId)));
    }

    this.applyViewportTransform();
    this.panelElement.replaceChildren(viewport);
    this.scheduleEdgeRefresh();
  }

  createGraphViewport() {
    const viewport = document.createElement("div");
    viewport.className = "graph-viewport";
    viewport.addEventListener("wheel", (event) => this.handleViewportWheel(event), {
      passive: false,
    });
    viewport.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest(".graph-node, .graph-viewport-controls")) {
        return;
      }

      event.preventDefault();
      this.startViewportPan(event, viewport);
      viewport.setPointerCapture(event.pointerId);
    });
    viewport.addEventListener("pointermove", (event) => this.moveViewportPan(event));
    viewport.addEventListener("pointerup", (event) => this.endViewportPan(event, viewport));
    viewport.addEventListener("pointercancel", (event) => this.endViewportPan(event, viewport));
    return viewport;
  }

  createViewportControls() {
    const controls = document.createElement("div");
    controls.className = "graph-viewport-controls";
    controls.append(
      this.createViewportButton("-", "Zoom out", () => this.zoomViewportBy(0.88)),
      this.createViewportButton("+", "Zoom in", () => this.zoomViewportBy(1.12)),
      this.createViewportButton("1:1", "Reset zoom", () => this.resetViewport())
    );
    return controls;
  }

  createViewportButton(label, title, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "graph-viewport-button";
    button.title = title;
    button.textContent = label;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  scheduleEdgeRefresh() {
    if (!this.activeGraph) {
      return;
    }

    if (this.pendingEdgeRefreshFrame) {
      cancelAnimationFrame(this.pendingEdgeRefreshFrame);
    }

    this.pendingEdgeRefreshFrame = requestAnimationFrame(() => {
      this.pendingEdgeRefreshFrame = 0;
      this.refreshEdges();
    });
  }

  applyViewportTransform() {
    if (!this.activeGraph?.graph) {
      return;
    }

    const { scale, x, y } = this.viewportTransform;
    this.activeGraph.graph.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    this.activeGraph.viewport?.style.setProperty("--graph-pan-x", `${x}px`);
    this.activeGraph.viewport?.style.setProperty("--graph-pan-y", `${y}px`);
    this.activeGraph.viewport?.style.setProperty("--graph-grid-size", `${22 * scale}px`);
    this.scheduleEdgeRefresh();
  }

  handleViewportWheel(event) {
    if (!this.activeGraph?.viewport) {
      return;
    }

    event.preventDefault();
    const viewportBounds = this.activeGraph.viewport.getBoundingClientRect();
    const pointerX = event.clientX - viewportBounds.left;
    const pointerY = event.clientY - viewportBounds.top;
    const previousScale = this.viewportTransform.scale;
    const nextScale = this.clampScale(previousScale * (event.deltaY > 0 ? 0.92 : 1.08));
    if (nextScale === previousScale) {
      return;
    }

    const graphX = (pointerX - this.viewportTransform.x) / previousScale;
    const graphY = (pointerY - this.viewportTransform.y) / previousScale;
    this.viewportTransform.scale = nextScale;
    this.viewportTransform.x = pointerX - graphX * nextScale;
    this.viewportTransform.y = pointerY - graphY * nextScale;
    this.applyViewportTransform();
  }

  zoomViewportBy(factor) {
    const viewportBounds = this.activeGraph?.viewport?.getBoundingClientRect();
    const centerX = (viewportBounds?.width || 0) / 2;
    const centerY = (viewportBounds?.height || 0) / 2;
    const previousScale = this.viewportTransform.scale;
    const nextScale = this.clampScale(previousScale * factor);
    const graphX = (centerX - this.viewportTransform.x) / previousScale;
    const graphY = (centerY - this.viewportTransform.y) / previousScale;
    this.viewportTransform.scale = nextScale;
    this.viewportTransform.x = centerX - graphX * nextScale;
    this.viewportTransform.y = centerY - graphY * nextScale;
    this.applyViewportTransform();
  }

  resetViewport() {
    this.viewportTransform = {
      scale: 1,
      x: 24,
      y: 24,
    };
    this.applyViewportTransform();
  }

  clampScale(scale) {
    return Math.max(0.42, Math.min(1.8, scale));
  }

  createNodeCard(node, position) {
    const card = document.createElement("article");
    card.className = node.isReference ? "graph-node graph-node-reference" : "graph-node";
    card.dataset.sourceLine = String(node.sourceLine);
    if (position) {
      card.style.left = `${position.x}px`;
      card.style.top = `${position.y}px`;
    }
    card.dataset.graphId = node.graphId || node.title;
    card.dataset.nodeTitle = node.title;
    card.dataset.targetTitle = node.referenceOfTitle || node.title;
    if (node.isReference) {
      card.dataset.referenceOfTitle = node.referenceOfTitle || "";
      card.dataset.referenceSourceGraphId = node.referenceSourceGraphId || "";
      card.addEventListener("pointerenter", () => this.setReferenceHighlight(node, true));
      card.addEventListener("pointerleave", () => this.setReferenceHighlight(node, false));
      card.addEventListener("focusin", () => this.setReferenceHighlight(node, true));
      card.addEventListener("focusout", () => this.setReferenceHighlight(node, false));
    }
    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) {
        return;
      }

      this.notifySourceLineSelected(node.referenceSourceLine || node.sourceLine, node.referenceSourcePath || node.sourcePath || "");
    });
    card.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest("button") || event.target.closest(".graph-port-output")) {
        return;
      }

      this.startNodeDrag(event, card, node.graphId || node.title);
      card.setPointerCapture(event.pointerId);
    });
    card.addEventListener("pointermove", (event) => {
      this.moveNodeDrag(event);
    });
    card.addEventListener("pointerup", (event) => {
      this.endNodeDrag(event, card);
    });
    card.addEventListener("pointercancel", (event) => {
      this.endNodeDrag(event, card);
    });

    const header = document.createElement("div");
    header.className = "graph-node-header";

    const dragHandle = document.createElement("span");
    dragHandle.className = "graph-node-drag-handle";
    dragHandle.title = "Drag card";
    dragHandle.setAttribute("aria-label", "Drag node");
    dragHandle.setAttribute("role", "button");
    dragHandle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }

      this.startNodeDrag(event, card, node.graphId || node.title);
      dragHandle.setPointerCapture(event.pointerId);
    });
    dragHandle.addEventListener("pointermove", (event) => {
      this.moveNodeDrag(event);
    });
    dragHandle.addEventListener("pointerup", (event) => {
      this.endNodeDrag(event, dragHandle);
    });
    dragHandle.addEventListener("pointercancel", (event) => {
      this.endNodeDrag(event, dragHandle);
    });
    for (let index = 0; index < 6; index += 1) {
      const dot = document.createElement("span");
      dot.className = "graph-node-drag-dot";
      dragHandle.append(dot);
    }

    const title = document.createElement("h2");
    title.textContent = node.title;

    const renameButton = document.createElement("button");
    renameButton.className = "graph-node-rename";
    renameButton.type = "button";
    renameButton.textContent = node.isReference ? "Ref" : "Rename";
    renameButton.disabled = Boolean(node.isReference);
    renameButton.addEventListener("click", (event) => {
      event.stopPropagation();
      if (node.isReference) {
        return;
      }

      this.notifyNodeRenameRequested(node);
    });
    header.append(dragHandle, title, renameButton);

    const inputPort = document.createElement("span");
    inputPort.className = "graph-port graph-port-input";
    inputPort.dataset.graphId = node.graphId || node.title;
    inputPort.dataset.nodeTitle = node.title;
    inputPort.dataset.targetTitle = node.referenceOfTitle || node.title;
    inputPort.title = node.isReference ? `Reference to ${node.referenceOfTitle}` : "Incoming";
    card.append(inputPort);

    const meta = document.createElement("p");
    meta.className = "graph-node-meta";
    meta.textContent = node.isReference ? "Input-only shortcut" : `${node.lineCount ?? node.lines.length} lines`;

    const edgeList = document.createElement("div");
    edgeList.className = "graph-port-list";
    const outgoingEdges = node.isReference ? [] : [...node.choices, ...node.jumps];
    outgoingEdges.forEach((edge, index) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "graph-port-row";
      row.dataset.edgeOrder = String(index);
      row.addEventListener("pointerenter", () => this.setEdgeEndpointHighlight(edge, true));
      row.addEventListener("pointerleave", () => this.setEdgeEndpointHighlight(edge, false));
      row.addEventListener("focusin", () => this.setEdgeEndpointHighlight(edge, true));
      row.addEventListener("focusout", () => this.setEdgeEndpointHighlight(edge, false));
      row.addEventListener("click", (event) => {
        event.stopPropagation();
        this.notifySourceLineSelected(edge.sourceLine, edge.sourcePath || "");
      });

      const port = document.createElement("span");
      port.className = "graph-port graph-port-output";
      port.dataset.sourceLine = String(edge.sourceLine);
      port.dataset.sourcePath = edge.sourcePath || "";
      port.dataset.sourceTitle = node.title;
      port.dataset.targetTitle = edge.target || "";
      port.title = edge.target ? `Drag to reconnect ${edge.target}` : "Drag to connect";
      port.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        this.startConnectionDrag(event, edge, index, node.title);
        port.setPointerCapture(event.pointerId);
      });
      port.addEventListener("pointermove", (event) => {
        this.moveConnectionDrag(event);
      });
      port.addEventListener("pointerup", (event) => {
        this.endConnectionDrag(event, port);
      });
      port.addEventListener("pointercancel", (event) => {
        this.cancelConnectionDrag(event, port);
      });

      const order = document.createElement("span");
      order.className = "graph-edge-order";
      order.textContent = String(index + 1).padStart(2, "0");

      const label = document.createElement("span");
      label.className = "graph-edge-label";
      label.textContent = edge.text || "continue";

      const target = document.createElement("small");
      target.className = "graph-edge-target";
      target.textContent = edge.target || "no target";

      const disconnect = document.createElement("span");
      disconnect.className = "graph-edge-disconnect";
      disconnect.title = "Disconnect";
      disconnect.textContent = "x";
      disconnect.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.notifyEdgeRetargetRequested(edge.sourceLine, "", edge.sourcePath || "");
      });

      row.append(order, label, target, disconnect, port);
      edgeList.append(row);
    });

    if (outgoingEdges.length === 0) {
      const empty = document.createElement("div");
      empty.className = node.isReference ? "graph-port-empty graph-port-reference-note" : "graph-port-empty";
      empty.textContent = node.isReference ? "No outgoing ports" : "No exits";
      edgeList.append(empty);
    }

    card.append(header, meta, edgeList);
    return card;
  }

  createGraphLayout(nodes) {
    const positions = new Map();
    const nodeWidth = 220;
    const realNodes = nodes.filter((node) => !node.isReference);
    const referenceNodes = nodes.filter((node) => node.isReference);
    const maxOutgoingCount = realNodes.reduce((count, node) => Math.max(count, node.choices.length + node.jumps.length), 0);
    const nodeHeight = Math.max(156, 102 + maxOutgoingCount * 32);
    const referenceNodeHeight = 124;
    const referenceLaneGap = 64;
    const referenceLaneWidth = nodeWidth;
    const columnGap = 156;
    const rowGap = 72;
    const columns = Math.max(1, Math.ceil(Math.sqrt(realNodes.length)));
    const columnPitch = nodeWidth + referenceLaneGap + referenceLaneWidth + columnGap;
    realNodes.forEach((node, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const graphId = node.graphId || node.title;
      const savedPosition = this.savedPositions.get(graphId);
      positions.set(graphId, {
        x: savedPosition?.x ?? 34 + column * columnPitch,
        y: savedPosition?.y ?? 34 + row * (nodeHeight + rowGap),
      });
    });

    const referenceIndexBySource = new Map();
    referenceNodes.forEach((node) => {
      const graphId = node.graphId || node.title;
      const savedPosition = this.savedPositions.get(graphId);
      const sourcePosition = positions.get(node.referenceSourceGraphId || "");
      const sourceReferenceIndex = referenceIndexBySource.get(node.referenceSourceGraphId) || 0;
      referenceIndexBySource.set(node.referenceSourceGraphId, sourceReferenceIndex + 1);
      positions.set(graphId, {
        x: savedPosition?.x ?? (sourcePosition?.x ?? 34) + nodeWidth + referenceLaneGap,
        y: savedPosition?.y ?? (sourcePosition?.y ?? 34) + 18 + sourceReferenceIndex * (referenceNodeHeight + 30),
      });
    });

    const rows = Math.ceil(realNodes.length / columns);
    const maxPosition = [...positions.values()].reduce(
      (bounds, position) => ({
        x: Math.max(bounds.x, position.x),
        y: Math.max(bounds.y, position.y),
      }),
      { x: 0, y: 0 }
    );
    return {
      height: Math.max(420, 68 + rows * nodeHeight + Math.max(0, rows - 1) * rowGap, maxPosition.y + nodeHeight + 44),
      nodeHeight,
      nodeWidth,
      positions,
      width: Math.max(860, 68 + columns * nodeWidth + Math.max(0, columns - 1) * (referenceLaneGap + referenceLaneWidth + columnGap), maxPosition.x + nodeWidth + 44),
    };
  }

  createGraphEdges(nodes) {
    const edges = [];
    for (const node of nodes) {
      [...node.choices, ...node.jumps].forEach((edge, index) => {
        if (!edge.target) {
          return;
        }

        edges.push({
          order: index,
          sourceLine: edge.sourceLine,
          sourceTitle: node.title,
          targetTitle: edge.target,
          text: edge.text || "",
        });
      });
    }

    return edges;
  }

  projectGraphForDisplay(nodes, graphEdges) {
    const nodeIndexByTitle = new Map(nodes.map((node, index) => [node.title, index]));
    const projectedNodes = nodes.map((node) => ({
      ...node,
      graphId: node.title,
      isReference: false,
    }));
    const projectedEdges = [];
    const displayedAdjacency = new Map();

    for (const edge of graphEdges) {
      const sourceIndex = nodeIndexByTitle.get(edge.sourceTitle);
      const targetIndex = nodeIndexByTitle.get(edge.targetTitle);
      const pointsToEarlierLayoutNode = Number.isInteger(sourceIndex)
        && Number.isInteger(targetIndex)
        && targetIndex <= sourceIndex;
      const createsDisplayCycle = this.edgeCreatesDisplayCycle(displayedAdjacency, edge.sourceTitle, edge.targetTitle);
      const shouldCreateReference = pointsToEarlierLayoutNode || createsDisplayCycle;
      if (!shouldCreateReference) {
        projectedEdges.push({
          ...edge,
          sourceGraphId: edge.sourceTitle,
          targetGraphId: edge.targetTitle,
        });
        this.addDisplayedEdge(displayedAdjacency, edge.sourceTitle, edge.targetTitle);
        continue;
      }

      const targetNode = nodes[targetIndex];
      const referenceGraphId = `ref:${edge.sourcePath || ""}:${edge.sourceLine}:${edge.sourceTitle}->${edge.targetTitle}`;
      projectedNodes.push({
        ...targetNode,
        choices: [],
        graphId: referenceGraphId,
        isReference: true,
        jumps: [],
        lineCount: targetNode?.lineCount ?? 0,
        referenceOfTitle: edge.targetTitle,
        referenceSourceGraphId: edge.sourceTitle,
        referenceSourceLine: targetNode?.sourceLine || 1,
        referenceSourcePath: targetNode?.sourcePath || "",
        sourceLine: edge.sourceLine,
        sourcePath: edge.sourcePath || "",
      });
      projectedEdges.push({
        ...edge,
        isReferenceEdge: true,
        sourceGraphId: edge.sourceTitle,
        targetGraphId: referenceGraphId,
      });
    }

    return {
      edges: projectedEdges,
      nodes: projectedNodes,
    };
  }

  edgeCreatesDisplayCycle(adjacency, sourceTitle, targetTitle) {
    if (!sourceTitle || !targetTitle) {
      return false;
    }

    if (sourceTitle === targetTitle) {
      return true;
    }

    return this.hasDisplayedPath(adjacency, targetTitle, sourceTitle);
  }

  hasDisplayedPath(adjacency, startTitle, targetTitle) {
    const pending = [startTitle];
    const visited = new Set();
    while (pending.length > 0) {
      const title = pending.pop();
      if (!title || visited.has(title)) {
        continue;
      }

      if (title === targetTitle) {
        return true;
      }

      visited.add(title);
      for (const nextTitle of adjacency.get(title) || []) {
        pending.push(nextTitle);
      }
    }

    return false;
  }

  addDisplayedEdge(adjacency, sourceTitle, targetTitle) {
    if (!sourceTitle || !targetTitle) {
      return;
    }

    if (!adjacency.has(sourceTitle)) {
      adjacency.set(sourceTitle, new Set());
    }
    adjacency.get(sourceTitle).add(targetTitle);
  }

  createEdgeLayer(layout) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("graph-edge-layer");
    svg.setAttribute("width", String(layout.width));
    svg.setAttribute("height", String(layout.height));
    svg.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);

    return svg;
  }

  getInputPortPosition(position, layout) {
    return {
      x: position.x,
      y: position.y + 58,
    };
  }

  getOutputPortPosition(position, order, layout) {
    return {
      x: position.x + layout.nodeWidth,
      y: position.y + 80 + order * 32,
    };
  }

  startNodeDrag(event, card, nodeTitle) {
    event.preventDefault();
    event.stopPropagation();
    const currentPosition = this.getNodePosition(card);
    const pointerPosition = this.clientToGraphPoint(event.clientX, event.clientY);
    this.dragState = {
      card,
      nodeTitle,
      offsetX: pointerPosition.x - currentPosition.x,
      offsetY: pointerPosition.y - currentPosition.y,
      pointerId: event.pointerId,
    };
    card.classList.add("is-dragging");
  }

  moveNodeDrag(event) {
    if (!this.dragState || this.dragState.pointerId !== event.pointerId) {
      return;
    }

    const pointerPosition = this.clientToGraphPoint(event.clientX, event.clientY);
    const nextX = Math.max(18, pointerPosition.x - this.dragState.offsetX);
    const nextY = Math.max(18, pointerPosition.y - this.dragState.offsetY);
    this.setNodePosition(this.dragState.card, this.dragState.nodeTitle, nextX, nextY);
    this.scheduleEdgeRefresh();
  }

  startViewportPan(event, viewport) {
    viewport.classList.add("is-panning");
    this.panState = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: this.viewportTransform.x,
      startY: this.viewportTransform.y,
    };
  }

  moveViewportPan(event) {
    if (!this.panState || this.panState.pointerId !== event.pointerId) {
      return;
    }

    this.viewportTransform.x = this.panState.startX + event.clientX - this.panState.startClientX;
    this.viewportTransform.y = this.panState.startY + event.clientY - this.panState.startClientY;
    this.applyViewportTransform();
  }

  endViewportPan(event, viewport) {
    if (!this.panState || this.panState.pointerId !== event.pointerId) {
      return;
    }

    viewport.classList.remove("is-panning");
    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
    this.panState = null;
  }

  startConnectionDrag(event, edge, order, sourceTitle) {
    if (!this.activeGraph) {
      return;
    }

    const start = this.getOutputPortCenter(edge);
    if (!start) {
      return;
    }

    const previewPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    previewPath.setAttribute("class", "graph-edge-path graph-edge-preview-path");
    this.activeGraph.edgeLayer.append(previewPath);
    this.activeGraph.graph.classList.add("is-connecting");
    this.connectionDragState = {
      order,
      previewPath,
      sourceLine: edge.sourceLine,
      sourcePath: edge.sourcePath || "",
      sourceTitle,
      start,
    };
    this.updateConnectionPreview(event.clientX, event.clientY);
  }

  moveConnectionDrag(event) {
    if (!this.connectionDragState) {
      return;
    }

    this.updateConnectionPreview(event.clientX, event.clientY);
    this.setConnectionTargetHighlight(event.clientX, event.clientY);
  }

  endConnectionDrag(event, port) {
    if (!this.connectionDragState) {
      return;
    }

    const targetTitle = this.findConnectionTargetTitle(event.clientX, event.clientY);
    const sourceLine = this.connectionDragState.sourceLine;
    const sourcePath = this.connectionDragState.sourcePath;
    this.clearConnectionDrag(port, event.pointerId);
    this.notifyEdgeRetargetRequested(sourceLine, targetTitle, sourcePath);
  }

  cancelConnectionDrag(event, port) {
    this.clearConnectionDrag(port, event.pointerId);
  }

  updateConnectionPreview(clientX, clientY) {
    if (!this.connectionDragState) {
      return;
    }

    const end = this.clientToGraphPoint(clientX, clientY);
    const start = this.connectionDragState.start;
    this.connectionDragState.previewPath.setAttribute(
      "d",
      this.createConnectionPath(start, end)
    );
  }

  setConnectionTargetHighlight(clientX, clientY) {
    const target = this.findConnectionTargetElement(clientX, clientY);
    for (const card of this.panelElement.querySelectorAll(".graph-node")) {
      card.classList.toggle("is-connection-target", Boolean(target && card === target));
    }
  }

  findConnectionTargetTitle(clientX, clientY) {
    const target = this.findConnectionTargetElement(clientX, clientY);
    return target?.dataset?.targetTitle || target?.dataset?.nodeTitle || "";
  }

  findConnectionTargetElement(clientX, clientY) {
    const element = document.elementFromPoint(clientX, clientY);
    const inputPort = element?.closest?.(".graph-port-input");
    if (inputPort) {
      return inputPort.closest(".graph-node");
    }

    const hitPadding = 14;
    for (const candidatePort of this.panelElement.querySelectorAll(".graph-port-input")) {
      const bounds = candidatePort.getBoundingClientRect();
      if (
        clientX >= bounds.left - hitPadding &&
        clientX <= bounds.right + hitPadding &&
        clientY >= bounds.top - hitPadding &&
        clientY <= bounds.bottom + hitPadding
      ) {
        return candidatePort.closest(".graph-node");
      }
    }

    return null;
  }

  setReferenceHighlight(referenceNode, isActive) {
    this.clearReferenceHighlight();
    if (!isActive || !referenceNode?.isReference) {
      return;
    }

    const targetTitle = referenceNode.referenceOfTitle || "";
    const sourceGraphId = referenceNode.referenceSourceGraphId || "";
    const targetCard = targetTitle
      ? this.activeGraph?.graph?.querySelector(`.graph-node[data-graph-id="${CSS.escape(targetTitle)}"]`)
      : null;
    const sourceCard = sourceGraphId
      ? this.activeGraph?.graph?.querySelector(`.graph-node[data-graph-id="${CSS.escape(sourceGraphId)}"]`)
      : null;
    targetCard?.classList.add("is-reference-target");
    sourceCard?.classList.add("is-reference-source");
  }

  clearReferenceHighlight() {
    for (const card of this.panelElement.querySelectorAll(".graph-node.is-reference-target, .graph-node.is-reference-source")) {
      card.classList.remove("is-reference-target", "is-reference-source");
    }
  }

  setEdgeEndpointHighlight(edge, isActive) {
    this.activeEdgeHighlight = isActive ? edge : null;
    this.clearEdgeEndpointHighlight();
    if (!isActive || !edge) {
      return;
    }

    this.applyEdgeEndpointHighlight(edge);
  }

  applyEdgeEndpointHighlight(edge) {
    const projectedEdge = this.findProjectedEdge(edge);
    const sourceGraphId = projectedEdge?.sourceGraphId || this.getEdgeSourceTitle(edge);
    const targetGraphId = projectedEdge?.targetGraphId || this.getEdgeTargetTitle(edge);
    const sourceCard = sourceGraphId
      ? this.activeGraph?.graph?.querySelector(`.graph-node[data-graph-id="${CSS.escape(sourceGraphId)}"]`)
      : null;
    const targetCard = targetGraphId
      ? this.activeGraph?.graph?.querySelector(`.graph-node[data-graph-id="${CSS.escape(targetGraphId)}"]`)
      : null;
    const path = this.findEdgePath(projectedEdge || edge);
    sourceCard?.classList.add("is-edge-source");
    targetCard?.classList.add("is-edge-target");
    path?.classList.add("is-edge-hovered");
  }

  clearEdgeEndpointHighlight() {
    for (const card of this.panelElement.querySelectorAll(".graph-node.is-edge-source, .graph-node.is-edge-target")) {
      card.classList.remove("is-edge-source", "is-edge-target");
    }
    for (const path of this.panelElement.querySelectorAll(".graph-edge-path.is-edge-hovered")) {
      path.classList.remove("is-edge-hovered");
    }
  }

  findProjectedEdge(edge) {
    const sourceTitle = this.getEdgeSourceTitle(edge);
    const targetTitle = this.getEdgeTargetTitle(edge);
    return this.activeGraph?.graphEdges?.find((candidate) =>
      candidate.sourceLine === edge.sourceLine
      && (candidate.sourcePath || "") === (edge.sourcePath || "")
      && candidate.sourceTitle === sourceTitle
      && candidate.targetTitle === targetTitle
    ) || null;
  }

  findEdgePath(edge) {
    const sourceTitle = this.getEdgeSourceTitle(edge);
    const targetTitle = this.getEdgeTargetTitle(edge);
    const selector = [
      `.graph-edge-path[data-source-line="${String(edge.sourceLine)}"]`,
      `[data-source-path="${CSS.escape(edge.sourcePath || "")}"]`,
      `[data-source-title="${CSS.escape(sourceTitle)}"]`,
      `[data-target-title="${CSS.escape(targetTitle)}"]`,
    ].join("");
    return this.activeGraph?.edgeLayer?.querySelector(selector) || null;
  }

  getEdgeSourceTitle(edge) {
    return edge?.sourceTitle || edge?.nodeTitle || "";
  }

  getEdgeTargetTitle(edge) {
    return edge?.targetTitle || edge?.target || "";
  }

  clearConnectionDrag(port, pointerId) {
    if (this.connectionDragState?.previewPath) {
      this.connectionDragState.previewPath.remove();
    }

    this.activeGraph?.graph?.classList.remove("is-connecting");
    for (const card of this.panelElement.querySelectorAll(".graph-node")) {
      card.classList.remove("is-connection-target");
    }

    if (port.hasPointerCapture(pointerId)) {
      port.releasePointerCapture(pointerId);
    }
    this.connectionDragState = null;
  }

  getNodePosition(card) {
    const boardBounds = this.activeGraph?.graph?.getBoundingClientRect();
    const cardBounds = card.getBoundingClientRect();
    const scale = this.viewportTransform.scale || 1;
    return {
      x: (cardBounds.left - (boardBounds?.left || 0)) / scale,
      y: (cardBounds.top - (boardBounds?.top || 0)) / scale,
    };
  }

  setNodePosition(card, nodeTitle, x, y) {
    const boundedX = Math.round(x);
    const boundedY = Math.round(y);
    card.style.left = `${boundedX}px`;
    card.style.top = `${boundedY}px`;
    this.savedPositions.set(nodeTitle, {
      x: boundedX,
      y: boundedY,
    });
    const position = this.activeGraph?.layout?.positions?.get(nodeTitle);
    if (position) {
      position.x = boundedX;
      position.y = boundedY;
    }
    this.expandLayoutToFitPosition(boundedX, boundedY);
  }

  expandLayoutToFitPosition(x, y) {
    if (!this.activeGraph?.layout || !this.activeGraph?.graph) {
      return;
    }

    const nextWidth = Math.max(this.activeGraph.layout.width, x + this.activeGraph.layout.nodeWidth + 320);
    const nextHeight = Math.max(this.activeGraph.layout.height, y + this.activeGraph.layout.nodeHeight + 260);
    if (nextWidth === this.activeGraph.layout.width && nextHeight === this.activeGraph.layout.height) {
      return;
    }

    this.activeGraph.layout.width = nextWidth;
    this.activeGraph.layout.height = nextHeight;
    this.activeGraph.graph.style.width = `${nextWidth}px`;
    this.activeGraph.graph.style.height = `${nextHeight}px`;
  }

  endNodeDrag(event, dragHandle) {
    if (!this.dragState || this.dragState.pointerId !== event.pointerId) {
      return;
    }

    this.dragState.card.classList.remove("is-dragging");
    if (dragHandle.hasPointerCapture(event.pointerId)) {
      dragHandle.releasePointerCapture(event.pointerId);
    }
    this.dragState = null;
  }

  refreshEdges() {
    if (!this.activeGraph) {
      return;
    }

    const nextEdgeLayer = this.createEdgeLayer(this.activeGraph.layout);
    for (const edge of this.activeGraph.graphEdges) {
      const start = this.getOutputPortCenter(edge);
      const end = this.getInputPortCenter(edge.targetGraphId || edge.targetTitle);
      if (!start || !end) {
        continue;
      }

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("class", edge.isReferenceEdge ? "graph-edge-path graph-edge-reference-path" : "graph-edge-path");
      path.setAttribute("data-source-line", String(edge.sourceLine));
      path.setAttribute("data-source-path", edge.sourcePath || "");
      path.setAttribute("data-source-title", edge.sourceTitle || "");
      path.setAttribute("data-target-title", edge.targetTitle || "");
      path.setAttribute("d", this.createConnectionPath(start, end));
      nextEdgeLayer.append(path);
    }

    this.activeGraph.edgeLayer.replaceWith(nextEdgeLayer);
    this.activeGraph.edgeLayer = nextEdgeLayer;
    if (this.activeEdgeHighlight) {
      this.applyEdgeEndpointHighlight(this.activeEdgeHighlight);
    }
  }

  getOutputPortCenter(edgeOrSourceLine) {
    const edge = typeof edgeOrSourceLine === "object" ? edgeOrSourceLine : null;
    const sourceLine = edge?.sourceLine ?? edgeOrSourceLine;
    const lineMatchedPort = this.activeGraph?.graph?.querySelector(`.graph-port-output[data-source-line="${sourceLine}"]`);
    const lineMatchedCenter = this.getPortCenter(lineMatchedPort);
    if (lineMatchedCenter) {
      return lineMatchedCenter;
    }

    if (!edge?.sourceTitle || !edge?.targetTitle) {
      return null;
    }

    return this.getPortCenter(
      this.activeGraph?.graph?.querySelector(
        `.graph-port-output[data-source-title="${CSS.escape(edge.sourceTitle)}"][data-target-title="${CSS.escape(edge.targetTitle)}"]`
      )
    );
  }

  getInputPortCenter(graphIdOrNodeTitle) {
    return this.getPortCenter(
      this.activeGraph?.graph?.querySelector(`.graph-port-input[data-graph-id="${CSS.escape(graphIdOrNodeTitle)}"]`)
        || this.activeGraph?.graph?.querySelector(`.graph-port-input[data-node-title="${CSS.escape(graphIdOrNodeTitle)}"]`)
    );
  }

  getPortCenter(port) {
    const graphBounds = this.activeGraph?.graph?.getBoundingClientRect();
    const portBounds = port?.getBoundingClientRect?.();
    if (!graphBounds || !portBounds) {
      return null;
    }

    const scale = this.viewportTransform.scale || 1;
    return {
      x: (portBounds.left - graphBounds.left + portBounds.width / 2) / scale,
      y: (portBounds.top - graphBounds.top + portBounds.height / 2) / scale,
    };
  }

  clientToGraphPoint(clientX, clientY) {
    const viewportBounds = this.activeGraph?.viewport?.getBoundingClientRect();
    const scale = this.viewportTransform.scale || 1;
    return {
      x: ((clientX - (viewportBounds?.left || 0)) - this.viewportTransform.x) / scale,
      y: ((clientY - (viewportBounds?.top || 0)) - this.viewportTransform.y) / scale,
    };
  }

  createConnectionPath(start, end) {
    const distance = Math.abs(end.x - start.x);
    const curve = Math.max(88, distance * 0.46);
    return `M ${start.x} ${start.y} C ${start.x + curve} ${start.y}, ${end.x - curve} ${end.y}, ${end.x} ${end.y}`;
  }

  createEmptyState() {
    const panel = document.createElement("div");
    panel.className = "placeholder-panel";
    panel.innerHTML = "<h1>No nodes yet</h1><p>Add a # title to create the first graph node.</p>";
    return panel;
  }

  notifySourceLineSelected(lineNumber, sourcePath = "") {
    for (const handler of this.sourceLineSelectedHandlers) {
      handler({
        lineNumber,
        sourcePath,
      });
    }
  }

  notifyNodeRenameRequested(node) {
    for (const handler of this.nodeRenameRequestedHandlers) {
      handler(node);
    }
  }

  notifyEdgeRetargetRequested(sourceLine, targetTitle, sourcePath = "") {
    for (const handler of this.edgeRetargetRequestedHandlers) {
      handler({
        sourceLine,
        sourcePath,
        targetTitle,
      });
    }
  }
}

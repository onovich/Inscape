import {
  ScriptDocumentFallbackPolicy,
  ScriptDocumentFallbackReason,
} from "../../ProjectWorkspace/Models/ScriptDocumentFallbackPolicy.js";
import { StoryGraphInteractionController } from "./StoryGraphInteractionController.js";
import { StoryGraphViewportController } from "./StoryGraphViewportController.js";
import { StoryGraphPortGeometryModelBuilder } from "../Models/StoryGraphPortGeometryModelBuilder.js";
import { StoryGraphEdgeRenderer } from "../Renderers/StoryGraphEdgeRenderer.js";
import { StoryGraphNodeRenderer } from "../Renderers/StoryGraphNodeRenderer.js";

export class StoryGraphPreviewController {
  constructor(panelElement) {
    this.panelElement = panelElement;
    this.edgeRetargetRequestedHandlers = [];
    this.nodeRenameRequestedHandlers = [];
    this.sourceLineSelectedHandlers = [];
    this.savedPositions = new Map();
    this.activeGraph = null;
    this.activeEdgeHighlight = null;
    this.pendingEdgeRefreshFrame = 0;
    this.edgeRenderer = new StoryGraphEdgeRenderer();
    this.portGeometryBuilder = new StoryGraphPortGeometryModelBuilder();
    this.viewportController = new StoryGraphViewportController({
      getActiveGraph: () => this.activeGraph,
      onViewportChanged: () => this.scheduleEdgeRefresh(),
    });
    this.interactionController = new StoryGraphInteractionController({
      getActiveGraph: () => this.activeGraph,
      getPanelElement: () => this.panelElement,
      getPortGeometry: () => this.portGeometryBuilder,
      getViewportController: () => this.viewportController,
      onEdgeRetargetRequested: (sourceLine, targetTitle, sourcePath) => this.notifyEdgeRetargetRequested(sourceLine, targetTitle, sourcePath),
      onNodePositionChanged: (card, nodeTitle, x, y) => this.setNodePosition(card, nodeTitle, x, y),
      onNodePositionChanging: () => this.scheduleEdgeRefresh(),
    });
    this.nodeRenderer = new StoryGraphNodeRenderer({
      onConnectionDragCancel: (event, port) => this.interactionController.cancelConnectionDrag(event, port),
      onConnectionDragEnd: (event, port) => this.interactionController.endConnectionDrag(event, port),
      onConnectionDragMove: (event) => this.interactionController.moveConnectionDrag(event),
      onConnectionDragStart: (event, edge, index, sourceTitle) => this.interactionController.startConnectionDrag(event, edge, index, sourceTitle),
      onEdgeEndpointHighlightChanged: (edge, isActive) => this.setEdgeEndpointHighlight(edge, isActive),
      onEdgeRetargetRequested: (sourceLine, targetTitle, sourcePath) => this.notifyEdgeRetargetRequested(sourceLine, targetTitle, sourcePath),
      onNodeDragEnd: (event, dragHandle) => this.interactionController.endNodeDrag(event, dragHandle),
      onNodeDragMove: (event) => this.interactionController.moveNodeDrag(event),
      onNodeDragStart: (event, card, nodeTitle) => this.interactionController.startNodeDrag(event, card, nodeTitle),
      onNodeRenameRequested: (node) => this.notifyNodeRenameRequested(node),
      onReferenceHighlightChanged: (node, isActive) => this.setReferenceHighlight(node, isActive),
      onSourceLineSelected: (lineNumber, sourcePath) => this.notifySourceLineSelected(lineNumber, sourcePath),
    });
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
    const documentModel = graphModel || ScriptDocumentFallbackPolicy.buildDocumentModel(fallbackScriptText, {
      reason: ScriptDocumentFallbackReason.StoryGraphCompilerGraphUnavailable,
    });
    if ((documentModel.nodes || []).length === 0) {
      this.panelElement.replaceChildren(this.createEmptyState());
      return;
    }

    const graphEdges = documentModel.edges || this.createGraphEdges(documentModel.nodes);
    const projectedGraph = this.projectGraphForDisplay(documentModel.nodes, graphEdges);
    const layout = this.createGraphLayout(projectedGraph.nodes);
    const viewport = this.viewportController.createGraphViewport();
    const graph = document.createElement("div");
    graph.className = "graph-board";
    graph.style.width = `${layout.width}px`;
    graph.style.height = `${layout.height}px`;
    const edgeLayer = this.edgeRenderer.createEdgeLayer(layout);
    graph.append(edgeLayer);
    viewport.append(this.viewportController.createViewportControls(), graph);
    this.activeGraph = {
      edgeLayer,
      graph,
      graphEdges: projectedGraph.edges,
      layout,
      nodes: projectedGraph.nodes,
      viewport,
    };

    for (const node of projectedGraph.nodes) {
      graph.append(this.nodeRenderer.createNodeCard(node, layout.positions.get(node.graphId)));
    }

    this.viewportController.applyTransform();
    this.panelElement.replaceChildren(viewport);
    this.scheduleEdgeRefresh();
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

  refreshEdges() {
    if (!this.activeGraph) {
      return;
    }

    const nextEdgeLayer = this.edgeRenderer.renderEdgeLayer(
      this.activeGraph.graphEdges,
      this.activeGraph.layout,
      {
        createConnectionPath: (start, end) => this.portGeometryBuilder.createConnectionPath(start, end),
        getInputPortCenter: (graphIdOrNodeTitle) => this.portGeometryBuilder.getInputPortCenter(this.activeGraph, graphIdOrNodeTitle, this.viewportController.getScale()),
        getOutputPortCenter: (edge) => this.portGeometryBuilder.getOutputPortCenter(this.activeGraph, edge, this.viewportController.getScale()),
      }
    );

    this.activeGraph.edgeLayer.replaceWith(nextEdgeLayer);
    this.activeGraph.edgeLayer = nextEdgeLayer;
    if (this.activeEdgeHighlight) {
      this.applyEdgeEndpointHighlight(this.activeEdgeHighlight);
    }
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

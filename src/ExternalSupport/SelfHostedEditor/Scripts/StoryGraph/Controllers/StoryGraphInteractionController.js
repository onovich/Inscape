export class StoryGraphInteractionController {
  constructor({
    getActiveGraph,
    getPanelElement,
    getPortGeometry,
    getViewportController,
    onEdgeRetargetRequested,
    onNodePositionChanged,
    onNodePositionChanging,
  } = {}) {
    this.getActiveGraph = getActiveGraph || (() => null);
    this.getPanelElement = getPanelElement || (() => null);
    this.getPortGeometry = getPortGeometry || (() => null);
    this.getViewportController = getViewportController || (() => null);
    this.onEdgeRetargetRequested = onEdgeRetargetRequested || (() => {});
    this.onNodePositionChanged = onNodePositionChanged || (() => {});
    this.onNodePositionChanging = onNodePositionChanging || (() => {});
    this.connectionDragState = null;
    this.dragState = null;
  }

  startNodeDrag(event, card, nodeTitle) {
    event.preventDefault();
    event.stopPropagation();
    const viewportController = this.getViewportController();
    const currentPosition = viewportController.getNodePosition(card);
    const pointerPosition = viewportController.clientToGraphPoint(event.clientX, event.clientY);
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

    const viewportController = this.getViewportController();
    const pointerPosition = viewportController.clientToGraphPoint(event.clientX, event.clientY);
    const nextX = Math.max(18, pointerPosition.x - this.dragState.offsetX);
    const nextY = Math.max(18, pointerPosition.y - this.dragState.offsetY);
    this.onNodePositionChanged(this.dragState.card, this.dragState.nodeTitle, nextX, nextY);
    this.onNodePositionChanging();
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

  startConnectionDrag(event, edge, order, sourceTitle) {
    const activeGraph = this.getActiveGraph();
    if (!activeGraph) {
      return;
    }

    const start = this.getPortGeometry()?.getOutputPortCenter(activeGraph, edge, this.getViewportController().getScale());
    if (!start) {
      return;
    }

    const previewPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    previewPath.setAttribute("class", "graph-edge-path graph-edge-preview-path");
    activeGraph.edgeLayer.append(previewPath);
    activeGraph.graph.classList.add("is-connecting");
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
    this.onEdgeRetargetRequested(sourceLine, targetTitle, sourcePath);
  }

  cancelConnectionDrag(event, port) {
    this.clearConnectionDrag(port, event.pointerId);
  }

  updateConnectionPreview(clientX, clientY) {
    if (!this.connectionDragState) {
      return;
    }

    const end = this.getViewportController().clientToGraphPoint(clientX, clientY);
    const start = this.connectionDragState.start;
    this.connectionDragState.previewPath.setAttribute(
      "d",
      this.getPortGeometry().createConnectionPath(start, end)
    );
  }

  setConnectionTargetHighlight(clientX, clientY) {
    const target = this.findConnectionTargetElement(clientX, clientY);
    for (const card of this.getPanelElement()?.querySelectorAll(".graph-node") || []) {
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
    for (const candidatePort of this.getPanelElement()?.querySelectorAll(".graph-port-input") || []) {
      const bounds = candidatePort.getBoundingClientRect();
      if (
        clientX >= bounds.left - hitPadding
        && clientX <= bounds.right + hitPadding
        && clientY >= bounds.top - hitPadding
        && clientY <= bounds.bottom + hitPadding
      ) {
        return candidatePort.closest(".graph-node");
      }
    }

    return null;
  }

  clearConnectionDrag(port, pointerId) {
    if (this.connectionDragState?.previewPath) {
      this.connectionDragState.previewPath.remove();
    }

    this.getActiveGraph()?.graph?.classList.remove("is-connecting");
    for (const card of this.getPanelElement()?.querySelectorAll(".graph-node") || []) {
      card.classList.remove("is-connection-target");
    }

    if (port.hasPointerCapture(pointerId)) {
      port.releasePointerCapture(pointerId);
    }
    this.connectionDragState = null;
  }
}

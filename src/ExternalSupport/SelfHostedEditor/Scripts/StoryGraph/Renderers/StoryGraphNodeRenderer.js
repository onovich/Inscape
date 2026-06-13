export class StoryGraphNodeRenderer {
  constructor(handlers = {}) {
    this.handlers = handlers;
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

      this.selectSourceLine(node.referenceSourceLine || node.sourceLine, node.referenceSourcePath || node.sourcePath || "");
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

    const dragHandle = this.createDragHandle(card, node.graphId || node.title);

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

      this.handlers.onNodeRenameRequested?.(node);
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
      edgeList.append(this.createOutgoingEdgeRow(edge, index, node.title));
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

  createDragHandle(card, nodeGraphId) {
    const dragHandle = document.createElement("span");
    dragHandle.className = "graph-node-drag-handle";
    dragHandle.title = "Drag card";
    dragHandle.setAttribute("aria-label", "Drag node");
    dragHandle.setAttribute("role", "button");
    dragHandle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }

      this.startNodeDrag(event, card, nodeGraphId);
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

    return dragHandle;
  }

  createOutgoingEdgeRow(edge, index, sourceTitle) {
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
      this.selectSourceLine(edge.sourceLine, edge.sourcePath || "");
    });

    const port = document.createElement("span");
    port.className = "graph-port graph-port-output";
    port.dataset.sourceLine = String(edge.sourceLine);
    port.dataset.sourcePath = edge.sourcePath || "";
    port.dataset.sourceTitle = sourceTitle;
    port.dataset.targetTitle = edge.target || "";
    port.title = edge.target ? `Drag to reconnect ${edge.target}` : "Drag to connect";
    port.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      this.startConnectionDrag(event, edge, index, sourceTitle);
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
      this.handlers.onEdgeRetargetRequested?.(edge.sourceLine, "", edge.sourcePath || "");
    });

    row.append(order, label, target, disconnect, port);
    return row;
  }

  startNodeDrag(event, card, nodeGraphId) {
    this.handlers.onNodeDragStart?.(event, card, nodeGraphId);
  }

  moveNodeDrag(event) {
    this.handlers.onNodeDragMove?.(event);
  }

  endNodeDrag(event, dragHandle) {
    this.handlers.onNodeDragEnd?.(event, dragHandle);
  }

  startConnectionDrag(event, edge, index, sourceTitle) {
    this.handlers.onConnectionDragStart?.(event, edge, index, sourceTitle);
  }

  moveConnectionDrag(event) {
    this.handlers.onConnectionDragMove?.(event);
  }

  endConnectionDrag(event, port) {
    this.handlers.onConnectionDragEnd?.(event, port);
  }

  cancelConnectionDrag(event, port) {
    this.handlers.onConnectionDragCancel?.(event, port);
  }

  setReferenceHighlight(node, isActive) {
    this.handlers.onReferenceHighlightChanged?.(node, isActive);
  }

  setEdgeEndpointHighlight(edge, isActive) {
    this.handlers.onEdgeEndpointHighlightChanged?.(edge, isActive);
  }

  selectSourceLine(lineNumber, sourcePath = "") {
    this.handlers.onSourceLineSelected?.(lineNumber, sourcePath);
  }
}

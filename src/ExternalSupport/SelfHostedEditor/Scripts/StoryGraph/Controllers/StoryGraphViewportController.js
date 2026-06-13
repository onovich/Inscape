export class StoryGraphViewportController {
  constructor({ getActiveGraph, onViewportChanged } = {}) {
    this.getActiveGraph = getActiveGraph || (() => null);
    this.onViewportChanged = onViewportChanged || (() => {});
    this.panState = null;
    this.transform = {
      scale: 1,
      x: 24,
      y: 24,
    };
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

  applyTransform(activeGraph = this.getActiveGraph()) {
    if (!activeGraph?.graph) {
      return;
    }

    const { scale, x, y } = this.transform;
    activeGraph.graph.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    activeGraph.viewport?.style.setProperty("--graph-pan-x", `${x}px`);
    activeGraph.viewport?.style.setProperty("--graph-pan-y", `${y}px`);
    activeGraph.viewport?.style.setProperty("--graph-grid-size", `${22 * scale}px`);
    this.onViewportChanged();
  }

  handleViewportWheel(event) {
    const activeGraph = this.getActiveGraph();
    if (!activeGraph?.viewport) {
      return;
    }

    event.preventDefault();
    const viewportBounds = activeGraph.viewport.getBoundingClientRect();
    const pointerX = event.clientX - viewportBounds.left;
    const pointerY = event.clientY - viewportBounds.top;
    const previousScale = this.transform.scale;
    const nextScale = this.clampScale(previousScale * (event.deltaY > 0 ? 0.92 : 1.08));
    if (nextScale === previousScale) {
      return;
    }

    const graphX = (pointerX - this.transform.x) / previousScale;
    const graphY = (pointerY - this.transform.y) / previousScale;
    this.transform.scale = nextScale;
    this.transform.x = pointerX - graphX * nextScale;
    this.transform.y = pointerY - graphY * nextScale;
    this.applyTransform(activeGraph);
  }

  zoomViewportBy(factor) {
    const activeGraph = this.getActiveGraph();
    const viewportBounds = activeGraph?.viewport?.getBoundingClientRect();
    const centerX = (viewportBounds?.width || 0) / 2;
    const centerY = (viewportBounds?.height || 0) / 2;
    const previousScale = this.transform.scale;
    const nextScale = this.clampScale(previousScale * factor);
    const graphX = (centerX - this.transform.x) / previousScale;
    const graphY = (centerY - this.transform.y) / previousScale;
    this.transform.scale = nextScale;
    this.transform.x = centerX - graphX * nextScale;
    this.transform.y = centerY - graphY * nextScale;
    this.applyTransform(activeGraph);
  }

  resetViewport() {
    this.transform = {
      scale: 1,
      x: 24,
      y: 24,
    };
    this.applyTransform();
  }

  startViewportPan(event, viewport) {
    viewport.classList.add("is-panning");
    this.panState = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: this.transform.x,
      startY: this.transform.y,
    };
  }

  moveViewportPan(event) {
    if (!this.panState || this.panState.pointerId !== event.pointerId) {
      return;
    }

    this.transform.x = this.panState.startX + event.clientX - this.panState.startClientX;
    this.transform.y = this.panState.startY + event.clientY - this.panState.startClientY;
    this.applyTransform();
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

  getNodePosition(card, activeGraph = this.getActiveGraph()) {
    const boardBounds = activeGraph?.graph?.getBoundingClientRect();
    const cardBounds = card.getBoundingClientRect();
    const scale = this.getScale();
    return {
      x: (cardBounds.left - (boardBounds?.left || 0)) / scale,
      y: (cardBounds.top - (boardBounds?.top || 0)) / scale,
    };
  }

  clientToGraphPoint(clientX, clientY, activeGraph = this.getActiveGraph()) {
    const viewportBounds = activeGraph?.viewport?.getBoundingClientRect();
    const scale = this.getScale();
    return {
      x: ((clientX - (viewportBounds?.left || 0)) - this.transform.x) / scale,
      y: ((clientY - (viewportBounds?.top || 0)) - this.transform.y) / scale,
    };
  }

  getScale() {
    return this.transform.scale || 1;
  }

  clampScale(scale) {
    return Math.max(0.42, Math.min(1.8, scale));
  }
}

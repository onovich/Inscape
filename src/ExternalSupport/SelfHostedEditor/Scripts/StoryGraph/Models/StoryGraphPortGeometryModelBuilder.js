export class StoryGraphPortGeometryModelBuilder {
  getOutputPortCenter(activeGraph, edgeOrSourceLine, scale = 1) {
    const edge = typeof edgeOrSourceLine === "object" ? edgeOrSourceLine : null;
    const sourceLine = edge?.sourceLine ?? edgeOrSourceLine;
    const lineMatchedPort = activeGraph?.graph?.querySelector(`.graph-port-output[data-source-line="${sourceLine}"]`);
    const lineMatchedCenter = this.getPortCenter(activeGraph, lineMatchedPort, scale);
    if (lineMatchedCenter) {
      return lineMatchedCenter;
    }

    if (!edge?.sourceTitle || !edge?.targetTitle) {
      return null;
    }

    return this.getPortCenter(
      activeGraph,
      activeGraph?.graph?.querySelector(
        `.graph-port-output[data-source-title="${CSS.escape(edge.sourceTitle)}"][data-target-title="${CSS.escape(edge.targetTitle)}"]`
      ),
      scale
    );
  }

  getInputPortCenter(activeGraph, graphIdOrNodeTitle, scale = 1) {
    return this.getPortCenter(
      activeGraph,
      activeGraph?.graph?.querySelector(`.graph-port-input[data-graph-id="${CSS.escape(graphIdOrNodeTitle)}"]`)
        || activeGraph?.graph?.querySelector(`.graph-port-input[data-node-title="${CSS.escape(graphIdOrNodeTitle)}"]`),
      scale
    );
  }

  getPortCenter(activeGraph, port, scale = 1) {
    const graphBounds = activeGraph?.graph?.getBoundingClientRect();
    const portBounds = port?.getBoundingClientRect?.();
    if (!graphBounds || !portBounds) {
      return null;
    }

    return {
      x: (portBounds.left - graphBounds.left + portBounds.width / 2) / scale,
      y: (portBounds.top - graphBounds.top + portBounds.height / 2) / scale,
    };
  }

  createConnectionPath(start, end) {
    const distance = Math.abs(end.x - start.x);
    const curve = Math.max(88, distance * 0.46);
    return `M ${start.x} ${start.y} C ${start.x + curve} ${start.y}, ${end.x - curve} ${end.y}, ${end.x} ${end.y}`;
  }
}

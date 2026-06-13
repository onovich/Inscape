const storyGraphSvgNamespace = "http://www.w3.org/2000/svg";

export class StoryGraphEdgeRenderer {
  createEdgeLayer(layout) {
    const svg = document.createElementNS(storyGraphSvgNamespace, "svg");
    svg.classList.add("graph-edge-layer");
    svg.setAttribute("width", String(layout.width));
    svg.setAttribute("height", String(layout.height));
    svg.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);

    return svg;
  }

  renderEdgeLayer(edges, layout, geometry) {
    const edgeLayer = this.createEdgeLayer(layout);
    for (const edge of edges) {
      const start = geometry.getOutputPortCenter(edge);
      const end = geometry.getInputPortCenter(edge.targetGraphId || edge.targetTitle);
      if (!start || !end) {
        continue;
      }

      edgeLayer.append(this.createEdgePath(edge, start, end, geometry));
    }

    return edgeLayer;
  }

  createEdgePath(edge, start, end, geometry) {
    const path = document.createElementNS(storyGraphSvgNamespace, "path");
    path.setAttribute("class", edge.isReferenceEdge ? "graph-edge-path graph-edge-reference-path" : "graph-edge-path");
    path.setAttribute("data-source-line", String(edge.sourceLine));
    path.setAttribute("data-source-path", edge.sourcePath || "");
    path.setAttribute("data-source-title", edge.sourceTitle || "");
    path.setAttribute("data-target-title", edge.targetTitle || "");
    path.setAttribute("d", geometry.createConnectionPath(start, end));
    return path;
  }
}

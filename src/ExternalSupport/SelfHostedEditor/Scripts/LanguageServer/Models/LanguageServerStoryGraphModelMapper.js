export class LanguageServerStoryGraphModelMapper {
  static mapProjectGraph(payload, currentFilePath) {
    const documents = Array.isArray(payload?.documents) ? payload.documents : [];
    const activeDocument = this.findActiveDocument(documents, currentFilePath) || documents[0] || null;
    const nodes = [];
    const edges = [];

    for (const document of documents) {
      const sourcePath = document.sourcePath || "";
      const documentNodes = Array.isArray(document.nodes) ? document.nodes : [];
      const documentEdges = Array.isArray(document.edges) ? document.edges : [];
      for (const node of documentNodes) {
        nodes.push(this.mapNode(node, sourcePath, document === activeDocument));
      }

      for (const edge of documentEdges) {
        const mappedEdge = this.mapEdge(edge, sourcePath, document === activeDocument);
        if (mappedEdge) {
          edges.push(mappedEdge);
        }
      }
    }

    const nodesByTitle = new Map(nodes.map((node) => [node.title, node]));
    for (const edge of edges) {
      const sourceNode = nodesByTitle.get(edge.sourceTitle);
      if (!sourceNode) {
        continue;
      }

      const outgoing = {
        kind: edge.kind,
        nodeTitle: edge.sourceTitle,
        sourceLine: edge.sourceLine,
        sourcePath: edge.sourcePath,
        target: edge.targetTitle,
        text: edge.text,
      };
      if (edge.kind === "jump") {
        sourceNode.jumps.push(outgoing);
      } else {
        sourceNode.choices.push(outgoing);
      }
    }

    const incomingReferenceCounts = new Map(nodes.map((node) => [node.title, 0]));
    for (const edge of edges) {
      if (!edge.targetTitle || !incomingReferenceCounts.has(edge.targetTitle)) {
        continue;
      }

      incomingReferenceCounts.set(edge.targetTitle, (incomingReferenceCounts.get(edge.targetTitle) || 0) + 1);
    }

    return {
      diagnostics: Array.isArray(payload?.diagnostics) ? payload.diagnostics : [],
      entryNodeName: payload?.entryNodeName || "",
      edges,
      nodes: nodes.map((node) => ({
        ...node,
        incomingReferenceCount: incomingReferenceCounts.get(node.title) || 0,
      })),
      provider: "compiler-project",
    };
  }

  static mapNode(node, sourcePath, isInActiveDocument) {
    return {
      choices: [],
      endLine: this.findNodeEndLine(node),
      isInActiveDocument,
      jumps: [],
      lineCount: Number(node?.lineCount || 0),
      lines: Array.isArray(node?.lines) ? node.lines : [],
      sourceLine: this.toSourceLine(node?.source?.line),
      sourcePath: node?.source?.sourcePath || sourcePath,
      title: node?.name || "Untitled Node",
    };
  }

  static mapEdge(edge, sourcePath, isInActiveDocument) {
    const sourceLine = this.toSourceLine(edge?.source?.line);
    const sourceTitle = edge?.from || "";
    const targetTitle = edge?.to || "";
    if (!sourceTitle || !targetTitle || sourceLine <= 0) {
      return null;
    }

    return {
      isInActiveDocument,
      kind: String(edge?.kind || "").toLowerCase() === "default" ? "jump" : "choice",
      sourceLine,
      sourcePath: edge?.source?.sourcePath || sourcePath,
      sourceTitle,
      targetTitle,
      text: edge?.label || (String(edge?.kind || "").toLowerCase() === "default" ? "continue" : ""),
    };
  }

  static findActiveDocument(documents, currentFilePath) {
    return documents.find((document) => this.pathsReferToSameDocument(document?.sourcePath || "", currentFilePath));
  }

  static findNodeEndLine(node) {
    const lineNumbers = [];
    for (const line of Array.isArray(node?.lines) ? node.lines : []) {
      lineNumbers.push(this.toSourceLine(line?.source?.line));
    }

    for (const group of Array.isArray(node?.choices) ? node.choices : []) {
      lineNumbers.push(this.toSourceLine(group?.source?.line));
      for (const option of Array.isArray(group?.options) ? group.options : []) {
        lineNumbers.push(this.toSourceLine(option?.source?.line));
      }
    }

    return Math.max(this.toSourceLine(node?.source?.line), ...lineNumbers.filter((lineNumber) => lineNumber > 0));
  }

  static toSourceLine(line) {
    const numericLine = Number(line);
    if (!Number.isFinite(numericLine)) {
      return 0;
    }

    return numericLine;
  }

  static pathsReferToSameDocument(left, right) {
    if (!left || !right) {
      return false;
    }

    const normalizedLeft = left.replace(/\\/g, "/");
    const normalizedRight = right.replace(/\\/g, "/");
    return normalizedLeft === normalizedRight
      || normalizedLeft.endsWith(`/${normalizedRight}`)
      || normalizedRight.endsWith(`/${normalizedLeft}`);
  }
}

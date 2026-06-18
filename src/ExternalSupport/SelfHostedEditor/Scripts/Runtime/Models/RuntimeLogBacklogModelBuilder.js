export const RuntimeLogBacklogFormat = "inscape.self-hosted-editor.runtime-log-backlog";
export const RuntimeLogBacklogFormatVersion = 1;

export class RuntimeLogBacklogModelBuilder {
  static build({
    runtimeSnapshot = null,
    sessionId = "",
    storyGraphModel = null,
    workspaceRevision = null,
  } = {}) {
    const envelope = isObject(runtimeSnapshot) ? runtimeSnapshot : {};
    const snapshot = unwrapRuntimeSnapshot(envelope);
    const provider = normalizeLabel(
      envelope.provider
        || snapshot?.provider
        || (snapshot ? "runtime-project" : ""),
      "unavailable"
    );
    const runtimeError = buildRuntimeError(envelope.error || snapshot?.lastError);
    const logEntries = provider === "runtime-project"
      ? getArray(snapshot?.logEntries)
      : [];
    const sourceIndex = buildSourceIndex(snapshot, storyGraphModel);
    const entries = logEntries
      .map((entry) => buildLogEntry(entry, sourceIndex))
      .filter(Boolean);

    return {
      contentPolicy: {
        excludes: [
          "workspace-text",
          "formal-runtime-state-body",
          "condition-hidden-text",
          "action-history",
          "host-payload",
        ],
        payloadContentExposed: false,
      },
      entries,
      entryCount: entries.length,
      format: RuntimeLogBacklogFormat,
      formatVersion: RuntimeLogBacklogFormatVersion,
      payloadContentExposed: false,
      provider,
      runtimeError,
      sessionId: formatSessionId(sessionId || envelope.sessionId || snapshot?.sessionId),
      source: "runtime-log-entries",
      state: buildBacklogState({
        entryCount: entries.length,
        provider,
        runtimeError,
        snapshot,
      }),
      workspaceRevision: normalizeOptionalNonNegativeInteger(workspaceRevision),
      writesToFormalRuntimeState: false,
    };
  }
}

function buildBacklogState({
  entryCount,
  provider,
  runtimeError,
  snapshot,
}) {
  if (runtimeError.hasError) {
    return "runtime-error";
  }

  if (provider !== "runtime-project" || !snapshot) {
    return "runtime-unavailable";
  }

  return entryCount > 0 ? "runtime-ready" : "runtime-empty";
}

function buildLogEntry(entry, sourceIndex) {
  if (!isObject(entry)) {
    return null;
  }

  const nodeId = normalizeLabel(entry.nodeId, "");
  const lineId = normalizeLabel(entry.lineId, "");
  const source = resolveLogSource({
    lineId,
    nodeId,
    sourceIndex,
  });

  return {
    hasSource: source.lineNumber > 0,
    lineId,
    nodeId,
    sequence: normalizeNonNegativeInteger(entry.sequence, 0),
    source,
    speaker: boundText(entry.speaker, 80),
    text: boundText(entry.text, 240),
  };
}

function buildSourceIndex(snapshot, storyGraphModel) {
  const lineSources = new Map();
  const nodeSources = new Map();

  for (const node of collectRuntimeSourceNodes(snapshot, storyGraphModel)) {
    const nodeName = normalizeLabel(node?.name, "");
    const nodeSource = normalizeSource(node?.source);
    if (nodeName && nodeSource.lineNumber > 0 && !nodeSources.has(nodeName)) {
      nodeSources.set(nodeName, nodeSource);
    }

    for (const line of getArray(node?.lines)) {
      const lineSource = normalizeSource(line?.source);
      if (nodeName && lineSource.lineNumber > 0) {
        const sourceLineId = normalizeLabel(line?.anchor, "") || `line:${lineSource.lineNumber}`;
        lineSources.set(`${nodeName}|${sourceLineId}`, lineSource);
      }
    }
  }

  return {
    lineSources,
    nodeSources,
  };
}

function collectRuntimeSourceNodes(snapshot, storyGraphModel) {
  const nodes = [];
  if (isObject(snapshot?.currentNode)) {
    nodes.push(snapshot.currentNode);
  }

  for (const document of getArray(storyGraphModel?.documents)) {
    for (const node of getArray(document?.nodes)) {
      nodes.push(node);
    }
  }
  for (const node of getArray(storyGraphModel?.nodes)) {
    nodes.push({
      choices: node.choices,
      lines: node.lines,
      name: node.name || node.title,
      source: node.source || {
        column: 1,
        line: node.sourceLine,
        sourcePath: "",
      },
    });
  }

  return nodes;
}

function resolveLogSource({
  lineId,
  nodeId,
  sourceIndex,
}) {
  const lineSource = lineId && nodeId
    ? sourceIndex.lineSources.get(`${nodeId}|${lineId}`)
    : null;
  if (lineSource) {
    return lineSource;
  }

  const parsedLine = parseLineId(lineId);
  if (parsedLine > 0) {
    return {
      column: 1,
      lineNumber: parsedLine,
      sourcePath: "",
    };
  }

  return sourceIndex.nodeSources.get(nodeId) || {
    column: 1,
    lineNumber: 0,
    sourcePath: "",
  };
}

function parseLineId(lineId) {
  const match = /^line:(\d+)$/i.exec(lineId || "");
  return match ? normalizeNonNegativeInteger(match[1], 0) : 0;
}

function buildRuntimeError(error) {
  if (!error) {
    return {
      code: "",
      hasError: false,
      messageAvailable: false,
    };
  }

  if (typeof error === "string") {
    return {
      code: "runtime-error",
      hasError: true,
      messageAvailable: true,
    };
  }

  return {
    code: normalizeLabel(error.code || error.name, "runtime-error"),
    hasError: true,
    messageAvailable: Boolean(error.message || error.error),
  };
}

function normalizeSource(source) {
  return {
    column: normalizeNonNegativeInteger(source?.column, 1),
    lineNumber: normalizeNonNegativeInteger(source?.line, 0),
    sourcePath: normalizeLabel(source?.sourcePath, ""),
  };
}

function unwrapRuntimeSnapshot(envelope) {
  if (isObject(envelope?.snapshot)) {
    return envelope.snapshot;
  }

  return isObject(envelope) && !Object.prototype.hasOwnProperty.call(envelope, "provider")
    ? envelope
    : null;
}

function boundText(value, maximumLength) {
  const text = String(value ?? "").trim();
  return text.length > maximumLength ? `${text.slice(0, Math.max(0, maximumLength - 3))}...` : text;
}

function formatSessionId(sessionId) {
  const label = normalizeLabel(sessionId, "default");
  return label.length > 48 ? `${label.slice(0, 45)}...` : label;
}

function normalizeLabel(value, fallback) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeNonNegativeInteger(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return fallback;
  }

  return Math.floor(numericValue);
}

function normalizeOptionalNonNegativeInteger(value) {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  return normalizeNonNegativeInteger(value, null);
}

function getArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

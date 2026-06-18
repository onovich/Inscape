export const RuntimeBranchEvidenceFormat = "inscape.self-hosted-editor.runtime-branch-evidence";
export const RuntimeBranchEvidenceFormatVersion = 1;

const branchEvidenceKey = "branch" + "Query" + "Receipts";

export class RuntimeBranchEvidenceModelBuilder {
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
    const rawEvidence = provider === "runtime-project"
      ? getArray(snapshot?.[branchEvidenceKey])
      : [];
    const sourceIndex = buildSourceIndex(snapshot, storyGraphModel);
    const entries = rawEvidence
      .map((item, index) => buildEvidenceEntry(item, index, sourceIndex))
      .filter(Boolean);

    return {
      contentPolicy: {
        excludes: [
          "workspace-text",
          "host-query-reexecution",
          "trace-replay",
          "formal-runtime-state-body",
          "host-payload",
        ],
        payloadContentExposed: false,
      },
      entries,
      entryCount: entries.length,
      format: RuntimeBranchEvidenceFormat,
      formatVersion: RuntimeBranchEvidenceFormatVersion,
      implementsReplayTimeline: false,
      payloadContentExposed: false,
      provider,
      requeriesHost: false,
      runtimeError,
      sessionId: formatSessionId(sessionId || envelope.sessionId || snapshot?.sessionId),
      source: "runtime-branch-evidence",
      state: buildEvidenceState({
        entryCount: entries.length,
        provider,
        runtimeError,
        snapshot,
      }),
      workspaceRevision: normalizeOptionalNonNegativeInteger(workspaceRevision),
    };
  }
}

function buildEvidenceState({
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

function buildEvidenceEntry(item, index, sourceIndex) {
  if (!isObject(item)) {
    return null;
  }

  const context = normalizeLabel(item.context, "");
  const nodeId = normalizeLabel(item.nodeId, "");
  const source = resolveEvidenceSource(item, nodeId, sourceIndex);
  const result = buildValueLabel(item.result);
  const argumentLabels = getArray(item.arguments).map((argument) => buildValueLabel(argument));
  const contextLabel = formatContextLabel(context, item);

  return {
    argumentCount: argumentLabels.length,
    argumentLabels,
    branchPath: boundText(item.branchPath, 120),
    choiceGroupIndex: normalizeInteger(item.choiceGroupIndex, -1),
    choiceOptionIndex: normalizeInteger(item.choiceOptionIndex, -1),
    conditionalJumpIndex: normalizeInteger(item.conditionalJumpIndex, -1),
    context,
    contextLabel,
    deterministic: item.deterministic === true,
    explanation: buildExplanation(contextLabel, result.value),
    hasSource: source.lineNumber > 0,
    id: normalizeLabel(item.id, "") || `branch-evidence-${index + 1}`,
    nodeId,
    queryName: boundText(item.name, 120),
    resultLabel: result,
    source,
    sourceKind: normalizeLabel(item.sourceKind, "unknown"),
    syntax: normalizeLabel(item.syntax, "unknown"),
  };
}

function buildValueLabel(value) {
  if (!isObject(value)) {
    return {
      kind: "unknown",
      value: "",
    };
  }

  const kind = normalizeLabel(value.kind, "unknown").toLowerCase();
  if (kind === "bool") {
    return {
      kind,
      value: value.value === "true" || value.boolValue === true ? "true" : "false",
    };
  }

  if (kind === "number") {
    const numericValue = Number(value.value ?? value.numberValue ?? 0);
    return {
      kind,
      value: Number.isFinite(numericValue) ? String(numericValue) : "0",
    };
  }

  if (kind === "string") {
    return {
      kind,
      value: boundText(value.value ?? value.stringValue ?? "", 80),
    };
  }

  return {
    kind,
    value: boundText(value.value ?? "", 80),
  };
}

function buildExplanation(contextLabel, resultValue) {
  if (contextLabel === "choice condition") {
    return `Choice condition evaluated to ${resultValue || "unknown"}.`;
  }

  if (contextLabel === "conditional jump") {
    return `Conditional jump evaluated to ${resultValue || "unknown"}.`;
  }

  return `Runtime recorded branch result ${resultValue || "unknown"}.`;
}

function formatContextLabel(context, item) {
  if (context === "choice-condition" || normalizeInteger(item.choiceOptionIndex, -1) >= 0) {
    return "choice condition";
  }

  if (context === "conditional-jump" || normalizeInteger(item.conditionalJumpIndex, -1) >= 0) {
    return "conditional jump";
  }

  return context || "branch condition";
}

function buildSourceIndex(snapshot, storyGraphModel) {
  const nodeSources = new Map();
  let firstDocumentPath = "";

  for (const node of collectRuntimeSourceNodes(snapshot, storyGraphModel)) {
    const nodeName = normalizeLabel(node?.name || node?.title, "");
    const nodeSource = normalizeSource(node?.source || {
      column: 1,
      line: node?.sourceLine,
      sourcePath: node?.sourcePath,
    });
    if (!firstDocumentPath && nodeSource.sourcePath) {
      firstDocumentPath = nodeSource.sourcePath;
    }

    if (nodeName && nodeSource.lineNumber > 0 && !nodeSources.has(nodeName)) {
      nodeSources.set(nodeName, nodeSource);
    }
  }

  return {
    firstDocumentPath,
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

function resolveEvidenceSource(item, nodeId, sourceIndex) {
  const lineNumber = normalizeNonNegativeInteger(item?.sourceLine, 0);
  const nodeSource = sourceIndex.nodeSources.get(nodeId) || null;
  if (lineNumber > 0) {
    return {
      column: normalizeNonNegativeInteger(item?.sourceColumn, 1),
      lineNumber,
      sourcePath: nodeSource?.sourcePath || sourceIndex.firstDocumentPath || "",
    };
  }

  return nodeSource || {
    column: 1,
    lineNumber: 0,
    sourcePath: sourceIndex.firstDocumentPath || "",
  };
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

function normalizeInteger(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.floor(numericValue);
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

import path from "node:path";
import {
  normalizeRuntimeSessionId,
} from "./SelfHostedEditorSessionBridge.js";

export function compactProjectGraphPayload(payload) {
  return {
    diagnostics: payload?.diagnostics || [],
    documents: (Array.isArray(payload?.documents) ? payload.documents : []).map((document) => ({
      edges: Array.isArray(document.edges)
        ? document.edges.map((edge) => ({
          from: edge.from || "",
          kind: edge.kind || "",
          label: edge.label || "",
          source: edge.source || null,
          to: edge.to || "",
        }))
        : [],
      nodes: (Array.isArray(document.nodes) ? document.nodes : []).map((node) => ({
        choices: (Array.isArray(node.choices) ? node.choices : []).map((group) => ({
          options: (Array.isArray(group.options) ? group.options : []).map((option) => ({
            source: option.source || null,
            target: option.target || "",
            text: option.text || "",
          })),
          prompt: group.prompt || "",
          source: group.source || null,
        })),
        defaultNext: node.defaultNext || "",
        lineCount: Array.isArray(node.lines) ? node.lines.length : 0,
        lines: (Array.isArray(node.lines) ? node.lines : []).map((line) => ({
          anchor: line.anchor || "",
          kind: line.kind || "",
          raw: line.raw || "",
          source: line.source || null,
          speaker: line.speaker || "",
          text: line.text || "",
        })),
        name: node.name || "",
        source: node.source || null,
      })),
      sourcePath: document.sourcePath || "",
    })),
    entryNodeName: payload?.entryNodeName || "",
    format: "inscape.self-hosted-editor.story-graph",
    formatVersion: 1,
    hasErrors: Boolean(payload?.hasErrors),
  };
}

export function compactRuntimeStatePayload(payload, sessionId = "", queryProvider = null) {
  const currentNode = payload?.currentNode || null;
  return {
    currentNode: currentNode
      ? {
        choices: (Array.isArray(currentNode.choices) ? currentNode.choices : []).map((group) => ({
          options: (Array.isArray(group.options) ? group.options : []).map((option) => ({
            source: option.source || null,
            target: option.target || "",
            text: option.text || "",
          })),
          prompt: group.prompt || "",
          source: group.source || null,
        })),
        defaultNext: currentNode.defaultNext || "",
        lines: (Array.isArray(currentNode.lines) ? currentNode.lines : []).map((line) => ({
          anchor: line.anchor || "",
          kind: line.kind || "",
          raw: line.raw || "",
          source: line.source || null,
          speaker: line.speaker || "",
          text: line.text || "",
        })),
        name: currentNode.name || "",
        source: currentNode.source || null,
      }
      : null,
    format: "inscape.self-hosted-editor.runtime-state",
    formatVersion: 1,
    actionRequests: compactRuntimeActionRequests(payload?.actionRequests),
    logEntries: compactRuntimeLogEntries(payload?.logEntries),
    pendingAction: compactRuntimePendingAction(payload?.pendingAction),
    queryProvider: compactRuntimeQueryProvider(queryProvider || payload?.queryProvider || null),
    readingProgress: {
      canAdvance: Boolean(payload?.readingProgress?.canAdvance),
      canRewind: Boolean(payload?.readingProgress?.canRewind),
      contentStepCount: Number(payload?.readingProgress?.contentStepCount || 0),
      isChoiceStageVisible: Boolean(payload?.readingProgress?.isChoiceStageVisible),
      isContinueStageVisible: Boolean(payload?.readingProgress?.isContinueStageVisible),
      maxVisibleStepCount: Number(payload?.readingProgress?.maxVisibleStepCount || 0),
      visibleStepCount: Number(payload?.readingProgress?.visibleStepCount || 0),
    },
    sessionId: normalizeRuntimeSessionId(sessionId),
    state: {
      currentNodeName: payload?.state?.currentNodeName || "",
      path: Array.isArray(payload?.state?.path) ? payload.state.path : [],
      visibleStepCount: Number(payload?.state?.visibleStepCount || 0),
    },
  };
}

export function compactRuntimeQueryProvider(queryProvider) {
  if (!queryProvider || typeof queryProvider !== "object") {
    return {
      delegateAvailable: false,
      label: "internal",
      mockValueCount: 0,
      payloadContentExposed: false,
      recordedValueCount: 0,
      source: "internal",
    };
  }

  const source = normalizeRuntimeQueryProviderSource(queryProvider.source || queryProvider.kind);
  if (source === "mock") {
    return {
      delegateAvailable: false,
      label: "mock",
      mockValueCount: Array.isArray(queryProvider.mockValues) ? queryProvider.mockValues.length : 0,
      payloadContentExposed: false,
      recordedValueCount: 0,
      source,
    };
  }

  if (source === "recorded") {
    return {
      delegateAvailable: false,
      label: "recorded",
      mockValueCount: 0,
      payloadContentExposed: false,
      recordedValueCount: Array.isArray(queryProvider.recordedValues) ? queryProvider.recordedValues.length : 0,
      source,
    };
  }

  if (source === "delegate-unavailable" || source === "delegate") {
    return {
      delegateAvailable: false,
      label: "delegate unavailable",
      mockValueCount: 0,
      payloadContentExposed: false,
      recordedValueCount: 0,
      source: "delegate-unavailable",
    };
  }

  return {
    delegateAvailable: false,
    label: "internal",
    mockValueCount: 0,
    payloadContentExposed: false,
    recordedValueCount: 0,
    source: "internal",
  };
}

function compactRuntimeLogEntries(logEntries) {
  if (!Array.isArray(logEntries)) {
    return [];
  }

  return logEntries
    .filter((entry) => entry && typeof entry.text === "string")
    .map((entry) => ({
      lineId: entry.lineId || "",
      nodeId: entry.nodeId || "",
      sequence: Number(entry.sequence || 0),
      speaker: boundRuntimeLogText(entry.speaker || "", 80),
      text: boundRuntimeLogText(entry.text || "", 240),
    }))
    .slice(-24);
}

function boundRuntimeLogText(value, maximumLength) {
  const text = String(value || "");
  return text.length > maximumLength ? `${text.slice(0, Math.max(0, maximumLength - 3))}...` : text;
}

function compactRuntimeActionRequests(actionRequests) {
  if (!Array.isArray(actionRequests)) {
    return [];
  }

  return actionRequests
    .filter((request) => request && typeof request.name === "string")
    .map((request) => ({
      argumentCount: Array.isArray(request.arguments) ? request.arguments.length : 0,
      handlerName: request.handlerName || "",
      lineId: request.lineId || "",
      mode: request.mode || "",
      name: request.name || "",
      nodeId: request.nodeId || "",
      requestId: request.requestId || "",
      sourceColumn: Number(request.sourceColumn || 0),
      sourceLine: Number(request.sourceLine || 0),
    }))
    .slice(-8);
}

function compactRuntimePendingAction(pendingAction) {
  if (!pendingAction || typeof pendingAction !== "object") {
    return null;
  }

  return {
    argumentCount: Array.isArray(pendingAction.arguments) ? pendingAction.arguments.length : 0,
    handlerName: pendingAction.handlerName || "",
    hostPayloadAvailable: Boolean(pendingAction.hostPayload),
    lineId: pendingAction.lineId || "",
    mode: pendingAction.mode || "",
    name: pendingAction.name || "",
    nodeId: pendingAction.nodeId || "",
    requestId: pendingAction.requestId || "",
    sourceColumn: Number(pendingAction.sourceColumn || 0),
    sourceLine: Number(pendingAction.sourceLine || 0),
    status: pendingAction.status || "",
  };
}

function normalizeRuntimeQueryProviderSource(source) {
  const normalized = String(source || "").trim().toLowerCase();
  if (normalized === "mock" || normalized === "recorded" || normalized === "internal") {
    return normalized;
  }

  if (normalized === "delegate" || normalized === "delegate unavailable" || normalized === "delegate-unavailable") {
    return "delegate-unavailable";
  }

  return "";
}

export function compactLocalizationReviewPayload(report, baseline = null) {
  return {
    baseline: baseline?.metadata || null,
    format: "inscape.self-hosted-editor.localization-review",
    formatVersion: 2,
    lineIdentity: report?.lineIdentity || null,
    presenter: {
      items: compactLocalizationReviewItems(report?.presenter?.items),
    },
    summary: report?.summary || null,
  };
}

export function compactLocalizationUpdatePayload({ baseline = null, csv = "", translationOverrides = [] }) {
  const text = String(csv || "");
  return {
    baseline: baseline?.metadata || null,
    csv: text,
    format: "inscape.self-hosted-editor.localization-updated-csv",
    formatVersion: 1,
    safety: {
      backup: {
        required: false,
        status: "not-written-by-dev-host",
        targetKind: "localization-csv",
      },
      csvByteLength: Buffer.byteLength(text, "utf8"),
      generatedBy: "update-l10n-project",
      recoveryHint: "Dev-host localization update only generates CSV; keep the previous CSV until host-owned export or linked-file replacement succeeds.",
      translationOverrideCount: countLocalizationTranslationOverrides(translationOverrides),
      writesWorkspaceFile: false,
    },
  };
}

export function compactStoryNodeMapReviewPayload({ nodeMap, nodeMapPath, nodeMapText, report, tempRoot }) {
  return {
    format: "inscape.self-hosted-editor.node-map-review",
    formatVersion: 1,
    nodeMap,
    nodeMapPath: relativizeSourcePath(nodeMapPath, tempRoot),
    nodeMapText,
    report: {
      format: report?.format || "inscape.node-map-update-report",
      formatVersion: Number(report?.formatVersion || 0),
      items: compactStoryNodeMapReviewItems(report?.items),
      summary: report?.summary || null,
      workspace: "",
    },
  };
}

export function compactStoryNodeMapApplyPayload({ candidateStableId, dryRun, itemStableId, nodeMap, nodeMapPath, nodeMapText, result, tempRoot }) {
  const compactResult = compactStoryNodeMapApplyResult(result, tempRoot);
  return {
    backup: compactResult?.backup || null,
    candidateStableId,
    changePreview: compactResult?.changePreview || null,
    dryRun: Boolean(dryRun),
    format: "inscape.self-hosted-editor.node-map-apply",
    formatVersion: 1,
    itemStableId,
    nodeMap,
    nodeMapPath: relativizeSourcePath(nodeMapPath, tempRoot),
    nodeMapText,
    recoveryHint: compactResult?.recoveryHint || "",
    result: compactResult,
  };
}

export function relativizeLocalizationReviewPaths(payload, tempRoot) {
  const visit = (value) => {
    if (!value || typeof value !== "object") {
      return;
    }

    if (typeof value.sourcePath === "string") {
      value.sourcePath = relativizeSourcePath(value.sourcePath, tempRoot);
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
      return;
    }

    for (const nested of Object.values(value)) {
      visit(nested);
    }
  };

  visit(payload);
  return payload;
}

export function relativizeStoryNodeMapReviewPaths(payload, tempRoot) {
  for (const item of Array.isArray(payload?.items) ? payload.items : []) {
    if (typeof item.sourcePath === "string") {
      item.sourcePath = relativizeSourcePath(item.sourcePath, tempRoot);
    }

    for (const candidate of Array.isArray(item.candidates) ? item.candidates : []) {
      if (typeof candidate.sourcePath === "string") {
        candidate.sourcePath = relativizeSourcePath(candidate.sourcePath, tempRoot);
      }
    }
  }

  return payload;
}

export function relativizeProjectSourcePaths(payload, tempRoot) {
  const normalizeSource = (source) => {
    if (!source || typeof source.sourcePath !== "string") {
      return source;
    }

    source.sourcePath = relativizeSourcePath(source.sourcePath, tempRoot);
    return source;
  };

  for (const document of Array.isArray(payload?.documents) ? payload.documents : []) {
    if (typeof document.sourcePath === "string") {
      document.sourcePath = relativizeSourcePath(document.sourcePath, tempRoot);
    }

    for (const node of Array.isArray(document.nodes) ? document.nodes : []) {
      normalizeSource(node.source);
      for (const line of Array.isArray(node.lines) ? node.lines : []) {
        normalizeSource(line.source);
      }

      for (const group of Array.isArray(node.choices) ? node.choices : []) {
        normalizeSource(group.source);
        for (const option of Array.isArray(group.options) ? group.options : []) {
          normalizeSource(option.source);
        }
      }
    }

    for (const edge of Array.isArray(document.edges) ? document.edges : []) {
      normalizeSource(edge.source);
    }
  }

  const currentNode = payload?.currentNode || null;
  if (currentNode) {
    normalizeSource(currentNode.source);
    for (const line of Array.isArray(currentNode.lines) ? currentNode.lines : []) {
      normalizeSource(line.source);
    }

    for (const group of Array.isArray(currentNode.choices) ? currentNode.choices : []) {
      normalizeSource(group.source);
      for (const option of Array.isArray(group.options) ? group.options : []) {
        normalizeSource(option.source);
      }
    }
  }

  return payload;
}

export function relativizeHostBindingCapabilityPaths(payload, tempRoot) {
  const normalizeLocation = (location) => {
    if (!location || typeof location.sourcePath !== "string") {
      return;
    }

    location.sourcePath = relativizeSourcePath(location.sourcePath, tempRoot);
  };

  for (const speaker of Array.isArray(payload?.speakers) ? payload.speakers : []) {
    normalizeLocation(speaker);
    for (const location of Array.isArray(speaker.locations) ? speaker.locations : []) {
      normalizeLocation(location);
    }
  }

  for (const binding of Array.isArray(payload?.bindings) ? payload.bindings : []) {
    normalizeLocation(binding);
    for (const location of Array.isArray(binding.locations) ? binding.locations : []) {
      normalizeLocation(location);
    }
  }

  if (typeof payload?.hostBridge?.resolvedPath === "string") {
    payload.hostBridge.resolvedPath = relativizeSourcePath(payload.hostBridge.resolvedPath, tempRoot);
  }

  if (typeof payload?.hostBridge?.configuredPath === "string") {
    payload.hostBridge.configuredPath = relativizeSourcePath(payload.hostBridge.configuredPath, tempRoot);
  }

  return payload;
}

export function relativizeLanguageServerSemanticPaths(payload, tempRoot) {
  const normalizeLocation = (location) => {
    if (!location || typeof location.sourcePath !== "string") {
      return;
    }

    location.sourcePath = relativizeSourcePath(location.sourcePath, tempRoot);
  };

  normalizeLocation(payload?.definition?.location);
  normalizeLocation(payload?.hover?.location);
  for (const diagnostic of Array.isArray(payload?.diagnostics) ? payload.diagnostics : []) {
    normalizeLocation(diagnostic?.location);
  }
  for (const reference of Array.isArray(payload?.references) ? payload.references : []) {
    normalizeLocation(reference?.location);
  }
  for (const symbol of Array.isArray(payload?.symbols) ? payload.symbols : []) {
    normalizeLocation(symbol?.location);
  }

  return payload;
}

export function relativizeSourcePath(sourcePath, tempRoot) {
  const relativePath = path.relative(tempRoot, sourcePath);
  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return sourcePath
      .replace(/\\/g, "/")
      .replace(/^.*?inscape-self-hosted-editor-[^/]+\//, "");
  }

  return relativePath.replace(/\\/g, "/");
}

function compactStoryNodeMapReviewItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    candidates: (Array.isArray(item?.candidates) ? item.candidates : []).map((candidate) => ({
      applyPreview: compactStoryNodeMapApplyPreview(candidate?.applyPreview),
      evidence: compactStoryNodeMapCandidateEvidence(candidate?.evidence),
      score: Number(candidate?.score || 0),
      sourceLine: Number(candidate?.sourceLine || 0),
      sourcePath: candidate?.sourcePath || "",
      stableId: candidate?.stableId || "",
      title: candidate?.title || "",
    })),
    kind: item?.kind || "",
    message: item?.message || "",
    previousTitle: item?.previousTitle || "",
    sourceLine: Number(item?.sourceLine || 0),
    sourcePath: item?.sourcePath || "",
    stableId: item?.stableId || "",
    status: item?.status || "",
    title: item?.title || "",
  }));
}

function compactStoryNodeMapApplyResult(result, tempRoot) {
  if (!result || typeof result !== "object") {
    return null;
  }

  return {
    appliedStableId: result.appliedStableId || "",
    backup: compactStoryNodeMapApplyBackup(result.backup, tempRoot),
    changePreview: compactStoryNodeMapApplyPreview(result.changePreview),
    dryRun: Boolean(result.dryRun),
    format: result.format || "inscape.node-map-candidate-apply-result",
    formatVersion: Number(result.formatVersion || 0),
    nodeMapPath: result.nodeMapPath ? relativizeSourcePath(result.nodeMapPath, tempRoot) : "",
    outputPath: result.outputPath ? relativizeSourcePath(result.outputPath, tempRoot) : "",
    recoveryHint: result.recoveryHint || "",
    removedStableId: result.removedStableId || "",
    title: result.title || "",
    writesNodeMap: Boolean(result.writesNodeMap),
  };
}

function compactStoryNodeMapApplyPreview(preview) {
  if (!preview || typeof preview !== "object") {
    return null;
  }

  return {
    appliedStableId: preview.appliedStableId || "",
    candidateStableId: preview.candidateStableId || "",
    candidateTitle: preview.candidateTitle || "",
    currentStableId: preview.currentStableId || "",
    currentTitle: preview.currentTitle || "",
    operation: preview.operation || "",
    previousTitlesAfterApply: Array.isArray(preview.previousTitlesAfterApply)
      ? preview.previousTitlesAfterApply.map((title) => String(title || ""))
      : [],
    removedStableId: preview.removedStableId || "",
    removesCandidateEntry: Boolean(preview.removesCandidateEntry),
    resultTitle: preview.resultTitle || "",
  };
}

function compactStoryNodeMapApplyBackup(backup, tempRoot) {
  if (!backup || typeof backup !== "object") {
    return null;
  }

  return {
    required: Boolean(backup.required),
    sourcePath: backup.sourcePath ? relativizeSourcePath(backup.sourcePath, tempRoot) : "",
    status: backup.status || "",
    suggestedBackupDirectory: backup.suggestedBackupDirectory || "",
    targetKind: backup.targetKind || "",
  };
}

function compactStoryNodeMapCandidateEvidence(evidence) {
  if (!Array.isArray(evidence)) {
    return [];
  }

  return evidence.map((item) => ({
    kind: item?.kind || "",
    label: item?.label || "",
    value: item?.value || "",
  }));
}

function compactLocalizationReviewItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((presenterItem) => {
    const item = presenterItem?.item || {};
    const signals = compactLocalizationReviewSignals(presenterItem?.signals || presenterItem?.Signals)
      .filter((signal) => signal.severity === "risk");
    const compactItem = {
      actions: compactLocalizationReviewActions(presenterItem?.actions || presenterItem?.Actions),
      detail: signals.length > 0 ? presenterItem?.detail || "" : "",
      item: {
        anchor: item.anchor || "",
        kind: item.kind || "",
        line: Number(item.line || presenterItem?.line || 0),
        lineFingerprint: item.lineFingerprint || item.LineFingerprint || "",
        lineId: item.lineId || item.LineId || "",
        lineIdentityStatus: item.lineIdentityStatus || item.LineIdentityStatus || "",
        nodeTitle: item.nodeTitle || "",
        review: item.review || "",
        speaker: item.speaker || "",
        status: item.status || "",
        text: item.text || "",
        translation: item.translation || "",
      },
      line: Number(presenterItem?.line || item.line || 0),
      sourcePath: presenterItem?.sourcePath || item.sourcePath || "",
      summary: presenterItem?.summary || "",
      title: presenterItem?.title || "",
    };
    if (signals.length > 0) {
      compactItem.signals = signals;
    }

    return compactItem;
  });
}

function compactLocalizationReviewActions(actions) {
  if (!Array.isArray(actions)) {
    return [];
  }

  return actions.map((action) => {
    const actionKey = action?.actionKey || action?.ActionKey || "";
    const signals = actionKey === "open-candidate"
      ? compactLocalizationReviewSignals(action?.signals || action?.Signals)
      : [];
    const compactAction = {
      actionIndex: Number(action?.actionIndex ?? action?.ActionIndex ?? 0),
      actionKey,
      actionStatus: actionKey === "open-candidate" && signals.length === 0 ? action?.actionStatus || action?.ActionStatus || "" : "",
      column: Number(action?.column ?? action?.Column ?? 0),
      detail: actionKey === "show-candidate-diff" ? action?.detail || action?.Detail || "" : "",
      length: Number(action?.length ?? action?.Length ?? 0),
      line: Number(action?.line ?? action?.Line ?? 0),
      sourcePath: action?.sourcePath || action?.SourcePath || "",
      summary: "",
      title: action?.title || action?.Title || "",
    };
    if (signals.length > 0) {
      compactAction.signals = signals;
    }

    return compactAction;
  });
}

function compactLocalizationReviewSignals(signals) {
  if (!Array.isArray(signals)) {
    return [];
  }

  return signals
    .filter((signal) => signal && (signal.key || signal.Key))
    .map((signal) => ({
      key: signal.key || signal.Key || "",
      severity: signal.severity || signal.Severity || "",
      value: signal.value || signal.Value || "",
    }))
    .filter((signal) => signal.key && signal.value);
}

function countLocalizationTranslationOverrides(translationOverrides) {
  if (!Array.isArray(translationOverrides)) {
    return 0;
  }

  return translationOverrides.filter((item) =>
    item && typeof item === "object" && String(item.anchor || "").trim()
  ).length;
}

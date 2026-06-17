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

export function compactRuntimeStatePayload(payload, sessionId = "") {
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

export function compactStoryNodeMapApplyPayload({ candidateStableId, dryRun, itemStableId, nodeMap, nodeMapPath, nodeMapText, tempRoot }) {
  return {
    candidateStableId,
    dryRun: Boolean(dryRun),
    format: "inscape.self-hosted-editor.node-map-apply",
    formatVersion: 1,
    itemStableId,
    nodeMap,
    nodeMapPath: relativizeSourcePath(nodeMapPath, tempRoot),
    nodeMapText,
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

function compactLocalizationReviewItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((presenterItem) => {
    const item = presenterItem?.item || {};
    return {
      actions: compactLocalizationReviewActions(presenterItem?.actions || presenterItem?.Actions),
      detail: presenterItem?.detail || "",
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
  });
}

function compactLocalizationReviewActions(actions) {
  if (!Array.isArray(actions)) {
    return [];
  }

  return actions.map((action) => {
    const actionKey = action?.actionKey || action?.ActionKey || "";
    return {
      actionIndex: Number(action?.actionIndex ?? action?.ActionIndex ?? 0),
      actionKey,
      actionStatus: actionKey === "open-candidate" ? action?.actionStatus || action?.ActionStatus || "" : "",
      column: Number(action?.column ?? action?.Column ?? 0),
      detail: actionKey === "show-candidate-diff" ? action?.detail || action?.Detail || "" : "",
      length: Number(action?.length ?? action?.Length ?? 0),
      line: Number(action?.line ?? action?.Line ?? 0),
      sourcePath: action?.sourcePath || action?.SourcePath || "",
      summary: "",
      title: action?.title || action?.Title || "",
    };
  });
}

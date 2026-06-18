export const RuntimeActionAuthoringFormat = "inscape.self-hosted-editor.runtime-action-authoring";
export const RuntimeActionAuthoringFormatVersion = 1;

export class RuntimeActionAuthoringModelBuilder {
  static build({
    hostBindingCatalog = null,
    hostSchemaCatalog = null,
    runtimeSnapshot = null,
    sessionId = "",
    workspaceRevision = null,
  } = {}) {
    const schemaCatalog = normalizeHostSchemaCatalog(hostSchemaCatalog);
    const bridgeCatalog = normalizeHostBindingCatalog(hostBindingCatalog);
    const runtime = normalizeRuntimeSnapshot(runtimeSnapshot);
    const bridgeActionsByName = groupActionsByName(bridgeCatalog.actions);
    const actionRequests = buildActionRequests(runtime.snapshot?.actionRequests || []);
    const actionRequestsByName = groupActionsByName(actionRequests);
    const rows = schemaCatalog.actions.map((action, index) =>
      buildActionRow(action, bridgeActionsByName.get(action.name) || [], actionRequestsByName.get(action.name) || [], index)
    );
    const pendingAction = buildPendingAction(runtime.snapshot?.pendingAction || null);
    const runtimeActionBridgeInput = buildRuntimeActionBridgeInputFromRows(rows);

    return {
      authoringOnly: true,
      contentPolicy: {
        excludes: [
          "workspace-text",
          "raw-action",
          "host-payload",
          "action-argument-values",
          "complete-action-history",
        ],
        writesToRuntimeState: false,
      },
      fireCount: rows.filter((row) => row.mode === "fire").length,
      format: RuntimeActionAuthoringFormat,
      formatVersion: RuntimeActionAuthoringFormatVersion,
      handlerAvailableCount: rows.filter((row) => row.handlerAvailable).length,
      handlerMissingCount: rows.filter((row) => !row.handlerAvailable).length,
      hostBridge: {
        actionCount: bridgeCatalog.actions.length,
        errorMessageAvailable: Boolean(bridgeCatalog.hostBridge.errorMessage),
        loaded: bridgeCatalog.hostBridge.loaded,
        resolvedPath: bridgeCatalog.hostBridge.resolvedPath,
      },
      hostSchema: {
        actionCount: schemaCatalog.actions.length,
        errorMessageAvailable: Boolean(schemaCatalog.hostSchema.errorMessage),
        loaded: schemaCatalog.hostSchema.loaded,
        resolvedPath: schemaCatalog.hostSchema.resolvedPath,
      },
      payloadContentExposed: false,
      pendingAction,
      pendingCount: pendingAction ? 1 : 0,
      requestCount: actionRequests.length,
      actionRequests,
      rows,
      runtime: {
        provider: runtime.provider,
        ready: runtime.provider === "runtime-project" && Boolean(runtime.snapshot),
      },
      runtimeActionBridgeInput,
      sessionId: formatSessionId(sessionId),
      waitOrHandoffCount: rows.filter((row) => row.blocksRuntimeControls).length,
      workspaceRevision: normalizeOptionalNonNegativeInteger(workspaceRevision),
    };
  }

  static buildRuntimeActionBridgeInput({
    hostBindingCatalog = null,
    hostSchemaCatalog = null,
  } = {}) {
    const model = this.build({
      hostBindingCatalog,
      hostSchemaCatalog,
    });
    return model.runtimeActionBridgeInput;
  }

  static buildResumeActionRequest(pendingAction, status) {
    const normalizedStatus = normalizeResumeStatus(status);
    return {
      errorCode: normalizedStatus === "completed" ? "" : `debug-${normalizedStatus}`,
      errorMessage: "",
      hostPayload: "",
      requestId: normalizeLabel(pendingAction?.requestId, ""),
      status: normalizedStatus,
      type: "resume-action",
    };
  }
}

function buildActionRow(action, bridgeActions, actionRequests, index) {
  const hostBridgeLocations = bridgeActions
    .flatMap((bridgeAction) => [
      bridgeAction,
      ...bridgeAction.locations,
    ])
    .filter((location) => location.sourceKind === "hostBridge");
  const handlerAvailable = hostBridgeLocations.length > 0;
  const mode = normalizeActionMode(action.mode);

  return {
    blocksRuntimeControls: mode === "wait" || mode === "handoff",
    descriptionAvailable: Boolean(action.description),
    handlerAvailable,
    handlerLabel: handlerAvailable
      ? hostBridgeLocations[0].sourceLabel || "Host Bridge action"
      : "",
    idKind: action.idKind,
    mode,
    name: action.name,
    parameterCount: action.parameters.length,
    requestCount: actionRequests.length,
    rowId: `${action.name}#${index + 1}`,
    source: {
      character: action.character,
      length: action.length,
      line: action.line,
      sourcePath: action.sourcePath,
    },
    state: handlerAvailable ? "ready" : "handler-missing",
  };
}

function buildPendingAction(pendingAction) {
  if (!pendingAction || typeof pendingAction !== "object") {
    return null;
  }

  const mode = normalizeActionMode(pendingAction.mode);
  return {
    argumentCount: Array.isArray(pendingAction.arguments) ? pendingAction.arguments.length : 0,
    blocksRuntimeControls: mode === "wait" || mode === "handoff",
    handlerName: normalizeLabel(pendingAction.handlerName, ""),
    hostPayloadAvailable: normalizeLabel(pendingAction.hostPayload, "").length > 0,
    mode,
    name: normalizeLabel(pendingAction.name, ""),
    nodeId: normalizeLabel(pendingAction.nodeId, ""),
    requestId: normalizeLabel(pendingAction.requestId, ""),
    resumeStatuses: ["completed", "failed", "cancelled", "timeout"],
    sourceLine: normalizeNonNegativeInteger(pendingAction.sourceLine, 0),
    status: normalizeLabel(pendingAction.status, "waiting"),
  };
}

function buildActionRequests(actionRequests) {
  if (!Array.isArray(actionRequests)) {
    return [];
  }

  return actionRequests
    .filter((request) => request && typeof request.name === "string")
    .map((request) => ({
      argumentCount: Array.isArray(request.arguments) ? request.arguments.length : 0,
      blocksRuntimeControls: false,
      handlerName: normalizeLabel(request.handlerName, ""),
      mode: normalizeActionMode(request.mode),
      name: request.name.trim(),
      nodeId: normalizeLabel(request.nodeId, ""),
      requestId: normalizeLabel(request.requestId, ""),
      sourceLine: normalizeNonNegativeInteger(request.sourceLine, 0),
    }))
    .filter((request) => request.name)
    .slice(-8);
}

function buildRuntimeActionBridgeInputFromRows(rows) {
  return {
    actions: rows.map((row) => ({
      mode: row.mode,
      name: row.name,
    })),
    handlers: rows
      .filter((row) => row.handlerAvailable)
      .map((row) => ({
        handlerName: row.handlerLabel || "Host Bridge action",
        name: row.name,
      })),
  };
}

function normalizeHostSchemaCatalog(hostSchemaCatalog) {
  const catalog = hostSchemaCatalog && typeof hostSchemaCatalog === "object"
    ? hostSchemaCatalog
    : {};
  return {
    actions: normalizeSchemaActions(catalog.actions),
    hostSchema: {
      errorMessage: normalizeLabel(catalog.hostSchema?.errorMessage, ""),
      loaded: catalog.hostSchema?.loaded === true,
      resolvedPath: normalizeLabel(catalog.hostSchema?.resolvedPath, ""),
    },
  };
}

function normalizeHostBindingCatalog(hostBindingCatalog) {
  const catalog = hostBindingCatalog && typeof hostBindingCatalog === "object"
    ? hostBindingCatalog
    : {};
  return {
    actions: normalizeBridgeActions(catalog.actions),
    hostBridge: {
      errorMessage: normalizeLabel(catalog.hostBridge?.errorMessage, ""),
      loaded: catalog.hostBridge?.loaded === true,
      resolvedPath: normalizeLabel(catalog.hostBridge?.resolvedPath, ""),
    },
  };
}

function normalizeSchemaActions(actions) {
  if (!Array.isArray(actions)) {
    return [];
  }

  return actions
    .filter((action) => action && typeof action.name === "string")
    .map((action) => ({
      character: normalizeNonNegativeInteger(action.character, 0),
      description: normalizeLabel(action.description, ""),
      idKind: normalizeLabel(action.idKind, ""),
      length: normalizePositiveInteger(action.length, action.name.length || 1),
      line: normalizeNonNegativeInteger(action.line, 0),
      mode: normalizeActionMode(action.mode),
      name: action.name.trim(),
      parameters: Array.isArray(action.parameters) ? action.parameters : [],
      sourcePath: normalizeLabel(action.sourcePath, ""),
    }))
    .filter((action) => action.name)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeBridgeActions(actions) {
  if (!Array.isArray(actions)) {
    return [];
  }

  return actions
    .filter((action) => action && typeof action.name === "string")
    .map((action) => ({
      character: normalizeNonNegativeInteger(action.character, 0),
      length: normalizePositiveInteger(action.length, action.name.length || 1),
      line: normalizeNonNegativeInteger(action.line, 0),
      locations: normalizeLocations(action.locations),
      name: action.name.trim(),
      sourceKind: normalizeLabel(action.sourceKind, ""),
      sourceLabel: normalizeLabel(action.sourceLabel, ""),
      sourcePath: normalizeLabel(action.sourcePath, ""),
    }))
    .filter((action) => action.name)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeLocations(locations) {
  if (!Array.isArray(locations)) {
    return [];
  }

  return locations
    .filter((location) => location && typeof location.sourcePath === "string")
    .map((location) => ({
      character: normalizeNonNegativeInteger(location.character, 0),
      length: normalizePositiveInteger(location.length, 1),
      line: normalizeNonNegativeInteger(location.line, 0),
      sourceKind: normalizeLabel(location.sourceKind, ""),
      sourceLabel: normalizeLabel(location.sourceLabel, ""),
      sourcePath: normalizeLabel(location.sourcePath, ""),
      sourceRank: normalizeNonNegativeInteger(location.sourceRank, 0),
    }))
    .filter((location) => location.sourcePath);
}

function normalizeRuntimeSnapshot(runtimeSnapshot) {
  if (runtimeSnapshot?.provider) {
    return {
      provider: runtimeSnapshot.provider,
      snapshot: runtimeSnapshot.snapshot || null,
    };
  }

  return {
    provider: runtimeSnapshot ? "runtime-project" : "unavailable",
    snapshot: runtimeSnapshot || null,
  };
}

function groupActionsByName(actions) {
  const groups = new Map();
  for (const action of actions) {
    if (!groups.has(action.name)) {
      groups.set(action.name, []);
    }

    groups.get(action.name).push(action);
  }

  return groups;
}

function normalizeActionMode(mode) {
  const normalized = String(mode || "").trim().toLowerCase();
  return normalized || "fire";
}

function normalizeResumeStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  return ["completed", "failed", "cancelled", "timeout"].includes(normalized)
    ? normalized
    : "completed";
}

function formatSessionId(sessionId) {
  const text = normalizeLabel(sessionId, "default");
  return text.length > 48 ? `${text.slice(0, 45)}...` : text;
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

function normalizePositiveInteger(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 1) {
    return fallback;
  }

  return Math.floor(numericValue);
}

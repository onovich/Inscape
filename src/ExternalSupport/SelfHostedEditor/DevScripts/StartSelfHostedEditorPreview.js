import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSelfHostedEditorApiHandlers,
} from "./SelfHostedEditorApiHandlerBridge.js";
import {
  compactLocalizationReviewPayload,
  compactLocalizationUpdatePayload,
  compactProjectGraphPayload,
  compactRuntimeStatePayload,
  compactStoryNodeMapApplyPayload,
  compactStoryNodeMapReviewPayload,
  relativizeHostBindingCapabilityPaths,
  relativizeLanguageServerSemanticPaths,
  relativizeLocalizationReviewPaths,
  relativizeProjectSourcePaths,
  relativizeStoryNodeMapReviewPaths,
} from "./SelfHostedEditorPayloadBridge.js";
import {
  runCliCommand,
  runLanguageServerDocumentSymbols,
  runLanguageServerHostBindingCapabilities,
  runLanguageServerHostSchemaCapabilities,
  runLanguageServerProjectCompletions,
  runLanguageServerProjectDefinition,
  runLanguageServerProjectDiagnostics,
  runLanguageServerProjectHover,
  runLanguageServerProjectReferences,
} from "./SelfHostedEditorProcessBridge.js";
import {
  disposeSharedSelfHostedEditorLanguageSessionBridge,
  getSharedSelfHostedEditorLanguageSessionBridge,
  isSelfHostedEditorLanguageSessionEnabled,
} from "./SelfHostedEditorLanguageSessionBridge.js";
import {
  getLineMapSessionState,
  normalizeLineMapSessionId,
  rememberLineMapSessionState,
  rememberRuntimeSessionState,
  resolveExistingLocalizationBaseline,
  resolveLocalizationBaseline,
} from "./SelfHostedEditorSessionBridge.js";
import {
  createSelfHostedEditorApiRoutes,
  routeSelfHostedEditorApiRequest,
} from "./SelfHostedEditorRouteBridge.js";
import {
  serveSelfHostedEditorStaticAsset,
} from "./SelfHostedEditorStaticAssetBridge.js";
import {
  resolveTemporaryWorkspacePath,
  withTemporaryWorkspace,
} from "./SelfHostedEditorWorkspaceBridge.js";

const currentModulePath = fileURLToPath(import.meta.url);
const moduleRoot = path.resolve(path.dirname(currentModulePath), "..");
const repoRoot = path.resolve(moduleRoot, "..", "..", "..");
const port = Number(process.env.PORT || 5178);
const apiRoutes = createSelfHostedEditorApiRoutes(createSelfHostedEditorApiHandlers({
  diagnoseScriptText,
  getCompletionsForScriptText,
  getDefinitionForScriptText,
  getDocumentSymbolsForScriptText,
  getHostBindingCapabilitiesForScriptText,
  getHostSchemaCapabilitiesForScriptText,
  getHoverForScriptText,
  getLocalizationReviewForScriptText,
  getReferencesForScriptText,
  getRuntimeStateForScriptText,
  exportRuntimeSubstateForScriptText,
  getStoryGraphForScriptText,
  getStoryNodeMapCandidateApplyForScriptText,
  getStoryNodeMapReviewForScriptText,
  getUpdatedLocalizationCsvForScriptText,
  importRuntimeSubstateForScriptText,
  refreshLineMapForScriptText,
  stepRuntimeStateForScriptText,
  validateRuntimeSubstateForScriptText,
}));

export function createSelfHostedEditorPreviewServer(serverPort = port) {
  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url || "/", `http://localhost:${serverPort}`);

    if (await routeSelfHostedEditorApiRequest(request, response, requestUrl, apiRoutes)) {
      return;
    }

    await serveSelfHostedEditorStaticAsset(requestUrl, response, {
      moduleRoot,
      repoRoot,
    });
  });
  server.on("close", () => {
    void disposeSharedSelfHostedEditorLanguageSessionBridge();
  });
  return server;
}

async function diagnoseScriptText(scriptText, workspace) {
  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot, activeRelativePath }) => {
    const payload = relativizeLanguageServerSemanticPaths(
      await getProjectDiagnosticsPayload(tempRoot),
      tempRoot
    );
    return filterProjectDiagnostics(payload, activeRelativePath);
  });
}

async function getHoverForScriptText(scriptText, hoverKind, hoverName, workspace) {
  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot }) => {
    const result = await runLanguageServerProjectHover(tempRoot, hoverKind, hoverName);
    return relativizeLanguageServerSemanticPaths(JSON.parse(result.stdout), tempRoot);
  });
}

async function getDefinitionForScriptText(scriptText, definitionName, workspace) {
  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot }) => {
    const result = await runLanguageServerProjectDefinition(tempRoot, definitionName);
    return relativizeLanguageServerSemanticPaths(JSON.parse(result.stdout), tempRoot);
  });
}

export async function getReferencesForScriptText(scriptText, referenceName, workspace) {
  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot }) => {
    const result = await runLanguageServerProjectReferences(tempRoot, referenceName);
    return relativizeLanguageServerSemanticPaths(JSON.parse(result.stdout), tempRoot);
  });
}

async function getCompletionsForScriptText(scriptText, workspace) {
  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot }) => {
    const result = await runLanguageServerProjectCompletions(tempRoot);
    return JSON.parse(result.stdout);
  });
}

async function getDocumentSymbolsForScriptText(scriptText, workspace) {
  return withTemporaryWorkspace(workspace, scriptText, async ({ activeFilePath, tempRoot }) => {
    return relativizeLanguageServerSemanticPaths(
      await getDocumentSymbolsPayload(activeFilePath),
      tempRoot
    );
  });
}

async function getProjectDiagnosticsPayload(tempRoot) {
  if (isSelfHostedEditorLanguageSessionEnabled()) {
    try {
      return await getSharedSelfHostedEditorLanguageSessionBridge().diagnoseProject(tempRoot);
    } catch (error) {
      console.warn("SelfHostedEditor LanguageServer session diagnostics fallback:", error);
    }
  }

  const result = await runLanguageServerProjectDiagnostics(tempRoot);
  return JSON.parse(result.stdout);
}

async function getDocumentSymbolsPayload(activeFilePath) {
  if (isSelfHostedEditorLanguageSessionEnabled()) {
    try {
      return await getSharedSelfHostedEditorLanguageSessionBridge().documentSymbolsFile(activeFilePath);
    } catch (error) {
      console.warn("SelfHostedEditor LanguageServer session document-symbols fallback:", error);
    }
  }

  const result = await runLanguageServerDocumentSymbols(activeFilePath);
  return JSON.parse(result.stdout);
}

export async function getHostSchemaCapabilitiesForScriptText(scriptText, workspace) {
  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot }) => {
    const result = await runLanguageServerHostSchemaCapabilities(tempRoot);
    return JSON.parse(result.stdout);
  });
}

export async function getHostBindingCapabilitiesForScriptText(scriptText, workspace) {
  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot }) => {
    const result = await runLanguageServerHostBindingCapabilities(tempRoot);
    return relativizeHostBindingCapabilityPaths(JSON.parse(result.stdout), tempRoot);
  });
}

async function getStoryGraphForScriptText(scriptText, workspace) {
  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot }) => {
    const result = await runCliCommand([
      "compile-project",
      tempRoot,
    ], "CLI project graph compile");
    return compactProjectGraphPayload(relativizeProjectSourcePaths(JSON.parse(result.stdout), tempRoot));
  });
}

export async function getRuntimeStateForScriptText(scriptText, workspace, sessionId = "", queryProvider = null, actionDispatcher = null) {
  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot }) => {
    const cliArgs = [
      "runtime-project",
      tempRoot,
    ];
    await appendRuntimeQueryProviderArgs(cliArgs, tempRoot, queryProvider);
    await appendRuntimeActionDispatcherArgs(cliArgs, tempRoot, actionDispatcher);
    const result = await runCliCommand(cliArgs, "CLI runtime project snapshot");
    return rememberRuntimeSessionState(
      compactRuntimeStatePayload(relativizeProjectSourcePaths(JSON.parse(result.stdout), tempRoot), sessionId, queryProvider),
      sessionId
    );
  });
}

export async function stepRuntimeStateForScriptText(scriptText, workspace, runtimeState, action, sessionId = "", queryProvider = null, actionDispatcher = null) {
  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot }) => {
    const statePath = path.join(tempRoot, "inscape.runtime-state.json");
    const substatePath = path.join(tempRoot, "inscape.runtime-substate.json");
    const resumePath = path.join(tempRoot, "inscape.runtime-action-resume.json");
    const cliArgs = [
      "runtime-project",
      tempRoot,
    ];
    await appendRuntimeQueryProviderArgs(cliArgs, tempRoot, queryProvider);
    await appendRuntimeActionDispatcherArgs(cliArgs, tempRoot, actionDispatcher);

    const isResumeAction = action.type === "resume-action";
    if (isResumeAction && runtimeState?.pendingAction) {
      await fsp.writeFile(substatePath, JSON.stringify(buildRuntimeSubstateFromSnapshot(runtimeState), null, 2), "utf8");
      cliArgs.push("--substate", substatePath);
    } else if (runtimeState) {
      await fsp.writeFile(statePath, JSON.stringify(runtimeState, null, 2), "utf8");
      cliArgs.push("--state", statePath);
    }

    if (action.type === "continue") {
      cliArgs.push("--continue");
    } else if (action.type === "advance-flow") {
      cliArgs.push("--advance-flow");
    } else if (action.type === "rewind") {
      cliArgs.push("--rewind");
    } else if (action.type === "rewind-flow") {
      cliArgs.push("--rewind-flow");
    } else if (action.type === "choose") {
      cliArgs.push(
        "--choose",
        String(Number(action.groupIndex || 0)),
        String(Number(action.optionIndex || 0))
      );
    } else if (isResumeAction) {
      await fsp.writeFile(resumePath, JSON.stringify(normalizeRuntimeActionResume(action), null, 2), "utf8");
      cliArgs.push("--resume-action", resumePath);
    } else {
      throw new Error("Runtime action requires type `continue`, `advance-flow`, `rewind`, `rewind-flow`, `resume-action`, or `choose`.");
    }

    const result = await runCliCommand(cliArgs, "CLI runtime project action");
    return rememberRuntimeSessionState(
      compactRuntimeStatePayload(relativizeProjectSourcePaths(JSON.parse(result.stdout), tempRoot), sessionId, queryProvider),
      sessionId
    );
  });
}

export async function exportRuntimeSubstateForScriptText(scriptText, workspace, runtimeState, sessionId = "", queryProvider = null, actionDispatcher = null, options = {}) {
  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot }) => {
    const statePath = path.join(tempRoot, "inscape.runtime-state.json");
    const restoreSubstatePath = path.join(tempRoot, "inscape.runtime-substate-restore.json");
    const exportedSubstatePath = path.join(tempRoot, "inscape.runtime-substate-export.json");
    const cliArgs = [
      "runtime-project",
      tempRoot,
    ];
    await appendRuntimeQueryProviderArgs(cliArgs, tempRoot, queryProvider);
    await appendRuntimeActionDispatcherArgs(cliArgs, tempRoot, actionDispatcher);

    if (runtimeState?.pendingAction || hasRuntimeSubstateSnapshotPayload(runtimeState)) {
      await fsp.writeFile(
        restoreSubstatePath,
        JSON.stringify(buildRuntimeSubstateFromSnapshot(runtimeState, options), null, 2),
        "utf8"
      );
      cliArgs.push("--substate", restoreSubstatePath);
    } else if (runtimeState) {
      await fsp.writeFile(statePath, JSON.stringify(runtimeState, null, 2), "utf8");
      cliArgs.push("--state", statePath);
    }

    appendRuntimeSubstateMetadataArgs(cliArgs, options);
    cliArgs.push("--export-substate");
    const result = await runCliCommand(cliArgs, "CLI runtime substate export");
    const substate = parseJsonFileText(result.stdout);
    const substateText = formatRuntimeSubstateText(substate);
    await fsp.writeFile(exportedSubstatePath, substateText, "utf8");
    const validation = await validateRuntimeSubstateFile(tempRoot, exportedSubstatePath, options);
    return buildRuntimeSubstateOperationResult({
      operation: "export",
      substate,
      substateText,
      validation,
    });
  });
}

export async function validateRuntimeSubstateForScriptText(scriptText, workspace, substateInput, sessionId = "", options = {}) {
  const normalized = normalizeRuntimeSubstateInput(substateInput);
  if (!normalized.ok) {
    return buildRuntimeSubstateJsonErrorOperation("validate", normalized.error);
  }

  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot }) => {
    const substatePath = path.join(tempRoot, "inscape.runtime-substate-validate.json");
    await fsp.writeFile(substatePath, normalized.text, "utf8");
    const validation = await validateRuntimeSubstateFile(tempRoot, substatePath, options);
    return buildRuntimeSubstateOperationResult({
      operation: "validate",
      substateSummary: summarizeRuntimeSubstate(normalized.substate),
      validation,
    });
  });
}

export async function importRuntimeSubstateForScriptText(scriptText, workspace, substateInput, sessionId = "", queryProvider = null, actionDispatcher = null, options = {}) {
  const normalized = normalizeRuntimeSubstateInput(substateInput);
  if (!normalized.ok) {
    return buildRuntimeSubstateJsonErrorOperation("import", normalized.error);
  }

  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot }) => {
    const substatePath = path.join(tempRoot, "inscape.runtime-substate-import.json");
    await fsp.writeFile(substatePath, normalized.text, "utf8");
    const validation = await validateRuntimeSubstateFile(tempRoot, substatePath, options);
    const validationStatus = normalizeRuntimeSubstateValidationStatus(validation?.status);
    if (validationStatus !== "compatible") {
      return buildRuntimeSubstateOperationResult({
        imported: false,
        operation: "import",
        substateSummary: summarizeRuntimeSubstate(normalized.substate),
        validation,
      });
    }

    const cliArgs = [
      "runtime-project",
      tempRoot,
      "--substate",
      substatePath,
    ];
    await appendRuntimeQueryProviderArgs(cliArgs, tempRoot, queryProvider);
    await appendRuntimeActionDispatcherArgs(cliArgs, tempRoot, actionDispatcher);
    appendRuntimeSubstateMetadataArgs(cliArgs, options);
    const result = await runCliCommand(cliArgs, "CLI runtime substate import");
    const runtimeSnapshot = rememberRuntimeSessionState(
      compactRuntimeStatePayload(relativizeProjectSourcePaths(JSON.parse(result.stdout), tempRoot), sessionId, queryProvider),
      sessionId
    );
    return buildRuntimeSubstateOperationResult({
      imported: true,
      operation: "import",
      runtimeSnapshot,
      substateSummary: summarizeRuntimeSubstate(normalized.substate),
      validation,
    });
  });
}

async function appendRuntimeQueryProviderArgs(cliArgs, tempRoot, queryProvider) {
  if (!queryProvider || typeof queryProvider !== "object") {
    return;
  }

  const providerPath = path.join(tempRoot, "inscape.runtime-query-provider.json");
  await fsp.writeFile(providerPath, JSON.stringify(queryProvider, null, 2), "utf8");
  cliArgs.push("--query-provider", providerPath);
}

async function appendRuntimeActionDispatcherArgs(cliArgs, tempRoot, actionDispatcher) {
  if (!actionDispatcher || typeof actionDispatcher !== "object") {
    return;
  }

  const dispatcherPath = path.join(tempRoot, "inscape.runtime-action-dispatcher.json");
  await fsp.writeFile(dispatcherPath, JSON.stringify(actionDispatcher, null, 2), "utf8");
  cliArgs.push("--action-dispatcher", dispatcherPath);
}

function normalizeRuntimeActionResume(action) {
  const status = String(action?.status || "completed").trim().toLowerCase();
  return {
    errorCode: String(action?.errorCode || ""),
    errorMessage: String(action?.errorMessage || ""),
    hostPayload: String(action?.hostPayload || ""),
    requestId: String(action?.requestId || ""),
    status: status || "completed",
  };
}

function buildRuntimeSubstateFromSnapshot(runtimeState, options = {}) {
  const state = runtimeState?.state || {};
  const pendingAction = runtimeState?.pendingAction || {};
  const pathStack = Array.isArray(state.path) ? state.path.filter(Boolean) : [];
  const nodeId = String(state.currentNodeName || runtimeState?.currentNode?.name || pendingAction.nodeId || "");
  const branchEvidenceKey = "branch" + "Query" + "Receipts";
  return {
    branchQueryReceipts: Array.isArray(runtimeState?.[branchEvidenceKey]) ? runtimeState[branchEvidenceKey] : [],
    facts: {
      choiceHistory: [],
      seenLineAnchors: [],
      visitedNodes: [],
    },
    flow: {
      entryNodeId: pathStack[0] || nodeId,
      stack: pathStack.length > 0 ? pathStack : (nodeId ? [nodeId] : []),
    },
    format: "inscape.runtime-substate",
    formatVersion: 1,
    host: {
      checkpointId: String(options.hostCheckpointId || runtimeState?.host?.checkpointId || ""),
    },
    pendingAction: {
      arguments: [],
      handlerName: String(pendingAction.handlerName || ""),
      hostPayload: "",
      lineId: String(pendingAction.lineId || ""),
      mode: String(pendingAction.mode || "wait"),
      name: String(pendingAction.name || ""),
      nodeId: String(pendingAction.nodeId || nodeId),
      raw: "",
      requestId: String(pendingAction.requestId || ""),
      sourceColumn: Number(pendingAction.sourceColumn || 0),
      sourceLine: Number(pendingAction.sourceLine || 0),
      status: String(pendingAction.status || "waiting"),
    },
    position: {
      commandIndex: Number(state.visibleStepCount || 0),
      lineId: "",
      nodeId,
    },
    runtimeVersion: "p3-runtime-state-v1",
    scriptVersion: String(options.scriptVersion || ""),
  };
}

function hasRuntimeSubstateSnapshotPayload(runtimeState) {
  const branchEvidenceKey = "branch" + "Query" + "Receipts";
  return Array.isArray(runtimeState?.[branchEvidenceKey]) && runtimeState[branchEvidenceKey].length > 0;
}

function appendRuntimeSubstateMetadataArgs(cliArgs, options = {}) {
  const scriptVersion = String(options.scriptVersion || "");
  const hostCheckpointId = String(options.hostCheckpointId || "");
  if (scriptVersion) {
    cliArgs.push("--script-version", scriptVersion);
  }

  if (hostCheckpointId) {
    cliArgs.push("--host-checkpoint-id", hostCheckpointId);
  }
}

async function validateRuntimeSubstateFile(tempRoot, substatePath, options = {}) {
  const cliArgs = [
    "runtime-project",
    tempRoot,
    "--validate-substate",
    substatePath,
  ];
  appendRuntimeSubstateMetadataArgs(cliArgs, {
    scriptVersion: options.scriptVersion || "",
  });
  const result = await runCliCommand(cliArgs, "CLI runtime substate validate");
  return parseJsonFileText(result.stdout);
}

function normalizeRuntimeSubstateInput(input) {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return {
      ok: true,
      substate: input,
      text: formatRuntimeSubstateText(input),
    };
  }

  const text = String(input || "");
  try {
    const substate = parseJsonFileText(text);
    return {
      ok: true,
      substate,
      text: formatRuntimeSubstateText(substate),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      ok: false,
      substate: null,
      text,
    };
  }
}

function buildRuntimeSubstateJsonErrorOperation(operation, error) {
  return buildRuntimeSubstateOperationResult({
    error: `Runtime substate JSON is invalid: ${String(error || "unknown parse error")}`,
    operation,
    validation: {
      diagnostics: [
        {
          code: "SHE-SUBSTATE-JSON",
          message: "Runtime substate JSON could not be parsed.",
          path: "substate",
          severity: "error",
        },
      ],
      format: "inscape.self-hosted-editor.runtime-substate-validation-error",
      formatVersion: 1,
      status: "error",
    },
  });
}

function buildRuntimeSubstateOperationResult({
  error = "",
  imported = false,
  operation,
  runtimeSnapshot = null,
  substate = null,
  substateSummary = null,
  substateText = "",
  validation = null,
}) {
  const validationStatus = normalizeRuntimeSubstateValidationStatus(validation?.status || (error ? "error" : ""));
  return {
    error: String(error || ""),
    format: "inscape.self-hosted-editor.runtime-substate-operation",
    formatVersion: 1,
    imported: Boolean(imported),
    operation,
    runtimeSnapshot,
    safety: {
      excludes: [
        "host-business-state",
        "complete-runtime-log",
        "complete-action-history",
        "rollback-stack",
        "trace-replay",
      ],
      hostCheckpointOpaque: true,
      notFullHostSave: true,
      restoresPreviewOnly: true,
      silentlyRepairs: false,
    },
    substate: substate || null,
    substateSummary: substateSummary || summarizeRuntimeSubstate(substate),
    substateText: String(substateText || ""),
    validation: compactRuntimeSubstateValidation(validation),
    validationStatus,
  };
}

function compactRuntimeSubstateValidation(validation) {
  if (!validation || typeof validation !== "object") {
    return null;
  }

  return {
    diagnostics: (Array.isArray(validation.diagnostics) ? validation.diagnostics : []).map((diagnostic) => ({
      code: String(diagnostic?.code || ""),
      message: String(diagnostic?.message || ""),
      path: String(diagnostic?.path || ""),
      severity: String(diagnostic?.severity || ""),
    })).slice(0, 12),
    format: String(validation.format || "inscape.runtime-state-validation"),
    formatVersion: Number(validation.formatVersion || 0),
    status: normalizeRuntimeSubstateValidationStatus(validation.status),
    suggestedPosition: {
      commandIndex: Number(validation.suggestedPosition?.commandIndex || 0),
      lineId: String(validation.suggestedPosition?.lineId || ""),
      nodeId: String(validation.suggestedPosition?.nodeId || ""),
    },
  };
}

function summarizeRuntimeSubstate(substate) {
  const branchEvidenceKey = "branch" + "Query" + "Receipts";
  const pendingAction = substate?.pendingAction && typeof substate.pendingAction === "object"
    ? substate.pendingAction
    : null;
  return {
    branchReceiptCount: Array.isArray(substate?.[branchEvidenceKey]) ? substate[branchEvidenceKey].length : 0,
    commandIndex: Number(substate?.position?.commandIndex || 0),
    flowStackDepth: Array.isArray(substate?.flow?.stack) ? substate.flow.stack.length : 0,
    format: String(substate?.format || ""),
    formatVersion: Number(substate?.formatVersion || 0),
    hostCheckpointPresent: Boolean(String(substate?.host?.checkpointId || "")),
    nodeId: String(substate?.position?.nodeId || ""),
    pendingAction: pendingAction
      ? {
        argumentCount: Array.isArray(pendingAction.arguments) ? pendingAction.arguments.length : Number(pendingAction.argumentCount || 0),
        mode: String(pendingAction.mode || ""),
        name: String(pendingAction.name || ""),
        requestIdPresent: Boolean(String(pendingAction.requestId || "")),
        status: String(pendingAction.status || ""),
      }
      : null,
    runtimeVersion: String(substate?.runtimeVersion || ""),
    scriptVersion: String(substate?.scriptVersion || ""),
  };
}

function normalizeRuntimeSubstateValidationStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (["compatible", "migratable", "incompatible", "unavailable", "error"].includes(normalized)) {
    return normalized;
  }

  return normalized || "unknown";
}

function formatRuntimeSubstateText(substate) {
  return JSON.stringify(substate || {}, null, 2);
}

export async function getStoryNodeMapReviewForScriptText(scriptText, workspace) {
  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot }) => {
    const reportPath = path.join(tempRoot, "inscape.node-map-review.json");
    const result = await runCliCommand([
      "update-node-map-project",
      tempRoot,
      "--report",
      reportPath,
    ], "CLI stable node map review");
    const nodeMapPath = String(result.stdout || "").trim().split(/\r?\n/).filter(Boolean).at(-1)
      || path.join(tempRoot, "inscape.node-map.json");
    const nodeMapText = await fsp.readFile(nodeMapPath, "utf8");
    const reportText = await fsp.readFile(reportPath, "utf8");
    return compactStoryNodeMapReviewPayload({
      nodeMap: parseJsonFileText(nodeMapText),
      nodeMapPath,
      nodeMapText,
      report: relativizeStoryNodeMapReviewPaths(parseJsonFileText(reportText), tempRoot),
      tempRoot,
    });
  });
}

export async function getStoryNodeMapCandidateApplyForScriptText(scriptText, workspace, item, candidate, dryRun = false, requestedNodeMapPath = "") {
  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot }) => {
    const nodeMapPath = resolveTemporaryWorkspacePath(tempRoot, requestedNodeMapPath, "inscape.node-map.json");
    const outputPath = dryRun
      ? path.join(path.dirname(nodeMapPath), "inscape.node-map-candidate-preview.json")
      : nodeMapPath;
    const resultPath = path.join(path.dirname(nodeMapPath), dryRun
      ? "inscape.node-map-candidate-preview-result.json"
      : "inscape.node-map-apply-result.json");
    const result = await runCliCommand([
      "apply-node-map-candidate-project",
      tempRoot,
      "--current-id",
      String(item?.stableId || ""),
      "--current-title",
      String(item?.title || ""),
      "--candidate-id",
      String(candidate?.stableId || ""),
      "-o",
      nodeMapPath,
      "--result",
      resultPath,
      ...(dryRun ? ["--dry-run", outputPath] : []),
    ], "CLI stable node map candidate apply");
    const writtenPath = String(result.stdout || "").trim().split(/\r?\n/).filter(Boolean).at(-1) || outputPath;
    const nodeMapText = await fsp.readFile(writtenPath, "utf8");
    const applyResultText = await fsp.readFile(resultPath, "utf8");
    return compactStoryNodeMapApplyPayload({
      candidateStableId: candidate?.stableId || "",
      dryRun,
      itemStableId: item?.stableId || "",
      nodeMap: parseJsonFileText(nodeMapText),
      nodeMapPath: writtenPath,
      nodeMapText,
      result: parseJsonFileText(applyResultText),
      tempRoot,
    });
  });
}

export async function getLocalizationReviewForScriptText(scriptText, workspace, previousCsv, sessionId = "") {
  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot }) => {
    await runCliCommand([
      "update-node-map-project",
      tempRoot,
    ], "CLI stable node map refresh");

    const baseline = await resolveLocalizationBaseline(previousCsv, sessionId, async () =>
      (await runCliCommand([
        "extract-l10n-project",
        tempRoot,
      ], "CLI localization project extract")).stdout
    );
    const previousCsvPath = path.join(tempRoot, "inscape.localization.previous.csv");
    await fsp.writeFile(previousCsvPath, baseline.csv, "utf8");

    const result = await runCliCommand([
      "audit-l10n-alignment-project",
      tempRoot,
      "--from",
      previousCsvPath,
    ], "CLI localization alignment audit");
    const report = relativizeLocalizationReviewPaths(parseJsonFileText(result.stdout), tempRoot);
    return compactLocalizationReviewPayload(report, baseline);
  });
}

export async function getUpdatedLocalizationCsvForScriptText(scriptText, workspace, previousCsv, translationOverrides = [], sessionId = "") {
  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot }) => {
    const baseline = resolveExistingLocalizationBaseline(previousCsv, sessionId);
    if (!baseline.csv.trim()) {
      throw new Error("Localization update requires previousCsv text or an existing localization baseline session.");
    }

    const previousCsvPath = path.join(tempRoot, "inscape.localization.previous.csv");
    const overridesPath = path.join(tempRoot, "inscape.localization.overrides.json");
    await fsp.writeFile(previousCsvPath, baseline.csv, "utf8");
    const cliArgs = [
      "update-l10n-project",
      tempRoot,
      "--from",
      previousCsvPath,
    ];
    if (Array.isArray(translationOverrides) && translationOverrides.length > 0) {
      await fsp.writeFile(overridesPath, JSON.stringify(translationOverrides, null, 2), "utf8");
      cliArgs.push("--translation-overrides", overridesPath);
    }

    const result = await runCliCommand(cliArgs, "CLI localization project update");
    return compactLocalizationUpdatePayload({
      baseline,
      csv: result.stdout,
      translationOverrides,
    });
  });
}

function isMainModule() {
  return Boolean(process.argv[1]) && path.resolve(process.argv[1]) === currentModulePath;
}

if (isMainModule()) {
  const server = createSelfHostedEditorPreviewServer();
  server.listen(port, "127.0.0.1", () => {
    console.log(`Inscape SelfHostedEditor prototype: http://127.0.0.1:${port}/`);
  });
}

export async function refreshLineMapForScriptText(scriptText, workspace, existingLineMap = null, sessionId = "") {
  const sessionLineMap = existingLineMap || getLineMapSessionState(sessionId);
  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot }) => {
    const lineMapPath = path.join(tempRoot, "inscape.line-map.json");
    const reportPath = path.join(tempRoot, "inscape.line-map-refresh.json");
    if (sessionLineMap) {
      await fsp.writeFile(lineMapPath, JSON.stringify(sessionLineMap, null, 2), "utf8");
    }

    await runCliCommand([
      "refresh-l10n-line-map-project",
      tempRoot,
      "-o",
      lineMapPath,
      "--report",
      reportPath,
    ], "CLI localization line map refresh");
    const lineMapText = await fsp.readFile(lineMapPath, "utf8");
    const reportText = await fsp.readFile(reportPath, "utf8");
    return rememberLineMapSessionState({
      format: "inscape.self-hosted-editor.line-map-refresh",
      formatVersion: 1,
      lineMap: parseJsonFileText(lineMapText),
      refresh: parseJsonFileText(reportText),
      sessionId: normalizeLineMapSessionId(sessionId),
    }, sessionId);
  });
}

function parseJsonFileText(text) {
  return JSON.parse(String(text || "").replace(/^\uFEFF/, ""));
}

function filterProjectDiagnostics(payload, activeRelativePath) {
  if (!Array.isArray(payload?.diagnostics)) {
    return payload;
  }

  return {
    ...payload,
    diagnostics: payload.diagnostics.filter((diagnostic) => {
      const sourcePath = diagnostic?.location?.sourcePath || "";
      return !sourcePath || sourcePath === activeRelativePath;
    }),
  };
}

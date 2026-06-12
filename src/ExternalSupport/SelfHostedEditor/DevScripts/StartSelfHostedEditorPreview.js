import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSelfHostedEditorApiHandlers,
} from "./SelfHostedEditorApiHandlerBridge.js";
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
  getLineMapSessionState,
  normalizeLineMapSessionId,
  normalizeRuntimeSessionId,
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
  getStoryGraphForScriptText,
  getStoryNodeMapCandidateApplyForScriptText,
  getStoryNodeMapReviewForScriptText,
  getUpdatedLocalizationCsvForScriptText,
  refreshLineMapForScriptText,
  stepRuntimeStateForScriptText,
}));

export function createSelfHostedEditorPreviewServer(serverPort = port) {
  return http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url || "/", `http://localhost:${serverPort}`);

    if (await routeSelfHostedEditorApiRequest(request, response, requestUrl, apiRoutes)) {
      return;
    }

    await serveSelfHostedEditorStaticAsset(requestUrl, response, {
      moduleRoot,
      repoRoot,
    });
  });
}

async function diagnoseScriptText(scriptText, workspace) {
  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot, activeRelativePath }) => {
    const result = await runLanguageServerProjectDiagnostics(tempRoot);
    const payload = relativizeLanguageServerSemanticPaths(JSON.parse(result.stdout), tempRoot);
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
    const result = await runLanguageServerDocumentSymbols(activeFilePath);
    return relativizeLanguageServerSemanticPaths(JSON.parse(result.stdout), tempRoot);
  });
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

export async function getRuntimeStateForScriptText(scriptText, workspace, sessionId = "") {
  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot }) => {
    const result = await runCliCommand([
      "runtime-project",
      tempRoot,
    ], "CLI runtime project snapshot");
    return rememberRuntimeSessionState(
      compactRuntimeStatePayload(relativizeProjectSourcePaths(JSON.parse(result.stdout), tempRoot), sessionId),
      sessionId
    );
  });
}

export async function stepRuntimeStateForScriptText(scriptText, workspace, runtimeState, action, sessionId = "") {
  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot }) => {
    const statePath = path.join(tempRoot, "inscape.runtime-state.json");
    const cliArgs = [
      "runtime-project",
      tempRoot,
    ];

    if (runtimeState) {
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
    } else {
      throw new Error("Runtime action requires type `continue`, `advance-flow`, `rewind`, `rewind-flow`, or `choose`.");
    }

    const result = await runCliCommand(cliArgs, "CLI runtime project action");
    return rememberRuntimeSessionState(
      compactRuntimeStatePayload(relativizeProjectSourcePaths(JSON.parse(result.stdout), tempRoot), sessionId),
      sessionId
    );
  });
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
      ...(dryRun ? ["--dry-run", outputPath] : []),
    ], "CLI stable node map candidate apply");
    const writtenPath = String(result.stdout || "").trim().split(/\r?\n/).filter(Boolean).at(-1) || outputPath;
    const nodeMapText = await fsp.readFile(writtenPath, "utf8");
    return compactStoryNodeMapApplyPayload({
      candidateStableId: candidate?.stableId || "",
      dryRun,
      itemStableId: item?.stableId || "",
      nodeMap: parseJsonFileText(nodeMapText),
      nodeMapPath: writtenPath,
      nodeMapText,
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
    return {
      baseline: baseline.metadata,
      csv: result.stdout,
      format: "inscape.self-hosted-editor.localization-updated-csv",
      formatVersion: 1,
    };
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

function compactProjectGraphPayload(payload) {
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

function relativizeLocalizationReviewPaths(payload, tempRoot) {
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

function compactRuntimeStatePayload(payload, sessionId = "") {
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

function compactLocalizationReviewPayload(report, baseline = null) {
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

function compactStoryNodeMapReviewPayload({ nodeMap, nodeMapPath, nodeMapText, report, tempRoot }) {
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

function compactStoryNodeMapApplyPayload({ candidateStableId, dryRun, itemStableId, nodeMap, nodeMapPath, nodeMapText, tempRoot }) {
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
      actionStatus: "",
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

function relativizeStoryNodeMapReviewPaths(payload, tempRoot) {
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

function relativizeProjectSourcePaths(payload, tempRoot) {
  const normalizeSource = (source) => {
    if (!source || typeof source.sourcePath !== "string") {
      return source;
    }

    source.sourcePath = relativizeSourcePath(source.sourcePath, tempRoot);
    return source;
  };

  for (const document of Array.isArray(payload?.documents) ? payload.documents : []) {
    if (typeof document.sourcePath === "string") {
      document.sourcePath = relativizeSourcePath(document.sourcePath);
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

function relativizeHostBindingCapabilityPaths(payload, tempRoot) {
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

function relativizeLanguageServerSemanticPaths(payload, tempRoot) {
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

function relativizeSourcePath(sourcePath, tempRoot) {
  const relativePath = path.relative(tempRoot, sourcePath);
  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return sourcePath
      .replace(/\\/g, "/")
      .replace(/^.*?inscape-self-hosted-editor-[^/]+\//, "");
  }

  return relativePath.replace(/\\/g, "/");
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

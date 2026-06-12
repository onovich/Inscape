import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSelfHostedEditorApiHandlers,
} from "./SelfHostedEditorApiHandlerBridge.js";
import {
  compactLocalizationReviewPayload,
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

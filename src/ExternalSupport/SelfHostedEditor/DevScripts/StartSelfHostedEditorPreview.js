import childProcess from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentModulePath = fileURLToPath(import.meta.url);
const moduleRoot = path.resolve(path.dirname(currentModulePath), "..");
const repoRoot = path.resolve(moduleRoot, "..", "..", "..");
const languageServerProjectPath = path.join(
  repoRoot,
  "src",
  "Internal",
  "LanguageServer",
  "Inscape.LanguageServer.csproj"
);
const cliProjectPath = path.join(
  repoRoot,
  "src",
  "Internal",
  "Cli",
  "Inscape.Cli",
  "Inscape.Cli.csproj"
);
const cliBuildRoot = path.join(
  repoRoot,
  "src",
  "Internal",
  "Cli",
  "Inscape.Cli",
  "bin",
  "Debug",
  "net10.0"
);
const cliExecutablePath = path.join(cliBuildRoot, "Inscape.Cli.exe");
const cliAssemblyPath = path.join(cliBuildRoot, "Inscape.Cli.dll");
const languageServerBuildRoot = path.join(
  repoRoot,
  "src",
  "Internal",
  "LanguageServer",
  "bin",
  "Debug",
  "net10.0"
);
const languageServerExecutablePath = path.join(languageServerBuildRoot, "Inscape.LanguageServer.exe");
const languageServerAssemblyPath = path.join(languageServerBuildRoot, "Inscape.LanguageServer.dll");
const port = Number(process.env.PORT || 5178);
const bridgeCommandTimeoutMilliseconds = 30000;

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".inscape", "text/plain; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".ttf", "font/ttf"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

export function createSelfHostedEditorPreviewServer(serverPort = port) {
  return http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url || "/", `http://localhost:${serverPort}`);

    if (request.method === "POST" && requestUrl.pathname === "/api/diagnostics") {
      await handleDiagnosticsRequest(request, response);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/hover") {
      await handleHoverRequest(request, response);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/definition") {
      await handleDefinitionRequest(request, response);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/references") {
      await handleReferencesRequest(request, response);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/completions") {
      await handleCompletionsRequest(request, response);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/document-symbols") {
      await handleDocumentSymbolsRequest(request, response);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/host-schema-capabilities") {
      await handleHostSchemaCapabilitiesRequest(request, response);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/host-binding-capabilities") {
      await handleHostBindingCapabilitiesRequest(request, response);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/story-graph") {
      await handleStoryGraphRequest(request, response);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/runtime-state") {
      await handleRuntimeStateRequest(request, response);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/runtime-action") {
      await handleRuntimeActionRequest(request, response);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/line-map-refresh") {
      await handleLineMapRefreshRequest(request, response);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/node-map-review") {
      await handleNodeMapReviewRequest(request, response);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/node-map-apply") {
      await handleNodeMapApplyRequest(request, response);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/localization-review") {
      await handleLocalizationReviewRequest(request, response);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/localization-update") {
      await handleLocalizationUpdateRequest(request, response);
      return;
    }

    const relativePath = requestUrl.pathname === "/"
      ? "Resources/Workbench/SelfHostedEditorWorkbenchDocument.html"
      : requestUrl.pathname.replace(/^\/+/, "");
    const fileRoot = relativePath.startsWith("samples/")
      ? repoRoot
      : moduleRoot;
    const filePath = path.resolve(fileRoot, relativePath);

    if (!filePath.startsWith(fileRoot)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, body) => {
      if (error) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      response.writeHead(200, {
        "Cache-Control": "no-store, max-age=0",
        "Content-Type": mimeTypes.get(path.extname(filePath)) || "application/octet-stream",
      });
      response.end(body);
    });
  });
}

async function handleDiagnosticsRequest(request, response) {
  try {
    const body = await readRequestBody(request);
    const payload = parseJsonRequestBody(body);
    const scriptText = typeof payload.scriptText === "string"
      ? payload.scriptText
      : "";
    const workspace = normalizeWorkspacePayload(payload.workspace);

    const diagnosticsPayload = await diagnoseScriptText(scriptText, workspace);
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(diagnosticsPayload));
  } catch (error) {
    response.writeHead(500, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}

async function handleHoverRequest(request, response) {
  try {
    const body = await readRequestBody(request);
    const payload = parseJsonRequestBody(body);
    const scriptText = typeof payload.scriptText === "string"
      ? payload.scriptText
      : "";
    const hoverKind = typeof payload.hoverKind === "string"
      ? payload.hoverKind
      : "";
    const hoverName = typeof payload.hoverName === "string"
      ? payload.hoverName
      : "";
    const workspace = normalizeWorkspacePayload(payload.workspace);

    const hoverPayload = await getHoverForScriptText(scriptText, hoverKind, hoverName, workspace);
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(hoverPayload));
  } catch (error) {
    response.writeHead(500, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}

async function handleDefinitionRequest(request, response) {
  try {
    const body = await readRequestBody(request);
    const payload = parseJsonRequestBody(body);
    const scriptText = typeof payload.scriptText === "string"
      ? payload.scriptText
      : "";
    const definitionName = typeof payload.definitionName === "string"
      ? payload.definitionName
      : "";
    const workspace = normalizeWorkspacePayload(payload.workspace);

    const definitionPayload = await getDefinitionForScriptText(scriptText, definitionName, workspace);
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(definitionPayload));
  } catch (error) {
    response.writeHead(500, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}

async function handleReferencesRequest(request, response) {
  try {
    const body = await readRequestBody(request);
    const payload = parseJsonRequestBody(body);
    const scriptText = typeof payload.scriptText === "string"
      ? payload.scriptText
      : "";
    const referenceName = typeof payload.referenceName === "string"
      ? payload.referenceName
      : "";
    const workspace = normalizeWorkspacePayload(payload.workspace);

    const referencesPayload = await getReferencesForScriptText(scriptText, referenceName, workspace);
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(referencesPayload));
  } catch (error) {
    response.writeHead(500, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}

async function handleCompletionsRequest(request, response) {
  try {
    const body = await readRequestBody(request);
    const payload = parseJsonRequestBody(body);
    const scriptText = typeof payload.scriptText === "string"
      ? payload.scriptText
      : "";
    const workspace = normalizeWorkspacePayload(payload.workspace);

    const completionsPayload = await getCompletionsForScriptText(scriptText, workspace);
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(completionsPayload));
  } catch (error) {
    response.writeHead(500, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}

async function handleDocumentSymbolsRequest(request, response) {
  try {
    const body = await readRequestBody(request);
    const payload = parseJsonRequestBody(body);
    const scriptText = typeof payload.scriptText === "string"
      ? payload.scriptText
      : "";
    const workspace = normalizeWorkspacePayload(payload.workspace);

    const documentSymbolsPayload = await getDocumentSymbolsForScriptText(scriptText, workspace);
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(documentSymbolsPayload));
  } catch (error) {
    response.writeHead(500, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}

async function handleHostSchemaCapabilitiesRequest(request, response) {
  try {
    const body = await readRequestBody(request);
    const payload = parseJsonRequestBody(body);
    const scriptText = typeof payload.scriptText === "string"
      ? payload.scriptText
      : "";
    const workspace = normalizeWorkspacePayload(payload.workspace);

    const capabilitiesPayload = await getHostSchemaCapabilitiesForScriptText(scriptText, workspace);
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(capabilitiesPayload));
  } catch (error) {
    response.writeHead(500, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}

async function handleHostBindingCapabilitiesRequest(request, response) {
  try {
    const body = await readRequestBody(request);
    const payload = parseJsonRequestBody(body);
    const scriptText = typeof payload.scriptText === "string"
      ? payload.scriptText
      : "";
    const workspace = normalizeWorkspacePayload(payload.workspace);

    const capabilitiesPayload = await getHostBindingCapabilitiesForScriptText(scriptText, workspace);
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(capabilitiesPayload));
  } catch (error) {
    response.writeHead(500, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}

async function handleStoryGraphRequest(request, response) {
  try {
    const body = await readRequestBody(request);
    const payload = parseJsonRequestBody(body);
    const scriptText = typeof payload.scriptText === "string"
      ? payload.scriptText
      : "";
    const workspace = normalizeWorkspacePayload(payload.workspace);

    const graphPayload = await getStoryGraphForScriptText(scriptText, workspace);
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(graphPayload));
  } catch (error) {
    response.writeHead(500, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}

async function handleRuntimeStateRequest(request, response) {
  try {
    const body = await readRequestBody(request);
    const payload = parseJsonRequestBody(body);
    const scriptText = typeof payload.scriptText === "string"
      ? payload.scriptText
      : "";
    const workspace = normalizeWorkspacePayload(payload.workspace);

    const runtimePayload = await getRuntimeStateForScriptText(scriptText, workspace);
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(runtimePayload));
  } catch (error) {
    response.writeHead(500, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}

async function handleRuntimeActionRequest(request, response) {
  try {
    const body = await readRequestBody(request);
    const payload = parseJsonRequestBody(body);
    const scriptText = typeof payload.scriptText === "string"
      ? payload.scriptText
      : "";
    const workspace = normalizeWorkspacePayload(payload.workspace);
    const runtimeState = payload.runtimeState && typeof payload.runtimeState === "object"
      ? payload.runtimeState
      : null;
    const action = payload.action && typeof payload.action === "object"
      ? payload.action
      : {};

    const runtimePayload = await stepRuntimeStateForScriptText(scriptText, workspace, runtimeState, action);
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(runtimePayload));
  } catch (error) {
    response.writeHead(500, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}

async function handleLineMapRefreshRequest(request, response) {
  try {
    const body = await readRequestBody(request);
    const payload = parseJsonRequestBody(body);
    const scriptText = typeof payload.scriptText === "string"
      ? payload.scriptText
      : "";
    const workspace = normalizeWorkspacePayload(payload.workspace);
    const existingLineMap = payload.existingLineMap && typeof payload.existingLineMap === "object"
      ? payload.existingLineMap
      : null;

    const lineMapPayload = await refreshLineMapForScriptText(scriptText, workspace, existingLineMap);
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(lineMapPayload));
  } catch (error) {
    response.writeHead(500, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}

async function handleNodeMapReviewRequest(request, response) {
  try {
    const body = await readRequestBody(request);
    const payload = parseJsonRequestBody(body);
    const scriptText = typeof payload.scriptText === "string"
      ? payload.scriptText
      : "";
    const workspace = normalizeWorkspacePayload(payload.workspace);

    const reviewPayload = await getStoryNodeMapReviewForScriptText(scriptText, workspace);
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(reviewPayload));
  } catch (error) {
    response.writeHead(500, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}

async function handleNodeMapApplyRequest(request, response) {
  try {
    const body = await readRequestBody(request);
    const payload = parseJsonRequestBody(body);
    const scriptText = typeof payload.scriptText === "string"
      ? payload.scriptText
      : "";
    const workspace = normalizeWorkspacePayload(payload.workspace);
    const item = payload.item && typeof payload.item === "object" ? payload.item : {};
    const candidate = payload.candidate && typeof payload.candidate === "object" ? payload.candidate : {};
    const nodeMapPath = typeof payload.nodeMapPath === "string" ? payload.nodeMapPath : "";
    const applyPayload = await getStoryNodeMapCandidateApplyForScriptText(
      scriptText,
      workspace,
      item,
      candidate,
      Boolean(payload.dryRun),
      nodeMapPath
    );
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(applyPayload));
  } catch (error) {
    response.writeHead(500, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}

async function handleLocalizationReviewRequest(request, response) {
  try {
    const body = await readRequestBody(request);
    const payload = parseJsonRequestBody(body);
    const scriptText = typeof payload.scriptText === "string"
      ? payload.scriptText
      : "";
    const workspace = normalizeWorkspacePayload(payload.workspace);
    const previousCsv = typeof payload.previousCsv === "string"
      ? payload.previousCsv
      : "";

    const reviewPayload = await getLocalizationReviewForScriptText(scriptText, workspace, previousCsv);
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(reviewPayload));
  } catch (error) {
    response.writeHead(500, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}

async function handleLocalizationUpdateRequest(request, response) {
  try {
    const body = await readRequestBody(request);
    const payload = parseJsonRequestBody(body);
    const scriptText = typeof payload.scriptText === "string"
      ? payload.scriptText
      : "";
    const workspace = normalizeWorkspacePayload(payload.workspace);
    const previousCsv = typeof payload.previousCsv === "string"
      ? payload.previousCsv
      : "";
    const translationOverrides = Array.isArray(payload.translationOverrides)
      ? payload.translationOverrides
      : [];

    const updatePayload = await getUpdatedLocalizationCsvForScriptText(
      scriptText,
      workspace,
      previousCsv,
      translationOverrides
    );
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(updatePayload));
  } catch (error) {
    response.writeHead(500, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });
    request.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    request.on("error", reject);
  });
}

function parseJsonRequestBody(body) {
  return JSON.parse(String(body || "{}").replace(/^\uFEFF/, ""));
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

export async function getRuntimeStateForScriptText(scriptText, workspace) {
  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot }) => {
    const result = await runCliCommand([
      "runtime-project",
      tempRoot,
    ], "CLI runtime project snapshot");
    return compactRuntimeStatePayload(relativizeProjectSourcePaths(JSON.parse(result.stdout), tempRoot));
  });
}

export async function stepRuntimeStateForScriptText(scriptText, workspace, runtimeState, action) {
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
    return compactRuntimeStatePayload(relativizeProjectSourcePaths(JSON.parse(result.stdout), tempRoot));
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
    const nodeMapPath = path.join(tempRoot, sanitizeRelativePath(requestedNodeMapPath) || "inscape.node-map.json");
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

export async function getLocalizationReviewForScriptText(scriptText, workspace, previousCsv) {
  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot }) => {
    await runCliCommand([
      "update-node-map-project",
      tempRoot,
    ], "CLI stable node map refresh");

    const previousCsvText = previousCsv.trim()
      ? previousCsv
      : (await runCliCommand([
        "extract-l10n-project",
        tempRoot,
      ], "CLI localization project extract")).stdout;
    const previousCsvPath = path.join(tempRoot, "inscape.localization.previous.csv");
    await fsp.writeFile(previousCsvPath, previousCsvText, "utf8");

    const result = await runCliCommand([
      "audit-l10n-alignment-project",
      tempRoot,
      "--from",
      previousCsvPath,
    ], "CLI localization alignment audit");
    const report = relativizeLocalizationReviewPaths(parseJsonFileText(result.stdout), tempRoot);
    return compactLocalizationReviewPayload(report);
  });
}

export async function getUpdatedLocalizationCsvForScriptText(scriptText, workspace, previousCsv, translationOverrides = []) {
  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot }) => {
    if (!String(previousCsv || "").trim()) {
      throw new Error("Localization update requires previousCsv text.");
    }

    const previousCsvPath = path.join(tempRoot, "inscape.localization.previous.csv");
    const overridesPath = path.join(tempRoot, "inscape.localization.overrides.json");
    await fsp.writeFile(previousCsvPath, previousCsv, "utf8");
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

function compactRuntimeStatePayload(payload) {
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
    state: {
      currentNodeName: payload?.state?.currentNodeName || "",
      path: Array.isArray(payload?.state?.path) ? payload.state.path : [],
      visibleStepCount: Number(payload?.state?.visibleStepCount || 0),
    },
  };
}

function compactLocalizationReviewPayload(report) {
  return {
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

async function refreshLineMapForScriptText(scriptText, workspace, existingLineMap = null) {
  return withTemporaryWorkspace(workspace, scriptText, async ({ tempRoot }) => {
    const lineMapPath = path.join(tempRoot, "inscape.line-map.json");
    const reportPath = path.join(tempRoot, "inscape.line-map-refresh.json");
    if (existingLineMap) {
      await fsp.writeFile(lineMapPath, JSON.stringify(existingLineMap, null, 2), "utf8");
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
    return {
      lineMap: parseJsonFileText(lineMapText),
      refresh: parseJsonFileText(reportText),
    };
  });
}

function parseJsonFileText(text) {
  return JSON.parse(String(text || "").replace(/^\uFEFF/, ""));
}

function normalizeWorkspacePayload(workspace) {
  if (!workspace || !Array.isArray(workspace.documents)) {
    return null;
  }

  const documents = workspace.documents
    .filter((document) => typeof document?.relativePath === "string" && typeof document?.text === "string")
    .map((document) => ({
      relativePath: sanitizeRelativePath(document.relativePath),
      text: document.text,
    }))
    .filter((document) => document.relativePath);

  if (documents.length === 0) {
    return null;
  }

  return {
    currentFilePath: sanitizeRelativePath(workspace.currentFilePath || documents[0].relativePath) || documents[0].relativePath,
    documents,
  };
}

async function withTemporaryWorkspace(workspace, fallbackScriptText, callback) {
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "inscape-self-hosted-editor-"));
  const normalizedWorkspace = workspace || {
    currentFilePath: "draft.inscape",
    documents: [{
      relativePath: "draft.inscape",
      text: fallbackScriptText,
    }],
  };

  try {
    for (const document of normalizedWorkspace.documents) {
      const fullPath = path.join(tempRoot, document.relativePath);
      await fsp.mkdir(path.dirname(fullPath), {
        recursive: true,
      });
      await fsp.writeFile(fullPath, document.text, "utf8");
    }

    const activeRelativePath = normalizedWorkspace.currentFilePath || normalizedWorkspace.documents[0].relativePath;
    const activeFilePath = path.join(tempRoot, activeRelativePath);
    return await callback({
      tempRoot,
      activeFilePath,
      activeRelativePath,
    });
  } finally {
    await fsp.rm(tempRoot, {
      force: true,
      recursive: true,
    });
  }
}

function sanitizeRelativePath(relativePath) {
  const normalized = String(relativePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.split("/").includes("..")) {
    return "";
  }

  return normalized;
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

function runLanguageServerProjectDiagnostics(rootPath) {
  return runLanguageServerCommand([
    "--diagnose-project",
    rootPath,
  ], "LanguageServer project diagnostics");
}

function runLanguageServerDiagnostics(tempPath) {
  return new Promise((resolve, reject) => {
    const invocation = resolveLanguageServerInvocation([
      "--diagnose-file",
      tempPath,
    ]);
    const diagnosticsProcess = childProcess.spawn(invocation.command, invocation.args, {
      cwd: repoRoot,
      windowsHide: true,
    });

    const stdoutChunks = [];
    const stderrChunks = [];

    diagnosticsProcess.stdout.on("data", (chunk) => {
      stdoutChunks.push(Buffer.from(chunk));
    });

    diagnosticsProcess.stderr.on("data", (chunk) => {
      stderrChunks.push(Buffer.from(chunk));
    });

    diagnosticsProcess.on("error", reject);
    diagnosticsProcess.on("exit", (code) => {
      const stdout = decodeProcessOutput(stdoutChunks);
      const stderr = decodeProcessOutput(stderrChunks);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `LanguageServer exited with code ${code}.`));
        return;
      }

      resolve({
        stderr,
        stdout,
      });
    });
  });
}

function runLanguageServerHover(tempPath, hoverKind, hoverName) {
  return runLanguageServerCommand([
    "--hover-file",
    tempPath,
    hoverKind,
    hoverName,
  ], "LanguageServer hover");
}

function runLanguageServerDefinition(tempPath, definitionName) {
  return runLanguageServerCommand([
    "--definition-file",
    tempPath,
    definitionName,
  ], "LanguageServer definition");
}

function runLanguageServerReferences(tempPath, referenceName) {
  return runLanguageServerCommand([
    "--references-file",
    tempPath,
    referenceName,
  ], "LanguageServer references");
}

function runLanguageServerCompletions(tempPath) {
  return runLanguageServerCommand([
    "--completion-file",
    tempPath,
  ], "LanguageServer completions");
}

function runLanguageServerDocumentSymbols(tempPath) {
  return runLanguageServerCommand([
    "--document-symbols-file",
    tempPath,
  ], "LanguageServer document symbols");
}

function runLanguageServerProjectHover(rootPath, hoverKind, hoverName) {
  return runLanguageServerCommand([
    "--hover-project",
    rootPath,
    hoverKind,
    hoverName,
  ], "LanguageServer project hover");
}

function runLanguageServerProjectDefinition(rootPath, definitionName) {
  return runLanguageServerCommand([
    "--definition-project",
    rootPath,
    definitionName,
  ], "LanguageServer project definition");
}

function runLanguageServerProjectReferences(rootPath, referenceName) {
  return runLanguageServerCommand([
    "--references-project",
    rootPath,
    referenceName,
  ], "LanguageServer project references");
}

function runLanguageServerProjectCompletions(rootPath) {
  return runLanguageServerCommand([
    "--completion-project",
    rootPath,
  ], "LanguageServer project completions");
}

function runLanguageServerHostSchemaCapabilities(rootPath) {
  return runLanguageServerCommand([
    "--host-schema-capabilities-project",
    rootPath,
  ], "LanguageServer host schema capabilities");
}

function runLanguageServerHostBindingCapabilities(rootPath) {
  return runLanguageServerCommand([
    "--host-binding-capabilities-project",
    rootPath,
  ], "LanguageServer host binding capabilities");
}

function runLanguageServerCommand(languageServerArgs, label) {
  return new Promise((resolve, reject) => {
    const invocation = resolveLanguageServerInvocation(languageServerArgs);
    let settled = false;
    const process = childProcess.spawn(invocation.command, invocation.args, {
      cwd: repoRoot,
      windowsHide: true,
    });
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      process.kill();
      reject(new Error(`${label} timed out after ${bridgeCommandTimeoutMilliseconds}ms.`));
    }, bridgeCommandTimeoutMilliseconds);

    const stdoutChunks = [];
    const stderrChunks = [];

    process.stdout.on("data", (chunk) => {
      stdoutChunks.push(Buffer.from(chunk));
    });

    process.stderr.on("data", (chunk) => {
      stderrChunks.push(Buffer.from(chunk));
    });

    process.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    process.on("exit", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      const stdout = decodeProcessOutput(stdoutChunks);
      const stderr = decodeProcessOutput(stderrChunks);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `${label} exited with code ${code}.`));
        return;
      }

      resolve({
        stderr,
        stdout,
      });
    });
  });
}

function runCliCommand(cliArgs, label) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const invocation = resolveCliInvocation(cliArgs);
    const process = childProcess.spawn(invocation.command, invocation.args, {
      cwd: repoRoot,
      windowsHide: true,
    });
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      process.kill();
      reject(new Error(`${label} timed out after ${bridgeCommandTimeoutMilliseconds}ms.`));
    }, bridgeCommandTimeoutMilliseconds);

    const stdoutChunks = [];
    const stderrChunks = [];

    process.stdout.on("data", (chunk) => {
      stdoutChunks.push(Buffer.from(chunk));
    });

    process.stderr.on("data", (chunk) => {
      stderrChunks.push(Buffer.from(chunk));
    });

    process.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    process.on("exit", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      const stdout = decodeProcessOutput(stdoutChunks);
      const stderr = decodeProcessOutput(stderrChunks);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `${label} exited with code ${code}.`));
        return;
      }

      resolve({
        stderr,
        stdout,
      });
    });
  });
}

function decodeProcessOutput(chunks) {
  return Buffer.concat(chunks).toString("utf8");
}

function resolveCliInvocation(cliArgs) {
  if (fs.existsSync(cliExecutablePath)) {
    return {
      command: cliExecutablePath,
      args: cliArgs,
    };
  }

  if (fs.existsSync(cliAssemblyPath)) {
    return {
      command: "dotnet",
      args: ["exec", cliAssemblyPath, ...cliArgs],
    };
  }

  return {
    command: "dotnet",
    args: ["run", "--project", cliProjectPath, "--no-restore", "--", ...cliArgs],
  };
}

function resolveLanguageServerInvocation(languageServerArgs) {
  if (fs.existsSync(languageServerExecutablePath)) {
    return {
      command: languageServerExecutablePath,
      args: languageServerArgs,
    };
  }

  if (fs.existsSync(languageServerAssemblyPath)) {
    return {
      command: "dotnet",
      args: ["exec", languageServerAssemblyPath, ...languageServerArgs],
    };
  }

  return {
    command: "dotnet",
    args: ["run", "--project", languageServerProjectPath, "--", ...languageServerArgs],
  };
}

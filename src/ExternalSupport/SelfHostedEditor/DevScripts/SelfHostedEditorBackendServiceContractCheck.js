import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createEditorBackendServices,
  listEditorBackendServiceKeys,
  ProjectSessionService,
} from "../Scripts/Backend/Clients/EditorBackendServiceRegistry.js";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const calls = [];
const backendClient = {
  sessionId: "service-session",
  projectSession: {
    async status(payload) {
      calls.push({ method: "projectSession.status", payload });
      return { mode: "dev-host", sessionId: "service-session" };
    },
  },
  diagnostics: {
    async sessionStatus(payload) {
      calls.push({ method: "diagnostics.sessionStatus", payload });
      return { mode: "dev-host", sessionId: "service-session" };
    },
  },
  languageSession: {
    async completions(payload) {
      calls.push({ method: "languageSession.completions", payload });
      return { completions: [] };
    },
    async definition(payload) {
      calls.push({ method: "languageSession.definition", payload });
      return { definition: null };
    },
    async diagnose(payload) {
      calls.push({ method: "languageSession.diagnose", payload });
      return { diagnostics: [] };
    },
    async documentSymbols(payload) {
      calls.push({ method: "languageSession.documentSymbols", payload });
      return { symbols: [] };
    },
    async hover(payload) {
      calls.push({ method: "languageSession.hover", payload });
      return { hover: null };
    },
    async references(payload) {
      calls.push({ method: "languageSession.references", payload });
      return { references: [] };
    },
  },
  hostCapabilities: {
    async bindingCapabilities(payload) {
      calls.push({ method: "hostCapabilities.bindingCapabilities", payload });
      return { speakers: [], bindings: [] };
    },
    async schemaCapabilities(payload) {
      calls.push({ method: "hostCapabilities.schemaCapabilities", payload });
      return { capabilities: [] };
    },
  },
  storyGraph: {
    async compileProjectGraph(payload) {
      calls.push({ method: "storyGraph.compileProjectGraph", payload });
      return { graph: null };
    },
  },
  runtimeSession: {
    async startOrObserve(payload) {
      calls.push({ method: "runtimeSession.startOrObserve", payload });
      return { currentNode: null };
    },
    async step(payload) {
      calls.push({ method: "runtimeSession.step", payload });
      return { currentNode: null };
    },
  },
  lineIdentitySession: {
    async refresh(payload) {
      calls.push({ method: "lineIdentitySession.refresh", payload });
      return { lineMap: null };
    },
  },
  localizationSession: {
    async review(payload) {
      calls.push({ method: "localizationSession.review", payload });
      return { rows: [] };
    },
    async updateCsv(payload) {
      calls.push({ method: "localizationSession.updateCsv", payload });
      return { csv: "" };
    },
  },
  stableNodeMap: {
    async applyCandidate(payload) {
      calls.push({ method: "stableNodeMap.applyCandidate", payload });
      return { changes: [] };
    },
    async review(payload) {
      calls.push({ method: "stableNodeMap.review", payload });
      return { items: [] };
    },
  },
};

const services = createEditorBackendServices({ backendClient });
assertEqual(Object.isFrozen(services), true, "backend service registry is frozen");
assertEqual(Object.keys(services).join(","), listEditorBackendServiceKeys().join(","), "backend service keys");
assertEqual("backendClient" in services, false, "service registry must not expose backendClient");
assertEqual("invoke" in services, false, "service registry must not expose invoke");
assertEqual("request" in services, false, "service registry must not expose request");

assertSurface(services.projectSessionService, ["sessionId", "status"], "project session service");
assertSurface(services.documentBufferStore, [
  "sessionId",
  "buildBuffer",
  "buildSummary",
  "buildWorkspaceBoundary",
  "buildSaveStatus",
  "buildRecoveryStatus",
  "buildSettingsSummary",
], "document buffer store");
assertSurface(services.languageSessionClient, [
  "sessionId",
  "completions",
  "definition",
  "diagnose",
  "documentSymbols",
  "hover",
  "references",
], "language session client");
assertSurface(services.hostCapabilityClient, [
  "sessionId",
  "bindingCapabilities",
  "schemaCapabilities",
], "host capability client");
assertSurface(services.storyGraphClient, ["sessionId", "compileProjectGraph"], "story graph client");
assertSurface(services.runtimeSessionClient, ["sessionId", "startOrObserve", "step"], "runtime session client");
assertSurface(services.lineIdentityClient, ["sessionId", "refresh"], "line identity client");
assertSurface(services.localizationWorkflowClient, ["sessionId", "review", "updateCsv"], "localization workflow client");
assertSurface(services.stableNodeMapClient, ["sessionId", "applyCandidate", "review"], "stable node-map client");
assertSurface(services.diagnosticsService, ["sessionId", "sessionStatus"], "diagnostics service");

await services.projectSessionService.status({ workspace: { currentFilePath: "story/opening.inscape" } });
await services.languageSessionClient.diagnose({ scriptText: "# Opening" });
await services.runtimeSessionClient.step({ action: "continue" });
await services.localizationWorkflowClient.review({ scriptText: "# Opening" });
await services.stableNodeMapClient.applyCandidate({ dryRun: true });
assertEqual(calls.map((call) => call.method).join(","), [
  "projectSession.status",
  "languageSession.diagnose",
  "runtimeSession.step",
  "localizationSession.review",
  "stableNodeMap.applyCandidate",
].join(","), "service delegation order");

const documentBuffer = services.documentBufferStore.buildBuffer({
  dirty: true,
  relativePath: "story/opening.inscape",
  revision: 4,
  text: "# Opening",
});
assertEqual(documentBuffer.relativePath, "story/opening.inscape", "document buffer relative path");
assertEqual(documentBuffer.text, "# Opening", "document buffer owns text");
const documentSummary = services.documentBufferStore.buildSummary(documentBuffer);
assertEqual("text" in documentSummary, false, "document buffer summary must not expose text");
const workspaceBoundary = services.documentBufferStore.buildWorkspaceBoundary({
  relativePath: "assets/portrait.png",
  writeIntent: "create",
});
assertEqual(workspaceBoundary.allowed, true, "document buffer boundary allows assets writes");

let missingCapabilityFailed = false;
try {
  new ProjectSessionService({ sessionId: "broken", projectSession: {} });
} catch (error) {
  missingCapabilityFailed = true;
  assertIncludesText(error instanceof Error ? error.message : String(error), "status");
}
assertEqual(missingCapabilityFailed, true, "missing narrow capability is rejected");

assertBridgeSourceDoesNotUseBackendClient("Scripts/EditorAuthoring/Bridges/SelfHostedEditorStoryNodeMapBridge.js");
assertBridgeSourceDoesNotUseBackendClient("Scripts/HostBinding/Bridges/SelfHostedEditorHostBindingBridge.js");
assertBridgeSourceDoesNotUseBackendClient("Scripts/HostSchema/Bridges/SelfHostedEditorHostSchemaBridge.js");
assertBridgeSourceDoesNotUseBackendClient("Scripts/LanguageServer/Bridges/SelfHostedEditorCompletionBridge.js");
assertBridgeSourceDoesNotUseBackendClient("Scripts/LanguageServer/Bridges/SelfHostedEditorDefinitionBridge.js");
assertBridgeSourceDoesNotUseBackendClient("Scripts/LanguageServer/Bridges/SelfHostedEditorDiagnosticsBridge.js");
assertBridgeSourceDoesNotUseBackendClient("Scripts/LanguageServer/Bridges/SelfHostedEditorDocumentSymbolBridge.js");
assertBridgeSourceDoesNotUseBackendClient("Scripts/LanguageServer/Bridges/SelfHostedEditorHoverBridge.js");
assertBridgeSourceDoesNotUseBackendClient("Scripts/LanguageServer/Bridges/SelfHostedEditorLineMapBridge.js");
assertBridgeSourceDoesNotUseBackendClient("Scripts/LanguageServer/Bridges/SelfHostedEditorReferencesBridge.js");
assertBridgeSourceDoesNotUseBackendClient("Scripts/LanguageServer/Bridges/SelfHostedEditorStoryGraphBridge.js");
assertBridgeSourceDoesNotUseBackendClient("Scripts/Localization/Bridges/SelfHostedEditorLocalizationReviewBridge.js");
assertBridgeSourceDoesNotUseBackendClient("Scripts/Runtime/Bridges/SelfHostedEditorRuntimeBridge.js");

const bootstrapperText = readModuleText("Scripts/Entries/SelfHostedEditorFeatureBootstrapper.js");
assertIncludesText(bootstrapperText, "createEditorBackendServices", "feature bootstrapper creates narrow backend services");
assertIncludesText(bootstrapperText, "projectSessionService", "feature bootstrapper exposes project session service");
assertEqual(bootstrapperText.includes("new EditorBackendClient"), false, "feature bootstrapper must not new EditorBackendClient");
assertEqual(bootstrapperText.includes("backendClient"), false, "feature bootstrapper must not pass backendClient to feature bridges");

const renderControllerText = readModuleText("Scripts/Entries/SelfHostedEditorWorkbenchRenderController.js");
assertIncludesText(renderControllerText, "projectSessionService", "render controller uses project session service");
assertEqual(renderControllerText.includes("backendClient"), false, "render controller must not hold backendClient");

console.log("SelfHostedEditor backend service contract ok");

function assertSurface(target, expectedMethods, label) {
  assertEqual(target.sessionId, "service-session", `${label} session id`);
  for (const method of expectedMethods) {
    if (method === "sessionId") {
      continue;
    }

    assertEqual(typeof target[method], "function", `${label} exposes ${method}`);
  }

  assertEqual(typeof target.invoke, "undefined", `${label} must not expose invoke`);
  assertEqual(typeof target.request, "undefined", `${label} must not expose request`);
  assertEqual(typeof target.postJson, "undefined", `${label} must not expose HTTP helper`);
}

function assertBridgeSourceDoesNotUseBackendClient(relativePath) {
  const text = readModuleText(relativePath);
  if (text.includes("EditorBackendClient") || text.includes("backendClient")) {
    throw new Error(`${relativePath} must depend on a narrow backend service, not EditorBackendClient.`);
  }
}

function readModuleText(relativePath) {
  return fs.readFileSync(path.join(moduleRoot, relativePath), "utf8");
}

function assertIncludesText(text, expected, label = "text") {
  if (!text.includes(expected)) {
    throw new Error(`${label}: expected to include ${expected}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

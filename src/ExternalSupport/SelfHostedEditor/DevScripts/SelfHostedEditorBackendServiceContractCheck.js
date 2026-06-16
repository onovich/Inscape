import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createEditorBackendServices,
  listEditorBackendServiceKeys,
  ProjectSessionService,
} from "../Scripts/Backend/Clients/EditorBackendServiceRegistry.js";
import { EditorBackendWorkspaceSnapshotFormat } from "../Scripts/Backend/Models/EditorBackendWorkspaceSnapshotModel.js";
import { SelfHostedEditorCompletionBridge } from "../Scripts/LanguageServer/Bridges/SelfHostedEditorCompletionBridge.js";
import { SelfHostedEditorDefinitionBridge } from "../Scripts/LanguageServer/Bridges/SelfHostedEditorDefinitionBridge.js";
import { SelfHostedEditorDiagnosticsBridge } from "../Scripts/LanguageServer/Bridges/SelfHostedEditorDiagnosticsBridge.js";
import { SelfHostedEditorDocumentSymbolBridge } from "../Scripts/LanguageServer/Bridges/SelfHostedEditorDocumentSymbolBridge.js";
import { SelfHostedEditorHoverBridge } from "../Scripts/LanguageServer/Bridges/SelfHostedEditorHoverBridge.js";
import { SelfHostedEditorReferencesBridge } from "../Scripts/LanguageServer/Bridges/SelfHostedEditorReferencesBridge.js";
import { SelfHostedEditorStoryGraphBridge } from "../Scripts/LanguageServer/Bridges/SelfHostedEditorStoryGraphBridge.js";
import { SelfHostedEditorRuntimeBridge } from "../Scripts/Runtime/Bridges/SelfHostedEditorRuntimeBridge.js";

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
  "buildStore",
  "listDocuments",
  "getDocument",
  "readDocument",
  "updateDocument",
  "updateDraft",
  "setActiveDocument",
  "saveDocument",
  "saveDocumentToStore",
  "saveAll",
  "saveAllToStore",
  "buildAutosavePlan",
  "buildFlushPlan",
  "buildRecoverySnapshotPlan",
  "buildBackupPlan",
  "buildWorkspaceSnapshot",
  "buildActiveDocumentRequest",
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
const documentStore = services.documentBufferStore.buildStore({
  activeRelativePath: "story/opening.inscape",
  documents: [
    documentBuffer,
    {
      relativePath: "story/branch.inscape",
      revision: 2,
      text: "# Branch",
    },
  ],
  workspaceName: "story",
});
assertEqual(documentStore.sessionId, "service-session", "document buffer store session id");
assertEqual(documentStore.documentCount, 2, "document buffer store document count");
assertEqual(documentStore.activeRelativePath, "story/opening.inscape", "document buffer store active document");
const documentList = services.documentBufferStore.listDocuments(documentStore);
assertEqual(documentList.documentCount, 2, "document buffer list count");
assertEqual(documentList.payloadContentExposed, false, "document buffer list hides text payloads");
assertEqual(JSON.stringify(documentList).includes("# Opening"), false, "document buffer list must not expose opening text");
assertEqual(JSON.stringify(documentList).includes("# Branch"), false, "document buffer list must not expose branch text");
const documentGetResult = services.documentBufferStore.getDocument(documentStore, {
  relativePath: "story/opening.inscape",
});
assertEqual(documentGetResult.ok, true, "document buffer get result ok");
assertEqual(documentGetResult.document.text, "# Opening", "document buffer get returns document text");
const documentUpdateResult = services.documentBufferStore.updateDocument(documentStore, {
  baseRevision: documentBuffer.revision,
  relativePath: "story/opening.inscape",
  text: "# Opening\nNarrator: Updated",
});
assertEqual(documentUpdateResult.ok, true, "document buffer update result ok");
assertEqual(documentUpdateResult.document.revision > documentBuffer.revision, true, "document buffer update increments revision");
assertEqual(documentUpdateResult.document.dirty, true, "document buffer update marks dirty");
assertEqual(documentUpdateResult.store.revision >= documentUpdateResult.document.revision, true, "document buffer store revision tracks update");
const staleDocumentUpdateResult = services.documentBufferStore.updateDocument(documentUpdateResult.store, {
  baseRevision: documentBuffer.revision,
  relativePath: "story/opening.inscape",
  text: "# Opening\nNarrator: Stale overwrite",
});
assertEqual(staleDocumentUpdateResult.ok, false, "document buffer stale update rejected");
assertEqual(staleDocumentUpdateResult.reason, "stale-document-revision", "document buffer stale update reason");
assertEqual(staleDocumentUpdateResult.currentRevision, documentUpdateResult.document.revision, "document buffer stale update current revision");
assertEqual(JSON.stringify(staleDocumentUpdateResult).includes("Stale overwrite"), false, "document buffer stale rejection must not echo stale text");
const activeDocumentResult = services.documentBufferStore.setActiveDocument(documentUpdateResult.store, {
  relativePath: "story/branch.inscape",
});
assertEqual(activeDocumentResult.ok, true, "document buffer active document result ok");
assertEqual(activeDocumentResult.store.activeRelativePath, "story/branch.inscape", "document buffer active document switches");
assertEqual(activeDocumentResult.document.active, true, "document buffer active document is marked active");
const saveDocumentResult = services.documentBufferStore.saveDocumentToStore(documentUpdateResult.store, {
  baseRevision: documentUpdateResult.document.revision,
  relativePath: "story/opening.inscape",
  workspaceRoot: "C:/Case Files/Court Loop",
});
assertEqual(saveDocumentResult.ok, true, "document buffer save document result ok");
assertEqual(saveDocumentResult.saveStatus.state, "saved", "document buffer save document status");
assertEqual(saveDocumentResult.document.dirty, false, "document buffer save document summary clean");
assertEqual(saveDocumentResult.document.lastSavedRevision, documentUpdateResult.document.revision, "document buffer save document saved revision");
assertEqual(saveDocumentResult.payloadContentExposed, false, "document buffer save document hides payload content");
assertEqual(JSON.stringify(saveDocumentResult).includes("# Opening\nNarrator: Updated"), false, "document buffer save document must not expose text");
const saveAllResult = services.documentBufferStore.saveAllToStore(documentUpdateResult.store, {
  workspaceRoot: "C:/Case Files/Court Loop",
});
assertEqual(saveAllResult.ok, true, "document buffer save all result ok");
assertEqual(saveAllResult.savedCount, 1, "document buffer save all saves dirty documents");
assertEqual(saveAllResult.storeSummary.documents.find((document) => document.relativePath === "story/opening.inscape")?.dirty, false, "document buffer save all summary clean");
assertEqual(saveAllResult.storeSummary.documents.find((document) => document.relativePath === "story/opening.inscape")?.lastSavedRevision, documentUpdateResult.document.revision, "document buffer save all saved revision");
assertEqual(JSON.stringify(saveAllResult).includes("# Opening\nNarrator: Updated"), false, "document buffer save all must not expose text");
const asyncSaveResult = await services.documentBufferStore.saveDocument({
  baseRevision: documentUpdateResult.document.revision,
  relativePath: "story/opening.inscape",
  store: documentUpdateResult.store,
  workspaceRoot: "C:/Case Files/Court Loop",
});
assertEqual(asyncSaveResult.ok, true, "document buffer async save document result ok");
assertEqual(JSON.stringify(asyncSaveResult).includes("# Opening\nNarrator: Updated"), false, "document buffer async save must not expose text");
const autosavePlan = services.documentBufferStore.buildAutosavePlan(documentUpdateResult.store, {
  debounceMs: 1500,
  idleElapsedMs: 2000,
  pendingWrites: [
    {
      relativePath: "story/opening.inscape",
      revision: documentBuffer.revision,
    },
  ],
});
assertEqual(autosavePlan.ready, true, "document buffer autosave plan ready");
assertEqual(autosavePlan.saveRequests[0].baseRevision, documentUpdateResult.document.revision, "document buffer autosave plan latest revision");
assertEqual(autosavePlan.skippedWrites[0].reason, "stale-autosave-revision", "document buffer autosave plan stale pending write");
assertEqual(JSON.stringify(autosavePlan).includes("# Opening\nNarrator: Updated"), false, "document buffer autosave plan must not expose text");
const flushPlan = services.documentBufferStore.buildFlushPlan(documentUpdateResult.store, {
  trigger: "app-exit",
  workspaceRoot: "C:/Case Files/Court Loop",
});
assertEqual(flushPlan.trigger, "app-exit", "document buffer flush plan trigger");
assertEqual(flushPlan.continuationBlocked, true, "document buffer flush plan blocks continuation");
assertEqual(flushPlan.flushRequests[0].baseRevision, documentUpdateResult.document.revision, "document buffer flush plan latest revision");
assertEqual(flushPlan.uiVisibility.state, "flush-required", "document buffer flush plan UI state");
assertEqual(JSON.stringify(flushPlan).includes("# Opening\nNarrator: Updated"), false, "document buffer flush plan must not expose text");
const failedFlushPlan = services.documentBufferStore.buildFlushPlan(documentUpdateResult.store, {
  saveResults: [
    {
      currentRevision: documentUpdateResult.document.revision,
      ok: false,
      reason: "disk-conflict",
      relativePath: "story/opening.inscape",
      saveStatus: {
        lastError: {
          code: "disk-conflict",
          message: "# Opening\nNarrator: Updated",
        },
        relativePath: "story/opening.inscape",
        revision: documentUpdateResult.document.revision,
      },
    },
  ],
  trigger: "close-window",
  workspaceRoot: "C:/Case Files/Court Loop",
});
assertEqual(failedFlushPlan.failedCount, 1, "document buffer flush plan failed count");
assertEqual(failedFlushPlan.uiVisibility.state, "save-error-visible", "document buffer flush plan failure visible");
assertEqual(JSON.stringify(failedFlushPlan).includes("# Opening\nNarrator: Updated"), false, "document buffer flush plan failure must not expose text");
const recoverySnapshotPlan = services.documentBufferStore.buildRecoverySnapshotPlan(documentUpdateResult.store, {
  diskModifiedUtcByPath: {
    "story/opening.inscape": "2026-06-16T00:59:00.000Z",
  },
  snapshotModifiedUtc: "2026-06-16T01:00:00.000Z",
  workspaceRoot: "C:/Case Files/Court Loop",
});
assertEqual(recoverySnapshotPlan.snapshotWriteCount, 1, "document buffer recovery snapshot write count");
assertEqual(recoverySnapshotPlan.snapshotWrites[0].text, "# Opening\nNarrator: Updated", "document buffer recovery snapshot carries text");
assertEqual(recoverySnapshotPlan.snapshotWrites[0].writeTarget.targetKind, "recovery-snapshot", "document buffer recovery snapshot target");
assertEqual(JSON.stringify(recoverySnapshotPlan.recoveryStatus).includes("# Opening\nNarrator: Updated"), false, "document buffer recovery status must not expose text");
const recoveryCleanupPlan = services.documentBufferStore.buildRecoverySnapshotPlan(saveDocumentResult.storeSummary, {
  saveResults: [
    saveDocumentResult,
  ],
  workspaceRoot: "C:/Case Files/Court Loop",
});
assertEqual(recoveryCleanupPlan.snapshotWriteCount, 0, "document buffer recovery cleanup no write");
assertEqual(recoveryCleanupPlan.cleanupRequests.length, 1, "document buffer recovery cleanup request count");
assertEqual(recoveryCleanupPlan.payloadContentExposed, false, "document buffer recovery cleanup text-free");
assertEqual(JSON.stringify(recoveryCleanupPlan).includes("# Opening\nNarrator: Updated"), false, "document buffer recovery cleanup must not expose text");
const backupPlan = services.documentBufferStore.buildBackupPlan({
  nowUtc: "2026-06-17T01:02:03.000Z",
  retentionDays: 7,
  retentionLimit: 2,
  writeRequests: [
    {
      relativePath: "localization/zh-cn.csv",
    },
    {
      relativePath: "story/opening.inscape",
    },
  ],
  workspaceRoot: "C:/Case Files/Court Loop",
});
assertEqual(backupPlan.backupRequests.length, 1, "document buffer backup plan request count");
assertEqual(backupPlan.backupRequests[0].sourceTargetKind, "localization-csv", "document buffer backup plan source target");
assertEqual(backupPlan.backupRequests[0].backupTargetKind, "backup-artifact", "document buffer backup plan backup target");
assertEqual(backupPlan.skippedWrites[0].reason, "backup-target-not-supported", "document buffer backup plan skips unsupported source");
assertEqual(backupPlan.payloadContentExposed, false, "document buffer backup plan text-free");
assertEqual(JSON.stringify(backupPlan).includes("# Opening\nNarrator: Updated"), false, "document buffer backup plan must not expose text");
const workspaceSnapshot = services.documentBufferStore.buildWorkspaceSnapshot(activeDocumentResult.store);
assertEqual(workspaceSnapshot.source, "backend-buffer-store", "workspace snapshot source");
assertEqual(workspaceSnapshot.currentFilePath, "story/branch.inscape", "workspace snapshot active path");
assertEqual(workspaceSnapshot.documentCount, 2, "workspace snapshot document count");
assertEqual(workspaceSnapshot.payloadContentExposed, true, "workspace snapshot exposes request payload content");
assertEqual(workspaceSnapshot.documents[1].text, "# Branch", "workspace snapshot includes buffer text for backend requests");
const activeDocumentRequest = services.documentBufferStore.buildActiveDocumentRequest(workspaceSnapshot);
assertEqual(activeDocumentRequest.activeRelativePath, "story/branch.inscape", "active document request path");
assertEqual(activeDocumentRequest.scriptText, "# Branch", "active document request script text");
assertEqual(activeDocumentRequest.workspace.source, "backend-buffer-store", "active document request workspace source");
const authoringCalls = [];
const authoringLanguageClient = {
  async completions(payload) {
    authoringCalls.push({ method: "completions", payload });
    return { completions: [] };
  },
  async definition(payload) {
    authoringCalls.push({ method: "definition", payload });
    return { definition: null };
  },
  async diagnose(payload) {
    authoringCalls.push({ method: "diagnose", payload });
    return { diagnostics: [] };
  },
  async documentSymbols(payload) {
    authoringCalls.push({ method: "documentSymbols", payload });
    return { symbols: [] };
  },
  async hover(payload) {
    authoringCalls.push({ method: "hover", payload });
    return { hover: null };
  },
  async references(payload) {
    authoringCalls.push({ method: "references", payload });
    return { references: [] };
  },
};
const authoringSnapshot = services.documentBufferStore.buildWorkspaceSnapshot(documentUpdateResult.store, {
  activeRelativePath: "story/opening.inscape",
});
const legacyWorkspaceContext = {
  currentFilePath: "story/legacy.inscape",
  documents: [
    {
      relativePath: "story/legacy.inscape",
      text: "legacy workspace text",
    },
  ],
  revision: 1,
};
const authoringBridges = [
  new SelfHostedEditorCompletionBridge({ languageSessionClient: authoringLanguageClient }),
  new SelfHostedEditorDefinitionBridge({ languageSessionClient: authoringLanguageClient }),
  new SelfHostedEditorDiagnosticsBridge({ languageSessionClient: authoringLanguageClient }),
  new SelfHostedEditorDocumentSymbolBridge({ languageSessionClient: authoringLanguageClient }),
  new SelfHostedEditorHoverBridge({ languageSessionClient: authoringLanguageClient }),
  new SelfHostedEditorReferencesBridge({ languageSessionClient: authoringLanguageClient }),
];
for (const bridge of authoringBridges) {
  bridge.setWorkspaceContextProvider(() => legacyWorkspaceContext);
  bridge.setWorkspaceSnapshotProvider(() => authoringSnapshot);
}
await authoringBridges[0].getCompletions("legacy script text");
await authoringBridges[1].getDefinition("legacy script text", { name: "Opening" });
await authoringBridges[2].getDiagnostics("legacy script text");
await authoringBridges[3].getDocumentSymbols("legacy script text");
await authoringBridges[4].getHover("legacy script text", { kind: "node", name: "Opening" });
await authoringBridges[5].getReferences("legacy script text", { name: "Opening" });
assertEqual(authoringCalls.length, 6, "authoring bridge call count");
for (const call of authoringCalls) {
  assertEqual(call.payload.workspace.format, EditorBackendWorkspaceSnapshotFormat, `authoring ${call.method} uses workspace snapshot`);
  assertEqual(call.payload.workspace.source, "backend-buffer-store", `authoring ${call.method} snapshot source`);
  assertEqual(call.payload.activeRelativePath, "story/opening.inscape", `authoring ${call.method} active path`);
  assertEqual(call.payload.documentRevision, documentUpdateResult.document.revision, `authoring ${call.method} document revision`);
  assertEqual(call.payload.scriptText, "# Opening\nNarrator: Updated", `authoring ${call.method} active buffer text`);
  assertEqual(JSON.stringify(call.payload).includes("legacy workspace text"), false, `authoring ${call.method} ignores legacy workspace text when snapshot exists`);
}
assertEqual(authoringCalls.find((call) => call.method === "definition")?.payload.definitionName, "Opening", "authoring definition query preserved");
assertEqual(authoringCalls.find((call) => call.method === "hover")?.payload.hoverKind, "node", "authoring hover kind preserved");
assertEqual(authoringCalls.find((call) => call.method === "references")?.payload.referenceName, "Opening", "authoring references query preserved");
const previewRuntimeCalls = [];
const previewStoryGraphBridge = new SelfHostedEditorStoryGraphBridge({
  storyGraphClient: {
    async compileProjectGraph(payload) {
      previewRuntimeCalls.push({ method: "storyGraph.compileProjectGraph", payload });
      return {
        documents: [
          {
            edges: [],
            nodes: [],
            sourcePath: payload.activeRelativePath,
          },
        ],
        entryNodeName: "",
      };
    },
  },
});
const runtimeBridge = new SelfHostedEditorRuntimeBridge({
  runtimeSessionClient: {
    sessionId: "runtime-buffer-session",
    async startOrObserve(payload) {
      previewRuntimeCalls.push({ method: "runtimeSession.startOrObserve", payload });
      return { currentNode: null };
    },
    async step(payload) {
      previewRuntimeCalls.push({ method: "runtimeSession.step", payload });
      return { currentNode: null };
    },
  },
});
for (const bridge of [previewStoryGraphBridge, runtimeBridge]) {
  bridge.setWorkspaceContextProvider(() => legacyWorkspaceContext);
  bridge.setWorkspaceSnapshotProvider(() => authoringSnapshot);
}
await previewStoryGraphBridge.getStoryGraph("legacy script text");
await runtimeBridge.getRuntimeSnapshot("legacy script text");
await runtimeBridge.stepRuntimeSnapshot("legacy script text", { state: { currentNodeName: "Opening" } }, {
  groupIndex: 0,
  optionIndex: 0,
  type: "choose",
});
assertEqual(previewRuntimeCalls.length, 3, "preview/runtime bridge call count");
for (const call of previewRuntimeCalls) {
  assertEqual(call.payload.workspace.format, EditorBackendWorkspaceSnapshotFormat, `preview/runtime ${call.method} uses workspace snapshot`);
  assertEqual(call.payload.workspace.source, "backend-buffer-store", `preview/runtime ${call.method} snapshot source`);
  assertEqual(call.payload.activeRelativePath, "story/opening.inscape", `preview/runtime ${call.method} active path`);
  assertEqual(call.payload.documentRevision, documentUpdateResult.document.revision, `preview/runtime ${call.method} document revision`);
  assertEqual(call.payload.scriptText, "# Opening\nNarrator: Updated", `preview/runtime ${call.method} active buffer text`);
  assertEqual(JSON.stringify(call.payload).includes("legacy workspace text"), false, `preview/runtime ${call.method} ignores legacy workspace text when snapshot exists`);
}
assertEqual(
  previewRuntimeCalls.find((call) => call.method === "runtimeSession.startOrObserve")?.payload.sessionId,
  "runtime-buffer-session",
  "runtime snapshot request preserves session id"
);
assertEqual(
  previewRuntimeCalls.find((call) => call.method === "runtimeSession.step")?.payload.action?.type,
  "choose",
  "runtime action request preserves action"
);
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

import { SelfHostedEditorWorkbenchRenderController } from "../../Scripts/Entries/SelfHostedEditorWorkbenchRenderController.js";
import {
  ScriptDocumentFallbackPolicy,
  ScriptDocumentFallbackReason,
} from "../../Scripts/ProjectWorkspace/Models/ScriptDocumentFallbackPolicy.js";
import { DocumentOutlineController } from "../../Scripts/ProjectWorkspace/Controllers/DocumentOutlineController.js";
import { ProjectWorkspaceSessionController } from "../../Scripts/ProjectWorkspace/Controllers/ProjectWorkspaceSessionController.js";
import { ProjectWorkspaceSummaryController } from "../../Scripts/ProjectWorkspace/Controllers/ProjectWorkspaceSummaryController.js";
import {
  ProjectWorkspaceRecoveryActionRequestFormat,
  ProjectWorkspaceSessionStatusFormat,
  ProjectWorkspaceSessionStatusModelBuilder,
} from "../../Scripts/ProjectWorkspace/Models/ProjectWorkspaceSessionStatusModelBuilder.js";
import { PreviewPanelController } from "../../Scripts/Preview/Controllers/PreviewPanelController.js";
import { assertEqual, assertIncludesText, assertNotIncludesText, FakeElement, getTextContent, installFakeDomEnvironment } from "./SelfHostedEditorModelContractHarness.js";

installFakeDomEnvironment();

const scriptText = `# Opening
@entry
Narrator: Hello.
? Choose action
- Question witness -> Witness

# Witness
Witness: I saw it.`;
const workspace = {
  currentFilePath: "samples/court-loop.inscape",
  documents: [
    {
      relativePath: "samples/court-loop.inscape",
      text: scriptText,
    },
  ],
  revision: 5,
};
const compilerGraph = {
  nodes: [
    {
      choices: [
        {
          options: [
            {
              source: {
                line: 5,
                sourcePath: "samples/court-loop.inscape",
              },
              target: "Witness",
              text: "Question witness",
            },
          ],
          prompt: "Choose action",
          source: {
            line: 4,
            sourcePath: "samples/court-loop.inscape",
          },
        },
      ],
      isInActiveDocument: true,
      lines: [
        {
          kind: "Dialogue",
          source: {
            line: 3,
            sourcePath: "samples/court-loop.inscape",
          },
          speaker: "Narrator",
          text: "Hello.",
        },
      ],
      previewChoices: [
        {
          options: [
            {
              sourceLine: 5,
              target: "Witness",
              text: "Question witness",
            },
          ],
          prompt: "Choose action",
          sourceLine: 4,
        },
      ],
      previewLines: [
        {
          kind: "dialogue",
          sourceLine: 3,
          speaker: "Narrator",
          text: "Hello.",
        },
      ],
      sourceLine: 1,
      title: "Opening",
    },
    {
      choices: [],
      isInActiveDocument: true,
      lines: [
        {
          kind: "Dialogue",
          source: {
            line: 8,
            sourcePath: "samples/court-loop.inscape",
          },
          speaker: "Witness",
          text: "I saw it.",
        },
      ],
      previewChoices: [],
      previewLines: [
        {
          kind: "dialogue",
          sourceLine: 8,
          speaker: "Witness",
          text: "I saw it.",
        },
      ],
      sourceLine: 7,
      title: "Witness",
    },
  ],
  provider: "compiler-project",
};
const runtimeSnapshot = {
  branchQueryReceipts: [
    {
      arguments: [
        {
          kind: "string",
          value: "silver_key",
        },
      ],
      branchPath: "choices[0].options[0].condition",
      choiceGroupIndex: 0,
      choiceOptionIndex: 0,
      conditionalJumpIndex: -1,
      context: "choice-condition",
      deterministic: true,
      id: "branch-evidence-1",
      name: "has_item",
      nodeId: "Opening",
      result: {
        kind: "bool",
        value: "true",
      },
      sourceColumn: 3,
      sourceKind: "mock",
      sourceLine: 5,
      syntax: "call",
    },
  ],
  currentNode: {
    choices: compilerGraph.nodes[0].choices,
    defaultNext: "",
    lines: compilerGraph.nodes[0].lines,
    name: "Opening",
    source: {
      line: 1,
      sourcePath: "samples/court-loop.inscape",
    },
  },
  state: {
    currentNodeName: "Opening",
    path: ["Opening"],
    visibleStepCount: 1,
  },
  logEntries: [
    {
      lineId: "line:3",
      nodeId: "Opening",
      sequence: 1,
      speaker: "Narrator",
      text: "Hello.",
    },
  ],
  debugSnapshotText: "secret runtime snapshot text",
};

const summaryPanel = new FakeElement("section");
const outlinePanel = new FakeElement("section");
const previewElement = new FakeElement("main");
const workspaceSummaryController = new ProjectWorkspaceSummaryController(summaryPanel);
const documentOutlineController = new DocumentOutlineController(outlinePanel);
const previewController = new PreviewPanelController(previewElement);
let renderedStoryGraphProvider = "";
let renderedWorkspaceSession = null;
let renderedDiagnosticsProvider = "";
let localizationRenderedText = "";
let renderedMockQueryCatalog = null;
let renderedMockQueryRuntimeProvider = "";
let renderedMockQueryWorkspaceRevision = null;
let renderedActionCatalog = null;
let renderedActionBridgeCatalog = null;
let renderedActionRuntimeProvider = "";
let renderedRuntimeLogBacklog = null;
let renderedRuntimeBranchEvidence = null;
let renderedRuntimeStatusSurface = null;
let runtimeActionBridgeInput = null;
const documentModel = ScriptDocumentFallbackPolicy.buildDocumentModel(scriptText, {
  reason: ScriptDocumentFallbackReason.EditorAuthoringSurface,
});

const workbench = new SelfHostedEditorWorkbenchRenderController({
  projectSessionService: {
    sessionId: "integration-session",
    async status() {
      return {
        format: "inscape.self-hosted-editor.project-session",
        formatVersion: 1,
        languageSession: {
          fallbackEndpoints: ["completions", "definition", "references", "hover"],
          fallbackKind: "process-per-request",
          kind: "stdio-spike",
          supportedEndpoints: ["diagnostics", "document-symbols"],
        },
        lineIdentitySession: {
          entryCount: 0,
          kind: "bounded-cache",
        },
        localizationSession: {
          entryCount: 0,
          kind: "bounded-cache",
        },
        mode: "dev-host",
        recoveryStatus: {
          items: [
            {
              contentHash: "recovery-hash",
              diskModifiedUtc: "2026-06-16T00:59:00.000Z",
              relativePath: "samples/court-loop.inscape",
              revision: 6,
              snapshotModifiedUtc: "2026-06-16T01:00:00.000Z",
              text: "secret recovery panel text",
            },
          ],
          state: "available",
        },
        runtimeSession: {
          entryCount: 1,
          kind: "bounded-cache",
        },
        sessionId: "integration-session",
        workspace: {
          activeRelativePath: "samples/court-loop.inscape",
          debugCsv: "secret csv payload",
          documentCount: 1,
          documents: [
            {
              relativePath: "samples/court-loop.inscape",
              text: "secret session document text",
            },
          ],
          revision: 5,
          source: "request-snapshot",
        },
      };
    },
  },
  diagnosticsBridge: {
    async getDiagnostics() {
      return {
        diagnostics: [],
        provider: "language-server",
      };
    },
  },
  diagnosticsController: {
    render(snapshot) {
      renderedDiagnosticsProvider = snapshot.provider;
    },
    setActiveLine() {},
  },
  documentOutlineController,
  documentSymbolBridge: {
    async getDocumentSymbols() {
      return {
        error: "LanguageServer document symbols contract violation: symbol 0 is missing location.",
        provider: "language-server-error",
        symbols: [],
      };
    },
  },
  editorController: {
    renderAuthoringState() {
      return documentModel;
    },
    renderDiagnostics() {},
  },
  editorStatusController: {
    renderDiagnosticSnapshot() {},
    setActiveLine() {},
  },
  hostCapabilityCatalogController: {
    async render() {
      return {
        hostBindingCatalog: {
          actions: [],
          hostBridge: {
            loaded: true,
          },
        },
        hostSchemaCatalog: {
          actions: [],
          hostSchema: {
            loaded: true,
          },
          queries: [
            {
              name: "has_item",
              returnType: "bool",
            },
          ],
        },
      };
    },
  },
  layoutController: {
    getState() {
      return {
        activeView: "editor",
        layoutMode: "write-preview",
      };
    },
  },
  lineMapBridge: {
    async refreshLineMap() {
      return {
        lineMap: null,
      };
    },
  },
  loadingController: {
    setIdle() {},
    setManyIdle() {},
    setManyLoading() {},
  },
  localizationController: {
    getSummarySnapshot() {
      return {
        provider: "localization-review",
        rows: [],
      };
    },
    async render(text) {
      localizationRenderedText = text;
    },
  },
  localizationDraftStore: {
    countDraftsForRows() {
      return 0;
    },
  },
  actionPanelController: {
    render(hostSchemaCatalog, hostBindingCatalog, options) {
      renderedActionCatalog = hostSchemaCatalog;
      renderedActionBridgeCatalog = hostBindingCatalog;
      renderedActionRuntimeProvider = options.runtimeSnapshot?.provider || "";
    },
  },
  mockQueryPanelController: {
    render(hostSchemaCatalog, options) {
      renderedMockQueryCatalog = hostSchemaCatalog;
      renderedMockQueryRuntimeProvider = options.runtimeSnapshot?.provider || "";
      renderedMockQueryWorkspaceRevision = options.workspaceRevision;
    },
  },
  previewController,
  runtimeBridge: {
    sessionId: "runtime-status-session",
    setActionBridgeInput(actionBridgeInput) {
      runtimeActionBridgeInput = actionBridgeInput;
    },
    async getRuntimeSnapshot() {
      return {
        provider: "runtime-project",
        snapshot: runtimeSnapshot,
      };
    },
  },
  runtimeStatusPanelController: {
    render(statusModel) {
      renderedRuntimeStatusSurface = statusModel;
    },
  },
  runtimeLogBacklogPanelController: {
    render(backlogModel) {
      renderedRuntimeLogBacklog = backlogModel;
    },
  },
  runtimeBranchEvidencePanelController: {
    render(evidenceModel) {
      renderedRuntimeBranchEvidence = evidenceModel;
    },
  },
  storyGraphBridge: {
    async getStoryGraph() {
      return {
        graph: compilerGraph,
      };
    },
  },
  storyGraphController: {
    render(graph) {
      renderedStoryGraphProvider = graph.provider;
    },
  },
  workspaceController: {
    getState() {
      return {
        activeView: "editor",
        dirty: false,
        filePath: "samples/court-loop.inscape",
        layoutMode: "write-preview",
        revision: 5,
        sourceState: "sample",
        workspaceName: "sample-workspace",
      };
    },
    getWorkspaceContext() {
      return workspace;
    },
  },
  workspaceFileListController: {
    render() {},
  },
  workspaceSessionController: {
    render(sessionState) {
      renderedWorkspaceSession = sessionState;
    },
  },
  workspaceSummaryController,
});

await workbench.renderWorkbench(scriptText, 1);

assertEqual(localizationRenderedText, scriptText, "workbench should render localization from current sample text");
assertEqual(renderedDiagnosticsProvider, "language-server", "workbench should render hosted diagnostics");
assertEqual(previewElement.dataset.previewProvider, "runtime", "workbench preview should use runtime provider when available");
assertIncludesText(getTextContent(previewElement), "Runtime preview");
assertEqual(renderedStoryGraphProvider, "compiler-project", "workbench graph should use compiler project provider");
assertEqual(renderedMockQueryCatalog?.hostSchema?.loaded, true, "workbench should pass host schema catalog to mock query panel");
assertEqual(renderedMockQueryCatalog?.queries?.[0]?.name, "has_item", "workbench should pass query catalog to mock query panel");
assertEqual(renderedMockQueryRuntimeProvider, "runtime-project", "workbench should pass runtime snapshot to mock query panel");
assertEqual(renderedMockQueryWorkspaceRevision, 5, "workbench should pass workspace revision to mock query panel");
assertEqual(renderedActionCatalog?.hostSchema?.loaded, true, "workbench should pass host schema catalog to action panel");
assertEqual(renderedActionBridgeCatalog?.hostBridge?.loaded, true, "workbench should pass host bridge catalog to action panel");
assertEqual(renderedActionRuntimeProvider, "runtime-project", "workbench should pass runtime snapshot to action panel");
assertEqual(renderedRuntimeStatusSurface?.provider, "runtime-project", "workbench should pass runtime snapshot to status panel");
assertEqual(renderedRuntimeStatusSurface?.currentNodeName, "Opening", "workbench runtime status current node");
assertEqual(renderedRuntimeStatusSurface?.visibleChoiceCount, 1, "workbench runtime status visible choice count");
assertEqual(renderedRuntimeStatusSurface?.readingProgress.visibleStepCount, 1, "workbench runtime status visible step count");
assertEqual(renderedRuntimeStatusSurface?.queryProvider.source, "internal", "workbench runtime status query provider source");
assertEqual(renderedRuntimeStatusSurface?.sessionId, "runtime-status-session", "workbench runtime status session id");
assertEqual(renderedRuntimeStatusSurface?.workspaceRevision, 5, "workbench runtime status workspace revision");
assertEqual(renderedRuntimeLogBacklog?.provider, "runtime-project", "workbench should pass runtime snapshot to log panel");
assertEqual(renderedRuntimeLogBacklog?.entryCount, 1, "workbench runtime log entry count");
assertEqual(renderedRuntimeLogBacklog?.entries?.[0]?.text, "Hello.", "workbench runtime log text");
assertEqual(renderedRuntimeLogBacklog?.entries?.[0]?.source?.lineNumber, 3, "workbench runtime log source line");
assertEqual(renderedRuntimeLogBacklog?.writesToFormalRuntimeState, false, "workbench runtime log stays out of formal state");
assertEqual(renderedRuntimeBranchEvidence?.provider, "runtime-project", "workbench should pass runtime snapshot to branch evidence panel");
assertEqual(renderedRuntimeBranchEvidence?.entryCount, 1, "workbench runtime branch evidence entry count");
assertEqual(renderedRuntimeBranchEvidence?.entries?.[0]?.queryName, "has_item", "workbench runtime branch evidence query name");
assertEqual(renderedRuntimeBranchEvidence?.entries?.[0]?.contextLabel, "choice condition", "workbench runtime branch evidence context");
assertEqual(renderedRuntimeBranchEvidence?.entries?.[0]?.source?.lineNumber, 5, "workbench runtime branch evidence source line");
assertEqual(renderedRuntimeBranchEvidence?.requeriesHost, false, "workbench branch evidence does not re-query host");
assertEqual(renderedRuntimeBranchEvidence?.implementsReplayTimeline, false, "workbench branch evidence does not implement replay timeline");
assertNotIncludesText(JSON.stringify(renderedRuntimeBranchEvidence), "secret runtime snapshot text");
assertEqual(runtimeActionBridgeInput?.actions?.length, 0, "workbench should set runtime action bridge input");
assertIncludesText(getTextContent(summaryPanel), "shared summary");
assertIncludesText(getTextContent(summaryPanel), "0 l10n");
assertIncludesText(summaryPanel.children.at(-1)?.title || "", "graph: compiler-project");
assertIncludesText(summaryPanel.children.at(-1)?.title || "", "localization: localization-review");
assertIncludesText(summaryPanel.children.at(-1)?.title || "", "runtime: runtime-project");
assertIncludesText(getTextContent(outlinePanel), "LanguageServer outline error");
assertNotIncludesText(getTextContent(outlinePanel), "Draft outline");
assertEqual(renderedWorkspaceSession?.backendModeLabel, "dev-host", "workbench session should show dev-host mode");
assertEqual(renderedWorkspaceSession?.backendSessionLabel, "integration-session", "workbench session should show backend session id");
assertEqual(renderedWorkspaceSession?.runtimeLabel, "Opening", "workbench session should show runtime current node");
assertEqual(renderedWorkspaceSession?.format, ProjectWorkspaceSessionStatusFormat, "workbench session should use panel status format");
assertEqual(renderedWorkspaceSession?.payloadContentExposed, false, "workbench session should mark payload content as hidden");
assertEqual(renderedWorkspaceSession?.workspaceRevisionLabel, "5", "workbench session should show workspace revision");
assertEqual(renderedWorkspaceSession?.languageLabel, "stdio-spike", "workbench session should show language session mode");
assertEqual(renderedWorkspaceSession?.runtimeSessionLabel, "bounded-cache (1)", "workbench session should show runtime cache state");
assertEqual(renderedWorkspaceSession?.lineIdentityLabel, "bounded-cache (0)", "workbench session should show line identity cache state");
assertEqual(renderedWorkspaceSession?.localizationLabel, "bounded-cache (0)", "workbench session should show localization cache state");
assertEqual(renderedWorkspaceSession?.recoveryLabel, "1 available", "workbench session should show recovery availability");
assertEqual(renderedWorkspaceSession?.recoveryFileLabel, "court-loop.inscape", "workbench session should list recoverable files");
assertEqual(renderedWorkspaceSession?.recoveryItems[0].availableActions.join(","), "restore,discard,later", "workbench recovery item actions");
assertNotIncludesText(JSON.stringify(renderedWorkspaceSession), "secret session document text");
assertNotIncludesText(JSON.stringify(renderedWorkspaceSession), "secret csv payload");
assertNotIncludesText(JSON.stringify(renderedWorkspaceSession), "secret runtime snapshot text");
assertNotIncludesText(JSON.stringify(renderedWorkspaceSession), "secret recovery panel text");

const sessionPanel = new FakeElement("section");
const runtimePanel = new FakeElement("section");
new ProjectWorkspaceSessionController(sessionPanel, runtimePanel).render(renderedWorkspaceSession);
assertIncludesText(getTextContent(sessionPanel), "Revision");
assertIncludesText(getTextContent(sessionPanel), "5");
assertIncludesText(getTextContent(sessionPanel), "Recovery");
assertIncludesText(getTextContent(sessionPanel), "court-loop.inscape");
assertIncludesText(getTextContent(runtimePanel), "Language");
assertIncludesText(getTextContent(runtimePanel), "Runtime Store");
assertIncludesText(getTextContent(runtimePanel), "Line IDs");
assertIncludesText(getTextContent(runtimePanel), "L10N");

const embeddedPanelStatus = ProjectWorkspaceSessionStatusModelBuilder.build({
  diagnosticsSnapshot: {
    provider: "language-server",
  },
  layoutState: {
    layoutLabel: "Split",
    viewLabel: "Editor",
  },
  projectSession: {
    languageSession: {
      kind: "process-per-request",
    },
    lineIdentitySession: {
      entryCount: 2,
      kind: "bounded-cache",
    },
    localizationSession: {
      entryCount: 1,
      kind: "bounded-cache",
    },
    mode: "embedded-desktop",
    recoveryStatus: {
      items: [
        {
          actionState: "later",
          contentHash: "embedded-recovery-hash",
          diskModifiedUtc: "2026-06-16T00:59:00.000Z",
          relativePath: "story/opening.inscape",
          revision: 9,
          snapshotModifiedUtc: "2026-06-16T01:00:00.000Z",
          text: "secret embedded recovery text",
        },
      ],
      state: "available",
    },
    runtimeSession: {
      kind: "not-started",
    },
    sessionId: "embedded-session",
    workspace: {
      activeRelativePath: "story/opening.inscape",
      documentCount: 2,
      documents: [
        {
          relativePath: "story/opening.inscape",
          text: "secret embedded document text",
        },
      ],
      revision: 8,
      source: "backend-buffer-store",
      workspaceName: "Court Case",
    },
  },
  runtimeSnapshot: {
    provider: "unavailable",
    snapshot: {
      state: {
        currentNodeName: "secret runtime node",
      },
      text: "secret runtime snapshot body",
    },
  },
  workspaceState: {
    fileName: "opening.inscape",
    filePath: "story/opening.inscape",
    isDirty: true,
    sourceLabel: "Loaded script",
    workspaceFileCount: 2,
    workspaceName: "Court Case",
  },
});
assertEqual(embeddedPanelStatus.backendModeLabel, "embedded-desktop", "embedded panel status should show embedded desktop mode");
assertEqual(embeddedPanelStatus.backendSessionLabel, "embedded-session", "embedded panel status should show session id");
assertEqual(embeddedPanelStatus.workspaceName, "Court Case", "embedded panel status should show workspace name");
assertEqual(embeddedPanelStatus.workspaceFileCount, 2, "embedded panel status should show workspace document count");
assertEqual(embeddedPanelStatus.workspaceRevisionLabel, "8", "embedded panel status should show workspace revision");
assertEqual(embeddedPanelStatus.languageLabel, "process-per-request", "embedded panel status should show language mode");
assertEqual(embeddedPanelStatus.runtimeSessionLabel, "not-started", "embedded panel status should show runtime session state");
assertEqual(embeddedPanelStatus.lineIdentityLabel, "bounded-cache (2)", "embedded panel status should show line identity state");
assertEqual(embeddedPanelStatus.localizationLabel, "bounded-cache (1)", "embedded panel status should show localization state");
assertEqual(embeddedPanelStatus.recoveryLabel, "1 available", "embedded panel status should show recovery state");
assertEqual(embeddedPanelStatus.recoveryItems[0].relativePath, "story/opening.inscape", "embedded panel status should keep recovery path");
assertEqual(embeddedPanelStatus.recoveryItems[0].actionState, "later", "embedded panel status should preserve later action state");
assertEqual(embeddedPanelStatus.recoveryItems[0].availableActions.join(","), "restore,discard,later", "embedded panel recovery later item keeps actions");
assertEqual(embeddedPanelStatus.payloadContentExposed, false, "embedded panel status should mark payload content as hidden");
assertNotIncludesText(JSON.stringify(embeddedPanelStatus), "secret embedded document text");
assertNotIncludesText(JSON.stringify(embeddedPanelStatus), "secret runtime node");
assertNotIncludesText(JSON.stringify(embeddedPanelStatus), "secret runtime snapshot body");
assertNotIncludesText(JSON.stringify(embeddedPanelStatus), "secret embedded recovery text");
const restoreRecoveryRequest = ProjectWorkspaceSessionStatusModelBuilder.buildRecoveryActionRequest({
  action: "restore",
  item: embeddedPanelStatus.recoveryItems[0],
});
assertEqual(restoreRecoveryRequest.format, ProjectWorkspaceRecoveryActionRequestFormat, "recovery restore action format");
assertEqual(restoreRecoveryRequest.requiresWriteBack, true, "recovery restore action writes back");
assertEqual(restoreRecoveryRequest.suppressFuturePrompt, false, "recovery restore action does not suppress prompt");
const discardRecoveryRequest = ProjectWorkspaceSessionStatusModelBuilder.buildRecoveryActionRequest({
  action: "discard",
  item: embeddedPanelStatus.recoveryItems[0],
});
assertEqual(discardRecoveryRequest.suppressFuturePrompt, true, "recovery discard action suppresses future prompt");
assertEqual(discardRecoveryRequest.keepsSnapshot, false, "recovery discard action does not keep snapshot");
const laterRecoveryRequest = ProjectWorkspaceSessionStatusModelBuilder.buildRecoveryActionRequest({
  action: "later",
  item: embeddedPanelStatus.recoveryItems[0],
});
assertEqual(laterRecoveryRequest.keepsSnapshot, true, "recovery later action keeps snapshot");
assertEqual(laterRecoveryRequest.requiresWriteBack, false, "recovery later action does not write back");
assertNotIncludesText(JSON.stringify(restoreRecoveryRequest), "secret embedded recovery text");

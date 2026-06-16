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
    async render() {},
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
  previewController,
  runtimeBridge: {
    async getRuntimeSnapshot() {
      return {
        provider: "runtime-project",
        snapshot: runtimeSnapshot,
      };
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

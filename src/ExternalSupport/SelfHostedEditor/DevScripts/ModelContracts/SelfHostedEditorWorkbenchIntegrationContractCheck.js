import { SelfHostedEditorWorkbenchRenderController } from "../../Scripts/Entries/SelfHostedEditorWorkbenchRenderController.js";
import {
  ScriptDocumentFallbackPolicy,
  ScriptDocumentFallbackReason,
} from "../../Scripts/ProjectWorkspace/Models/ScriptDocumentFallbackPolicy.js";
import { DocumentOutlineController } from "../../Scripts/ProjectWorkspace/Controllers/DocumentOutlineController.js";
import { ProjectWorkspaceSummaryController } from "../../Scripts/ProjectWorkspace/Controllers/ProjectWorkspaceSummaryController.js";
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
        runtimeSession: {
          entryCount: 1,
          kind: "bounded-cache",
        },
        sessionId: "integration-session",
        workspace: {
          activeRelativePath: "samples/court-loop.inscape",
          documentCount: 1,
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

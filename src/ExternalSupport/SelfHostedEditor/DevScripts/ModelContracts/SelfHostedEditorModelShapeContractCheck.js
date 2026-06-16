import { ScriptDiagnosticsModelBuilder } from "../../Scripts/ProjectWorkspace/Models/ScriptDiagnosticsModelBuilder.js";
import { EditorBackendClient } from "../../Scripts/Backend/Clients/EditorBackendClient.js";
import { EditorBackendTransportCommand } from "../../Scripts/Backend/Clients/EditorBackendTransport.js";
import { EditorBackendSessionStatusFormat } from "../../Scripts/Backend/Models/EditorBackendSessionStatusModel.js";
import {
  ScriptDocumentFallbackCategory,
  ScriptDocumentFallbackPolicy,
  ScriptDocumentFallbackReason,
} from "../../Scripts/ProjectWorkspace/Models/ScriptDocumentFallbackPolicy.js";
import { ScriptDocumentModelBuilder } from "../../Scripts/ProjectWorkspace/Models/ScriptDocumentModelBuilder.js";
import { ScriptLineIdentityModelBuilder } from "../../Scripts/ProjectWorkspace/Models/ScriptLineIdentityModelBuilder.js";
import { ScriptNodeRenamePatchBuilder } from "../../Scripts/ProjectWorkspace/Models/ScriptNodeRenamePatchBuilder.js";
import { ProjectWorkspaceDraftSummaryModelBuilder } from "../../Scripts/ProjectWorkspace/Models/ProjectWorkspaceDraftSummaryModelBuilder.js";
import { ProjectWorkspaceSummaryModelBuilder } from "../../Scripts/ProjectWorkspace/Models/ProjectWorkspaceSummaryModelBuilder.js";
import { WorkspaceSummaryHostedModelBuilder } from "../../Scripts/ProjectWorkspace/Models/WorkspaceSummaryHostedModelBuilder.js";
import { DocumentOutlineController } from "../../Scripts/ProjectWorkspace/Controllers/DocumentOutlineController.js";
import { ProjectWorkspaceSummaryController } from "../../Scripts/ProjectWorkspace/Controllers/ProjectWorkspaceSummaryController.js";
import { LocalizationDraftCsvBuilder } from "../../Scripts/Localization/Models/LocalizationDraftCsvBuilder.js";
import { LocalizationDraftStore } from "../../Scripts/Localization/Models/LocalizationDraftStore.js";
import { EditorHoverTargetModelBuilder } from "../../Scripts/EditorAuthoring/Models/EditorHoverTargetModelBuilder.js";
import { EditorCompletionTargetModelBuilder } from "../../Scripts/EditorAuthoring/Models/EditorCompletionTargetModelBuilder.js";
import { EditorReferenceOverlayController } from "../../Scripts/EditorAuthoring/Controllers/EditorReferenceOverlayController.js";
import { SelfHostedEditorDocumentSymbolBridge } from "../../Scripts/LanguageServer/Bridges/SelfHostedEditorDocumentSymbolBridge.js";
import { LanguageServerCompletionModelMapper } from "../../Scripts/LanguageServer/Models/LanguageServerCompletionModelMapper.js";
import { LanguageServerDefinitionModelMapper } from "../../Scripts/LanguageServer/Models/LanguageServerDefinitionModelMapper.js";
import { LanguageServerDiagnosticModelMapper } from "../../Scripts/LanguageServer/Models/LanguageServerDiagnosticModelMapper.js";
import { LanguageServerDocumentSymbolModelMapper } from "../../Scripts/LanguageServer/Models/LanguageServerDocumentSymbolModelMapper.js";
import { LanguageServerReferenceModelMapper } from "../../Scripts/LanguageServer/Models/LanguageServerReferenceModelMapper.js";
import { assertEqual, assertIncludes, assertIncludesText, assertNotIncludesText, createHoverModel, getTextContent, installFakeDomEnvironment } from "./SelfHostedEditorModelContractHarness.js";

const sample = `# Start
旁白：Hello
-> Start
-  -> Missing
-> Missing

# Start
旁白：Again`;

const documentModel = ScriptDocumentModelBuilder.build(sample);
assertEqual(documentModel.nodes.length, 2, "node count");
assertEqual(documentModel.translatableLines.length, 2, "translatable line count");
assertEqual(documentModel.lineHints[0].kind, "title", "first hint kind");
assertEqual(documentModel.lineHints[0].blockLineNumber, 0, "title hint has no block line number");
assertEqual(documentModel.lineHints[1].blockLineNumber, 1, "first content line block-local number");
assertEqual(documentModel.lineHints[2].blockLineNumber, 2, "second content line block-local number");
assertEqual(documentModel.lineHints[2].stableIdentity.status, "untracked", "jump lines should not expose pending line identity");
assertEqual(documentModel.lineHints[5].kind, "title", "second title hint kind");
assertEqual(documentModel.lineHints[6].blockLineNumber, 1, "second node content line resets block-local number");
const fallbackReasonCatalog = ScriptDocumentFallbackPolicy.getReasonCatalog();
const fallbackCategories = new Set(Object.values(ScriptDocumentFallbackCategory));
for (const reason of Object.values(ScriptDocumentFallbackReason)) {
  assertEqual(Boolean(fallbackReasonCatalog[reason]), true, `fallback reason registered: ${reason}`);
  assertEqual(fallbackCategories.has(fallbackReasonCatalog[reason].category), true, `fallback category is known: ${reason}`);
  assertEqual(Boolean(fallbackReasonCatalog[reason].owner), true, `fallback owner registered: ${reason}`);
  assertEqual(Boolean(fallbackReasonCatalog[reason].migrationTarget), true, `fallback migration target registered: ${reason}`);
}
assertEqual(
  fallbackReasonCatalog[ScriptDocumentFallbackReason.PreviewCompilerGraphUnavailable].category,
  ScriptDocumentFallbackCategory.TemporaryHostedFallback,
  "preview fallback category"
);
assertEqual(
  fallbackReasonCatalog[ScriptDocumentFallbackReason.StoryGraphCompilerGraphUnavailable].category,
  ScriptDocumentFallbackCategory.TemporaryHostedFallback,
  "story graph fallback category"
);
assertEqual(
  fallbackReasonCatalog[ScriptDocumentFallbackReason.LocalizationReviewUnavailable].category,
  ScriptDocumentFallbackCategory.TemporaryHostedFallback,
  "localization fallback category"
);
assertEqual(
  fallbackReasonCatalog[ScriptDocumentFallbackReason.DiagnosticsLanguageServerUnavailable].category,
  ScriptDocumentFallbackCategory.TemporaryHostedFallback,
  "diagnostics fallback category"
);
assertEqual(
  fallbackReasonCatalog[ScriptDocumentFallbackReason.DocumentSymbolsLanguageServerUnavailable].category,
  ScriptDocumentFallbackCategory.TemporaryHostedFallback,
  "document symbols fallback category"
);
assertEqual(
  fallbackReasonCatalog[ScriptDocumentFallbackReason.EditorAuthoringSurface].category,
  ScriptDocumentFallbackCategory.OfflineOnly,
  "editor authoring fallback category"
);
assertEqual(
  fallbackReasonCatalog[ScriptDocumentFallbackReason.WorkspaceSummaryStatus].category,
  ScriptDocumentFallbackCategory.TemporaryHostedFallback,
  "workspace summary fallback category"
);
assertEqual(
  Object.values(fallbackReasonCatalog).some((entry) => entry.category === "migration-target"),
  false,
  "fallback catalog has no current-stage migration target"
);
let missingFallbackReasonFailed = false;
try {
  ScriptDocumentFallbackPolicy.buildDocumentModel(sample);
} catch {
  missingFallbackReasonFailed = true;
}
assertEqual(missingFallbackReasonFailed, true, "draft document fallback requires registered reason");

const backendCalls = [];
const backendClient = new EditorBackendClient({
  transport: {
    async invoke(command, payload) {
      backendCalls.push({
        command,
        payload,
      });
      if (command === EditorBackendTransportCommand.ProjectSessionStatus) {
        return {
          caches: {
            lineMap: {
              entryCount: 2,
            },
            localizationBaseline: {
              entryCount: 1,
            },
            runtime: {
              entryCount: 3,
            },
          },
        };
      }

      return {
        command,
        payload,
      };
    },
  },
});
const backendDiagnostics = await backendClient.languageSession.diagnose({ scriptText: "# Start" });
assertEqual(backendDiagnostics.command, EditorBackendTransportCommand.LanguageDiagnostics, "backend client diagnostics command");
assertEqual(backendCalls[0].payload.scriptText, "# Start", "backend client forwards diagnostics payload");
const backendRuntimeAction = await backendClient.runtimeSession.step({ action: "continue", sessionId: "session-a" });
assertEqual(backendRuntimeAction.command, EditorBackendTransportCommand.RuntimeStep, "backend client runtime action command");
const backendStatus = await backendClient.diagnostics.sessionStatus();
assertEqual(backendStatus.format, EditorBackendSessionStatusFormat, "backend session status format");
assertEqual(backendStatus.mode, "dev-host", "backend session status mode");
assertEqual(backendStatus.languageSession.kind, "process-per-request", "backend language session status kind");
assertEqual(
  backendStatus.languageSession.supportedEndpoints.join(","),
  "diagnostics,completions,definition,references,hover,document-symbols",
  "backend language session process-per-request endpoints"
);
assertEqual(backendStatus.runtimeSession.entryCount, 3, "backend runtime cache entry count");
assertEqual(backendStatus.lineIdentitySession.entryCount, 2, "backend line-map cache entry count");
assertEqual(backendStatus.localizationSession.entryCount, 1, "backend localization cache entry count");
assertEqual(typeof backendClient.request, "undefined", "backend client must not expose generic request");
assertEqual(typeof backendClient.languageSession.request, "undefined", "language session client must not expose generic request");

export const lineIdentityProvider = ScriptLineIdentityModelBuilder.build({
  Documents: [
    {
      SourcePath: "samples/court-loop.inscape",
      Blocks: [
        {
          BlockTitle: "Start",
          Lines: [
            {
              Fingerprint: "fp1",
              Kind: "dialogue",
              LineId: "line_DIALOGUE",
              LineNumber: 1,
              Text: "Hello",
            },
            {
              Fingerprint: "fp2",
              Kind: "choice-prompt",
              LineId: "line_PROMPT",
              LineNumber: 2,
              Text: "Prompt",
            },
            {
              Fingerprint: "fp3",
              Kind: "choice-option",
              LineId: "line_CHOICE",
              LineNumber: 3,
              Text: "Choice",
            },
          ],
        },
      ],
    },
  ],
}, "samples/court-loop.inscape");
export const identityDocumentModel = ScriptDocumentModelBuilder.build(`# Start
旁白：Hello
? Prompt
- Choice -> Start
@entry`, lineIdentityProvider);
assertEqual(identityDocumentModel.lineHints[1].stableIdentity.value, "line_DIALOGUE", "dialogue line id maps from line sidecar");
assertEqual(identityDocumentModel.lineHints[2].stableIdentity.value, "line_PROMPT", "prompt line id maps from line sidecar");
assertEqual(identityDocumentModel.lineHints[3].stableIdentity.value, "line_CHOICE", "choice line id maps from line sidecar");
assertEqual(identityDocumentModel.lineHints[4].stableIdentity.status, "untracked", "metadata line identity stays hidden");

const diagnostics = ScriptDiagnosticsModelBuilder.build(sample);
assertIncludes(diagnostics, "Duplicate node title: Start");
assertIncludes(diagnostics, "Choice text is empty.");
assertIncludes(diagnostics, "Missing choice target: Missing");
assertIncludes(diagnostics, "Missing jump target: Missing");

const renamePatch = ScriptNodeRenamePatchBuilder.build(sample, "Start", "Opening");
assertIncludesText(renamePatch.text, "# Opening");
assertIncludesText(renamePatch.text, "-> Opening");
assertEqual(renamePatch.changedLineNumbers.length, 3, "rename changed line count");
const jumpRenamePatch = ScriptNodeRenamePatchBuilder.build("# Opening\r\n-> Opening", "Opening", "Witness");
assertIncludesText(jumpRenamePatch.text, "# Witness");
assertIncludesText(jumpRenamePatch.text, "-> Witness");

const draftStore = new LocalizationDraftStore();
draftStore.setTranslation(documentModel.translatableLines[0], "Hello translated");
assertEqual(draftStore.getStatus(documentModel.translatableLines[0]), "draft", "localization draft status");
assertEqual(draftStore.getTranslation(documentModel.translatableLines[0]), "Hello translated", "localization draft text");
const csv = LocalizationDraftCsvBuilder.build(documentModel.translatableLines, draftStore);
assertIncludesText(csv, "translationDraft");
assertIncludesText(csv, "Hello translated");
const summary = ProjectWorkspaceDraftSummaryModelBuilder.build(sample, draftStore);
const summaryCompatibility = ProjectWorkspaceSummaryModelBuilder.build(sample, draftStore);
assertEqual(summary.nodeCount, 2, "summary node count");
assertEqual(summary.localizationLineCount, 2, "summary localization count");
assertEqual(summary.draftTranslationCount, 1, "summary draft count");
assertEqual(summary.diagnosticCount, 4, "summary diagnostic count");
assertEqual(summary.provider, "draft-fallback", "summary provider");
assertEqual(summary.fallback.reason, ScriptDocumentFallbackReason.WorkspaceSummaryStatus, "summary fallback reason");
assertEqual(summary.fallback.category, ScriptDocumentFallbackCategory.TemporaryHostedFallback, "summary fallback category");
assertEqual(summaryCompatibility.provider, "draft-fallback", "summary compatibility provider");
const hostedSummaryRows = [
  {
    anchor: "hosted-anchor-1",
    kind: "dialogue",
    nodeTitle: "Start",
    sourceLine: 2,
    text: "Hello",
  },
];
draftStore.setTranslation(hostedSummaryRows[0], "Hosted translated");
const hostedSummary = WorkspaceSummaryHostedModelBuilder.build({
  diagnosticSnapshot: {
    diagnostics: [
      {
        message: "Hosted problem",
      },
    ],
    provider: "language-server",
  },
  localizationDraftStore: draftStore,
  localizationSummary: {
    provider: "localization-review",
    rows: hostedSummaryRows,
  },
  runtimeSnapshot: {
    provider: "runtime-project",
  },
  storyGraphModel: {
    nodes: [
      {
        isInActiveDocument: true,
        title: "Start",
      },
      {
        isInActiveDocument: false,
        title: "Other",
      },
    ],
    provider: "compiler-project",
  },
});
assertEqual(hostedSummary.nodeCount, 1, "hosted summary active node count");
assertEqual(hostedSummary.localizationLineCount, 1, "hosted summary localization count");
assertEqual(hostedSummary.draftTranslationCount, 1, "hosted summary draft count");
assertEqual(hostedSummary.diagnosticCount, 1, "hosted summary diagnostic count");
assertEqual(hostedSummary.provider, "shared", "hosted summary provider");
assertEqual(hostedSummary.sources.storyGraphProvider, "compiler-project", "hosted summary graph source");
assertEqual(
  WorkspaceSummaryHostedModelBuilder.build({
    localizationDraftStore: draftStore,
    localizationSummary: {
      provider: "localization-review",
      rows: hostedSummaryRows,
    },
    storyGraphModel: null,
  }),
  null,
  "hosted summary unavailable without compiler graph"
);
const { document: fakeDocument } = installFakeDomEnvironment();
const summaryPanel = fakeDocument.createElement("div");
const summaryController = new ProjectWorkspaceSummaryController(summaryPanel);
summaryController.render(summary);
assertIncludesText(getTextContent(summaryPanel), "draft summary");
summaryController.render(hostedSummary);
assertIncludesText(getTextContent(summaryPanel), "shared summary");
const outlinePanel = fakeDocument.createElement("div");
const outlineController = new DocumentOutlineController(outlinePanel);
outlineController.render({
  provider: "language-server",
  symbols: [
    {
      kind: "node",
      name: "Start",
      sourceLine: 1,
    },
  ],
}, documentModel);
assertIncludesText(getTextContent(outlinePanel), "LanguageServer outline");
outlineController.render({
  provider: "draft-fallback",
  symbols: [
    {
      kind: "node",
      name: "Start",
      sourceLine: 1,
    },
  ],
}, documentModel);
assertIncludesText(getTextContent(outlinePanel), "Draft outline");
outlineController.render({
  error: "LanguageServer document symbols contract violation: symbol 0 is missing location.",
  provider: "language-server-error",
  symbols: [],
}, documentModel);
assertIncludesText(getTextContent(outlinePanel), "LanguageServer outline error");
assertIncludesText(getTextContent(outlinePanel), "missing location");
assertNotIncludesText(getTextContent(outlinePanel), "Draft outline");

const hoverModel = createHoverModel("# Opening\r\n- Review -> Witness\r\n-> Evidence");
const nodeHoverTarget = EditorHoverTargetModelBuilder.build(hoverModel, { lineNumber: 1, column: 4 });
assertEqual(nodeHoverTarget?.kind, "node", "node hover target kind");
assertEqual(nodeHoverTarget?.name, "Opening", "node hover target name");
const jumpHoverTarget = EditorHoverTargetModelBuilder.build(hoverModel, { lineNumber: 2, column: 13 });
assertEqual(jumpHoverTarget?.kind, "jump", "jump hover target kind");
assertEqual(jumpHoverTarget?.name, "Witness", "jump hover target name");
const completionModel = createHoverModel("Narration: Lead\r\n- Review -> Wi");
const completionTarget = EditorCompletionTargetModelBuilder.build(completionModel, { lineNumber: 2, column: 15 });
assertEqual(completionTarget?.kind, "node", "completion target kind");
assertEqual(completionTarget?.typedPrefix, "Wi", "completion target prefix");
const queryCompletionTarget = EditorCompletionTargetModelBuilder.build(createHoverModel("Narrator: Gold [player.g"), { lineNumber: 1, column: 25 });
assertEqual(queryCompletionTarget?.kind, "query", "query completion target kind");
assertEqual(queryCompletionTarget?.typedPrefix, "player.g", "query completion target prefix");
const eventCompletionTarget = EditorCompletionTargetModelBuilder.build(createHoverModel("@emit quest."), { lineNumber: 1, column: 13 });
assertEqual(eventCompletionTarget?.kind, "host-event", "host event completion target kind");
assertEqual(eventCompletionTarget?.typedPrefix, "quest.", "host event completion target prefix");
const timelineCompletionTarget = EditorCompletionTargetModelBuilder.build(createHoverModel("@timeline court"), { lineNumber: 1, column: 16 });
assertEqual(timelineCompletionTarget?.kind, "host-binding", "timeline completion target kind");
assertEqual(timelineCompletionTarget?.bindingKind, "timeline", "timeline completion binding kind");
assertEqual(timelineCompletionTarget?.typedPrefix, "court", "timeline completion target prefix");
const speakerCompletionTarget = EditorCompletionTargetModelBuilder.build(createHoverModel("Narr"), { lineNumber: 1, column: 5 });
assertEqual(speakerCompletionTarget?.kind, "speaker", "speaker completion target kind");
assertEqual(speakerCompletionTarget?.typedPrefix, "Narr", "speaker completion target prefix");
const queryHoverTarget = EditorHoverTargetModelBuilder.build(createHoverModel("Narrator: Gold [player.gold]"), { lineNumber: 1, column: 18 });
assertEqual(queryHoverTarget?.kind, "query", "query hover target kind");
assertEqual(queryHoverTarget?.name, "player.gold", "query hover target name");
const eventHoverTarget = EditorHoverTargetModelBuilder.build(createHoverModel("@emit quest.accepted"), { lineNumber: 1, column: 10 });
assertEqual(eventHoverTarget?.kind, "host-event", "host event hover target kind");
assertEqual(eventHoverTarget?.name, "quest.accepted", "host event hover target name");
const timelineHoverTarget = EditorHoverTargetModelBuilder.build(createHoverModel("@timeline court_intro"), { lineNumber: 1, column: 12 });
assertEqual(timelineHoverTarget?.kind, "host-binding", "timeline hover target kind");
assertEqual(timelineHoverTarget?.bindingKind, "timeline", "timeline hover binding kind");
assertEqual(timelineHoverTarget?.name, "court_intro", "timeline hover target name");
const speakerHoverTarget = EditorHoverTargetModelBuilder.build(createHoverModel("Narrator: Hello"), { lineNumber: 1, column: 3 });
assertEqual(speakerHoverTarget?.kind, "speaker", "speaker hover target kind");
assertEqual(speakerHoverTarget?.name, "Narrator", "speaker hover target name");
const completionMapper = LanguageServerCompletionModelMapper.mapCompletions({
  completions: [
    {
      label: "Witness",
      kind: "node",
    },
  ],
});
assertEqual(completionMapper.length, 1, "completion mapper count");
assertEqual(completionMapper[0].label, "Witness", "completion mapper label");
const diagnosticMapper = LanguageServerDiagnosticModelMapper.mapDiagnostics({
  diagnostics: [
    {
      code: "INS001",
      severity: "warning",
      message: "Something happened.",
      location: {
        line: 2,
        character: 4,
        length: 3,
      },
    },
  ],
});
assertEqual(diagnosticMapper.length, 1, "diagnostic mapper count");
assertEqual(diagnosticMapper[0].startColumn, 5, "diagnostic mapper start column");
assertEqual(diagnosticMapper[0].endColumn, 8, "diagnostic mapper end column");
const symbolMapper = LanguageServerDocumentSymbolModelMapper.mapSymbols({
  symbols: [
    {
      name: "Opening",
      kind: "node",
      location: {
        line: 3,
      },
    },
  ],
});
assertEqual(symbolMapper.length, 1, "symbol mapper count");
assertEqual(symbolMapper[0].sourceLine, 4, "symbol mapper line");
let malformedSymbolsFailed = false;
try {
  LanguageServerDocumentSymbolModelMapper.mapSymbols({
    symbols: [
      {
        name: "Broken",
      },
    ],
  });
} catch (error) {
  malformedSymbolsFailed = true;
  assertIncludesText(error instanceof Error ? error.message : String(error), "missing location");
}
assertEqual(malformedSymbolsFailed, true, "symbol mapper rejects malformed payload");
const unavailableDocumentSymbolsBridge = new SelfHostedEditorDocumentSymbolBridge({
  backendClient: {
    languageSession: {
      async documentSymbols() {
        throw new Error("LanguageServer unavailable");
      },
    },
  },
});
const originalConsoleWarn = console.warn;
console.warn = () => {};
let unavailableDocumentSymbols;
try {
  unavailableDocumentSymbols = await unavailableDocumentSymbolsBridge.getDocumentSymbols(sample);
} finally {
  console.warn = originalConsoleWarn;
}
assertEqual(unavailableDocumentSymbols.provider, "draft-fallback", "unavailable document symbols use draft fallback");
assertEqual(unavailableDocumentSymbols.symbols.length, 2, "unavailable document symbols draft count");
const malformedDocumentSymbolsBridge = new SelfHostedEditorDocumentSymbolBridge({
  backendClient: {
    languageSession: {
      async documentSymbols() {
        return {
          symbols: [
            {
              name: "Broken",
            },
          ],
        };
      },
    },
  },
});
const malformedDocumentSymbols = await malformedDocumentSymbolsBridge.getDocumentSymbols(sample);
assertEqual(malformedDocumentSymbols.provider, "language-server-error", "malformed document symbols stay error");
assertEqual(malformedDocumentSymbols.symbols.length, 0, "malformed document symbols do not use draft rows");
assertIncludesText(malformedDocumentSymbols.error, "missing location");
const definition = LanguageServerDefinitionModelMapper.mapDefinition({
  definition: {
    name: "Opening",
    location: {
      line: 0,
      character: 2,
      length: 7,
    },
  },
});
assertEqual(definition?.location.line, 0, "definition mapper line");
const references = LanguageServerReferenceModelMapper.mapReferences({
  references: [
    {
      target: "Opening",
      location: {
        line: 1,
        character: 3,
        length: 7,
      },
    },
  ],
});
assertEqual(references.length, 1, "references mapper count");
assertEqual(references[0].location.character, 3, "references mapper character");
const referenceOverlayPreview = Object.create(EditorReferenceOverlayController.prototype);
referenceOverlayPreview.workspaceContextProvider = () => ({
  currentFilePath: "story/opening.inscape",
  documents: [
    {
      relativePath: "story/opening.inscape",
      text: "# Opening\n- Review evidence -> Evidence",
    },
    {
      relativePath: "story/branch.inscape",
      text: "# Branch\n-> Evidence",
    },
  ],
});
const crossFileReferencePreview = referenceOverlayPreview.buildReferencePreviewModel({
  location: {
    line: 1,
    sourcePath: "C:/tmp/inscape-self-hosted-editor-123/story/branch.inscape",
  },
}, {
  kind: "node",
  name: "Evidence",
});
assertEqual(crossFileReferencePreview.summary, "Jump -> Evidence", "reference overlay cross-file summary");
assertIncludesText(
  crossFileReferencePreview.contextLines.map((line) => line.text).join("\n"),
  "-> Evidence"
);

import { ScriptDiagnosticsModelBuilder } from "../../Scripts/ProjectWorkspace/Models/ScriptDiagnosticsModelBuilder.js";
import {
  ScriptDocumentFallbackCategory,
  ScriptDocumentFallbackPolicy,
  ScriptDocumentFallbackReason,
} from "../../Scripts/ProjectWorkspace/Models/ScriptDocumentFallbackPolicy.js";
import { ScriptDocumentModelBuilder } from "../../Scripts/ProjectWorkspace/Models/ScriptDocumentModelBuilder.js";
import { ScriptLineIdentityModelBuilder } from "../../Scripts/ProjectWorkspace/Models/ScriptLineIdentityModelBuilder.js";
import { ScriptNodeRenamePatchBuilder } from "../../Scripts/ProjectWorkspace/Models/ScriptNodeRenamePatchBuilder.js";
import { ProjectWorkspaceSummaryModelBuilder } from "../../Scripts/ProjectWorkspace/Models/ProjectWorkspaceSummaryModelBuilder.js";
import { LocalizationDraftCsvBuilder } from "../../Scripts/Localization/Models/LocalizationDraftCsvBuilder.js";
import { LocalizationDraftStore } from "../../Scripts/Localization/Models/LocalizationDraftStore.js";
import { EditorHoverTargetModelBuilder } from "../../Scripts/EditorAuthoring/Models/EditorHoverTargetModelBuilder.js";
import { EditorCompletionTargetModelBuilder } from "../../Scripts/EditorAuthoring/Models/EditorCompletionTargetModelBuilder.js";
import { EditorReferenceOverlayController } from "../../Scripts/EditorAuthoring/Controllers/EditorReferenceOverlayController.js";
import { LanguageServerCompletionModelMapper } from "../../Scripts/LanguageServer/Models/LanguageServerCompletionModelMapper.js";
import { LanguageServerDefinitionModelMapper } from "../../Scripts/LanguageServer/Models/LanguageServerDefinitionModelMapper.js";
import { LanguageServerDiagnosticModelMapper } from "../../Scripts/LanguageServer/Models/LanguageServerDiagnosticModelMapper.js";
import { LanguageServerDocumentSymbolModelMapper } from "../../Scripts/LanguageServer/Models/LanguageServerDocumentSymbolModelMapper.js";
import { LanguageServerReferenceModelMapper } from "../../Scripts/LanguageServer/Models/LanguageServerReferenceModelMapper.js";
import { assertEqual, assertIncludes, assertIncludesText, createHoverModel } from "./SelfHostedEditorModelContractHarness.js";

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
for (const reason of Object.values(ScriptDocumentFallbackReason)) {
  assertEqual(Boolean(fallbackReasonCatalog[reason]), true, `fallback reason registered: ${reason}`);
}
assertEqual(
  fallbackReasonCatalog[ScriptDocumentFallbackReason.PreviewCompilerGraphUnavailable].category,
  ScriptDocumentFallbackCategory.HostedBridgeUnavailable,
  "preview fallback category"
);
assertEqual(
  fallbackReasonCatalog[ScriptDocumentFallbackReason.EditorAuthoringSurface].category,
  ScriptDocumentFallbackCategory.OfflineOnlyUi,
  "editor authoring fallback category"
);
let missingFallbackReasonFailed = false;
try {
  ScriptDocumentFallbackPolicy.buildDocumentModel(sample);
} catch {
  missingFallbackReasonFailed = true;
}
assertEqual(missingFallbackReasonFailed, true, "draft document fallback requires registered reason");

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
const summary = ProjectWorkspaceSummaryModelBuilder.build(sample, draftStore);
assertEqual(summary.nodeCount, 2, "summary node count");
assertEqual(summary.localizationLineCount, 2, "summary localization count");
assertEqual(summary.draftTranslationCount, 1, "summary draft count");
assertEqual(summary.diagnosticCount, 4, "summary diagnostic count");

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

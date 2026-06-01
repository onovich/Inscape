import { ScriptDiagnosticsModelBuilder } from "../Scripts/ProjectWorkspace/Models/ScriptDiagnosticsModelBuilder.js";
import { ScriptDocumentModelBuilder } from "../Scripts/ProjectWorkspace/Models/ScriptDocumentModelBuilder.js";
import { ScriptLineIdentityModelBuilder } from "../Scripts/ProjectWorkspace/Models/ScriptLineIdentityModelBuilder.js";
import { ScriptNodeRenamePatchBuilder } from "../Scripts/ProjectWorkspace/Models/ScriptNodeRenamePatchBuilder.js";
import { ProjectWorkspaceSummaryModelBuilder } from "../Scripts/ProjectWorkspace/Models/ProjectWorkspaceSummaryModelBuilder.js";
import { LocalizationDraftCsvBuilder } from "../Scripts/Localization/Models/LocalizationDraftCsvBuilder.js";
import { LocalizationDraftStore } from "../Scripts/Localization/Models/LocalizationDraftStore.js";
import { LocalizationEditorController } from "../Scripts/Localization/Controllers/LocalizationEditorController.js";
import { EditorHoverTargetModelBuilder } from "../Scripts/EditorAuthoring/Models/EditorHoverTargetModelBuilder.js";
import { EditorCompletionTargetModelBuilder } from "../Scripts/EditorAuthoring/Models/EditorCompletionTargetModelBuilder.js";
import { EditorSurfaceController } from "../Scripts/EditorAuthoring/Controllers/EditorSurfaceController.js";
import { EditorReferenceOverlayController } from "../Scripts/EditorAuthoring/Controllers/EditorReferenceOverlayController.js";
import { StoryNodeMapReviewController } from "../Scripts/EditorAuthoring/Controllers/StoryNodeMapReviewController.js";
import { SelfHostedEditorHostBindingBridge } from "../Scripts/HostBinding/Bridges/SelfHostedEditorHostBindingBridge.js";
import { HostCapabilityCatalogController } from "../Scripts/HostSchema/Controllers/HostCapabilityCatalogController.js";
import { LanguageServerCompletionModelMapper } from "../Scripts/LanguageServer/Models/LanguageServerCompletionModelMapper.js";
import { LanguageServerDefinitionModelMapper } from "../Scripts/LanguageServer/Models/LanguageServerDefinitionModelMapper.js";
import { LanguageServerDiagnosticModelMapper } from "../Scripts/LanguageServer/Models/LanguageServerDiagnosticModelMapper.js";
import { LanguageServerReferenceModelMapper } from "../Scripts/LanguageServer/Models/LanguageServerReferenceModelMapper.js";
import { LanguageServerDocumentSymbolModelMapper } from "../Scripts/LanguageServer/Models/LanguageServerDocumentSymbolModelMapper.js";
import { LanguageServerStoryGraphModelMapper } from "../Scripts/LanguageServer/Models/LanguageServerStoryGraphModelMapper.js";
import { HostBindingCapabilityModelMapper } from "../Scripts/HostBinding/Models/HostBindingCapabilityModelMapper.js";
import { HostSchemaCapabilityModelMapper } from "../Scripts/HostSchema/Models/HostSchemaCapabilityModelMapper.js";
import { PreviewPanelController } from "../Scripts/Preview/Controllers/PreviewPanelController.js";
import { StoryGraphPreviewController } from "../Scripts/StoryGraph/Controllers/StoryGraphPreviewController.js";

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

const lineIdentityProvider = ScriptLineIdentityModelBuilder.build({
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
const identityDocumentModel = ScriptDocumentModelBuilder.build(`# Start
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
const hostSchemaCatalog = HostSchemaCapabilityModelMapper.mapCatalog({
  events: [
    {
      delivery: "fire-and-forget",
      isNamedHostEvent: true,
      name: "quest.accepted",
    },
  ],
  format: "inscape.host-schema.capabilities",
  formatVersion: 1,
  hostSchema: {
    loaded: true,
  },
  queries: [
    {
      isSimpleTextInterpolationQuery: true,
      name: "player.gold",
      returnType: "number",
    },
  ],
});
assertEqual(hostSchemaCatalog.hostSchema.loaded, true, "host schema mapper loaded");
assertEqual(hostSchemaCatalog.queries[0].name, "player.gold", "host schema mapper query");
assertEqual(hostSchemaCatalog.events[0].name, "quest.accepted", "host schema mapper event");
const hostBindingCatalog = HostBindingCapabilityModelMapper.mapCatalog({
  bindings: [
    {
      assetId: "2001",
      kind: "timeline",
      locations: [
        {
          character: 0,
          line: 0,
          sourceKind: "hostBridge",
          sourcePath: "config/inscape.host.bridge.json",
        },
        {
          character: 10,
          line: 4,
          sourceKind: "script",
          sourcePath: "story/opening.inscape",
        },
      ],
      name: "court_intro",
    },
  ],
  format: "inscape.host-binding.capabilities",
  formatVersion: 1,
  hostBridge: {
    loaded: true,
  },
  speakers: [
    {
      locations: [
        {
          character: 0,
          line: 0,
          sourceKind: "hostBridge",
          sourcePath: "config/inscape.host.bridge.json",
        },
        {
          character: 0,
          line: 2,
          sourceKind: "script",
          sourcePath: "story/opening.inscape",
        },
      ],
      name: "Narrator",
      roleId: "1001",
    },
  ],
});
assertEqual(hostBindingCatalog.hostBridge.loaded, true, "host binding mapper loaded");
assertEqual(hostBindingCatalog.speakers[0].name, "Narrator", "host binding mapper speaker");
assertEqual(hostBindingCatalog.speakers[0].locations.length, 2, "host binding mapper speaker locations");
assertEqual(hostBindingCatalog.bindings[0].name, "court_intro", "host binding mapper binding");
assertEqual(hostBindingCatalog.bindings[0].locations[1].sourcePath, "story/opening.inscape", "host binding mapper binding location");
const hostBindingBridge = new SelfHostedEditorHostBindingBridge();
hostBindingBridge.getCapabilityCatalog = async () => hostBindingCatalog;
const speakerDefinition = await hostBindingBridge.getDefinition("", {
  kind: "speaker",
  name: "Narrator",
});
assertEqual(speakerDefinition?.location.sourcePath, "config/inscape.host.bridge.json", "host binding bridge speaker definition should prefer host bridge");
const speakerReferences = await hostBindingBridge.getReferences("", {
  kind: "speaker",
  name: "Narrator",
});
assertEqual(speakerReferences.length, 2, "host binding bridge speaker references");
const timelineDefinition = await hostBindingBridge.getDefinition("", {
  bindingKind: "timeline",
  kind: "host-binding",
  name: "court_intro",
});
assertEqual(timelineDefinition?.location.sourcePath, "config/inscape.host.bridge.json", "host binding bridge timeline definition should prefer host bridge");
const timelineReferences = await hostBindingBridge.getReferences("", {
  bindingKind: "timeline",
  kind: "host-binding",
  name: "court_intro",
});
assertEqual(timelineReferences.length, 2, "host binding bridge timeline references");
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
const storyGraph = LanguageServerStoryGraphModelMapper.mapProjectGraph({
  documents: [
    {
      sourcePath: "samples/court-loop.inscape",
      nodes: [
        {
          name: "Opening",
          source: {
            sourcePath: "samples/court-loop.inscape",
            line: 1,
          },
          lines: [
            {
              kind: "Metadata",
              text: "@scene court",
              source: {
                sourcePath: "samples/court-loop.inscape",
                line: 2,
              },
            },
            {
              kind: "Dialogue",
              speaker: "Narrator",
              text: "Review the evidence.",
              source: {
                sourcePath: "samples/court-loop.inscape",
                line: 3,
              },
            },
            {
              kind: "Metadata",
              text: "@emit after_line",
              source: {
                sourcePath: "samples/court-loop.inscape",
                line: 4,
              },
            },
          ],
          choices: [
            {
              prompt: "Choose action",
              source: {
                sourcePath: "samples/court-loop.inscape",
                line: 4,
              },
              options: [
                {
                  text: "Question witness",
                  target: "Witness",
                  source: {
                    sourcePath: "samples/court-loop.inscape",
                    line: 5,
                  },
                },
              ],
            },
          ],
        },
        {
          name: "Witness",
          source: {
            sourcePath: "samples/court-loop.inscape",
            line: 8,
          },
          lines: [
            {
              kind: "Dialogue",
              speaker: "Witness",
              text: "I saw the clock stop.",
              source: {
                sourcePath: "samples/court-loop.inscape",
                line: 9,
              },
            },
          ],
          choices: [],
        },
      ],
      edges: [
        {
          from: "Opening",
          to: "Witness",
          kind: "Choice",
          label: "Question witness",
          source: {
            sourcePath: "samples/court-loop.inscape",
            line: 5,
          },
        },
        {
          from: "Witness",
          to: "Opening",
          kind: "Default",
          label: "",
          source: {
            sourcePath: "samples/court-loop.inscape",
            line: 10,
          },
        },
      ],
    },
  ],
  entryNodeName: "Opening",
}, "samples/court-loop.inscape");
assertEqual(storyGraph.nodes.length, 2, "story graph node count");
assertEqual(storyGraph.edges.length, 2, "story graph edge count");
assertEqual(storyGraph.nodes[0].choices[0].target, "Witness", "story graph choice target");
assertEqual(storyGraph.nodes[1].jumps[0].target, "Opening", "story graph jump target");
assertEqual(storyGraph.nodes[0].incomingReferenceCount, 1, "story graph incoming count");
assertEqual(storyGraph.nodes[0].previewLines[0].kind, "metadata", "story graph preview metadata line kind");
assertEqual(storyGraph.nodes[0].previewLines[1].kind, "dialogue", "story graph preview line kind");
assertEqual(storyGraph.nodes[0].previewLines[1].speaker, "Narrator", "story graph preview line speaker");
assertEqual(storyGraph.nodes[0].previewLines[2].kind, "metadata", "story graph preview trailing metadata line kind");
assertEqual(storyGraph.nodes[0].previewChoices[0].prompt, "Choose action", "story graph preview choice prompt");
assertEqual(storyGraph.nodes[0].previewChoices[0].options[0].target, "Witness", "story graph preview choice target");
assertEqual(storyGraph.nodes[1].previewChoices[0].options[0].text, "continue", "story graph default jump preview option");
const storyGraphController = new StoryGraphPreviewController({});
const projectedGraph = storyGraphController.projectGraphForDisplay(storyGraph.nodes, storyGraph.edges);
const referenceNode = projectedGraph.nodes.find((node) => node.isReference);
const referenceEdge = projectedGraph.edges.find((edge) => edge.isReferenceEdge);
assertEqual(Boolean(referenceNode), true, "story graph back edge should create reference node");
assertEqual(referenceNode.choices.length, 0, "reference node should not expose choices");
assertEqual(referenceNode.jumps.length, 0, "reference node should not expose jumps");
assertEqual(referenceEdge.targetGraphId, referenceNode.graphId, "back edge should target reference graph id");
storyGraphController.activeGraph = {
  graphEdges: projectedGraph.edges,
};
const projectedLayout = storyGraphController.createGraphLayout(projectedGraph.nodes);
const sourcePosition = projectedLayout.positions.get(referenceNode.referenceSourceGraphId);
const referencePosition = projectedLayout.positions.get(referenceNode.graphId);
assertEqual(referencePosition.x > sourcePosition.x, true, "reference node should sit to the right of its source");
assertEqual(
  storyGraphController.findProjectedEdge(storyGraph.nodes[0].choices[0])?.targetGraphId,
  "Witness",
  "graph row hover should match compiler edge shape"
);
assertEqual(
  storyGraphController.getEdgeSourceTitle(storyGraph.nodes[0].choices[0]),
  "Opening",
  "graph row hover should read outgoing source title"
);
assertEqual(
  storyGraphController.getEdgeTargetTitle(storyGraph.nodes[0].choices[0]),
  "Witness",
  "graph row hover should read outgoing target title"
);
const cycleProjection = storyGraphController.projectGraphForDisplay(
  [
    { title: "Alpha", choices: [], jumps: [], lineCount: 1, lines: [], sourceLine: 1 },
    { title: "Beta", choices: [], jumps: [], lineCount: 1, lines: [], sourceLine: 5 },
    { title: "Gamma", choices: [], jumps: [], lineCount: 1, lines: [], sourceLine: 9 },
  ],
  [
    { sourceLine: 2, sourceTitle: "Alpha", targetTitle: "Beta", text: "A to B" },
    { sourceLine: 6, sourceTitle: "Beta", targetTitle: "Gamma", text: "B to C" },
    { sourceLine: 3, sourceTitle: "Alpha", targetTitle: "Gamma", text: "A to C" },
    { sourceLine: 10, sourceTitle: "Gamma", targetTitle: "Alpha", text: "C closes cycle" },
  ]
);
assertEqual(cycleProjection.edges.filter((edge) => edge.isReferenceEdge).length, 1, "cycle-closing edge should create one reference");
assertEqual(cycleProjection.edges[3].isReferenceEdge, true, "cycle-closing edge should target a reference");
assertEqual(cycleProjection.nodes.find((node) => node.graphId === cycleProjection.edges[3].targetGraphId)?.jumps.length, 0, "cycle reference should be outputless");
assertEqual(
  EditorReferenceOverlayController.prototype.getReferenceSummary("- Review evidence -> Evidence", "Evidence"),
  "Review evidence -> Evidence",
  "reference overlay choice summary"
);
assertEqual(
  EditorReferenceOverlayController.prototype.getReferenceSummary("-> Opening", "Opening"),
  "Jump -> Opening",
  "reference overlay jump summary"
);

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertIncludes(diagnostics, message) {
  if (!diagnostics.some((diagnostic) => diagnostic.message === message)) {
    throw new Error(`Expected diagnostic: ${message}`);
  }
}

function assertIncludesText(text, expected) {
  if (!text.includes(expected)) {
    throw new Error(`Expected text to include: ${expected}`);
  }
}

function assertNotIncludesText(text, unexpected) {
  if (text.includes(unexpected)) {
    throw new Error(`Expected text not to include: ${unexpected}`);
  }
}

function createHoverModel(text) {
  const lines = text.split(/\r?\n/);
  return {
    getLineContent(lineNumber) {
      return lines[lineNumber - 1] || "";
    },
  };
}

function createWheelEvent(deltaY) {
  return {
    deltaY,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
  };
}

function createFakeMonaco(documentModel) {
  const text = documentModel.nodes
    .flatMap((node) => [`# ${node.title}`, ...node.lines.map((line) => line.text)])
    .join("\n");
  const lines = text.split(/\r?\n/);
  const fakeModel = {
    getLineCount: () => 5,
    getLineContent: (lineNumber) => lines[lineNumber - 1] || "",
    getLineMaxColumn: (lineNumber) => (lines[lineNumber - 1] || "").length + 1,
  };
  const fakeEditor = {
    deltaDecorations: (_oldDecorations, decorations) => decorations.map((_item, index) => `decoration-${index}`),
    getContentHeight: () => 180,
    getModel: () => fakeModel,
    getOption: () => 36,
    getScrollTop: () => 0,
    getTopForLineNumber: (lineNumber) => (lineNumber - 1) * 36,
    onDidChangeCursorPosition: () => {},
    onDidChangeModelContent: () => {},
    onDidContentSizeChange: () => {},
    onDidScrollChange: () => {},
    onMouseLeave: () => {},
    onMouseMove: () => {},
  };
  return {
    editor: {
      create: () => fakeEditor,
      createModel: () => fakeModel,
      defineTheme: () => {},
      EditorOption: {
        lineHeight: "lineHeight",
      },
    },
    Range: class {
      constructor(startLineNumber, startColumn, endLineNumber, endColumn) {
        this.startLineNumber = startLineNumber;
        this.startColumn = startColumn;
        this.endLineNumber = endLineNumber;
        this.endColumn = endColumn;
      }
    },
  };
}

class FakeDocument {
  constructor() {
    this.body = new FakeElement("body");
  }

  createElement(tagName) {
    return new FakeElement(tagName);
  }

  createTextNode(text) {
    return new FakeTextNode(text);
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.className = "";
    this.dataset = {};
    this.style = {};
    this.textContent = "";
    this.type = "";
    this.scrollTop = 0;
    this.clientHeight = 100;
    this.scrollHeight = 100;
    this.eventHandlers = new Map();
    this.classList = {
      add: (...classNames) => {
        const classes = new Set(this.className.split(/\s+/).filter(Boolean));
        for (const className of classNames) {
          classes.add(className);
        }
        this.className = Array.from(classes).join(" ");
      },
      remove: (...classNames) => {
        const removeSet = new Set(classNames);
        this.className = this.className
          .split(/\s+/)
          .filter((className) => className && !removeSet.has(className))
          .join(" ");
      },
      toggle: (className, force) => {
        const classes = new Set(this.className.split(/\s+/).filter(Boolean));
        if (force) {
          classes.add(className);
        } else {
          classes.delete(className);
        }

        this.className = Array.from(classes).join(" ");
      },
    };
  }

  addEventListener(type, handler) {
    const handlers = this.eventHandlers.get(type) || [];
    handlers.push(handler);
    this.eventHandlers.set(type, handlers);
  }

  click() {
    for (const handler of this.eventHandlers.get("click") || []) {
      handler({
        stopPropagation: () => {},
        target: this,
      });
    }
  }

  closest(selector) {
    if (selector === "button" && this.tagName === "button") {
      return this;
    }

    return null;
  }

  append(...children) {
    this.children.push(...children);
  }

  setAttribute(name, value) {
    this[name] = String(value);
  }

  replaceChildren(...children) {
    this.children = children;
  }

  removeAttribute(name) {
    delete this[name];
    if (name.startsWith("data-")) {
      delete this.dataset[name.slice(5).replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase())];
    }
  }

  querySelectorAll(selector) {
    const results = [];
    collectMatchingElements(this, selector, results);
    return results;
  }
}

class FakeTextNode {
  constructor(text) {
    this.textContent = String(text);
    this.children = [];
  }
}

function findElementByClass(element, className) {
  if (element.className?.split(/\s+/).includes(className)) {
    return element;
  }

  for (const child of element.children || []) {
    const match = findElementByClass(child, className);
    if (match) {
      return match;
    }
  }

  return null;
}

function getTextContent(element) {
  if (!element) {
    return "";
  }

  return [
    element.textContent || "",
    ...(element.children || []).map((child) => getTextContent(child)),
  ].join("");
}

function collectMatchingElements(element, selector, results) {
  if (matchesSelector(element, selector)) {
    results.push(element);
  }

  for (const child of element.children || []) {
    collectMatchingElements(child, selector, results);
  }
}

function matchesSelector(element, selector) {
  if (selector === "[data-source-line]") {
    return Boolean(element.dataset?.sourceLine);
  }

  if (selector.startsWith(".")) {
    return element.className?.split(/\s+/).includes(selector.slice(1));
  }

  return false;
}

const hintRailElement = new FakeElement("aside");
globalThis.document = new FakeDocument();
const linkedPreviousCsvWrites = [];
const linkedPreviousCsvHandle = {
  async createWritable() {
    return {
      async close() {},
      async write(text) {
        linkedPreviousCsvWrites.push(String(text));
      },
    };
  },
  async getFile() {
    return {
      name: "baseline.csv",
      async text() {
        return "anchor,text,translation\nline_anchor_1,Compiler sourced row,Previous translation";
      },
    };
  },
};
globalThis.window = {
  clearTimeout() {},
  async showOpenFilePicker() {
    return [linkedPreviousCsvHandle];
  },
  setTimeout(handler) {
    handler();
    return 1;
  },
};
const hostCapabilityPanel = new FakeElement("section");
let selectedHostCapabilitySource = null;
const hostCapabilityCatalogController = new HostCapabilityCatalogController({
  hostBindingBridge: {
    async getCapabilityCatalog() {
      return hostBindingCatalog;
    },
  },
  hostSchemaBridge: {
    async getCapabilityCatalog() {
      return hostSchemaCatalog;
    },
  },
  panelElement: hostCapabilityPanel,
});
hostCapabilityCatalogController.onSourceLineSelected((selection) => {
  selectedHostCapabilitySource = selection;
});
await hostCapabilityCatalogController.render("");
assertIncludesText(getTextContent(hostCapabilityPanel), "Host Schema");
assertIncludesText(getTextContent(hostCapabilityPanel), "Host Bridge");
assertIncludesText(getTextContent(hostCapabilityPanel), "player.gold");
assertIncludesText(getTextContent(hostCapabilityPanel), "quest.accepted");
assertIncludesText(getTextContent(hostCapabilityPanel), "Narrator");
assertIncludesText(getTextContent(hostCapabilityPanel), "court_intro");
findElementByClass(hostCapabilityPanel, "host-capability-source")?.click();
assertEqual(selectedHostCapabilitySource?.sourcePath, "config/inscape.host.bridge.json", "host capability source button should jump to shared capability source path");
assertEqual(selectedHostCapabilitySource?.lineNumber, 1, "host capability source button should convert source line to editor line number");
const localizationPanel = new FakeElement("section");
const localizationClearDraftsButton = new FakeElement("button");
const localizationReplaceButton = new FakeElement("button");
const localizationExportButton = new FakeElement("button");
const localizationExportUpdatedButton = new FakeElement("button");
const localizationFilterMode = new FakeElement("select");
localizationFilterMode.value = "all";
const localizationFilterSummary = new FakeElement("span");
const localizationSessionStatus = new FakeElement("span");
const localizationOpenButton = new FakeElement("button");
const localizationCsvInput = new FakeElement("input");
const localizationSourceStatus = new FakeElement("span");
let selectedLocalizationSource = null;
const localizationController = new LocalizationEditorController({
  panelElement: localizationPanel,
  draftStore,
  clearVisibleDraftsButtonElement: localizationClearDraftsButton,
  exportDraftButtonElement: localizationExportButton,
  exportUpdatedButtonElement: localizationExportUpdatedButton,
  filterModeElement: localizationFilterMode,
  filterSummaryElement: localizationFilterSummary,
  openPreviousCsvButtonElement: localizationOpenButton,
  previousCsvInputElement: localizationCsvInput,
  previousCsvStatusElement: localizationSourceStatus,
  replacePreviousCsvButtonElement: localizationReplaceButton,
  sessionStatusElement: localizationSessionStatus,
  reviewBridge: {
    async getLocalizationReview() {
      return {
        provider: "localization-review",
        review: {
          presenter: {
            items: [
              {
                actions: [
                  {
                    actionKey: "open-current",
                    detail: "Compiler sourced row",
                    line: 3,
                    sourcePath: "samples/court-loop.inscape",
                    summary: "samples/court-loop.inscape:3:1",
                  },
                  {
                    actionIndex: 0,
                    actionKey: "open-candidate",
                    actionStatus: "similarity 0.950",
                    detail: "samples/previous.inscape:12:1 | Previous text",
                    line: 12,
                    sourcePath: "samples/previous.inscape",
                    summary: "Previous translation",
                  },
                  {
                    actionIndex: 0,
                    actionKey: "show-candidate-diff",
                    detail: "current: Compiler sourced row | previous: Previous text | translation: Previous translation",
                    summary: "current -> previous",
                  },
                ],
                detail: "samples/court-loop.inscape:3:1 <line line_DIALOGUE available> | Compiler sourced row",
                item: {
                  anchor: "line_anchor_1",
                  kind: "Dialogue",
                  line: 3,
                  nodeTitle: "Opening",
                  review: "needs-review",
                  speaker: "Narrator",
                  status: "changed",
                  text: "Compiler sourced row",
                  translation: "Previous translation",
                },
                summary: "translation: Previous translation",
                title: "[changed] Opening - needs-review",
              },
              {
                detail: "samples/court-loop.inscape:8:1 <line line_DIALOGUE_2 available> | Already aligned row",
                item: {
                  anchor: "line_anchor_2",
                  kind: "Dialogue",
                  line: 8,
                  nodeTitle: "Witness",
                  review: "aligned",
                  speaker: "Witness",
                  status: "kept",
                  text: "Already aligned row",
                  translation: "Kept translation",
                },
                summary: "translation: Kept translation",
                title: "[kept] Witness - aligned",
              },
            ],
          },
        },
      };
    },
    async exportUpdatedLocalizationCsv() {
      return {
        csv: "anchor,text,translation\nline_anchor_1,Compiler sourced row,\nline_anchor_2,Already aligned row,Fresh draft",
        provider: "localization-update",
      };
    },
  },
});
localizationController.onSourceLineSelected((selection) => {
  selectedLocalizationSource = selection;
});
await localizationController.render("# Opening\nDraft fallback row");
assertIncludesText(getTextContent(localizationPanel), "Compiler sourced row");
assertIncludesText(getTextContent(localizationPanel), "Previous translation");
assertIncludesText(getTextContent(localizationPanel), "changed");
assertIncludesText(getTextContent(localizationPanel), "Candidate 1");
assertIncludesText(getTextContent(localizationPanel), "Diff 1");
assertIncludesText(getTextContent(localizationPanel), "Already aligned row");
assertIncludesText(getTextContent(localizationPanel), "kept");
assertNotIncludesText(getTextContent(localizationPanel), "Draft fallback row");
findElementByClass(localizationPanel, "localization-review-action-candidate")?.click();
assertEqual(selectedLocalizationSource?.sourcePath, "samples/previous.inscape", "localization candidate action should preserve candidate source path");
assertEqual(selectedLocalizationSource?.lineNumber, 12, "localization candidate action should jump to candidate source line");
findElementByClass(localizationPanel, "localization-review-action-diff")?.click();
assertIncludesText(getTextContent(localizationPanel), "current: Compiler sourced row | previous: Previous text", "localization diff action should reveal shared presenter diff text");
assertEqual(localizationSourceStatus.textContent, "Review baseline: current extract", "localization review should show default review baseline");
assertEqual(localizationFilterSummary.textContent, "Showing 2 of 2 rows", "localization review should show all rows by default");
assertEqual(localizationSessionStatus.textContent, "0 overrides in session | Updated export needs previous CSV | Replace needs linked baseline", "localization session status should explain missing baseline");
assertEqual(localizationClearDraftsButton.disabled, true, "localization clear drafts button should stay disabled without visible drafts");
assertEqual(localizationReplaceButton.disabled, true, "localization replace button should stay disabled without linked previous CSV");
await localizationController.openPreviousCsv();
assertEqual(localizationSourceStatus.textContent, "Review baseline: baseline.csv | linked clean", "localization review should show linked baseline file state");
assertEqual(localizationSessionStatus.textContent, "0 overrides in session | Updated export ready | Linked clean", "localization session status should show linked baseline clean state");
assertEqual(localizationReplaceButton.disabled, true, "localization replace button should stay disabled without unsaved linked drafts");
localizationController.setFilterMode("changed");
assertEqual(localizationFilterMode.value, "changed", "localization filter control should track current filter");
assertEqual(localizationController.getVisibleRows().length, 1, "localization filter should keep only matching changed rows");
assertEqual(localizationPanel.querySelectorAll("[data-source-line]").filter((row) => !row.hidden).length, 1, "localization filter should hide non-matching table rows");
assertEqual(localizationFilterSummary.textContent, "Showing 1 of 2 rows | Changed", "localization filter summary should reflect narrowed rows");
draftStore.setTranslation(localizationController.rows[0], "");
localizationController.applyRowFilters();
const localizationOverrides = localizationController.collectTranslationOverrides();
assertEqual(localizationOverrides.length, 1, "localization controller should collect draft overrides by anchor");
assertEqual(localizationOverrides[0].anchor, "line_anchor_1", "localization controller should preserve review anchor for overrides");
assertEqual(localizationOverrides[0].translation, "", "localization controller should allow clearing previous translations");
assertEqual(localizationClearDraftsButton.disabled, true, "localization clear drafts button should stay disabled when the current filter hides draft rows");
assertEqual(localizationSourceStatus.textContent, "Review baseline: baseline.csv | linked 1 unsaved", "linked baseline status should show unsaved drafts");
assertEqual(localizationSessionStatus.textContent, "1 overrides in session | 0 visible | Updated export ready | Linked 1 unsaved", "localization session status should count hidden empty-string overrides");
assertEqual(localizationReplaceButton.disabled, false, "localization replace button should enable when linked drafts are unsaved");
draftStore.setTranslation(localizationController.rows[1], "Fresh draft");
localizationController.applyRowFilters();
localizationController.setFilterMode("draft");
assertEqual(localizationController.getVisibleRows().length, 2, "localization draft filter should surface anchor-based draft overrides");
assertEqual(localizationFilterSummary.textContent, "Showing 2 of 2 rows | Drafts", "localization draft filter summary should reflect draft rows");
assertEqual(localizationSourceStatus.textContent, "Review baseline: baseline.csv | linked 2 unsaved", "linked baseline status should update with multiple unsaved drafts");
assertEqual(localizationSessionStatus.textContent, "2 overrides in session | Updated export ready | Linked 2 unsaved", "localization session status should count visible draft overrides");
assertEqual(localizationClearDraftsButton.disabled, false, "localization clear drafts button should enable when the current filter shows draft rows");
await localizationController.clearVisibleDrafts();
assertEqual(localizationController.getVisibleRows().length, 0, "localization clear visible drafts should empty the current draft filter");
assertEqual(localizationFilterSummary.textContent, "Showing 0 of 2 rows | Drafts", "localization filter summary should reflect cleared visible drafts");
assertEqual(localizationSourceStatus.textContent, "Review baseline: baseline.csv | linked clean", "linked baseline status should reset after clearing visible drafts");
assertEqual(localizationSessionStatus.textContent, "0 overrides in session | Updated export ready | Linked clean", "localization session status should reset after clearing visible drafts");
assertEqual(localizationClearDraftsButton.disabled, true, "localization clear drafts button should disable after clearing visible drafts");
assertEqual(localizationReplaceButton.disabled, true, "localization replace button should disable after clearing visible drafts");
draftStore.setTranslation(localizationController.rows[0], "");
draftStore.setTranslation(localizationController.rows[1], "Fresh draft");
localizationController.applyRowFilters();
await localizationController.replacePreviousCsv();
assertEqual(linkedPreviousCsvWrites.length, 1, "localization replace should write updated csv through the linked file handle");
assertIncludesText(linkedPreviousCsvWrites[0], "Fresh draft");
assertEqual(localizationSourceStatus.textContent, "Review baseline: baseline.csv | linked clean", "localization replace should reset linked baseline state after writing");
assertEqual(localizationSessionStatus.textContent, "0 overrides in session | Updated export ready | Linked clean", "localization replace should clear session drafts after writing");
assertEqual(localizationReplaceButton.disabled, true, "localization replace should disable once linked baseline is clean");
const nodeMapButton = new FakeElement("button");
let selectedNodeMapLine = 0;
const nodeMapReviewController = new StoryNodeMapReviewController({
  reviewBridge: {
    async reviewNodeMap() {
      return {
        provider: "node-map-review",
        review: {
          nodeMapPath: "inscape.node-map.json",
          nodeMapText: "{\n  \"format\": \"inscape.node-map\"\n}",
          report: {
            items: [
              {
                candidates: [
                  {
                    score: 23,
                    sourceLine: 4,
                    sourcePath: "story.inscape",
                    stableId: "node_OLD",
                    title: "Opening",
                  },
                ],
                kind: "manual-review",
                message: "Multiple rename candidates matched this title.",
                previousTitle: "",
                sourceLine: 12,
                sourcePath: "story.inscape",
                stableId: "node_NEW",
                status: "active",
                title: "Court Opening",
              },
            ],
            summary: {
              conflictNodeCount: 0,
              manualReviewCount: 1,
              missingNodeCount: 0,
              newNodeCount: 1,
              renamedNodeCount: 0,
            },
          },
        },
      };
    },
  },
  reviewButtonElement: nodeMapButton,
});
nodeMapReviewController.onSourceLineSelected((selection) => {
  selectedNodeMapLine = selection.lineNumber;
});
await nodeMapReviewController.review("# Court Opening\nNarrator: Hello");
assertEqual(nodeMapButton.textContent, "Node Map", "stable node map review button should reset after summary status");
assertIncludesText(getTextContent(document.body), "Stable Node Map");
assertIncludesText(getTextContent(document.body), "Court Opening");
assertIncludesText(getTextContent(document.body), "manual-review");
assertIncludesText(getTextContent(document.body), "Opening · score 23");
const nodeMapReviewItemButton = findElementByClass(document.body, "node-map-review-item-main");
nodeMapReviewItemButton?.click();
assertEqual(selectedNodeMapLine, 12, "stable node map review item should jump to its current source line");
const previewElement = new FakeElement("main");
const previewController = new PreviewPanelController(previewElement);
let previewSelectedLine = 0;
previewController.onSourceLineSelected((lineNumber) => {
  previewSelectedLine = lineNumber;
});
previewController.render("", 2, storyGraph);
assertEqual(previewController.documentModel.nodes[0].lines[1].speaker, "Narrator", "preview should consume compiler story graph lines");
assertEqual(previewController.documentModel.nodes[0].choices[0].prompt, "Choose action", "preview should consume compiler story graph choices");
assertEqual(findElementByClass(previewElement, "story-metadata-tag")?.textContent, "scene court", "preview should render compiler metadata tags");
assertIncludesText(getTextContent(previewElement), "Review the evidence.");
assertEqual(findElementByClass(previewElement, "choice-prompt")?.textContent, "Choose action", "preview should render compiler choice prompt");
const previewChoice = previewController.normalizeChoiceGroups(previewController.latestStoryModel.choices)[0].options[0];
await previewController.selectChoice(previewChoice);
assertEqual(findElementByClass(previewElement, "story-title")?.textContent, "Witness", "preview choice click should navigate the reading pane to the target node");
assertIncludesText(getTextContent(previewElement), "I saw the clock stop.");
assertEqual(previewSelectedLine, 8, "preview choice click should still reveal the target source line in the editor");
const runtimePreviewElement = new FakeElement("main");
const runtimePreviewController = new PreviewPanelController(runtimePreviewElement);
const runtimeOpeningSnapshot = {
  currentNode: {
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
    defaultNext: "",
    lines: [
      {
        kind: "Dialogue",
        source: {
          line: 3,
          sourcePath: "samples/court-loop.inscape",
        },
        speaker: "Narrator",
        text: "Review the evidence.",
      },
    ],
    name: "Opening",
    source: {
      line: 1,
      sourcePath: "samples/court-loop.inscape",
    },
  },
  state: {
    currentNodeName: "Opening",
    path: ["Opening"],
    visibleStepCount: 0,
  },
  readingProgress: {
    canAdvance: true,
    canRewind: false,
    contentStepCount: 1,
    isChoiceStageVisible: false,
    isContinueStageVisible: false,
    maxVisibleStepCount: 2,
    visibleStepCount: 0,
  },
};
const runtimeWitnessSnapshot = {
  currentNode: {
    choices: [],
    defaultNext: "End",
    lines: [
      {
        kind: "Dialogue",
        source: {
          line: 9,
          sourcePath: "samples/court-loop.inscape",
        },
        speaker: "Witness",
        text: "I saw the clock stop.",
      },
    ],
    name: "Witness",
    source: {
      line: 8,
      sourcePath: "samples/court-loop.inscape",
    },
  },
  state: {
    currentNodeName: "Witness",
    path: ["Opening", "Witness"],
    visibleStepCount: 0,
  },
  readingProgress: {
    canAdvance: true,
    canRewind: false,
    contentStepCount: 1,
    isChoiceStageVisible: false,
    isContinueStageVisible: false,
    maxVisibleStepCount: 2,
    visibleStepCount: 0,
  },
};
const runtimeEndSnapshot = {
  currentNode: {
    choices: [],
    defaultNext: "",
    lines: [
      {
        kind: "Dialogue",
        source: {
          line: 12,
          sourcePath: "samples/court-loop.inscape",
        },
        speaker: "Narrator",
        text: "Done.",
      },
    ],
    name: "End",
    source: {
      line: 11,
      sourcePath: "samples/court-loop.inscape",
    },
  },
  state: {
    currentNodeName: "End",
    path: ["Opening", "Witness", "End"],
    visibleStepCount: 0,
  },
  readingProgress: {
    canAdvance: false,
    canRewind: false,
    contentStepCount: 1,
    isChoiceStageVisible: false,
    isContinueStageVisible: false,
    maxVisibleStepCount: 1,
    visibleStepCount: 0,
  },
};
const runtimeOpeningLineSnapshot = {
  ...runtimeOpeningSnapshot,
  state: {
    ...runtimeOpeningSnapshot.state,
    visibleStepCount: 1,
  },
  readingProgress: {
    ...runtimeOpeningSnapshot.readingProgress,
    canRewind: true,
    visibleStepCount: 1,
  },
};
const runtimeOpeningChoiceStageSnapshot = {
  ...runtimeOpeningSnapshot,
  state: {
    ...runtimeOpeningSnapshot.state,
    visibleStepCount: 2,
  },
  readingProgress: {
    ...runtimeOpeningSnapshot.readingProgress,
    canAdvance: false,
    canRewind: true,
    isChoiceStageVisible: true,
    visibleStepCount: 2,
  },
};
let runtimeAction = null;
runtimePreviewController.onChoiceSelected(async (choice) => {
  runtimeAction = choice.runtimeAction;
  runtimePreviewController.renderRuntimeSnapshot(runtimeWitnessSnapshot);
  return true;
});
runtimePreviewController.render("", 2, storyGraph, runtimeOpeningSnapshot);
const runtimeChoice = {
  ...runtimePreviewController.normalizeChoiceGroups(runtimePreviewController.latestStoryModel.choices)[0].options[0],
  nodeTitle: "Opening",
  runtimeAction: {
    groupIndex: 0,
    optionIndex: 0,
    type: "choose",
  },
};
await runtimePreviewController.selectChoice(runtimeChoice);
assertEqual(runtimeAction?.type, "choose", "runtime-backed preview choice should emit choose action");
assertEqual(runtimeAction?.groupIndex, 0, "runtime-backed preview choice should preserve choice group index");
assertEqual(runtimeAction?.optionIndex, 0, "runtime-backed preview choice should preserve choice option index");
assertEqual(findElementByClass(runtimePreviewElement, "story-title")?.textContent, "Witness", "runtime-backed preview choice should re-render from returned runtime node");
assertIncludesText(getTextContent(runtimePreviewElement), "I saw the clock stop.");
const runtimePreferredPreviewElement = new FakeElement("main");
const runtimePreferredPreviewController = new PreviewPanelController(runtimePreferredPreviewElement);
runtimePreferredPreviewController.render("", 8, storyGraph, runtimeWitnessSnapshot);
assertEqual(findElementByClass(runtimePreferredPreviewElement, "story-title")?.textContent, "Witness", "preview should prefer runtime current node when active line stays inside that node");
assertIncludesText(getTextContent(runtimePreferredPreviewElement), "I saw the clock stop.");
const runtimeInitialPreviewElement = new FakeElement("main");
const runtimeInitialPreviewController = new PreviewPanelController(runtimeInitialPreviewElement);
runtimeInitialPreviewController.render("", 1, storyGraph, runtimeWitnessSnapshot);
assertEqual(findElementByClass(runtimeInitialPreviewElement, "story-title")?.textContent, "Witness", "preview should start from the runtime current node before the first presenter node is established");
assertIncludesText(getTextContent(runtimeInitialPreviewElement), "I saw the clock stop.");
const runtimeMismatchPreviewElement = new FakeElement("main");
const runtimeMismatchPreviewController = new PreviewPanelController(runtimeMismatchPreviewElement);
runtimeMismatchPreviewController.render("", 2, storyGraph, runtimeWitnessSnapshot);
assertEqual(findElementByClass(runtimeMismatchPreviewElement, "story-title")?.textContent, "Opening", "preview should fall back to compiler graph when active line and runtime node are out of sync");
assertIncludesText(getTextContent(runtimeMismatchPreviewElement), "Review the evidence.");
let runtimeContinueAction = null;
const runtimeContinuePreviewElement = new FakeElement("main");
const runtimeContinuePreviewController = new PreviewPanelController(runtimeContinuePreviewElement);
runtimeContinuePreviewController.onChoiceSelected(async (choice) => {
  runtimeContinueAction = choice.runtimeAction;
  runtimeContinuePreviewController.renderRuntimeSnapshot(runtimeEndSnapshot);
  return true;
});
runtimeContinuePreviewController.renderRuntimeSnapshot(runtimeWitnessSnapshot);
assertIncludesText(getTextContent(runtimeContinuePreviewElement), "continue");
const runtimeContinueChoice = runtimeContinuePreviewController.normalizeChoiceGroups(
  runtimeContinuePreviewController.latestStoryModel.choices
)[0].options[0];
await runtimeContinuePreviewController.selectChoice(runtimeContinueChoice);
assertEqual(runtimeContinueAction?.type, "continue", "runtime-backed preview continue should emit continue action");
assertEqual(findElementByClass(runtimeContinuePreviewElement, "story-title")?.textContent, "End", "runtime-backed continue should render returned runtime node");
assertIncludesText(getTextContent(runtimeContinuePreviewElement), "Done.");
let runtimeFlowAction = null;
const runtimeFlowPreviewElement = new FakeElement("main");
const runtimeFlowPreviewController = new PreviewPanelController(runtimeFlowPreviewElement);
runtimeFlowPreviewController.onChoiceSelected(async (choice) => {
  runtimeFlowAction = choice.runtimeAction;
  if (choice.runtimeAction?.type === "advance-flow") {
    runtimeFlowPreviewController.renderRuntimeSnapshot(runtimeOpeningLineSnapshot);
    return true;
  }

  if (choice.runtimeAction?.type === "rewind-flow") {
    runtimeFlowPreviewController.renderRuntimeSnapshot(runtimeOpeningSnapshot);
    return true;
  }

  return false;
});
runtimeFlowPreviewController.render("", 2, storyGraph, runtimeOpeningSnapshot);
runtimeFlowPreviewController.setMode("flow");
assertNotIncludesText(getTextContent(runtimeFlowPreviewElement), "Review the evidence.");
await runtimeFlowPreviewController.advanceFlow();
assertEqual(runtimeFlowAction?.type, "advance-flow", "runtime-backed flow should emit advance-flow action");
assertIncludesText(getTextContent(runtimeFlowPreviewElement), "Review the evidence.");
runtimeFlowPreviewController.renderRuntimeSnapshot(runtimeOpeningChoiceStageSnapshot);
assertIncludesText(getTextContent(runtimeFlowPreviewElement), "Question witness");
await runtimeFlowPreviewController.rewindFlow();
assertEqual(runtimeFlowAction?.type, "rewind-flow", "runtime-backed flow should emit rewind-flow action");
assertNotIncludesText(getTextContent(runtimeFlowPreviewElement), "Question witness");
let runtimeRewindAction = null;
const runtimeRewindPreviewElement = new FakeElement("main");
const runtimeRewindPreviewController = new PreviewPanelController(runtimeRewindPreviewElement);
runtimeRewindPreviewController.onChoiceSelected(async (choice) => {
  runtimeRewindAction = choice.runtimeAction;
  runtimeRewindPreviewController.renderRuntimeSnapshot(runtimeOpeningChoiceStageSnapshot);
  return true;
});
runtimeRewindPreviewController.renderRuntimeSnapshot(runtimeWitnessSnapshot);
assertIncludesText(getTextContent(runtimeRewindPreviewElement), "Back");
assertIncludesText(getTextContent(runtimeRewindPreviewElement), "Opening");
assertIncludesText(getTextContent(runtimeRewindPreviewElement), "Witness");
const runtimeRewindButton = findElementByClass(runtimeRewindPreviewElement, "story-runtime-back-button");
runtimeRewindButton?.click();
assertEqual(runtimeRewindAction?.type, "rewind", "runtime-backed preview rewind should emit rewind action");
assertEqual(findElementByClass(runtimeRewindPreviewElement, "story-title")?.textContent, "Opening", "runtime-backed rewind should render the previous runtime node");
assertIncludesText(getTextContent(runtimeRewindPreviewElement), "Review the evidence.");
assertIncludesText(getTextContent(runtimeRewindPreviewElement), "Question witness");
const flowPreviewElement = new FakeElement("main");
const flowPreviewController = new PreviewPanelController(flowPreviewElement);
flowPreviewController.render("", 2, storyGraph);
flowPreviewController.setMode("flow");
assertEqual(findElementByClass(flowPreviewElement, "story-metadata-tag")?.textContent, "scene court", "flow should reveal leading metadata with the title");
assertEqual(flowPreviewElement.querySelectorAll(".story-line-metadata").length, 0, "flow metadata should attach to nearby content instead of becoming a standalone line");
assertNotIncludesText(getTextContent(flowPreviewElement), "Review the evidence.");
assertNotIncludesText(getTextContent(flowPreviewElement), "after_line");
flowPreviewController.advanceFlow();
assertEqual(Boolean(findElementByClass(flowPreviewElement, "story-speaker-name-enter")), true, "flow speaker should fade in separately");
assertEqual(Boolean(findElementByClass(flowPreviewElement, "story-typewriter-body")), true, "flow body should use typewriter body");
assertNotIncludesText(getTextContent(flowPreviewElement), "Review the evidence.");
assertEqual(flowPreviewController.getVisibleLines(flowPreviewController.latestStoryModel).some((line) => line.text === "@emit after_line"), true, "flow trailing metadata should reveal with the preceding content step");
flowPreviewController.clearTypewriterTimer();
flowPreviewElement.scrollTop = 0;
flowPreviewElement.clientHeight = 100;
flowPreviewElement.scrollHeight = 400;
const shallowRewindWheel = createWheelEvent(-80);
flowPreviewController.handlePreviewWheel(shallowRewindWheel);
assertEqual(flowPreviewController.flowVisibleLineCount, 1, "flow wheel should wait for rewind threshold");
assertEqual(shallowRewindWheel.defaultPrevented, true, "flow wheel should hold boundary scroll while accumulating rewind");
flowPreviewController.handlePreviewWheel(createWheelEvent(-100));
assertEqual(flowPreviewController.flowVisibleLineCount, 0, "flow wheel should rewind one step after the top-boundary threshold");
flowPreviewElement.scrollTop = 300;
const shallowAdvanceWheel = createWheelEvent(159);
flowPreviewController.handlePreviewWheel(shallowAdvanceWheel);
assertEqual(flowPreviewController.flowVisibleLineCount, 0, "flow wheel should wait for advance threshold");
flowPreviewController.handlePreviewWheel(createWheelEvent(1));
assertEqual(flowPreviewController.flowVisibleLineCount, 1, "flow wheel should advance one step after the bottom-boundary threshold");
flowPreviewController.clearTypewriterTimer();
flowPreviewController.advanceFlow();
assertEqual(flowPreviewController.flowVisibleLineCount, 2, "flow choices should become visible after body lines");
const blockedChoiceWheel = createWheelEvent(320);
flowPreviewController.handlePreviewWheel(blockedChoiceWheel);
assertEqual(flowPreviewController.flowVisibleLineCount, 2, "flow wheel should not fast-forward when choices are visible");
assertEqual(blockedChoiceWheel.defaultPrevented, false, "flow choice wheel should not consume disabled fast-forward scroll");
flowPreviewElement.scrollTop = 0;
flowPreviewController.handlePreviewWheel(createWheelEvent(-160));
assertEqual(flowPreviewController.flowVisibleLineCount, 1, "flow wheel should rewind from the visible choice step");
const degradedStoryGraph = {
  ...storyGraph,
  nodes: storyGraph.nodes.map((node) => ({
    ...node,
    previewLines: [],
  })),
};
const originalConsoleError = console.error;
const previewContractErrors = [];
console.error = (...args) => {
  previewContractErrors.push(args.map((arg) => String(arg)).join(" "));
};
try {
  previewController.render(`# Opening
@scene fallback
Narrator: Fallback body.
? Choose action
- Question witness -> Witness

# Witness
Witness: Fallback witness body.`, 2, degradedStoryGraph);
} finally {
  console.error = originalConsoleError;
}
assertIncludesText(getTextContent(previewElement), "Compiler story graph contract violation");
assertIncludesText(getTextContent(previewElement), "previewLines");
assertIncludesText(getTextContent(previewElement), "Opening");
assertNotIncludesText(getTextContent(previewElement), "Fallback body.");
assertIncludesText(previewContractErrors.join("\n"), "SelfHostedEditor preview contract error");
const editorSurfaceController = new EditorSurfaceController(new FakeElement("div"), hintRailElement, createFakeMonaco(identityDocumentModel));
editorSurfaceController.renderAuthoringState(`# Start
旁白：Hello
? Prompt
- Choice -> Start
@entry`, lineIdentityProvider);
const stableIdElement = findElementByClass(hintRailElement, "hint-stable-id");
assertEqual(Boolean(findElementByClass(hintRailElement, "has-stable-id")), true, "line hint host should expose stable id hover state");
assertEqual(stableIdElement?.textContent, "DIALOGUE", "line hint should render stable id text without line prefix");
assertEqual(Boolean(findElementByClass(hintRailElement, "hint-stable-id-copy")), true, "line hint should expose stable id copy control");

console.log("SelfHostedEditor model contracts ok");

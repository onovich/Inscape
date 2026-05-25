import { ScriptDiagnosticsModelBuilder } from "../Scripts/ProjectWorkspace/Models/ScriptDiagnosticsModelBuilder.js";
import { ScriptDocumentModelBuilder } from "../Scripts/ProjectWorkspace/Models/ScriptDocumentModelBuilder.js";
import { ScriptLineIdentityModelBuilder } from "../Scripts/ProjectWorkspace/Models/ScriptLineIdentityModelBuilder.js";
import { ScriptNodeRenamePatchBuilder } from "../Scripts/ProjectWorkspace/Models/ScriptNodeRenamePatchBuilder.js";
import { ProjectWorkspaceSummaryModelBuilder } from "../Scripts/ProjectWorkspace/Models/ProjectWorkspaceSummaryModelBuilder.js";
import { LocalizationDraftCsvBuilder } from "../Scripts/Localization/Models/LocalizationDraftCsvBuilder.js";
import { LocalizationDraftStore } from "../Scripts/Localization/Models/LocalizationDraftStore.js";
import { EditorHoverTargetModelBuilder } from "../Scripts/EditorAuthoring/Models/EditorHoverTargetModelBuilder.js";
import { EditorCompletionTargetModelBuilder } from "../Scripts/EditorAuthoring/Models/EditorCompletionTargetModelBuilder.js";
import { EditorSurfaceController } from "../Scripts/EditorAuthoring/Controllers/EditorSurfaceController.js";
import { EditorReferenceOverlayController } from "../Scripts/EditorAuthoring/Controllers/EditorReferenceOverlayController.js";
import { LanguageServerCompletionModelMapper } from "../Scripts/LanguageServer/Models/LanguageServerCompletionModelMapper.js";
import { LanguageServerDefinitionModelMapper } from "../Scripts/LanguageServer/Models/LanguageServerDefinitionModelMapper.js";
import { LanguageServerDiagnosticModelMapper } from "../Scripts/LanguageServer/Models/LanguageServerDiagnosticModelMapper.js";
import { LanguageServerReferenceModelMapper } from "../Scripts/LanguageServer/Models/LanguageServerReferenceModelMapper.js";
import { LanguageServerDocumentSymbolModelMapper } from "../Scripts/LanguageServer/Models/LanguageServerDocumentSymbolModelMapper.js";
import { LanguageServerStoryGraphModelMapper } from "../Scripts/LanguageServer/Models/LanguageServerStoryGraphModelMapper.js";
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
assertEqual(completionTarget?.typedPrefix, "Wi", "completion target prefix");
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
findElementByClass(previewElement, "choice-button")?.click();
assertEqual(findElementByClass(previewElement, "story-title")?.textContent, "Witness", "preview choice click should navigate the reading pane to the target node");
assertIncludesText(getTextContent(previewElement), "I saw the clock stop.");
assertEqual(previewSelectedLine, 8, "preview choice click should still reveal the target source line in the editor");
const flowPreviewElement = new FakeElement("main");
const flowPreviewController = new PreviewPanelController(flowPreviewElement);
flowPreviewController.render("", 2, storyGraph);
flowPreviewController.setMode("flow");
assertNotIncludesText(getTextContent(flowPreviewElement), "Review the evidence.");
flowPreviewController.advanceFlow();
assertEqual(findElementByClass(flowPreviewElement, "story-metadata-tag")?.textContent, "scene court", "flow first click should reveal metadata");
flowPreviewController.advanceFlow();
assertEqual(Boolean(findElementByClass(flowPreviewElement, "story-speaker-name-enter")), true, "flow speaker should fade in separately");
assertEqual(Boolean(findElementByClass(flowPreviewElement, "story-typewriter-body")), true, "flow body should use typewriter body");
assertNotIncludesText(getTextContent(flowPreviewElement), "Review the evidence.");
flowPreviewController.clearTypewriterTimer();
flowPreviewElement.scrollTop = 0;
flowPreviewElement.clientHeight = 100;
flowPreviewElement.scrollHeight = 400;
const shallowRewindWheel = createWheelEvent(-80);
flowPreviewController.handlePreviewWheel(shallowRewindWheel);
assertEqual(flowPreviewController.flowVisibleLineCount, 2, "flow wheel should wait for rewind threshold");
assertEqual(shallowRewindWheel.defaultPrevented, true, "flow wheel should hold boundary scroll while accumulating rewind");
flowPreviewController.handlePreviewWheel(createWheelEvent(-100));
assertEqual(flowPreviewController.flowVisibleLineCount, 1, "flow wheel should rewind one step after the top-boundary threshold");
flowPreviewElement.scrollTop = 300;
const shallowAdvanceWheel = createWheelEvent(159);
flowPreviewController.handlePreviewWheel(shallowAdvanceWheel);
assertEqual(flowPreviewController.flowVisibleLineCount, 1, "flow wheel should wait for advance threshold");
flowPreviewController.handlePreviewWheel(createWheelEvent(1));
assertEqual(flowPreviewController.flowVisibleLineCount, 2, "flow wheel should advance one step after the bottom-boundary threshold");
flowPreviewController.clearTypewriterTimer();
flowPreviewController.advanceFlow();
assertEqual(flowPreviewController.flowVisibleLineCount, 3, "flow choices should become visible after body lines");
const blockedChoiceWheel = createWheelEvent(320);
flowPreviewController.handlePreviewWheel(blockedChoiceWheel);
assertEqual(flowPreviewController.flowVisibleLineCount, 3, "flow wheel should not fast-forward when choices are visible");
assertEqual(blockedChoiceWheel.defaultPrevented, false, "flow choice wheel should not consume disabled fast-forward scroll");
flowPreviewElement.scrollTop = 0;
flowPreviewController.handlePreviewWheel(createWheelEvent(-160));
assertEqual(flowPreviewController.flowVisibleLineCount, 2, "flow wheel should rewind from the visible choice step");
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

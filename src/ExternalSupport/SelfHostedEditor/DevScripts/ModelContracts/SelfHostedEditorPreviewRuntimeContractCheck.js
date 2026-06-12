import { EditorSurfaceController } from "../../Scripts/EditorAuthoring/Controllers/EditorSurfaceController.js";
import { PreviewPanelController } from "../../Scripts/Preview/Controllers/PreviewPanelController.js";
import { assertEqual, assertIncludesText, assertNotIncludesText, createFakeMonaco, createWheelEvent, FakeElement, findElementByClass, getTextContent, installFakeDomEnvironment } from "./SelfHostedEditorModelContractHarness.js";
import { identityDocumentModel, lineIdentityProvider } from "./SelfHostedEditorModelShapeContractCheck.js";
import { storyGraph } from "./SelfHostedEditorStoryGraphContractCheck.js";

installFakeDomEnvironment();

const hintRailElement = new FakeElement("aside");
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


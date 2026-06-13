import { EditorReferenceOverlayController } from "../../Scripts/EditorAuthoring/Controllers/EditorReferenceOverlayController.js";
import { LanguageServerStoryGraphModelMapper } from "../../Scripts/LanguageServer/Models/LanguageServerStoryGraphModelMapper.js";
import { StoryGraphPreviewController } from "../../Scripts/StoryGraph/Controllers/StoryGraphPreviewController.js";
import { assertEqual, assertIncludesText, assertNotIncludesText, FakeElement, getTextContent, installFakeDomEnvironment } from "./SelfHostedEditorModelContractHarness.js";

installFakeDomEnvironment();
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};

export const storyGraph = LanguageServerStoryGraphModelMapper.mapProjectGraph({
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
const compilerGraphPanel = new FakeElement("section");
const compilerGraphController = new StoryGraphPreviewController(compilerGraphPanel);
compilerGraphController.render(storyGraph);
assertEqual(compilerGraphPanel.dataset.graphProvider, "compiler-project", "story graph should mark compiler provider");
assertIncludesText(getTextContent(compilerGraphPanel), "Compiler graph");
assertIncludesText(getTextContent(compilerGraphPanel), "Opening");
const offlineGraphPanel = new FakeElement("section");
const offlineGraphController = new StoryGraphPreviewController(offlineGraphPanel);
offlineGraphController.render(null, `# Offline
Narrator: Offline graph body.`);
assertEqual(offlineGraphPanel.dataset.graphProvider, "offline-draft", "story graph should mark offline draft provider");
assertIncludesText(getTextContent(offlineGraphPanel), "Offline draft graph");
assertIncludesText(getTextContent(offlineGraphPanel), "Offline");
const malformedGraphPanel = new FakeElement("section");
const malformedGraphController = new StoryGraphPreviewController(malformedGraphPanel);
const originalConsoleError = console.error;
console.error = () => {};
try {
  malformedGraphController.render({
    edges: [],
    nodes: [
      {
        sourceLine: 1,
        title: "Broken",
      },
    ],
    provider: "compiler-project",
  }, `# Offline
Narrator: Should not appear.`);
} finally {
  console.error = originalConsoleError;
}
assertEqual(malformedGraphPanel.dataset.graphProvider, "contract-error", "malformed story graph should mark contract error");
assertIncludesText(getTextContent(malformedGraphPanel), "Graph data error");
assertIncludesText(getTextContent(malformedGraphPanel), "choices and jumps");
assertNotIncludesText(getTextContent(malformedGraphPanel), "Offline draft graph");
assertNotIncludesText(getTextContent(malformedGraphPanel), "Should not appear");
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


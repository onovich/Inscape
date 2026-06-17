import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  compactLocalizationReviewPayload,
  compactProjectGraphPayload,
  compactRuntimeStatePayload,
  compactStoryNodeMapApplyPayload,
  compactStoryNodeMapReviewPayload,
  relativizeHostBindingCapabilityPaths,
  relativizeLanguageServerSemanticPaths,
  relativizeLocalizationReviewPaths,
  relativizeProjectSourcePaths,
  relativizeSourcePath,
  relativizeStoryNodeMapReviewPaths,
} from "./SelfHostedEditorPayloadBridge.js";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = path.join(moduleRoot, ".payload-bridge-contract-root");
const sourcePath = path.join(tempRoot, "Stories", "opening.inscape");
const sidecarPath = path.join(tempRoot, "inscape.node-map.json");

const projectPayload = relativizeProjectSourcePaths({
  currentNode: {
    choices: [
      {
        options: [
          {
            source: { sourcePath, line: 5 },
            target: "Next",
            text: "Continue",
          },
        ],
        prompt: "Choose",
        source: { sourcePath, line: 4 },
      },
    ],
    defaultNext: "Next",
    lines: [
      {
        anchor: "line_001",
        kind: "dialogue",
        raw: "Narrator: Hello",
        source: { sourcePath, line: 3 },
        speaker: "Narrator",
        text: "Hello",
      },
    ],
    name: "Opening",
    source: { sourcePath, line: 1 },
  },
  diagnostics: [],
  documents: [
    {
      edges: [
        {
          from: "Opening",
          kind: "choice",
          label: "Continue",
          source: { sourcePath, line: 5 },
          to: "Next",
        },
      ],
      nodes: [
        {
          choices: [],
          defaultNext: "Next",
          lines: [
            {
              anchor: "line_001",
              extraReportState: "trim me",
              kind: "dialogue",
              raw: "Narrator: Hello",
              source: { sourcePath, line: 3 },
              speaker: "Narrator",
              text: "Hello",
            },
          ],
          name: "Opening",
          source: { sourcePath, line: 1 },
        },
      ],
      sourcePath,
    },
  ],
  entryNodeName: "Opening",
  hasErrors: false,
}, tempRoot);
assert.equal(projectPayload.documents[0].sourcePath, "Stories/opening.inscape");
assert.equal(projectPayload.documents[0].nodes[0].source.sourcePath, "Stories/opening.inscape");
assert.equal(projectPayload.currentNode.source.sourcePath, "Stories/opening.inscape");

const compactProjectPayload = compactProjectGraphPayload(projectPayload);
assert.equal(compactProjectPayload.format, "inscape.self-hosted-editor.story-graph");
assert.equal(compactProjectPayload.documents[0].nodes[0].lineCount, 1);
assert.equal(Object.hasOwn(compactProjectPayload.documents[0].nodes[0].lines[0], "extraReportState"), false);

const compactRuntimePayload = compactRuntimeStatePayload({
  currentNode: projectPayload.currentNode,
  readingProgress: {
    canAdvance: true,
    canRewind: true,
    contentStepCount: 3,
    isChoiceStageVisible: true,
    isContinueStageVisible: false,
    maxVisibleStepCount: 4,
    visibleStepCount: 2,
  },
  state: {
    currentNodeName: "Opening",
    path: ["Opening"],
    visibleStepCount: 2,
  },
}, " Runtime Session!? ");
assert.equal(compactRuntimePayload.sessionId, "Runtime-Session--");
assert.equal(compactRuntimePayload.currentNode.source.sourcePath, "Stories/opening.inscape");

const localizationReport = relativizeLocalizationReviewPaths({
  debugSections: ["trim me"],
  lineIdentity: {
    sourcePath,
    status: "available",
  },
  presenter: {
    items: [
      {
        actions: [
          {
            actionIndex: 1,
            actionKey: "open-current",
            column: 2,
            detail: "trim non-diff detail",
            length: 8,
            line: 3,
            sourcePath,
            title: "Current",
          },
          {
            actionIndex: 2,
            actionKey: "open-candidate",
            actionStatus: "similarity 0.950 / rankPenalty 2 / same-line-id / line line_OLD available fp oldfingerpri",
            column: 3,
            detail: "trim candidate detail",
            length: 4,
            line: 4,
            sourcePath,
            summary: "Previous translation",
            title: "Candidate",
          },
          {
            ActionIndex: 3,
            ActionKey: "show-candidate-diff",
            Column: 4,
            Detail: "current: Hello | previous: Hi",
            Length: 5,
            Line: 4,
            SourcePath: sourcePath,
            Title: "Diff",
          },
        ],
        detail: "review detail",
        item: {
          anchor: "line_001",
          kind: "dialogue",
          line: 3,
          lineFingerprint: "currentfingerprint012345",
          lineId: "line_CURRENT",
          lineIdentityStatus: "available",
          nodeTitle: "Opening",
          review: "changed",
          speaker: "Narrator",
          status: "changed",
          text: "Hello",
          translation: "Hi",
        },
        line: 3,
        sourcePath,
        summary: "Changed translation",
        title: "Opening",
      },
    ],
  },
  summary: {
    changed: 1,
  },
}, tempRoot);
const compactLocalizationPayload = compactLocalizationReviewPayload(localizationReport, {
  metadata: {
    byteLength: 42,
    source: "request",
  },
});
assert.equal(compactLocalizationPayload.format, "inscape.self-hosted-editor.localization-review");
assert.equal(compactLocalizationPayload.formatVersion, 2);
assert.equal(Object.hasOwn(compactLocalizationPayload, "items"), false);
assert.equal(Object.hasOwn(compactLocalizationPayload, "debugSections"), false);
assert.equal(compactLocalizationPayload.presenter.items.length, 1);
assert.equal(compactLocalizationPayload.presenter.items[0].sourcePath, "Stories/opening.inscape");
assert.equal(compactLocalizationPayload.presenter.items[0].item.lineId, "line_CURRENT");
assert.equal(compactLocalizationPayload.presenter.items[0].item.lineIdentityStatus, "available");
assert.equal(compactLocalizationPayload.presenter.items[0].item.lineFingerprint, "currentfingerprint012345");
assert.equal(compactLocalizationPayload.presenter.items[0].actions[0].detail, "");
assert.equal(compactLocalizationPayload.presenter.items[0].actions[1].actionStatus, "similarity 0.950 / rankPenalty 2 / same-line-id / line line_OLD available fp oldfingerpri");
assert.equal(compactLocalizationPayload.presenter.items[0].actions[1].summary, "");
assert.equal(compactLocalizationPayload.presenter.items[0].actions[1].detail, "");
assert.equal(compactLocalizationPayload.presenter.items[0].actions[2].detail, "current: Hello | previous: Hi");

const nodeMapReport = relativizeStoryNodeMapReviewPaths({
  format: "inscape.node-map-update-report",
  formatVersion: 1,
  items: [
    {
      candidates: [
        {
          score: 0.9,
          sourceLine: 7,
          sourcePath,
          stableId: "node_existing",
          title: "Existing",
          transient: "trim me",
        },
      ],
      kind: "manual-review",
      message: "Needs review",
      previousTitle: "Old Opening",
      sourceLine: 3,
      sourcePath,
      stableId: "node_opening",
      status: "manual-review",
      title: "Opening",
      transient: "trim me",
    },
  ],
  summary: {
    manualReview: 1,
  },
  workspace: tempRoot,
}, tempRoot);
const compactNodeMapPayload = compactStoryNodeMapReviewPayload({
  nodeMap: {
    format: "inscape.node-map",
  },
  nodeMapPath: sidecarPath,
  nodeMapText: "{}",
  report: nodeMapReport,
  tempRoot,
});
assert.equal(compactNodeMapPayload.report.workspace, "");
assert.equal(Object.hasOwn(compactNodeMapPayload, "items"), false);
assert.equal(compactNodeMapPayload.nodeMapPath, "inscape.node-map.json");
assert.equal(compactNodeMapPayload.report.items[0].sourcePath, "Stories/opening.inscape");
assert.equal(Object.hasOwn(compactNodeMapPayload.report.items[0], "transient"), false);
assert.equal(compactNodeMapPayload.report.items[0].candidates[0].sourcePath, "Stories/opening.inscape");

const compactNodeMapApplyPayload = compactStoryNodeMapApplyPayload({
  candidateStableId: "node_existing",
  dryRun: true,
  itemStableId: "node_opening",
  nodeMap: {
    nodes: [],
  },
  nodeMapPath: sidecarPath,
  nodeMapText: "{}",
  tempRoot,
});
assert.equal(compactNodeMapApplyPayload.format, "inscape.self-hosted-editor.node-map-apply");
assert.equal(compactNodeMapApplyPayload.nodeMapPath, "inscape.node-map.json");

const languageServerPayload = relativizeLanguageServerSemanticPaths({
  definition: {
    location: {
      sourcePath,
    },
  },
  diagnostics: [
    {
      location: {
        sourcePath,
      },
    },
  ],
  hover: {
    location: {
      sourcePath,
    },
  },
  references: [
    {
      location: {
        sourcePath,
      },
    },
  ],
  symbols: [
    {
      location: {
        sourcePath,
      },
    },
  ],
}, tempRoot);
assert.equal(languageServerPayload.definition.location.sourcePath, "Stories/opening.inscape");
assert.equal(languageServerPayload.references[0].location.sourcePath, "Stories/opening.inscape");

const hostBindingPayload = relativizeHostBindingCapabilityPaths({
  bindings: [
    {
      locations: [
        {
          sourcePath,
        },
      ],
      sourcePath,
    },
  ],
  hostBridge: {
    configuredPath: sourcePath,
    resolvedPath: sourcePath,
  },
  speakers: [
    {
      locations: [
        {
          sourcePath,
        },
      ],
      sourcePath,
    },
  ],
}, tempRoot);
assert.equal(hostBindingPayload.speakers[0].sourcePath, "Stories/opening.inscape");
assert.equal(hostBindingPayload.hostBridge.resolvedPath, "Stories/opening.inscape");
assert.equal(relativizeSourcePath(path.join(path.dirname(tempRoot), "inscape-self-hosted-editor-contract", "other.inscape"), tempRoot), "other.inscape");

console.log("SelfHostedEditor payload bridge contract ok");

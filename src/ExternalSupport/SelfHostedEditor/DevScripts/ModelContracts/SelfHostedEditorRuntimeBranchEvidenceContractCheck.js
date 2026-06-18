import { RuntimeBranchEvidencePanelController } from "../../Scripts/Runtime/Controllers/RuntimeBranchEvidencePanelController.js";
import {
  RuntimeBranchEvidenceFormat,
  RuntimeBranchEvidenceFormatVersion,
  RuntimeBranchEvidenceModelBuilder,
} from "../../Scripts/Runtime/Models/RuntimeBranchEvidenceModelBuilder.js";
import {
  assertEqual,
  assertIncludesText,
  assertNotIncludesText,
  findElementByClass,
  FakeElement,
  getTextContent,
  installFakeDomEnvironment,
} from "./SelfHostedEditorModelContractHarness.js";

installFakeDomEnvironment();

const storyGraphModel = {
  documents: [
    {
      nodes: [
        {
          name: "Gate",
          source: {
            column: 1,
            line: 2,
            sourcePath: "samples/runtime-branch.inscape",
          },
        },
      ],
      sourcePath: "samples/runtime-branch.inscape",
    },
  ],
};

const evidenceModel = RuntimeBranchEvidenceModelBuilder.build({
  runtimeSnapshot: {
    provider: "runtime-project",
    snapshot: {
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
          id: "query-1",
          name: "has_item",
          nodeId: "Gate",
          result: {
            kind: "bool",
            value: "true",
          },
          sourceColumn: 4,
          sourceKind: "mock",
          sourceLine: 4,
          syntax: "call",
        },
        {
          arguments: [
            {
              kind: "string",
              value: "mira",
            },
          ],
          branchPath: "conditionalJumps[0].condition",
          choiceGroupIndex: -1,
          choiceOptionIndex: -1,
          conditionalJumpIndex: 0,
          context: "conditional-jump",
          deterministic: false,
          id: "query-2",
          name: "trust",
          nodeId: "Gate",
          result: {
            kind: "number",
            value: "3",
          },
          sourceColumn: 4,
          sourceKind: "delegate",
          sourceLine: 8,
          syntax: "call",
        },
      ],
      currentNode: {
        name: "Gate",
        source: {
          column: 1,
          line: 2,
          sourcePath: "samples/runtime-branch.inscape",
        },
      },
      secretTraceReplayBody: "secret trace body",
    },
  },
  sessionId: "runtime-branch-session",
  storyGraphModel,
  workspaceRevision: 11,
});

assertEqual(evidenceModel.format, RuntimeBranchEvidenceFormat, "runtime branch evidence format");
assertEqual(evidenceModel.formatVersion, RuntimeBranchEvidenceFormatVersion, "runtime branch evidence version");
assertEqual(evidenceModel.state, "runtime-ready", "runtime branch evidence ready state");
assertEqual(evidenceModel.provider, "runtime-project", "runtime branch evidence provider");
assertEqual(evidenceModel.entryCount, 2, "runtime branch evidence entry count");
assertEqual(evidenceModel.requeriesHost, false, "runtime branch evidence does not re-query host");
assertEqual(evidenceModel.implementsReplayTimeline, false, "runtime branch evidence does not implement replay timeline");
assertIncludesText(evidenceModel.contentPolicy.excludes.join(","), "host-query-reexecution");
assertIncludesText(evidenceModel.contentPolicy.excludes.join(","), "trace-replay");

assertEqual(evidenceModel.entries[0].queryName, "has_item", "choice evidence query name");
assertEqual(evidenceModel.entries[0].contextLabel, "choice condition", "choice evidence context");
assertEqual(evidenceModel.entries[0].resultLabel.value, "true", "choice evidence result");
assertEqual(evidenceModel.entries[0].argumentLabels[0].value, "silver_key", "choice evidence argument");
assertEqual(evidenceModel.entries[0].sourceKind, "mock", "choice evidence source kind");
assertEqual(evidenceModel.entries[0].source.lineNumber, 4, "choice evidence source line");
assertEqual(evidenceModel.entries[0].source.sourcePath, "samples/runtime-branch.inscape", "choice evidence source path");
assertEqual(evidenceModel.entries[0].hasSource, true, "choice evidence has source");
assertIncludesText(evidenceModel.entries[0].explanation, "Choice condition evaluated to true");
assertEqual(evidenceModel.entries[1].contextLabel, "conditional jump", "jump evidence context");
assertEqual(evidenceModel.entries[1].conditionalJumpIndex, 0, "jump evidence index");
assertEqual(evidenceModel.entries[1].deterministic, false, "jump evidence deterministic flag");
assertIncludesText(evidenceModel.entries[1].explanation, "Conditional jump evaluated to 3");

const serializedEvidence = JSON.stringify(evidenceModel);
assertNotIncludesText(serializedEvidence, "secret trace body");

let selectedLine = null;
const panelElement = new FakeElement("section");
const controller = new RuntimeBranchEvidencePanelController(panelElement);
controller.onSourceLineSelected((selection) => {
  selectedLine = selection;
});
controller.render(evidenceModel);
assertEqual(panelElement.dataset.runtimeBranchState, "runtime-ready", "runtime branch panel dataset");
assertIncludesText(getTextContent(panelElement), "Branch Receipts");
assertIncludesText(getTextContent(panelElement), "has_item");
assertIncludesText(getTextContent(panelElement), "choice condition");
assertIncludesText(getTextContent(panelElement), "result bool:true");
assertIncludesText(getTextContent(panelElement), "args string:silver_key");
assertIncludesText(getTextContent(panelElement), "trust");
assertNotIncludesText(getTextContent(panelElement), "secret trace body");
await findElementByClass(panelElement, "runtime-branch-evidence-source-button").click();
assertEqual(selectedLine.lineNumber, 4, "runtime branch source button line");
assertEqual(selectedLine.sourcePath, "samples/runtime-branch.inscape", "runtime branch source button path");

const emptyEvidenceModel = RuntimeBranchEvidenceModelBuilder.build({
  runtimeSnapshot: {
    provider: "runtime-project",
    snapshot: {
      branchQueryReceipts: [],
      currentNode: {
        name: "Opening",
      },
    },
  },
});
assertEqual(emptyEvidenceModel.state, "runtime-empty", "runtime branch empty state");

const unavailableEvidenceModel = RuntimeBranchEvidenceModelBuilder.build({
  runtimeSnapshot: {
    provider: "unavailable",
    snapshot: null,
  },
});
assertEqual(unavailableEvidenceModel.state, "runtime-unavailable", "runtime branch unavailable state");
assertEqual(unavailableEvidenceModel.entryCount, 0, "runtime branch unavailable has no evidence");

const errorEvidenceModel = RuntimeBranchEvidenceModelBuilder.build({
  runtimeSnapshot: {
    error: "secret runtime branch error detail",
    provider: "unavailable",
    snapshot: null,
  },
});
assertEqual(errorEvidenceModel.state, "runtime-error", "runtime branch error state");
assertEqual(errorEvidenceModel.runtimeError.hasError, true, "runtime branch error summary");
assertNotIncludesText(JSON.stringify(errorEvidenceModel), "secret runtime branch error detail");

console.log("SelfHostedEditor runtime branch evidence contract ok");

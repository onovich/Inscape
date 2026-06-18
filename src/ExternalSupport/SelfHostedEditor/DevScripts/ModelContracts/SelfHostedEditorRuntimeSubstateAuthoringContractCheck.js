import { RuntimeSubstatePanelController } from "../../Scripts/Runtime/Controllers/RuntimeSubstatePanelController.js";
import {
  RuntimeSubstateAuthoringFormat,
  RuntimeSubstateAuthoringModelBuilder,
} from "../../Scripts/Runtime/Models/RuntimeSubstateAuthoringModelBuilder.js";
import { assertEqual, assertIncludesText, assertNotIncludesText, getTextContent, installFakeDomEnvironment } from "./SelfHostedEditorModelContractHarness.js";

installFakeDomEnvironment();

const runtimeSnapshot = {
  branchQueryReceipts: [
    {
      name: "has_item",
    },
  ],
  currentNode: {
    name: "Gate",
  },
  pendingAction: {
    argumentCount: 2,
    mode: "wait",
    name: "wait_for_ui",
    requestId: "request-1",
    status: "waiting",
  },
  state: {
    currentNodeName: "Gate",
    path: ["Start", "Gate"],
    visibleStepCount: 3,
  },
};
const substate = {
  branchQueryReceipts: [
    {
      name: "has_item",
    },
  ],
  flow: {
    stack: ["Start", "Gate"],
  },
  format: "inscape.runtime-substate",
  formatVersion: 1,
  host: {
    checkpointId: "host-checkpoint",
  },
  pendingAction: {
    arguments: [
      {
        kind: "string",
        stringValue: "confirm",
      },
    ],
    mode: "wait",
    name: "wait_for_ui",
    requestId: "request-1",
    status: "waiting",
  },
  position: {
    commandIndex: 3,
    nodeId: "Gate",
  },
  runtimeVersion: "p3-runtime-state-v1",
  scriptVersion: "workspace-revision-7",
};
const compatibleOperation = {
  format: "inscape.self-hosted-editor.runtime-substate-operation",
  formatVersion: 1,
  imported: false,
  operation: "validate",
  substateSummary: {
    branchReceiptCount: 1,
    commandIndex: 3,
    currentNodeId: "Gate",
    flowStackDepth: 2,
    format: "inscape.runtime-substate",
    formatVersion: 1,
    hostCheckpointPresent: true,
    pendingAction: {
      argumentCount: 1,
      mode: "wait",
      name: "wait_for_ui",
      status: "waiting",
    },
    runtimeVersion: "p3-runtime-state-v1",
    scriptVersion: "workspace-revision-7",
  },
  validation: {
    diagnostics: [],
    status: "compatible",
    suggestedPosition: {
      commandIndex: 3,
      nodeId: "Gate",
    },
  },
  validationStatus: "compatible",
};

const model = RuntimeSubstateAuthoringModelBuilder.build({
  artifactText: JSON.stringify(substate),
  operation: compatibleOperation,
  runtimeSnapshot: {
    provider: "runtime-project",
    snapshot: runtimeSnapshot,
  },
  sessionId: "runtime-substate-contract",
  workspaceRevision: 7,
});
assertEqual(model.format, RuntimeSubstateAuthoringFormat, "substate authoring format");
assertEqual(model.runtime.currentNodeId, "Gate", "substate runtime current node");
assertEqual(model.runtime.commandIndex, 3, "substate runtime command index");
assertEqual(model.runtime.flowStackDepth, 2, "substate runtime flow stack depth");
assertEqual(model.runtime.branchReceiptCount, 1, "substate runtime branch receipt count");
assertEqual(model.runtime.pendingAction.name, "wait_for_ui", "substate runtime pending action name");
assertEqual(model.artifact.format, "inscape.runtime-substate", "substate artifact format");
assertEqual(model.artifact.formatVersion, 1, "substate artifact format version");
assertEqual(model.artifact.runtimeVersion, "p3-runtime-state-v1", "substate artifact runtime version");
assertEqual(model.artifact.scriptVersion, "workspace-revision-7", "substate artifact script version");
assertEqual(model.artifact.currentNodeId, "Gate", "substate artifact current node");
assertEqual(model.artifact.commandIndex, 3, "substate artifact command index");
assertEqual(model.artifact.flowStackDepth, 2, "substate artifact flow stack depth");
assertEqual(model.artifact.pendingAction.name, "wait_for_ui", "substate artifact pending action");
assertEqual(model.artifact.branchReceiptCount, 1, "substate artifact branch receipt count");
assertEqual(model.artifact.hostCheckpointPresent, true, "substate artifact host checkpoint presence");
assertEqual(model.validation.status, "compatible", "substate validation compatible");
assertEqual(model.canImport, true, "compatible substate can import");
assertEqual(model.safety.notFullHostSave, true, "substate is not a full host save");
assertEqual(model.contentPolicy.excludes.includes("complete-runtime-log"), true, "substate excludes complete runtime log");
assertNotIncludesText(JSON.stringify(model), "secret full host save");

const migratableModel = RuntimeSubstateAuthoringModelBuilder.build({
  operation: {
    validation: {
      diagnostics: [
        {
          code: "IRT006",
          message: "Script drift",
          path: "scriptVersion",
          severity: "warning",
        },
      ],
      status: "Migratable",
    },
    validationStatus: "migratable",
  },
  runtimeSnapshot: {
    provider: "runtime-project",
    snapshot: runtimeSnapshot,
  },
});
assertEqual(migratableModel.validation.status, "migratable", "substate migratable status");
assertEqual(migratableModel.canImport, false, "migratable substate cannot import");
assertEqual(migratableModel.validation.diagnosticCount, 1, "substate migratable diagnostic count");

const incompatibleModel = RuntimeSubstateAuthoringModelBuilder.build({
  operation: {
    validation: {
      diagnostics: [
        {
          code: "IRT007",
          message: "Node missing",
          path: "position.nodeId",
          severity: "error",
        },
      ],
      status: "Incompatible",
    },
    validationStatus: "incompatible",
  },
  runtimeSnapshot: {
    provider: "runtime-project",
    snapshot: runtimeSnapshot,
  },
});
assertEqual(incompatibleModel.canImport, false, "incompatible substate cannot import");

const panel = new RuntimeSubstatePanelController(document.createElement("section"));
let importCalled = false;
panel.onImportRequested(async () => {
  importCalled = true;
  return compatibleOperation;
});
panel.render(incompatibleModel);
assertIncludesText(getTextContent(panel.panelElement), "Incompatible");
assertIncludesText(getTextContent(panel.panelElement), "Not a full host save");
const blockedImportButton = panel.panelElement.querySelectorAll(".runtime-substate-button")[2];
await blockedImportButton.click();
assertEqual(importCalled, false, "disabled incompatible import does not call handler");

let exportCalled = false;
panel.onExportRequested(async () => {
  exportCalled = true;
  return {
    ...compatibleOperation,
    operation: "export",
    substateText: JSON.stringify(substate, null, 2),
  };
});
panel.render(model);
const buttons = panel.panelElement.querySelectorAll(".runtime-substate-button");
assertEqual(buttons.length, 3, "substate panel button count");
await buttons[0].click();
assertEqual(exportCalled, true, "substate export handler called");
assertIncludesText(panel.getSubstateText(), "inscape.runtime-substate");
assertEqual(panel.getLastOperation().operation, "export", "substate panel stores export operation");
assertIncludesText(getTextContent(panel.panelElement), "Host Checkpoint: Present");

let validateCalled = false;
panel.onValidateRequested(async (text) => {
  validateCalled = text.includes("inscape.runtime-substate");
  return compatibleOperation;
});
await panel.panelElement.querySelectorAll(".runtime-substate-button")[1].click();
assertEqual(validateCalled, true, "substate validate handler receives artifact text");

await panel.panelElement.querySelectorAll(".runtime-substate-button")[2].click();
assertEqual(importCalled, true, "compatible import calls handler");

console.log("SelfHostedEditor runtime substate authoring contract ok");

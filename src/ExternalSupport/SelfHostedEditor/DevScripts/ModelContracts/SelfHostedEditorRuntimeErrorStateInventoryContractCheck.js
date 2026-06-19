import { HostSchemaCapabilityModelMapper } from "../../Scripts/HostSchema/Models/HostSchemaCapabilityModelMapper.js";
import { RuntimeErrorStatePanelController } from "../../Scripts/Runtime/Controllers/RuntimeErrorStatePanelController.js";
import {
  RuntimeActionAuthoringModelBuilder,
} from "../../Scripts/Runtime/Models/RuntimeActionAuthoringModelBuilder.js";
import {
  RuntimeBranchEvidenceModelBuilder,
} from "../../Scripts/Runtime/Models/RuntimeBranchEvidenceModelBuilder.js";
import {
  RuntimeErrorStateInventoryFormat,
  RuntimeErrorStateInventoryFormatVersion,
  RuntimeErrorStateInventoryModelBuilder,
  RuntimeErrorStateSuggestedFixCategories,
} from "../../Scripts/Runtime/Models/RuntimeErrorStateInventoryModelBuilder.js";
import {
  RuntimeLogBacklogModelBuilder,
} from "../../Scripts/Runtime/Models/RuntimeLogBacklogModelBuilder.js";
import {
  RuntimeMockQueryModelBuilder,
} from "../../Scripts/Runtime/Models/RuntimeMockQueryModelBuilder.js";
import {
  RuntimeStatusSurfaceModelBuilder,
} from "../../Scripts/Runtime/Models/RuntimeStatusSurfaceModelBuilder.js";
import {
  RuntimeSubstateAuthoringModelBuilder,
} from "../../Scripts/Runtime/Models/RuntimeSubstateAuthoringModelBuilder.js";
import {
  assertEqual,
  assertIncludesText,
  assertNotIncludesText,
  FakeElement,
  getTextContent,
  installFakeDomEnvironment,
} from "./SelfHostedEditorModelContractHarness.js";

installFakeDomEnvironment();

const previewModel = {
  provider: "compiler-project",
  runtimeStatus: {
    detail: "secret runtime stale detail with workspace text",
    label: "Runtime snapshot stale",
    provider: "runtime-project",
    state: "runtime-stale",
  },
};

const runtimeStatusModel = RuntimeStatusSurfaceModelBuilder.build({
  runtimeSnapshot: {
    provider: "runtime-project",
    snapshot: {
      currentNode: {
        name: "Gate",
      },
    },
  },
});

const mockQueryModel = RuntimeMockQueryModelBuilder.build({
  hostSchemaCatalog: HostSchemaCapabilityModelMapper.mapCatalog({
    format: "inscape.host-schema.capabilities",
    formatVersion: 1,
    hostSchema: {
      errorMessage: "secret schema payload",
      loaded: true,
      resolvedPath: "config/inscape.host.schema.json",
    },
    queries: [
      {
        name: "has_item",
        parameters: [
          {
            name: "itemId",
            type: "string",
          },
        ],
        returnType: "bool",
      },
    ],
  }),
  mockEntries: [
    {
      arguments: ["silver_key"],
      name: "has_item",
      value: "maybe",
    },
    {
      name: "unknown.secret_query",
      value: "secret mock value",
    },
  ],
});

const runtimeActionModel = RuntimeActionAuthoringModelBuilder.build({
  hostBindingCatalog: {
    actions: [
      {
        locations: [
          {
            sourceKind: "hostBridge",
            sourceLabel: "Host Bridge action",
            sourcePath: "config/inscape.host.bridge.json",
          },
        ],
        name: "wait_for_ui",
        sourceKind: "hostBridge",
      },
    ],
    hostBridge: {
      errorMessage: "secret bridge payload",
      loaded: true,
      resolvedPath: "config/inscape.host.bridge.json",
    },
  },
  hostSchemaCatalog: {
    actions: [
      {
        mode: "wait",
        name: "wait_for_ui",
      },
    ],
    hostSchema: {
      errorMessage: "",
      loaded: true,
      resolvedPath: "config/inscape.host.schema.json",
    },
  },
  runtimeSnapshot: {
    provider: "runtime-project",
    snapshot: {
      currentNode: {
        name: "Gate",
      },
      pendingAction: {
        arguments: [
          {
            raw: "secret pending argument",
          },
        ],
        hostPayload: "secret host payload",
        mode: "wait",
        name: "wait_for_ui",
        requestId: "action-1",
        status: "waiting",
      },
    },
  },
});

const logBacklogModel = RuntimeLogBacklogModelBuilder.build({
  runtimeSnapshot: {
    provider: "runtime-project",
    snapshot: {
      currentNode: {
        name: "Gate",
      },
      logEntries: [],
    },
  },
});

const branchEvidenceModel = RuntimeBranchEvidenceModelBuilder.build({
  runtimeSnapshot: {
    provider: "unavailable",
    snapshot: null,
  },
});

const substateModel = RuntimeSubstateAuthoringModelBuilder.build({
  artifactText: "{\"format\":\"inscape.runtime-substate\",\"secret\":\"secret substate body\"}",
  operation: {
    validation: {
      diagnostics: [
        {
          code: "IRT007",
          message: "secret incompatible script detail",
          path: "position.nodeId",
          severity: "error",
        },
      ],
      status: "incompatible",
    },
    validationStatus: "incompatible",
  },
  runtimeSnapshot: {
    provider: "runtime-project",
    snapshot: {
      currentNode: {
        name: "Gate",
      },
    },
  },
});

const inventory = RuntimeErrorStateInventoryModelBuilder.build({
  diagnostics: [
    {
      code: "runtime-cli-failed",
      layer: "runtime-cli",
      message: "secret cli stderr",
      surface: "runtime-status",
    },
    {
      code: "http-transport-timeout",
      layer: "transport",
      message: "secret http response",
      surface: "preview",
    },
    {
      code: "payload-contract-error",
      layer: "payload",
      message: "secret malformed payload body",
      surface: "runtime-substate",
    },
  ],
  sessionId: "runtime-error-state-contract",
  surfaceModels: {
    branchReceipts: branchEvidenceModel,
    logBacklog: logBacklogModel,
    mockQuery: mockQueryModel,
    preview: previewModel,
    runtimeActions: runtimeActionModel,
    runtimeStatus: runtimeStatusModel,
    runtimeSubstate: substateModel,
  },
  workspaceRevision: 22,
});

assertEqual(inventory.format, RuntimeErrorStateInventoryFormat, "runtime error inventory format");
assertEqual(inventory.formatVersion, RuntimeErrorStateInventoryFormatVersion, "runtime error inventory format version");
assertEqual(inventory.authoringOnly, true, "runtime error inventory is authoring-only");
assertEqual(inventory.payloadContentExposed, false, "runtime error inventory hides payload content");
assertEqual(inventory.surfaceCount, 7, "runtime error inventory surface count");
assertEqual(inventory.stateCoverage.ready, true, "runtime error inventory covers ready state");
assertEqual(inventory.stateCoverage.empty, true, "runtime error inventory covers empty state");
assertEqual(inventory.stateCoverage.unavailable, true, "runtime error inventory covers unavailable state");
assertEqual(inventory.stateCoverage.error, true, "runtime error inventory covers error state");
assertEqual(inventory.stateCoverage.stale, true, "runtime error inventory covers stale state");
assertEqual(inventory.stateCoverage.blocked, true, "runtime error inventory covers blocked state");
assertEqual(inventory.surfaces.find((surface) => surface.surface === "preview")?.state, "stale", "preview stale row");
assertEqual(inventory.surfaces.find((surface) => surface.surface === "runtime-status")?.state, "ready", "runtime status ready row");
assertEqual(inventory.surfaces.find((surface) => surface.surface === "mock-query")?.state, "error", "mock query error row");
assertEqual(inventory.surfaces.find((surface) => surface.surface === "runtime-actions")?.state, "blocked", "runtime action blocked row");
assertEqual(inventory.surfaces.find((surface) => surface.surface === "log-backlog")?.state, "empty", "log backlog empty row");
assertEqual(inventory.surfaces.find((surface) => surface.surface === "branch-receipts")?.state, "unavailable", "branch receipts unavailable row");
assertEqual(inventory.surfaces.find((surface) => surface.surface === "runtime-substate")?.state, "error", "runtime substate error row");
for (const category of RuntimeErrorStateSuggestedFixCategories) {
  if (!inventory.diagnosticContract.suggestedFixCategories.includes(category)) {
    throw new Error(`runtime error inventory missing category ${category}`);
  }
}
for (const diagnostic of inventory.diagnostics) {
  assertEqual(typeof diagnostic.layer, "string", "runtime diagnostic layer field");
  assertEqual(typeof diagnostic.code, "string", "runtime diagnostic code field");
  assertEqual(typeof diagnostic.shortMessage, "string", "runtime diagnostic short message field");
  assertEqual(typeof diagnostic.surface, "string", "runtime diagnostic surface field");
  assertEqual(typeof diagnostic.suggestedFixCategory, "string", "runtime diagnostic category field");
}

const serialized = JSON.stringify(inventory);
assertNotIncludesText(serialized, "secret runtime stale detail");
assertNotIncludesText(serialized, "secret schema payload");
assertNotIncludesText(serialized, "secret mock value");
assertNotIncludesText(serialized, "secret bridge payload");
assertNotIncludesText(serialized, "secret pending argument");
assertNotIncludesText(serialized, "secret host payload");
assertNotIncludesText(serialized, "secret substate body");
assertNotIncludesText(serialized, "secret incompatible script detail");
assertNotIncludesText(serialized, "secret cli stderr");
assertNotIncludesText(serialized, "secret http response");
assertNotIncludesText(serialized, "secret malformed payload body");

const panelElement = new FakeElement("section");
const panelController = new RuntimeErrorStatePanelController(panelElement);
const renderedInventory = panelController.render(inventory);
const panelText = getTextContent(panelElement);
assertEqual(renderedInventory?.format, RuntimeErrorStateInventoryFormat, "runtime error inventory panel returns model");
assertEqual(panelElement.dataset.runtimeErrorState, "error", "runtime error inventory panel state");
assertIncludesText(panelText, "Runtime States");
assertIncludesText(panelText, "Mock Query");
assertIncludesText(panelText, "Runtime Actions");
assertIncludesText(panelText, "Diagnostics");
assertNotIncludesText(panelText, "secret runtime stale detail");
assertNotIncludesText(panelText, "secret schema payload");
assertNotIncludesText(panelText, "secret mock value");
assertNotIncludesText(panelText, "secret bridge payload");
assertNotIncludesText(panelText, "secret pending argument");
assertNotIncludesText(panelText, "secret host payload");
assertNotIncludesText(panelText, "secret substate body");
assertNotIncludesText(panelText, "secret cli stderr");
assertNotIncludesText(panelText, "secret http response");

console.log("SelfHostedEditor runtime error state inventory contract ok");

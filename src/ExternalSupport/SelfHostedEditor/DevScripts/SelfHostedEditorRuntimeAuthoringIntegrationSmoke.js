import { HostBindingCapabilityModelMapper } from "../Scripts/HostBinding/Models/HostBindingCapabilityModelMapper.js";
import { HostSchemaCapabilityModelMapper } from "../Scripts/HostSchema/Models/HostSchemaCapabilityModelMapper.js";
import { PreviewRuntimePreferenceModelBuilder } from "../Scripts/Preview/Models/PreviewRuntimePreferenceModelBuilder.js";
import { RuntimeActionAuthoringModelBuilder } from "../Scripts/Runtime/Models/RuntimeActionAuthoringModelBuilder.js";
import { RuntimeBranchEvidenceModelBuilder } from "../Scripts/Runtime/Models/RuntimeBranchEvidenceModelBuilder.js";
import { RuntimeErrorStateInventoryModelBuilder } from "../Scripts/Runtime/Models/RuntimeErrorStateInventoryModelBuilder.js";
import { RuntimeLogBacklogModelBuilder } from "../Scripts/Runtime/Models/RuntimeLogBacklogModelBuilder.js";
import { RuntimeMockQueryModelBuilder } from "../Scripts/Runtime/Models/RuntimeMockQueryModelBuilder.js";
import { RuntimeStatusSurfaceModelBuilder } from "../Scripts/Runtime/Models/RuntimeStatusSurfaceModelBuilder.js";
import { RuntimeSubstateAuthoringModelBuilder } from "../Scripts/Runtime/Models/RuntimeSubstateAuthoringModelBuilder.js";
import {
  createSelfHostedEditorPreviewServer,
} from "./StartSelfHostedEditorPreview.js";

const sessionId = "runtime-authoring-integration-smoke";
const workspaceRevision = 12;
const scriptText = `# Start
@entry
Narrator: Door.
? Gate
- [has_item("silver_key")] Use key -> GateOpen
- Knock -> GateKnock

# GateOpen
@emit play_timeline mira_reveal
Narrator: Door opens.
-> GateKnock

# GateKnock
@emit wait_for_ui confirm_help
Narrator: Knocked.
? Help
- [trust("mira") >= 3] Ask Mira -> MiraHelp
- Wait alone -> GateLocked

# MiraHelp
Narrator: Mira helps.
-> End

# GateLocked
Narrator: Locked.
-> End

# End
Narrator: End.`;
const workspace = {
  currentFilePath: "story/runtime-authoring.inscape",
  documents: [
    {
      relativePath: "inscape.config.json",
      text: JSON.stringify({
        hostBridge: "config/inscape.host.bridge.json",
        hostSchema: "config/inscape.host.schema.json",
      }, null, 2),
    },
    {
      relativePath: "config/inscape.host.schema.json",
      text: JSON.stringify({
        actions: [
          {
            description: "Play a host timeline.",
            mode: "fire",
            name: "play_timeline",
            parameters: [
              {
                name: "timelineId",
                type: "string",
              },
            ],
          },
          {
            description: "Wait until the host UI confirms.",
            mode: "wait",
            name: "wait_for_ui",
            parameters: [
              {
                name: "promptId",
                type: "string",
              },
            ],
          },
        ],
        queries: [
          {
            description: "Whether the player has an inventory item.",
            name: "has_item",
            parameters: [
              {
                name: "itemId",
                type: "string",
              },
            ],
            returnType: "bool",
          },
          {
            description: "Relationship trust score.",
            name: "trust",
            parameters: [
              {
                name: "characterId",
                type: "string",
              },
            ],
            returnType: "number",
          },
        ],
      }, null, 2),
    },
    {
      relativePath: "config/inscape.host.bridge.json",
      text: JSON.stringify({
        actions: [
          {
            handler: {
              kind: "unity-method",
              memberName: "PlayTimeline",
              typeName: "Game.NarrativeTimelineBridge",
            },
            name: "play_timeline",
          },
          {
            handler: {
              kind: "unity-method",
              memberName: "WaitForUi",
              typeName: "Game.NarrativeUiBridge",
            },
            name: "wait_for_ui",
          },
        ],
        format: "inscape.host-bridge",
        formatVersion: 1,
        host: {
          kind: "custom",
          profile: "runtime-authoring-smoke",
          schema: "config/inscape.host.schema.json",
        },
        ids: [
          {
            host: {
              assetId: "timeline/mira_reveal",
            },
            kind: "timeline",
            name: "mira_reveal",
          },
        ],
      }, null, 2),
    },
    {
      relativePath: "story/runtime-authoring.inscape",
      text: scriptText,
    },
  ],
  revision: workspaceRevision,
};

async function main() {
  const server = createSelfHostedEditorPreviewServer(0);
  const address = await listen(server);

  try {
    const startedAt = Date.now();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const hostSchemaPayload = await postJson(baseUrl, "/api/host-schema-capabilities", {
      scriptText,
      workspace,
    });
    const hostBindingPayload = await postJson(baseUrl, "/api/host-binding-capabilities", {
      scriptText,
      workspace,
    });
    const storyGraphModel = await postJson(baseUrl, "/api/story-graph", {
      scriptText,
      workspace,
    });

    const hostSchemaCatalog = HostSchemaCapabilityModelMapper.mapCatalog(hostSchemaPayload);
    const hostBindingCatalog = HostBindingCapabilityModelMapper.mapCatalog(hostBindingPayload);
    assertEqual(hostSchemaCatalog.hostSchema.loaded, true, "host schema catalog loaded");
    assertEqual(hostBindingCatalog.hostBridge.loaded, true, "host bridge catalog loaded");
    assertEqual(hostSchemaCatalog.queries.length, 2, "host schema query count");
    assertEqual(hostSchemaCatalog.actions.length, 2, "host schema action count");
    assertEqual(hostBindingCatalog.actions.length, 2, "host bridge action count");

    const mockQueryModel = RuntimeMockQueryModelBuilder.build({
      hostSchemaCatalog,
      mockEntries: [
        {
          arguments: ["silver_key"],
          name: "has_item",
          value: "true",
        },
        {
          arguments: ["mira"],
          name: "trust",
          value: "3",
        },
      ],
      sessionId,
      workspaceRevision,
    });
    assertEqual(mockQueryModel.readyCount, 2, "mock query ready rows");
    assertEqual(mockQueryModel.runtimeQueryProvider.mockValues.length, 2, "mock query provider values");

    const actionBridgeInput = RuntimeActionAuthoringModelBuilder.buildRuntimeActionBridgeInput({
      hostBindingCatalog,
      hostSchemaCatalog,
    });
    assertEqual(actionBridgeInput.actions.length, 2, "runtime action bridge input action count");
    assertEqual(actionBridgeInput.handlers.length, 2, "runtime action bridge input handler count");

    const startSnapshot = await postJson(baseUrl, "/api/runtime-state", {
      actionDispatcher: actionBridgeInput,
      queryProvider: mockQueryModel.runtimeQueryProvider,
      scriptText,
      sessionId,
      workspace,
    });
    assertRuntimeSnapshot(startSnapshot, "Start");
    assertEqual(startSnapshot.queryProvider.source, "mock", "start query provider source");
    assertEqual(startSnapshot.currentNode.choices[0].options.length, 2, "mock query reveals conditional key option");
    assertEqual(startSnapshot.branchQueryReceipts[0].name, "has_item", "start branch receipt query");
    assertEqual(startSnapshot.branchQueryReceipts[0].result.value, "true", "start branch receipt result");

    const previewModelBuilder = new PreviewRuntimePreferenceModelBuilder();
    const previewModel = previewModelBuilder.buildPreviewModelFromRuntimeSnapshot(runtimeEnvelope(startSnapshot));
    assertEqual(previewModel.provider, "runtime", "preview model provider");
    assertEqual(previewModel.runtimeStatus.state, "runtime-ready", "preview runtime state");
    assertEqual(previewModel.choices[0].options[0].target, "GateOpen", "preview conditional key target");

    const fireSnapshot = await postJson(baseUrl, "/api/runtime-action", {
      action: {
        groupIndex: 0,
        optionIndex: 0,
        type: "choose",
      },
      actionDispatcher: actionBridgeInput,
      queryProvider: mockQueryModel.runtimeQueryProvider,
      runtimeState: startSnapshot,
      scriptText,
      sessionId,
      workspace,
    });
    assertRuntimeSnapshot(fireSnapshot, "GateOpen");
    assertEqual(fireSnapshot.actionRequests[0].name, "play_timeline", "fire action request name");
    assertEqual(fireSnapshot.actionRequests[0].mode, "fire", "fire action request mode");
    assertEqual(fireSnapshot.pendingAction, null, "fire action does not create pending");

    const pendingSnapshot = await postJson(baseUrl, "/api/runtime-action", {
      action: {
        type: "continue",
      },
      actionDispatcher: actionBridgeInput,
      queryProvider: mockQueryModel.runtimeQueryProvider,
      runtimeState: fireSnapshot,
      scriptText,
      sessionId,
      workspace,
    });
    assertRuntimeSnapshot(pendingSnapshot, "GateKnock");
    assertEqual(pendingSnapshot.pendingAction.name, "wait_for_ui", "wait pending action name");
    assertEqual(pendingSnapshot.pendingAction.mode, "wait", "wait pending action mode");

    const blockedActionModel = RuntimeActionAuthoringModelBuilder.build({
      hostBindingCatalog,
      hostSchemaCatalog,
      runtimeSnapshot: runtimeEnvelope(pendingSnapshot),
      sessionId,
      workspaceRevision,
    });
    assertEqual(blockedActionModel.pendingCount, 1, "runtime action model pending count");
    assertEqual(blockedActionModel.pendingAction.blocksRuntimeControls, true, "runtime action model blocks controls");

    const resumeSnapshot = await postJson(baseUrl, "/api/runtime-action", {
      action: RuntimeActionAuthoringModelBuilder.buildResumeActionRequest(
        blockedActionModel.pendingAction,
        "completed"
      ),
      actionDispatcher: actionBridgeInput,
      queryProvider: mockQueryModel.runtimeQueryProvider,
      runtimeState: pendingSnapshot,
      scriptText,
      sessionId,
      workspace,
    });
    assertRuntimeSnapshot(resumeSnapshot, "GateKnock");
    assertEqual(resumeSnapshot.pendingAction, null, "debug resume clears pending through Runtime");

    const loggedSnapshot = await postJson(baseUrl, "/api/runtime-action", {
      action: {
        type: "advance-flow",
      },
      actionDispatcher: actionBridgeInput,
      queryProvider: mockQueryModel.runtimeQueryProvider,
      runtimeState: resumeSnapshot,
      scriptText,
      sessionId,
      workspace,
    });
    assertRuntimeSnapshot(loggedSnapshot, "GateKnock");
    assertEqual(loggedSnapshot.logEntries.at(-1).text, "Knocked.", "runtime log after resume");
    assertTruthy(
      loggedSnapshot.branchQueryReceipts.some((receipt) => receipt.name === "trust" && receipt.result?.value === "3"),
      "trust branch receipt recorded"
    );

    const helpSnapshot = await postJson(baseUrl, "/api/runtime-action", {
      action: {
        groupIndex: 0,
        optionIndex: 0,
        type: "choose",
      },
      actionDispatcher: actionBridgeInput,
      queryProvider: mockQueryModel.runtimeQueryProvider,
      runtimeState: loggedSnapshot,
      scriptText,
      sessionId,
      workspace,
    });
    assertRuntimeSnapshot(helpSnapshot, "MiraHelp");

    const substateExport = await postJson(baseUrl, "/api/runtime-substate-export", {
      actionDispatcher: actionBridgeInput,
      hostCheckpointId: "preview-checkpoint",
      queryProvider: mockQueryModel.runtimeQueryProvider,
      runtimeState: loggedSnapshot,
      scriptText,
      scriptVersion: "workspace-revision-12",
      sessionId,
      workspace,
    });
    assertEqual(substateExport.format, "inscape.self-hosted-editor.runtime-substate-operation", "substate export format");
    assertEqual(substateExport.validationStatus, "compatible", "substate export validation status");
    assertEqual(substateExport.safety.notFullHostSave, true, "substate export not full host save");
    assertRuntimeSubstatePayloadBoundary(substateExport.substateText, "substate export payload");

    const substateValidation = await postJson(baseUrl, "/api/runtime-substate-validate", {
      scriptText,
      scriptVersion: "workspace-revision-12",
      sessionId,
      substateText: substateExport.substateText,
      workspace,
    });
    assertEqual(substateValidation.validationStatus, "compatible", "substate validate status");

    const substateDriftImport = await postJson(baseUrl, "/api/runtime-substate-import", {
      actionDispatcher: actionBridgeInput,
      queryProvider: mockQueryModel.runtimeQueryProvider,
      scriptText,
      scriptVersion: "workspace-revision-13",
      sessionId,
      substateText: substateExport.substateText,
      workspace,
    });
    assertEqual(substateDriftImport.imported, false, "substate drift import blocked");
    assertEqual(substateDriftImport.validationStatus, "migratable", "substate drift status");

    const substateImport = await postJson(baseUrl, "/api/runtime-substate-import", {
      actionDispatcher: actionBridgeInput,
      queryProvider: mockQueryModel.runtimeQueryProvider,
      scriptText,
      scriptVersion: "workspace-revision-12",
      sessionId,
      substateText: substateExport.substateText,
      workspace,
    });
    assertEqual(substateImport.imported, true, "substate import flag");
    assertRuntimeSnapshot(substateImport.runtimeSnapshot, "GateKnock");

    const statusModel = RuntimeStatusSurfaceModelBuilder.build({
      runtimeSnapshot: runtimeEnvelope(helpSnapshot),
      sessionId,
      workspaceRevision,
    });
    const logBacklogModel = RuntimeLogBacklogModelBuilder.build({
      runtimeSnapshot: runtimeEnvelope(loggedSnapshot),
      sessionId,
      storyGraphModel,
      workspaceRevision,
    });
    const branchEvidenceModel = RuntimeBranchEvidenceModelBuilder.build({
      runtimeSnapshot: runtimeEnvelope(loggedSnapshot),
      sessionId,
      storyGraphModel,
      workspaceRevision,
    });
    const substateModel = RuntimeSubstateAuthoringModelBuilder.build({
      artifactText: substateExport.substateText,
      operation: substateImport,
      runtimeSnapshot: runtimeEnvelope(substateImport.runtimeSnapshot),
      sessionId,
      workspaceRevision,
    });
    const inventoryModel = RuntimeErrorStateInventoryModelBuilder.build({
      diagnostics: [],
      sessionId,
      surfaceModels: {
        branchReceipts: branchEvidenceModel,
        logBacklog: logBacklogModel,
        mockQuery: mockQueryModel,
        preview: {
          provider: previewModel.provider,
          runtimeStatus: previewModel.runtimeStatus,
          state: previewModel.runtimeStatus.state,
        },
        runtimeActions: blockedActionModel,
        runtimeStatus: statusModel,
        runtimeSubstate: substateModel,
      },
      workspaceRevision,
    });

    assertEqual(statusModel.state, "runtime-ready", "runtime status model ready");
    assertEqual(statusModel.currentNodeName, "MiraHelp", "runtime status current node");
    assertEqual(logBacklogModel.state, "runtime-ready", "runtime log model ready");
    assertEqual(logBacklogModel.entryCount > 0, true, "runtime log model entry count");
    assertEqual(branchEvidenceModel.state, "runtime-ready", "branch evidence model ready");
    assertEqual(branchEvidenceModel.entries.some((entry) => entry.queryName === "trust"), true, "branch evidence model trust receipt");
    assertEqual(branchEvidenceModel.requeriesHost, false, "branch evidence does not re-query host");
    assertEqual(substateModel.canImport, true, "substate model import ready");
    assertEqual(substateModel.safety.notFullHostSave, true, "substate model not full host save");
    assertEqual(inventoryModel.format, "inscape.self-hosted-editor.runtime-error-state-inventory", "runtime states inventory format");
    assertEqual(inventoryModel.surfaceCount, 7, "runtime states inventory surface count");
    assertEqual(inventoryModel.surfaces.find((surface) => surface.surface === "preview")?.state, "ready", "runtime states preview ready");
    assertEqual(inventoryModel.surfaces.find((surface) => surface.surface === "runtime-status")?.state, "ready", "runtime states status ready");
    assertEqual(inventoryModel.surfaces.find((surface) => surface.surface === "mock-query")?.state, "ready", "runtime states mock query ready");
    assertEqual(inventoryModel.surfaces.find((surface) => surface.surface === "runtime-actions")?.state, "blocked", "runtime states action pending blocked");
    assertEqual(inventoryModel.surfaces.find((surface) => surface.surface === "log-backlog")?.state, "ready", "runtime states log ready");
    assertEqual(inventoryModel.surfaces.find((surface) => surface.surface === "branch-receipts")?.state, "ready", "runtime states branch ready");
    assertEqual(inventoryModel.surfaces.find((surface) => surface.surface === "runtime-substate")?.state, "ready", "runtime states substate ready");
    assertNoForbiddenPayloads(JSON.stringify({
      branchEvidenceModel,
      inventoryModel,
      logBacklogModel,
      statusModel,
      substateModel,
    }));
    assertFailureSurfaceCoverage({
      blockedActionModel,
      fireSnapshot,
      helpSnapshot,
      hostSchemaCatalog,
      loggedSnapshot,
      storyGraphModel,
      substateDriftImport,
    });

    console.log(`SelfHostedEditor runtime authoring integration smoke ok (${Date.now() - startedAt}ms)`);
  } finally {
    await close(server);
  }
}

async function postJson(baseUrl, pathname, body) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payloadText = await response.text();
  const payload = JSON.parse(payloadText);
  if (!response.ok) {
    throw new Error(`${pathname} failed with HTTP ${response.status}: ${payloadText}`);
  }

  return payload;
}

function runtimeEnvelope(snapshot) {
  return {
    provider: "runtime-project",
    snapshot,
  };
}

function assertRuntimeSnapshot(snapshot, expectedNodeName) {
  assertEqual(snapshot?.format, "inscape.self-hosted-editor.runtime-state", `${expectedNodeName} runtime format`);
  assertEqual(snapshot?.formatVersion, 1, `${expectedNodeName} runtime format version`);
  assertEqual(snapshot?.currentNode?.name, expectedNodeName, `${expectedNodeName} runtime current node`);
  assertEqual(snapshot?.state?.currentNodeName, expectedNodeName, `${expectedNodeName} runtime state current node`);
}

function assertRuntimeSubstatePayloadBoundary(payloadText, label) {
  for (const forbidden of ["logEntries", "actionRequests", "rollbackStack", "traceReplay"]) {
    if (String(payloadText || "").includes(forbidden)) {
      throw new Error(`${label} must not include ${forbidden}.`);
    }
  }
}

function assertFailureSurfaceCoverage({
  blockedActionModel,
  fireSnapshot,
  helpSnapshot,
  hostSchemaCatalog,
  loggedSnapshot,
  storyGraphModel,
  substateDriftImport,
}) {
  const unavailableRuntimeEnvelope = {
    provider: "unavailable",
    snapshot: null,
  };
  const runtimeUnavailableStatus = RuntimeStatusSurfaceModelBuilder.build({
    runtimeSnapshot: unavailableRuntimeEnvelope,
    sessionId,
    workspaceRevision,
  });
  const runtimeCommandErrorStatus = RuntimeStatusSurfaceModelBuilder.build({
    runtimeSnapshot: {
      error: {
        code: "runtime-cli-failed",
        message: "secret runtime stderr",
      },
      provider: "runtime-project",
      snapshot: null,
    },
    sessionId,
    workspaceRevision,
  });
  const missingSchemaMockModel = RuntimeMockQueryModelBuilder.build({
    hostSchemaCatalog: {
      hostSchema: {
        loaded: false,
      },
      queries: [],
    },
    mockEntries: [
      {
        arguments: ["silver_key"],
        name: "has_item",
        value: "true",
      },
    ],
    sessionId,
    workspaceRevision,
  });
  const missingHandlerActionModel = RuntimeActionAuthoringModelBuilder.build({
    hostBindingCatalog: {
      actions: [],
      hostBridge: {
        loaded: true,
        resolvedPath: "config/inscape.host.bridge.json",
      },
    },
    hostSchemaCatalog,
    runtimeSnapshot: runtimeEnvelope(fireSnapshot),
    sessionId,
    workspaceRevision,
  });
  const missingBridgeActionModel = RuntimeActionAuthoringModelBuilder.build({
    hostBindingCatalog: {
      actions: [],
      hostBridge: {
        loaded: false,
      },
    },
    hostSchemaCatalog,
    runtimeSnapshot: runtimeEnvelope(fireSnapshot),
    sessionId,
    workspaceRevision,
  });
  const emptyLogModel = RuntimeLogBacklogModelBuilder.build({
    runtimeSnapshot: runtimeEnvelope(fireSnapshot),
    sessionId,
    storyGraphModel,
    workspaceRevision,
  });
  const emptyBranchModel = RuntimeBranchEvidenceModelBuilder.build({
    runtimeSnapshot: runtimeEnvelope({
      ...fireSnapshot,
      branchQueryReceipts: [],
    }),
    sessionId,
    storyGraphModel,
    workspaceRevision,
  });
  const staleSubstateModel = RuntimeSubstateAuthoringModelBuilder.build({
    artifactText: "",
    operation: substateDriftImport,
    runtimeSnapshot: runtimeEnvelope(loggedSnapshot),
    sessionId,
    workspaceRevision,
  });
  const emptySubstateModel = RuntimeSubstateAuthoringModelBuilder.build({
    artifactText: "",
    operation: null,
    runtimeSnapshot: unavailableRuntimeEnvelope,
    sessionId,
    workspaceRevision,
  });
  const stalePreviewSurface = {
    provider: "compiler-project",
    runtimeStatus: {
      detail: "secret stale workspace revision detail",
      label: "Runtime snapshot stale",
      provider: "runtime-project",
      state: "runtime-stale",
    },
    state: "runtime-stale",
  };
  const hardeningInventory = RuntimeErrorStateInventoryModelBuilder.build({
    diagnostics: [],
    sessionId,
    surfaceModels: {
      branchReceipts: emptyBranchModel,
      logBacklog: emptyLogModel,
      mockQuery: missingSchemaMockModel,
      preview: stalePreviewSurface,
      runtimeActions: missingHandlerActionModel,
      runtimeStatus: runtimeUnavailableStatus,
      runtimeSubstate: staleSubstateModel,
    },
    workspaceRevision,
  });
  const bridgeInventory = RuntimeErrorStateInventoryModelBuilder.build({
    diagnostics: [],
    sessionId,
    surfaceModels: {
      runtimeActions: missingBridgeActionModel,
    },
    workspaceRevision,
  });
  const payloadDiagnosticInventory = RuntimeErrorStateInventoryModelBuilder.build({
    diagnostics: [
      {
        code: "payload-contract-error",
        layer: "payload",
        message: "secret hosted payload body",
        severity: "error",
        surface: "preview",
      },
    ],
    sessionId,
    surfaceModels: {
      preview: stalePreviewSurface,
      runtimeActions: blockedActionModel,
    },
    workspaceRevision,
  });

  assertEqual(runtimeUnavailableStatus.state, "runtime-unavailable", "runtime unavailable status");
  assertEqual(runtimeCommandErrorStatus.state, "runtime-error", "runtime command error status");
  assertEqual(missingSchemaMockModel.hostSchema.loaded, false, "missing schema mock model state");
  assertEqual(missingHandlerActionModel.handlerMissingCount, 2, "missing action handler count");
  assertEqual(missingBridgeActionModel.hostBridge.loaded, false, "missing bridge action model state");
  assertEqual(emptyLogModel.state, "runtime-empty", "empty runtime log state");
  assertEqual(emptyBranchModel.state, "runtime-empty", "empty branch receipt state");
  assertEqual(staleSubstateModel.validation.status, "migratable", "stale substate validation state");
  assertEqual(emptySubstateModel.canExport, false, "empty substate cannot export without Runtime");
  assertEqual(hardeningInventory.surfaces.find((surface) => surface.surface === "preview")?.state, "stale", "hardening preview stale");
  assertEqual(hardeningInventory.surfaces.find((surface) => surface.surface === "runtime-status")?.state, "unavailable", "hardening runtime status unavailable");
  assertEqual(hardeningInventory.surfaces.find((surface) => surface.surface === "mock-query")?.state, "unavailable", "hardening mock schema unavailable");
  assertEqual(hardeningInventory.surfaces.find((surface) => surface.surface === "runtime-actions")?.state, "error", "hardening action handler missing");
  assertEqual(hardeningInventory.surfaces.find((surface) => surface.surface === "log-backlog")?.state, "empty", "hardening log empty");
  assertEqual(hardeningInventory.surfaces.find((surface) => surface.surface === "branch-receipts")?.state, "empty", "hardening branch empty");
  assertEqual(hardeningInventory.surfaces.find((surface) => surface.surface === "runtime-substate")?.state, "stale", "hardening substate stale");
  assertEqual(bridgeInventory.surfaces.find((surface) => surface.surface === "runtime-actions")?.suggestedFixCategory, "bridge", "missing bridge fix category");
  assertTruthy(
    payloadDiagnosticInventory.diagnostics.some((diagnostic) => diagnostic.code === "payload-contract-error" && diagnostic.suggestedFixCategory === "payload"),
    "payload contract diagnostic preserved"
  );
  assertNoForbiddenPayloads(JSON.stringify({
    bridgeInventory,
    hardeningInventory,
    payloadDiagnosticInventory,
    runtimeCommandErrorStatus,
  }));
  if (JSON.stringify(payloadDiagnosticInventory).includes("secret hosted payload body")) {
    throw new Error("Payload contract diagnostic must not expose raw hosted payload body.");
  }
  if (JSON.stringify(hardeningInventory).includes("secret stale workspace revision detail")) {
    throw new Error("Stale preview inventory must not expose raw stale detail.");
  }
  if (JSON.stringify(runtimeCommandErrorStatus).includes("secret runtime stderr")) {
    throw new Error("Runtime command error status must not expose raw stderr.");
  }
}

function assertNoForbiddenPayloads(text) {
  for (const forbidden of [
    "mockValues",
    "Narrator: Door",
  ]) {
    if (String(text || "").includes(forbidden)) {
      throw new Error(`Bounded runtime authoring models must not expose ${forbidden}.`);
    }
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertTruthy(value, label) {
  if (!value) {
    throw new Error(`${label}: expected a truthy value.`);
  }
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve(server.address());
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});

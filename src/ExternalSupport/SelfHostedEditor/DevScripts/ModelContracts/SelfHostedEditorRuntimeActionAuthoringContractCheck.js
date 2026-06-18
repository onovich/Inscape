import { HostBindingCapabilityModelMapper } from "../../Scripts/HostBinding/Models/HostBindingCapabilityModelMapper.js";
import { HostSchemaCapabilityModelMapper } from "../../Scripts/HostSchema/Models/HostSchemaCapabilityModelMapper.js";
import { PreviewPanelController } from "../../Scripts/Preview/Controllers/PreviewPanelController.js";
import { SelfHostedEditorRuntimeBridge } from "../../Scripts/Runtime/Bridges/SelfHostedEditorRuntimeBridge.js";
import { RuntimeActionPanelController } from "../../Scripts/Runtime/Controllers/RuntimeActionPanelController.js";
import {
  RuntimeActionAuthoringFormat,
  RuntimeActionAuthoringFormatVersion,
  RuntimeActionAuthoringModelBuilder,
} from "../../Scripts/Runtime/Models/RuntimeActionAuthoringModelBuilder.js";
import {
  assertEqual,
  assertIncludesText,
  assertNotIncludesText,
  FakeElement,
  getTextContent,
  installFakeDomEnvironment,
} from "./SelfHostedEditorModelContractHarness.js";

installFakeDomEnvironment();

const hostSchemaCatalog = HostSchemaCapabilityModelMapper.mapCatalog({
  actions: [
    {
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
      mode: "wait",
      name: "wait_for_ui",
      parameters: [
        {
          name: "promptId",
          type: "string",
        },
      ],
    },
    {
      mode: "handoff",
      name: "enter_host_segment",
    },
    {
      mode: "wait",
      name: "missing_handler",
    },
  ],
  format: "inscape.host-schema.capabilities",
  formatVersion: 1,
  hostSchema: {
    errorMessage: "secret host schema body",
    loaded: true,
    resolvedPath: "config/inscape.host.schema.json",
  },
});

const hostBindingCatalog = HostBindingCapabilityModelMapper.mapCatalog({
  actions: [
    {
      locations: [
        {
          line: 0,
          sourceKind: "hostBridge",
          sourceLabel: "Host Bridge action",
          sourcePath: "config/inscape.host.bridge.json",
        },
      ],
      name: "play_timeline",
      sourceKind: "hostBridge",
      sourceLabel: "Host Bridge action",
      sourcePath: "config/inscape.host.bridge.json",
    },
    {
      locations: [
        {
          line: 0,
          sourceKind: "hostBridge",
          sourceLabel: "Host Bridge action",
          sourcePath: "config/inscape.host.bridge.json",
        },
      ],
      name: "wait_for_ui",
      sourceKind: "hostBridge",
      sourceLabel: "Host Bridge action",
      sourcePath: "config/inscape.host.bridge.json",
    },
    {
      locations: [
        {
          line: 0,
          sourceKind: "hostBridge",
          sourceLabel: "Host Bridge action",
          sourcePath: "config/inscape.host.bridge.json",
        },
      ],
      name: "enter_host_segment",
      sourceKind: "hostBridge",
      sourceLabel: "Host Bridge action",
      sourcePath: "config/inscape.host.bridge.json",
    },
  ],
  format: "inscape.host-binding.capabilities",
  formatVersion: 1,
  hostBridge: {
    errorMessage: "secret host bridge body",
    loaded: true,
    resolvedPath: "config/inscape.host.bridge.json",
  },
});

const runtimeSnapshot = {
  provider: "runtime-project",
  snapshot: {
    actionRequests: [
      {
        arguments: [
          {
            raw: "secret timeline argument",
          },
        ],
        handlerName: "Timeline.Play",
        mode: "fire",
        name: "play_timeline",
        raw: "@emit play_timeline secret_timeline",
        requestId: "action-1",
        sourceLine: 4,
      },
      {
        arguments: [
          {
            raw: "secret prompt argument",
          },
        ],
        handlerName: "Ui.WaitForUi",
        mode: "wait",
        name: "wait_for_ui",
        raw: "@emit wait_for_ui secret_prompt",
        requestId: "action-2",
        sourceLine: 9,
      },
    ],
    currentNode: {
      name: "gate.knock",
    },
    pendingAction: {
      arguments: [
        {
          raw: "secret pending argument",
        },
      ],
      handlerName: "Ui.WaitForUi",
      hostPayload: "secret host payload",
      mode: "wait",
      name: "wait_for_ui",
      nodeId: "gate.knock",
      raw: "@emit wait_for_ui secret_prompt",
      requestId: "action-2",
      sourceLine: 9,
      status: "waiting",
    },
  },
};

const authoringModel = RuntimeActionAuthoringModelBuilder.build({
  hostBindingCatalog,
  hostSchemaCatalog,
  runtimeSnapshot,
  sessionId: "runtime-action-session",
  workspaceRevision: 12,
});

assertEqual(authoringModel.format, RuntimeActionAuthoringFormat, "runtime action authoring format");
assertEqual(authoringModel.formatVersion, RuntimeActionAuthoringFormatVersion, "runtime action authoring format version");
assertEqual(authoringModel.authoringOnly, true, "runtime action model is authoring-only");
assertEqual(authoringModel.payloadContentExposed, false, "runtime action model hides payload content");
assertEqual(authoringModel.hostSchema.actionCount, 4, "runtime action model host schema count");
assertEqual(authoringModel.hostBridge.actionCount, 3, "runtime action model host bridge count");
assertEqual(authoringModel.handlerAvailableCount, 3, "runtime action model mapped action count");
assertEqual(authoringModel.handlerMissingCount, 1, "runtime action model missing handler count");
assertEqual(authoringModel.fireCount, 1, "runtime action model fire count");
assertEqual(authoringModel.waitOrHandoffCount, 3, "runtime action model wait and handoff count");
assertEqual(authoringModel.pendingAction?.blocksRuntimeControls, true, "pending wait action blocks runtime controls");
assertEqual(authoringModel.pendingAction?.resumeStatuses.length, 4, "pending action resume statuses");
assertEqual(authoringModel.actionRequests.length, 2, "runtime action request evidence count");
assertEqual(authoringModel.actionRequests[0].argumentCount, 1, "runtime action request only exposes argument count");
assertEqual(authoringModel.runtimeActionBridgeInput.actions.length, 4, "runtime action input actions");
assertEqual(authoringModel.runtimeActionBridgeInput.handlers.length, 3, "runtime action input handlers");
assertEqual(authoringModel.rows.find((row) => row.name === "play_timeline")?.blocksRuntimeControls, false, "fire row does not block controls");
assertEqual(authoringModel.rows.find((row) => row.name === "wait_for_ui")?.blocksRuntimeControls, true, "wait row can block controls");
assertEqual(authoringModel.rows.find((row) => row.name === "missing_handler")?.state, "handler-missing", "missing handler row state");

const serialized = JSON.stringify(authoringModel);
assertNotIncludesText(serialized, "secret host schema body");
assertNotIncludesText(serialized, "secret host bridge body");
assertNotIncludesText(serialized, "secret timeline argument");
assertNotIncludesText(serialized, "secret prompt argument");
assertNotIncludesText(serialized, "secret pending argument");
assertNotIncludesText(serialized, "secret host payload");
assertNotIncludesText(serialized, "@emit wait_for_ui");

const panelElement = new FakeElement("section");
const controller = new RuntimeActionPanelController(panelElement);
let resumeAction = null;
controller.onResumeRuntimeRequested(async (action) => {
  resumeAction = action;
  return {
    provider: "runtime-project",
    snapshot: {
      currentNode: {
        name: "gate.knock",
      },
      pendingAction: null,
    },
  };
});
controller.render(hostSchemaCatalog, hostBindingCatalog, {
  runtimeSnapshot,
});
assertIncludesText(getTextContent(panelElement), "Runtime Actions");
assertIncludesText(getTextContent(panelElement), "Ready 3");
assertIncludesText(getTextContent(panelElement), "Missing 1");
assertIncludesText(getTextContent(panelElement), "Pending 1");
assertIncludesText(getTextContent(panelElement), "Request Evidence");
assertIncludesText(getTextContent(panelElement), "Pending action blocks Runtime controls");
assertNotIncludesText(getTextContent(panelElement), "secret host payload");
assertEqual(panelElement.dataset.runtimeActionState, "pending-blocking", "runtime action panel pending state");

const resumeButtons = panelElement.querySelectorAll(".runtime-action-button");
assertEqual(resumeButtons.length, 4, "runtime action resume buttons");
assertEqual(resumeButtons[0].disabled, false, "runtime action completed resume enabled");
await resumeButtons[0].click();
assertEqual(resumeAction?.type, "resume-action", "runtime action resume request type");
assertEqual(resumeAction?.requestId, "action-2", "runtime action resume request id");
assertEqual(resumeAction?.status, "completed", "runtime action resume status");
assertIncludesText(getTextContent(panelElement), "Completed resume sent to Runtime preview");

const bridgeCalls = [];
const bridge = new SelfHostedEditorRuntimeBridge({
  runtimeSessionClient: {
    sessionId: "runtime-action-bridge",
    async startOrObserve(payload) {
      bridgeCalls.push(payload);
      return {
        currentNode: {
          name: "Opening",
        },
      };
    },
    async step(payload) {
      bridgeCalls.push(payload);
      return {
        currentNode: {
          name: "Opening",
        },
      };
    },
  },
});
bridge.setActionBridgeInput(authoringModel.runtimeActionBridgeInput);
await bridge.getRuntimeSnapshot("# Opening");
await bridge.stepRuntimeSnapshot("# Opening", null, {
  type: "continue",
});
assertEqual(bridgeCalls[0].actionDispatcher.actions.length, 4, "runtime bridge start carries action input");
assertEqual(bridgeCalls[1].actionDispatcher.handlers.length, 3, "runtime bridge step carries action handlers");
bridge.clearActionBridgeInput();
await bridge.getRuntimeSnapshot("# Opening");
assertEqual(Object.prototype.hasOwnProperty.call(bridgeCalls[2], "actionDispatcher"), false, "runtime bridge omits empty action input");

const previewElement = new FakeElement("section");
const previewController = new PreviewPanelController(previewElement);
previewController.renderRuntimeSnapshot({
  currentNode: {
    defaultNext: "end",
    lines: [
      {
        kind: "Dialogue",
        source: {
          line: 2,
        },
        text: "Waiting.",
      },
    ],
    name: "gate.knock",
    source: {
      line: 1,
    },
  },
  pendingAction: {
    mode: "wait",
    name: "wait_for_ui",
    requestId: "action-2",
  },
  readingProgress: {
    visibleStepCount: 1,
  },
  state: {
    currentNodeName: "gate.knock",
    path: ["start", "gate.knock"],
    visibleStepCount: 1,
  },
});
assertEqual(previewElement.dataset.runtimePending, "blocking", "preview marks blocking pending action");
assertIncludesText(getTextContent(previewElement), "Runtime pending wait");
assertEqual(previewElement.querySelectorAll(".choice-button").length, 0, "preview hides runtime controls while pending");

previewController.renderRuntimeSnapshot({
  actionRequests: [
    {
      mode: "fire",
      name: "play_timeline",
      requestId: "action-1",
    },
  ],
  currentNode: {
    defaultNext: "end",
    lines: [
      {
        kind: "Dialogue",
        source: {
          line: 2,
        },
        text: "Done.",
      },
    ],
    name: "gate.open",
    source: {
      line: 1,
    },
  },
  pendingAction: null,
  state: {
    currentNodeName: "gate.open",
    path: ["start", "gate.open"],
    visibleStepCount: 1,
  },
});
assertEqual(previewElement.dataset.runtimePending || "", "", "preview does not block on fire request history");
assertEqual(previewElement.querySelectorAll(".choice-button").length, 1, "preview keeps controls available without pending");

console.log("SelfHostedEditor runtime action authoring contract ok");

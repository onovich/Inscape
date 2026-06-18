import { RuntimeStatusPanelController } from "../../Scripts/Runtime/Controllers/RuntimeStatusPanelController.js";
import {
  RuntimeStatusSurfaceFormat,
  RuntimeStatusSurfaceFormatVersion,
  RuntimeStatusSurfaceModelBuilder,
} from "../../Scripts/Runtime/Models/RuntimeStatusSurfaceModelBuilder.js";
import {
  assertEqual,
  assertIncludesText,
  assertNotIncludesText,
  FakeElement,
  getTextContent,
  installFakeDomEnvironment,
} from "./SelfHostedEditorModelContractHarness.js";

installFakeDomEnvironment();

const runtimeStatus = RuntimeStatusSurfaceModelBuilder.build({
  runtimeSnapshot: {
    provider: "runtime-project",
    snapshot: {
      currentNode: {
        choices: [
          {
            options: [
              {
                target: "Open",
                text: "Use key",
              },
              {
                target: "Knock",
                text: "Knock",
              },
            ],
            prompt: "Choose",
          },
        ],
        debugBody: "secret runtime current node body",
        name: "Gate",
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
        requestId: "action-7",
        status: "waiting",
      },
      queryProvider: {
        delegateAvailable: false,
        label: "mock",
        mockValueCount: 2,
        payloadContentExposed: false,
        recordedValueCount: 0,
        source: "mock",
      },
      readingProgress: {
        canAdvance: true,
        canRewind: false,
        contentStepCount: 3,
        isChoiceStageVisible: true,
        isContinueStageVisible: false,
        maxVisibleStepCount: 4,
        visibleStepCount: 2,
      },
      secretStateBody: "secret runtime state body",
      state: {
        currentNodeName: "Gate",
        path: ["Opening", "Gate"],
        visibleStepCount: 2,
      },
    },
  },
  sessionId: "runtime-status-session",
  workspaceRevision: 18,
});

assertEqual(runtimeStatus.format, RuntimeStatusSurfaceFormat, "runtime status surface format");
assertEqual(runtimeStatus.formatVersion, RuntimeStatusSurfaceFormatVersion, "runtime status surface format version");
assertEqual(runtimeStatus.payloadContentExposed, false, "runtime status hides payload content");
assertEqual(runtimeStatus.state, "runtime-ready", "runtime status ready state");
assertEqual(runtimeStatus.provider, "runtime-project", "runtime status provider");
assertEqual(runtimeStatus.currentNodeName, "Gate", "runtime status current node");
assertEqual(runtimeStatus.visibleChoiceCount, 2, "runtime status visible choices");
assertEqual(runtimeStatus.readingProgress.visibleStepCount, 2, "runtime status visible step count");
assertEqual(runtimeStatus.readingProgress.contentStepCount, 3, "runtime status content step count");
assertEqual(runtimeStatus.pendingAction.available, true, "runtime status pending action availability");
assertEqual(runtimeStatus.pendingAction.blocksRuntimeControls, true, "runtime status pending action blocks controls");
assertEqual(runtimeStatus.pendingAction.name, "wait_for_ui", "runtime status pending action name");
assertEqual(runtimeStatus.queryProvider.source, "mock", "runtime status query provider source");
assertEqual(runtimeStatus.queryProvider.mockValueCount, 2, "runtime status query provider mock count");
assertEqual(runtimeStatus.runtimeError.hasError, false, "runtime status has no error");
assertIncludesText(runtimeStatus.contentPolicy.excludes.join(","), "mock-query-values");

const serializedStatus = JSON.stringify(runtimeStatus);
assertNotIncludesText(serializedStatus, "secret runtime current node body");
assertNotIncludesText(serializedStatus, "secret pending argument");
assertNotIncludesText(serializedStatus, "secret host payload");
assertNotIncludesText(serializedStatus, "secret runtime state body");

const rawQueryProviderStatus = RuntimeStatusSurfaceModelBuilder.build({
  runtimeSnapshot: {
    provider: "runtime-project",
    snapshot: {
      currentNode: {
        name: "Gate",
      },
      queryProvider: {
        kind: "Mock",
        mockValues: [
          {
            arguments: [
              {
                stringValue: "secret raw mock argument",
              },
            ],
            name: "has_item",
            value: {
              boolValue: true,
              stringValue: "secret raw mock value",
            },
          },
        ],
      },
    },
  },
});
assertEqual(rawQueryProviderStatus.queryProvider.source, "mock", "raw query provider projected to mock source");
assertEqual(rawQueryProviderStatus.queryProvider.mockValueCount, 1, "raw query provider projected to count");
assertNotIncludesText(JSON.stringify(rawQueryProviderStatus), "secret raw mock argument");
assertNotIncludesText(JSON.stringify(rawQueryProviderStatus), "secret raw mock value");

const internalQueryProviderStatus = RuntimeStatusSurfaceModelBuilder.build({
  runtimeSnapshot: {
    provider: "runtime-project",
    snapshot: {
      currentNode: {
        name: "Opening",
      },
    },
  },
});
assertEqual(internalQueryProviderStatus.queryProvider.source, "internal", "missing provider means internal Runtime facts");

const recordedQueryProviderStatus = RuntimeStatusSurfaceModelBuilder.build({
  runtimeSnapshot: {
    provider: "runtime-project",
    snapshot: {
      currentNode: {
        name: "Opening",
      },
      queryProvider: {
        kind: "Recorded",
        recordedValues: [
          {
            name: "trust",
            value: {
              numberValue: 3,
            },
          },
        ],
      },
    },
  },
});
assertEqual(recordedQueryProviderStatus.queryProvider.source, "recorded", "recorded query provider source");
assertEqual(recordedQueryProviderStatus.queryProvider.recordedValueCount, 1, "recorded query provider count");

const delegateQueryProviderStatus = RuntimeStatusSurfaceModelBuilder.build({
  runtimeSnapshot: {
    provider: "runtime-project",
    snapshot: {
      currentNode: {
        name: "Opening",
      },
      queryProvider: {
        kind: "Delegate",
      },
    },
  },
});
assertEqual(delegateQueryProviderStatus.queryProvider.source, "delegate-unavailable", "delegate query provider unavailable in editor session");

const runtimeErrorStatus = RuntimeStatusSurfaceModelBuilder.build({
  runtimeSnapshot: {
    provider: "runtime-project",
    snapshot: {
      currentNode: {
        name: "Gate",
      },
      lastError: {
        code: "IRA007",
        message: "secret runtime error message",
      },
    },
  },
});
assertEqual(runtimeErrorStatus.state, "runtime-error", "runtime status error state");
assertEqual(runtimeErrorStatus.runtimeError.code, "IRA007", "runtime status error code");
assertEqual(runtimeErrorStatus.runtimeError.messageAvailable, true, "runtime status error message availability");
assertNotIncludesText(JSON.stringify(runtimeErrorStatus), "secret runtime error message");

const unavailableStatus = RuntimeStatusSurfaceModelBuilder.build({
  runtimeSnapshot: {
    error: "secret unavailable detail",
    provider: "unavailable",
    snapshot: null,
  },
});
assertEqual(unavailableStatus.state, "runtime-error", "unavailable envelope with error is error state");
assertEqual(unavailableStatus.queryProvider.source, "unavailable", "unavailable runtime has no query provider payload");
assertNotIncludesText(JSON.stringify(unavailableStatus), "secret unavailable detail");

const staleStatus = RuntimeStatusSurfaceModelBuilder.build({
  runtimeSnapshot: {
    provider: "runtime-project",
    snapshot: {
      currentNode: {
        name: "Gate",
      },
      stale: {
        isStale: true,
        reason: "workspace revision changed",
      },
    },
  },
});
assertEqual(staleStatus.state, "runtime-stale", "runtime status stale state");
assertEqual(staleStatus.stale.reason, "workspace revision changed", "runtime status stale reason");

const panelElement = new FakeElement("aside");
const controller = new RuntimeStatusPanelController(panelElement);
controller.render(runtimeStatus);
assertEqual(panelElement.dataset.runtimeStatusState, "runtime-ready", "runtime status panel dataset");
assertIncludesText(getTextContent(panelElement), "Runtime");
assertIncludesText(getTextContent(panelElement), "Provider");
assertIncludesText(getTextContent(panelElement), "runtime-project");
assertIncludesText(getTextContent(panelElement), "Node");
assertIncludesText(getTextContent(panelElement), "Gate");
assertIncludesText(getTextContent(panelElement), "Choices");
assertIncludesText(getTextContent(panelElement), "2");
assertIncludesText(getTextContent(panelElement), "Steps");
assertIncludesText(getTextContent(panelElement), "2/3");
assertIncludesText(getTextContent(panelElement), "Query");
assertIncludesText(getTextContent(panelElement), "mock (2)");
assertIncludesText(getTextContent(panelElement), "Pending");
assertIncludesText(getTextContent(panelElement), "wait_for_ui wait waiting");
assertIncludesText(getTextContent(panelElement), "Error");
assertIncludesText(getTextContent(panelElement), "none");
assertNotIncludesText(getTextContent(panelElement), "secret");

console.log("SelfHostedEditor runtime status surface contract ok");

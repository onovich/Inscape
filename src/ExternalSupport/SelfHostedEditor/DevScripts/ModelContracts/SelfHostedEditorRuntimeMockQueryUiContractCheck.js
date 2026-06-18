import { HostSchemaCapabilityModelMapper } from "../../Scripts/HostSchema/Models/HostSchemaCapabilityModelMapper.js";
import { RuntimeMockQueryPanelController } from "../../Scripts/Runtime/Controllers/RuntimeMockQueryPanelController.js";
import { SelfHostedEditorRuntimeBridge } from "../../Scripts/Runtime/Bridges/SelfHostedEditorRuntimeBridge.js";
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
  format: "inscape.host-schema.capabilities",
  formatVersion: 1,
  hostSchema: {
    errorMessage: "secret schema failure body",
    loaded: true,
    resolvedPath: "config/inscape.host.schema.json",
  },
  queries: [
    {
      isSimpleTextInterpolationQuery: false,
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
      isSimpleTextInterpolationQuery: false,
      name: "trust",
      parameters: [
        {
          name: "roleId",
          type: "string",
        },
      ],
      returnType: "number",
    },
    {
      name: "debug_mode",
      returnType: "bool",
    },
    {
      name: "inventory.snapshot",
      returnType: "object",
    },
  ],
});

const panelElement = new FakeElement("section");
const controller = new RuntimeMockQueryPanelController(panelElement);
let appliedProvider = null;
let resetCount = 0;
controller.onApplyRuntimeRequested(async (authoringModel) => {
  appliedProvider = authoringModel.runtimeQueryProvider;
  return {
    provider: "runtime-project",
    snapshot: {
      currentNode: {
        name: "Opening",
      },
    },
  };
});
controller.onResetRuntimeRequested(async () => {
  resetCount += 1;
});

controller.render(hostSchemaCatalog, {
  runtimeSnapshot: {
    provider: "unavailable",
  },
  sessionId: "mock-ui-session",
});
assertIncludesText(getTextContent(panelElement), "Mock Queries");
assertIncludesText(getTextContent(panelElement), "Runtime unavailable");
assertIncludesText(getTextContent(panelElement), "has_item");
assertEqual(panelElement.dataset.mockQueryState, "unavailable", "mock query panel unavailable state");

controller.render(hostSchemaCatalog, {
  runtimeSnapshot: {
    provider: "runtime-project",
    snapshot: {
      currentNode: {
        name: "Opening",
      },
    },
  },
});
controller.setMockEntries([
  {
    arguments: ["silver_key"],
    name: "has_item",
    value: true,
  },
  {
    arguments: ["mira"],
    name: "trust",
    value: "4",
  },
  {
    name: "debug_mode",
    value: "maybe",
  },
  {
    name: "unknown.secret",
    value: "secret unknown query value",
  },
]);
assertIncludesText(getTextContent(panelElement), "Ready 2");
assertIncludesText(getTextContent(panelElement), "Invalid 1");
assertIncludesText(getTextContent(panelElement), "Unknown 1");
assertIncludesText(getTextContent(panelElement), "debug_mode");
assertIncludesText(getTextContent(panelElement), "mock-query-invalid-value");
assertNotIncludesText(getTextContent(panelElement), "secret schema failure body");
assertNotIncludesText(getTextContent(panelElement), "secret unknown query value");

const buttons = panelElement.querySelectorAll(".runtime-mock-query-button");
assertEqual(buttons.length, 2, "mock query panel action buttons");
assertEqual(buttons[1].disabled, false, "mock query apply enabled when runtime is ready");
await buttons[1].click();
assertEqual(appliedProvider.kind, "Mock", "mock query apply provider kind");
assertEqual(appliedProvider.mockValues.length, 2, "mock query apply provider ready value count");
assertIncludesText(getTextContent(panelElement), "applied to Runtime preview");

await buttons[0].click();
assertEqual(resetCount, 1, "mock query reset callback");
assertEqual(controller.getAuthoringModel().readyCount, 0, "mock query reset clears ready values");
assertIncludesText(getTextContent(panelElement), "Missing 3");

const bridgeCalls = [];
const bridge = new SelfHostedEditorRuntimeBridge({
  runtimeSessionClient: {
    sessionId: "runtime-mock-ui",
    async startOrObserve(payload) {
      bridgeCalls.push({
        method: "startOrObserve",
        payload,
      });
      return {
        currentNode: {
          name: "Opening",
        },
      };
    },
    async step(payload) {
      bridgeCalls.push({
        method: "step",
        payload,
      });
      return {
        currentNode: {
          name: "Opening",
        },
      };
    },
  },
});
bridge.setMockQueryProvider({
  kind: "Mock",
  mockValues: [
    {
      name: "has_item",
      value: {
        boolValue: true,
        kind: "Bool",
      },
    },
  ],
});
await bridge.getRuntimeSnapshot("# Opening");
await bridge.stepRuntimeSnapshot("# Opening", null, {
  type: "continue",
});
assertEqual(bridgeCalls[0].payload.queryProvider.kind, "Mock", "runtime bridge start carries mock provider");
assertEqual(bridgeCalls[1].payload.queryProvider.mockValues.length, 1, "runtime bridge step carries mock provider");
bridge.clearMockQueryProvider();
await bridge.getRuntimeSnapshot("# Opening");
assertEqual(Object.prototype.hasOwnProperty.call(bridgeCalls[2].payload, "queryProvider"), false, "runtime bridge omits empty mock provider");

console.log("SelfHostedEditor runtime mock query UI contract ok");

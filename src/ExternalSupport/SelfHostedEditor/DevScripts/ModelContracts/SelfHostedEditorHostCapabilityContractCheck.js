import { SelfHostedEditorHostBindingBridge } from "../../Scripts/HostBinding/Bridges/SelfHostedEditorHostBindingBridge.js";
import { HostBindingCapabilityModelMapper } from "../../Scripts/HostBinding/Models/HostBindingCapabilityModelMapper.js";
import { HostCapabilityCatalogController } from "../../Scripts/HostSchema/Controllers/HostCapabilityCatalogController.js";
import { HostSchemaCapabilityModelMapper } from "../../Scripts/HostSchema/Models/HostSchemaCapabilityModelMapper.js";
import { assertEqual, assertIncludesText, FakeElement, findElementByClass, getTextContent, installFakeDomEnvironment } from "./SelfHostedEditorModelContractHarness.js";

installFakeDomEnvironment();

export const hostSchemaCatalog = HostSchemaCapabilityModelMapper.mapCatalog({
  actions: [
    {
      isNamedHostAction: true,
      mode: "fire",
      name: "quest.accepted",
    },
  ],
  events: [
    {
      delivery: "fire-and-forget",
      isNamedHostEvent: true,
      isLegacy: true,
      name: "legacy.quest.accepted",
    },
  ],
  format: "inscape.host-schema.capabilities",
  formatVersion: 1,
  hostSchema: {
    loaded: true,
  },
  queries: [
    {
      isSimpleTextInterpolationQuery: true,
      name: "player.gold",
      returnType: "number",
    },
  ],
});
assertEqual(hostSchemaCatalog.hostSchema.loaded, true, "host schema mapper loaded");
assertEqual(hostSchemaCatalog.queries[0].name, "player.gold", "host schema mapper query");
assertEqual(hostSchemaCatalog.actions[0].name, "quest.accepted", "host schema mapper action");
assertEqual(hostSchemaCatalog.actions[0].mode, "fire", "host schema mapper action mode");
assertEqual(hostSchemaCatalog.events[0].name, "legacy.quest.accepted", "host schema mapper event");
assertEqual(hostSchemaCatalog.events[0].isLegacy, true, "host schema mapper legacy event marker");
export const hostBindingCatalog = HostBindingCapabilityModelMapper.mapCatalog({
  bindings: [
    {
      assetId: "2001",
      kind: "timeline",
      locations: [
        {
          character: 0,
          line: 0,
          sourceKind: "hostBridge",
          sourcePath: "config/inscape.host.bridge.json",
        },
        {
          character: 10,
          line: 4,
          sourceKind: "script",
          sourcePath: "story/opening.inscape",
        },
      ],
      name: "court_intro",
    },
  ],
  format: "inscape.host-binding.capabilities",
  formatVersion: 1,
  hostBridge: {
    loaded: true,
  },
  speakers: [
    {
      locations: [
        {
          character: 0,
          line: 0,
          sourceKind: "hostBridge",
          sourcePath: "config/inscape.host.bridge.json",
        },
        {
          character: 0,
          line: 2,
          sourceKind: "script",
          sourcePath: "story/opening.inscape",
        },
      ],
      name: "Narrator",
      roleId: "1001",
    },
  ],
});
assertEqual(hostBindingCatalog.hostBridge.loaded, true, "host binding mapper loaded");
assertEqual(hostBindingCatalog.speakers[0].name, "Narrator", "host binding mapper speaker");
assertEqual(hostBindingCatalog.speakers[0].locations.length, 2, "host binding mapper speaker locations");
assertEqual(hostBindingCatalog.bindings[0].name, "court_intro", "host binding mapper binding");
assertEqual(hostBindingCatalog.bindings[0].locations[1].sourcePath, "story/opening.inscape", "host binding mapper binding location");
const hostBindingBridge = new SelfHostedEditorHostBindingBridge();
hostBindingBridge.getCapabilityCatalog = async () => hostBindingCatalog;
const speakerDefinition = await hostBindingBridge.getDefinition("", {
  kind: "speaker",
  name: "Narrator",
});
assertEqual(speakerDefinition?.location.sourcePath, "config/inscape.host.bridge.json", "host binding bridge speaker definition should prefer host bridge");
const speakerReferences = await hostBindingBridge.getReferences("", {
  kind: "speaker",
  name: "Narrator",
});
assertEqual(speakerReferences.length, 2, "host binding bridge speaker references");
const timelineDefinition = await hostBindingBridge.getDefinition("", {
  bindingKind: "timeline",
  kind: "host-binding",
  name: "court_intro",
});
assertEqual(timelineDefinition?.location.sourcePath, "config/inscape.host.bridge.json", "host binding bridge timeline definition should prefer host bridge");
const timelineReferences = await hostBindingBridge.getReferences("", {
  bindingKind: "timeline",
  kind: "host-binding",
  name: "court_intro",
});
assertEqual(timelineReferences.length, 2, "host binding bridge timeline references");
const hostCapabilityPanel = new FakeElement("section");
let selectedHostCapabilitySource = null;
const hostCapabilityCatalogController = new HostCapabilityCatalogController({
  hostBindingBridge: {
    async getCapabilityCatalog() {
      return hostBindingCatalog;
    },
  },
  hostSchemaBridge: {
    async getCapabilityCatalog() {
      return hostSchemaCatalog;
    },
  },
  panelElement: hostCapabilityPanel,
});
hostCapabilityCatalogController.onSourceLineSelected((selection) => {
  selectedHostCapabilitySource = selection;
});
await hostCapabilityCatalogController.render("");
assertIncludesText(getTextContent(hostCapabilityPanel), "Host Schema");
assertIncludesText(getTextContent(hostCapabilityPanel), "Host Bridge");
assertIncludesText(getTextContent(hostCapabilityPanel), "player.gold");
assertIncludesText(getTextContent(hostCapabilityPanel), "quest.accepted");
assertIncludesText(getTextContent(hostCapabilityPanel), "legacy.quest.accepted");
assertIncludesText(getTextContent(hostCapabilityPanel), "Narrator");
assertIncludesText(getTextContent(hostCapabilityPanel), "court_intro");
findElementByClass(hostCapabilityPanel, "host-capability-source")?.click();
assertEqual(selectedHostCapabilitySource?.sourcePath, "config/inscape.host.bridge.json", "host capability source button should jump to shared capability source path");
assertEqual(selectedHostCapabilitySource?.lineNumber, 1, "host capability source button should convert source line to editor line number");

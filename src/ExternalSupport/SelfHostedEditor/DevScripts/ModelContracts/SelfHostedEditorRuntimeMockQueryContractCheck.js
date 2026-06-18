import {
  RuntimeMockQueryAuthoringFormat,
  RuntimeMockQueryAuthoringFormatVersion,
  RuntimeMockQueryModelBuilder,
} from "../../Scripts/Runtime/Models/RuntimeMockQueryModelBuilder.js";
import { HostSchemaCapabilityModelMapper } from "../../Scripts/HostSchema/Models/HostSchemaCapabilityModelMapper.js";
import { assertEqual, assertIncludesText, assertNotIncludesText } from "./SelfHostedEditorModelContractHarness.js";

const hostSchemaCatalog = HostSchemaCapabilityModelMapper.mapCatalog({
  format: "inscape.host-schema.capabilities",
  formatVersion: 1,
  hostSchema: {
    errorMessage: "secret host schema error text",
    loaded: true,
    resolvedPath: "config/inscape.host.schema.json",
  },
  queries: [
    {
      description: "Inventory flag",
      isSimpleTextInterpolationQuery: false,
      name: "has_item",
      parameters: [
        {
          idKind: "item",
          name: "itemId",
          type: "string",
        },
      ],
      returnType: "bool",
      sourcePath: "config/inscape.host.schema.json",
    },
    {
      name: "player.name",
      parameters: [],
      returnType: "string",
    },
    {
      isSimpleTextInterpolationQuery: false,
      name: "trust",
      parameters: [
        {
          idKind: "role",
          name: "roleId",
          type: "string",
        },
      ],
      returnType: "number",
    },
    {
      name: "debug_mode",
      parameters: [],
      returnType: "bool",
    },
    {
      name: "inventory.snapshot",
      parameters: [],
      returnType: "object",
    },
  ],
});

assertEqual(hostSchemaCatalog.queries.length, 5, "host schema mapper should keep parameterized runtime queries");
assertEqual(hostSchemaCatalog.queries.find((query) => query.name === "has_item")?.isSimpleTextInterpolationQuery, false, "host schema mapper should preserve simple interpolation marker");

const authoringModel = RuntimeMockQueryModelBuilder.build({
  hostSchemaCatalog,
  mockEntries: [
    {
      arguments: ["silver_key"],
      hostPayload: "secret host payload on ready entry",
      name: "has_item",
      value: "false",
    },
    {
      arguments: ["mira"],
      name: "trust",
      value: "4",
    },
    {
      name: "player.name",
      value: "Mira",
    },
    {
      name: "debug_mode",
      value: "maybe",
    },
    {
      name: "inventory.snapshot",
      value: "secret unsupported object",
    },
    {
      hostPayload: "secret unknown host payload",
      name: "player.godl",
      value: 12,
    },
  ],
  sessionId: "round-3-session",
  workspaceRevision: 15,
});

assertEqual(authoringModel.format, RuntimeMockQueryAuthoringFormat, "mock query authoring format");
assertEqual(authoringModel.formatVersion, RuntimeMockQueryAuthoringFormatVersion, "mock query authoring format version");
assertEqual(authoringModel.authoringOnly, true, "mock query model should be authoring-only");
assertEqual(authoringModel.payloadContentExposed, false, "mock query model should not expose workspace payload");
assertEqual(authoringModel.contentPolicy.writesToRuntimeState, false, "mock query model should not write formal runtime state");
assertEqual(authoringModel.hostSchema.loaded, true, "mock query model host schema loaded");
assertEqual(authoringModel.hostSchema.queryCount, 5, "mock query model query count");
assertEqual(authoringModel.hostSchema.errorMessageAvailable, true, "mock query model should only expose host schema error presence");
assertEqual(authoringModel.rows.length, 5, "mock query model should produce one row per schema query when one entry exists");
assertEqual(authoringModel.readyCount, 3, "mock query ready count");
assertEqual(authoringModel.missingCount, 0, "mock query missing count");
assertEqual(authoringModel.invalidCount, 1, "mock query invalid count");
assertEqual(authoringModel.unsupportedCount, 1, "mock query unsupported count");
assertEqual(authoringModel.unknownCount, 1, "mock query unknown count");
assertEqual(authoringModel.runtimeQueryProvider.kind, "Mock", "runtime mock provider kind");
assertEqual(authoringModel.runtimeQueryProvider.mockValues.length, 3, "runtime mock provider should include only ready values");

const hasItemRow = authoringModel.rows.find((row) => row.name === "has_item");
assertEqual(hasItemRow?.state, "ready", "has_item mock row ready");
assertEqual(hasItemRow?.valueKind, "Bool", "has_item value kind");
assertEqual(hasItemRow?.runtimeArguments[0].kind, "String", "has_item argument kind");
assertEqual(hasItemRow?.runtimeArguments[0].stringValue, "silver_key", "has_item argument value");
assertEqual(hasItemRow?.runtimeValue.boolValue, false, "has_item bool mock value");

const trustRow = authoringModel.rows.find((row) => row.name === "trust");
assertEqual(trustRow?.state, "ready", "trust mock row ready");
assertEqual(trustRow?.runtimeValue.numberValue, 4, "trust numeric mock value");

const playerNameRow = authoringModel.rows.find((row) => row.name === "player.name");
assertEqual(playerNameRow?.state, "ready", "player.name mock row ready");
assertEqual(playerNameRow?.runtimeValue.stringValue, "Mira", "player.name string mock value");

const debugRow = authoringModel.rows.find((row) => row.name === "debug_mode");
assertEqual(debugRow?.state, "invalid-value", "debug_mode invalid bool row");
assertIncludesText(debugRow?.diagnostics[0]?.code || "", "invalid");

const unsupportedRow = authoringModel.rows.find((row) => row.name === "inventory.snapshot");
assertEqual(unsupportedRow?.state, "unsupported-type", "unsupported query row");
assertEqual(unsupportedRow?.runtimeValue, null, "unsupported query should not produce runtime value");

assertEqual(authoringModel.unknownQueries[0]?.name, "player.godl", "unknown mock query name");
assertEqual(authoringModel.unknownQueries[0]?.state, "unknown-query", "unknown mock query state");
assertIncludesText(authoringModel.diagnostics.map((diagnostic) => diagnostic.code).join(","), "mock-query-unknown");

const missingModel = RuntimeMockQueryModelBuilder.build({
  hostSchemaCatalog,
  mockEntries: [],
});
assertEqual(missingModel.rows.length, 5, "missing model rows");
assertEqual(missingModel.missingCount, 4, "missing model should mark supported schema queries without values");
assertEqual(missingModel.unsupportedCount, 1, "missing model should still mark unsupported return type");
assertEqual(missingModel.runtimeQueryProvider.mockValues.length, 0, "missing model should not produce runtime provider values");

const unsupportedParameterModel = RuntimeMockQueryModelBuilder.build({
  hostSchemaCatalog: {
    hostSchema: {
      loaded: true,
    },
    queries: [
      {
        name: "has_asset",
        parameters: [
          {
            name: "asset",
            type: "object",
          },
        ],
        returnType: "bool",
      },
    ],
  },
  mockEntries: [
    {
      arguments: ["secret asset payload"],
      name: "has_asset",
      value: true,
    },
  ],
});
assertEqual(unsupportedParameterModel.rows[0]?.state, "unsupported-type", "unsupported parameter type row");
assertEqual(unsupportedParameterModel.unsupportedCount, 1, "unsupported parameter count");
assertEqual(unsupportedParameterModel.runtimeQueryProvider.mockValues.length, 0, "unsupported parameter should not produce runtime provider value");

const serialized = JSON.stringify(authoringModel);
assertNotIncludesText(serialized, "secret host schema error text");
assertNotIncludesText(serialized, "secret host payload on ready entry");
assertNotIncludesText(serialized, "secret unknown host payload");
assertNotIncludesText(serialized, "secret unsupported object");
assertNotIncludesText(JSON.stringify(unsupportedParameterModel), "secret asset payload");
assertNotIncludesText(serialized, "formal-runtime-state-body");
assertIncludesText(JSON.stringify(authoringModel.runtimeQueryProvider), "\"kind\":\"Mock\"");

console.log("SelfHostedEditor runtime mock query contract ok");

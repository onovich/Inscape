import {
  exportRuntimeSubstateForScriptText,
  getRuntimeStateForScriptText,
  importRuntimeSubstateForScriptText,
  stepRuntimeStateForScriptText,
  validateRuntimeSubstateForScriptText,
} from "./StartSelfHostedEditorPreview.js";

const runtimeScript = `# Opening
@entry
Narrator: Hello
? Choose
- Visit witness -> Witness
- Stay here -> Stay

# Witness
Witness: Testimony
-> End

# Stay
Narrator: Staying put
-> End

# End
Narrator: Done`;
const queryRuntimeScript = `# Gate
@entry
Narrator: Gate
? Choose
- [has_item("silver_key")] Use key -> Open
- Knock -> Knock

# Open
Narrator: Open

# Knock
Narrator: Knock`;
const keyQueryProvider = {
  kind: "Mock",
  mockValues: [
    {
      arguments: [
        {
          kind: "String",
          stringValue: "silver_key",
        },
      ],
      name: "has_item",
      value: {
        boolValue: true,
        kind: "Bool",
      },
    },
  ],
};
const maximumRuntimePayloadBytes = 10000;

async function main() {
  const startedAt = Date.now();
  const openingSnapshot = await getRuntimeStateForScriptText(runtimeScript, null);
  assertRuntimeSnapshot(openingSnapshot, "Opening");
  assertEqual(openingSnapshot.currentNode?.source?.sourcePath, "draft.inscape", "opening source path");
  assertEqual(openingSnapshot.currentNode?.choices?.length, 1, "opening choice group count");
  assertEqual(openingSnapshot.currentNode?.choices?.[0]?.options?.[0]?.target, "Witness", "opening first choice target");
  assertEqual(openingSnapshot.currentNode?.choices?.[0]?.options?.[1]?.target, "Stay", "opening second choice target");
  assertEqual(openingSnapshot.queryProvider?.source, "internal", "opening query provider source");
  assertEqual(openingSnapshot.readingProgress?.contentStepCount, 1, "opening content step count");
  assertEqual(openingSnapshot.readingProgress?.visibleStepCount, 0, "opening visible step count");
  assertPayloadSize(openingSnapshot, "opening runtime snapshot");

  const querySnapshot = await getRuntimeStateForScriptText(queryRuntimeScript, null, "", keyQueryProvider);
  assertRuntimeSnapshot(querySnapshot, "Gate");
  assertEqual(querySnapshot.queryProvider?.source, "mock", "query snapshot provider source");
  assertEqual(querySnapshot.currentNode?.choices?.[0]?.options?.length, 2, "query snapshot visible choice count");
  assertEqual(querySnapshot.branchQueryReceipts?.length, 1, "query snapshot branch evidence count");
  assertEqual(querySnapshot.branchQueryReceipts?.[0]?.name, "has_item", "query snapshot branch evidence name");
  assertEqual(querySnapshot.branchQueryReceipts?.[0]?.context, "choice-condition", "query snapshot branch evidence context");
  assertEqual(querySnapshot.branchQueryReceipts?.[0]?.arguments?.[0]?.value, "silver_key", "query snapshot branch evidence argument");
  assertEqual(querySnapshot.branchQueryReceipts?.[0]?.result?.value, "true", "query snapshot branch evidence result");
  assertEqual(querySnapshot.branchQueryReceipts?.[0]?.sourceLine, 5, "query snapshot branch evidence source line");
  assertPayloadSize(querySnapshot, "query branch evidence runtime snapshot");

  const substateExport = await exportRuntimeSubstateForScriptText(queryRuntimeScript, null, querySnapshot, "runtime-substate-smoke", keyQueryProvider, null, {
    hostCheckpointId: "preview-checkpoint",
    scriptVersion: "script-v1",
  });
  assertEqual(substateExport.format, "inscape.self-hosted-editor.runtime-substate-operation", "runtime substate export operation format");
  assertEqual(substateExport.validationStatus, "compatible", "runtime substate export validation status");
  assertEqual(substateExport.substate?.format, "inscape.runtime-substate", "runtime substate artifact format");
  assertEqual(substateExport.substateSummary.branchReceiptCount, 1, "runtime substate branch receipt count");
  assertEqual(substateExport.substateSummary.hostCheckpointPresent, true, "runtime substate host checkpoint presence");
  assertEqual(substateExport.safety.notFullHostSave, true, "runtime substate is not full host save");
  assertRuntimeSubstatePayloadBoundary(substateExport.substateText, "runtime substate export payload");

  const substateValidate = await validateRuntimeSubstateForScriptText(queryRuntimeScript, null, substateExport.substateText, "runtime-substate-smoke", {
    scriptVersion: "script-v1",
  });
  assertEqual(substateValidate.validationStatus, "compatible", "runtime substate validate status");

  const substateDrift = await validateRuntimeSubstateForScriptText(queryRuntimeScript, null, substateExport.substateText, "runtime-substate-smoke", {
    scriptVersion: "script-v2",
  });
  assertEqual(substateDrift.validationStatus, "migratable", "runtime substate script drift status");

  const substateImport = await importRuntimeSubstateForScriptText(queryRuntimeScript, null, substateExport.substateText, "runtime-substate-smoke", keyQueryProvider, null, {
    scriptVersion: "script-v1",
  });
  assertEqual(substateImport.imported, true, "runtime substate compatible import flag");
  assertRuntimeSnapshot(substateImport.runtimeSnapshot, "Gate");

  const substateBlockedImport = await importRuntimeSubstateForScriptText(queryRuntimeScript, null, substateExport.substateText, "runtime-substate-smoke", keyQueryProvider, null, {
    scriptVersion: "script-v2",
  });
  assertEqual(substateBlockedImport.imported, false, "runtime substate migratable import blocked");
  assertEqual(substateBlockedImport.validationStatus, "migratable", "runtime substate blocked import status");

  const invalidSubstate = await validateRuntimeSubstateForScriptText(queryRuntimeScript, null, "{", "runtime-substate-smoke", {
    scriptVersion: "script-v1",
  });
  assertEqual(invalidSubstate.validationStatus, "error", "runtime substate invalid JSON status");

  const openingLineSnapshot = await stepRuntimeStateForScriptText(runtimeScript, null, openingSnapshot, {
    type: "advance-flow",
  });
  assertRuntimeSnapshot(openingLineSnapshot, "Opening");
  assertEqual(openingLineSnapshot.state?.visibleStepCount, 1, "opening visible step count after first flow advance");
  assertEqual(openingLineSnapshot.readingProgress?.isChoiceStageVisible, false, "opening choices should stay hidden after first flow advance");
  assertEqual(openingLineSnapshot.logEntries?.[0]?.text, "Hello", "opening runtime log text after first flow advance");
  assertEqual(openingLineSnapshot.logEntries?.[0]?.speaker, "Narrator", "opening runtime log speaker after first flow advance");

  const openingChoiceStageSnapshot = await stepRuntimeStateForScriptText(runtimeScript, null, openingLineSnapshot, {
    type: "advance-flow",
  });
  assertRuntimeSnapshot(openingChoiceStageSnapshot, "Opening");
  assertEqual(openingChoiceStageSnapshot.state?.visibleStepCount, 2, "opening visible step count after second flow advance");
  assertEqual(openingChoiceStageSnapshot.readingProgress?.isChoiceStageVisible, true, "opening choices should become visible after second flow advance");

  const openingRewoundFlowSnapshot = await stepRuntimeStateForScriptText(runtimeScript, null, openingChoiceStageSnapshot, {
    type: "rewind-flow",
  });
  assertRuntimeSnapshot(openingRewoundFlowSnapshot, "Opening");
  assertEqual(openingRewoundFlowSnapshot.state?.visibleStepCount, 1, "opening visible step count after flow rewind");

  const witnessSnapshot = await stepRuntimeStateForScriptText(runtimeScript, null, openingSnapshot, {
    groupIndex: 0,
    optionIndex: 0,
    type: "choose",
  });
  assertRuntimeSnapshot(witnessSnapshot, "Witness");
  assertEqual(witnessSnapshot.currentNode?.defaultNext, "End", "witness default next");
  assertEqual(witnessSnapshot.state?.path?.length, 2, "witness path length");
  assertEqual(witnessSnapshot.state?.path?.[1], "Witness", "witness path tail");
  assertEqual(witnessSnapshot.state?.visibleStepCount, 0, "witness visible step count");
  assertPayloadSize(witnessSnapshot, "witness runtime snapshot");

  const witnessContinueStageSnapshot = await stepRuntimeStateForScriptText(runtimeScript, null, witnessSnapshot, {
    type: "advance-flow",
  });
  assertRuntimeSnapshot(witnessContinueStageSnapshot, "Witness");
  assertEqual(witnessContinueStageSnapshot.state?.visibleStepCount, 1, "witness visible step count after flow advance");
  assertEqual(witnessContinueStageSnapshot.readingProgress?.isContinueStageVisible, false, "witness continue should stay hidden after first flow advance");

  const witnessContinueVisibleSnapshot = await stepRuntimeStateForScriptText(runtimeScript, null, witnessContinueStageSnapshot, {
    type: "advance-flow",
  });
  assertRuntimeSnapshot(witnessContinueVisibleSnapshot, "Witness");
  assertEqual(witnessContinueVisibleSnapshot.state?.visibleStepCount, 2, "witness visible step count after second flow advance");
  assertEqual(witnessContinueVisibleSnapshot.readingProgress?.isContinueStageVisible, true, "witness continue should become visible after second flow advance");

  const rewoundSnapshot = await stepRuntimeStateForScriptText(runtimeScript, null, witnessSnapshot, {
    type: "rewind",
  });
  assertRuntimeSnapshot(rewoundSnapshot, "Opening");
  assertEqual(rewoundSnapshot.state?.path?.length, 1, "rewound path length");
  assertEqual(rewoundSnapshot.state?.path?.[0], "Opening", "rewound path tail");
  assertEqual(rewoundSnapshot.state?.visibleStepCount, 2, "rewound visible step count");
  assertPayloadSize(rewoundSnapshot, "rewound runtime snapshot");

  const endSnapshot = await stepRuntimeStateForScriptText(runtimeScript, null, witnessSnapshot, {
    type: "continue",
  });
  const elapsedMilliseconds = Date.now() - startedAt;
  assertRuntimeSnapshot(endSnapshot, "End");
  assertEqual(endSnapshot.currentNode?.defaultNext, "", "end default next");
  assertEqual(endSnapshot.currentNode?.choices?.length, 0, "end choice group count");
  assertEqual(endSnapshot.currentNode?.lines?.[0]?.text, "Done", "end dialogue text");
  assertEqual(endSnapshot.state?.path?.length, 3, "end path length");
  assertEqual(endSnapshot.state?.path?.[2], "End", "end path tail");
  assertPayloadSize(endSnapshot, "end runtime snapshot");

  console.log(`SelfHostedEditor runtime smoke ok (${elapsedMilliseconds}ms)`);
}

function assertRuntimeSnapshot(snapshot, expectedNodeName) {
  if (snapshot?.format !== "inscape.self-hosted-editor.runtime-state") {
    throw new Error(`Unexpected runtime format: ${String(snapshot?.format || "")}`);
  }

  if (snapshot?.formatVersion !== 1) {
    throw new Error(`Unexpected runtime formatVersion: ${String(snapshot?.formatVersion || "")}`);
  }

  assertEqual(snapshot.currentNode?.name, expectedNodeName, `runtime current node (${expectedNodeName})`);
  assertEqual(snapshot.state?.currentNodeName, expectedNodeName, `runtime state current node (${expectedNodeName})`);
}

function assertPayloadSize(snapshot, label) {
  const payloadBytes = Buffer.byteLength(JSON.stringify(snapshot), "utf8");
  if (payloadBytes > maximumRuntimePayloadBytes) {
    throw new Error(`${label} too large: ${payloadBytes} bytes.`);
  }
}

function assertRuntimeSubstatePayloadBoundary(payloadText, label) {
  for (const forbidden of ["logEntries", "actionRequests", "inventory", "traceReplay", "rollbackStack"]) {
    if (String(payloadText || "").includes(forbidden)) {
      throw new Error(`${label} must not include ${forbidden}.`);
    }
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});

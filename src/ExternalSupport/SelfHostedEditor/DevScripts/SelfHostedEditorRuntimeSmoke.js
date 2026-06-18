import {
  getRuntimeStateForScriptText,
  stepRuntimeStateForScriptText,
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

  const openingLineSnapshot = await stepRuntimeStateForScriptText(runtimeScript, null, openingSnapshot, {
    type: "advance-flow",
  });
  assertRuntimeSnapshot(openingLineSnapshot, "Opening");
  assertEqual(openingLineSnapshot.state?.visibleStepCount, 1, "opening visible step count after first flow advance");
  assertEqual(openingLineSnapshot.readingProgress?.isChoiceStageVisible, false, "opening choices should stay hidden after first flow advance");

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

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});

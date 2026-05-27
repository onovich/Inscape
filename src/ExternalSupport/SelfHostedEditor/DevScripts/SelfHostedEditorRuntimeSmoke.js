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
  assertPayloadSize(openingSnapshot, "opening runtime snapshot");

  const witnessSnapshot = await stepRuntimeStateForScriptText(runtimeScript, null, openingSnapshot, {
    groupIndex: 0,
    optionIndex: 0,
    type: "choose",
  });
  assertRuntimeSnapshot(witnessSnapshot, "Witness");
  assertEqual(witnessSnapshot.currentNode?.defaultNext, "End", "witness default next");
  assertEqual(witnessSnapshot.state?.path?.length, 2, "witness path length");
  assertEqual(witnessSnapshot.state?.path?.[1], "Witness", "witness path tail");
  assertPayloadSize(witnessSnapshot, "witness runtime snapshot");

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

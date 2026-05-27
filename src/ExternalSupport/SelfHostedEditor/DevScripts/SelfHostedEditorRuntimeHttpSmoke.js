import {
  createSelfHostedEditorPreviewServer,
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
  const server = createSelfHostedEditorPreviewServer(0);
  const address = await listen(server);

  try {
    const startedAt = Date.now();
    const openingResponse = await fetch(`http://127.0.0.1:${address.port}/api/runtime-state`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ scriptText: runtimeScript }),
    });
    const openingPayloadText = await openingResponse.text();
    const openingSnapshot = JSON.parse(openingPayloadText);
    if (!openingResponse.ok) {
      throw new Error(`Runtime state HTTP smoke failed with HTTP ${openingResponse.status}.`);
    }

    assertRuntimeSnapshot(openingSnapshot, "Opening");
    assertPayloadSize(openingPayloadText, "opening runtime HTTP payload");

    const stayResponse = await fetch(`http://127.0.0.1:${address.port}/api/runtime-action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: {
          groupIndex: 0,
          optionIndex: 1,
          type: "choose",
        },
        runtimeState: openingSnapshot,
        scriptText: runtimeScript,
      }),
    });
    const stayPayloadText = await stayResponse.text();
    const staySnapshot = JSON.parse(stayPayloadText);
    if (!stayResponse.ok) {
      throw new Error(`Runtime choose HTTP smoke failed with HTTP ${stayResponse.status}.`);
    }

    assertRuntimeSnapshot(staySnapshot, "Stay");
    assertEqual(staySnapshot.state?.path?.length, 2, "stay path length");
    assertEqual(staySnapshot.currentNode?.defaultNext, "End", "stay default next");
    assertPayloadSize(stayPayloadText, "stay runtime HTTP payload");

    const endResponse = await fetch(`http://127.0.0.1:${address.port}/api/runtime-action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: {
          type: "continue",
        },
        runtimeState: staySnapshot,
        scriptText: runtimeScript,
      }),
    });
    const endPayloadText = await endResponse.text();
    const endSnapshot = JSON.parse(endPayloadText);
    const elapsedMilliseconds = Date.now() - startedAt;
    if (!endResponse.ok) {
      throw new Error(`Runtime continue HTTP smoke failed with HTTP ${endResponse.status}.`);
    }

    assertRuntimeSnapshot(endSnapshot, "End");
    assertEqual(endSnapshot.state?.path?.length, 3, "end path length");
    assertEqual(endSnapshot.currentNode?.lines?.[0]?.text, "Done", "end dialogue text");
    assertPayloadSize(endPayloadText, "end runtime HTTP payload");

    console.log(`SelfHostedEditor runtime HTTP smoke ok (${elapsedMilliseconds}ms)`);
  } finally {
    await close(server);
  }
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

function assertPayloadSize(payloadText, label) {
  const payloadBytes = Buffer.byteLength(payloadText, "utf8");
  if (payloadBytes > maximumRuntimePayloadBytes) {
    throw new Error(`${label} too large: ${payloadBytes} bytes.`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
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

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
const actionRuntimeScript = `# ActionStart
@entry
@emit play_timeline intro
Narrator: Action begins.
? Continue
- Wait -> WaitNode

# WaitNode
@emit wait_for_ui confirm
Narrator: Waiting.
-> End

# End
Narrator: Done`;
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
const noKeyQueryProvider = {
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
        boolValue: false,
        kind: "Bool",
      },
    },
  ],
};
const actionDispatcher = {
  actions: [
    {
      mode: "fire",
      name: "play_timeline",
    },
    {
      mode: "wait",
      name: "wait_for_ui",
    },
  ],
  handlers: [
    {
      handlerName: "Timeline.Play",
      name: "play_timeline",
    },
    {
      handlerName: "Ui.WaitForUi",
      name: "wait_for_ui",
    },
  ],
};
const maximumRuntimePayloadBytes = 10000;

async function main() {
  const server = createSelfHostedEditorPreviewServer(0);
  const address = await listen(server);
  const sessionId = "runtime-http-smoke";

  try {
    const startedAt = Date.now();
    const openingResponse = await fetch(`http://127.0.0.1:${address.port}/api/runtime-state`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scriptText: runtimeScript,
        sessionId,
      }),
    });
    const openingPayloadText = await openingResponse.text();
    const openingSnapshot = JSON.parse(openingPayloadText);
    if (!openingResponse.ok) {
      throw new Error(`Runtime state HTTP smoke failed with HTTP ${openingResponse.status}.`);
    }

    assertRuntimeSnapshot(openingSnapshot, "Opening");
    assertEqual(openingSnapshot.sessionId, sessionId, "opening runtime session id");
    assertEqual(openingSnapshot.queryProvider?.source, "internal", "opening query provider source");
    assertEqual(openingSnapshot.readingProgress?.contentStepCount, 1, "opening content step count");
    assertEqual(openingSnapshot.readingProgress?.visibleStepCount, 0, "opening visible step count");
    assertPayloadSize(openingPayloadText, "opening runtime HTTP payload");

    const queryProviderResponse = await fetch(`http://127.0.0.1:${address.port}/api/runtime-state`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        queryProvider: keyQueryProvider,
        scriptText: queryRuntimeScript,
        sessionId: "runtime-http-mock-query",
      }),
    });
    const queryProviderPayloadText = await queryProviderResponse.text();
    const queryProviderSnapshot = JSON.parse(queryProviderPayloadText);
    if (!queryProviderResponse.ok) {
      throw new Error(`Runtime mock query provider HTTP smoke failed with HTTP ${queryProviderResponse.status}.`);
    }

    assertRuntimeSnapshot(queryProviderSnapshot, "Gate");
    assertEqual(queryProviderSnapshot.queryProvider?.source, "mock", "mock query provider source");
    assertEqual(queryProviderSnapshot.queryProvider?.mockValueCount, 1, "mock query provider value count");
    assertEqual(queryProviderPayloadText.includes("silver_key"), false, "mock query provider value stays out of runtime HTTP payload");
    assertEqual(queryProviderSnapshot.currentNode?.choices?.[0]?.options?.length, 2, "mock query provider shows conditional key option");
    assertEqual(queryProviderSnapshot.currentNode?.choices?.[0]?.options?.[0]?.text, "Use key", "mock query provider key option text");
    assertPayloadSize(queryProviderPayloadText, "mock query provider runtime HTTP payload");

    const noKeyResponse = await fetch(`http://127.0.0.1:${address.port}/api/runtime-state`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        queryProvider: noKeyQueryProvider,
        scriptText: queryRuntimeScript,
        sessionId: "runtime-http-hidden-log",
      }),
    });
    const noKeyPayloadText = await noKeyResponse.text();
    const noKeySnapshot = JSON.parse(noKeyPayloadText);
    if (!noKeyResponse.ok) {
      throw new Error(`Runtime no-key query provider HTTP smoke failed with HTTP ${noKeyResponse.status}.`);
    }

    assertRuntimeSnapshot(noKeySnapshot, "Gate");
    assertEqual(noKeySnapshot.currentNode?.choices?.[0]?.options?.length, 1, "no-key provider hides key option");
    assertEqual(noKeyPayloadText.includes("Open"), false, "hidden conditional target stays out of no-key Runtime payload");

    const noKeyChooseResponse = await fetch(`http://127.0.0.1:${address.port}/api/runtime-action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: {
          groupIndex: 0,
          optionIndex: 0,
          type: "choose",
        },
        queryProvider: noKeyQueryProvider,
        runtimeState: noKeySnapshot,
        sessionId: "runtime-http-hidden-log",
        scriptText: queryRuntimeScript,
      }),
    });
    const noKeyChoosePayloadText = await noKeyChooseResponse.text();
    const noKeyChooseSnapshot = JSON.parse(noKeyChoosePayloadText);
    if (!noKeyChooseResponse.ok) {
      throw new Error(`Runtime no-key choose HTTP smoke failed with HTTP ${noKeyChooseResponse.status}.`);
    }

    assertRuntimeSnapshot(noKeyChooseSnapshot, "Knock");

    const noKeyLogResponse = await fetch(`http://127.0.0.1:${address.port}/api/runtime-action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: {
          type: "advance-flow",
        },
        queryProvider: noKeyQueryProvider,
        runtimeState: noKeyChooseSnapshot,
        sessionId: "runtime-http-hidden-log",
        scriptText: queryRuntimeScript,
      }),
    });
    const noKeyLogPayloadText = await noKeyLogResponse.text();
    const noKeyLogSnapshot = JSON.parse(noKeyLogPayloadText);
    if (!noKeyLogResponse.ok) {
      throw new Error(`Runtime no-key log HTTP smoke failed with HTTP ${noKeyLogResponse.status}.`);
    }

    assertRuntimeSnapshot(noKeyLogSnapshot, "Knock");
    assertEqual(noKeyLogSnapshot.logEntries?.[0]?.text, "Knock", "Runtime log shows displayed no-key branch text");
    assertEqual(noKeyLogPayloadText.includes("Open"), false, "Runtime log payload excludes hidden conditional branch text");
    assertPayloadSize(noKeyLogPayloadText, "no-key log runtime HTTP payload");

    const actionStartResponse = await fetch(`http://127.0.0.1:${address.port}/api/runtime-state`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        actionDispatcher,
        scriptText: actionRuntimeScript,
        sessionId: "runtime-http-action",
      }),
    });
    const actionStartPayloadText = await actionStartResponse.text();
    const actionStartSnapshot = JSON.parse(actionStartPayloadText);
    if (!actionStartResponse.ok) {
      throw new Error(`Runtime action HTTP smoke failed with HTTP ${actionStartResponse.status}.`);
    }

    assertRuntimeSnapshot(actionStartSnapshot, "ActionStart");
    assertEqual(actionStartSnapshot.actionRequests?.[0]?.name, "play_timeline", "runtime fire action request name");
    assertEqual(actionStartSnapshot.actionRequests?.[0]?.mode, "fire", "runtime fire action request mode");
    assertEqual(actionStartSnapshot.pendingAction, null, "runtime fire action should not create pending action");
    assertPayloadSize(actionStartPayloadText, "fire action runtime HTTP payload");

    const pendingActionResponse = await fetch(`http://127.0.0.1:${address.port}/api/runtime-action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: {
          groupIndex: 0,
          optionIndex: 0,
          type: "choose",
        },
        actionDispatcher,
        runtimeState: actionStartSnapshot,
        sessionId: "runtime-http-action",
        scriptText: actionRuntimeScript,
      }),
    });
    const pendingActionPayloadText = await pendingActionResponse.text();
    const pendingActionSnapshot = JSON.parse(pendingActionPayloadText);
    if (!pendingActionResponse.ok) {
      throw new Error(`Runtime pending action HTTP smoke failed with HTTP ${pendingActionResponse.status}.`);
    }

    assertRuntimeSnapshot(pendingActionSnapshot, "WaitNode");
    assertEqual(pendingActionSnapshot.pendingAction?.name, "wait_for_ui", "runtime wait pending action name");
    assertEqual(pendingActionSnapshot.pendingAction?.mode, "wait", "runtime wait pending action mode");
    assertEqual(Boolean(pendingActionSnapshot.pendingAction?.requestId), true, "runtime wait pending action request id");
    assertEqual(pendingActionSnapshot.actionRequests?.at(-1)?.name, "wait_for_ui", "runtime wait action request evidence");
    assertPayloadSize(pendingActionPayloadText, "pending action runtime HTTP payload");

    const resumeActionResponse = await fetch(`http://127.0.0.1:${address.port}/api/runtime-action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: {
          requestId: pendingActionSnapshot.pendingAction?.requestId,
          status: "completed",
          type: "resume-action",
        },
        actionDispatcher,
        runtimeState: pendingActionSnapshot,
        sessionId: "runtime-http-action",
        scriptText: actionRuntimeScript,
      }),
    });
    const resumeActionPayloadText = await resumeActionResponse.text();
    const resumeActionSnapshot = JSON.parse(resumeActionPayloadText);
    if (!resumeActionResponse.ok) {
      throw new Error(`Runtime resume action HTTP smoke failed with HTTP ${resumeActionResponse.status}.`);
    }

    assertRuntimeSnapshot(resumeActionSnapshot, "WaitNode");
    assertEqual(resumeActionSnapshot.pendingAction, null, "runtime resume action clears pending action through Runtime");
    assertPayloadSize(resumeActionPayloadText, "resume action runtime HTTP payload");

    const openingAdvanceResponse = await fetch(`http://127.0.0.1:${address.port}/api/runtime-action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: {
          type: "advance-flow",
        },
        sessionId,
        scriptText: runtimeScript,
      }),
    });
    const openingAdvancePayloadText = await openingAdvanceResponse.text();
    const openingAdvanceSnapshot = JSON.parse(openingAdvancePayloadText);
    if (!openingAdvanceResponse.ok) {
      throw new Error(`Runtime advance-flow HTTP smoke failed with HTTP ${openingAdvanceResponse.status}.`);
    }

    assertRuntimeSnapshot(openingAdvanceSnapshot, "Opening");
    assertEqual(openingAdvanceSnapshot.sessionId, sessionId, "advance runtime session id");
    assertEqual(openingAdvanceSnapshot.state?.visibleStepCount, 1, "opening visible step count after first flow advance");
    assertEqual(openingAdvanceSnapshot.readingProgress?.isChoiceStageVisible, false, "opening choices should stay hidden after first flow advance");
    assertEqual(openingAdvanceSnapshot.logEntries?.[0]?.text, "Hello", "opening runtime HTTP log text after first flow advance");

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
        sessionId,
        scriptText: runtimeScript,
      }),
    });
    const stayPayloadText = await stayResponse.text();
    const staySnapshot = JSON.parse(stayPayloadText);
    if (!stayResponse.ok) {
      throw new Error(`Runtime choose HTTP smoke failed with HTTP ${stayResponse.status}.`);
    }

    assertRuntimeSnapshot(staySnapshot, "Stay");
    assertEqual(staySnapshot.sessionId, sessionId, "choose runtime session id");
    assertEqual(staySnapshot.state?.path?.length, 2, "stay path length");
    assertEqual(staySnapshot.state?.visibleStepCount, 0, "stay visible step count");
    assertEqual(staySnapshot.currentNode?.defaultNext, "End", "stay default next");
    assertPayloadSize(stayPayloadText, "stay runtime HTTP payload");

    const stayAdvanceResponse = await fetch(`http://127.0.0.1:${address.port}/api/runtime-action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: {
          type: "advance-flow",
        },
        sessionId,
        scriptText: runtimeScript,
      }),
    });
    const stayAdvancePayloadText = await stayAdvanceResponse.text();
    const stayAdvanceSnapshot = JSON.parse(stayAdvancePayloadText);
    if (!stayAdvanceResponse.ok) {
      throw new Error(`Runtime stay advance-flow HTTP smoke failed with HTTP ${stayAdvanceResponse.status}.`);
    }

    assertRuntimeSnapshot(stayAdvanceSnapshot, "Stay");
    assertEqual(stayAdvanceSnapshot.sessionId, sessionId, "stay advance runtime session id");
    assertEqual(stayAdvanceSnapshot.state?.visibleStepCount, 1, "stay visible step count after first flow advance");
    assertEqual(stayAdvanceSnapshot.logEntries?.[0]?.text, "Staying put", "stay runtime HTTP log text after first flow advance");

    const stayRewindFlowResponse = await fetch(`http://127.0.0.1:${address.port}/api/runtime-action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: {
          type: "rewind-flow",
        },
        sessionId,
        scriptText: runtimeScript,
      }),
    });
    const stayRewindFlowPayloadText = await stayRewindFlowResponse.text();
    const stayRewindFlowSnapshot = JSON.parse(stayRewindFlowPayloadText);
    if (!stayRewindFlowResponse.ok) {
      throw new Error(`Runtime stay rewind-flow HTTP smoke failed with HTTP ${stayRewindFlowResponse.status}.`);
    }

    assertRuntimeSnapshot(stayRewindFlowSnapshot, "Stay");
    assertEqual(stayRewindFlowSnapshot.sessionId, sessionId, "stay rewind-flow runtime session id");
    assertEqual(stayRewindFlowSnapshot.state?.visibleStepCount, 0, "stay visible step count after flow rewind");
    assertPayloadSize(stayRewindFlowPayloadText, "stay rewind-flow runtime HTTP payload");

    const rewindResponse = await fetch(`http://127.0.0.1:${address.port}/api/runtime-action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: {
          type: "rewind",
        },
        sessionId,
        scriptText: runtimeScript,
      }),
    });
    const rewindPayloadText = await rewindResponse.text();
    const rewindSnapshot = JSON.parse(rewindPayloadText);
    if (!rewindResponse.ok) {
      throw new Error(`Runtime rewind HTTP smoke failed with HTTP ${rewindResponse.status}.`);
    }

    assertRuntimeSnapshot(rewindSnapshot, "Opening");
    assertEqual(rewindSnapshot.sessionId, sessionId, "rewind runtime session id");
    assertEqual(rewindSnapshot.state?.path?.length, 1, "rewind path length");
    assertEqual(rewindSnapshot.state?.visibleStepCount, 2, "rewind visible step count");
    assertPayloadSize(rewindPayloadText, "rewind runtime HTTP payload");

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
        sessionId,
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
    assertEqual(endSnapshot.sessionId, sessionId, "continue runtime session id");
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

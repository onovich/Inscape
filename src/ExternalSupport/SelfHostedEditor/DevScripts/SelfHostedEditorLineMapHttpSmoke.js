import {
  createSelfHostedEditorPreviewServer,
} from "./StartSelfHostedEditorPreview.js";

const firstScript = `# Opening
Narrator: Hello
? Choose
- Go -> End

# End
Narrator: Done`;

const secondScript = `# Opening
Narrator: Hello
Narrator: New line
? Choose
- Go -> End

# End
Narrator: Done`;

async function main() {
  const server = createSelfHostedEditorPreviewServer(0);
  const address = await listen(server);
  const sessionId = "line-map-http-smoke";

  try {
    const startedAt = Date.now();
    const firstPayload = await postLineMapRefresh(address.port, {
      scriptText: firstScript,
      sessionId,
    });
    const secondPayload = await postLineMapRefresh(address.port, {
      scriptText: secondScript,
      sessionId,
    });

    assertLineMapPayload(firstPayload, sessionId, "first HTTP refresh");
    assertLineMapPayload(secondPayload, sessionId, "second HTTP refresh");

    const firstHello = findLine(firstPayload.lineMap, "Hello");
    const secondHello = findLine(secondPayload.lineMap, "Hello");
    const secondNewLine = findLine(secondPayload.lineMap, "New line");

    assertTruthy(firstHello?.lineId, "first Hello line id");
    assertEqual(secondHello?.lineId, firstHello.lineId, "HTTP session refresh should keep existing Hello line id");
    assertTruthy(secondNewLine?.lineId, "second New line id");
    assertNotEqual(secondNewLine.lineId, firstHello.lineId, "new line should get its own line id");
    assertIncludesAddedLine(secondPayload.refresh, "New line");

    console.log(`SelfHostedEditor line-map HTTP smoke ok (${Date.now() - startedAt}ms)`);
  } finally {
    await close(server);
  }
}

async function postLineMapRefresh(port, payload) {
  const response = await fetch(`http://127.0.0.1:${port}/api/line-map-refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const payloadText = await response.text();
  const parsedPayload = JSON.parse(payloadText);
  if (!response.ok) {
    throw new Error(`Line-map HTTP smoke failed with HTTP ${response.status}.`);
  }

  return parsedPayload;
}

function assertLineMapPayload(payload, sessionId, label) {
  assertEqual(payload?.format, "inscape.self-hosted-editor.line-map-refresh", `${label} format`);
  assertEqual(payload?.formatVersion, 1, `${label} formatVersion`);
  assertEqual(payload?.sessionId, sessionId, `${label} session id`);
  assertEqual(payload?.lineMap?.format, "inscape.localization-line-map", `${label} line-map format`);
}

function findLine(lineMap, text) {
  for (const document of Array.isArray(lineMap?.documents) ? lineMap.documents : []) {
    for (const block of Array.isArray(document?.blocks) ? document.blocks : []) {
      for (const line of Array.isArray(block?.lines) ? block.lines : []) {
        if (line?.text === text) {
          return line;
        }
      }
    }
  }

  return null;
}

function assertIncludesAddedLine(refresh, text) {
  const found = (Array.isArray(refresh?.report?.blocks) ? refresh.report.blocks : []).some((block) =>
    (Array.isArray(block?.changes) ? block.changes : []).some((change) =>
      change?.kind === "added" && change?.newText === text
    )
  );
  if (!found) {
    throw new Error(`Expected refresh report to include added line: ${text}`);
  }
}

function assertTruthy(value, label) {
  if (!value) {
    throw new Error(`${label}: expected a truthy value.`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertNotEqual(actual, expected, label) {
  if (actual === expected) {
    throw new Error(`${label}: expected ${actual} to differ from ${expected}`);
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

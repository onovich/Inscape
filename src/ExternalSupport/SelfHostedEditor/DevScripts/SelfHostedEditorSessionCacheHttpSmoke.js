import {
  createSelfHostedEditorPreviewServer,
} from "./StartSelfHostedEditorPreview.js";

const scriptText = `# Opening
@entry
Narrator: Hello`;

async function main() {
  const server = createSelfHostedEditorPreviewServer(0);
  const address = await listen(server);

  try {
    const startedAt = Date.now();
    const runtimeSessionId = "cache-runtime-http";
    const lineMapSessionId = "cache-line-map-http";
    const localizationSessionId = "cache-localization-http";

    await postJson(address.port, "/api/runtime-state", {
      scriptText,
      sessionId: runtimeSessionId,
    });
    await postJson(address.port, "/api/line-map-refresh", {
      scriptText,
      sessionId: lineMapSessionId,
    });

    const review = await postJson(address.port, "/api/localization-review", {
      scriptText,
    });
    const anchor = review?.presenter?.items?.[0]?.item?.anchor || "";
    if (!anchor) {
      throw new Error("Session cache HTTP smoke could not find a localization anchor.");
    }

    await postJson(address.port, "/api/localization-review", {
      previousCsv: [
        "anchor,node,kind,speaker,text,translation,sourcePath,line,column",
        `${anchor},Opening,Dialogue,Narrator,Hello,Old translation,draft.inscape,3,1`,
        "",
      ].join("\n"),
      scriptText,
      sessionId: localizationSessionId,
    });

    const status = await postJson(address.port, "/api/session-cache-status", {});
    assertEqual(status?.format, "inscape.self-hosted-editor.session-cache-status", "status format");
    assertEqual(status?.formatVersion, 1, "status formatVersion");
    assertCacheStatus(status.caches?.runtime, "runtime", runtimeSessionId);
    assertCacheStatus(status.caches?.lineMap, "line-map", lineMapSessionId);
    assertCacheStatus(status.caches?.localizationBaseline, "localization-baseline", localizationSessionId);

    const statusText = JSON.stringify(status);
    if (statusText.includes("Old translation") || statusText.includes("Narrator: Hello")) {
      throw new Error("Session cache status must not expose cached payload content.");
    }

    console.log(`SelfHostedEditor session cache HTTP smoke ok (${Date.now() - startedAt}ms)`);
  } finally {
    await close(server);
  }
}

async function postJson(port, routePath, payload) {
  const response = await fetch(`http://127.0.0.1:${port}${routePath}`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payloadText = await response.text();
  const parsedPayload = JSON.parse(payloadText);
  if (!response.ok) {
    throw new Error(`${routePath} failed with HTTP ${response.status}: ${payloadText}`);
  }

  return parsedPayload;
}

function assertCacheStatus(cacheStatus, expectedKind, expectedSessionId) {
  assertEqual(cacheStatus?.kind, expectedKind, `${expectedKind} status kind`);
  assertTruthy(cacheStatus?.entryCount >= 1, `${expectedKind} entry count`);
  assertTruthy(cacheStatus?.maximumEntries >= cacheStatus.entryCount, `${expectedKind} bounded entry count`);
  assertTruthy(cacheStatus?.ttlMilliseconds > 0, `${expectedKind} TTL`);
  assertTruthy(cacheStatus?.entries?.some((entry) => entry.sessionId === expectedSessionId), `${expectedKind} session status`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertTruthy(value, label) {
  if (!value) {
    throw new Error(`${label}: expected a truthy value.`);
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

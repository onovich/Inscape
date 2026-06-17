import { createSelfHostedEditorPreviewServer } from "./StartSelfHostedEditorPreview.js";

const sessionId = "workbench-integration-http-smoke";
const scriptText = `# Opening
@entry
Narrator: Hello.
? Choose
- Continue -> Ending

# Ending
Narrator: Done.`;
const changedScriptText = `# Opening
@entry
Narrator: Hello.
Narrator: New line.
? Choose
- Continue -> Ending

# Ending
Narrator: Done.`;
const emptyLocalizationScriptText = `# Empty
@entry
@scene void`;
const manualInitialScript = `# node.a
Narrator: Same line.
# node.b
Narrator: Same line.
`;
const manualRenamedScript = `# node.renamed
Narrator: Same line.
# node.b
Narrator: Same line.
`;

async function main() {
  const server = createSelfHostedEditorPreviewServer(0);
  const address = await listen(server);

  try {
    const startedAt = Date.now();
    const anchor = await seedLocalizationBaseline(address.port);
    await assertHostedEmptyLocalizationReview(address.port);
    await assertLocalizationUpdateError(address.port);
    await assertLineIdentityWorkflow(address.port);
    await assertLocalizationUpdateWorkflow(address.port, anchor);
    await assertStableNodeMapWorkflow(address.port);
    await assertProjectSessionStatus(address.port);

    console.log(`SelfHostedEditor workbench integration HTTP smoke ok (${Date.now() - startedAt}ms)`);
  } finally {
    await close(server);
  }
}

async function seedLocalizationBaseline(port) {
  const review = await postJson(port, "/api/localization-review", {
    scriptText,
    sessionId,
  });
  assertEqual(review?.format, "inscape.self-hosted-editor.localization-review", "initial localization review format");

  const anchor = review?.presenter?.items?.[0]?.item?.anchor || "";
  if (!anchor) {
    throw new Error("Workbench integration smoke could not find a localization anchor.");
  }

  const seededReview = await postJson(port, "/api/localization-review", {
    previousCsv: [
      "anchor,node,kind,speaker,text,translation,sourcePath,line,column",
      `${anchor},Opening,Dialogue,Narrator,Hello.,Old translation,draft.inscape,3,1`,
      "",
    ].join("\n"),
    scriptText,
    sessionId,
  });
  assertEqual(seededReview?.baseline?.source, "request", "seeded localization baseline source");
  if (!Array.isArray(seededReview?.presenter?.items) || seededReview.presenter.items.length === 0) {
    throw new Error("Seeded localization review should keep hosted presenter items.");
  }

  return anchor;
}

async function assertHostedEmptyLocalizationReview(port) {
  const emptyReview = await postJson(port, "/api/localization-review", {
    scriptText: emptyLocalizationScriptText,
    sessionId: `${sessionId}-empty-localization`,
  });
  assertEqual(emptyReview?.format, "inscape.self-hosted-editor.localization-review", "empty localization review format");
  assertEqual(emptyReview?.formatVersion, 2, "empty localization review formatVersion");
  assertEqual((emptyReview?.presenter?.items || []).length, 0, "empty localization review item count");
}

async function assertLocalizationUpdateError(port) {
  const payload = await postJsonExpectingFailure(port, "/api/localization-update", {
    scriptText,
    sessionId: `${sessionId}-missing-baseline`,
  });
  if (!String(payload?.error || "").includes("Localization update requires previousCsv")) {
    throw new Error(`Expected missing-baseline localization update error, got: ${String(payload?.error || "")}`);
  }
}

async function assertLineIdentityWorkflow(port) {
  const first = await postJson(port, "/api/line-map-refresh", {
    scriptText,
    sessionId,
  });
  const second = await postJson(port, "/api/line-map-refresh", {
    scriptText: changedScriptText,
    sessionId,
  });
  assertEqual(first?.format, "inscape.self-hosted-editor.line-map-refresh", "first line-map format");
  assertEqual(second?.format, "inscape.self-hosted-editor.line-map-refresh", "second line-map format");
  assertEqual(first?.sessionId, sessionId, "first line-map session");
  assertEqual(second?.sessionId, sessionId, "second line-map session");

  const firstHello = findLine(first.lineMap, "Hello.");
  const secondHello = findLine(second.lineMap, "Hello.");
  const secondNewLine = findLine(second.lineMap, "New line.");
  assertTruthy(firstHello?.lineId, "first Hello line id");
  assertEqual(secondHello?.lineId, firstHello.lineId, "line-map session should preserve Hello line id");
  assertTruthy(secondNewLine?.lineId, "new line id");
  assertTruthy(second.refresh?.report?.blocks?.some((block) =>
    block?.changes?.some((change) => change?.kind === "added" && change?.newText === "New line.")
  ), "line-map added-line report");
}

async function assertLocalizationUpdateWorkflow(port, anchor) {
  const update = await postJson(port, "/api/localization-update", {
    scriptText,
    sessionId,
    translationOverrides: [{
      anchor,
      translation: "Edited translation",
    }],
  });
  assertEqual(update?.format, "inscape.self-hosted-editor.localization-updated-csv", "localization update format");
  assertEqual(update?.baseline?.source, "session", "localization update baseline source");
  assertEqual(update?.safety?.generatedBy, "update-l10n-project", "localization update shared generator");
  assertEqual(update?.safety?.writesWorkspaceFile, false, "localization update write boundary");
  assertEqual(update?.safety?.translationOverrideCount, 1, "localization update override count");
  assertTruthy(String(update?.safety?.recoveryHint || "").includes("keep the previous CSV"), "localization update recovery hint");
  assertTruthy(String(update?.csv || "").includes("Edited translation,current"), "localization update edited translation");
  if (String(update?.csv || "").includes("Old translation,current")) {
    throw new Error("Localization update should not report the old translation as current after an override.");
  }
}

async function assertStableNodeMapWorkflow(port) {
  const manualInitialReview = await postJson(port, "/api/node-map-review", {
    scriptText: manualInitialScript,
  });
  const manualReview = await postJson(port, "/api/node-map-review", {
    scriptText: manualRenamedScript,
    workspace: buildNodeMapWorkspace(manualRenamedScript, manualInitialReview.nodeMapText),
  });
  const manualItem = manualReview?.report?.items?.find((item) => item.kind === "manual-review");
  const manualCandidate = manualItem?.candidates?.[0];
  if (!manualItem || !manualCandidate) {
    throw new Error("Workbench integration smoke should expose a stable node map manual-review candidate.");
  }

  const dryRun = await postJson(port, "/api/node-map-apply", {
    candidate: manualCandidate,
    dryRun: true,
    item: manualItem,
    nodeMapPath: manualReview.nodeMapPath,
    scriptText: manualRenamedScript,
    workspace: buildNodeMapWorkspace(manualRenamedScript, manualReview.nodeMapText),
  });
  assertEqual(dryRun?.format, "inscape.self-hosted-editor.node-map-apply", "node-map dry-run format");
  assertEqual(dryRun?.dryRun, true, "node-map dry-run state");
  assertEqual(dryRun?.result?.writesNodeMap, false, "node-map dry-run writesNodeMap");
  assertEqual(dryRun?.backup?.status, "not-required-dry-run", "node-map dry-run backup status");
  assertTruthy(String(dryRun?.nodeMapPath || "").endsWith("inscape.node-map-candidate-preview.json"), "node-map dry-run preview path");

  const applied = await postJson(port, "/api/node-map-apply", {
    candidate: manualCandidate,
    dryRun: false,
    item: manualItem,
    nodeMapPath: manualReview.nodeMapPath,
    scriptText: manualRenamedScript,
    workspace: buildNodeMapWorkspace(manualRenamedScript, manualReview.nodeMapText),
  });
  assertEqual(applied?.format, "inscape.self-hosted-editor.node-map-apply", "node-map apply format");
  assertEqual(applied?.candidateStableId, manualCandidate.stableId, "node-map selected candidate stable id");
  assertEqual(applied?.result?.writesNodeMap, true, "node-map apply writesNodeMap");
  assertEqual(applied?.backup?.targetKind, "node-map-sidecar", "node-map apply backup target kind");
  assertTruthy(String(applied?.recoveryHint || "").includes(".inscape-workspace/backups"), "node-map apply recovery hint");
  assertTruthy(String(applied?.nodeMapPath || "").endsWith("inscape.node-map.json"), "node-map apply sidecar path");
}

async function assertProjectSessionStatus(port) {
  const status = await postJson(port, "/api/session-cache-status", {});
  assertEqual(status?.format, "inscape.self-hosted-editor.session-cache-status", "session cache status format");
  assertCacheEntry(status?.caches?.lineMap, sessionId, "line-map");
  assertCacheEntry(status?.caches?.localizationBaseline, sessionId, "localization-baseline");

  const statusText = JSON.stringify(status);
  if (statusText.includes("Edited translation") || statusText.includes("Narrator: Hello.")) {
    throw new Error("Workbench integration session status must not expose cached CSV or script content.");
  }
}

function buildNodeMapWorkspace(script, nodeMapText) {
  return {
    currentFilePath: "draft.inscape",
    documents: [
      {
        relativePath: "draft.inscape",
        text: script,
      },
      {
        relativePath: "inscape.node-map.json",
        text: nodeMapText,
      },
    ],
  };
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

async function postJsonExpectingFailure(port, routePath, payload) {
  const response = await fetch(`http://127.0.0.1:${port}${routePath}`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payloadText = await response.text();
  const parsedPayload = JSON.parse(payloadText);
  if (response.ok) {
    throw new Error(`${routePath} should have failed but returned: ${payloadText}`);
  }

  return parsedPayload;
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

function assertCacheEntry(cacheStatus, expectedSessionId, label) {
  assertTruthy(cacheStatus?.entries?.some((entry) => entry.sessionId === expectedSessionId), `${label} cache entry`);
  assertTruthy(cacheStatus?.maximumEntries >= cacheStatus?.entryCount, `${label} bounded cache size`);
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

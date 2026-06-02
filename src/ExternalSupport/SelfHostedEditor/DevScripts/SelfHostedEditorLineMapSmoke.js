import {
  refreshLineMapForScriptText,
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
  const sessionId = "line-map-smoke";
  const firstPayload = await refreshLineMapForScriptText(firstScript, null, null, sessionId);
  const secondPayload = await refreshLineMapForScriptText(secondScript, null, null, sessionId);

  assertLineMapPayload(firstPayload, sessionId, "first refresh");
  assertLineMapPayload(secondPayload, sessionId, "second refresh");

  const firstHello = findLine(firstPayload.lineMap, "Hello");
  const secondHello = findLine(secondPayload.lineMap, "Hello");
  const secondNewLine = findLine(secondPayload.lineMap, "New line");

  assertTruthy(firstHello?.lineId, "first Hello line id");
  assertEqual(secondHello?.lineId, firstHello.lineId, "session refresh should keep existing Hello line id");
  assertTruthy(secondNewLine?.lineId, "second New line id");
  assertNotEqual(secondNewLine.lineId, firstHello.lineId, "new line should get its own line id");
  assertIncludesAddedLine(secondPayload.refresh, "New line");

  console.log("SelfHostedEditor line-map smoke ok");
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

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});

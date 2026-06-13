import { SelfHostedEditorLanguageSessionBridge } from "./SelfHostedEditorLanguageSessionBridge.js";
import { withTemporaryWorkspace } from "./SelfHostedEditorWorkspaceBridge.js";

await assertMalformedStdioFrameRejectsPendingRequest();

const openingText = `# Opening
Narrator: Start.
-> Evidence
-> MissingTarget

# DraftOnly
Narrator: Unsaved current draft node.`;
const workspace = {
  currentFilePath: "story/opening.inscape",
  documents: [
    {
      relativePath: "story/opening.inscape",
      text: openingText,
    },
    {
      relativePath: "story/evidence.inscape",
      text: `# Evidence
Narrator: The evidence is ready.`,
    },
  ],
};

const bridge = new SelfHostedEditorLanguageSessionBridge({
  requestTimeoutMilliseconds: 60000,
});

try {
  await withTemporaryWorkspace(workspace, openingText, async ({ activeFilePath, tempRoot }) => {
    const diagnostics = await bridge.diagnoseProject(tempRoot);
    const firstPid = bridge.child?.pid || 0;
    assertEqual(diagnostics.format, "inscape.language-server-project-diagnostics", "stdio diagnostics format");
    assertIncludesDiagnostic(diagnostics.diagnostics, "INS020", "story/opening.inscape");

    const symbols = await bridge.documentSymbolsFile(activeFilePath);
    const secondPid = bridge.child?.pid || 0;
    assertEqual(symbols.format, "inscape.language-server-document-symbols", "stdio document symbols format");
    assertIncludesSymbol(symbols.symbols, "Opening");
    assertIncludesSymbol(symbols.symbols, "DraftOnly");
    assertEqual(firstPid > 0, true, "stdio language session process should start");
    assertEqual(secondPid, firstPid, "stdio language session should reuse the same process");
  });
} finally {
  await bridge.dispose();
}

console.log("SelfHostedEditor LanguageServer session bridge contract ok");

async function assertMalformedStdioFrameRejectsPendingRequest() {
  const bridge = new SelfHostedEditorLanguageSessionBridge({
    requestTimeoutMilliseconds: 60000,
  });
  let killed = false;
  const timeout = setTimeout(() => {}, 60000);
  const rejection = new Promise((resolve) => {
    bridge.pendingRequests.set(1, {
      method: "malformed-test",
      reject: resolve,
      resolve: () => {
        throw new Error("Malformed stdio frame should not resolve a pending request.");
      },
      timeout,
    });
  });
  bridge.child = {
    kill() {
      killed = true;
    },
  };
  bridge.stdoutBuffer = Buffer.from("Content-Length: 4\r\n\r\nnope", "utf8");
  bridge.consumeStdoutMessages();
  const error = await rejection;
  clearTimeout(timeout);
  assertEqual(error instanceof Error, true, "malformed stdio frame should reject with Error");
  assertEqual(killed, true, "malformed stdio frame should kill session child");
  assertEqual(bridge.child, null, "malformed stdio frame should clear child");
  assertEqual(bridge.pendingRequests.size, 0, "malformed stdio frame should clear pending requests");
}

function assertIncludesDiagnostic(diagnostics, code, sourcePath) {
  const found = Array.isArray(diagnostics) && diagnostics.some((diagnostic) =>
    diagnostic?.code === code
    && String(diagnostic.location?.sourcePath || "").replace(/\\/g, "/").endsWith(sourcePath)
  );
  if (!found) {
    throw new Error(`Missing diagnostic ${code} at ${sourcePath}`);
  }
}

function assertIncludesSymbol(symbols, name) {
  const found = Array.isArray(symbols) && symbols.some((symbol) => symbol?.name === name);
  if (!found) {
    throw new Error(`Missing document symbol ${name}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

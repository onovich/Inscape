import {
  createSelfHostedEditorPreviewServer,
} from "./StartSelfHostedEditorPreview.js";

const openingText = `# Opening
- Review evidence -> Evidence
-> Evidence`;

const workspace = {
  currentFilePath: "story/opening.inscape",
  documents: [
    {
      relativePath: "story/opening.inscape",
      text: openingText,
    },
    {
      relativePath: "story/branch.inscape",
      text: `# Branch
-> Evidence`,
    },
    {
      relativePath: "story/evidence.inscape",
      text: `# Evidence
Narrator: The evidence is ready.`,
    },
  ],
};

async function main() {
  const server = createSelfHostedEditorPreviewServer(0);
  const address = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/references`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        referenceName: "Evidence",
        scriptText: openingText,
        workspace,
      }),
    });
    const payloadText = await response.text();
    const payload = JSON.parse(payloadText);
    if (!response.ok) {
      throw new Error(`References HTTP smoke failed with HTTP ${response.status}.`);
    }

    assertEqual(payload.format, "inscape.language-server-project-references", "references format");
    assertEqual(payload.references?.length, 3, "references count");
    assertIncludesReference(payload.references, "story/opening.inscape", 1, "current draft choice reference");
    assertIncludesReference(payload.references, "story/opening.inscape", 2, "current draft jump reference");
    assertIncludesReference(payload.references, "story/branch.inscape", 1, "cross-file jump reference");
    assertNoTempSourcePaths(payload.references);

    console.log(`SelfHostedEditor references HTTP smoke ok (${Buffer.byteLength(payloadText, "utf8")} bytes)`);
  } finally {
    await close(server);
  }
}

function assertIncludesReference(references, sourcePath, line, label) {
  const found = references.some((reference) =>
    reference?.location?.sourcePath === sourcePath
    && reference.location.line === line
  );
  if (!found) {
    throw new Error(`Missing ${label}: ${sourcePath}:${line + 1}`);
  }
}

function assertNoTempSourcePaths(references) {
  const tempPath = references.find((reference) =>
    String(reference?.location?.sourcePath || "").includes("inscape-self-hosted-editor-")
  );
  if (tempPath) {
    throw new Error(`References should expose workspace-relative source paths, got ${tempPath.location.sourcePath}`);
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

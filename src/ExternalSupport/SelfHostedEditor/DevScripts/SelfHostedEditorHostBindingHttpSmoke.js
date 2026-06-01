import {
  createSelfHostedEditorPreviewServer,
} from "./StartSelfHostedEditorPreview.js";

const scriptText = `# Opening
Narrator: Welcome.
Witness: I saw it.
@timeline camera_push`;

const workspace = {
  currentFilePath: "story/opening.inscape",
  documents: [
    {
      relativePath: "inscape.config.json",
      text: JSON.stringify({
        hostBridge: "config/inscape.host.bridge.json",
      }, null, 2),
    },
    {
      relativePath: "config/inscape.host.bridge.json",
      text: JSON.stringify({
        format: "inscape.host-bridge",
        formatVersion: 1,
        ids: [
          {
            kind: "speaker",
            name: "Narrator",
            host: {
              roleId: 1001,
            },
          },
          {
            kind: "timeline",
            name: "court_intro",
            host: {
              assetId: 2001,
              addressableKey: "timeline/court_intro",
            },
          },
        ],
      }, null, 2),
    },
    {
      relativePath: "story/opening.inscape",
      text: scriptText,
    },
  ],
};

async function main() {
  const server = createSelfHostedEditorPreviewServer(0);
  const address = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/host-binding-capabilities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scriptText,
        workspace,
      }),
    });
    const payloadText = await response.text();
    const catalog = JSON.parse(payloadText);
    if (!response.ok) {
      throw new Error(`Host Binding HTTP smoke failed with HTTP ${response.status}.`);
    }

    assertEqual(catalog.format, "inscape.host-binding.capabilities", "catalog format");
    assertEqual(catalog.hostBridge?.loaded, true, "host bridge loaded");
    assertEqual(catalog.speakers?.[0]?.name, "Narrator", "configured speaker name");
    assertEqual(catalog.bindings?.[0]?.name, "court_intro", "configured timeline name");
    console.log(`SelfHostedEditor Host Binding HTTP smoke ok (${Buffer.byteLength(payloadText, "utf8")} bytes)`);
  } finally {
    await close(server);
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

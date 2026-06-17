import {
  createSelfHostedEditorPreviewServer,
} from "./StartSelfHostedEditorPreview.js";

const scriptText = `# Opening
@entry
Narrator: Gold [player.gold]
@emit quest.accepted`;

const workspace = {
  currentFilePath: "story/opening.inscape",
  documents: [
    {
      relativePath: "inscape.config.json",
      text: JSON.stringify({
        hostSchema: "config/inscape.host.schema.json",
      }, null, 2),
    },
    {
      relativePath: "config/inscape.host.schema.json",
      text: JSON.stringify({
        actions: [
          {
            description: "Quest accepted action",
            mode: "fire",
            name: "quest.accepted",
            parameters: [],
          },
        ],
        events: [
          {
            delivery: "fire-and-forget",
            description: "Legacy quest accepted event",
            name: "legacy.quest.accepted",
          },
        ],
        queries: [
          {
            description: "Current gold amount",
            name: "player.gold",
            returnType: "number",
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
    const response = await fetch(`http://127.0.0.1:${address.port}/api/host-schema-capabilities`, {
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
      throw new Error(`Host Schema HTTP smoke failed with HTTP ${response.status}.`);
    }

    assertEqual(catalog.format, "inscape.host-schema.capabilities", "catalog format");
    assertEqual(catalog.hostSchema?.loaded, true, "host schema loaded");
    assertEqual(catalog.queries?.[0]?.name, "player.gold", "query name");
    assertEqual(catalog.actions?.[0]?.name, "quest.accepted", "action name");
    assertEqual(catalog.events?.[0]?.name, "legacy.quest.accepted", "event name");
    console.log(`SelfHostedEditor Host Schema HTTP smoke ok (${Buffer.byteLength(payloadText, "utf8")} bytes)`);
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

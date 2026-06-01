import { createSelfHostedEditorPreviewServer } from "./StartSelfHostedEditorPreview.js";

const scriptText = `# Opening
@entry
Narrator: Review the evidence.
`;

async function main() {
  const server = createSelfHostedEditorPreviewServer(0);
  const address = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/node-map-review`, {
      body: JSON.stringify({ scriptText }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const payloadText = await response.text();
    const review = JSON.parse(payloadText);

    if (!response.ok) {
      throw new Error(`Stable node map HTTP smoke failed with HTTP ${response.status}`);
    }

    if (review?.format !== "inscape.self-hosted-editor.node-map-review") {
      throw new Error(`Unexpected stable node map HTTP format: ${String(review?.format || "")}`);
    }

    if (review?.report?.format !== "inscape.node-map-update-report") {
      throw new Error("Stable node map HTTP smoke should expose the shared update report.");
    }

    if (Number(review?.report?.summary?.newNodeCount || 0) !== 1) {
      throw new Error("Stable node map HTTP smoke should create one new stable node id.");
    }

    if (!String(review?.nodeMapPath || "").endsWith("inscape.node-map.json")) {
      throw new Error("Stable node map HTTP smoke should return a relative node map path.");
    }

    console.log("SelfHostedEditor stable node map HTTP smoke ok");
  } finally {
    await close(server);
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

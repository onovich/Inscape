import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSelfHostedEditorPreviewServer } from "./StartSelfHostedEditorPreview.js";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const samplePath = path.join(moduleRoot, "..", "..", "..", "samples", "court-loop.inscape");
const maximumReviewPayloadBytes = 200000;

async function main() {
  const scriptText = await fs.readFile(samplePath, "utf8");
  const server = createSelfHostedEditorPreviewServer(0);
  const address = await listen(server);

  try {
    const startedAt = Date.now();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/localization-review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ scriptText }),
    });
    const elapsedMilliseconds = Date.now() - startedAt;
    const payloadText = await response.text();
    const payloadBytes = Buffer.byteLength(payloadText, "utf8");
    const review = JSON.parse(payloadText);
    const presenterItems = Array.isArray(review?.presenter?.items) ? review.presenter.items : [];

    if (!response.ok) {
      throw new Error(`Localization review HTTP smoke failed with HTTP ${response.status}`);
    }

    if (review?.format !== "inscape.self-hosted-editor.localization-review") {
      throw new Error(`Unexpected localization review format: ${String(review?.format || "")}`);
    }

    if (review?.formatVersion !== 2) {
      throw new Error(`Unexpected localization review formatVersion: ${String(review?.formatVersion || "")}`);
    }

    if (presenterItems.length === 0) {
      throw new Error("Expected localization review presenter items for court-loop sample.");
    }

    if (Object.prototype.hasOwnProperty.call(review, "report")) {
      throw new Error("Localization review HTTP smoke should not expose the full report payload.");
    }

    if (payloadBytes > maximumReviewPayloadBytes) {
      throw new Error(`Localization review HTTP payload too large: ${payloadBytes} bytes.`);
    }

    console.log(`SelfHostedEditor localization review HTTP smoke ok (${presenterItems.length} items, ${payloadBytes} bytes, ${elapsedMilliseconds}ms)`);
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

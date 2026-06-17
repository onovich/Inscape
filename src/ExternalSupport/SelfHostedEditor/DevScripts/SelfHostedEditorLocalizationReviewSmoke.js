import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLocalizationReviewForScriptText } from "./StartSelfHostedEditorPreview.js";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const samplePath = path.join(moduleRoot, "..", "..", "..", "samples", "court-loop.inscape");
const maximumReviewPayloadBytes = 240000;

async function main() {
  const scriptText = await fs.readFile(samplePath, "utf8");
  const startedAt = Date.now();
  const review = await getLocalizationReviewForScriptText(scriptText, null, "");
  const elapsedMilliseconds = Date.now() - startedAt;
  const payloadBytes = Buffer.byteLength(JSON.stringify(review), "utf8");
  const presenterItems = Array.isArray(review?.presenter?.items) ? review.presenter.items : [];

  if (review?.format !== "inscape.self-hosted-editor.localization-review") {
    throw new Error(`Unexpected localization review format: ${String(review?.format || "")}`);
  }

  if (review?.formatVersion !== 2) {
    throw new Error(`Unexpected localization review formatVersion: ${String(review?.formatVersion || "")}`);
  }

  if (presenterItems.length === 0) {
    throw new Error("Expected localization review presenter items for court-loop sample.");
  }

  if (!presenterItems.some((item) => Array.isArray(item.actions) && item.actions.some((action) => action.actionKey === "open-current"))) {
    throw new Error("Expected localization review presenter actions to include open-current source jumps.");
  }

  if (!presenterItems.some((item) => Array.isArray(item.actions) && item.actions.some((action) => action.actionKey === "open-candidate"))) {
    throw new Error("Expected localization review presenter actions to include candidate source jumps.");
  }

  if (!presenterItems.some((item) => Array.isArray(item.actions) && item.actions.some((action) => (
    action.actionKey === "open-candidate"
    && Array.isArray(action.signals)
    && action.signals.some((signal) => signal.key === "rank-penalty")
  )))) {
    throw new Error("Expected localization review candidate actions to preserve shared structured rank signal.");
  }

  if (!presenterItems.some((item) => Array.isArray(item.actions) && item.actions.some((action) => action.actionKey === "show-candidate-diff" && action.detail))) {
    throw new Error("Expected localization review presenter actions to include candidate diff details.");
  }

  if (Object.prototype.hasOwnProperty.call(review, "report")) {
    throw new Error("Localization review smoke should not expose the full report payload.");
  }

  if (payloadBytes > maximumReviewPayloadBytes) {
    throw new Error(`Localization review payload too large: ${payloadBytes} bytes.`);
  }

  console.log(`SelfHostedEditor localization review smoke ok (${presenterItems.length} items, ${payloadBytes} bytes, ${elapsedMilliseconds}ms)`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});

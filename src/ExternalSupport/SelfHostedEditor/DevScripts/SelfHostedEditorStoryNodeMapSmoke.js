import { getStoryNodeMapReviewForScriptText } from "./StartSelfHostedEditorPreview.js";

const initialScript = `# Opening
@entry
Narrator: Review the evidence.
`;
const renamedScript = `# Court Opening
@entry
Narrator: Review the evidence.
`;
const maximumPayloadBytes = 120000;

async function main() {
  const initialReview = await getStoryNodeMapReviewForScriptText(initialScript, null);
  assertReviewPayload(initialReview, "initial");
  const initialNodeMapText = initialReview.nodeMapText;

  const renamedReview = await getStoryNodeMapReviewForScriptText(renamedScript, {
    currentFilePath: "draft.inscape",
    documents: [
      {
        relativePath: "draft.inscape",
        text: renamedScript,
      },
      {
        relativePath: "inscape.node-map.json",
        text: initialNodeMapText,
      },
    ],
  });
  assertReviewPayload(renamedReview, "renamed");

  if (Number(renamedReview.report?.summary?.renamedNodeCount || 0) !== 1) {
    throw new Error("Expected stable node map review to preserve one renamed node.");
  }

  const renamedItem = renamedReview.report.items.find((item) => item.kind === "renamed");
  if (!renamedItem || renamedItem.title !== "Court Opening" || renamedItem.previousTitle !== "Opening") {
    throw new Error("Expected renamed review item to keep current and previous titles.");
  }

  console.log(`SelfHostedEditor stable node map smoke ok (${renamedReview.report.items.length} items)`);
}

function assertReviewPayload(review, label) {
  const payloadBytes = Buffer.byteLength(JSON.stringify(review), "utf8");
  if (review?.format !== "inscape.self-hosted-editor.node-map-review") {
    throw new Error(`Unexpected ${label} stable node map format: ${String(review?.format || "")}`);
  }

  if (review?.formatVersion !== 1) {
    throw new Error(`Unexpected ${label} stable node map formatVersion: ${String(review?.formatVersion || "")}`);
  }

  if (review?.report?.format !== "inscape.node-map-update-report") {
    throw new Error(`Unexpected ${label} shared node map report format.`);
  }

  if (review?.nodeMap?.format !== "inscape.node-map") {
    throw new Error(`Unexpected ${label} generated node map format.`);
  }

  if (!String(review?.nodeMapText || "").includes("\"format\": \"inscape.node-map\"")) {
    throw new Error(`Expected ${label} nodeMapText to contain the generated sidecar JSON.`);
  }

  if (Object.prototype.hasOwnProperty.call(review.report || {}, "workspace") && review.report.workspace) {
    throw new Error(`${label} stable node map review should not expose the temporary workspace path.`);
  }

  if (payloadBytes > maximumPayloadBytes) {
    throw new Error(`${label} stable node map payload too large: ${payloadBytes} bytes.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});

import {
  getStoryNodeMapCandidateApplyForScriptText,
  getStoryNodeMapReviewForScriptText,
} from "./StartSelfHostedEditorPreview.js";

const initialScript = `# Opening
@entry
Narrator: Review the evidence.
`;
const renamedScript = `# Court Opening
@entry
Narrator: Review the evidence.
`;
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

  const manualInitialReview = await getStoryNodeMapReviewForScriptText(manualInitialScript, null);
  const manualReview = await getStoryNodeMapReviewForScriptText(manualRenamedScript, {
    currentFilePath: "draft.inscape",
    documents: [
      {
        relativePath: "draft.inscape",
        text: manualRenamedScript,
      },
      {
        relativePath: "inscape.node-map.json",
        text: manualInitialReview.nodeMapText,
      },
    ],
  });
  const manualItem = manualReview.report.items.find((item) => item.kind === "manual-review");
  const manualCandidate = manualItem?.candidates?.[0];
  if (!manualItem || !manualCandidate) {
    throw new Error("Expected stable node map review to expose a manual candidate.");
  }

  const appliedPreview = await getStoryNodeMapCandidateApplyForScriptText(
    manualRenamedScript,
    {
      currentFilePath: "draft.inscape",
      documents: [
        {
          relativePath: "draft.inscape",
          text: manualRenamedScript,
        },
        {
          relativePath: "inscape.node-map.json",
          text: manualReview.nodeMapText,
        },
      ],
    },
    manualItem,
    manualCandidate,
    true,
    manualReview.nodeMapPath
  );
  assertApplyPayload(appliedPreview, manualCandidate.stableId, true);

  const applied = await getStoryNodeMapCandidateApplyForScriptText(
    manualRenamedScript,
    {
      currentFilePath: "draft.inscape",
      documents: [
        {
          relativePath: "draft.inscape",
          text: manualRenamedScript,
        },
        {
          relativePath: "inscape.node-map.json",
          text: manualReview.nodeMapText,
        },
      ],
    },
    manualItem,
    manualCandidate,
    false,
    manualReview.nodeMapPath
  );
  assertApplyPayload(applied, manualCandidate.stableId, false);
  if (!String(applied.nodeMapText || "").includes("node.renamed")) {
    throw new Error("Expected applied stable node map to keep the current title.");
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

function assertApplyPayload(apply, expectedCandidateStableId, expectedDryRun) {
  if (apply?.format !== "inscape.self-hosted-editor.node-map-apply") {
    throw new Error(`Unexpected stable node map apply format: ${String(apply?.format || "")}`);
  }

  if (apply?.formatVersion !== 1) {
    throw new Error(`Unexpected stable node map apply formatVersion: ${String(apply?.formatVersion || "")}`);
  }

  if (apply?.dryRun !== expectedDryRun) {
    throw new Error("Stable node map apply should preserve dry-run state.");
  }

  if (apply?.candidateStableId !== expectedCandidateStableId) {
    throw new Error("Stable node map apply should preserve selected candidate stable id.");
  }

  if (apply?.nodeMap?.format !== "inscape.node-map") {
    throw new Error("Stable node map apply should return the shared node map payload.");
  }

  if (Object.prototype.hasOwnProperty.call(apply || {}, "workspace") && apply.workspace) {
    throw new Error("Stable node map apply should not expose the temporary workspace path.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});

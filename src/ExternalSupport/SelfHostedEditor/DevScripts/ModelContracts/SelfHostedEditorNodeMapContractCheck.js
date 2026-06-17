import { StoryNodeMapReviewController } from "../../Scripts/EditorAuthoring/Controllers/StoryNodeMapReviewController.js";
import { assertEqual, assertIncludesText, FakeElement, findElementByClass, getTextContent, installFakeDomEnvironment } from "./SelfHostedEditorModelContractHarness.js";

installFakeDomEnvironment();

const nodeMapButton = new FakeElement("button");
let appliedNodeMapPath = "";
let lastDryRun = null;
let selectedNodeMapLine = 0;
let writeBackCallCount = 0;
const nodeMapReviewController = new StoryNodeMapReviewController({
  reviewBridge: {
    async reviewNodeMap() {
      return {
        provider: "node-map-review",
        review: {
          nodeMapPath: "inscape.node-map.json",
          nodeMapText: "{\n  \"format\": \"inscape.node-map\"\n}",
          report: {
            items: [
              {
                candidates: [
                  {
                    applyPreview: {
                      appliedStableId: "node_OLD",
                      candidateStableId: "node_OLD",
                      candidateTitle: "Opening",
                      currentStableId: "node_NEW",
                      currentTitle: "Court Opening",
                      operation: "reuse-candidate-stable-id",
                      previousTitlesAfterApply: ["Opening"],
                      removedStableId: "node_NEW",
                      removesCandidateEntry: true,
                      resultTitle: "Court Opening",
                    },
                    evidence: [
                      {
                        kind: "source-path",
                        label: "Source path",
                        value: "story.inscape",
                      },
                    ],
                    score: 23,
                    sourceLine: 4,
                    sourcePath: "story.inscape",
                    stableId: "node_OLD",
                    title: "Opening",
                  },
                ],
                kind: "manual-review",
                message: "Multiple rename candidates matched this title.",
                previousTitle: "",
                sourceLine: 12,
                sourcePath: "story.inscape",
                stableId: "node_NEW",
                status: "active",
                title: "Court Opening",
              },
            ],
            summary: {
              conflictNodeCount: 0,
              manualReviewCount: 1,
              missingNodeCount: 0,
              newNodeCount: 1,
              renamedNodeCount: 0,
            },
          },
        },
      };
    },
    async previewCandidateApply(scriptText, item, candidate, nodeMapPath) {
      return this.applyCandidate(scriptText, item, candidate, true, nodeMapPath);
    },
    async applyCandidate(_scriptText, item, candidate, dryRun, nodeMapPath) {
      appliedNodeMapPath = nodeMapPath;
      lastDryRun = dryRun;
      return {
        apply: {
          backup: {
            required: !dryRun,
            sourcePath: nodeMapPath,
            status: dryRun ? "not-required-dry-run" : "required-before-write-back",
            suggestedBackupDirectory: ".inscape-workspace/backups",
            targetKind: "node-map-sidecar",
          },
          candidateStableId: candidate.stableId,
          changePreview: {
            appliedStableId: candidate.stableId,
            candidateStableId: candidate.stableId,
            candidateTitle: candidate.title,
            currentStableId: item.stableId,
            currentTitle: item.title,
            operation: "reuse-candidate-stable-id",
            previousTitlesAfterApply: [candidate.title],
            removedStableId: item.stableId,
            removesCandidateEntry: true,
            resultTitle: item.title,
          },
          dryRun,
          itemStableId: item.stableId,
          nodeMap: {
            entries: [
              {
                stableId: candidate.stableId,
                title: item.title,
              },
            ],
            format: "inscape.node-map",
          },
          nodeMapPath,
          nodeMapText: "{\n  \"format\": \"inscape.node-map\",\n  \"applied\": true\n}",
          recoveryHint: dryRun ? "Dry-run writes a preview node map only." : "Before replacing the node map sidecar, keep a workspace write-back backup under .inscape-workspace/backups.",
          result: {
            dryRun,
            format: "inscape.node-map-candidate-apply-result",
            writesNodeMap: !dryRun,
          },
        },
        provider: "node-map-apply",
      };
    },
    async writeBackNodeMap(applyPayload) {
      writeBackCallCount += 1;
      return {
        provider: "node-map-write-back",
        writeBack: {
          appliedToWorkspace: true,
          backup: {
            copiedCount: 1,
            ok: true,
          },
          ok: true,
          reason: "node-map-sidecar-written",
          write: {
            ok: true,
            relativePath: applyPayload.nodeMapPath,
          },
        },
      };
    },
  },
  reviewButtonElement: nodeMapButton,
});
nodeMapReviewController.onSourceLineSelected((selection) => {
  selectedNodeMapLine = selection.lineNumber;
});
await nodeMapReviewController.review("# Court Opening\nNarrator: Hello");
assertEqual(nodeMapButton.textContent, "Node Map", "stable node map review button should reset after summary status");
assertIncludesText(getTextContent(document.body), "Stable Node Map");
assertIncludesText(getTextContent(document.body), "Court Opening");
assertIncludesText(getTextContent(document.body), "manual-review");
assertIncludesText(getTextContent(document.body), "Opening · score 23");
assertIncludesText(getTextContent(document.body), "node_NEW -> node_OLD");
assertIncludesText(getTextContent(document.body), "Preview Apply");
assertIncludesText(getTextContent(document.body), "Apply");
const nodeMapReviewItemButton = findElementByClass(document.body, "node-map-review-item-main");
nodeMapReviewItemButton?.click();
assertEqual(selectedNodeMapLine, 12, "stable node map review item should jump to its current source line");
await findElementByClass(document.body, "node-map-review-candidate-preview")?.click();
assertEqual(lastDryRun, true, "stable node map preview action should request dry-run apply");
await Promise.resolve();
await Promise.resolve();
assertIncludesText(getTextContent(document.body), "Dry-run ready: node_NEW -> node_OLD");
await findElementByClass(document.body, "node-map-review-candidate-apply")?.click();
assertEqual(lastDryRun, true, "stable node map apply action should request confirmation before real apply");
assertIncludesText(getTextContent(document.body), "Confirm Apply");
await findElementByClass(document.body, "node-map-review-candidate-confirm-apply")?.click();
assertEqual(lastDryRun, false, "stable node map apply action should request real apply");
await Promise.resolve();
await Promise.resolve();
assertEqual(appliedNodeMapPath, "inscape.node-map.json", "stable node map apply should preserve the review node map path");
assertEqual(writeBackCallCount, 1, "stable node map confirmed apply should request workspace write-back");
assertIncludesText(nodeMapReviewController.currentReviewPayload.nodeMapText, "\"applied\": true", "stable node map apply should update the downloadable node map text");
assertIncludesText(getTextContent(document.body), "Applied node_NEW -> node_OLD to workspace node map; backup copied (1)");

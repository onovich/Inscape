import { LocalizationDraftStore } from "../../Scripts/Localization/Models/LocalizationDraftStore.js";
import { LocalizationEditorController } from "../../Scripts/Localization/Controllers/LocalizationEditorController.js";
import { assertEqual, assertIncludesText, assertNotIncludesText, FakeElement, findElementByClass, getTextContent, installFakeDomEnvironment } from "./SelfHostedEditorModelContractHarness.js";

const linkedPreviousCsvWrites = [];
const linkedPreviousCsvHandle = {
  async createWritable() {
    return {
      async close() {},
      async write(text) {
        linkedPreviousCsvWrites.push(String(text));
      },
    };
  },
  async getFile() {
    return {
      name: "baseline.csv",
      async text() {
        return "anchor,text,translation\nline_anchor_1,Compiler sourced row,Previous translation";
      },
    };
  },
};
installFakeDomEnvironment({
  async showOpenFilePicker() {
    return [linkedPreviousCsvHandle];
  },
});
const draftStore = new LocalizationDraftStore();
const localizationPanel = new FakeElement("section");
const localizationClearDraftsButton = new FakeElement("button");
const localizationReplaceButton = new FakeElement("button");
const localizationExportButton = new FakeElement("button");
const localizationExportUpdatedButton = new FakeElement("button");
const localizationFilterMode = new FakeElement("select");
localizationFilterMode.value = "all";
const localizationFilterSummary = new FakeElement("span");
const localizationSessionStatus = new FakeElement("span");
const localizationOpenButton = new FakeElement("button");
const localizationCsvInput = new FakeElement("input");
const localizationSourceStatus = new FakeElement("span");
let selectedLocalizationSource = null;
const localizationController = new LocalizationEditorController({
  panelElement: localizationPanel,
  draftStore,
  clearVisibleDraftsButtonElement: localizationClearDraftsButton,
  exportDraftButtonElement: localizationExportButton,
  exportUpdatedButtonElement: localizationExportUpdatedButton,
  filterModeElement: localizationFilterMode,
  filterSummaryElement: localizationFilterSummary,
  openPreviousCsvButtonElement: localizationOpenButton,
  previousCsvInputElement: localizationCsvInput,
  previousCsvStatusElement: localizationSourceStatus,
  replacePreviousCsvButtonElement: localizationReplaceButton,
  sessionStatusElement: localizationSessionStatus,
  reviewBridge: {
    async getLocalizationReview() {
      return {
        provider: "localization-review",
        review: {
          presenter: {
            items: [
              {
                actions: [
                  {
                    actionKey: "open-current",
                    detail: "Compiler sourced row",
                    line: 3,
                    sourcePath: "samples/court-loop.inscape",
                    summary: "samples/court-loop.inscape:3:1",
                  },
                  {
                    actionIndex: 0,
                    actionKey: "open-candidate",
                    actionStatus: "similarity 0.950",
                    detail: "samples/previous.inscape:12:1 | Previous text",
                    line: 12,
                    signals: [
                      { key: "similarity", severity: "info", value: "0.950" },
                      { key: "rank-penalty", severity: "warning", value: "2" },
                      { key: "reason", severity: "info", value: "same-stable-node" },
                      { key: "candidate-line-identity", severity: "warning", value: "missing" },
                    ],
                    sourcePath: "samples/previous.inscape",
                    summary: "Previous translation",
                  },
                  {
                    actionIndex: 0,
                    actionKey: "show-candidate-diff",
                    detail: "current: Compiler sourced row | previous: Previous text | translation: Previous translation",
                    summary: "current -> previous",
                  },
                ],
                detail: "samples/court-loop.inscape:3:1 <line line_DIALOGUE available> | Compiler sourced row",
                item: {
                  anchor: "line_anchor_1",
                  kind: "Dialogue",
                  line: 3,
                  lineFingerprint: "line-fingerprint-current",
                  lineId: "line_DIALOGUE",
                  lineIdentityStatus: "available",
                  nodeTitle: "Opening",
                  review: "needs-review",
                  speaker: "Narrator",
                  status: "changed",
                  text: "Compiler sourced row",
                  translation: "Previous translation",
                },
                signals: [
                  { key: "review-status", severity: "warning", value: "changed/needs-review" },
                  { key: "current-line-identity", severity: "info", value: "line line_DIALOGUE available" },
                ],
                summary: "translation: Previous translation",
                title: "[changed] Opening - needs-review",
              },
              {
                detail: "samples/court-loop.inscape:8:1 <line line_DIALOGUE_2 available> | Already aligned row",
                item: {
                  anchor: "line_anchor_2",
                  kind: "Dialogue",
                  line: 8,
                  nodeTitle: "Witness",
                  review: "aligned",
                  speaker: "Witness",
                  status: "kept",
                  text: "Already aligned row",
                  translation: "Kept translation",
                },
                summary: "translation: Kept translation",
                title: "[kept] Witness - aligned",
              },
              {
                actions: [
                  {
                    actionKey: "open-current",
                    line: 14,
                    sourcePath: "samples/court-loop.inscape",
                  },
                  {
                    actionIndex: 0,
                    actionKey: "open-candidate",
                    line: 42,
                    signals: [
                      { key: "similarity", severity: "info", value: "0.810" },
                      { key: "rank-penalty", severity: "warning", value: "4" },
                      { key: "reason", severity: "info", value: "ambiguous-local-context" },
                      { key: "candidate-line-identity", severity: "risk", value: "drift" },
                    ],
                    sourcePath: "samples/previous.inscape",
                  },
                  {
                    actionIndex: 0,
                    actionKey: "show-candidate-diff",
                    detail: "current: Ambiguous row | previous: Maybe ambiguous row | translation: Candidate translation",
                  },
                ],
                item: {
                  anchor: "line_anchor_3",
                  kind: "Dialogue",
                  line: 14,
                  lineFingerprint: "line-fingerprint-conflict",
                  lineId: "line_CONFLICT",
                  lineIdentityStatus: "drift",
                  nodeTitle: "Cross examination",
                  review: "choose-candidate",
                  speaker: "Judge",
                  status: "conflict",
                  text: "Ambiguous row",
                  translation: "",
                },
                signals: [
                  { key: "review-status", severity: "risk", value: "conflict/choose-candidate" },
                  { key: "candidate-count", severity: "risk", value: "2" },
                  { key: "current-line-identity", severity: "risk", value: "line line_CONFLICT drift" },
                ],
                summary: "translation: (empty)",
                title: "[conflict] Cross examination - choose-candidate",
              },
            ],
          },
        },
      };
    },
    async exportUpdatedLocalizationCsv() {
      return {
        csv: "anchor,text,translation\nline_anchor_1,Compiler sourced row,\nline_anchor_2,Already aligned row,Fresh draft",
        provider: "localization-update",
      };
    },
  },
});
localizationController.onSourceLineSelected((selection) => {
  selectedLocalizationSource = selection;
});
await localizationController.render("# Opening\nDraft fallback row");
assertIncludesText(getTextContent(localizationPanel), "Compiler sourced row");
assertIncludesText(getTextContent(localizationPanel), "Previous translation");
assertIncludesText(getTextContent(localizationPanel), "changed");
assertIncludesText(getTextContent(localizationPanel), "Candidate 1");
assertIncludesText(getTextContent(localizationPanel), "Diff 1");
assertIncludesText(getTextContent(localizationPanel), "Review changed/needs-review");
assertIncludesText(getTextContent(localizationPanel), "Current line_DIALOGUE available");
assertIncludesText(getTextContent(localizationPanel), "Match 0.950");
assertIncludesText(getTextContent(localizationPanel), "Rank 2");
assertIncludesText(getTextContent(localizationPanel), "Reason same-stable-node");
assertIncludesText(getTextContent(localizationPanel), "Candidate missing");
assertIncludesText(getTextContent(localizationPanel), "Already aligned row");
assertIncludesText(getTextContent(localizationPanel), "kept");
assertIncludesText(getTextContent(localizationPanel), "conflict");
assertIncludesText(getTextContent(localizationPanel), "Review conflict/choose-candidate");
assertIncludesText(getTextContent(localizationPanel), "Candidates 2");
assertIncludesText(getTextContent(localizationPanel), "Rank 4");
assertIncludesText(getTextContent(localizationPanel), "Reason ambiguous-local-context");
assertIncludesText(getTextContent(localizationPanel), "Candidate drift");
assertNotIncludesText(getTextContent(localizationPanel), "Draft fallback row");
assertEqual(localizationController.rows[0].lineId, "line_DIALOGUE", "localization review rows should preserve shared line identity id");
assertEqual(localizationController.rows[0].lineIdentityStatus, "available", "localization review rows should preserve shared line identity status");
assertEqual(localizationController.rows[0].lineFingerprint, "line-fingerprint-current", "localization review rows should preserve shared line fingerprint");
assertEqual(localizationController.rows[0].signals[0].key, "review-status", "localization review rows should preserve shared item signals");
const candidateReviewButton = findElementByClass(localizationPanel, "localization-review-action-candidate");
assertEqual(localizationController.rows[0].actions[1].signals[0].key, "similarity", "localization review actions should preserve shared candidate signals");
assertIncludesText(candidateReviewButton?.title || "", "similarity: 0.950", "candidate action tooltip should expose shared similarity signal");
assertIncludesText(candidateReviewButton?.title || "", "rank-penalty: 2", "candidate action tooltip should expose shared rank signal");
assertIncludesText(candidateReviewButton?.title || "", "Previous translation", "candidate action tooltip should expose shared candidate summary");
candidateReviewButton?.click();
assertEqual(selectedLocalizationSource?.sourcePath, "samples/previous.inscape", "localization candidate action should preserve candidate source path");
assertEqual(selectedLocalizationSource?.lineNumber, 12, "localization candidate action should jump to candidate source line");
findElementByClass(localizationPanel, "localization-review-action-diff")?.click();
assertIncludesText(getTextContent(localizationPanel), "current: Compiler sourced row | previous: Previous text", "localization diff action should reveal shared presenter diff text");
assertEqual(localizationSourceStatus.textContent, "Review baseline: current extract", "localization review should show default review baseline");
assertEqual(localizationFilterSummary.textContent, "Showing 3 of 3 rows", "localization review should show all rows by default");
assertEqual(localizationSessionStatus.textContent, "0 overrides in session | Updated export needs previous CSV | Replace needs linked baseline", "localization session status should explain missing baseline");
assertEqual(localizationClearDraftsButton.disabled, true, "localization clear drafts button should stay disabled without visible drafts");
assertEqual(localizationReplaceButton.disabled, true, "localization replace button should stay disabled without linked previous CSV");
await localizationController.openPreviousCsv();
assertEqual(localizationSourceStatus.textContent, "Review baseline: baseline.csv | linked clean", "localization review should show linked baseline file state");
assertEqual(localizationSessionStatus.textContent, "0 overrides in session | Updated export ready | Linked clean", "localization session status should show linked baseline clean state");
assertEqual(localizationReplaceButton.disabled, true, "localization replace button should stay disabled without unsaved linked drafts");
localizationController.setFilterMode("changed");
assertEqual(localizationFilterMode.value, "changed", "localization filter control should track current filter");
assertEqual(localizationController.getVisibleRows().length, 1, "localization filter should keep only matching changed rows");
assertEqual(localizationPanel.querySelectorAll("[data-source-line]").filter((row) => !row.hidden).length, 1, "localization filter should hide non-matching table rows");
assertEqual(localizationFilterSummary.textContent, "Showing 1 of 3 rows | Changed", "localization filter summary should reflect narrowed rows");
draftStore.setTranslation(localizationController.rows[0], "");
localizationController.applyRowFilters();
const localizationOverrides = localizationController.collectTranslationOverrides();
assertEqual(localizationOverrides.length, 1, "localization controller should collect draft overrides by anchor");
assertEqual(localizationOverrides[0].anchor, "line_anchor_1", "localization controller should preserve review anchor for overrides");
assertEqual(localizationOverrides[0].translation, "", "localization controller should allow clearing previous translations");
assertEqual(localizationClearDraftsButton.disabled, true, "localization clear drafts button should stay disabled when the current filter hides draft rows");
assertEqual(localizationSourceStatus.textContent, "Review baseline: baseline.csv | linked 1 unsaved", "linked baseline status should show unsaved drafts");
assertEqual(localizationSessionStatus.textContent, "1 overrides in session | 0 visible | Updated export ready | Linked 1 unsaved", "localization session status should count hidden empty-string overrides");
assertEqual(localizationReplaceButton.disabled, false, "localization replace button should enable when linked drafts are unsaved");
draftStore.setTranslation(localizationController.rows[1], "Fresh draft");
localizationController.applyRowFilters();
localizationController.setFilterMode("draft");
assertEqual(localizationController.getVisibleRows().length, 2, "localization draft filter should surface anchor-based draft overrides");
assertEqual(localizationFilterSummary.textContent, "Showing 2 of 3 rows | Drafts", "localization draft filter summary should reflect draft rows");
assertEqual(localizationSourceStatus.textContent, "Review baseline: baseline.csv | linked 2 unsaved", "linked baseline status should update with multiple unsaved drafts");
assertEqual(localizationSessionStatus.textContent, "2 overrides in session | Updated export ready | Linked 2 unsaved", "localization session status should count visible draft overrides");
assertEqual(localizationClearDraftsButton.disabled, false, "localization clear drafts button should enable when the current filter shows draft rows");
await localizationController.clearVisibleDrafts();
assertEqual(localizationController.getVisibleRows().length, 0, "localization clear visible drafts should empty the current draft filter");
assertEqual(localizationFilterSummary.textContent, "Showing 0 of 3 rows | Drafts", "localization filter summary should reflect cleared visible drafts");
assertEqual(localizationSourceStatus.textContent, "Review baseline: baseline.csv | linked clean", "linked baseline status should reset after clearing visible drafts");
assertEqual(localizationSessionStatus.textContent, "0 overrides in session | Updated export ready | Linked clean", "localization session status should reset after clearing visible drafts");
assertEqual(localizationClearDraftsButton.disabled, true, "localization clear drafts button should disable after clearing visible drafts");
assertEqual(localizationReplaceButton.disabled, true, "localization replace button should disable after clearing visible drafts");
draftStore.setTranslation(localizationController.rows[0], "");
draftStore.setTranslation(localizationController.rows[1], "Fresh draft");
localizationController.applyRowFilters();
await localizationController.replacePreviousCsv();
assertEqual(linkedPreviousCsvWrites.length, 1, "localization replace should write updated csv through the linked file handle");
assertIncludesText(linkedPreviousCsvWrites[0], "Fresh draft");
assertEqual(localizationSourceStatus.textContent, "Review baseline: baseline.csv | linked clean", "localization replace should reset linked baseline state after writing");
assertEqual(localizationSessionStatus.textContent, "0 overrides in session | Updated export ready | Linked clean", "localization replace should clear session drafts after writing");
assertEqual(localizationReplaceButton.disabled, true, "localization replace should disable once linked baseline is clean");

const hostedEmptyPanel = new FakeElement("section");
const hostedEmptyExportButton = new FakeElement("button");
const hostedEmptyExportUpdatedButton = new FakeElement("button");
const hostedEmptyController = new LocalizationEditorController({
  panelElement: hostedEmptyPanel,
  draftStore: new LocalizationDraftStore(),
  exportDraftButtonElement: hostedEmptyExportButton,
  exportUpdatedButtonElement: hostedEmptyExportUpdatedButton,
  reviewBridge: {
    async getLocalizationReview() {
      return {
        provider: "localization-review",
        review: {
          presenter: {
            items: [],
          },
        },
      };
    },
  },
});
await hostedEmptyController.render("# Opening\nNarrator: Draft fallback row");
assertEqual(hostedEmptyController.getSummarySnapshot().provider, "localization-review", "empty hosted localization review should keep hosted provider");
assertEqual(hostedEmptyController.rows.length, 0, "empty hosted localization review should render zero rows");
assertNotIncludesText(getTextContent(hostedEmptyPanel), "Draft fallback row", "empty hosted localization review should not fall back to draft rows");
assertEqual(hostedEmptyExportButton.disabled, true, "empty hosted localization review should disable draft export");
assertEqual(hostedEmptyExportUpdatedButton.disabled, true, "empty hosted localization review should disable updated export");
assertEqual(hostedEmptyExportUpdatedButton.title, "Updated export needs localization rows", "empty hosted localization review should explain missing hosted rows");

const draftFallbackWrites = [];
let draftFallbackUpdateCalls = 0;
const draftFallbackPanel = new FakeElement("section");
const draftFallbackExportButton = new FakeElement("button");
const draftFallbackExportUpdatedButton = new FakeElement("button");
const draftFallbackReplaceButton = new FakeElement("button");
const draftFallbackSessionStatus = new FakeElement("span");
const draftFallbackController = new LocalizationEditorController({
  panelElement: draftFallbackPanel,
  draftStore: new LocalizationDraftStore(),
  exportDraftButtonElement: draftFallbackExportButton,
  exportUpdatedButtonElement: draftFallbackExportUpdatedButton,
  replacePreviousCsvButtonElement: draftFallbackReplaceButton,
  sessionStatusElement: draftFallbackSessionStatus,
  reviewBridge: {
    async getLocalizationReview() {
      return {
        provider: "localization-review-unavailable",
      };
    },
    async exportUpdatedLocalizationCsv() {
      draftFallbackUpdateCalls += 1;
      return {
        csv: "should-not-write",
        provider: "localization-update",
      };
    },
  },
});
await draftFallbackController.render("# Opening\nNarrator: Draft fallback row");
assertEqual(draftFallbackController.getSummarySnapshot().provider, "draft-fallback", "unavailable localization review should use draft fallback provider");
assertIncludesText(getTextContent(draftFallbackPanel), "Draft fallback row", "unavailable localization review should show draft rows");
await draftFallbackController.applyPreviousCsvSelection(
  {
    name: "fallback-baseline.csv",
    async text() {
      return "anchor,text,translation\nline_anchor_1,Draft fallback row,Previous";
    },
  },
  {
    async createWritable() {
      return {
        async close() {},
        async write(text) {
          draftFallbackWrites.push(String(text));
        },
      };
    },
  }
);
assertEqual(draftFallbackExportUpdatedButton.disabled, true, "draft fallback should keep updated export disabled with a linked baseline");
assertEqual(draftFallbackExportUpdatedButton.title, "Updated export unavailable in draft fallback mode", "draft fallback should explain why updated export is disabled");
assertEqual(draftFallbackReplaceButton.disabled, true, "draft fallback should keep direct replace disabled with a linked baseline");
assertEqual(draftFallbackReplaceButton.title, "Updated export unavailable in draft fallback mode", "draft fallback should explain why direct replace is disabled");
assertIncludesText(draftFallbackSessionStatus.textContent, "Updated export unavailable in draft fallback mode");
const originalConsoleError = console.error;
const draftFallbackErrors = [];
console.error = (...args) => {
  draftFallbackErrors.push(args.join(" "));
};
try {
  await draftFallbackController.exportUpdatedCsv();
  await draftFallbackController.replacePreviousCsv();
} finally {
  console.error = originalConsoleError;
}
assertIncludesText(draftFallbackErrors.join("\n"), "Updated export unavailable in draft fallback mode");
assertEqual(draftFallbackUpdateCalls, 0, "draft fallback should not call localization update bridge");
assertEqual(draftFallbackWrites.length, 0, "draft fallback should not write linked previous CSV");

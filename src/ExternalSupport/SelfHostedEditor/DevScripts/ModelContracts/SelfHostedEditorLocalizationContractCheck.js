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
                  nodeTitle: "Opening",
                  review: "needs-review",
                  speaker: "Narrator",
                  status: "changed",
                  text: "Compiler sourced row",
                  translation: "Previous translation",
                },
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
assertIncludesText(getTextContent(localizationPanel), "Already aligned row");
assertIncludesText(getTextContent(localizationPanel), "kept");
assertNotIncludesText(getTextContent(localizationPanel), "Draft fallback row");
findElementByClass(localizationPanel, "localization-review-action-candidate")?.click();
assertEqual(selectedLocalizationSource?.sourcePath, "samples/previous.inscape", "localization candidate action should preserve candidate source path");
assertEqual(selectedLocalizationSource?.lineNumber, 12, "localization candidate action should jump to candidate source line");
findElementByClass(localizationPanel, "localization-review-action-diff")?.click();
assertIncludesText(getTextContent(localizationPanel), "current: Compiler sourced row | previous: Previous text", "localization diff action should reveal shared presenter diff text");
assertEqual(localizationSourceStatus.textContent, "Review baseline: current extract", "localization review should show default review baseline");
assertEqual(localizationFilterSummary.textContent, "Showing 2 of 2 rows", "localization review should show all rows by default");
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
assertEqual(localizationFilterSummary.textContent, "Showing 1 of 2 rows | Changed", "localization filter summary should reflect narrowed rows");
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
assertEqual(localizationFilterSummary.textContent, "Showing 2 of 2 rows | Drafts", "localization draft filter summary should reflect draft rows");
assertEqual(localizationSourceStatus.textContent, "Review baseline: baseline.csv | linked 2 unsaved", "linked baseline status should update with multiple unsaved drafts");
assertEqual(localizationSessionStatus.textContent, "2 overrides in session | Updated export ready | Linked 2 unsaved", "localization session status should count visible draft overrides");
assertEqual(localizationClearDraftsButton.disabled, false, "localization clear drafts button should enable when the current filter shows draft rows");
await localizationController.clearVisibleDrafts();
assertEqual(localizationController.getVisibleRows().length, 0, "localization clear visible drafts should empty the current draft filter");
assertEqual(localizationFilterSummary.textContent, "Showing 0 of 2 rows | Drafts", "localization filter summary should reflect cleared visible drafts");
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

import { getLocalizationReviewForScriptText, getUpdatedLocalizationCsvForScriptText } from "./StartSelfHostedEditorPreview.js";

const scriptText = `# Opening
@entry
Narrator: Hello.`;

async function main() {
  const sessionId = "localization-update-smoke";
  const review = await getLocalizationReviewForScriptText(scriptText, null, "");
  const presenterItems = Array.isArray(review?.presenter?.items) ? review.presenter.items : [];
  const anchor = presenterItems[0]?.item?.anchor || "";
  if (!anchor) {
    throw new Error("Localization update smoke could not find a presenter anchor.");
  }

  const previousCsv = [
    "anchor,node,kind,speaker,text,translation,sourcePath,line,column",
    `${anchor},Opening,Dialogue,Narrator,Hello.,Old translation,draft.inscape,3,1`,
    "",
  ].join("\n");
  const baselineReview = await getLocalizationReviewForScriptText(scriptText, null, previousCsv, sessionId);
  if (baselineReview?.baseline?.source !== "request") {
    throw new Error(`Localization update smoke should seed baseline from request, got ${String(baselineReview?.baseline?.source || "")}.`);
  }

  const sessionReview = await getLocalizationReviewForScriptText(scriptText, null, "", sessionId);
  if (sessionReview?.baseline?.source !== "session") {
    throw new Error(`Localization update smoke should reuse baseline for review from session, got ${String(sessionReview?.baseline?.source || "")}.`);
  }

  const updated = await getUpdatedLocalizationCsvForScriptText(scriptText, null, "", [{
    anchor,
    translation: "Edited translation",
  }], sessionId);

  if (updated?.format !== "inscape.self-hosted-editor.localization-updated-csv") {
    throw new Error(`Unexpected localization update format: ${String(updated?.format || "")}`);
  }

  if (updated?.formatVersion !== 1) {
    throw new Error(`Unexpected localization update formatVersion: ${String(updated?.formatVersion || "")}`);
  }

  if (updated?.baseline?.source !== "session") {
    throw new Error(`Localization update smoke should reuse baseline from session, got ${String(updated?.baseline?.source || "")}.`);
  }

  if (!updated.csv.includes("anchor,node,kind,speaker,text,translation,status,sourcePath,line,column")) {
    throw new Error("Localization update smoke should emit the real updated CSV header.");
  }

  if (!updated.csv.includes("Edited translation,current")) {
    throw new Error("Localization update smoke should apply translation overrides before merging.");
  }

  if (updated.csv.includes("Old translation,current")) {
    throw new Error("Localization update smoke should not keep the old translation after overrides.");
  }

  console.log("SelfHostedEditor localization update smoke ok");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});

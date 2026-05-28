import { getLocalizationReviewForScriptText, getUpdatedLocalizationCsvForScriptText } from "./StartSelfHostedEditorPreview.js";

const scriptText = `# Opening
@entry
Narrator: Hello.`;

async function main() {
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
  const updated = await getUpdatedLocalizationCsvForScriptText(scriptText, null, previousCsv, [{
    anchor,
    translation: "Edited translation",
  }]);

  if (updated?.format !== "inscape.self-hosted-editor.localization-updated-csv") {
    throw new Error(`Unexpected localization update format: ${String(updated?.format || "")}`);
  }

  if (updated?.formatVersion !== 1) {
    throw new Error(`Unexpected localization update formatVersion: ${String(updated?.formatVersion || "")}`);
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

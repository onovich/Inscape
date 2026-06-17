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

  if (updated?.safety?.generatedBy !== "update-l10n-project") {
    throw new Error("Localization update smoke should report the shared CLI update contract.");
  }

  if (updated?.safety?.writesWorkspaceFile !== false) {
    throw new Error("Localization update smoke should report that dev-host update does not write workspace files.");
  }

  if (updated?.safety?.translationOverrideCount !== 1) {
    throw new Error(`Localization update smoke should count translation overrides, got ${String(updated?.safety?.translationOverrideCount || "")}.`);
  }

  if (!String(updated?.safety?.recoveryHint || "").includes("keep the previous CSV")) {
    throw new Error("Localization update smoke should include a recovery hint for host-owned replacement.");
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

  await assertRejectsHostConfigCsv();

  console.log("SelfHostedEditor localization update smoke ok");
}

async function assertRejectsHostConfigCsv() {
  const hostConfigCsv = [
    "query,returnType,description",
    "player.name,string,Host config row",
    "",
  ].join("\n");

  try {
    await getUpdatedLocalizationCsvForScriptText(scriptText, null, hostConfigCsv, [], "localization-update-host-config-smoke");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Previous localization CSV must include anchor and translation columns")) {
      throw new Error(`Localization update smoke should reject host config CSV with a specific error, got: ${message}`);
    }
    return;
  }

  throw new Error("Localization update smoke should reject host config CSV before generating updated localization output.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});

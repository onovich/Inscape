export const SelfHostedEditorElectronAppEntry = Object.freeze({
  appName: "Inscape SelfHostedEditor",
  rendererEntryPath: "../Scripts/Entries/SelfHostedEditorAppEntry.js",
  workbenchDocumentPath: "../Resources/Workbench/SelfHostedEditorWorkbenchDocument.html",
});

export function getSelfHostedEditorElectronAppEntry() {
  return SelfHostedEditorElectronAppEntry;
}

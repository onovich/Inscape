import {
  EditorBackendWorkspaceSnapshotFormat,
  EditorBackendWorkspaceSnapshotModel,
} from "../../Backend/Models/EditorBackendWorkspaceSnapshotModel.js";

export class LanguageServerAuthoringRequestModel {
  static build({
    query = {},
    scriptText = "",
    workspace = null,
    workspaceSnapshot = null,
  } = {}) {
    if (workspaceSnapshot?.format === EditorBackendWorkspaceSnapshotFormat) {
      const activeRequest = EditorBackendWorkspaceSnapshotModel.buildActiveDocumentRequest(workspaceSnapshot);
      return {
        ...query,
        activeRelativePath: activeRequest.activeRelativePath,
        documentRevision: activeRequest.documentRevision,
        scriptText: activeRequest.scriptText,
        workspace: activeRequest.workspace,
      };
    }

    return {
      ...query,
      scriptText: typeof scriptText === "string" ? scriptText : "",
      workspace,
    };
  }
}

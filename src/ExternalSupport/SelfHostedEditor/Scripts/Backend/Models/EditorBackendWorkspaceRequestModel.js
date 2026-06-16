import {
  EditorBackendWorkspaceSnapshotFormat,
  EditorBackendWorkspaceSnapshotModel,
} from "./EditorBackendWorkspaceSnapshotModel.js";

export class EditorBackendWorkspaceRequestModel {
  static build({
    request = {},
    scriptText = "",
    workspace = null,
    workspaceSnapshot = null,
  } = {}) {
    if (workspaceSnapshot?.format === EditorBackendWorkspaceSnapshotFormat) {
      const activeRequest = EditorBackendWorkspaceSnapshotModel.buildActiveDocumentRequest(workspaceSnapshot);
      return {
        ...request,
        activeRelativePath: activeRequest.activeRelativePath,
        documentRevision: activeRequest.documentRevision,
        scriptText: activeRequest.scriptText,
        workspace: activeRequest.workspace,
      };
    }

    return {
      ...request,
      scriptText: typeof scriptText === "string" ? scriptText : "",
      workspace,
    };
  }
}

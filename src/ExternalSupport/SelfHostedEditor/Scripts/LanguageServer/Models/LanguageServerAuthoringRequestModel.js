import { EditorBackendWorkspaceRequestModel } from "../../Backend/Models/EditorBackendWorkspaceRequestModel.js";

export class LanguageServerAuthoringRequestModel {
  static build({
    query = {},
    scriptText = "",
    workspace = null,
    workspaceSnapshot = null,
  } = {}) {
    return EditorBackendWorkspaceRequestModel.build({
      request: query,
      scriptText,
      workspace,
      workspaceSnapshot,
    });
  }
}

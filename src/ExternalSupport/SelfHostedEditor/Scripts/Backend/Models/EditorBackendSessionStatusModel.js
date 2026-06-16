import {
  EditorBackendProjectSessionFormat,
  EditorBackendProjectSessionFormatVersion,
  EditorBackendProjectSessionModel,
} from "./EditorBackendProjectSessionModel.js";

export const EditorBackendSessionStatusFormat = EditorBackendProjectSessionFormat;
export const EditorBackendSessionStatusFormatVersion = EditorBackendProjectSessionFormatVersion;

export class EditorBackendSessionStatusModel {
  static buildDevHostStatus(sessionCacheStatus = {}, options = {}) {
    return EditorBackendProjectSessionModel.buildDevHostProjectSession({
      sessionCacheStatus,
      sessionId: options.sessionId,
      workspace: options.workspace,
    });
  }

  static normalizeTransportStatus(status = {}, options = {}) {
    if (
      status?.format === EditorBackendProjectSessionFormat
      && status?.formatVersion === EditorBackendProjectSessionFormatVersion
    ) {
      return status;
    }

    return this.buildDevHostStatus(status, options);
  }
}

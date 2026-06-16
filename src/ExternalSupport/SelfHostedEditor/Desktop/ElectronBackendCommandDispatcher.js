import { validateSelfHostedEditorPreloadCommandPayload } from "./ElectronPreloadApi.js";
import {
  EditorBackendDesktopSessionModel,
} from "../Scripts/Backend/Models/EditorBackendDesktopSessionModel.js";
import {
  EditorBackendTransportCommand,
  listEditorBackendTransportCommands,
} from "../Scripts/Backend/Clients/EditorBackendTransport.js";

export async function dispatchSelfHostedEditorBackendCommand(command, payload = {}, options = {}) {
  const normalizedPayload = validateSelfHostedEditorPreloadCommandPayload(command, payload || {});
  const handlers = {
    ...createSelfHostedEditorBackendCommandHandlers(options),
    ...(options.handlers || {}),
  };
  const handler = handlers[command];
  if (typeof handler !== "function") {
    throw new Error(`SelfHostedEditor Electron backend command is not wired yet: ${command}`);
  }

  return await handler(normalizedPayload);
}

export function createSelfHostedEditorBackendCommandHandlers(options = {}) {
  return Object.freeze({
    [EditorBackendTransportCommand.ProjectSessionStatus]: async (payload = {}) => {
      return buildSelfHostedEditorElectronProjectSessionStatus(payload, options);
    },
  });
}

export function listSelfHostedEditorElectronBackendCommands() {
  return listEditorBackendTransportCommands();
}

export function buildSelfHostedEditorElectronProjectSessionStatus(payload = {}, options = {}) {
  const workspace = payload.workspace || {};
  const documents = normalizeWorkspaceDocuments(workspace);
  return EditorBackendDesktopSessionModel.buildProjectSession({
    documents,
    sessionId: payload.sessionId || options.sessionId || "desktop-main",
    workspace: {
      activeRelativePath: workspace.activeRelativePath
        || workspace.currentFilePath
        || workspace.filePath
        || documents.find((document) => document.active)?.relativePath
        || documents[0]?.relativePath
        || "",
      revision: workspace.revision || workspace.documentRevision || workspace.workspaceRevision || 1,
      workspaceName: workspace.workspaceName || workspace.name || "workspace",
      workspaceRoot: workspace.workspaceRoot || workspace.rootPath || workspace.root || "",
    },
  });
}

function normalizeWorkspaceDocuments(workspace = {}) {
  const documents = Array.isArray(workspace.documents) ? workspace.documents : [];
  const activeRelativePath = String(
    workspace.activeRelativePath
      || workspace.currentFilePath
      || workspace.filePath
      || documents[0]?.relativePath
      || ""
  ).replace(/\\/g, "/");

  return documents
    .map((document) => ({
      active: String(document.relativePath || "").replace(/\\/g, "/") === activeRelativePath,
      dirty: Boolean(document.dirty),
      existsOnDisk: document.existsOnDisk !== false,
      relativePath: document.relativePath,
      revision: document.revision || workspace.revision || 1,
      text: "",
    }))
    .filter((document) => document.relativePath);
}

import { validateSelfHostedEditorPreloadCommandPayload } from "./ElectronPreloadApi.js";
import {
  buildProjectSessionStatusFromPayload,
  createSelfHostedEditorElectronWorkspaceSessionStore,
} from "./ElectronWorkspaceSessionStore.js";
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

export function createSelfHostedEditorElectronBackendCommandDispatcher(options = {}) {
  const sessionStore = options.sessionStore || createSelfHostedEditorElectronWorkspaceSessionStore(options);
  return async (command, payload = {}) => await dispatchSelfHostedEditorBackendCommand(command, payload, {
    ...options,
    sessionStore,
  });
}

export function createSelfHostedEditorBackendCommandHandlers(options = {}) {
  const sessionStore = options.sessionStore || createSelfHostedEditorElectronWorkspaceSessionStore(options);
  return Object.freeze({
    [EditorBackendTransportCommand.DocumentBufferList]: async () => {
      return sessionStore.listDocumentBuffers();
    },
    [EditorBackendTransportCommand.DocumentBufferRead]: async (payload = {}) => {
      return sessionStore.readDocument(payload);
    },
    [EditorBackendTransportCommand.DocumentBufferUpdateDraft]: async (payload = {}) => {
      return sessionStore.updateDraft(payload);
    },
    [EditorBackendTransportCommand.ProjectSessionStatus]: async (payload = {}) => {
      return sessionStore.getProjectSessionStatus(payload);
    },
    [EditorBackendTransportCommand.WorkspaceListFiles]: async () => {
      return sessionStore.listFiles();
    },
    [EditorBackendTransportCommand.WorkspaceOpenFolder]: async (payload = {}) => {
      return await sessionStore.openFolder(payload);
    },
  });
}

export function listSelfHostedEditorElectronBackendCommands() {
  return listEditorBackendTransportCommands();
}

export function buildSelfHostedEditorElectronProjectSessionStatus(payload = {}, options = {}) {
  return buildProjectSessionStatusFromPayload(payload, options);
}

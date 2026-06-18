import { validateSelfHostedEditorPreloadCommandPayload } from "./ElectronPreloadApi.js";
import {
  buildProjectSessionStatusFromPayload,
  createSelfHostedEditorElectronWorkspaceSessionStore,
} from "./ElectronWorkspaceSessionStore.js";
import {
  EditorBackendTransportCommand,
  listEditorBackendTransportCommands,
} from "../Scripts/Backend/Clients/EditorBackendTransport.js";

const languageSessionKindsByCommand = Object.freeze({
  [EditorBackendTransportCommand.LanguageCompletions]: "completions",
  [EditorBackendTransportCommand.LanguageDefinition]: "definition",
  [EditorBackendTransportCommand.LanguageDiagnostics]: "diagnostics",
  [EditorBackendTransportCommand.LanguageDocumentSymbols]: "document-symbols",
  [EditorBackendTransportCommand.LanguageHover]: "hover",
  [EditorBackendTransportCommand.LanguageReferences]: "references",
});

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
    [EditorBackendTransportCommand.DocumentBufferSave]: async (payload = {}) => {
      return await sessionStore.saveDocument(payload);
    },
    [EditorBackendTransportCommand.DocumentBufferSaveAll]: async (payload = {}) => {
      return await sessionStore.saveAll(payload);
    },
    [EditorBackendTransportCommand.DocumentBufferUpdateDraft]: async (payload = {}) => {
      return await sessionStore.updateDraft(payload);
    },
    ...Object.fromEntries(Object.entries(languageSessionKindsByCommand).map(([command, kind]) => [
      command,
      async (payload = {}) => {
        return await sessionStore.runLanguageSessionCommand(kind, payload);
      },
    ])),
    [EditorBackendTransportCommand.ProjectSessionStatus]: async (payload = {}) => {
      return sessionStore.getProjectSessionStatus(payload);
    },
    [EditorBackendTransportCommand.RecoveryDiscard]: async (payload = {}) => {
      return await sessionStore.discardRecoverySnapshot(payload);
    },
    [EditorBackendTransportCommand.RecoveryLater]: async (payload = {}) => {
      return await sessionStore.markRecoverySnapshotLater(payload);
    },
    [EditorBackendTransportCommand.RecoveryRestore]: async (payload = {}) => {
      return await sessionStore.restoreRecoverySnapshot(payload);
    },
    [EditorBackendTransportCommand.RuntimeSubstateExport]: async () =>
      buildUnavailableRuntimeSubstateOperation("export"),
    [EditorBackendTransportCommand.RuntimeSubstateImport]: async () =>
      buildUnavailableRuntimeSubstateOperation("import"),
    [EditorBackendTransportCommand.RuntimeSubstateValidate]: async () =>
      buildUnavailableRuntimeSubstateOperation("validate"),
    [EditorBackendTransportCommand.WorkspaceListFiles]: async () => {
      return sessionStore.listFiles();
    },
    [EditorBackendTransportCommand.WorkspaceOpenFolder]: async (payload = {}) => {
      return await sessionStore.openFolder(payload);
    },
    [EditorBackendTransportCommand.WorkspaceImportAssets]: async (payload = {}) => {
      return await sessionStore.importAssets(payload);
    },
    [EditorBackendTransportCommand.WorkspaceWriteBackBackup]: async (payload = {}) => {
      return await sessionStore.runWriteBackBackup(payload);
    },
    [EditorBackendTransportCommand.StableNodeMapWriteSidecar]: async (payload = {}) => {
      return await sessionStore.writeNodeMapSidecar(payload);
    },
  });
}

export function listSelfHostedEditorElectronBackendCommands() {
  return listEditorBackendTransportCommands();
}

export function buildSelfHostedEditorElectronProjectSessionStatus(payload = {}, options = {}) {
  return buildProjectSessionStatusFromPayload(payload, options);
}

function buildUnavailableRuntimeSubstateOperation(operation) {
  return {
    error: "SelfHostedEditor desktop Runtime substate backend is unavailable in the current embedded workspace session.",
    format: "inscape.self-hosted-editor.runtime-substate-operation",
    formatVersion: 1,
    imported: false,
    operation,
    validationStatus: "unavailable",
  };
}

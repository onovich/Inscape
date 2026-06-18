import {
  readJsonRequestBody,
  writeJsonErrorResponse,
  writeJsonResponse,
} from "./SelfHostedEditorHttpBridge.js";
import {
  getLineMapSessionState,
  getRuntimeSessionState,
  getSelfHostedEditorSessionCacheStatus,
  normalizeLineMapSessionId,
  normalizeLocalizationSessionId,
  normalizeRuntimeSessionId,
} from "./SelfHostedEditorSessionBridge.js";
import {
  normalizeWorkspacePayload,
} from "./SelfHostedEditorWorkspaceBridge.js";
import { EditorBackendDocumentBufferStoreModel } from "../Scripts/Backend/Models/EditorBackendDocumentBufferStoreModel.js";

export function createSelfHostedEditorApiHandlers(services) {
  return {
    completions: createJsonApiHandler(async (payload) => {
      const scriptText = readScriptText(payload);
      const workspace = normalizeWorkspacePayload(payload.workspace);
      return services.getCompletionsForScriptText(scriptText, workspace);
    }),
    documentBufferList: createJsonApiHandler(async (payload) =>
      EditorBackendDocumentBufferStoreModel.listDocuments(payload.store || {})
    ),
    documentBufferRead: createJsonApiHandler(async (payload) =>
      EditorBackendDocumentBufferStoreModel.getDocument(payload.store || {}, payload)
    ),
    documentBufferSave: createJsonApiHandler(async (payload) =>
      EditorBackendDocumentBufferStoreModel.saveDocument(payload.store || {}, payload)
    ),
    documentBufferSaveAll: createJsonApiHandler(async (payload) =>
      EditorBackendDocumentBufferStoreModel.saveAll(payload.store || {}, payload)
    ),
    documentBufferUpdateDraft: createJsonApiHandler(async (payload) =>
      EditorBackendDocumentBufferStoreModel.updateDocument(payload.store || {}, payload)
    ),
    definition: createJsonApiHandler(async (payload) => {
      const scriptText = readScriptText(payload);
      const definitionName = typeof payload.definitionName === "string"
        ? payload.definitionName
        : "";
      const workspace = normalizeWorkspacePayload(payload.workspace);
      return services.getDefinitionForScriptText(scriptText, definitionName, workspace);
    }),
    diagnostics: createJsonApiHandler(async (payload) => {
      const scriptText = readScriptText(payload);
      const workspace = normalizeWorkspacePayload(payload.workspace);
      return services.diagnoseScriptText(scriptText, workspace);
    }),
    documentSymbols: createJsonApiHandler(async (payload) => {
      const scriptText = readScriptText(payload);
      const workspace = normalizeWorkspacePayload(payload.workspace);
      return services.getDocumentSymbolsForScriptText(scriptText, workspace);
    }),
    hostBindingCapabilities: createJsonApiHandler(async (payload) => {
      const scriptText = readScriptText(payload);
      const workspace = normalizeWorkspacePayload(payload.workspace);
      return services.getHostBindingCapabilitiesForScriptText(scriptText, workspace);
    }),
    hostSchemaCapabilities: createJsonApiHandler(async (payload) => {
      const scriptText = readScriptText(payload);
      const workspace = normalizeWorkspacePayload(payload.workspace);
      return services.getHostSchemaCapabilitiesForScriptText(scriptText, workspace);
    }),
    hover: createJsonApiHandler(async (payload) => {
      const scriptText = readScriptText(payload);
      const hoverKind = typeof payload.hoverKind === "string"
        ? payload.hoverKind
        : "";
      const hoverName = typeof payload.hoverName === "string"
        ? payload.hoverName
        : "";
      const workspace = normalizeWorkspacePayload(payload.workspace);
      return services.getHoverForScriptText(scriptText, hoverKind, hoverName, workspace);
    }),
    lineMapRefresh: createJsonApiHandler(async (payload) => {
      const scriptText = readScriptText(payload);
      const workspace = normalizeWorkspacePayload(payload.workspace);
      const sessionId = normalizeLineMapSessionId(payload.sessionId);
      const existingLineMap = payload.existingLineMap && typeof payload.existingLineMap === "object"
        ? payload.existingLineMap
        : getLineMapSessionState(sessionId);
      return services.refreshLineMapForScriptText(scriptText, workspace, existingLineMap, sessionId);
    }),
    localizationReview: createJsonApiHandler(async (payload) => {
      const scriptText = readScriptText(payload);
      const workspace = normalizeWorkspacePayload(payload.workspace);
      const sessionId = normalizeLocalizationSessionId(payload.sessionId);
      const previousCsv = typeof payload.previousCsv === "string"
        ? payload.previousCsv
        : "";
      return services.getLocalizationReviewForScriptText(scriptText, workspace, previousCsv, sessionId);
    }),
    localizationUpdate: createJsonApiHandler(async (payload) => {
      const scriptText = readScriptText(payload);
      const workspace = normalizeWorkspacePayload(payload.workspace);
      const sessionId = normalizeLocalizationSessionId(payload.sessionId);
      const previousCsv = typeof payload.previousCsv === "string"
        ? payload.previousCsv
        : "";
      const translationOverrides = Array.isArray(payload.translationOverrides)
        ? payload.translationOverrides
        : [];
      return services.getUpdatedLocalizationCsvForScriptText(
        scriptText,
        workspace,
        previousCsv,
        translationOverrides,
        sessionId
      );
    }),
    nodeMapApply: createJsonApiHandler(async (payload) => {
      const scriptText = readScriptText(payload);
      const workspace = normalizeWorkspacePayload(payload.workspace);
      const item = payload.item && typeof payload.item === "object" ? payload.item : {};
      const candidate = payload.candidate && typeof payload.candidate === "object" ? payload.candidate : {};
      const nodeMapPath = typeof payload.nodeMapPath === "string" ? payload.nodeMapPath : "";
      return services.getStoryNodeMapCandidateApplyForScriptText(
        scriptText,
        workspace,
        item,
        candidate,
        Boolean(payload.dryRun),
        nodeMapPath
      );
    }),
    nodeMapReview: createJsonApiHandler(async (payload) => {
      const scriptText = readScriptText(payload);
      const workspace = normalizeWorkspacePayload(payload.workspace);
      return services.getStoryNodeMapReviewForScriptText(scriptText, workspace);
    }),
    references: createJsonApiHandler(async (payload) => {
      const scriptText = readScriptText(payload);
      const referenceName = typeof payload.referenceName === "string"
        ? payload.referenceName
        : "";
      const workspace = normalizeWorkspacePayload(payload.workspace);
      return services.getReferencesForScriptText(scriptText, referenceName, workspace);
    }),
    runtimeAction: createJsonApiHandler(async (payload) => {
      const scriptText = readScriptText(payload);
      const workspace = normalizeWorkspacePayload(payload.workspace);
      const sessionId = normalizeRuntimeSessionId(payload.sessionId);
      const runtimeState = payload.runtimeState && typeof payload.runtimeState === "object"
        ? payload.runtimeState
        : getRuntimeSessionState(sessionId);
      const action = payload.action && typeof payload.action === "object"
        ? payload.action
        : {};
      const queryProvider = payload.queryProvider && typeof payload.queryProvider === "object"
        ? payload.queryProvider
        : null;
      const actionDispatcher = payload.actionDispatcher && typeof payload.actionDispatcher === "object"
        ? payload.actionDispatcher
        : null;
      return services.stepRuntimeStateForScriptText(scriptText, workspace, runtimeState, action, sessionId, queryProvider, actionDispatcher);
    }),
    runtimeSubstateExport: createJsonApiHandler(async (payload) => {
      const scriptText = readScriptText(payload);
      const workspace = normalizeWorkspacePayload(payload.workspace);
      const sessionId = normalizeRuntimeSessionId(payload.sessionId);
      const runtimeState = payload.runtimeState && typeof payload.runtimeState === "object"
        ? payload.runtimeState
        : getRuntimeSessionState(sessionId);
      const queryProvider = payload.queryProvider && typeof payload.queryProvider === "object"
        ? payload.queryProvider
        : null;
      const actionDispatcher = payload.actionDispatcher && typeof payload.actionDispatcher === "object"
        ? payload.actionDispatcher
        : null;
      return services.exportRuntimeSubstateForScriptText(scriptText, workspace, runtimeState, sessionId, queryProvider, actionDispatcher, {
        hostCheckpointId: typeof payload.hostCheckpointId === "string" ? payload.hostCheckpointId : "",
        scriptVersion: typeof payload.scriptVersion === "string" ? payload.scriptVersion : "",
      });
    }),
    runtimeSubstateImport: createJsonApiHandler(async (payload) => {
      const scriptText = readScriptText(payload);
      const workspace = normalizeWorkspacePayload(payload.workspace);
      const sessionId = normalizeRuntimeSessionId(payload.sessionId);
      const queryProvider = payload.queryProvider && typeof payload.queryProvider === "object"
        ? payload.queryProvider
        : null;
      const actionDispatcher = payload.actionDispatcher && typeof payload.actionDispatcher === "object"
        ? payload.actionDispatcher
        : null;
      return services.importRuntimeSubstateForScriptText(scriptText, workspace, readSubstateInput(payload), sessionId, queryProvider, actionDispatcher, {
        scriptVersion: typeof payload.scriptVersion === "string" ? payload.scriptVersion : "",
      });
    }),
    runtimeSubstateValidate: createJsonApiHandler(async (payload) => {
      const scriptText = readScriptText(payload);
      const workspace = normalizeWorkspacePayload(payload.workspace);
      const sessionId = normalizeRuntimeSessionId(payload.sessionId);
      return services.validateRuntimeSubstateForScriptText(scriptText, workspace, readSubstateInput(payload), sessionId, {
        scriptVersion: typeof payload.scriptVersion === "string" ? payload.scriptVersion : "",
      });
    }),
    runtimeState: createJsonApiHandler(async (payload) => {
      const scriptText = readScriptText(payload);
      const workspace = normalizeWorkspacePayload(payload.workspace);
      const sessionId = normalizeRuntimeSessionId(payload.sessionId);
      const queryProvider = payload.queryProvider && typeof payload.queryProvider === "object"
        ? payload.queryProvider
        : null;
      const actionDispatcher = payload.actionDispatcher && typeof payload.actionDispatcher === "object"
        ? payload.actionDispatcher
        : null;
      return services.getRuntimeStateForScriptText(scriptText, workspace, sessionId, queryProvider, actionDispatcher);
    }),
    sessionCacheStatus: createJsonApiHandler(async () =>
      getSelfHostedEditorSessionCacheStatus()
    ),
    storyGraph: createJsonApiHandler(async (payload) => {
      const scriptText = readScriptText(payload);
      const workspace = normalizeWorkspacePayload(payload.workspace);
      return services.getStoryGraphForScriptText(scriptText, workspace);
    }),
  };
}

function createJsonApiHandler(resolvePayload) {
  return async (request, response) => {
    try {
      const payload = await readJsonRequestBody(request);
      writeJsonResponse(response, await resolvePayload(payload));
    } catch (error) {
      writeJsonErrorResponse(response, error);
    }
  };
}

function readScriptText(payload) {
  return typeof payload.scriptText === "string"
    ? payload.scriptText
    : "";
}

function readSubstateInput(payload) {
  if (typeof payload.substateText === "string") {
    return payload.substateText;
  }

  if (payload.substate && typeof payload.substate === "object") {
    return payload.substate;
  }

  return "";
}

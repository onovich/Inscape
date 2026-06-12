import {
  readJsonRequestBody,
  writeJsonErrorResponse,
  writeJsonResponse,
} from "./SelfHostedEditorHttpBridge.js";
import {
  getLineMapSessionState,
  getRuntimeSessionState,
  normalizeLineMapSessionId,
  normalizeLocalizationSessionId,
  normalizeRuntimeSessionId,
} from "./SelfHostedEditorSessionBridge.js";
import {
  normalizeWorkspacePayload,
} from "./SelfHostedEditorWorkspaceBridge.js";

export function createSelfHostedEditorApiHandlers(services) {
  return {
    completions: createJsonApiHandler(async (payload) => {
      const scriptText = readScriptText(payload);
      const workspace = normalizeWorkspacePayload(payload.workspace);
      return services.getCompletionsForScriptText(scriptText, workspace);
    }),
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
      return services.stepRuntimeStateForScriptText(scriptText, workspace, runtimeState, action, sessionId);
    }),
    runtimeState: createJsonApiHandler(async (payload) => {
      const scriptText = readScriptText(payload);
      const workspace = normalizeWorkspacePayload(payload.workspace);
      const sessionId = normalizeRuntimeSessionId(payload.sessionId);
      return services.getRuntimeStateForScriptText(scriptText, workspace, sessionId);
    }),
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

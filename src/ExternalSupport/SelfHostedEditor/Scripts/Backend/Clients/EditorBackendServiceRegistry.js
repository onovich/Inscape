import { EditorBackendDesktopSessionModel } from "../Models/EditorBackendDesktopSessionModel.js";
import { EditorBackendDocumentBufferModel } from "../Models/EditorBackendDocumentBufferModel.js";
import { EditorBackendDocumentBufferStoreModel } from "../Models/EditorBackendDocumentBufferStoreModel.js";
import { EditorBackendWorkspaceAssetImportPlanModel } from "../Models/EditorBackendWorkspaceAssetImportPlanModel.js";
import { EditorBackendWorkspaceBackupPlanModel } from "../Models/EditorBackendWorkspaceBackupPlanModel.js";
import { EditorBackendWorkspaceSnapshotModel } from "../Models/EditorBackendWorkspaceSnapshotModel.js";
import { EditorBackendClient } from "./EditorBackendClient.js";

const serviceKeys = Object.freeze([
  "projectSessionService",
  "documentBufferStore",
  "languageSessionClient",
  "hostCapabilityClient",
  "storyGraphClient",
  "runtimeSessionClient",
  "lineIdentityClient",
  "localizationWorkflowClient",
  "stableNodeMapClient",
  "diagnosticsService",
]);

export class ProjectSessionService {
  #projectSession;

  constructor(backendClient) {
    this.sessionId = backendClient?.sessionId || "";
    this.#projectSession = requireCapability(backendClient?.projectSession, "status", "ProjectSessionService");
    Object.freeze(this);
  }

  async status(request = {}) {
    return await this.#projectSession.status(request);
  }
}

export class DocumentBufferStore {
  #documentBuffer;

  constructor(options = {}) {
    this.sessionId = options.sessionId || options.backendClient?.sessionId || "";
    this.#documentBuffer = options.backendClient?.documentBuffer || buildLocalDocumentBufferCommands(this.sessionId);
    Object.freeze(this);
  }

  buildBuffer(document = {}) {
    return EditorBackendDocumentBufferModel.buildBuffer(document);
  }

  buildSummary(documentBuffer = {}) {
    return EditorBackendDocumentBufferModel.buildSummary(documentBuffer);
  }

  buildStore(store = {}) {
    return EditorBackendDocumentBufferStoreModel.buildStore({
      ...store,
      sessionId: store.sessionId || this.sessionId,
    });
  }

  listDocuments(store = {}) {
    return EditorBackendDocumentBufferStoreModel.listDocuments(store);
  }

  getDocument(store = {}, request = {}) {
    return EditorBackendDocumentBufferStoreModel.getDocument(store, request);
  }

  async readDocument(request = {}) {
    return await this.#documentBuffer.read(request);
  }

  updateDocument(store = {}, request = {}) {
    return EditorBackendDocumentBufferStoreModel.updateDocument(store, request);
  }

  async updateDraft(request = {}) {
    return await this.#documentBuffer.updateDraft(request);
  }

  setActiveDocument(store = {}, request = {}) {
    return EditorBackendDocumentBufferStoreModel.setActiveDocument(store, request);
  }

  async saveDocument(request = {}) {
    return await this.#documentBuffer.saveDocument(request);
  }

  saveDocumentToStore(store = {}, request = {}) {
    return EditorBackendDocumentBufferStoreModel.saveDocument(store, request);
  }

  async saveAll(request = {}) {
    return await this.#documentBuffer.saveAll(request);
  }

  saveAllToStore(store = {}, request = {}) {
    return EditorBackendDocumentBufferStoreModel.saveAll(store, request);
  }

  buildAutosavePlan(store = {}, request = {}) {
    return EditorBackendDocumentBufferStoreModel.buildAutosavePlan(store, request);
  }

  buildFlushPlan(store = {}, request = {}) {
    return EditorBackendDocumentBufferStoreModel.buildFlushPlan(store, request);
  }

  buildRecoverySnapshotPlan(store = {}, request = {}) {
    return EditorBackendDocumentBufferStoreModel.buildRecoverySnapshotPlan(store, request);
  }

  buildBackupPlan(request = {}) {
    return EditorBackendWorkspaceBackupPlanModel.buildPlan(request);
  }

  buildAssetImportPlan(request = {}) {
    return EditorBackendWorkspaceAssetImportPlanModel.buildPlan(request);
  }

  buildWorkspaceSnapshot(store = {}, request = {}) {
    return EditorBackendWorkspaceSnapshotModel.buildSnapshot({
      activeRelativePath: request.activeRelativePath,
      store,
    });
  }

  buildActiveDocumentRequest(snapshot = {}) {
    return EditorBackendWorkspaceSnapshotModel.buildActiveDocumentRequest(snapshot);
  }

  buildWorkspaceBoundary(boundary = {}) {
    return EditorBackendDesktopSessionModel.buildWorkspaceFileBoundary(boundary);
  }

  buildSaveStatus(saveStatus = {}) {
    return EditorBackendDesktopSessionModel.buildSaveStatus(saveStatus);
  }

  buildRecoveryStatus(recoveryStatus = {}) {
    return EditorBackendDesktopSessionModel.buildRecoveryStatus(recoveryStatus);
  }

  buildSettingsSummary(settingsSummary = {}) {
    return EditorBackendDesktopSessionModel.buildSettingsSummary(settingsSummary);
  }
}

export class LanguageSessionClient {
  #languageSession;

  constructor(backendClient) {
    this.sessionId = backendClient?.sessionId || "";
    this.#languageSession = requireCapabilities(backendClient?.languageSession, [
      "completions",
      "definition",
      "diagnose",
      "documentSymbols",
      "hover",
      "references",
    ], "LanguageSessionClient");
    Object.freeze(this);
  }

  async completions(request = {}) {
    return await this.#languageSession.completions(request);
  }

  async definition(request = {}) {
    return await this.#languageSession.definition(request);
  }

  async diagnose(request = {}) {
    return await this.#languageSession.diagnose(request);
  }

  async documentSymbols(request = {}) {
    return await this.#languageSession.documentSymbols(request);
  }

  async hover(request = {}) {
    return await this.#languageSession.hover(request);
  }

  async references(request = {}) {
    return await this.#languageSession.references(request);
  }
}

export class HostCapabilityClient {
  #hostCapabilities;

  constructor(backendClient) {
    this.sessionId = backendClient?.sessionId || "";
    this.#hostCapabilities = requireCapabilities(backendClient?.hostCapabilities, [
      "bindingCapabilities",
      "schemaCapabilities",
    ], "HostCapabilityClient");
    Object.freeze(this);
  }

  async bindingCapabilities(request = {}) {
    return await this.#hostCapabilities.bindingCapabilities(request);
  }

  async schemaCapabilities(request = {}) {
    return await this.#hostCapabilities.schemaCapabilities(request);
  }
}

export class StoryGraphClient {
  #storyGraph;

  constructor(backendClient) {
    this.sessionId = backendClient?.sessionId || "";
    this.#storyGraph = requireCapability(backendClient?.storyGraph, "compileProjectGraph", "StoryGraphClient");
    Object.freeze(this);
  }

  async compileProjectGraph(request = {}) {
    return await this.#storyGraph.compileProjectGraph(request);
  }
}

export class RuntimeSessionClient {
  #runtimeSession;

  constructor(backendClient) {
    this.sessionId = backendClient?.sessionId || "";
    this.#runtimeSession = requireCapabilities(backendClient?.runtimeSession, [
      "startOrObserve",
      "step",
    ], "RuntimeSessionClient");
    Object.freeze(this);
  }

  async startOrObserve(request = {}) {
    return await this.#runtimeSession.startOrObserve(request);
  }

  async step(request = {}) {
    return await this.#runtimeSession.step(request);
  }
}

export class LineIdentitySessionClient {
  #lineIdentitySession;

  constructor(backendClient) {
    this.sessionId = backendClient?.sessionId || "";
    this.#lineIdentitySession = requireCapability(backendClient?.lineIdentitySession, "refresh", "LineIdentitySessionClient");
    Object.freeze(this);
  }

  async refresh(request = {}) {
    return await this.#lineIdentitySession.refresh(request);
  }
}

export class LocalizationWorkflowClient {
  #localizationSession;

  constructor(backendClient) {
    this.sessionId = backendClient?.sessionId || "";
    this.#localizationSession = requireCapabilities(backendClient?.localizationSession, [
      "review",
      "updateCsv",
    ], "LocalizationWorkflowClient");
    Object.freeze(this);
  }

  async review(request = {}) {
    return await this.#localizationSession.review(request);
  }

  async updateCsv(request = {}) {
    return await this.#localizationSession.updateCsv(request);
  }
}

export class StableNodeMapClient {
  #stableNodeMap;

  constructor(backendClient) {
    this.sessionId = backendClient?.sessionId || "";
    this.#stableNodeMap = requireCapabilities(backendClient?.stableNodeMap, [
      "applyCandidate",
      "review",
    ], "StableNodeMapClient");
    Object.freeze(this);
  }

  async applyCandidate(request = {}) {
    return await this.#stableNodeMap.applyCandidate(request);
  }

  async review(request = {}) {
    return await this.#stableNodeMap.review(request);
  }
}

export class BackendDiagnosticsService {
  #diagnostics;

  constructor(backendClient) {
    this.sessionId = backendClient?.sessionId || "";
    this.#diagnostics = requireCapability(backendClient?.diagnostics, "sessionStatus", "BackendDiagnosticsService");
    Object.freeze(this);
  }

  async sessionStatus(request = {}) {
    return await this.#diagnostics.sessionStatus(request);
  }
}

export function createEditorBackendServices(options = {}) {
  const backendClient = options.backendClient || new EditorBackendClient(options);
  return Object.freeze({
    projectSessionService: new ProjectSessionService(backendClient),
    documentBufferStore: new DocumentBufferStore({ backendClient }),
    languageSessionClient: new LanguageSessionClient(backendClient),
    hostCapabilityClient: new HostCapabilityClient(backendClient),
    storyGraphClient: new StoryGraphClient(backendClient),
    runtimeSessionClient: new RuntimeSessionClient(backendClient),
    lineIdentityClient: new LineIdentitySessionClient(backendClient),
    localizationWorkflowClient: new LocalizationWorkflowClient(backendClient),
    stableNodeMapClient: new StableNodeMapClient(backendClient),
    diagnosticsService: new BackendDiagnosticsService(backendClient),
  });
}

export function listEditorBackendServiceKeys() {
  return [...serviceKeys];
}

function requireCapabilities(capability, names, ownerName) {
  for (const name of names) {
    requireCapability(capability, name, ownerName);
  }

  return capability;
}

function requireCapability(capability, name, ownerName) {
  if (!capability || typeof capability[name] !== "function") {
    throw new Error(`${ownerName} requires ${name}().`);
  }

  return capability;
}

function buildLocalDocumentBufferCommands(sessionId) {
  return Object.freeze({
    list: async (request = {}) => EditorBackendDocumentBufferStoreModel.listDocuments({
      ...request.store,
      sessionId: request.store?.sessionId || sessionId,
    }),
    read: async (request = {}) => EditorBackendDocumentBufferStoreModel.getDocument({
      ...request.store,
      sessionId: request.store?.sessionId || sessionId,
    }, request),
    saveAll: async (request = {}) => EditorBackendDocumentBufferStoreModel.saveAll({
      ...request.store,
      sessionId: request.store?.sessionId || sessionId,
    }, request),
    saveDocument: async (request = {}) => EditorBackendDocumentBufferStoreModel.saveDocument({
      ...request.store,
      sessionId: request.store?.sessionId || sessionId,
    }, request),
    updateDraft: async (request = {}) => EditorBackendDocumentBufferStoreModel.updateDocument({
      ...request.store,
      sessionId: request.store?.sessionId || sessionId,
    }, request),
  });
}

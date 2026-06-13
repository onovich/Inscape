import { HostSchemaCapabilityModelMapper } from "../Models/HostSchemaCapabilityModelMapper.js";
import { EditorBackendClient } from "../../Backend/Clients/EditorBackendClient.js";

export class SelfHostedEditorHostSchemaBridge {
  constructor(options = {}) {
    this.backendClient = options.backendClient || new EditorBackendClient();
    this.cachedCatalog = null;
    this.cachedRequestKey = "";
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
    this.cachedCatalog = null;
    this.cachedRequestKey = "";
  }

  async getCapabilityCatalog(scriptText) {
    const workspace = this.workspaceContextProvider?.() || null;
    const requestKey = JSON.stringify({
      scriptText,
      workspace,
    });
    if (this.cachedCatalog && this.cachedRequestKey === requestKey) {
      return this.cachedCatalog;
    }

    try {
      const payload = await this.backendClient.hostCapabilities.schemaCapabilities({
        scriptText,
        workspace,
      });

      const catalog = HostSchemaCapabilityModelMapper.mapCatalog(payload);
      this.cachedCatalog = catalog;
      this.cachedRequestKey = requestKey;
      return catalog;
    } catch (error) {
      console.warn("SelfHostedEditor Host Schema fallback:", error);
      return HostSchemaCapabilityModelMapper.mapCatalog(null);
    }
  }
}

import { HostBindingCapabilityModelMapper } from "../Models/HostBindingCapabilityModelMapper.js";

export class SelfHostedEditorHostBindingBridge {
  constructor() {
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
      const response = await fetch("/api/host-binding-capabilities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scriptText,
          workspace,
        }),
      });

      if (!response.ok) {
        throw new Error(`Host Binding capabilities request failed with ${response.status}.`);
      }

      const payload = await response.json();
      const catalog = HostBindingCapabilityModelMapper.mapCatalog(payload);
      this.cachedCatalog = catalog;
      this.cachedRequestKey = requestKey;
      return catalog;
    } catch (error) {
      console.warn("SelfHostedEditor Host Binding fallback:", error);
      return HostBindingCapabilityModelMapper.mapCatalog(null);
    }
  }
}

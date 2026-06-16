import { HostBindingCapabilityModelMapper } from "../Models/HostBindingCapabilityModelMapper.js";
import { createEditorBackendServices } from "../../Backend/Clients/EditorBackendServiceRegistry.js";

export class SelfHostedEditorHostBindingBridge {
  constructor(options = {}) {
    const services = options.backendServices || null;
    this.hostCapabilityClient = options.hostCapabilityClient
      || services?.hostCapabilityClient
      || createEditorBackendServices(options).hostCapabilityClient;
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
      const payload = await this.hostCapabilityClient.bindingCapabilities({
        scriptText,
        workspace,
      });

      const catalog = HostBindingCapabilityModelMapper.mapCatalog(payload);
      this.cachedCatalog = catalog;
      this.cachedRequestKey = requestKey;
      return catalog;
    } catch (error) {
      console.warn("SelfHostedEditor Host Binding fallback:", error);
      return HostBindingCapabilityModelMapper.mapCatalog(null);
    }
  }

  async getDefinition(scriptText, target) {
    const capability = await this.findCapability(scriptText, target);
    if (!capability) {
      return null;
    }

    const location = this.getDefinitionLocation(capability);
    return location
      ? {
        name: capability.name,
        location,
      }
      : null;
  }

  async getReferences(scriptText, target) {
    const capability = await this.findCapability(scriptText, target);
    if (!capability) {
      return [];
    }

    return this.getReferenceLocations(capability).map((location) => ({
      location,
      target: capability.name,
    }));
  }

  async findCapability(scriptText, target) {
    if (!target || (target.kind !== "speaker" && target.kind !== "host-binding")) {
      return null;
    }

    const catalog = await this.getCapabilityCatalog(scriptText);
    if (target.kind === "speaker") {
      return catalog.speakers.find((speaker) => speaker.name === target.name) || null;
    }

    return catalog.bindings.find((binding) =>
      binding.kind === target.bindingKind && binding.name === target.name
    ) || null;
  }

  getDefinitionLocation(capability) {
    const locations = this.getCandidateLocations(capability);
    return locations.find((location) => location.sourceKind === "hostBridge")
      || locations.find((location) => location.sourceKind === "script")
      || locations[0]
      || null;
  }

  getReferenceLocations(capability) {
    return this.getCandidateLocations(capability);
  }

  getCandidateLocations(capability) {
    const locations = Array.isArray(capability.locations) && capability.locations.length > 0
      ? capability.locations
      : [capability];
    return locations
      .map((location) => this.mapLocation(location))
      .filter(Boolean);
  }

  mapLocation(location) {
    if (!location?.sourcePath) {
      return null;
    }

    return {
      character: Number(location.character || 0),
      length: Math.max(Number(location.length || 1), 1),
      line: Number(location.line || 0),
      sourcePath: location.sourcePath || "",
    };
  }
}

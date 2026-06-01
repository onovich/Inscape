export class HostBindingCapabilityModelMapper {
  static mapCatalog(payload) {
    const catalog = payload && payload.format === "inscape.host-binding.capabilities"
      ? payload
      : {};

    return {
      bindings: this.mapBindings(catalog.bindings),
      format: catalog.format || "",
      formatVersion: Number(catalog.formatVersion || 0),
      hostBridge: {
        errorMessage: catalog.hostBridge?.errorMessage || "",
        loaded: catalog.hostBridge?.loaded === true,
        resolvedPath: catalog.hostBridge?.resolvedPath || "",
      },
      speakers: this.mapSpeakers(catalog.speakers),
      workspace: catalog.workspace || "",
    };
  }

  static mapSpeakers(speakers) {
    if (!Array.isArray(speakers)) {
      return [];
    }

    return speakers
      .filter((speaker) => speaker && typeof speaker.name === "string")
      .map((speaker) => ({
        displayName: speaker.displayName || "",
        length: Number(speaker.length || 0),
        line: Number(speaker.line || 0),
        name: speaker.name.trim(),
        roleId: speaker.roleId || "",
        sourceKind: speaker.sourceKind || "",
        sourceLabel: speaker.sourceLabel || "",
        sourcePath: speaker.sourcePath || "",
      }))
      .filter((speaker) => speaker.name)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  static mapBindings(bindings) {
    if (!Array.isArray(bindings)) {
      return [];
    }

    return bindings
      .filter((binding) => binding && typeof binding.name === "string")
      .map((binding) => ({
        addressableKey: binding.addressableKey || "",
        assetId: binding.assetId || "",
        assetPath: binding.assetPath || "",
        kind: binding.kind || "",
        length: Number(binding.length || 0),
        line: Number(binding.line || 0),
        name: binding.name.trim(),
        sourceKind: binding.sourceKind || "",
        sourceLabel: binding.sourceLabel || "",
        sourcePath: binding.sourcePath || "",
        unityGuid: binding.unityGuid || "",
      }))
      .filter((binding) => binding.kind && binding.name)
      .sort((left, right) => `${left.kind}:${left.name}`.localeCompare(`${right.kind}:${right.name}`));
  }
}

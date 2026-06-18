export class HostBindingCapabilityModelMapper {
  static mapCatalog(payload) {
    const catalog = payload && payload.format === "inscape.host-binding.capabilities"
      ? payload
      : {};

    return {
      actions: this.mapActions(catalog.actions),
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

  static mapActions(actions) {
    if (!Array.isArray(actions)) {
      return [];
    }

    return actions
      .filter((action) => action && typeof action.name === "string")
      .map((action) => ({
        character: Number(action.character || 0),
        length: Number(action.length || 0),
        line: Number(action.line || 0),
        locations: this.mapLocations(action.locations),
        name: action.name.trim(),
        sourceKind: action.sourceKind || "",
        sourceLabel: action.sourceLabel || "",
        sourcePath: action.sourcePath || "",
      }))
      .filter((action) => action.name)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  static mapSpeakers(speakers) {
    if (!Array.isArray(speakers)) {
      return [];
    }

    return speakers
      .filter((speaker) => speaker && typeof speaker.name === "string")
      .map((speaker) => ({
        displayName: speaker.displayName || "",
        character: Number(speaker.character || 0),
        length: Number(speaker.length || 0),
        line: Number(speaker.line || 0),
        locations: this.mapLocations(speaker.locations),
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
        character: Number(binding.character || 0),
        length: Number(binding.length || 0),
        line: Number(binding.line || 0),
        locations: this.mapLocations(binding.locations),
        name: binding.name.trim(),
        sourceKind: binding.sourceKind || "",
        sourceLabel: binding.sourceLabel || "",
        sourcePath: binding.sourcePath || "",
        unityGuid: binding.unityGuid || "",
      }))
      .filter((binding) => binding.kind && binding.name)
      .sort((left, right) => `${left.kind}:${left.name}`.localeCompare(`${right.kind}:${right.name}`));
  }

  static mapLocations(locations) {
    if (!Array.isArray(locations)) {
      return [];
    }

    return locations
      .filter((location) => location && typeof location.sourcePath === "string")
      .map((location) => ({
        character: Number(location.character || 0),
        length: Number(location.length || 0),
        line: Number(location.line || 0),
        sourceKind: location.sourceKind || "",
        sourceLabel: location.sourceLabel || "",
        sourcePath: location.sourcePath || "",
        sourceRank: Number(location.sourceRank || 0),
      }))
      .filter((location) => location.sourcePath)
      .sort((left, right) => {
        if (left.sourceRank !== right.sourceRank) {
          return left.sourceRank - right.sourceRank;
        }

        const sourceCompare = left.sourcePath.localeCompare(right.sourcePath);
        if (sourceCompare !== 0) {
          return sourceCompare;
        }

        if (left.line !== right.line) {
          return left.line - right.line;
        }

        return left.character - right.character;
      });
  }
}

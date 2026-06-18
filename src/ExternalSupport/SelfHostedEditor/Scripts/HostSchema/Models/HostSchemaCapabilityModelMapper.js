export class HostSchemaCapabilityModelMapper {
  static mapCatalog(payload) {
    const catalog = payload && payload.format === "inscape.host-schema.capabilities"
      ? payload
      : {};

    return {
      actions: this.mapActions(catalog.actions),
      events: this.mapEvents(catalog.events),
      format: catalog.format || "",
      formatVersion: Number(catalog.formatVersion || 0),
      hostSchema: {
        errorMessage: catalog.hostSchema?.errorMessage || "",
        loaded: catalog.hostSchema?.loaded === true,
        resolvedPath: catalog.hostSchema?.resolvedPath || "",
      },
      queries: this.mapQueries(catalog.queries),
      workspace: catalog.workspace || "",
    };
  }

  static mapQueries(queries) {
    if (!Array.isArray(queries)) {
      return [];
    }

    return queries
      .filter((query) => query && typeof query.name === "string")
      .map((query) => ({
        character: Math.max(Number(query.column || 1) - 1, 0),
        description: query.description || "",
        isAsync: query.isAsync === true,
        isSimpleTextInterpolationQuery: query.isSimpleTextInterpolationQuery !== false,
        length: Math.max(Number(query.length || query.name.length || 1), 1),
        line: Math.max(Number(query.line || 1) - 1, 0),
        name: query.name.trim(),
        parameters: Array.isArray(query.parameters) ? query.parameters : [],
        returnType: query.returnType || "",
        sourcePath: query.sourcePath || "",
      }))
      .filter((query) => query.name)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  static mapActions(actions) {
    if (!Array.isArray(actions)) {
      return [];
    }

    return actions
      .filter((action) => action && typeof action.name === "string")
      .filter((action) => action.isNamedHostAction !== false)
      .map((action) => ({
        character: Math.max(Number(action.column || 1) - 1, 0),
        description: action.description || "",
        idKind: action.idKind || "",
        isLegacy: false,
        length: Math.max(Number(action.length || action.name.length || 1), 1),
        line: Math.max(Number(action.line || 1) - 1, 0),
        mode: action.mode || "fire",
        name: action.name.trim(),
        parameters: Array.isArray(action.parameters) ? action.parameters : [],
        sourcePath: action.sourcePath || "",
      }))
      .filter((action) => action.name)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  static mapEvents(events) {
    if (!Array.isArray(events)) {
      return [];
    }

    return events
      .filter((event) => event && typeof event.name === "string")
      .filter((event) => event.isNamedHostEvent !== false)
      .map((event) => ({
        character: Math.max(Number(event.column || 1) - 1, 0),
        delivery: event.delivery || "fire-and-forget",
        description: event.description || "",
        isLegacy: event.isLegacy !== false,
        length: Math.max(Number(event.length || event.name.length || 1), 1),
        line: Math.max(Number(event.line || 1) - 1, 0),
        name: event.name.trim(),
        parameters: Array.isArray(event.parameters) ? event.parameters : [],
        sideEffects: event.sideEffects !== false,
        sourcePath: event.sourcePath || "",
      }))
      .filter((event) => event.name)
      .sort((left, right) => left.name.localeCompare(right.name));
  }
}

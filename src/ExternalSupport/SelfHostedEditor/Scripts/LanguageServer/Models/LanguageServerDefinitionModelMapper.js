export class LanguageServerDefinitionModelMapper {
  static mapDefinition(payload) {
    if (!payload?.definition?.location) {
      return null;
    }

    return {
      name: payload.definition.name || "",
      location: {
        character: Number.isInteger(payload.definition.location.character)
          ? payload.definition.location.character
          : 0,
        length: Number.isInteger(payload.definition.location.length)
          ? payload.definition.location.length
          : 1,
        line: Number.isInteger(payload.definition.location.line)
          ? payload.definition.location.line
          : 0,
        sourcePath: payload.definition.location.sourcePath || "",
      },
    };
  }
}

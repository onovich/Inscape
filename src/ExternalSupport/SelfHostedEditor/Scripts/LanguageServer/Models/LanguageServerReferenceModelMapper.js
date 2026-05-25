export class LanguageServerReferenceModelMapper {
  static mapReferences(payload) {
    const references = Array.isArray(payload?.references)
      ? payload.references
      : [];

    return references
      .filter((reference) => reference?.location)
      .map((reference) => ({
        target: reference.target || "",
        location: {
          character: Number.isInteger(reference.location.character)
            ? reference.location.character
            : 0,
          length: Number.isInteger(reference.location.length)
            ? reference.location.length
            : 1,
          line: Number.isInteger(reference.location.line)
            ? reference.location.line
            : 0,
          sourcePath: reference.location.sourcePath || "",
        },
      }));
  }
}

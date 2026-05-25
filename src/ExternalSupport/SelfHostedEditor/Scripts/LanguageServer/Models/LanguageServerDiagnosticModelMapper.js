export class LanguageServerDiagnosticModelMapper {
  static mapDiagnostics(payload) {
    const diagnostics = Array.isArray(payload?.diagnostics)
      ? payload.diagnostics
      : [];

    return diagnostics.map((diagnostic) => ({
      code: diagnostic.code || "",
      message: diagnostic.message || "Unknown diagnostic.",
      severity: this.mapSeverity(diagnostic.severity),
      startColumn: Number.isInteger(diagnostic.location?.character)
        ? diagnostic.location.character + 1
        : 1,
      endColumn: this.mapEndColumn(diagnostic.location),
      sourceLine: Number.isInteger(diagnostic.location?.line)
        ? diagnostic.location.line + 1
        : 1,
      sourcePath: diagnostic.location?.sourcePath || "",
    }));
  }

  static mapEndColumn(location) {
    const startColumn = Number.isInteger(location?.character)
      ? location.character + 1
      : 1;
    const length = Number.isInteger(location?.length)
      ? Math.max(location.length, 1)
      : 1;

    return startColumn + length;
  }

  static mapSeverity(severity) {
    const normalized = String(severity || "").toLowerCase();
    if (normalized === "warning") {
      return "warning";
    }

    if (normalized === "info") {
      return "info";
    }

    return "error";
  }
}

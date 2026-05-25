export class LanguageServerDocumentSymbolModelMapper {
  static mapSymbols(payload) {
    const symbols = Array.isArray(payload?.symbols)
      ? payload.symbols
      : [];

    return symbols
      .filter((symbol) => symbol?.location)
      .map((symbol) => ({
        kind: symbol.kind || "",
        name: symbol.name || "",
        sourceLine: Number.isInteger(symbol.location.line)
          ? symbol.location.line + 1
          : 1,
        sourcePath: symbol.location.sourcePath || "",
      }));
  }
}

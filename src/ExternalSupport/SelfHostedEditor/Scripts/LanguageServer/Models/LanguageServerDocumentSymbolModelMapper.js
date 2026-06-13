export class LanguageServerDocumentSymbolModelMapper {
  static mapSymbols(payload) {
    if (!payload || !Array.isArray(payload.symbols)) {
      throw new Error("LanguageServer document symbols contract violation: symbols must be an array.");
    }

    return payload.symbols
      .map((symbol, index) => {
        this.assertSymbolContract(symbol, index);
        return {
          kind: symbol.kind || "",
          name: symbol.name || "",
          sourceLine: symbol.location.line + 1,
          sourcePath: symbol.location.sourcePath || "",
        };
      });
  }

  static assertSymbolContract(symbol, index) {
    if (!symbol || typeof symbol !== "object") {
      throw new Error(`LanguageServer document symbols contract violation: symbol ${index} must be an object.`);
    }

    if (!symbol.location || typeof symbol.location !== "object") {
      throw new Error(`LanguageServer document symbols contract violation: symbol ${index} is missing location.`);
    }

    if (!Number.isInteger(symbol.location.line) || symbol.location.line < 0) {
      throw new Error(`LanguageServer document symbols contract violation: symbol ${index} location.line must be a zero-based integer.`);
    }
  }
}

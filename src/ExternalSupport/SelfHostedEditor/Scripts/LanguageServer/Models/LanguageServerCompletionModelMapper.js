export class LanguageServerCompletionModelMapper {
  static mapCompletions(payload) {
    const completions = Array.isArray(payload?.completions)
      ? payload.completions
      : [];

    return completions.map((completion) => ({
      kind: completion.kind || "",
      label: completion.label || "",
    }));
  }
}

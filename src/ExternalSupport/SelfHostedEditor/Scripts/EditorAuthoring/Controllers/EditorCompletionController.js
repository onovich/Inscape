import { EditorCompletionTargetModelBuilder } from "../Models/EditorCompletionTargetModelBuilder.js";

export class EditorCompletionController {
  constructor(monaco, completionBridge) {
    this.monaco = monaco;
    this.completionBridge = completionBridge;

    this.completionProviderDisposable = this.monaco.languages.registerCompletionItemProvider("inscape", {
      triggerCharacters: [">"],
      provideCompletionItems: async (model, position) => {
        const completionTarget = EditorCompletionTargetModelBuilder.build(model, position);
        if (!completionTarget) {
          return {
            suggestions: [],
          };
        }

        const completions = await this.completionBridge.getCompletions(model.getValue());
        const normalizedPrefix = completionTarget.typedPrefix.toLowerCase();
        const suggestions = completions
          .filter((completion) => completion.label)
          .filter((completion) => (
            !normalizedPrefix ||
            completion.label.toLowerCase().startsWith(normalizedPrefix)
          ))
          .map((completion) => ({
            detail: "Inscape node",
            insertText: completion.label,
            kind: this.monaco.languages.CompletionItemKind.Reference,
            label: completion.label,
            range: new this.monaco.Range(
              position.lineNumber,
              completionTarget.wordRange.startColumn,
              position.lineNumber,
              completionTarget.wordRange.endColumn
            ),
          }));

        return {
          suggestions,
        };
      },
    });
  }

  dispose() {
    this.completionProviderDisposable?.dispose();
  }
}

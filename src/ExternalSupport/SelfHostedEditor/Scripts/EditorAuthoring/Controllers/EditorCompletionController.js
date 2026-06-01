import { EditorCompletionTargetModelBuilder } from "../Models/EditorCompletionTargetModelBuilder.js";

export class EditorCompletionController {
  constructor(monaco, completionBridge, hostSchemaBridge = null, hostBindingBridge = null) {
    this.monaco = monaco;
    this.completionBridge = completionBridge;
    this.hostSchemaBridge = hostSchemaBridge;
    this.hostBindingBridge = hostBindingBridge;

    this.completionProviderDisposable = this.monaco.languages.registerCompletionItemProvider("inscape", {
      triggerCharacters: [">", "[", ".", " ", ":", "："],
      provideCompletionItems: async (model, position) => {
        const completionTarget = EditorCompletionTargetModelBuilder.build(model, position);
        if (!completionTarget) {
          return {
            suggestions: [],
          };
        }

        if (completionTarget.kind === "query" || completionTarget.kind === "host-event") {
          return {
            suggestions: await this.createHostSchemaSuggestions(model, position, completionTarget),
          };
        }

        if (completionTarget.kind === "speaker" || completionTarget.kind === "host-binding") {
          return {
            suggestions: await this.createHostBindingSuggestions(model, position, completionTarget),
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

  async createHostSchemaSuggestions(model, position, completionTarget) {
    if (!this.hostSchemaBridge) {
      return [];
    }

    const catalog = await this.hostSchemaBridge.getCapabilityCatalog(model.getValue());
    const candidates = completionTarget.kind === "query"
      ? catalog.queries
      : catalog.events;
    const normalizedPrefix = completionTarget.typedPrefix.toLowerCase();
    return candidates
      .filter((candidate) => candidate.name)
      .filter((candidate) => !normalizedPrefix || candidate.name.toLowerCase().startsWith(normalizedPrefix))
      .map((candidate) => ({
        detail: this.createHostSchemaDetail(completionTarget.kind, candidate),
        documentation: {
          value: this.createHostSchemaMarkdown(completionTarget.kind, candidate),
        },
        insertText: candidate.name,
        kind: completionTarget.kind === "query"
          ? this.monaco.languages.CompletionItemKind.Value
          : this.monaco.languages.CompletionItemKind.Event,
        label: candidate.name,
        range: new this.monaco.Range(
          position.lineNumber,
          completionTarget.wordRange.startColumn,
          position.lineNumber,
          completionTarget.wordRange.endColumn
        ),
      }));
  }

  createHostSchemaDetail(kind, candidate) {
    if (kind === "query") {
      return [
        candidate.returnType || "value",
        candidate.isAsync ? "async query" : "query",
        "Host Schema",
      ].join(" - ");
    }

    return [
      "host event",
      candidate.delivery || "fire-and-forget",
      "Host Schema",
    ].join(" - ");
  }

  createHostSchemaMarkdown(kind, candidate) {
    if (kind === "query") {
      return [
        `**Inscape query interpolation** \`${candidate.name}\``,
        "",
        "`[]` reads a value for text interpolation. Host Schema provides this authoring hint; Compiler behavior is unchanged.",
        "",
        `- **Return type:** ${candidate.returnType || "unspecified"}`,
        `- **Async:** ${candidate.isAsync ? "yes" : "no"}`,
        candidate.description ? `- **Description:** ${candidate.description}` : "",
      ].filter(Boolean).join("\n");
    }

    return [
      `**Inscape host event** \`${candidate.name}\``,
      "",
      "`@emit` records a host event intent. Host Schema provides this authoring hint; Compiler behavior is unchanged.",
      "",
      `- **Delivery:** ${candidate.delivery || "fire-and-forget"}`,
      `- **Side effects:** ${candidate.sideEffects === false ? "no" : "yes"}`,
      candidate.description ? `- **Description:** ${candidate.description}` : "",
    ].filter(Boolean).join("\n");
  }

  async createHostBindingSuggestions(model, position, completionTarget) {
    if (!this.hostBindingBridge) {
      return [];
    }

    const catalog = await this.hostBindingBridge.getCapabilityCatalog(model.getValue());
    const candidates = completionTarget.kind === "speaker"
      ? catalog.speakers
      : catalog.bindings.filter((binding) => binding.kind === completionTarget.bindingKind);
    const normalizedPrefix = completionTarget.typedPrefix.toLowerCase();
    return candidates
      .filter((candidate) => candidate.name)
      .filter((candidate) => !normalizedPrefix || candidate.name.toLowerCase().startsWith(normalizedPrefix))
      .map((candidate) => ({
        detail: completionTarget.kind === "speaker"
          ? this.createSpeakerDetail(candidate)
          : this.createHostBindingDetail(candidate),
        documentation: {
          value: completionTarget.kind === "speaker"
            ? this.createSpeakerMarkdown(candidate)
            : this.createHostBindingMarkdown(candidate),
        },
        insertText: completionTarget.kind === "speaker" ? `${candidate.name}：` : candidate.name,
        kind: completionTarget.kind === "speaker"
          ? this.monaco.languages.CompletionItemKind.Class
          : this.monaco.languages.CompletionItemKind.Reference,
        label: candidate.name,
        range: new this.monaco.Range(
          position.lineNumber,
          completionTarget.wordRange.startColumn,
          position.lineNumber,
          completionTarget.wordRange.endColumn
        ),
      }));
  }

  createSpeakerDetail(candidate) {
    return candidate.roleId
      ? `Host roleId ${candidate.roleId} - ${candidate.sourceLabel || "Host Binding"}`
      : `${candidate.sourceLabel || "Workspace speaker"} (unbound)`;
  }

  createHostBindingDetail(candidate) {
    return [
      candidate.kind,
      candidate.assetId ? `Host asset ${candidate.assetId}` : "",
      candidate.addressableKey,
      candidate.sourceLabel || "Host Binding",
    ].filter(Boolean).join(" - ");
  }

  createSpeakerMarkdown(candidate) {
    return [
      `**Inscape speaker** \`${candidate.name}\``,
      "",
      "Speaker hints come from Host Bridge rows and compiled workspace dialogue. Compiler behavior is unchanged.",
      "",
      candidate.roleId ? `- **Host roleId:** ${candidate.roleId}` : "- **Host roleId:** unbound",
      candidate.displayName ? `- **Display name:** ${candidate.displayName}` : "",
      candidate.sourcePath ? `- **Source:** ${candidate.sourcePath}` : "",
    ].filter(Boolean).join("\n");
  }

  createHostBindingMarkdown(candidate) {
    return [
      `**Inscape Host Binding** \`${candidate.kind}:${candidate.name}\``,
      "",
      "`@timeline` references a timed host resource hook. Host Binding provides this authoring hint; Compiler behavior is unchanged.",
      "",
      candidate.assetId ? `- **Host asset id:** ${candidate.assetId}` : "",
      candidate.addressableKey ? `- **Addressable:** ${candidate.addressableKey}` : "",
      candidate.assetPath ? `- **Asset:** ${candidate.assetPath}` : "",
      candidate.unityGuid ? `- **Unity guid:** ${candidate.unityGuid}` : "",
      candidate.sourcePath ? `- **Source:** ${candidate.sourcePath}` : "",
    ].filter(Boolean).join("\n");
  }

  dispose() {
    this.completionProviderDisposable?.dispose();
  }
}

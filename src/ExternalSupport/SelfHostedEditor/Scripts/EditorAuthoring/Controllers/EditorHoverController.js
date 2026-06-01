import { EditorHoverTargetModelBuilder } from "../Models/EditorHoverTargetModelBuilder.js";

export class EditorHoverController {
  constructor(monaco, editor, hoverBridge, hostSchemaBridge = null) {
    this.monaco = monaco;
    this.editor = editor;
    this.hoverBridge = hoverBridge;
    this.hostSchemaBridge = hostSchemaBridge;

    this.monaco.languages.register({
      id: "inscape",
    });

    this.hoverProviderDisposable = this.monaco.languages.registerHoverProvider("inscape", {
      provideHover: async (model, position) => {
        const hoverTarget = EditorHoverTargetModelBuilder.build(model, position);
        if (!hoverTarget) {
          return null;
        }

        if (hoverTarget.kind === "query" || hoverTarget.kind === "host-event") {
          const contents = await this.createHostSchemaHover(model, hoverTarget);
          if (!contents) {
            return null;
          }

          return {
            range: new this.monaco.Range(
              position.lineNumber,
              hoverTarget.startColumn,
              position.lineNumber,
              hoverTarget.endColumn
            ),
            contents: [
              {
                value: contents,
              },
            ],
          };
        }

        const hover = await this.hoverBridge.getHover(model.getValue(), hoverTarget);
        if (!hover?.markdown) {
          return null;
        }

        return {
          range: new this.monaco.Range(
            position.lineNumber,
            hoverTarget.startColumn,
            position.lineNumber,
            hoverTarget.endColumn
          ),
          contents: [
            {
              value: hover.markdown,
            },
          ],
        };
      },
    });
  }

  async createHostSchemaHover(model, hoverTarget) {
    if (!this.hostSchemaBridge) {
      return null;
    }

    const catalog = await this.hostSchemaBridge.getCapabilityCatalog(model.getValue());
    const candidates = hoverTarget.kind === "query"
      ? catalog.queries
      : catalog.events;
    const candidate = candidates.find((item) => item.name === hoverTarget.name);
    if (!candidate) {
      return hoverTarget.kind === "query"
        ? [
          `**Unknown Inscape query interpolation** \`${hoverTarget.name}\``,
          "",
          "No zero-parameter simple query with this name was found in the configured Host Schema. This is an authoring hint, not a Compiler error.",
        ].join("\n")
        : [
          `**Unknown Inscape host event** \`${hoverTarget.name}\``,
          "",
          "No event with this name was found in the configured Host Schema. This is an authoring hint, not a Compiler error.",
        ].join("\n");
    }

    if (hoverTarget.kind === "query") {
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

  dispose() {
    this.hoverProviderDisposable?.dispose();
  }
}

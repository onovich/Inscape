import { EditorHoverTargetModelBuilder } from "../Models/EditorHoverTargetModelBuilder.js";

export class EditorHoverController {
  constructor(monaco, editor, hoverBridge) {
    this.monaco = monaco;
    this.editor = editor;
    this.hoverBridge = hoverBridge;

    this.monaco.languages.register({
      id: "inscape",
    });

    this.hoverProviderDisposable = this.monaco.languages.registerHoverProvider("inscape", {
      provideHover: async (model, position) => {
        const hoverTarget = EditorHoverTargetModelBuilder.build(model, position);
        if (!hoverTarget) {
          return null;
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

  dispose() {
    this.hoverProviderDisposable?.dispose();
  }
}

import { EditorHoverTargetModelBuilder } from "../Models/EditorHoverTargetModelBuilder.js";

export class EditorDefinitionController {
  constructor(monaco, editor, definitionBridge, referencesBridge, openReferenceOverlay, revealDefinitionLocation = null) {
    this.monaco = monaco;
    this.editor = editor;
    this.definitionBridge = definitionBridge;
    this.referencesBridge = referencesBridge;
    this.openReferenceOverlay = openReferenceOverlay;
    this.revealDefinitionLocation = revealDefinitionLocation;

    this.definitionProviderDisposable = this.monaco.languages.registerDefinitionProvider("inscape", {
      provideDefinition: async (model, position) => {
        const hoverTarget = EditorHoverTargetModelBuilder.build(model, position);
        if (!hoverTarget) {
          return null;
        }

        const definition = await this.definitionBridge.getDefinition(model.getValue(), hoverTarget);
        if (!definition?.location) {
          return null;
        }

        return {
          range: new this.monaco.Range(
            definition.location.line + 1,
            definition.location.character + 1,
            definition.location.line + 1,
            definition.location.character + definition.location.length + 1
          ),
          uri: model.uri,
        };
      },
    });

    this.referenceProviderDisposable = this.monaco.languages.registerReferenceProvider("inscape", {
      provideReferences: async (model, position) => {
        const hoverTarget = EditorHoverTargetModelBuilder.build(model, position);
        if (!hoverTarget) {
          return [];
        }

        const references = await this.referencesBridge.getReferences(model.getValue(), hoverTarget);
        return references.map((reference) => ({
          range: new this.monaco.Range(
            reference.location.line + 1,
            reference.location.character + 1,
            reference.location.line + 1,
            reference.location.character + reference.location.length + 1
          ),
          uri: model.uri,
        }));
      },
    });

    this.referenceOverlayActionDisposable = this.editor.addAction({
      id: "inscape.show-reference-overlay",
      label: "Show References",
      keybindings: [this.monaco.KeyMod.Shift | this.monaco.KeyCode.F12],
      run: async (editorInstance) => {
        const model = editorInstance.getModel();
        const position = editorInstance.getPosition();
        if (!model || !position || !this.openReferenceOverlay) {
          return null;
        }

        const hoverTarget = EditorHoverTargetModelBuilder.build(model, position);
        if (!hoverTarget) {
          return null;
        }

        await this.openReferenceOverlay(hoverTarget);
        return null;
      },
    });

    this.definitionClickDisposable = this.editor.onMouseDown((event) => {
      void this.handleDefinitionClick(event);
    });
  }

  async handleDefinitionClick(event) {
    if (!this.revealDefinitionLocation || event.event?.leftButton !== true) {
      return;
    }

    if (!event.event.ctrlKey && !event.event.metaKey) {
      return;
    }

    event.event.preventDefault();
    event.event.stopPropagation();

    const model = this.editor.getModel();
    const position = event.target?.position;
    if (!model || !position) {
      return;
    }

    const hoverTarget = EditorHoverTargetModelBuilder.build(model, position);
    if (!hoverTarget) {
      return;
    }

    const definition = await this.definitionBridge.getDefinition(model.getValue(), hoverTarget);
    if (!definition?.location) {
      return;
    }

    this.revealDefinitionLocation({
      column: definition.location.character + 1,
      lineNumber: definition.location.line + 1,
      sourcePath: definition.location.sourcePath || "",
    });
  }

  dispose() {
    this.definitionProviderDisposable?.dispose();
    this.referenceProviderDisposable?.dispose();
    this.referenceOverlayActionDisposable?.dispose();
    this.definitionClickDisposable?.dispose();
  }
}

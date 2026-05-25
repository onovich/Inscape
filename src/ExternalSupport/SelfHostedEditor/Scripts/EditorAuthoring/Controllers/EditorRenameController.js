import { EditorHoverTargetModelBuilder } from "../Models/EditorHoverTargetModelBuilder.js";
import { ScriptNodeRenamePatchBuilder } from "../../ProjectWorkspace/Models/ScriptNodeRenamePatchBuilder.js";

export class EditorRenameController {
  constructor(monaco) {
    this.monaco = monaco;

    this.renameProviderDisposable = this.monaco.languages.registerRenameProvider("inscape", {
      resolveRenameLocation: (model, position) => {
        const renameTarget = EditorHoverTargetModelBuilder.build(model, position);
        if (!renameTarget) {
          return {
            rejectReason: "Rename is only available for node titles and jump targets.",
          };
        }

        return {
          range: new this.monaco.Range(
            position.lineNumber,
            renameTarget.startColumn,
            position.lineNumber,
            renameTarget.endColumn
          ),
          text: renameTarget.name,
        };
      },
      provideRenameEdits: (model, position, newName) => {
        const renameTarget = EditorHoverTargetModelBuilder.build(model, position);
        if (!renameTarget) {
          return {
            rejectReason: "Rename is only available for node titles and jump targets.",
          };
        }

        const patch = ScriptNodeRenamePatchBuilder.build(model.getValue(), renameTarget.name, newName);
        if (patch.text === model.getValue()) {
          return {
            rejectReason: "Rename did not change any node title or jump target.",
          };
        }

        return {
          edits: [
            {
              resource: model.uri,
              textEdit: {
                range: model.getFullModelRange(),
                text: patch.text,
              },
              versionId: model.getVersionId(),
            },
          ],
        };
      },
    });
  }

  dispose() {
    this.renameProviderDisposable?.dispose();
  }
}

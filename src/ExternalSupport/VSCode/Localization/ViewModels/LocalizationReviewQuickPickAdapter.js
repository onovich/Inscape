"use strict";

class LocalizationReviewQuickPickAdapter {

    createQuickPickItem(model) {
        return {
            label: this.createQuickPickLabel(model),
            description: model.summary,
            detail: model.detail,
            item: model.item,
            location: {
                sourcePath: String(model.sourcePath || ""),
                line: Math.max(0, Number(model.line || 1) - 1),
                character: Math.max(0, Number(model.column || 1) - 1),
                length: Number(model.length || 0)
            }
        };
    }

    createQuickPickItems(models) {
        const result = [];
        for (let i = 0; i < models.length; i += 1) {
            result.push(this.createQuickPickItem(models[i]));
        }
        return result;
    }

    createQuickPickLabel(model) {
        if (model.title) {
            return model.title;
        }

        if (model.actionKey == "open-current") {
            return "Jump to current line";
        }

        if (model.actionKey == "open-candidate") {
            return "Candidate " + String((model.actionIndex ?? 0) + 1) + ": " + String(model.actionStatus || "candidate");
        }

        return "Review item";
    }

}

module.exports = {
    LocalizationReviewQuickPickAdapter
};

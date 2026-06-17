"use strict";

class LocalizationReviewQuickPickAdapter {

    createQuickPickItem(model) {
        const signalSummary = this.createSignalSummary(model);
        const item = {
            label: this.createQuickPickLabel(model),
            description: signalSummary || model.summary,
            detail: signalSummary && model.detail ? signalSummary + " | " + model.detail : model.detail,
            item: model.item,
            model
        };

        if (model.sourcePath) {
            item.location = {
                sourcePath: String(model.sourcePath || ""),
                line: Math.max(0, Number(model.line || 1) - 1),
                character: Math.max(0, Number(model.column || 1) - 1),
                length: Number(model.length || 0)
            };
        }

        return item;
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

        if (model.actionKey == "show-candidate-diff") {
            return "Compare candidate " + String((model.actionIndex ?? 0) + 1);
        }

        return "Review item";
    }

    createSignalSummary(model) {
        const signals = Array.isArray(model.signals) ? model.signals : [];
        return signals
            .filter((signal) => signal && signal.key && signal.value)
            .map((signal) => String(signal.key) + ": " + String(signal.value))
            .join(" | ");
    }

}

module.exports = {
    LocalizationReviewQuickPickAdapter
};

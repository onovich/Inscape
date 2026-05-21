"use strict";

class LocalizationReviewController {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.fs = dependencies.fs;
        this.localizationReviewQuickPickAdapter = dependencies.localizationReviewQuickPickAdapter;
        this.openLocation = dependencies.openLocation;
        this.locationFromPayload = dependencies.locationFromPayload;
        this.formatDisplayPath = dependencies.formatDisplayPath;
    }

    async reviewAlignmentReport(reportPath) {
        const text = await this.fs.promises.readFile(reportPath, "utf8");
        const report = JSON.parse(text);
        const presenter = this.buildPresenter(report);
        if (!Array.isArray(presenter.Items) || presenter.Items.length === 0) {
            this.vscode.window.showInformationMessage("Localization alignment report has no items to review.");
            return;
        }

        const picks = this.localizationReviewQuickPickAdapter.createQuickPickItems(presenter.Items);
        const selected = await this.vscode.window.showQuickPick(picks, {
            placeHolder: "Select a localization alignment item to jump to source"
        });
        if (!selected || !selected.location) {
            return;
        }

        if (selected.item && Array.isArray(selected.item.candidates) && selected.item.candidates.length > 0) {
            const itemModel = selected.model;
            const actions = this.localizationReviewQuickPickAdapter.createQuickPickItems(itemModel.Actions);
            const reviewAction = await this.vscode.window.showQuickPick(actions, {
                placeHolder: "Review the current text or jump to a candidate source"
            });
            if (!reviewAction) {
                return;
            }

            if (reviewAction.model && reviewAction.model.actionKey === "show-candidate-diff") {
                await this.vscode.window.showInformationMessage(String(reviewAction.model.detail || reviewAction.model.summary || "No candidate diff available."));
                return;
            }

            if (reviewAction.location) {
                await this.openLocation(this.locationFromPayload(reviewAction.location));
                return;
            }
        }

        await this.openLocation(this.locationFromPayload(selected.location));
    }

    buildPresenter(report) {
        const presenter = report && report.presenter;
        if (presenter && Array.isArray(presenter.items)) {
            return {
                Items: presenter.items
            };
        }

        return {
            Items: []
        };
    }
}

module.exports = {
    LocalizationReviewController
};

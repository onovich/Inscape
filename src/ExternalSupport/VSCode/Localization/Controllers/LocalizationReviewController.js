"use strict";

class LocalizationReviewController {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.fs = dependencies.fs;
        this.localizationReviewPresenterModelBuilder = dependencies.localizationReviewPresenterModelBuilder;
        this.localizationReviewQuickPickAdapter = dependencies.localizationReviewQuickPickAdapter;
        this.openLocation = dependencies.openLocation;
        this.locationFromPayload = dependencies.locationFromPayload;
    }

    async reviewAlignmentReport(reportPath) {
        const text = await this.fs.promises.readFile(reportPath, "utf8");
        const report = JSON.parse(text);
        const items = Array.isArray(report && report.items) ? report.items : [];
        if (items.length === 0) {
            this.vscode.window.showInformationMessage("Localization alignment report has no items to review.");
            return;
        }

        const models = this.localizationReviewPresenterModelBuilder.build({ items }).Items;
        const picks = this.localizationReviewQuickPickAdapter.createQuickPickItems(models);
        const selected = await this.vscode.window.showQuickPick(picks, {
            placeHolder: "Select a localization alignment item to jump to source"
        });
        if (!selected || !selected.location) {
            return;
        }

        if (selected.item && Array.isArray(selected.item.candidates) && selected.item.candidates.length > 0) {
            const itemModel = this.localizationReviewPresenterModelBuilder.buildItem(selected.item);
            const actions = this.localizationReviewQuickPickAdapter.createQuickPickItems(itemModel.Actions);
            const reviewAction = await this.vscode.window.showQuickPick(actions, {
                placeHolder: "Review the current text or jump to a candidate source"
            });
            if (!reviewAction) {
                return;
            }

            if (reviewAction.location) {
                await this.openLocation(this.locationFromPayload(reviewAction.location));
                return;
            }
        }

        await this.openLocation(this.locationFromPayload(selected.location));
    }
}

module.exports = {
    LocalizationReviewController
};

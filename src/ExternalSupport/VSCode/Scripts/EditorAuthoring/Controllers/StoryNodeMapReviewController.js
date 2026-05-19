"use strict";

class StoryNodeMapReviewController {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.fs = dependencies.fs;
        this.path = dependencies.path;
        this.openLocation = dependencies.openLocation;
        this.locationFromPayload = dependencies.locationFromPayload;
        this.openFile = dependencies.openFile;
    }

    async reviewNodeMapReport(report, nodeMapPath, reportPath) {
        const items = report && Array.isArray(report.items) ? report.items : [];
        if (items.length === 0) {
            this.vscode.window.showInformationMessage("Stable node map review report has no items.");
            return;
        }

        const picks = items.map((item) => this.createNodeMapReviewPick(item));
        const selected = await this.vscode.window.showQuickPick(picks, {
            placeHolder: "Select a stable node map review item"
        });
        if (!selected || !selected.item) {
            return;
        }

        const action = await this.vscode.window.showQuickPick(this.createNodeMapReviewActions(selected.item, nodeMapPath, reportPath), {
            placeHolder: "Jump to current title, a candidate title, or open supporting files"
        });
        if (!action) {
            return;
        }

        if (action.location) {
            await this.openLocation(this.locationFromPayload(action.location));
            return;
        }

        if (action.filePath) {
            await this.openFile(action.filePath);
        }
    }

    createNodeMapReviewPick(item) {
        const sourceSummary = this.formatReviewSource(item.sourcePath, item.sourceLine);
        const previousTitle = item.previousTitle
            ? "previous: " + item.previousTitle
            : "previous: (none)";
        const candidateSummary = Array.isArray(item.candidates) && item.candidates.length > 0
            ? item.candidates.slice(0, 2).map((candidate) => this.formatNodeMapCandidate(candidate)).join(" | ")
            : "candidates: none";
        return {
            label: "[" + String(item.kind || "unknown") + "] " + String(item.title || "(untitled)"),
            description: String(item.message || ""),
            detail: sourceSummary + " | " + previousTitle + " | " + candidateSummary,
            item
        };
    }

    createNodeMapReviewActions(item, nodeMapPath, reportPath) {
        const actions = [
            {
                label: "Jump to current title",
                description: this.formatReviewSource(item.sourcePath, item.sourceLine),
                detail: item.message || "",
                location: {
                    sourcePath: String(item.sourcePath || ""),
                    line: Math.max(0, Number(item.sourceLine || 1) - 1),
                    character: 0,
                    length: String(item.title || "").length
                }
            }
        ];

        if (nodeMapPath && this.fs.existsSync(nodeMapPath)) {
            actions.push({
                label: "Open node map",
                description: this.path.basename(nodeMapPath),
                filePath: nodeMapPath
            });
        }

        if (reportPath && this.fs.existsSync(reportPath)) {
            actions.push({
                label: "Open raw report",
                description: this.path.basename(reportPath),
                filePath: reportPath
            });
        }

        if (Array.isArray(item.candidates)) {
            for (let i = 0; i < item.candidates.length; i += 1) {
                const candidate = item.candidates[i];
                actions.push({
                    label: "Candidate " + String(i + 1) + ": " + String(candidate.title || "(untitled)"),
                    description: "score " + String(candidate.score || 0),
                    detail: this.formatReviewSource(candidate.sourcePath, candidate.sourceLine) + " | stable id " + String(candidate.stableId || ""),
                    location: {
                        sourcePath: String(candidate.sourcePath || ""),
                        line: Math.max(0, Number(candidate.sourceLine || 1) - 1),
                        character: 0,
                        length: String(candidate.title || "").length
                    }
                });
            }
        }

        return actions;
    }

    formatNodeMapCandidate(candidate) {
        return String(candidate.title || "") + " @score " + String(candidate.score || 0);
    }

    formatReviewSource(sourcePath, line) {
        return this.path.basename(String(sourcePath || "")) + ":" + String(line || 1);
    }

}

module.exports = {
    StoryNodeMapReviewController
};

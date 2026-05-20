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

        if (typeof action.applyCandidateIndex === "number" && nodeMapPath) {
            await this.applyCandidateStableId(nodeMapPath, selected.item, selected.item.candidates[action.applyCandidateIndex]);
            return;
        }

        if (action.revertNodeMap && nodeMapPath) {
            await this.revertLastAppliedStableId(nodeMapPath);
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

            if (this.fs.existsSync(this.reviewBackupPath(nodeMapPath))) {
                actions.push({
                    label: "Revert last applied stable id",
                    description: this.path.basename(this.reviewBackupPath(nodeMapPath)),
                    detail: "Restore the node map snapshot saved before the last apply action.",
                    revertNodeMap: true
                });
            }
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

                if (item.kind === "manual-review" && nodeMapPath && this.fs.existsSync(nodeMapPath)) {
                    actions.push({
                        label: "Apply candidate " + String(i + 1) + " stable id",
                        description: String(candidate.stableId || ""),
                        detail: "Reuse the candidate stable id and remove its missing/manual-review duplicate from the node map.",
                        applyCandidateIndex: i
                    });
                }
            }
        }

        return actions;
    }

    async applyCandidateStableId(nodeMapPath, item, candidate) {
        const text = await this.fs.promises.readFile(nodeMapPath, "utf8");
        await this.fs.promises.writeFile(this.reviewBackupPath(nodeMapPath), text, "utf8");
        const nodeMap = JSON.parse(text);
        const nodes = Array.isArray(nodeMap && nodeMap.nodes) ? nodeMap.nodes : [];
        const currentIndex = nodes.findIndex((node) => node && node.id === item.stableId && node.title === item.title);
        const candidateIndex = nodes.findIndex((node) => node && node.id === candidate.stableId);

        if (currentIndex < 0 || candidateIndex < 0) {
            throw new Error("Could not find the selected stable node map entries to apply candidate review.");
        }

        const currentNode = nodes[currentIndex];
        const candidateNode = nodes[candidateIndex];
        const previousTitles = Array.isArray(candidateNode.previousTitles) ? candidateNode.previousTitles.slice() : [];
        if (candidateNode.title && candidateNode.title !== currentNode.title && !previousTitles.includes(candidateNode.title)) {
            previousTitles.push(candidateNode.title);
        }

        currentNode.id = candidateNode.id;
        currentNode.previousTitles = previousTitles;
        currentNode.createdAt = candidateNode.createdAt || currentNode.createdAt;

        if (candidateIndex !== currentIndex) {
            nodes.splice(candidateIndex, 1);
        }

        nodeMap.nodes = nodes;
        await this.fs.promises.writeFile(nodeMapPath, JSON.stringify(nodeMap, null, 2), "utf8");
        const selection = await this.vscode.window.showInformationMessage("Applied candidate stable id to node map: " + candidate.stableId, "Open Node Map", "Revert Last Apply");
        if (selection === "Open Node Map") {
            await this.openFile(nodeMapPath);
        }
        if (selection === "Revert Last Apply") {
            await this.revertLastAppliedStableId(nodeMapPath);
        }
    }

    async revertLastAppliedStableId(nodeMapPath) {
        const backupPath = this.reviewBackupPath(nodeMapPath);
        if (!this.fs.existsSync(backupPath)) {
            throw new Error("Could not find a stable node map review backup to restore.");
        }

        const text = await this.fs.promises.readFile(backupPath, "utf8");
        await this.fs.promises.writeFile(nodeMapPath, text, "utf8");
        await this.fs.promises.unlink(backupPath);
        const selection = await this.vscode.window.showInformationMessage("Reverted the last applied stable id review change.", "Open Node Map");
        if (selection === "Open Node Map") {
            await this.openFile(nodeMapPath);
        }
    }

    reviewBackupPath(nodeMapPath) {
        return nodeMapPath + ".review-backup.json";
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

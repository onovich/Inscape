"use strict";

class LocalizationReviewPresenterModelBuilder {

    constructor(dependencies) {
        this.formatDisplayPath = dependencies.formatDisplayPath;
    }

    build(report) {
        const result = {
            Items: []
        };

        const items = Array.isArray(report && report.items) ? report.items : [];
        for (let i = 0; i < items.length; i += 1) {
            result.Items.push(this.buildItem(items[i]));
        }

        return result;
    }

    buildItem(item) {
        const candidateSummary = Array.isArray(item.candidates) && item.candidates.length > 0
            ? item.candidates.slice(0, 2).map((candidate) => this.formatCandidateInline(candidate)).join(" | ")
            : "No candidates";
        const translationSummary = item.translation
            ? "translation: " + item.translation
            : "translation: (empty)";
        const sourceLine = Number(item.line || 0) > 0 ? item.line : 1;
        const sourceColumn = Number(item.column || 0) > 0 ? item.column : 1;

        const model = {
            title: this.createReviewItemTitle(item),
            summary: translationSummary,
            detail: this.formatSourceSummary(item.sourcePath, item.line, item.column) + " | " + String(item.text || "") + " | " + candidateSummary,
            item,
            sourcePath: String(item.sourcePath || ""),
            line: sourceLine,
            column: sourceColumn,
            length: String(item.text || "").length,
            Actions: []
        };

        model.Actions.push({
            actionKey: "open-current",
            summary: this.formatSourceSummary(item.sourcePath, item.line, item.column),
            detail: String(item.text || ""),
            sourcePath: String(item.sourcePath || ""),
            line: Math.max(1, Number(item.line || 1)),
            column: Math.max(1, Number(item.column || 1)),
            length: String(item.text || "").length
        });

        const candidates = Array.isArray(item.candidates) ? item.candidates : [];
        for (let i = 0; i < candidates.length; i += 1) {
            const candidate = candidates[i];
            model.Actions.push({
                actionKey: "open-candidate",
                actionIndex: i,
                actionStatus: this.formatCandidateStatus(candidate),
                summary: candidate.translation || "(no translation)",
                detail: this.formatSourceSummary(candidate.sourcePath, candidate.line, candidate.column) + " | " + this.formatCandidateInline(candidate),
                sourcePath: String(candidate.sourcePath || ""),
                line: Math.max(1, Number(candidate.line || 1)),
                column: Math.max(1, Number(candidate.column || 1)),
                length: String(candidate.text || "").length
            });
        }

        return model;
    }

    createReviewItemTitle(item) {
        const status = String(item.status || "unknown");
        const review = String(item.review || "");
        const node = String(item.nodeTitle || "(unknown node)");
        const candidateCount = Array.isArray(item.candidates) ? item.candidates.length : 0;
        return "[" + status + "] " + node + " - " + review + (candidateCount > 0 ? " (" + candidateCount + " candidates)" : "");
    }

    formatCandidateInline(candidate) {
        const similarity = candidate.similarity > 0
            ? " @" + Number(candidate.similarity).toFixed(3)
            : "";
        const reason = candidate.reason ? " {" + candidate.reason + "}" : "";
        const translation = candidate.translation ? " => " + candidate.translation : "";
        return String(candidate.text || "") + translation + similarity + reason;
    }

    formatCandidateStatus(candidate) {
        const similarity = candidate.similarity > 0
            ? "similarity " + Number(candidate.similarity).toFixed(3)
            : "candidate";
        return candidate.reason
            ? similarity + " / " + candidate.reason
            : similarity;
    }

    formatSourceSummary(sourcePath, line, column) {
        const fileName = this.formatDisplayPath(String(sourcePath || ""));
        return fileName + ":" + String(line || 1) + ":" + String(column || 1);
    }

}

module.exports = {
    LocalizationReviewPresenterModelBuilder
};

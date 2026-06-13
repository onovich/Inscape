export class LocalizationReviewRowsModelBuilder {
  static build(reviewSnapshot) {
    if (reviewSnapshot?.provider !== "localization-review") {
      return null;
    }

    const presenterItems = reviewSnapshot?.review?.presenter?.items;
    if (!Array.isArray(presenterItems)) {
      return [];
    }

    return presenterItems.map((presenterItem) => {
      const item = presenterItem.item || {};
      const status = item.status || "review";
      return {
        anchor: item.anchor || "",
        actions: this.normalizeReviewActions(presenterItem.actions || presenterItem.Actions),
        kind: this.normalizeKind(item.kind),
        nodeTitle: item.nodeTitle || "",
        review: item.review || "",
        reviewDetail: presenterItem.detail || "",
        reviewStatus: status,
        reviewSummary: presenterItem.summary || "",
        sourcePath: presenterItem.sourcePath || item.sourcePath || "",
        sourceLine: Number(item.line || presenterItem.line || 1),
        speaker: item.speaker || "",
        text: item.text || "",
        translation: item.translation || "",
      };
    });
  }

  static normalizeReviewActions(actions) {
    if (!Array.isArray(actions)) {
      return [];
    }

    return actions.map((action) => ({
      actionIndex: Number(action.actionIndex ?? action.ActionIndex ?? 0),
      actionKey: action.actionKey || action.ActionKey || "",
      actionStatus: action.actionStatus || action.ActionStatus || "",
      column: Number(action.column ?? action.Column ?? 0),
      detail: action.detail || action.Detail || "",
      length: Number(action.length ?? action.Length ?? 0),
      line: Number(action.line ?? action.Line ?? 0),
      sourcePath: action.sourcePath || action.SourcePath || "",
      summary: action.summary || action.Summary || "",
      title: action.title || action.Title || "",
    }));
  }

  static normalizeKind(kind) {
    const text = String(kind || "");
    if (!text) {
      return "";
    }

    return text.charAt(0).toLowerCase() + text.slice(1).replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  }
}

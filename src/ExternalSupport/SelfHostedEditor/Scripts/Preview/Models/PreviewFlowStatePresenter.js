export class PreviewFlowStatePresenter {
  getVisibleLines(storyModel, mode, visibleLineCount) {
    if (mode !== "flow") {
      return storyModel.lines;
    }

    return storyModel.lines.filter((line) => this.isLineVisibleInFlow(line, storyModel, visibleLineCount));
  }

  shouldShowChoices(storyModel, mode, visibleLineCount) {
    return mode !== "flow" || this.getVisibleLineCount(storyModel, visibleLineCount) > this.getStepCount(storyModel);
  }

  areChoicesVisible(storyModel, mode, visibleLineCount) {
    return Boolean(storyModel)
      && mode === "flow"
      && this.getVisibleLineCount(storyModel, visibleLineCount) > this.getStepCount(storyModel);
  }

  isLineVisibleInFlow(targetLine, storyModel, visibleLineCount) {
    return this.isLineVisibleInFlowForCount(targetLine, storyModel, this.getVisibleLineCount(storyModel, visibleLineCount));
  }

  getStepCount(storyModel) {
    const runtimeStepCount = Number(storyModel?.runtimeState?.readingProgress?.contentStepCount);
    if (Number.isFinite(runtimeStepCount) && runtimeStepCount >= 0) {
      return runtimeStepCount;
    }

    return storyModel.lines.filter((line) => line.kind !== "metadata").length;
  }

  getAnimationLineIndex(storyModel, visibleLineCount) {
    if (visibleLineCount <= 0 || visibleLineCount > this.getStepCount(storyModel)) {
      return -1;
    }

    const visibleLines = storyModel.lines.filter((line) => this.isLineVisibleInFlowForCount(line, storyModel, visibleLineCount));
    let contentCount = 0;
    for (const line of visibleLines) {
      if (line.kind === "metadata") {
        continue;
      }

      contentCount += 1;
      if (contentCount === visibleLineCount) {
        return visibleLines.indexOf(line);
      }
    }

    return -1;
  }

  isLineVisibleInFlowForCount(targetLine, storyModel, visibleLineCount) {
    let visibleContentCount = 0;
    for (const line of storyModel.lines) {
      if (line.kind !== "metadata") {
        visibleContentCount += 1;
      }

      if (line === targetLine) {
        return visibleContentCount <= visibleLineCount;
      }
    }

    return false;
  }

  hasRuntimeReadingProgress(storyModel) {
    return Number.isFinite(Number(storyModel?.runtimeState?.readingProgress?.visibleStepCount));
  }

  syncVisibleLineCount(storyModel, visibleLineCount) {
    if (!this.hasRuntimeReadingProgress(storyModel)) {
      return visibleLineCount;
    }

    return this.getVisibleLineCount(storyModel, visibleLineCount);
  }

  getVisibleLineCount(storyModel, visibleLineCount) {
    const runtimeVisibleLineCount = Number(storyModel?.runtimeState?.readingProgress?.visibleStepCount);
    if (Number.isFinite(runtimeVisibleLineCount) && runtimeVisibleLineCount >= 0) {
      return runtimeVisibleLineCount;
    }

    return visibleLineCount;
  }
}

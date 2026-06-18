export class PreviewRuntimePreferenceModelBuilder {
  buildPreferredPreviewModel({
    activeLineNumber,
    currentNodeTitle,
    documentModel,
    fallbackStoryModel,
    runtimeSnapshot,
  }) {
    const runtimeStoryModel = this.buildPreviewModelFromRuntimeSnapshot(runtimeSnapshot);
    if (runtimeStoryModel && this.shouldPreferRuntimeInitialSelection(documentModel, currentNodeTitle, activeLineNumber)) {
      return runtimeStoryModel;
    }

    if (runtimeStoryModel && this.isRuntimeStoryModelAlignedWithActiveLine(documentModel, runtimeStoryModel, activeLineNumber)) {
      return runtimeStoryModel;
    }

    return fallbackStoryModel;
  }

  shouldPreferRuntimeInitialSelection(documentModel, currentNodeTitle, activeLineNumber) {
    if (this.findNodeByTitle(documentModel, currentNodeTitle)) {
      return false;
    }

    const firstNodeSourceLine = Number(documentModel?.nodes?.[0]?.sourceLine || 1);
    return activeLineNumber <= Math.max(1, firstNodeSourceLine);
  }

  isRuntimeStoryModelAlignedWithActiveLine(documentModel, runtimeStoryModel, activeLineNumber) {
    const activeNode = this.findNodeForLine(documentModel, activeLineNumber);
    if (!activeNode) {
      return false;
    }

    return activeNode.title === runtimeStoryModel.nodeTitle;
  }

  buildPreviewModelFromRuntimeSnapshot(runtimeSnapshot) {
    const currentNode = runtimeSnapshot?.currentNode || null;
    if (!currentNode) {
      return null;
    }

    const nodeTitle = currentNode.name || "Untitled Node";
    const sourceLine = Number(currentNode?.source?.line || currentNode?.lines?.[0]?.source?.line || 0);
    const lines = (Array.isArray(currentNode.lines) ? currentNode.lines : [])
      .map((line) => ({
        anchor: line?.anchor || "",
        kind: String(line?.kind || "narration").toLowerCase(),
        nodeTitle,
        raw: line?.raw || "",
        sourceLine: Number(line?.source?.line || 0),
        sourcePath: line?.source?.sourcePath || "",
        speaker: line?.speaker || "",
        text: line?.text || "",
      }))
      .filter((line) => line.sourceLine > 0);
    const choices = (Array.isArray(currentNode.choices) ? currentNode.choices : [])
      .map((group, groupIndex) => {
        const options = (Array.isArray(group?.options) ? group.options : [])
          .map((option, optionIndex) => ({
            anchor: option?.anchor || "",
            kind: "choice",
            nodeTitle,
            runtimeAction: {
              groupIndex,
              optionIndex,
              type: "choose",
            },
            sourceLine: Number(option?.source?.line || 0),
            sourcePath: option?.source?.sourcePath || "",
            target: option?.target || "",
            text: option?.text || "",
          }))
          .filter((option) => option.sourceLine > 0);
        if (options.length === 0) {
          return null;
        }

        return {
          kind: "choiceGroup",
          nodeTitle,
          options,
          prompt: group?.prompt || "",
          sourceLine: Number(group?.source?.line || 0),
          sourcePath: group?.source?.sourcePath || "",
        };
      })
      .filter(Boolean);
    if (currentNode.defaultNext) {
      choices.push({
        kind: "jumpGroup",
        nodeTitle,
        options: [{
          kind: "jump",
          nodeTitle,
          runtimeAction: {
            type: "continue",
          },
          sourceLine: 0,
          sourcePath: "",
          target: currentNode.defaultNext,
          text: "continue",
        }],
        prompt: "",
        sourceLine: 0,
        sourcePath: "",
      });
    }

    return {
      choices,
      lines,
      nodeTitle,
      provider: "runtime",
      runtimeState: {
        currentNodeName: runtimeSnapshot?.state?.currentNodeName || nodeTitle,
        path: Array.isArray(runtimeSnapshot?.state?.path) ? runtimeSnapshot.state.path : [],
        pendingAction: runtimeSnapshot?.pendingAction || null,
        readingProgress: runtimeSnapshot?.readingProgress || null,
        visibleStepCount: Number(runtimeSnapshot?.state?.visibleStepCount || 0),
      },
      sourceLine,
      title: nodeTitle,
    };
  }

  findNodeForLine(documentModel, lineNumber) {
    return (documentModel?.nodes || []).find(
      (node) => node.sourceLine <= lineNumber && lineNumber <= node.endLine
    ) || null;
  }

  findNodeByTitle(documentModel, title) {
    return (documentModel?.nodes || []).find((node) => node.title === title) || null;
  }
}

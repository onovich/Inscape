export class PreviewRuntimePreferenceModelBuilder {
  buildPreferredPreviewModel({
    activeLineNumber,
    currentNodeTitle,
    documentModel,
    fallbackStoryModel,
    runtimeSnapshot,
  }) {
    const runtimeStatus = this.buildRuntimeStatus(runtimeSnapshot);
    const runtimeStoryModel = this.buildPreviewModelFromRuntimeSnapshot(runtimeSnapshot);
    if (runtimeStoryModel && this.shouldPreferRuntimeInitialSelection(documentModel, currentNodeTitle, activeLineNumber)) {
      return runtimeStoryModel;
    }

    if (runtimeStoryModel && this.isRuntimeStoryModelAlignedWithActiveLine(documentModel, runtimeStoryModel, activeLineNumber)) {
      return runtimeStoryModel;
    }

    if (runtimeStoryModel) {
      return this.withRuntimeStatus(
        fallbackStoryModel,
        this.buildStaleRuntimeStatus(runtimeStoryModel, fallbackStoryModel)
      );
    }

    if (runtimeStatus && runtimeStatus.state !== "runtime-ready") {
      return this.withRuntimeStatus(fallbackStoryModel, runtimeStatus);
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
    const runtimeEnvelope = this.normalizeRuntimeEnvelope(runtimeSnapshot);
    if (!runtimeEnvelope || runtimeEnvelope.provider !== "runtime-project") {
      return null;
    }

    const runtimeState = runtimeEnvelope.snapshot || null;
    const runtimeStatus = this.buildRuntimeStatus(runtimeEnvelope);
    if (runtimeStatus?.state !== "runtime-ready") {
      return null;
    }

    const currentNode = runtimeState?.currentNode || null;
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
      runtimeStatus,
      runtimeState: {
        currentNodeName: runtimeState?.state?.currentNodeName || nodeTitle,
        path: Array.isArray(runtimeState?.state?.path) ? runtimeState.state.path : [],
        pendingAction: runtimeState?.pendingAction || null,
        readingProgress: runtimeState?.readingProgress || null,
        visibleStepCount: Number(runtimeState?.state?.visibleStepCount || 0),
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

  buildRuntimeStatus(runtimeSnapshot) {
    const runtimeEnvelope = this.normalizeRuntimeEnvelope(runtimeSnapshot);
    if (!runtimeEnvelope) {
      return null;
    }

    if (runtimeEnvelope.provider === "runtime-project" && runtimeEnvelope.snapshot?.currentNode) {
      return {
        detail: "Runtime controls use the latest Runtime snapshot.",
        label: "Runtime ready",
        provider: "runtime-project",
        state: "runtime-ready",
      };
    }

    if (runtimeEnvelope.error) {
      return {
        detail: this.boundRuntimeDetail(runtimeEnvelope.error),
        label: "Runtime error",
        provider: runtimeEnvelope.provider || "unavailable",
        state: "runtime-error",
      };
    }

    return {
      detail: "Compiler or offline fallback is active until Runtime preview is available.",
      label: "Runtime unavailable",
      provider: runtimeEnvelope.provider || "unavailable",
      state: "runtime-unavailable",
    };
  }

  buildStaleRuntimeStatus(runtimeStoryModel, fallbackStoryModel) {
    return {
      detail: `Runtime is at ${runtimeStoryModel?.nodeTitle || "another node"} while Preview is showing ${fallbackStoryModel?.nodeTitle || "another node"}.`,
      label: "Runtime snapshot stale",
      provider: "runtime-project",
      state: "runtime-stale",
    };
  }

  withRuntimeStatus(storyModel, runtimeStatus) {
    if (!storyModel || !runtimeStatus) {
      return storyModel;
    }

    return {
      ...storyModel,
      runtimeStatus,
    };
  }

  normalizeRuntimeEnvelope(runtimeSnapshot) {
    if (!runtimeSnapshot) {
      return null;
    }

    if (
      Object.prototype.hasOwnProperty.call(runtimeSnapshot, "provider")
      || Object.prototype.hasOwnProperty.call(runtimeSnapshot, "snapshot")
      || Object.prototype.hasOwnProperty.call(runtimeSnapshot, "error")
    ) {
      return {
        error: runtimeSnapshot.error || "",
        provider: runtimeSnapshot.provider || "unavailable",
        snapshot: runtimeSnapshot.snapshot || null,
      };
    }

    return {
      error: "",
      provider: "runtime-project",
      snapshot: runtimeSnapshot,
    };
  }

  boundRuntimeDetail(detail) {
    const text = String(detail || "").replace(/\s+/g, " ").trim();
    if (text.length <= 160) {
      return text;
    }

    return `${text.slice(0, 157)}...`;
  }
}

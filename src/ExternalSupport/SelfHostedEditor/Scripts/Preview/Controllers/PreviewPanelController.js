import {
  ScriptDocumentFallbackPolicy,
  ScriptDocumentFallbackReason,
} from "../../ProjectWorkspace/Models/ScriptDocumentFallbackPolicy.js";
import { PreviewCompilerGraphContractGuard } from "../Models/PreviewCompilerGraphContractGuard.js";
import { PreviewFlowStatePresenter } from "../Models/PreviewFlowStatePresenter.js";
import { PreviewRuntimePreferenceModelBuilder } from "../Models/PreviewRuntimePreferenceModelBuilder.js";
import { PreviewBlockRenderer } from "../Renderers/PreviewBlockRenderer.js";
import { PreviewChoiceRenderer } from "../Renderers/PreviewChoiceRenderer.js";

export class PreviewPanelController {
  constructor(previewElement, modeButtonElements = [], modeLabelElement = null) {
    this.previewElement = previewElement;
    this.modeButtonElements = Array.from(modeButtonElements);
    this.modeLabelElement = modeLabelElement;
    this.sourceLineSelectedHandlers = [];
    this.choiceSelectedHandlers = [];
    this.activeLineNumber = 1;
    this.flowVisibleLineCount = 0;
    this.mode = "static";
    this.currentNodeTitle = "";
    this.documentModel = null;
    this.documentProvider = "unavailable";
    this.latestStoryModel = null;
    this.latestRuntimeSnapshot = null;
    this.runtimeControlStatus = null;
    this.storyGraphModel = null;
    this.scriptText = "";
    this.pendingFlowAnimationLineIndex = -1;
    this.flowWheelAccumulator = 0;
    this.flowWheelLastDirection = 0;
    this.flowWheelThreshold = 160;
    this.compilerGraphContractGuard = new PreviewCompilerGraphContractGuard();
    this.flowStatePresenter = new PreviewFlowStatePresenter();
    this.runtimePreferenceModelBuilder = new PreviewRuntimePreferenceModelBuilder();
    this.blockRenderer = new PreviewBlockRenderer({
      onSourceLineSelected: (lineNumber) => this.notifySourceLineSelected(lineNumber),
    });
    this.choiceRenderer = new PreviewChoiceRenderer({
      getCurrentNodeTitle: () => this.currentNodeTitle,
      onChoiceSelected: (choice, event) => this.selectChoice(choice, event),
      onSourceLineSelected: (lineNumber) => this.notifySourceLineSelected(lineNumber),
    });
    this.bindModeControls();
    this.previewElement.addEventListener("click", (event) => {
      void this.handlePreviewClick(event);
    });
    this.previewElement.addEventListener("wheel", (event) => {
      void this.handlePreviewWheel(event);
    }, { passive: false });
    this.updateModeControls();
  }

  onSourceLineSelected(handler) {
    this.sourceLineSelectedHandlers.push(handler);
  }

  onChoiceSelected(handler) {
    this.choiceSelectedHandlers.push(handler);
  }

  render(scriptText, activeLineNumber = 1, storyGraphModel = null, runtimeSnapshot = null) {
    this.scriptText = scriptText;
    this.activeLineNumber = activeLineNumber;
    this.storyGraphModel = storyGraphModel;
    this.latestRuntimeSnapshot = runtimeSnapshot || null;
    this.runtimeControlStatus = null;
    try {
      const previewDocument = this.buildPreviewDocumentModel(scriptText, storyGraphModel);
      this.documentModel = previewDocument.documentModel;
      this.documentProvider = previewDocument.provider;
    } catch (error) {
      this.documentModel = null;
      this.documentProvider = "contract-error";
      this.latestStoryModel = null;
      this.currentNodeTitle = "";
      this.renderContractError(error);
      console.error("SelfHostedEditor preview contract error:", error);
      return;
    }

    const storyModel = this.buildPreferredPreviewModel(activeLineNumber, runtimeSnapshot);
    if (storyModel.nodeTitle !== this.currentNodeTitle && !this.flowStatePresenter.hasRuntimeReadingProgress(storyModel)) {
      this.flowVisibleLineCount = 0;
    }
    this.flowVisibleLineCount = this.flowStatePresenter.syncVisibleLineCount(storyModel, this.flowVisibleLineCount);

    this.currentNodeTitle = storyModel.nodeTitle;
    this.latestStoryModel = storyModel;
    this.renderStoryModel(storyModel);
    this.highlightSourceLine(activeLineNumber, { allowNodeSwitch: false });
  }

  buildPreferredPreviewModel(activeLineNumber, runtimeSnapshot) {
    return this.runtimePreferenceModelBuilder.buildPreferredPreviewModel({
      activeLineNumber,
      currentNodeTitle: this.currentNodeTitle,
      documentModel: this.documentModel,
      fallbackStoryModel: this.buildPreviewModel(activeLineNumber),
      runtimeSnapshot,
    });
  }

  buildPreviewDocumentModel(scriptText, storyGraphModel) {
    const compilerDocumentModel = this.compilerGraphContractGuard.buildDocumentModelFromStoryGraph(storyGraphModel);
    if (compilerDocumentModel) {
      return {
        documentModel: compilerDocumentModel,
        provider: "compiler-project",
      };
    }

    return {
      documentModel: ScriptDocumentFallbackPolicy.buildDocumentModel(scriptText, {
        reason: ScriptDocumentFallbackReason.PreviewCompilerGraphUnavailable,
      }),
      provider: "offline-draft",
    };
  }

  renderRuntimeSnapshot(runtimeSnapshot) {
    const storyModel = this.runtimePreferenceModelBuilder.buildPreviewModelFromRuntimeSnapshot(runtimeSnapshot);
    if (!storyModel) {
      return false;
    }

    if (storyModel.nodeTitle !== this.currentNodeTitle) {
      this.flowVisibleLineCount = 0;
    }
    this.flowVisibleLineCount = this.flowStatePresenter.syncVisibleLineCount(storyModel, this.flowVisibleLineCount);
    this.pendingFlowAnimationLineIndex = -1;
    this.latestRuntimeSnapshot = runtimeSnapshot || null;
    this.runtimeControlStatus = null;

    this.currentNodeTitle = storyModel.nodeTitle;
    this.latestStoryModel = storyModel;
    this.renderStoryModel(storyModel);
    this.highlightSourceLine(storyModel.sourceLine || 0, { allowNodeSwitch: false });
    return true;
  }

  renderStoryModel(storyModel) {
    this.blockRenderer.clearTypewriterTimer();
    const visibleLines = this.flowStatePresenter.getVisibleLines(storyModel, this.mode, this.flowVisibleLineCount);
    const shouldShowChoices = this.flowStatePresenter.shouldShowChoices(storyModel, this.mode, this.flowVisibleLineCount);
    const blockingPendingAction = this.getBlockingPendingAction(storyModel);
    const animatedLineIndex = this.pendingFlowAnimationLineIndex;
    this.pendingFlowAnimationLineIndex = -1;
    const historyElement = this.createRuntimeHistoryElement(storyModel, Boolean(blockingPendingAction));
    const pendingElement = blockingPendingAction ? this.createRuntimePendingElement(blockingPendingAction) : null;
    const runtimeStatus = this.getVisibleRuntimeStatus(storyModel);
    const runtimeStatusElement = runtimeStatus ? this.createRuntimeStatusElement(runtimeStatus) : null;
    const storyElements = this.mode === "flow"
      ? this.blockRenderer.createFlowStoryElements(storyModel, visibleLines, animatedLineIndex)
      : [
        this.blockRenderer.createTitleElement(storyModel),
        ...visibleLines.map((line, index) => this.blockRenderer.createLineElement(line, {
          animateBody: index === animatedLineIndex,
        })),
      ];
    this.previewElement.replaceChildren(
      this.createPreviewProviderStatus(storyModel),
      ...(runtimeStatusElement ? [runtimeStatusElement] : []),
      ...(historyElement ? [historyElement] : []),
      ...(pendingElement ? [pendingElement] : []),
      ...storyElements,
      this.choiceRenderer.createChoicesElement(shouldShowChoices && !blockingPendingAction ? storyModel.choices : [])
    );
    this.previewElement.dataset.previewMode = this.mode;
    this.previewElement.dataset.previewProvider = storyModel.provider || this.documentProvider;
    if (blockingPendingAction) {
      this.previewElement.dataset.runtimePending = "blocking";
    } else {
      delete this.previewElement.dataset.runtimePending;
    }
    const runtimePreviewState = runtimeStatus?.state || storyModel.runtimeStatus?.state || (
      storyModel.provider === "runtime" ? "runtime-ready" : ""
    );
    if (runtimePreviewState) {
      this.previewElement.dataset.runtimePreviewState = runtimePreviewState;
    } else {
      delete this.previewElement.dataset.runtimePreviewState;
    }
    delete this.previewElement.dataset.previewState;
  }

  renderContractError(error) {
    const errorElement = document.createElement("section");
    errorElement.className = "story-preview-error";
    errorElement.dataset.previewError = "compiler-graph-contract";

    const title = document.createElement("h1");
    title.className = "story-title";
    title.textContent = "Preview data error";

    const message = document.createElement("p");
    message.className = "story-line";
    message.textContent = error instanceof Error ? error.message : String(error);

    errorElement.append(title, message);
    this.previewElement.replaceChildren(errorElement);
    this.previewElement.dataset.previewMode = this.mode;
    this.previewElement.dataset.previewProvider = "contract-error";
    this.previewElement.dataset.previewState = "error";
  }

  createPreviewProviderStatus(storyModel) {
    const provider = storyModel.provider || this.documentProvider;
    const status = document.createElement("div");
    status.className = "story-preview-provider";
    status.dataset.provider = provider;
    status.textContent = this.getPreviewProviderLabel(provider);
    return status;
  }

  getPreviewProviderLabel(provider) {
    if (provider === "runtime") {
      return "Runtime preview";
    }

    if (provider === "compiler-project") {
      return "Compiler preview";
    }

    if (provider === "offline-draft") {
      return "Offline draft preview";
    }

    if (provider === "contract-error") {
      return "Preview data error";
    }

    return "Preview unavailable";
  }

  setRuntimeControlStatus(status) {
    this.runtimeControlStatus = this.normalizeRuntimeControlStatus(status);
    if (this.latestStoryModel) {
      this.renderStoryModel(this.latestStoryModel);
    }
  }

  clearRuntimeControlStatus() {
    this.runtimeControlStatus = null;
    if (this.latestStoryModel) {
      this.renderStoryModel(this.latestStoryModel);
    }
  }

  isRuntimePreviewActive() {
    return this.latestStoryModel?.provider === "runtime";
  }

  getRuntimeSurfaceModel() {
    const runtimeStatus = this.runtimeControlStatus || this.latestStoryModel?.runtimeStatus || null;
    return {
      provider: this.latestStoryModel?.provider || this.documentProvider || "unavailable",
      runtimeStatus,
      state: runtimeStatus?.state || this.previewElement?.dataset?.runtimePreviewState || this.previewElement?.dataset?.previewState || "",
    };
  }

  getVisibleRuntimeStatus(storyModel) {
    const status = this.runtimeControlStatus || storyModel?.runtimeStatus || null;
    if (!status || status.state === "runtime-ready") {
      return null;
    }

    return status;
  }

  createRuntimeStatusElement(runtimeStatus) {
    const status = document.createElement("div");
    status.className = "story-runtime-status";
    status.dataset.runtimeState = runtimeStatus.state;

    const title = document.createElement("strong");
    title.textContent = runtimeStatus.label || this.getRuntimeStatusLabel(runtimeStatus.state);

    const detail = document.createElement("span");
    detail.textContent = runtimeStatus.detail || "";

    status.append(title, detail);
    return status;
  }

  normalizeRuntimeControlStatus(status) {
    const state = String(status?.state || "runtime-error").trim() || "runtime-error";
    return {
      detail: this.boundRuntimeStatusDetail(status?.detail || ""),
      label: status?.label || this.getRuntimeStatusLabel(state),
      provider: status?.provider || "runtime-project",
      state,
    };
  }

  getRuntimeStatusLabel(state) {
    if (state === "runtime-stale") {
      return "Runtime snapshot stale";
    }

    if (state === "runtime-unavailable") {
      return "Runtime unavailable";
    }

    if (state === "runtime-error") {
      return "Runtime error";
    }

    return "Runtime status";
  }

  boundRuntimeStatusDetail(detail) {
    const text = String(detail || "").replace(/\s+/g, " ").trim();
    if (text.length <= 160) {
      return text;
    }

    return `${text.slice(0, 157)}...`;
  }

  highlightSourceLine(lineNumber, options = {}) {
    this.activeLineNumber = lineNumber;
    const activeNode = this.findNodeForLine(lineNumber);
    if (options.allowNodeSwitch !== false && activeNode && activeNode.title !== this.currentNodeTitle) {
      this.render(this.scriptText, lineNumber, this.storyGraphModel, this.latestRuntimeSnapshot);
      return;
    }

    for (const element of this.previewElement.querySelectorAll("[data-source-line]")) {
      const isActive = Number(element.dataset.sourceLine) === lineNumber;
      element.classList.toggle("is-active", isActive);
    }
  }

  bindModeControls() {
    for (const button of this.modeButtonElements) {
      button.addEventListener("click", () => this.setMode(button.dataset.previewMode));
    }
  }

  setMode(mode) {
    if (mode !== "flow" && mode !== "static") {
      return;
    }

    if (this.mode === mode) {
      return;
    }

    this.mode = mode;
    this.flowVisibleLineCount = mode === "flow" ? 0 : Number.MAX_SAFE_INTEGER;
    this.updateModeControls();
    if (this.latestStoryModel) {
      this.flowVisibleLineCount = this.flowStatePresenter.syncVisibleLineCount(this.latestStoryModel, this.flowVisibleLineCount);
      this.renderStoryModel(this.latestStoryModel);
      this.highlightSourceLine(this.activeLineNumber);
    }
  }

  updateModeControls() {
    for (const button of this.modeButtonElements) {
      button.setAttribute("aria-pressed", String(button.dataset.previewMode === this.mode));
    }

    if (this.modeLabelElement) {
      this.modeLabelElement.textContent = this.mode === "flow" ? "Flow" : "Static";
    }
  }

  async handlePreviewClick(event) {
    if (this.mode !== "flow") {
      return;
    }

    if (event.target.closest("button")) {
      return;
    }

    await this.advanceFlow();
  }

  async handlePreviewWheel(event) {
    if (this.mode !== "flow" || !this.latestStoryModel) {
      this.resetFlowWheelAccumulator();
      return;
    }

    const deltaY = this.getNormalizedWheelDeltaY(event);
    if (!Number.isFinite(deltaY) || deltaY === 0) {
      return;
    }

    const direction = deltaY > 0 ? 1 : -1;
    const atBoundary = direction < 0 ? this.isPreviewScrolledToTop() : this.isPreviewScrolledToBottom();
    const canAdvance = direction > 0
      && !this.flowStatePresenter.areChoicesVisible(this.latestStoryModel, this.mode, this.flowVisibleLineCount);
    const canRewind = direction < 0
      && this.flowStatePresenter.getVisibleLineCount(this.latestStoryModel, this.flowVisibleLineCount) > 0;
    if (!atBoundary || (direction > 0 && !canAdvance) || (direction < 0 && !canRewind)) {
      this.resetFlowWheelAccumulator();
      return;
    }

    event.preventDefault?.();
    const steps = this.consumeFlowWheelDelta(deltaY);
    for (let index = 0; index < steps; index += 1) {
      const changed = direction > 0
        ? await this.advanceFlow()
        : await this.rewindFlow();
      if (!changed) {
        this.resetFlowWheelAccumulator();
        break;
      }
    }
  }

  async advanceFlow() {
    if (!this.latestStoryModel) {
      return false;
    }

    if (this.getBlockingPendingAction(this.latestStoryModel)) {
      return false;
    }

    if (this.flowStatePresenter.hasRuntimeReadingProgress(this.latestStoryModel)) {
      return this.notifyChoiceSelected({
        nodeTitle: this.latestStoryModel.nodeTitle,
        runtimeAction: {
          type: "advance-flow",
        },
      });
    }

    const flowStepCount = this.flowStatePresenter.getStepCount(this.latestStoryModel);
    const nextVisibleLineCount = Math.min(
      flowStepCount + 1,
      this.flowVisibleLineCount + 1
    );
    if (nextVisibleLineCount === this.flowVisibleLineCount) {
      return false;
    }

    this.pendingFlowAnimationLineIndex = this.flowStatePresenter.getAnimationLineIndex(this.latestStoryModel, nextVisibleLineCount);
    this.flowVisibleLineCount = nextVisibleLineCount;
    this.renderStoryModel(this.latestStoryModel);
    this.highlightSourceLine(this.activeLineNumber);
    return true;
  }

  async rewindFlow() {
    if (!this.latestStoryModel) {
      return false;
    }

    if (this.getBlockingPendingAction(this.latestStoryModel)) {
      return false;
    }

    if (this.flowStatePresenter.hasRuntimeReadingProgress(this.latestStoryModel)) {
      return this.notifyChoiceSelected({
        nodeTitle: this.latestStoryModel.nodeTitle,
        runtimeAction: {
          type: "rewind-flow",
        },
      });
    }

    const nextVisibleLineCount = Math.max(0, this.flowVisibleLineCount - 1);
    if (nextVisibleLineCount === this.flowVisibleLineCount) {
      return false;
    }

    this.pendingFlowAnimationLineIndex = -1;
    this.flowVisibleLineCount = nextVisibleLineCount;
    this.renderStoryModel(this.latestStoryModel);
    this.highlightSourceLine(this.activeLineNumber);
    return true;
  }

  consumeFlowWheelDelta(deltaY) {
    const direction = deltaY > 0 ? 1 : -1;
    if (direction !== this.flowWheelLastDirection) {
      this.flowWheelAccumulator = 0;
      this.flowWheelLastDirection = direction;
    }

    this.flowWheelAccumulator += Math.abs(deltaY);
    const steps = Math.min(2, Math.floor(this.flowWheelAccumulator / this.flowWheelThreshold));
    this.flowWheelAccumulator -= steps * this.flowWheelThreshold;
    return steps;
  }

  getNormalizedWheelDeltaY(event) {
    const deltaY = Number(event.deltaY || 0);
    if (event.deltaMode === 1) {
      return deltaY * 40;
    }

    if (event.deltaMode === 2) {
      return deltaY * Math.max(Number(this.previewElement.clientHeight || 0), this.flowWheelThreshold);
    }

    return deltaY;
  }

  resetFlowWheelAccumulator() {
    this.flowWheelAccumulator = 0;
    this.flowWheelLastDirection = 0;
  }

  isPreviewScrolledToTop() {
    return Number(this.previewElement.scrollTop || 0) <= 1;
  }

  isPreviewScrolledToBottom() {
    const scrollTop = Number(this.previewElement.scrollTop || 0);
    const clientHeight = Number(this.previewElement.clientHeight || 0);
    const scrollHeight = Number(this.previewElement.scrollHeight || 0);
    return scrollTop + clientHeight >= scrollHeight - 1;
  }

  buildPreviewModel(activeLineNumber = 1) {
    const activeNode = this.findNodeForLine(activeLineNumber);
    const firstNode = this.documentModel?.nodes?.[0];
    const previewNode = activeNode || firstNode;
    return this.createPreviewModelFromNode(previewNode);
  }

  createPreviewModelFromNode(previewNode) {
    return {
      choices: previewNode?.choices || [],
      lines: previewNode?.lines || [],
      nodeTitle: previewNode?.title || "",
      provider: this.documentProvider,
      runtimeStatus: null,
      runtimeState: null,
      sourceLine: Number(previewNode?.sourceLine || 0),
      title: previewNode?.title || this.documentModel?.title || "Untitled Node",
    };
  }

  normalizeChoiceGroups(choices) {
    return this.choiceRenderer.normalizeChoiceGroups(choices);
  }

  getVisibleLines(storyModel) {
    return this.flowStatePresenter.getVisibleLines(storyModel, this.mode, this.flowVisibleLineCount);
  }

  clearTypewriterTimer() {
    this.blockRenderer.clearTypewriterTimer();
  }

  findNodeForLine(lineNumber) {
    return (this.documentModel?.nodes || []).find(
      (node) => node.sourceLine <= lineNumber && lineNumber <= node.endLine
    ) || null;
  }

  findNodeByTitle(title) {
    return (this.documentModel?.nodes || []).find((node) => node.title === title) || null;
  }

  createRuntimeHistoryElement(storyModel, isRuntimeBlocked = false) {
    const runtimePath = Array.isArray(storyModel.runtimeState?.path)
      ? storyModel.runtimeState.path.filter((nodeTitle) => String(nodeTitle || "").trim().length > 0)
      : [];
    if (runtimePath.length === 0) {
      return null;
    }

    const history = document.createElement("div");
    history.className = "story-runtime-history";

    if (runtimePath.length > 1) {
      const backButton = document.createElement("button");
      backButton.className = "story-runtime-back-button";
      backButton.type = "button";
      backButton.textContent = "Back";
      backButton.disabled = isRuntimeBlocked;
      backButton.addEventListener("click", (event) => {
        void this.selectChoice({
          nodeTitle: storyModel.nodeTitle,
          runtimeAction: {
            type: "rewind",
          },
          sourceLine: Number(storyModel.sourceLine || 0),
          target: runtimePath[runtimePath.length - 2] || "",
          text: "Back",
        }, event);
      });
      history.append(backButton);
    }

    const pathElement = document.createElement("div");
    pathElement.className = "story-runtime-path";
    runtimePath.forEach((nodeTitle, index) => {
      if (index > 0) {
        const separator = document.createElement("span");
        separator.className = "story-runtime-path-separator";
        separator.textContent = "/";
        pathElement.append(separator);
      }

      const segment = document.createElement("span");
      segment.className = "story-runtime-path-segment";
      if (index === runtimePath.length - 1) {
        segment.classList.add("is-current");
      }
      segment.textContent = nodeTitle;
      pathElement.append(segment);
    });
    history.append(pathElement);
    return history;
  }

  createRuntimePendingElement(pendingAction) {
    const pending = document.createElement("div");
    pending.className = "story-runtime-pending";
    pending.textContent = `Runtime pending ${pendingAction.mode}: ${pendingAction.name || pendingAction.requestId}`;
    return pending;
  }

  getBlockingPendingAction(storyModel) {
    const pendingAction = storyModel?.runtimeState?.pendingAction || null;
    const mode = String(pendingAction?.mode || "").trim().toLowerCase();
    return mode === "wait" || mode === "handoff"
      ? pendingAction
      : null;
  }

  async selectChoice(choice, event = null) {
    event?.stopPropagation?.();
    if (choice?.runtimeAction && this.getBlockingPendingAction(this.latestStoryModel)) {
      return;
    }

    if (await this.notifyChoiceSelected(choice)) {
      return;
    }

    const targetNode = this.findNodeByTitle(choice.target || "");
    if (targetNode) {
      this.flowVisibleLineCount = 0;
      const storyModel = this.createPreviewModelFromNode(targetNode);
      storyModel.runtimeStatus = this.runtimeControlStatus || this.latestStoryModel?.runtimeStatus || null;
      this.currentNodeTitle = storyModel.nodeTitle;
      this.latestStoryModel = storyModel;
      this.renderStoryModel(storyModel);
      this.highlightSourceLine(targetNode.sourceLine);
      this.notifySourceLineSelected(targetNode.sourceLine);
      return;
    }

    this.notifySourceLineSelected(choice.sourceLine);
  }

  notifySourceLineSelected(lineNumber) {
    for (const handler of this.sourceLineSelectedHandlers) {
      handler(lineNumber);
    }
  }

  async notifyChoiceSelected(choice) {
    for (const handler of this.choiceSelectedHandlers) {
      if (await handler(choice)) {
        return true;
      }
    }

    return false;
  }
}

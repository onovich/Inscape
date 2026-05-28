import { ScriptDocumentModelBuilder } from "../../ProjectWorkspace/Models/ScriptDocumentModelBuilder.js";

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
    this.latestStoryModel = null;
    this.storyGraphModel = null;
    this.scriptText = "";
    this.pendingFlowAnimationLineIndex = -1;
    this.typewriterTimer = null;
    this.flowWheelAccumulator = 0;
    this.flowWheelLastDirection = 0;
    this.flowWheelThreshold = 160;
    this.bindModeControls();
    this.previewElement.addEventListener("click", (event) => this.handlePreviewClick(event));
    this.previewElement.addEventListener("wheel", (event) => this.handlePreviewWheel(event), { passive: false });
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
    const draftDocumentModel = ScriptDocumentModelBuilder.build(scriptText);
    try {
      this.documentModel = this.buildDocumentModelFromStoryGraph(storyGraphModel) || draftDocumentModel;
    } catch (error) {
      this.documentModel = null;
      this.latestStoryModel = null;
      this.currentNodeTitle = "";
      this.renderContractError(error);
      console.error("SelfHostedEditor preview contract error:", error);
      return;
    }

    const storyModel = this.buildPreferredPreviewModel(activeLineNumber, runtimeSnapshot);
    if (storyModel.nodeTitle !== this.currentNodeTitle) {
      this.flowVisibleLineCount = 0;
    }

    this.currentNodeTitle = storyModel.nodeTitle;
    this.latestStoryModel = storyModel;
    this.renderStoryModel(storyModel);
    this.highlightSourceLine(activeLineNumber, { allowNodeSwitch: false });
  }

  buildPreferredPreviewModel(activeLineNumber, runtimeSnapshot) {
    const runtimeStoryModel = this.buildPreviewModelFromRuntimeSnapshot(runtimeSnapshot);
    if (runtimeStoryModel && this.shouldPreferRuntimeInitialSelection(activeLineNumber)) {
      return runtimeStoryModel;
    }

    if (runtimeStoryModel && this.isRuntimeStoryModelAlignedWithActiveLine(runtimeStoryModel, activeLineNumber)) {
      return runtimeStoryModel;
    }

    return this.buildPreviewModel(activeLineNumber);
  }

  shouldPreferRuntimeInitialSelection(activeLineNumber) {
    if (this.findNodeByTitle(this.currentNodeTitle)) {
      return false;
    }

    const firstNodeSourceLine = Number(this.documentModel?.nodes?.[0]?.sourceLine || 1);
    return activeLineNumber <= Math.max(1, firstNodeSourceLine);
  }

  isRuntimeStoryModelAlignedWithActiveLine(runtimeStoryModel, activeLineNumber) {
    const activeNode = this.findNodeForLine(activeLineNumber);
    if (!activeNode) {
      return false;
    }

    return activeNode.title === runtimeStoryModel.nodeTitle;
  }

  renderRuntimeSnapshot(runtimeSnapshot) {
    const storyModel = this.buildPreviewModelFromRuntimeSnapshot(runtimeSnapshot);
    if (!storyModel) {
      return false;
    }

    if (storyModel.nodeTitle !== this.currentNodeTitle) {
      this.flowVisibleLineCount = 0;
    }

    this.currentNodeTitle = storyModel.nodeTitle;
    this.latestStoryModel = storyModel;
    this.renderStoryModel(storyModel);
    this.highlightSourceLine(storyModel.sourceLine || 0, { allowNodeSwitch: false });
    return true;
  }

  renderStoryModel(storyModel) {
    this.clearTypewriterTimer();
    const visibleLines = this.getVisibleLines(storyModel);
    const shouldShowChoices = this.shouldShowChoices(storyModel);
    const animatedLineIndex = this.pendingFlowAnimationLineIndex;
    this.pendingFlowAnimationLineIndex = -1;
    const storyElements = this.mode === "flow"
      ? this.createFlowStoryElements(storyModel, visibleLines, animatedLineIndex)
      : [
        this.createTitleElement(storyModel),
        ...visibleLines.map((line, index) => this.createLineElement(line, {
          animateBody: index === animatedLineIndex,
        })),
      ];
    this.previewElement.replaceChildren(
      ...storyElements,
      this.createChoicesElement(shouldShowChoices ? storyModel.choices : [])
    );
    this.previewElement.dataset.previewMode = this.mode;
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
    this.previewElement.dataset.previewState = "error";
  }

  highlightSourceLine(lineNumber, options = {}) {
    this.activeLineNumber = lineNumber;
    const activeNode = this.findNodeForLine(lineNumber);
    if (options.allowNodeSwitch !== false && activeNode && activeNode.title !== this.currentNodeTitle) {
      this.render(this.scriptText, lineNumber, this.storyGraphModel);
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

  handlePreviewClick(event) {
    if (this.mode !== "flow") {
      return;
    }

    if (event.target.closest("button")) {
      return;
    }

    this.advanceFlow();
  }

  handlePreviewWheel(event) {
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
    const canAdvance = direction > 0 && !this.areFlowChoicesVisible();
    const canRewind = direction < 0 && this.flowVisibleLineCount > 0;
    if (!atBoundary || (direction > 0 && !canAdvance) || (direction < 0 && !canRewind)) {
      this.resetFlowWheelAccumulator();
      return;
    }

    event.preventDefault?.();
    const steps = this.consumeFlowWheelDelta(deltaY);
    for (let index = 0; index < steps; index += 1) {
      const changed = direction > 0 ? this.advanceFlow() : this.rewindFlow();
      if (!changed) {
        this.resetFlowWheelAccumulator();
        break;
      }
    }
  }

  advanceFlow() {
    if (!this.latestStoryModel) {
      return false;
    }

    const flowStepCount = this.getFlowStepCount(this.latestStoryModel);
    const nextVisibleLineCount = Math.min(
      flowStepCount + 1,
      this.flowVisibleLineCount + 1
    );
    if (nextVisibleLineCount === this.flowVisibleLineCount) {
      return false;
    }

    this.pendingFlowAnimationLineIndex = this.getFlowAnimationLineIndex(this.latestStoryModel, nextVisibleLineCount);
    this.flowVisibleLineCount = nextVisibleLineCount;
    this.renderStoryModel(this.latestStoryModel);
    this.highlightSourceLine(this.activeLineNumber);
    return true;
  }

  rewindFlow() {
    if (!this.latestStoryModel) {
      return false;
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

  areFlowChoicesVisible() {
    return Boolean(this.latestStoryModel)
      && this.mode === "flow"
      && this.flowVisibleLineCount > this.getFlowStepCount(this.latestStoryModel);
  }

  getVisibleLines(storyModel) {
    if (this.mode !== "flow") {
      return storyModel.lines;
    }

    return storyModel.lines.filter((line) => this.isLineVisibleInFlow(line, storyModel));
  }

  shouldShowChoices(storyModel) {
    return this.mode !== "flow" || this.flowVisibleLineCount > this.getFlowStepCount(storyModel);
  }

  isLineVisibleInFlow(targetLine, storyModel) {
    return this.isLineVisibleInFlowForCount(targetLine, storyModel, this.flowVisibleLineCount);
  }

  getFlowStepCount(storyModel) {
    return storyModel.lines.filter((line) => line.kind !== "metadata").length;
  }

  getFlowAnimationLineIndex(storyModel, visibleLineCount) {
    if (visibleLineCount <= 0 || visibleLineCount > this.getFlowStepCount(storyModel)) {
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

  createFlowStoryElements(storyModel, visibleLines, animatedLineIndex) {
    const groupedLines = this.groupFlowLines(visibleLines);
    return [
      this.createTitleElement(storyModel, groupedLines.leadingMetadata),
      ...groupedLines.contentRows.map((row) => this.createLineElement(row.line, {
        animateBody: visibleLines.indexOf(row.line) === animatedLineIndex,
        attachedMetadataLines: row.metadataLines,
      })),
    ];
  }

  groupFlowLines(visibleLines) {
    const leadingMetadata = [];
    const contentRows = [];
    for (const line of visibleLines) {
      if (line.kind === "metadata") {
        const target = contentRows[contentRows.length - 1];
        if (target) {
          target.metadataLines.push(line);
        } else {
          leadingMetadata.push(line);
        }
        continue;
      }

      contentRows.push({
        line,
        metadataLines: [],
      });
    }

    return {
      contentRows,
      leadingMetadata,
    };
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
      sourceLine: Number(previewNode?.sourceLine || 0),
      title: previewNode?.title || this.documentModel?.title || "Untitled Node",
    };
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
      sourceLine,
      title: nodeTitle,
    };
  }

  findNodeForLine(lineNumber) {
    return (this.documentModel?.nodes || []).find(
      (node) => node.sourceLine <= lineNumber && lineNumber <= node.endLine
    ) || null;
  }

  findNodeByTitle(title) {
    return (this.documentModel?.nodes || []).find((node) => node.title === title) || null;
  }

  buildDocumentModelFromStoryGraph(storyGraphModel) {
    if (storyGraphModel?.provider !== "compiler-project" || !Array.isArray(storyGraphModel.nodes)) {
      return null;
    }

    const activeNodes = storyGraphModel.nodes.filter((node) => node.isInActiveDocument);
    const sourceNodes = activeNodes.length > 0 ? activeNodes : storyGraphModel.nodes;
    const nodes = sourceNodes
      .map((node, index) => {
        const title = node.title || "Untitled Node";
        const previewLines = this.requireCompilerPreviewLines(node, index, title);
        const sourceLine = Number(node.sourceLine || 0);
        if (!Number.isFinite(sourceLine) || sourceLine <= 0) {
          throw new Error(
            `Compiler story graph contract violation: node "${title}" at graph index ${index} has no valid sourceLine.`
          );
        }

        return {
          choices: Array.isArray(node.previewChoices) ? node.previewChoices : [],
          endLine: this.getCompilerNodeEndLine(node, previewLines),
          lines: previewLines,
          sourceLine,
          sourcePath: node.sourcePath || "",
          title,
        };
      });

    if (nodes.length === 0) {
      throw new Error("Compiler story graph contract violation: compiler-project provider returned no preview nodes for the active document.");
    }

    return {
      lineCount: 0,
      nodes,
      title: nodes[0]?.title || "Untitled Node",
    };
  }

  requireCompilerPreviewLines(node, index, title) {
    if (!Array.isArray(node.previewLines)) {
      throw new Error(
        `Compiler story graph contract violation: node "${title}" at graph index ${index} is missing the previewLines array.`
      );
    }

    const compilerLineCount = Array.isArray(node.lines) ? node.lines.length : 0;
    if (compilerLineCount > 0 && node.previewLines.length !== compilerLineCount) {
      throw new Error(
        `Compiler story graph contract violation: node "${title}" has ${compilerLineCount} compiler line(s) but ${node.previewLines.length} previewLines. Preview refuses to render draft fallback content because that would hide lost compiler data.`
      );
    }

    for (const [lineIndex, line] of node.previewLines.entries()) {
      if (Number(line?.sourceLine || 0) <= 0) {
        throw new Error(
          `Compiler story graph contract violation: node "${title}" previewLines[${lineIndex}] has no valid sourceLine.`
        );
      }
    }

    return node.previewLines;
  }

  getCompilerNodeEndLine(node, previewLines) {
    const lineNumbers = [
      Number(node.endLine || 0),
      Number(node.sourceLine || 0),
      ...previewLines.map((line) => Number(line?.sourceLine || 0)),
      ...this.getCompilerChoiceLineNumbers(node.previewChoices),
    ].filter((lineNumber) => Number.isFinite(lineNumber) && lineNumber > 0);
    return Math.max(...lineNumbers, 1);
  }

  getCompilerChoiceLineNumbers(previewChoices) {
    const lineNumbers = [];
    for (const group of Array.isArray(previewChoices) ? previewChoices : []) {
      lineNumbers.push(Number(group?.sourceLine || 0));
      for (const option of Array.isArray(group?.options) ? group.options : []) {
        lineNumbers.push(Number(option?.sourceLine || 0));
      }
    }

    return lineNumbers;
  }

  createTitleElement(storyModel, attachedMetadataLines = []) {
    const title = document.createElement("h1");
    title.className = "story-title";
    title.textContent = storyModel.title;
    this.appendMetadataTags(title, attachedMetadataLines);
    return title;
  }

  createLineElement(line, options = {}) {
    const paragraph = document.createElement("p");
    paragraph.className = "story-line";
    paragraph.dataset.sourceLine = String(line.sourceLine);
    if (line.kind === "metadata") {
      paragraph.classList.add("story-line-metadata");
      paragraph.removeAttribute("data-source-line");
      paragraph.append(this.createMetadataTagElement(line));
      return paragraph;
    }

    if (line.sourceLine > 0) {
      paragraph.addEventListener("click", () => this.notifySourceLineSelected(line.sourceLine));
    }

    if (line.speaker) {
      const speakerName = document.createElement("strong");
      speakerName.className = options.animateBody
        ? "story-speaker-name story-speaker-name-enter"
        : "story-speaker-name";
      speakerName.textContent = `${line.speaker}：`;
      paragraph.append(speakerName, document.createTextNode(" "));
    }

    const attachedMetadataLines = Array.isArray(options.attachedMetadataLines)
      ? options.attachedMetadataLines
      : [];
    if (options.animateBody) {
      paragraph.classList.add("story-line-typewriter");
      paragraph.append(this.createTypewriterBodyElement(line.text, attachedMetadataLines));
    } else {
      paragraph.append(...this.createTextFragments(line.text));
      this.appendMetadataTags(paragraph, attachedMetadataLines);
    }

    return paragraph;
  }

  createTypewriterBodyElement(text, attachedMetadataLines = []) {
    const body = document.createElement("span");
    body.className = "story-typewriter-body";
    const fullText = String(text || "");
    if (this.shouldReduceMotion() || fullText.length === 0) {
      body.classList.add("is-complete");
      body.append(...this.createTextFragments(fullText));
      this.appendMetadataTags(body, attachedMetadataLines);
      return body;
    }

    let cursor = 0;
    const step = () => {
      cursor += this.getTypewriterStepSize(fullText, cursor);
      if (cursor >= fullText.length) {
        body.classList.add("is-complete");
        body.replaceChildren(...this.createTextFragments(fullText));
        this.appendMetadataTags(body, attachedMetadataLines);
        this.clearTypewriterTimer();
        return;
      }

      body.textContent = fullText.slice(0, cursor);
      this.typewriterTimer = setTimeout(step, this.getTypewriterDelay(fullText[cursor - 1]));
    };

    this.typewriterTimer = setTimeout(step, 80);
    return body;
  }

  appendMetadataTags(parent, metadataLines) {
    for (const line of metadataLines) {
      parent.append(document.createTextNode(" "), this.createMetadataTagElement(line));
    }
  }

  shouldReduceMotion() {
    return typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  getTypewriterStepSize(text, cursor) {
    const char = text[cursor] || "";
    if (/[\s，。！？、,.!?;；:：]/.test(char)) {
      return 1;
    }

    return /[\u4e00-\u9fff]/.test(char) ? 1 : 2;
  }

  getTypewriterDelay(char) {
    if (/[。！？.!?]/.test(char || "")) {
      return 72;
    }

    if (/[，、,;；:：]/.test(char || "")) {
      return 46;
    }

    return 22;
  }

  clearTypewriterTimer() {
    if (this.typewriterTimer !== null) {
      clearTimeout(this.typewriterTimer);
      this.typewriterTimer = null;
    }
  }

  createMetadataTagElement(line) {
    const tag = document.createElement("span");
    tag.className = "story-metadata-tag";
    tag.textContent = String(line.text || "").replace(/^@+/, "").trim();
    return tag;
  }

  createTextFragments(text) {
    const fragments = [];
    const queryPattern = /\[[^\]\r\n]+\]/g;
    let cursor = 0;
    for (const match of String(text || "").matchAll(queryPattern)) {
      if (match.index > cursor) {
        fragments.push(document.createTextNode(text.slice(cursor, match.index)));
      }

      const queryToken = document.createElement("span");
      queryToken.className = "story-query-token";
      queryToken.textContent = match[0];
      fragments.push(queryToken);
      cursor = match.index + match[0].length;
    }

    if (cursor < String(text || "").length) {
      fragments.push(document.createTextNode(String(text || "").slice(cursor)));
    }

    return fragments.length > 0 ? fragments : [document.createTextNode(text || "")];
  }

  createChoicesElement(choices) {
    const list = document.createElement("div");
    list.className = "choice-list";
    const groups = this.normalizeChoiceGroups(choices);
    if (groups.length === 0) {
      list.classList.add("is-empty");
      return list;
    }

    for (const [groupIndex, group] of groups.entries()) {
      if (group.prompt) {
        const prompt = document.createElement("div");
        prompt.className = "choice-prompt";
        if (group.sourceLine > 0) {
          prompt.dataset.sourceLine = String(group.sourceLine);
          prompt.addEventListener("click", () => this.notifySourceLineSelected(group.sourceLine));
        }

        prompt.textContent = group.prompt;
        list.append(prompt);
      }

      for (const [optionIndex, choice] of group.options.entries()) {
        const button = document.createElement("button");
        button.className = "choice-button";
        button.type = "button";
        button.dataset.sourceLine = String(choice.sourceLine);
        button.addEventListener("click", (event) => {
          void this.selectChoice({
            ...choice,
            nodeTitle: choice.nodeTitle || group.nodeTitle || this.currentNodeTitle,
            runtimeAction: choice.runtimeAction || (
              group.kind === "jumpGroup"
                ? { type: "continue" }
                : {
                  groupIndex,
                  optionIndex,
                  type: "choose",
                }
            ),
          }, event);
        });

        const text = document.createElement("span");
        text.className = "choice-text";
        text.textContent = choice.text || "Continue";
        button.append(text);

        if (choice.target) {
          const target = document.createElement("small");
          target.className = "choice-target";
          target.textContent = choice.target;
          button.append(target);
        }

        list.append(button);
      }
    }

    return list;
  }

  normalizeChoiceGroups(choices) {
    if (!Array.isArray(choices) || choices.length === 0) {
      return [];
    }

    const compilerGroups = choices.filter((choice) => Array.isArray(choice.options));
    if (compilerGroups.length > 0) {
      return compilerGroups
        .map((group) => ({
          options: group.options || [],
          prompt: group.prompt || "",
          sourceLine: Number(group.sourceLine || 0),
        }))
        .filter((group) => group.options.length > 0);
    }

    return [
      {
        options: choices,
        prompt: "",
        sourceLine: 0,
      },
    ];
  }

  async selectChoice(choice, event = null) {
    event?.stopPropagation?.();
    if (await this.notifyChoiceSelected(choice)) {
      return;
    }

    const targetNode = this.findNodeByTitle(choice.target || "");
    if (targetNode) {
      this.flowVisibleLineCount = 0;
      const storyModel = this.createPreviewModelFromNode(targetNode);
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

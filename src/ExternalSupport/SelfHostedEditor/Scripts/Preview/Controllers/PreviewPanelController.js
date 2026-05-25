import { ScriptDocumentModelBuilder } from "../../ProjectWorkspace/Models/ScriptDocumentModelBuilder.js";

export class PreviewPanelController {
  constructor(previewElement, modeButtonElements = [], modeLabelElement = null) {
    this.previewElement = previewElement;
    this.modeButtonElements = Array.from(modeButtonElements);
    this.modeLabelElement = modeLabelElement;
    this.sourceLineSelectedHandlers = [];
    this.activeLineNumber = 1;
    this.flowVisibleLineCount = 0;
    this.mode = "static";
    this.currentNodeTitle = "";
    this.documentModel = null;
    this.latestStoryModel = null;
    this.storyGraphModel = null;
    this.scriptText = "";
    this.bindModeControls();
    this.previewElement.addEventListener("click", (event) => this.handlePreviewClick(event));
    this.updateModeControls();
  }

  onSourceLineSelected(handler) {
    this.sourceLineSelectedHandlers.push(handler);
  }

  render(scriptText, activeLineNumber = 1, storyGraphModel = null) {
    this.scriptText = scriptText;
    this.activeLineNumber = activeLineNumber;
    this.storyGraphModel = storyGraphModel;
    const draftDocumentModel = ScriptDocumentModelBuilder.build(scriptText);
    this.documentModel = this.buildDocumentModelFromStoryGraph(storyGraphModel, draftDocumentModel)
      || draftDocumentModel;
    const storyModel = this.buildPreviewModel(activeLineNumber);
    if (storyModel.nodeTitle !== this.currentNodeTitle) {
      this.flowVisibleLineCount = 0;
    }

    this.currentNodeTitle = storyModel.nodeTitle;
    this.latestStoryModel = storyModel;
    this.renderStoryModel(storyModel);
    this.highlightSourceLine(activeLineNumber);
  }

  renderStoryModel(storyModel) {
    const visibleLines = this.getVisibleLines(storyModel);
    const shouldShowChoices = this.shouldShowChoices(storyModel);
    this.previewElement.replaceChildren(
      this.createTitleElement(storyModel),
      ...visibleLines.map((line) => this.createLineElement(line)),
      this.createChoicesElement(shouldShowChoices ? storyModel.choices : [])
    );
    this.previewElement.dataset.previewMode = this.mode;
  }

  highlightSourceLine(lineNumber) {
    this.activeLineNumber = lineNumber;
    const activeNode = this.findNodeForLine(lineNumber);
    if (activeNode && activeNode.title !== this.currentNodeTitle) {
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

  advanceFlow() {
    if (!this.latestStoryModel) {
      return;
    }

    const nextVisibleLineCount = Math.min(
      this.latestStoryModel.lines.length + 1,
      this.flowVisibleLineCount + 1
    );
    if (nextVisibleLineCount === this.flowVisibleLineCount) {
      return;
    }

    this.flowVisibleLineCount = nextVisibleLineCount;
    this.renderStoryModel(this.latestStoryModel);
    this.highlightSourceLine(this.activeLineNumber);
  }

  getVisibleLines(storyModel) {
    if (this.mode !== "flow") {
      return storyModel.lines;
    }

    return storyModel.lines.slice(0, Math.min(storyModel.lines.length, this.flowVisibleLineCount));
  }

  shouldShowChoices(storyModel) {
    return this.mode !== "flow" || this.flowVisibleLineCount > storyModel.lines.length;
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
      title: previewNode?.title || this.documentModel?.title || "Untitled Node",
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

  buildDocumentModelFromStoryGraph(storyGraphModel, fallbackDocumentModel = null) {
    if (storyGraphModel?.provider !== "compiler-project" || !Array.isArray(storyGraphModel.nodes)) {
      return null;
    }

    const activeNodes = storyGraphModel.nodes.filter((node) => node.isInActiveDocument);
    const sourceNodes = activeNodes.length > 0 ? activeNodes : storyGraphModel.nodes;
    const fallbackNodesByTitle = new Map((fallbackDocumentModel?.nodes || [])
      .map((node) => [node.title, node]));
    const nodes = sourceNodes
      .map((node) => {
        const title = node.title || "Untitled Node";
        const fallbackNode = fallbackNodesByTitle.get(title) || null;
        const previewLines = Array.isArray(node.previewLines) ? node.previewLines : [];
        return {
          choices: Array.isArray(node.previewChoices) ? node.previewChoices : [],
          endLine: Number(node.endLine || fallbackNode?.endLine || node.sourceLine || 1),
          lines: previewLines.length > 0 ? previewLines : fallbackNode?.lines || [],
          sourceLine: Number(node.sourceLine || fallbackNode?.sourceLine || 1),
          sourcePath: node.sourcePath || fallbackNode?.sourcePath || "",
          title,
        };
      })
      .filter((node) => node.sourceLine > 0);

    if (nodes.length === 0) {
      return null;
    }

    return {
      lineCount: 0,
      nodes,
      title: nodes[0]?.title || "Untitled Node",
    };
  }

  createTitleElement(storyModel) {
    const title = document.createElement("h1");
    title.className = "story-title";
    title.textContent = storyModel.title;
    return title;
  }

  createLineElement(line) {
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
      speakerName.className = "story-speaker-name";
      speakerName.textContent = `${line.speaker}：`;
      paragraph.append(speakerName, document.createTextNode(" "));
    }

    paragraph.append(...this.createTextFragments(line.text));
    return paragraph;
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

    for (const group of groups) {
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

      for (const choice of group.options) {
        const button = document.createElement("button");
        button.className = "choice-button";
        button.type = "button";
        button.dataset.sourceLine = String(choice.sourceLine);
        button.addEventListener("click", (event) => this.selectChoice(choice, event));

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

  selectChoice(choice, event = null) {
    event?.stopPropagation?.();
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
}

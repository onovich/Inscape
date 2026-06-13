export class PreviewBlockRenderer {
  constructor({ onSourceLineSelected = () => {} } = {}) {
    this.onSourceLineSelected = onSourceLineSelected;
    this.typewriterTimer = null;
  }

  createTitleElement(storyModel, attachedMetadataLines = []) {
    const title = document.createElement("h1");
    title.className = "story-title";
    title.textContent = storyModel.title;
    this.appendMetadataTags(title, attachedMetadataLines);
    return title;
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
      paragraph.addEventListener("click", () => this.onSourceLineSelected(line.sourceLine));
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
    const sourceText = String(text || "");
    const queryPattern = /\[[^\]\r\n]+\]/g;
    let cursor = 0;
    for (const match of sourceText.matchAll(queryPattern)) {
      if (match.index > cursor) {
        fragments.push(document.createTextNode(sourceText.slice(cursor, match.index)));
      }

      const queryToken = document.createElement("span");
      queryToken.className = "story-query-token";
      queryToken.textContent = match[0];
      fragments.push(queryToken);
      cursor = match.index + match[0].length;
    }

    if (cursor < sourceText.length) {
      fragments.push(document.createTextNode(sourceText.slice(cursor)));
    }

    return fragments.length > 0 ? fragments : [document.createTextNode(text || "")];
  }
}

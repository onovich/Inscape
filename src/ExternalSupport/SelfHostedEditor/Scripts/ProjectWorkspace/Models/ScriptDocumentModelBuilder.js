export class ScriptDocumentModelBuilder {
  static build(scriptText, lineIdentityProvider = null) {
    const lines = scriptText.split(/\r?\n/);
    const nodes = [];
    const lineHints = [];
    const translatableLines = [];
    let currentNode = null;
    let currentBlockLineNumber = 0;
    let currentDialogueIdentityIndex = 0;
    let currentPromptIdentityIndex = 0;
    let currentChoiceIdentityIndex = 0;

    lines.forEach((line, index) => {
      const sourceLine = index + 1;
      const trimmed = line.trim();

      if (!trimmed) {
        return;
      }

      if (trimmed.startsWith("# ")) {
        currentBlockLineNumber = 0;
        currentDialogueIdentityIndex = 0;
        currentPromptIdentityIndex = 0;
        currentChoiceIdentityIndex = 0;
        currentNode = {
          title: trimmed.slice(2).trim(),
          sourceLine,
          stableIdentity: this.createPendingStableIdentity("node"),
          lines: [],
          choices: [],
          jumps: [],
        };
        nodes.push(currentNode);
        lineHints.push({
          blockLineNumber: 0,
          kind: "title",
          nodeTitle: currentNode.title,
          sourceLine,
          stableIdentity: currentNode.stableIdentity,
        });
        return;
      }

      if (!currentNode) {
        currentBlockLineNumber = 0;
        currentNode = {
          title: "Untitled Node",
          sourceLine: 1,
          stableIdentity: this.createPendingStableIdentity("node"),
          lines: [],
          choices: [],
          jumps: [],
        };
        nodes.push(currentNode);
        currentDialogueIdentityIndex = 0;
        currentPromptIdentityIndex = 0;
        currentChoiceIdentityIndex = 0;
      }

      if (trimmed.startsWith("- ")) {
        currentBlockLineNumber += 1;
        const choice = this.parseChoice(trimmed, sourceLine, currentBlockLineNumber, currentNode.title);
        choice.stableIdentity = this.resolveStableIdentity(lineIdentityProvider, currentNode.title, "choice", currentChoiceIdentityIndex);
        currentChoiceIdentityIndex += 1;
        currentNode.choices.push(choice);
        lineHints.push(this.createLineHint(choice));
        if (choice.text) {
          translatableLines.push({
            blockLineNumber: currentBlockLineNumber,
            kind: "choice",
            nodeTitle: currentNode.title,
            sourceLine,
            stableIdentity: choice.stableIdentity,
            text: choice.text,
          });
        }
        return;
      }

      if (trimmed.startsWith("? ")) {
        currentBlockLineNumber += 1;
        const text = trimmed.slice(2).trim();
        const prompt = {
          blockLineNumber: currentBlockLineNumber,
          kind: "prompt",
          nodeTitle: currentNode.title,
          sourceLine,
          stableIdentity: this.resolveStableIdentity(lineIdentityProvider, currentNode.title, "prompt", currentPromptIdentityIndex),
          text,
        };
        currentPromptIdentityIndex += 1;
        currentNode.lines.push(prompt);
        lineHints.push(this.createLineHint(prompt));
        translatableLines.push(prompt);
        return;
      }

      if (trimmed.startsWith("-> ")) {
        currentBlockLineNumber += 1;
        const jump = {
          blockLineNumber: currentBlockLineNumber,
          kind: "jump",
          nodeTitle: currentNode.title,
          sourceLine,
          stableIdentity: this.createUntrackedStableIdentity("line"),
          target: trimmed.slice(3).trim(),
          text: trimmed,
        };
        currentNode.jumps.push(jump);
        lineHints.push(this.createLineHint(jump));
        return;
      }

      if (trimmed.startsWith("@")) {
        currentBlockLineNumber += 1;
        const metadataLine = {
          blockLineNumber: currentBlockLineNumber,
          kind: "metadata",
          nodeTitle: currentNode.title,
          sourceLine,
          stableIdentity: this.createUntrackedStableIdentity("line"),
          tagName: this.parseMetadataTagName(trimmed),
          text: trimmed,
        };
        currentNode.lines.push(metadataLine);
        lineHints.push(this.createLineHint(metadataLine));
        return;
      }

      currentBlockLineNumber += 1;
      const dialogueLine = this.parseDialogueLine(trimmed, sourceLine, currentNode.title, currentBlockLineNumber);
      if (dialogueLine.kind === "dialogue") {
        dialogueLine.stableIdentity = this.resolveStableIdentity(lineIdentityProvider, currentNode.title, "dialogue", currentDialogueIdentityIndex);
        currentDialogueIdentityIndex += 1;
      } else {
        dialogueLine.stableIdentity = this.createUntrackedStableIdentity("line");
      }
      currentNode.lines.push(dialogueLine);
      lineHints.push(this.createLineHint(dialogueLine));
      translatableLines.push(dialogueLine);
    });

    this.applyNodeRanges(nodes, lines.length);
    this.applyIncomingReferenceCounts(nodes);

    return {
      lineCount: lines.length,
      lineHints,
      nodes,
      title: nodes[0]?.title || "Untitled Node",
      translatableLines,
    };
  }

  static parseDialogueLine(trimmed, sourceLine, nodeTitle, blockLineNumber) {
    const fullWidthColonIndex = trimmed.indexOf("：");
    const halfWidthColonIndex = trimmed.indexOf(":");
    const colonIndex = fullWidthColonIndex >= 0
      ? fullWidthColonIndex
      : halfWidthColonIndex;

    if (colonIndex < 0) {
      return {
        blockLineNumber,
        kind: "narration",
        nodeTitle,
        sourceLine,
        stableIdentity: this.createPendingStableIdentity("line"),
        text: trimmed,
      };
    }

    return {
      blockLineNumber,
      kind: "dialogue",
      nodeTitle,
      sourceLine,
      speaker: trimmed.slice(0, colonIndex).trim(),
      stableIdentity: this.createPendingStableIdentity("line"),
      text: trimmed.slice(colonIndex + 1).trim(),
    };
  }

  static parseChoice(trimmed, sourceLine, blockLineNumber, nodeTitle) {
    const body = trimmed.slice(2).trim();
    const [text, target] = body.split("->").map((part) => part.trim());
    return {
      blockLineNumber,
      kind: "choice",
      nodeTitle,
      sourceLine,
      stableIdentity: this.createPendingStableIdentity("line"),
      target: target || "",
      text,
    };
  }

  static parseMetadataTagName(trimmed) {
    const metadataText = trimmed.replace(/^@+/, "").trim();
    return metadataText.split(/\s+/)[0] || "metadata";
  }

  static createLineHint(line) {
    return {
      blockLineNumber: line.blockLineNumber,
      kind: line.kind,
      nodeTitle: line.nodeTitle,
      sourceLine: line.sourceLine,
      stableIdentity: line.stableIdentity,
    };
  }

  static createPendingStableIdentity(kind) {
    return {
      kind,
      label: kind === "node" ? "node id not loaded" : "line id not loaded",
      status: "not-loaded",
      value: "",
    };
  }

  static createUntrackedStableIdentity(kind) {
    return {
      kind,
      label: "not tracked",
      status: "untracked",
      value: "",
    };
  }

  static resolveStableIdentity(provider, nodeTitle, kind, index) {
    return provider?.getLineIdentity?.(nodeTitle, kind, index) || this.createPendingStableIdentity("line");
  }

  static applyNodeRanges(nodes, lineCount) {
    nodes.forEach((node, index) => {
      const nextNode = nodes[index + 1];
      node.endLine = nextNode ? Math.max(node.sourceLine, nextNode.sourceLine - 1) : lineCount;
    });
  }

  static applyIncomingReferenceCounts(nodes) {
    const counts = new Map(nodes.map((node) => [node.title, 0]));
    for (const node of nodes) {
      for (const edge of [...node.choices, ...node.jumps]) {
        if (!edge.target || !counts.has(edge.target)) {
          continue;
        }

        counts.set(edge.target, (counts.get(edge.target) || 0) + 1);
      }
    }

    for (const node of nodes) {
      node.incomingReferenceCount = counts.get(node.title) || 0;
    }
  }
}

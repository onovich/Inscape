export class PreviewChoiceRenderer {
  constructor({
    getCurrentNodeTitle = () => "",
    onChoiceSelected = () => {},
    onSourceLineSelected = () => {},
  } = {}) {
    this.getCurrentNodeTitle = getCurrentNodeTitle;
    this.onChoiceSelected = onChoiceSelected;
    this.onSourceLineSelected = onSourceLineSelected;
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
          prompt.addEventListener("click", () => this.onSourceLineSelected(group.sourceLine));
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
          void this.onChoiceSelected({
            ...choice,
            nodeTitle: choice.nodeTitle || group.nodeTitle || this.getCurrentNodeTitle(),
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
}

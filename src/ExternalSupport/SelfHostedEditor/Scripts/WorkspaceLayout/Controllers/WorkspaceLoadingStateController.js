export class WorkspaceLoadingStateController {
  constructor(scopeElements = {}) {
    this.scopeElements = new Map(Object.entries(scopeElements).filter((entry) => entry[1]));
  }

  setLoading(scopeName, label = "Loading") {
    const element = this.scopeElements.get(scopeName);
    if (!element) {
      return;
    }

    element.dataset.loadingState = "loading";
    element.dataset.loadingLabel = label;
    element.setAttribute("aria-busy", "true");
  }

  setIdle(scopeName) {
    const element = this.scopeElements.get(scopeName);
    if (!element) {
      return;
    }

    delete element.dataset.loadingState;
    delete element.dataset.loadingLabel;
    element.removeAttribute("aria-busy");
  }

  setError(scopeName, label = "Needs attention") {
    const element = this.scopeElements.get(scopeName);
    if (!element) {
      return;
    }

    element.dataset.loadingState = "error";
    element.dataset.loadingLabel = label;
    element.removeAttribute("aria-busy");
  }

  setManyLoading(scopeLabels) {
    for (const [scopeName, label] of Object.entries(scopeLabels)) {
      this.setLoading(scopeName, label);
    }
  }

  setManyIdle(scopeNames) {
    for (const scopeName of scopeNames) {
      this.setIdle(scopeName);
    }
  }
}

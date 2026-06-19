export class RuntimeErrorStatePanelController {
  constructor(panelElement) {
    this.panelElement = panelElement;
    this.lastInventoryModel = null;
  }

  render(inventoryModel) {
    this.lastInventoryModel = inventoryModel || null;
    if (!this.panelElement) {
      return this.lastInventoryModel;
    }

    this.panelElement.replaceChildren(this.createPanel(this.lastInventoryModel));
    this.panelElement.dataset.runtimeErrorState = this.getPanelState(this.lastInventoryModel);
    return this.lastInventoryModel;
  }

  getInventoryModel() {
    return this.lastInventoryModel;
  }

  createPanel(inventoryModel) {
    const shell = document.createElement("section");
    shell.className = "runtime-error-state-shell";
    shell.append(
      this.createHeader(inventoryModel),
      this.createSummary(inventoryModel),
      this.createSurfaceRows(inventoryModel),
      this.createDiagnostics(inventoryModel)
    );
    return shell;
  }

  createHeader(inventoryModel) {
    const header = document.createElement("div");
    header.className = "runtime-error-state-header";

    const titleGroup = document.createElement("div");
    titleGroup.className = "runtime-error-state-title";

    const title = document.createElement("h2");
    title.textContent = "Runtime States";

    const status = document.createElement("span");
    status.className = "runtime-error-state-status";
    status.dataset.inventoryState = this.getPanelState(inventoryModel);
    status.textContent = this.getPanelStateLabel(inventoryModel);

    titleGroup.append(title, status);

    const count = document.createElement("span");
    count.className = "runtime-error-state-count";
    count.textContent = `Surfaces ${inventoryModel?.surfaceCount ?? 0}`;

    header.append(titleGroup, count);
    return header;
  }

  createSummary(inventoryModel) {
    const summary = document.createElement("div");
    summary.className = "runtime-error-state-summary";
    for (const state of ["ready", "empty", "unavailable", "error", "stale", "blocked"]) {
      summary.append(this.createStatePill(state, inventoryModel?.states?.[state] ?? 0));
    }

    return summary;
  }

  createStatePill(state, count) {
    const pill = document.createElement("span");
    pill.className = "runtime-error-state-pill";
    pill.dataset.state = state;
    pill.textContent = `${formatStateLabel(state)} ${count}`;
    return pill;
  }

  createSurfaceRows(inventoryModel) {
    const list = document.createElement("div");
    list.className = "runtime-error-state-list";
    if (!Array.isArray(inventoryModel?.surfaces) || inventoryModel.surfaces.length === 0) {
      const empty = document.createElement("p");
      empty.className = "runtime-error-state-empty";
      empty.textContent = "Runtime surface inventory unavailable.";
      list.append(empty);
      return list;
    }

    for (const surface of inventoryModel.surfaces) {
      list.append(this.createSurfaceRow(surface));
    }

    return list;
  }

  createSurfaceRow(surface) {
    const row = document.createElement("article");
    row.className = "runtime-error-state-row";
    row.dataset.surfaceState = surface.state || "unavailable";

    const summary = document.createElement("div");
    summary.className = "runtime-error-state-row-summary";

    const nameGroup = document.createElement("div");
    nameGroup.className = "runtime-error-state-row-name";

    const name = document.createElement("strong");
    name.textContent = surface.label || surface.surface || "Runtime surface";

    const detail = document.createElement("span");
    detail.textContent = `${surface.suggestedFixCategory || "payload"} | diagnostics ${surface.diagnosticCount ?? 0}`;

    nameGroup.append(name, detail);

    const state = document.createElement("span");
    state.className = "runtime-error-state-row-state";
    state.textContent = formatStateLabel(surface.state || "unavailable");

    summary.append(nameGroup, state);
    row.append(summary);
    return row;
  }

  createDiagnostics(inventoryModel) {
    const section = document.createElement("section");
    section.className = "runtime-error-state-diagnostics";

    const title = document.createElement("h3");
    title.textContent = "Diagnostics";
    section.append(title);

    const diagnostics = Array.isArray(inventoryModel?.diagnostics)
      ? inventoryModel.diagnostics
      : [];
    if (diagnostics.length === 0) {
      const empty = document.createElement("p");
      empty.className = "runtime-error-state-empty";
      empty.textContent = "No runtime state diagnostics.";
      section.append(empty);
      return section;
    }

    for (const diagnostic of diagnostics.slice(0, 5)) {
      const item = document.createElement("p");
      item.className = "runtime-error-state-diagnostic";
      item.textContent = [
        diagnostic.surface,
        diagnostic.code,
        diagnostic.shortMessage,
      ].filter(Boolean).join(" | ");
      section.append(item);
    }

    if (diagnostics.length > 5) {
      const more = document.createElement("p");
      more.className = "runtime-error-state-empty";
      more.textContent = `+${diagnostics.length - 5} more diagnostic(s)`;
      section.append(more);
    }

    return section;
  }

  getPanelState(inventoryModel) {
    if (!inventoryModel) {
      return "unavailable";
    }

    if (inventoryModel.states?.error > 0) {
      return "error";
    }

    if (inventoryModel.states?.blocked > 0) {
      return "blocked";
    }

    if (inventoryModel.states?.stale > 0) {
      return "stale";
    }

    if ((inventoryModel.states?.unavailable ?? 0) > 0 || (inventoryModel.states?.empty ?? 0) > 0) {
      return "attention";
    }

    return "ready";
  }

  getPanelStateLabel(inventoryModel) {
    const state = this.getPanelState(inventoryModel);
    if (state === "ready") {
      return "All ready";
    }

    if (state === "attention") {
      return "Needs attention";
    }

    return formatStateLabel(state);
  }
}

function formatStateLabel(state) {
  return String(state || "")
    .split("-")
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : "")
    .join(" ");
}

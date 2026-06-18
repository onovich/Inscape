import { RuntimeActionAuthoringModelBuilder } from "../Models/RuntimeActionAuthoringModelBuilder.js";

export class RuntimeActionPanelController {
  constructor(panelElement) {
    this.panelElement = panelElement;
    this.resumeRuntimeHandlers = [];
    this.hostBindingCatalog = null;
    this.hostSchemaCatalog = null;
    this.lastOptions = {};
    this.lastAuthoringModel = RuntimeActionAuthoringModelBuilder.build();
    this.resumeStatus = {
      detail: "Action resume is available when Runtime has a pending wait or handoff.",
      state: "idle",
    };
  }

  onResumeRuntimeRequested(handler) {
    this.resumeRuntimeHandlers.push(handler);
  }

  render(hostSchemaCatalog, hostBindingCatalog, options = {}) {
    this.hostSchemaCatalog = hostSchemaCatalog || null;
    this.hostBindingCatalog = hostBindingCatalog || null;
    this.lastOptions = {
      runtimeSnapshot: options.runtimeSnapshot || null,
      sessionId: options.sessionId || "",
      workspaceRevision: options.workspaceRevision ?? null,
    };
    this.lastAuthoringModel = RuntimeActionAuthoringModelBuilder.build({
      hostBindingCatalog: this.hostBindingCatalog,
      hostSchemaCatalog: this.hostSchemaCatalog,
      runtimeSnapshot: this.lastOptions.runtimeSnapshot,
      sessionId: this.lastOptions.sessionId,
      workspaceRevision: this.lastOptions.workspaceRevision,
    });

    if (!this.panelElement) {
      return this.lastAuthoringModel;
    }

    this.panelElement.replaceChildren(this.createPanel(this.lastAuthoringModel));
    this.panelElement.dataset.runtimeActionState = this.getPanelState(this.lastAuthoringModel);
    return this.lastAuthoringModel;
  }

  getAuthoringModel() {
    return this.lastAuthoringModel;
  }

  createPanel(authoringModel) {
    const shell = document.createElement("section");
    shell.className = "runtime-action-shell";
    shell.append(
      this.createHeader(authoringModel),
      this.createToolbar(authoringModel),
      this.createRows(authoringModel),
      this.createRequestSection(authoringModel),
      this.createPendingSection(authoringModel)
    );
    return shell;
  }

  createHeader(authoringModel) {
    const header = document.createElement("div");
    header.className = "runtime-action-header";

    const titleGroup = document.createElement("div");
    titleGroup.className = "runtime-action-title";

    const title = document.createElement("h2");
    title.textContent = "Runtime Actions";

    const status = document.createElement("span");
    status.className = "runtime-action-runtime-status";
    status.dataset.runtimeState = authoringModel.runtime.ready ? "runtime-ready" : "unavailable";
    status.textContent = authoringModel.runtime.ready ? "Runtime ready" : "Runtime unavailable";

    titleGroup.append(title, status);

    const counts = document.createElement("div");
    counts.className = "runtime-action-counts";
    counts.append(
      this.createCountPill("Ready", authoringModel.handlerAvailableCount, "ready"),
      this.createCountPill("Missing", authoringModel.handlerMissingCount, "missing"),
      this.createCountPill("Pending", authoringModel.pendingCount, "pending"),
      this.createCountPill("Requests", authoringModel.requestCount, "requests")
    );

    header.append(titleGroup, counts);
    return header;
  }

  createCountPill(label, value, state) {
    const pill = document.createElement("span");
    pill.className = "runtime-action-count";
    pill.dataset.state = state;
    pill.textContent = `${label} ${value}`;
    return pill;
  }

  createToolbar(authoringModel) {
    const toolbar = document.createElement("div");
    toolbar.className = "runtime-action-toolbar";

    const detail = document.createElement("p");
    detail.className = "runtime-action-status";
    detail.dataset.statusState = this.resumeStatus.state;
    detail.textContent = this.getToolbarStatusText(authoringModel);

    toolbar.append(detail);
    return toolbar;
  }

  getToolbarStatusText(authoringModel) {
    if (!authoringModel.hostSchema.loaded) {
      return "Host Schema unavailable. Runtime action rows appear when actions[] is loaded.";
    }

    if (!authoringModel.hostBridge.loaded) {
      return "Host Bridge unavailable. Handler mappings are missing until bridge capabilities load.";
    }

    if (authoringModel.pendingAction?.blocksRuntimeControls) {
      return "Pending action blocks Runtime controls until a debug resume completes.";
    }

    if (this.resumeStatus.state === "resumed" || this.resumeStatus.state === "error") {
      return this.resumeStatus.detail;
    }

    return "Fire actions do not block Runtime controls. Wait and handoff actions expose pending debug resume controls.";
  }

  createRows(authoringModel) {
    const list = document.createElement("div");
    list.className = "runtime-action-list";

    if (authoringModel.rows.length === 0) {
      const empty = document.createElement("p");
      empty.className = "runtime-action-empty";
      empty.textContent = "No Host Schema actions found.";
      list.append(empty);
      return list;
    }

    for (const row of authoringModel.rows) {
      list.append(this.createRow(row));
    }

    return list;
  }

  createRow(row) {
    const rowElement = document.createElement("article");
    rowElement.className = "runtime-action-row";
    rowElement.dataset.rowState = row.state;
    rowElement.dataset.actionMode = row.mode;

    const summary = document.createElement("div");
    summary.className = "runtime-action-row-summary";

    const nameGroup = document.createElement("div");
    nameGroup.className = "runtime-action-row-name";

    const name = document.createElement("strong");
    name.textContent = row.name;

    const detail = document.createElement("span");
    detail.textContent = [
      row.mode,
      row.blocksRuntimeControls ? "blocks" : "non-blocking",
      `${row.parameterCount} parameter(s)`,
    ].join(" | ");

    nameGroup.append(name, detail);

    const state = document.createElement("span");
    state.className = "runtime-action-row-state";
    state.textContent = row.handlerAvailable ? "Mapped" : "Missing Handler";

    summary.append(nameGroup, state);
    rowElement.append(summary);

    const source = document.createElement("p");
    source.className = "runtime-action-row-source";
    source.textContent = row.handlerAvailable
      ? row.handlerLabel
      : "No Host Bridge action mapping.";
    rowElement.append(source);
    return rowElement;
  }

  createRequestSection(authoringModel) {
    const section = document.createElement("section");
    section.className = "runtime-action-requests";

    const title = document.createElement("h3");
    title.textContent = "Request Evidence";
    section.append(title);

    if (authoringModel.actionRequests.length === 0) {
      const empty = document.createElement("p");
      empty.className = "runtime-action-empty";
      empty.textContent = "No Runtime action requests recorded.";
      section.append(empty);
      return section;
    }

    for (const request of authoringModel.actionRequests) {
      const item = document.createElement("span");
      item.className = "runtime-action-request";
      item.textContent = `${request.requestId || "request"} ${request.name} ${request.mode}`;
      section.append(item);
    }

    return section;
  }

  createPendingSection(authoringModel) {
    const section = document.createElement("section");
    section.className = "runtime-action-pending";

    const title = document.createElement("h3");
    title.textContent = "Pending";
    section.append(title);

    if (!authoringModel.pendingAction) {
      const empty = document.createElement("p");
      empty.className = "runtime-action-empty";
      empty.textContent = "No pending Runtime action.";
      section.append(empty);
      return section;
    }

    const summary = document.createElement("p");
    summary.className = "runtime-action-pending-summary";
    summary.textContent = [
      authoringModel.pendingAction.requestId,
      authoringModel.pendingAction.name,
      authoringModel.pendingAction.mode,
      authoringModel.pendingAction.status,
    ].filter(Boolean).join(" | ");
    section.append(summary);

    const actions = document.createElement("div");
    actions.className = "runtime-action-resume-actions";
    for (const status of authoringModel.pendingAction.resumeStatuses) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "runtime-action-button";
      button.textContent = formatStatusLabel(status);
      button.disabled = !authoringModel.runtime.ready || !authoringModel.pendingAction.blocksRuntimeControls;
      button.addEventListener("click", () => {
        void this.resumePendingAction(status);
      });
      actions.append(button);
    }

    section.append(actions);
    return section;
  }

  async resumePendingAction(status) {
    const pendingAction = this.lastAuthoringModel.pendingAction;
    if (!pendingAction?.blocksRuntimeControls) {
      return;
    }

    const resumeAction = RuntimeActionAuthoringModelBuilder.buildResumeActionRequest(pendingAction, status);
    try {
      let result = null;
      for (const handler of this.resumeRuntimeHandlers) {
        result = await handler(resumeAction);
      }

      this.resumeStatus = {
        detail: result?.provider === "runtime-project"
          ? `${formatStatusLabel(status)} resume sent to Runtime preview.`
          : result?.error || "Runtime preview did not accept action resume.",
        state: result?.provider === "runtime-project" ? "resumed" : "error",
      };
      if (result?.provider === "runtime-project") {
        this.lastOptions.runtimeSnapshot = result;
      }
    } catch (error) {
      this.resumeStatus = {
        detail: error instanceof Error ? error.message : String(error),
        state: "error",
      };
    }

    this.render(this.hostSchemaCatalog, this.hostBindingCatalog, this.lastOptions);
  }

  getPanelState(authoringModel) {
    if (!authoringModel.hostSchema.loaded) {
      return "schema-unavailable";
    }

    if (!authoringModel.hostBridge.loaded) {
      return "bridge-unavailable";
    }

    if (authoringModel.pendingAction?.blocksRuntimeControls) {
      return "pending-blocking";
    }

    return authoringModel.runtime.ready ? "runtime-ready" : "runtime-unavailable";
  }
}

function formatStatusLabel(status) {
  return String(status || "")
    .split("-")
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : "")
    .join(" ");
}

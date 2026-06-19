export function createSelfHostedEditorDomBindings(documentRef = document) {
  const query = (selector) => documentRef.querySelector(selector);
  const queryAll = (selector) => documentRef.querySelectorAll(selector);

  return {
    clearLocalizationDraftsButtonElement: query(".localization-clear-drafts-button"),
    diagnosticsElement: query(".diagnostics-dock"),
    editorElement: query(".script-editor"),
    editorFrameElement: query(".editor-frame"),
    exportLocalizationButtonElement: query(".localization-export-button"),
    exportUpdatedLocalizationButtonElement: query(".localization-export-updated-button"),
    graphPanelElement: query(".graph-panel"),
    hintRailElement: query(".hint-rail"),
    hostCapabilityPanelElement: query(".host-capability-panel"),
    localizationFilterModeElement: query(".localization-filter-select"),
    localizationFilterSummaryElement: query(".localization-filter-summary"),
    localizationPanelElement: query(".localization-panel"),
    localizationPreviousCsvButtonElement: query(".localization-open-button"),
    localizationPreviousCsvInputElement: query(".localization-csv-input"),
    localizationPreviousCsvStatusElement: query(".localization-source-status"),
    localizationSessionStatusElement: query(".localization-session-status"),
    runtimeBranchEvidencePanelElement: query(".runtime-branch-evidence-panel"),
    runtimeErrorStatePanelElement: query(".runtime-error-state-panel"),
    runtimeLogBacklogPanelElement: query(".runtime-log-backlog-panel"),
    runtimeSubstatePanelElement: query(".runtime-substate-panel"),
    mockQueryPanelElement: query(".runtime-mock-query-panel"),
    nodeMapReviewButtonElement: query(".node-map-review-button"),
    outlinePanelElement: query(".document-outline-panel"),
    previewElement: query(".story-preview"),
    previewModeButtonElements: queryAll("[data-preview-mode]"),
    previewModeLabelElement: query("[data-preview-mode-label]"),
    replacePreviousLocalizationCsvButtonElement: query(".localization-replace-button"),
    runtimeActionPanelElement: query(".runtime-action-panel"),
    runtimePanelElement: query(".workspace-runtime-panel"),
    scriptFileInputElement: query(".script-file-input"),
    scriptSourceLabelElement: query(".script-source-label"),
    sessionPanelElement: query(".workspace-session-panel"),
    shell: query(".app-shell"),
    sidebarElement: query(".app-sidebar"),
    statusBarElement: query(".status-bar"),
    syntaxToggleElement: query("[data-syntax-toggle]"),
    workspaceFilePanelElement: query(".workspace-file-panel"),
    workspaceStatusElement: query(".workspace-status"),
    workspaceSummaryElement: query(".workspace-summary"),
  };
}

export function setupSidebarPanelToggles(sidebarElement) {
  if (!sidebarElement) {
    return;
  }

  for (const button of sidebarElement.querySelectorAll("[data-sidebar-toggle]")) {
    const panelName = button.dataset.sidebarToggle;
    const panelElement = button.closest("section");
    button.addEventListener("click", () => {
      const isCollapsed = !panelElement.classList.contains("is-collapsed");
      panelElement.classList.toggle("is-collapsed", isCollapsed);
      button.setAttribute("aria-expanded", String(!isCollapsed));
      if (panelName === "files") {
        sidebarElement.dataset.filesCollapsed = String(isCollapsed);
      }

      if (panelName === "outline") {
        sidebarElement.dataset.outlineCollapsed = String(isCollapsed);
      }
    });
  }
}

export function renderSelfHostedEditorStartupError(error, documentRef = document) {
  const workspaceStatusElement = documentRef.querySelector(".workspace-status");
  const editorElement = documentRef.querySelector(".script-editor");
  if (workspaceStatusElement) {
    workspaceStatusElement.textContent = "Default .inscape sample failed to load";
    workspaceStatusElement.dataset.loadingState = "error";
    workspaceStatusElement.dataset.loadingLabel = "Sample failed";
  }

  if (editorElement) {
    editorElement.textContent = error instanceof Error ? error.message : String(error);
    editorElement.dataset.loadingState = "error";
    editorElement.dataset.loadingLabel = "Could not open workspace";
  }
}

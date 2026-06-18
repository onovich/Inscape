export class HostCapabilityCatalogController {
  constructor({ panelElement, hostSchemaBridge, hostBindingBridge }) {
    this.panelElement = panelElement;
    this.hostSchemaBridge = hostSchemaBridge;
    this.hostBindingBridge = hostBindingBridge;
    this.sourceLineSelectedHandlers = [];
    this.latestHostSchemaCatalog = null;
    this.latestHostBindingCatalog = null;
  }

  onSourceLineSelected(handler) {
    this.sourceLineSelectedHandlers.push(handler);
  }

  async render(scriptText) {
    this.renderLoading();
    const [hostSchemaCatalog, hostBindingCatalog] = await Promise.all([
      this.hostSchemaBridge.getCapabilityCatalog(scriptText),
      this.hostBindingBridge.getCapabilityCatalog(scriptText),
    ]);
    this.latestHostSchemaCatalog = hostSchemaCatalog;
    this.latestHostBindingCatalog = hostBindingCatalog;

    this.panelElement.replaceChildren(
      this.createSummary(hostSchemaCatalog, hostBindingCatalog),
      this.createQuerySection(hostSchemaCatalog),
      this.createActionSection(hostSchemaCatalog),
      this.createEventSection(hostSchemaCatalog),
      this.createSpeakerSection(hostBindingCatalog),
      this.createBindingSection(hostBindingCatalog)
    );
    return {
      hostBindingCatalog,
      hostSchemaCatalog,
    };
  }

  getLatestHostSchemaCatalog() {
    return this.latestHostSchemaCatalog;
  }

  renderLoading() {
    const loading = document.createElement("div");
    loading.className = "host-capability-loading";
    loading.textContent = "Loading host capabilities";
    this.panelElement.replaceChildren(loading);
  }

  createSummary(hostSchemaCatalog, hostBindingCatalog) {
    const summary = document.createElement("section");
    summary.className = "host-capability-summary";
    summary.append(
      this.createSummaryCard("Host Schema", hostSchemaCatalog.hostSchema.loaded, hostSchemaCatalog.hostSchema.resolvedPath, hostSchemaCatalog.hostSchema.errorMessage),
      this.createSummaryCard("Host Bridge", hostBindingCatalog.hostBridge.loaded, hostBindingCatalog.hostBridge.resolvedPath, hostBindingCatalog.hostBridge.errorMessage)
    );
    return summary;
  }

  createSummaryCard(label, loaded, sourcePath, errorMessage) {
    const card = document.createElement("article");
    card.className = `host-capability-summary-card ${loaded ? "is-loaded" : "is-unavailable"}`;

    const title = document.createElement("strong");
    title.textContent = label;

    const status = document.createElement("span");
    status.textContent = loaded ? "loaded" : "unavailable";

    const detail = document.createElement("small");
    detail.textContent = sourcePath || errorMessage || "No configured source";
    detail.title = detail.textContent;

    card.append(title, status, detail);
    return card;
  }

  createQuerySection(catalog) {
    return this.createSection({
      emptyText: "No Host Schema queries found.",
      items: catalog.queries,
      renderItem: (query) => this.createQueryItem(query),
      title: "Queries",
    });
  }

  createEventSection(catalog) {
    return this.createSection({
      emptyText: "No legacy Host Schema events found.",
      items: catalog.events,
      renderItem: (event) => this.createEventItem(event),
      title: "Legacy Events",
    });
  }

  createActionSection(catalog) {
    return this.createSection({
      emptyText: "No Host Schema actions found.",
      items: catalog.actions,
      renderItem: (action) => this.createActionItem(action),
      title: "Actions",
    });
  }

  createSpeakerSection(catalog) {
    return this.createSection({
      emptyText: "No speakers found in Host Bridge or workspace dialogue.",
      items: catalog.speakers,
      renderItem: (speaker) => this.createSpeakerItem(speaker),
      title: "Speakers",
    });
  }

  createBindingSection(catalog) {
    return this.createSection({
      emptyText: "No Host Bridge timeline bindings found.",
      items: catalog.bindings,
      renderItem: (binding) => this.createBindingItem(binding),
      title: "Timeline Bindings",
    });
  }

  createSection({ emptyText, items, renderItem, title }) {
    const section = document.createElement("section");
    section.className = "host-capability-section";

    const header = document.createElement("div");
    header.className = "host-capability-section-header";

    const heading = document.createElement("h2");
    heading.textContent = title;

    const count = document.createElement("span");
    count.textContent = String(items.length);

    header.append(heading, count);
    section.append(header);

    if (items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "host-capability-empty";
      empty.textContent = emptyText;
      section.append(empty);
      return section;
    }

    const list = document.createElement("div");
    list.className = "host-capability-list";
    for (const item of items) {
      list.append(renderItem(item));
    }
    section.append(list);
    return section;
  }

  createQueryItem(query) {
    return this.createItem({
      detail: [
        query.returnType ? `returns ${query.returnType}` : "return type unspecified",
        query.isAsync ? "async" : "sync",
      ].join(" | "),
      locations: this.createSingleSourceLocation(query),
      meta: query.description,
      title: query.name,
    });
  }

  createEventItem(event) {
    return this.createItem({
      detail: [
        "legacy",
        event.delivery || "fire-and-forget",
        event.sideEffects ? "side effects" : "no side effects",
      ].join(" | "),
      locations: this.createSingleSourceLocation(event),
      meta: event.description,
      title: event.name,
    });
  }

  createActionItem(action) {
    return this.createItem({
      detail: [
        action.mode || "fire",
        action.idKind ? `id ${action.idKind}` : "",
      ].filter(Boolean).join(" | "),
      locations: this.createSingleSourceLocation(action),
      meta: action.description,
      title: action.name,
    });
  }

  createSpeakerItem(speaker) {
    return this.createItem({
      detail: speaker.roleId ? `roleId ${speaker.roleId}` : speaker.sourceLabel || "workspace speaker",
      locations: speaker.locations,
      meta: speaker.displayName,
      title: speaker.name,
    });
  }

  createBindingItem(binding) {
    return this.createItem({
      detail: [
        binding.kind,
        binding.assetId ? `asset ${binding.assetId}` : "",
        binding.addressableKey,
      ].filter(Boolean).join(" | "),
      locations: binding.locations,
      meta: binding.assetPath || binding.unityGuid,
      title: binding.name,
    });
  }

  createItem({ detail, locations, meta, title }) {
    const item = document.createElement("article");
    item.className = "host-capability-item";

    const main = document.createElement("div");
    main.className = "host-capability-item-main";

    const name = document.createElement("strong");
    name.textContent = title;

    const detailElement = document.createElement("span");
    detailElement.textContent = detail || "available";

    main.append(name, detailElement);
    item.append(main);

    if (meta) {
      const metaElement = document.createElement("p");
      metaElement.className = "host-capability-meta";
      metaElement.textContent = meta;
      item.append(metaElement);
    }

    const sourceList = this.createSourceList(locations);
    if (sourceList) {
      item.append(sourceList);
    }

    return item;
  }

  createSingleSourceLocation(item) {
    if (!item.sourcePath) {
      return [];
    }

    return [{
      character: Number(item.character || 0),
      length: Number(item.length || item.name?.length || 1),
      line: Number(item.line || 0),
      sourceKind: item.sourceKind || "",
      sourceLabel: item.sourceLabel || "",
      sourcePath: item.sourcePath,
    }];
  }

  createSourceList(locations) {
    const normalizedLocations = (Array.isArray(locations) ? locations : [])
      .filter((location) => location?.sourcePath);
    if (normalizedLocations.length === 0) {
      return null;
    }

    const sourceList = document.createElement("div");
    sourceList.className = "host-capability-sources";

    for (const location of normalizedLocations.slice(0, 3)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "host-capability-source";
      button.textContent = this.createSourceLabel(location);
      button.title = `${location.sourcePath}:${Number(location.line || 0) + 1}`;
      button.addEventListener("click", () => this.selectSourceLocation(location));
      sourceList.append(button);
    }

    if (normalizedLocations.length > 3) {
      const more = document.createElement("span");
      more.className = "host-capability-source-more";
      more.textContent = `+${normalizedLocations.length - 3}`;
      sourceList.append(more);
    }

    return sourceList;
  }

  createSourceLabel(location) {
    const sourceKind = location.sourceKind || location.sourceLabel || "source";
    const fileName = String(location.sourcePath || "").split(/[\\/]/).pop() || "source";
    return `${sourceKind} ${fileName}:${Number(location.line || 0) + 1}`;
  }

  selectSourceLocation(location) {
    for (const handler of this.sourceLineSelectedHandlers) {
      handler({
        column: Number(location.character || 0) + 1,
        length: Math.max(Number(location.length || 1), 1),
        lineNumber: Number(location.line || 0) + 1,
        sourcePath: location.sourcePath || "",
      });
    }
  }
}

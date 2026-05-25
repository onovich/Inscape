export class ScriptLineIdentityModelBuilder {
  static build(lineMap, currentFilePath) {
    const documents = this.getArray(lineMap, "documents");
    const document = documents.find((item) => this.pathsReferToSameDocument(this.getString(item, "sourcePath"), currentFilePath))
      || documents[0]
      || null;
    const identitiesByBlock = new Map();
    for (const block of this.getArray(document, "blocks")) {
      const linesByKind = new Map();
      for (const line of this.getArray(block, "lines")) {
        const kind = this.getString(line, "kind");
        if (!linesByKind.has(kind)) {
          linesByKind.set(kind, []);
        }

        linesByKind.get(kind).push({
          fingerprint: this.getString(line, "fingerprint"),
          kind,
          label: this.getString(line, "lineId"),
          lineId: this.getString(line, "lineId"),
          lineNumber: this.getNumber(line, "lineNumber"),
          status: this.getString(line, "lineId") ? "available" : "missing",
          text: this.getString(line, "text"),
        });
      }

      identitiesByBlock.set(this.getString(block, "blockTitle") || this.getString(block, "blockId"), linesByKind);
    }

    return {
      getLineIdentity: (nodeTitle, kind, index) => this.getLineIdentity(identitiesByBlock, nodeTitle, kind, index),
    };
  }

  static getLineIdentity(identitiesByBlock, nodeTitle, kind, index) {
    const mappedKind = this.mapLineKind(kind);
    if (!mappedKind) {
      return {
        kind,
        label: "not tracked",
        status: "untracked",
        value: "",
      };
    }

    const entries = identitiesByBlock.get(nodeTitle)?.get(mappedKind) || [];
    const entry = entries[index] || null;
    if (!entry?.lineId) {
      return {
        kind,
        label: "id missing",
        status: "missing",
        value: "",
      };
    }

    return {
      fingerprint: entry.fingerprint,
      kind,
      label: entry.lineId,
      status: "available",
      value: entry.lineId,
    };
  }

  static mapLineKind(kind) {
    if (kind === "dialogue") {
      return "dialogue";
    }

    if (kind === "prompt") {
      return "choice-prompt";
    }

    if (kind === "choice") {
      return "choice-option";
    }

    return "";
  }

  static getArray(source, camelName) {
    const value = source?.[camelName] ?? source?.[this.toPascalCase(camelName)];
    return Array.isArray(value) ? value : [];
  }

  static getNumber(source, camelName) {
    const value = source?.[camelName] ?? source?.[this.toPascalCase(camelName)];
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  static getString(source, camelName) {
    const value = source?.[camelName] ?? source?.[this.toPascalCase(camelName)];
    return typeof value === "string" ? value : "";
  }

  static toPascalCase(camelName) {
    return camelName ? camelName[0].toUpperCase() + camelName.slice(1) : camelName;
  }

  static pathsReferToSameDocument(left, right) {
    if (!left || !right) {
      return false;
    }

    const normalizedLeft = left.replace(/\\/g, "/");
    const normalizedRight = right.replace(/\\/g, "/");
    return normalizedLeft === normalizedRight
      || normalizedLeft.endsWith(`/${normalizedRight}`)
      || normalizedRight.endsWith(`/${normalizedLeft}`);
  }
}

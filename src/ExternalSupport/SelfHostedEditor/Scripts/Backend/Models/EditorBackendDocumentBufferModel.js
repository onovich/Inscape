export const EditorBackendDocumentBufferFormat = "inscape.self-hosted-editor.document-buffer";
export const EditorBackendDocumentBufferModelFormatVersion = 1;

export class EditorBackendDocumentBufferModel {
  static buildBuffer({
    active = false,
    dirty = false,
    diskTextHash = "",
    existsOnDisk = true,
    lastLoadedUtc = "",
    lastSavedRevision = null,
    relativePath = "",
    revision = 1,
    text = "",
  } = {}) {
    const normalizedRevision = normalizeRevision(revision);
    const normalizedDirty = Boolean(dirty);
    const normalizedLastSavedRevision = normalizeRevision(
      lastSavedRevision ?? (normalizedDirty ? 0 : normalizedRevision),
      0
    );
    return {
      active: Boolean(active),
      dirty: normalizedDirty,
      diskTextHash: String(diskTextHash || ""),
      existsOnDisk: Boolean(existsOnDisk),
      format: EditorBackendDocumentBufferFormat,
      formatVersion: EditorBackendDocumentBufferModelFormatVersion,
      lastLoadedUtc: normalizeTimestamp(lastLoadedUtc),
      lastSavedRevision: normalizedLastSavedRevision,
      relativePath: normalizeRelativePath(relativePath),
      revision: normalizedRevision,
      text: typeof text === "string" ? text : "",
    };
  }

  static buildSummary(documentBuffer = {}) {
    const normalized = documentBuffer.format === EditorBackendDocumentBufferFormat
      ? documentBuffer
      : this.buildBuffer(documentBuffer);
    return {
      dirty: Boolean(normalized.dirty),
      diskTextHash: String(normalized.diskTextHash || ""),
      existsOnDisk: Boolean(normalized.existsOnDisk),
      lastLoadedUtc: normalizeTimestamp(normalized.lastLoadedUtc),
      lastSavedRevision: normalizeRevision(normalized.lastSavedRevision, 0),
      relativePath: normalizeRelativePath(normalized.relativePath),
      revision: normalizeRevision(normalized.revision),
    };
  }
}

function normalizeRelativePath(relativePath) {
  return String(relativePath || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+/g, "/");
}

function normalizeRevision(revision, fallback = 1) {
  const value = Number(revision ?? fallback);
  if (!Number.isFinite(value) || value < fallback) {
    return fallback;
  }

  return Math.floor(value);
}

function normalizeTimestamp(timestamp) {
  return typeof timestamp === "string" ? timestamp : "";
}

export const EditorBackendDocumentBufferFormat = "inscape.self-hosted-editor.document-buffer";
export const EditorBackendDocumentBufferModelFormatVersion = 1;

export class EditorBackendDocumentBufferModel {
  static buildBuffer({
    active = false,
    dirty = false,
    diskTextHash = "",
    existsOnDisk = true,
    lastLoadedUtc = "",
    relativePath = "",
    revision = 1,
    text = "",
  } = {}) {
    return {
      active: Boolean(active),
      dirty: Boolean(dirty),
      diskTextHash: String(diskTextHash || ""),
      existsOnDisk: Boolean(existsOnDisk),
      format: EditorBackendDocumentBufferFormat,
      formatVersion: EditorBackendDocumentBufferModelFormatVersion,
      lastLoadedUtc: normalizeTimestamp(lastLoadedUtc),
      relativePath: normalizeRelativePath(relativePath),
      revision: normalizeRevision(revision),
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

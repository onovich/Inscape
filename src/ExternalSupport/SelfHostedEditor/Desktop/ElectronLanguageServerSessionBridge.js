import childProcess from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SelfHostedEditorElectronLanguageSessionKind = "long-lived";

export const SelfHostedEditorElectronLanguageSessionEndpoints = Object.freeze([
  "diagnostics",
  "completions",
  "definition",
  "references",
  "hover",
  "document-symbols",
]);

const defaultRequestTimeoutMilliseconds = 30000;
const defaultDisposeTimeoutMilliseconds = 1000;
const defaultErrorPreviewCharacterLimit = 4000;

export class SelfHostedEditorElectronLanguageServerSessionBridge {
  constructor(options = {}) {
    this.disposeTimeoutMilliseconds = normalizePositiveInteger(
      options.disposeTimeoutMilliseconds,
      defaultDisposeTimeoutMilliseconds
    );
    this.errorPreviewCharacterLimit = normalizePositiveInteger(
      options.errorPreviewCharacterLimit,
      defaultErrorPreviewCharacterLimit
    );
    this.invocation = options.invocation || null;
    this.invocationResolver = options.invocationResolver || resolveSelfHostedEditorElectronLanguageServerInvocation;
    this.requestTimeoutMilliseconds = normalizePositiveInteger(
      options.requestTimeoutMilliseconds,
      defaultRequestTimeoutMilliseconds
    );
    this.child = null;
    this.health = "not-started";
    this.lastError = null;
    this.latestDocumentRevision = 0;
    this.nextRequestId = 1;
    this.pendingRequests = new Map();
    this.startCount = 0;
    this.stderrChunks = [];
    this.stdoutBuffer = Buffer.alloc(0);
    this.syncedDocumentRevision = 0;
    this.tempRoot = "";
    this.workspaceRoot = "";
  }

  async ensureWorkspace(workspaceRoot, metadata = {}) {
    const normalizedWorkspaceRoot = normalizeWorkspaceRoot(workspaceRoot);
    this.noteDocumentRevision(metadata.documentRevision ?? metadata.revision);
    if (!normalizedWorkspaceRoot) {
      this.setError("workspace-root-required", "LanguageServer session requires an open workspace.");
      return this.getStatus();
    }

    if (this.workspaceRoot && this.workspaceRoot !== normalizedWorkspaceRoot) {
      await this.dispose({
        keepStatus: true,
        reason: "workspace-switched",
      });
    }

    this.workspaceRoot = normalizedWorkspaceRoot;
    this.ensureStarted();
    if (this.child && this.syncedDocumentRevision === 0) {
      this.syncedDocumentRevision = this.latestDocumentRevision;
    }
    return this.getStatus();
  }

  async run(kind, payload = {}, options = {}) {
    await this.ensureWorkspace(options.workspaceRoot || this.workspaceRoot, {
      documentRevision: payload.documentRevision,
    });
    if (!this.child) {
      throw new Error(this.lastError?.message || "LanguageServer session is unavailable.");
    }

    const override = await this.prepareActiveDocumentOverride(payload);
    const commonProjectParams = {
      overrideContentPath: override.contentPath,
      overrideSourcePath: override.sourcePath,
      rootPath: this.workspaceRoot,
    };
    let result;
    if (kind === "diagnostics") {
      result = await this.request("inscape/diagnoseProject", commonProjectParams);
    } else if (kind === "completions") {
      result = await this.request("inscape/completionProject", commonProjectParams);
    } else if (kind === "definition") {
      result = await this.request("inscape/definitionProject", {
        ...commonProjectParams,
        target: readQueryValue(payload, "definitionName", "target"),
      });
    } else if (kind === "references") {
      result = await this.request("inscape/referencesProject", {
        ...commonProjectParams,
        target: readQueryValue(payload, "referenceName", "target"),
      });
    } else if (kind === "hover") {
      result = await this.request("inscape/hoverProject", {
        ...commonProjectParams,
        kind: readQueryValue(payload, "hoverKind", "kind") || "node",
        target: readQueryValue(payload, "hoverName", "target"),
      });
    } else if (kind === "document-symbols") {
      result = replaceDocumentSymbolSourcePath(
        await this.request("inscape/documentSymbolsFile", {
          sourcePath: override.contentPath,
        }),
        override.sourcePath
      );
    } else {
      throw new Error(`Unsupported LanguageServer session command: ${kind}`);
    }

    this.health = "ready";
    this.lastError = null;
    this.syncedDocumentRevision = Math.max(this.syncedDocumentRevision, override.documentRevision);
    return result;
  }

  async diagnoseProject(rootPath) {
    await this.ensureWorkspace(rootPath);
    return await this.request("inscape/diagnoseProject", {
      rootPath: this.workspaceRoot,
    });
  }

  async documentSymbolsFile(sourcePath) {
    this.ensureStarted();
    return await this.request("inscape/documentSymbolsFile", {
      sourcePath,
    });
  }

  async dispose(options = {}) {
    const activeChild = this.child;
    if (activeChild) {
      try {
        await Promise.race([
          this.request("shutdown", {}),
          delay(this.disposeTimeoutMilliseconds),
        ]);
      } catch {
        // Shutdown is best-effort. The process is killed below if it is still alive.
      }

      if (this.child === activeChild) {
        this.writeMessage({
          jsonrpc: "2.0",
          method: "exit",
        });
        activeChild.kill();
        this.child = null;
      }
    }

    this.rejectPending(new Error("LanguageServer session disposed."));
    this.stdoutBuffer = Buffer.alloc(0);
    this.stderrChunks = [];
    await this.cleanupTempRoot();
    this.syncedDocumentRevision = 0;
    if (!options.keepStatus) {
      this.workspaceRoot = "";
      this.health = "disposed";
      this.lastError = null;
    } else {
      this.health = "not-started";
      this.lastError = options.reason
        ? {
          code: options.reason,
          message: options.reason,
        }
        : null;
    }
    this.startCount = 0;
  }

  getProcessId() {
    return this.child?.pid || 0;
  }

  getStatus(extra = {}) {
    const latestRevision = normalizeNonNegativeInteger(
      extra.latestDocumentRevision ?? this.latestDocumentRevision
    );
    const syncedRevision = normalizeNonNegativeInteger(this.syncedDocumentRevision);
    return {
      documentRevisionLag: Math.max(0, latestRevision - syncedRevision),
      health: this.health,
      kind: SelfHostedEditorElectronLanguageSessionKind,
      lastError: normalizeErrorSummary(this.lastError),
      restartCount: Math.max(0, this.startCount - 1),
      staleReason: this.health === "ready" ? "" : this.health,
      supportedEndpoints: [...SelfHostedEditorElectronLanguageSessionEndpoints],
    };
  }

  noteDocumentRevision(revision) {
    const normalizedRevision = normalizeNonNegativeInteger(revision);
    if (normalizedRevision > this.latestDocumentRevision) {
      this.latestDocumentRevision = normalizedRevision;
    }
  }

  async prepareActiveDocumentOverride(payload = {}) {
    const workspace = payload.workspace || {};
    const activeRelativePath = normalizeRelativePath(
      payload.activeRelativePath
        || workspace.activeRelativePath
        || workspace.currentFilePath
        || workspace.documents?.[0]?.relativePath
        || ""
    );
    const activeDocument = Array.isArray(workspace.documents)
      ? workspace.documents.find((document) => normalizeRelativePath(document.relativePath) === activeRelativePath)
      : null;
    const scriptText = typeof activeDocument?.text === "string"
      ? activeDocument.text
      : String(payload.scriptText || "");
    const documentRevision = normalizeNonNegativeInteger(
      activeDocument?.revision
        ?? payload.documentRevision
        ?? workspace.documentRevision
        ?? workspace.revision
    );
    this.noteDocumentRevision(documentRevision);

    const sourcePath = resolveInsideRoot(this.workspaceRoot, activeRelativePath);
    const tempRoot = await this.ensureTempRoot();
    const contentPath = resolveInsideRoot(tempRoot, activeRelativePath || "active.inscape");
    await fsp.mkdir(path.dirname(contentPath), {
      recursive: true,
    });
    await fsp.writeFile(contentPath, scriptText, "utf8");

    return {
      activeRelativePath,
      contentPath,
      documentRevision,
      sourcePath,
    };
  }

  ensureStarted() {
    if (this.child) {
      return;
    }

    const invocation = this.resolveInvocation();
    if (!invocation.available) {
      this.setError(invocation.reason || "language-server-invocation-unavailable", invocation.message || "LanguageServer invocation is unavailable.");
      return;
    }

    const child = childProcess.spawn(invocation.command, invocation.args, {
      cwd: invocation.cwd,
      windowsHide: true,
    });
    this.child = child;
    this.startCount += 1;
    this.health = "starting";
    this.lastError = null;
    child.stdout.on("data", (chunk) => {
      if (this.child !== child) {
        return;
      }

      this.stdoutBuffer = Buffer.concat([this.stdoutBuffer, Buffer.from(chunk)]);
      this.consumeStdoutMessages();
    });
    child.stderr.on("data", (chunk) => {
      if (this.child !== child) {
        return;
      }

      this.stderrChunks.push(Buffer.from(chunk));
    });
    child.on("error", (error) => {
      if (this.child !== child) {
        return;
      }

      this.setError("language-server-process-error", error.message || String(error));
      this.rejectPending(error);
    });
    child.on("exit", (code, signal) => {
      if (this.child !== child) {
        return;
      }

      const message = `LanguageServer session exited with code ${code ?? "unknown"}${signal ? ` and signal ${signal}` : ""}. ${this.getStderrPreview()}`.trim();
      this.setError("language-server-process-exited", message);
      this.rejectPending(new Error(message));
      this.child = null;
    });
    this.health = "ready";
  }

  resolveInvocation() {
    if (!this.invocation) {
      this.invocation = this.invocationResolver(["--stdio"]);
    }

    return normalizeInvocation(this.invocation);
  }

  async request(method, params = {}) {
    this.ensureStarted();
    if (!this.child) {
      throw new Error(this.lastError?.message || `LanguageServer session could not start for ${method}.`);
    }

    const id = this.nextRequestId;
    this.nextRequestId += 1;
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        const error = new Error(`LanguageServer session request timed out: ${method}`);
        this.setError("language-server-request-timeout", error.message);
        reject(error);
      }, this.requestTimeoutMilliseconds);
      this.pendingRequests.set(id, {
        method,
        reject,
        resolve,
        timeout,
      });
      this.writeMessage({
        id,
        jsonrpc: "2.0",
        method,
        params,
      });
    });
  }

  writeMessage(message) {
    if (!this.child?.stdin) {
      return;
    }

    const body = Buffer.from(JSON.stringify(message), "utf8");
    const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "ascii");
    this.child.stdin.write(Buffer.concat([header, body]));
  }

  consumeStdoutMessages() {
    while (true) {
      const headerEnd = this.stdoutBuffer.indexOf("\r\n\r\n");
      if (headerEnd < 0) {
        return;
      }

      const headerText = this.stdoutBuffer.slice(0, headerEnd).toString("ascii");
      const lengthMatch = /Content-Length:\s*(\d+)/i.exec(headerText);
      if (!lengthMatch) {
        this.failSession(new Error("LanguageServer session response is missing Content-Length."));
        return;
      }

      const contentLength = Number(lengthMatch[1]);
      const bodyStart = headerEnd + 4;
      const messageEnd = bodyStart + contentLength;
      if (this.stdoutBuffer.length < messageEnd) {
        return;
      }

      const bodyText = this.stdoutBuffer.slice(bodyStart, messageEnd).toString("utf8");
      this.stdoutBuffer = this.stdoutBuffer.slice(messageEnd);
      try {
        this.handleResponseMessage(JSON.parse(bodyText));
      } catch (error) {
        this.failSession(error instanceof Error ? error : new Error(String(error)));
        return;
      }
    }
  }

  handleResponseMessage(message) {
    const pending = this.pendingRequests.get(message.id);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(message.id);
    if (message.error) {
      const error = new Error(message.error.message || `LanguageServer session request failed: ${pending.method}`);
      this.setError("language-server-request-failed", error.message);
      pending.reject(error);
      return;
    }

    pending.resolve(message.result);
  }

  rejectPending(error) {
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }

    this.pendingRequests.clear();
  }

  failSession(error) {
    this.setError("language-server-protocol-error", error.message || String(error));
    this.rejectPending(error);
    this.stdoutBuffer = Buffer.alloc(0);
    if (this.child) {
      this.child.kill();
      this.child = null;
    }
  }

  setError(code, message) {
    this.health = code === "language-server-invocation-unavailable" ? "unavailable" : "error";
    this.lastError = {
      code,
      message: String(message || code).slice(0, this.errorPreviewCharacterLimit),
    };
  }

  getStderrPreview() {
    const text = Buffer.concat(this.stderrChunks).toString("utf8").trim();
    return text.length > this.errorPreviewCharacterLimit
      ? `${text.slice(0, this.errorPreviewCharacterLimit)}...`
      : text;
  }

  async ensureTempRoot() {
    if (!this.tempRoot) {
      this.tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "inscape-electron-language-session-"));
    }

    return this.tempRoot;
  }

  async cleanupTempRoot() {
    if (!this.tempRoot) {
      return;
    }

    const tempRoot = this.tempRoot;
    this.tempRoot = "";
    await fsp.rm(tempRoot, {
      force: true,
      recursive: true,
    });
  }
}

export function createSelfHostedEditorElectronLanguageServerSessionBridge(options = {}) {
  return new SelfHostedEditorElectronLanguageServerSessionBridge(options);
}

export function resolveSelfHostedEditorElectronLanguageServerInvocation(languageServerArgs = []) {
  const desktopRoot = path.dirname(fileURLToPath(import.meta.url));
  const moduleRoot = path.resolve(desktopRoot, "..");
  const repoRoot = path.resolve(moduleRoot, "..", "..", "..");
  const languageServerProjectPath = path.join(
    repoRoot,
    "src",
    "Internal",
    "LanguageServer",
    "Inscape.LanguageServer.csproj"
  );
  const languageServerBinRoot = path.join(
    repoRoot,
    "src",
    "Internal",
    "LanguageServer",
    "bin",
    "Debug",
    "net10.0"
  );
  const languageServerExePath = path.join(languageServerBinRoot, "Inscape.LanguageServer.exe");
  const languageServerDllPath = path.join(languageServerBinRoot, "Inscape.LanguageServer.dll");
  const args = Array.isArray(languageServerArgs) ? languageServerArgs : [];

  if (fs.existsSync(languageServerExePath)) {
    return {
      args,
      available: true,
      command: languageServerExePath,
      cwd: repoRoot,
    };
  }

  if (fs.existsSync(languageServerDllPath)) {
    return {
      args: [
        languageServerDllPath,
        ...args,
      ],
      available: true,
      command: "dotnet",
      cwd: repoRoot,
    };
  }

  if (fs.existsSync(languageServerProjectPath)) {
    return {
      args: [
        "run",
        "--no-restore",
        "--project",
        languageServerProjectPath,
        "--",
        ...args,
      ],
      available: true,
      command: "dotnet",
      cwd: repoRoot,
    };
  }

  return {
    args: [],
    available: false,
    command: "",
    cwd: repoRoot,
    message: "Inscape.LanguageServer project or build artifact was not found from the SelfHostedEditor Electron package.",
    reason: "language-server-invocation-unavailable",
  };
}

function normalizeInvocation(invocation = {}) {
  if (invocation.available === false) {
    return invocation;
  }

  const command = String(invocation.command || "").trim();
  if (!command) {
    return {
      ...invocation,
      available: false,
      message: "LanguageServer invocation is missing a command.",
      reason: "language-server-invocation-unavailable",
    };
  }

  return {
    args: Array.isArray(invocation.args) ? invocation.args.map(String) : [],
    available: true,
    command,
    cwd: invocation.cwd || process.cwd(),
  };
}

function replaceDocumentSymbolSourcePath(payload, sourcePath) {
  if (!payload || !Array.isArray(payload.symbols)) {
    return payload;
  }

  return {
    ...payload,
    symbols: payload.symbols.map((symbol) => ({
      ...symbol,
      location: symbol?.location
        ? {
          ...symbol.location,
          sourcePath,
        }
        : symbol?.location,
    })),
  };
}

function readQueryValue(payload, primaryName, fallbackName) {
  return String(
    payload?.[primaryName]
      || payload?.query?.[primaryName]
      || payload?.[fallbackName]
      || payload?.query?.[fallbackName]
      || ""
  );
}

function resolveInsideRoot(rootPath, relativePath) {
  const root = path.resolve(normalizeWorkspaceRoot(rootPath));
  const normalizedRelativePath = normalizeRelativePath(relativePath);
  if (!root || !normalizedRelativePath) {
    throw new Error("LanguageServer workspace path requires a root and relative path.");
  }

  const resolved = path.resolve(root, ...normalizedRelativePath.split("/").filter(Boolean));
  const relativeToRoot = path.relative(root, resolved);
  if (!relativeToRoot || relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    throw new Error(`LanguageServer workspace path escapes root: ${normalizedRelativePath}`);
  }

  return resolved;
}

function normalizeErrorSummary(error) {
  if (!error) {
    return null;
  }

  return {
    code: String(error.code || ""),
    message: String(error.message || "Unknown LanguageServer session error.").slice(0, 240),
  };
}

function normalizeNonNegativeInteger(value) {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return 0;
  }

  return Math.floor(numericValue);
}

function normalizePositiveInteger(value, fallback) {
  const numericValue = Number(value ?? fallback);
  if (!Number.isFinite(numericValue) || numericValue < 1) {
    return fallback;
  }

  return Math.floor(numericValue);
}

function normalizeRelativePath(relativePath) {
  return String(relativePath || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+/g, "/")
    .replace(/\/+$/g, "");
}

function normalizeWorkspaceRoot(workspaceRoot) {
  return String(workspaceRoot || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "");
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, Number(milliseconds) || 0));
  });
}

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
    this.invocationResolverOptions = options.invocationResolverOptions || {
      moduleRoot: options.moduleRoot,
      packaged: options.packaged,
      repoRoot: options.repoRoot,
      resourcesRoot: options.resourcesRoot,
    };
    this.invocationResolver = options.invocationResolver || resolveSelfHostedEditorElectronLanguageServerInvocation;
    this.requestTimeoutMilliseconds = normalizePositiveInteger(
      options.requestTimeoutMilliseconds,
      defaultRequestTimeoutMilliseconds
    );
    this.child = null;
    this.health = "not-started";
    this.fallbackCount = 0;
    this.fallbackReason = "";
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

    const override = await this.prepareActiveDocumentOverride(payload);
    const commonProjectParams = {
      overrideContentPath: override.contentPath,
      overrideSourcePath: override.sourcePath,
      rootPath: this.workspaceRoot,
    };
    try {
      if (!this.child) {
        throw new Error(this.lastError?.message || "LanguageServer session is unavailable.");
      }

      const result = await this.runLongLivedLanguageRequest(kind, payload, commonProjectParams, override);
      this.markLanguageRequestSucceeded(override, "ready");
      return result;
    } catch (error) {
      return await this.runProcessPerRequestFallback(kind, payload, override, error);
    }
  }

  async diagnoseProject(rootPath) {
    await this.ensureWorkspace(rootPath);
    return await this.request("inscape/diagnoseProject", {
      rootPath: this.workspaceRoot,
    });
  }

  async runLongLivedLanguageRequest(kind, payload, commonProjectParams, override) {
    if (kind === "diagnostics") {
      return await this.request("inscape/diagnoseProject", commonProjectParams);
    }

    if (kind === "completions") {
      return await this.request("inscape/completionProject", commonProjectParams);
    }

    if (kind === "definition") {
      return await this.request("inscape/definitionProject", {
        ...commonProjectParams,
        target: readQueryValue(payload, "definitionName", "target"),
      });
    }

    if (kind === "references") {
      return await this.request("inscape/referencesProject", {
        ...commonProjectParams,
        target: readQueryValue(payload, "referenceName", "target"),
      });
    }

    if (kind === "hover") {
      return await this.request("inscape/hoverProject", {
        ...commonProjectParams,
        kind: readQueryValue(payload, "hoverKind", "kind") || "node",
        target: readQueryValue(payload, "hoverName", "target"),
      });
    }

    if (kind === "document-symbols") {
      return replaceDocumentSymbolSourcePath(
        await this.request("inscape/documentSymbolsFile", {
          sourcePath: override.contentPath,
        }),
        override.sourcePath
      );
    }

    throw new Error(`Unsupported LanguageServer session command: ${kind}`);
  }

  async runProcessPerRequestFallback(kind, payload, override, cause) {
    this.stopActiveSessionAfterFailure(cause);
    const fallbackArgs = buildProcessPerRequestLanguageServerArgs(kind, payload, this.workspaceRoot, override);
    const fallbackInvocation = normalizeInvocation(this.invocationResolver(fallbackArgs, this.invocationResolverOptions));
    this.fallbackCount += 1;
    this.fallbackReason = normalizeFallbackReason(cause, fallbackInvocation);
    if (!fallbackInvocation.available) {
      this.setError(
        fallbackInvocation.reason || "language-server-fallback-unavailable",
        fallbackInvocation.message || "LanguageServer process-per-request fallback is unavailable."
      );
      throw cause instanceof Error ? cause : new Error(String(cause || this.lastError?.message || "LanguageServer fallback is unavailable."));
    }

    try {
      const result = await runLanguageServerProcessInvocation(fallbackInvocation, {
        errorPreviewCharacterLimit: this.errorPreviewCharacterLimit,
        timeoutMilliseconds: this.requestTimeoutMilliseconds,
      });
      this.health = "fallback";
      this.lastError = normalizeErrorSummaryObject(cause, this.fallbackReason);
      this.syncedDocumentRevision = Math.max(this.syncedDocumentRevision, override.documentRevision);
      return kind === "document-symbols"
        ? replaceDocumentSymbolSourcePath(result, override.sourcePath)
        : result;
    } catch (error) {
      this.setError("language-server-fallback-failed", error.message || String(error));
      throw error;
    }
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
      this.fallbackReason = "";
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
    this.fallbackCount = 0;
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
    const invocation = this.invocation ? normalizeInvocation(this.invocation) : null;
    return {
      artifactHealth: resolveArtifactHealth(invocation, this.health),
      artifactKind: invocation?.artifactKind || "unresolved",
      documentRevisionLag: Math.max(0, latestRevision - syncedRevision),
      fallbackCount: this.fallbackCount,
      fallbackKind: "process-per-request",
      fallbackReason: this.fallbackReason,
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

  markLanguageRequestSucceeded(override, health) {
    this.health = health;
    this.fallbackReason = "";
    this.lastError = null;
    this.syncedDocumentRevision = Math.max(this.syncedDocumentRevision, override.documentRevision);
  }

  stopActiveSessionAfterFailure(error) {
    if (this.child) {
      this.child.kill();
      this.child = null;
    }

    this.rejectPending(error instanceof Error ? error : new Error(String(error || "LanguageServer session failed.")));
    this.stdoutBuffer = Buffer.alloc(0);
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
      this.invocation = this.invocationResolver(["--stdio"], this.invocationResolverOptions);
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
    this.health = isUnavailableErrorCode(code) ? "unavailable" : "error";
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

export function resolveSelfHostedEditorElectronLanguageServerInvocation(languageServerArgs = [], options = {}) {
  const desktopRoot = path.resolve(options.desktopRoot || path.dirname(fileURLToPath(import.meta.url)));
  const moduleRoot = path.resolve(options.moduleRoot || path.join(desktopRoot, ".."));
  const repoRoot = path.resolve(options.repoRoot || path.join(moduleRoot, "..", "..", ".."));
  const resourcesRoot = path.resolve(options.resourcesRoot || process.resourcesPath || path.join(moduleRoot, "dist", "win-unpacked", "resources"));
  const args = Array.isArray(languageServerArgs) ? languageServerArgs : [];
  const packaged = options.packaged === true;

  if (packaged) {
    return resolveLanguageServerArtifactInvocation({
      args,
      artifactRoot: path.join(resourcesRoot, "language-server"),
      artifactKindPrefix: "packaged",
      cwd: path.join(resourcesRoot, "language-server"),
      missingMessage: "Packaged Inscape.LanguageServer artifact is missing from resources/language-server.",
      missingReason: "language-server-packaged-artifact-missing",
    });
  }

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
  const artifactInvocation = resolveLanguageServerArtifactInvocation({
    args,
    artifactRoot: languageServerBinRoot,
    artifactKindPrefix: "dev-build",
    cwd: repoRoot,
    missingMessage: "Inscape.LanguageServer dev build artifact is missing.",
    missingReason: "language-server-dev-artifact-missing",
  });

  if (artifactInvocation.available) {
    return artifactInvocation;
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
      artifactHealth: "available",
      artifactKind: "dev-project",
      available: true,
      command: "dotnet",
      cwd: repoRoot,
    };
  }

  return {
    args: [],
    artifactHealth: "missing",
    artifactKind: "dev-missing",
    available: false,
    command: "",
    cwd: repoRoot,
    message: "Inscape.LanguageServer project or build artifact was not found for SelfHostedEditor Electron.",
    reason: "language-server-invocation-unavailable",
  };
}

function resolveLanguageServerArtifactInvocation({
  args,
  artifactKindPrefix,
  artifactRoot,
  cwd,
  missingMessage,
  missingReason,
}) {
  const languageServerExePath = path.join(artifactRoot, "Inscape.LanguageServer.exe");
  const languageServerDllPath = path.join(artifactRoot, "Inscape.LanguageServer.dll");
  const runtimeConfigPath = path.join(artifactRoot, "Inscape.LanguageServer.runtimeconfig.json");

  if (fs.existsSync(languageServerExePath)) {
    return {
      args,
      artifactHealth: fs.existsSync(runtimeConfigPath) ? "available" : "incomplete",
      artifactKind: `${artifactKindPrefix}-exe`,
      available: true,
      command: languageServerExePath,
      cwd,
    };
  }

  if (fs.existsSync(languageServerDllPath)) {
    return {
      args: [
        languageServerDllPath,
        ...args,
      ],
      artifactHealth: fs.existsSync(runtimeConfigPath) ? "available" : "incomplete",
      artifactKind: `${artifactKindPrefix}-dll`,
      available: true,
      command: "dotnet",
      cwd,
    };
  }

  return {
    args: [],
    artifactHealth: "missing",
    artifactKind: `${artifactKindPrefix}-missing`,
    available: false,
    command: "",
    cwd,
    message: missingMessage,
    reason: missingReason,
  };
}

function buildProcessPerRequestLanguageServerArgs(kind, payload, workspaceRoot, override) {
  if (kind === "diagnostics") {
    return withProjectOverride([
      "--diagnose-project",
      workspaceRoot,
    ], override);
  }

  if (kind === "completions") {
    return withProjectOverride([
      "--completion-project",
      workspaceRoot,
    ], override);
  }

  if (kind === "definition") {
    return withProjectOverride([
      "--definition-project",
      workspaceRoot,
      readQueryValue(payload, "definitionName", "target"),
    ], override);
  }

  if (kind === "references") {
    return withProjectOverride([
      "--references-project",
      workspaceRoot,
      readQueryValue(payload, "referenceName", "target"),
    ], override);
  }

  if (kind === "hover") {
    return withProjectOverride([
      "--hover-project",
      workspaceRoot,
      readQueryValue(payload, "hoverKind", "kind") || "node",
      readQueryValue(payload, "hoverName", "target"),
    ], override);
  }

  if (kind === "document-symbols") {
    return [
      "--document-symbols-file",
      override.contentPath,
    ];
  }

  throw new Error(`Unsupported LanguageServer session command: ${kind}`);
}

function withProjectOverride(args, override) {
  if (!override?.sourcePath || !override?.contentPath) {
    return args;
  }

  return [
    ...args,
    "--override",
    override.sourcePath,
    override.contentPath,
  ];
}

async function runLanguageServerProcessInvocation(invocation, options = {}) {
  const timeoutMilliseconds = normalizePositiveInteger(
    options.timeoutMilliseconds,
    defaultRequestTimeoutMilliseconds
  );
  const errorPreviewCharacterLimit = normalizePositiveInteger(
    options.errorPreviewCharacterLimit,
    defaultErrorPreviewCharacterLimit
  );
  return await new Promise((resolve, reject) => {
    let settled = false;
    const stdoutChunks = [];
    const stderrChunks = [];
    const child = childProcess.spawn(invocation.command, invocation.args, {
      cwd: invocation.cwd,
      windowsHide: true,
    });
    const timeout = setTimeout(() => {
      finish(new Error("LanguageServer process-per-request fallback timed out."));
      child.kill();
    }, timeoutMilliseconds);

    child.stdout.on("data", (chunk) => {
      stdoutChunks.push(Buffer.from(chunk));
    });
    child.stderr.on("data", (chunk) => {
      stderrChunks.push(Buffer.from(chunk));
    });
    child.on("error", (error) => {
      finish(error);
    });
    child.on("exit", (code, signal) => {
      if (code !== 0) {
        const stderrPreview = buildProcessPreview(stderrChunks, errorPreviewCharacterLimit);
        finish(new Error(`LanguageServer process-per-request fallback exited with code ${code ?? "unknown"}${signal ? ` and signal ${signal}` : ""}. ${stderrPreview}`.trim()));
        return;
      }

      try {
        const stdoutText = Buffer.concat(stdoutChunks).toString("utf8").trim();
        finish(null, JSON.parse(stdoutText));
      } catch (error) {
        finish(error instanceof Error ? error : new Error(String(error)));
      }
    });

    function finish(error, result = null) {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    }
  });
}

function normalizeInvocation(invocation = {}) {
  if (invocation.available === false) {
    return {
      ...invocation,
      artifactHealth: normalizeArtifactHealth(invocation.artifactHealth),
      artifactKind: normalizeArtifactKind(invocation.artifactKind),
    };
  }

  const command = String(invocation.command || "").trim();
  if (!command) {
    return {
      ...invocation,
      artifactHealth: normalizeArtifactHealth(invocation.artifactHealth, "missing"),
      artifactKind: normalizeArtifactKind(invocation.artifactKind),
      available: false,
      message: "LanguageServer invocation is missing a command.",
      reason: "language-server-invocation-unavailable",
    };
  }

  return {
    args: Array.isArray(invocation.args) ? invocation.args.map(String) : [],
    artifactHealth: normalizeArtifactHealth(invocation.artifactHealth),
    artifactKind: normalizeArtifactKind(invocation.artifactKind),
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

function normalizeErrorSummaryObject(error, fallbackCode) {
  const errorSummary = normalizeErrorSummary(error);
  return {
    code: errorSummary?.code || fallbackCode || "language-server-session-failed",
    message: errorSummary?.message || String(fallbackCode || "LanguageServer session failed."),
  };
}

function normalizeFallbackReason(cause, fallbackInvocation) {
  if (fallbackInvocation?.available === false) {
    return fallbackInvocation.reason || "language-server-fallback-unavailable";
  }

  const message = String(cause?.message || cause || "");
  if (message.includes("timed out")) {
    return "language-server-request-timeout";
  }

  if (message.includes("Content-Length") || message.includes("JSON")) {
    return "language-server-protocol-error";
  }

  return "language-server-session-failed";
}

function isUnavailableErrorCode(code) {
  return [
    "language-server-dev-artifact-missing",
    "language-server-fallback-unavailable",
    "language-server-invocation-unavailable",
    "language-server-packaged-artifact-missing",
  ].includes(String(code || ""));
}

function buildProcessPreview(chunks, limit) {
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) {
    return "";
  }

  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function normalizeArtifactHealth(artifactHealth, fallback = "available") {
  const normalized = String(artifactHealth || fallback).trim();
  return ["available", "incomplete", "missing", "unresolved"].includes(normalized)
    ? normalized
    : fallback;
}

function normalizeArtifactKind(artifactKind) {
  return String(artifactKind || "unresolved")
    .trim()
    .replace(/[^A-Za-z0-9._:-]/g, "-")
    .slice(0, 80) || "unresolved";
}

function resolveArtifactHealth(invocation, sessionHealth) {
  if (!invocation) {
    return "unresolved";
  }

  if (invocation.available === false || sessionHealth === "unavailable") {
    return "missing";
  }

  return normalizeArtifactHealth(invocation.artifactHealth);
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

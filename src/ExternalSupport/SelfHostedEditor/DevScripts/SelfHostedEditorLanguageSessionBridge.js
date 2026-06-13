import childProcess from "node:child_process";
import { resolveLanguageServerInvocation } from "./SelfHostedEditorProcessBridge.js";

export class SelfHostedEditorLanguageSessionBridge {
  constructor(options = {}) {
    this.invocation = options.invocation || resolveLanguageServerInvocation(["--stdio"]);
    this.requestTimeoutMilliseconds = Number(options.requestTimeoutMilliseconds || 30000);
    this.child = null;
    this.nextRequestId = 1;
    this.pendingRequests = new Map();
    this.stderrChunks = [];
    this.stdoutBuffer = Buffer.alloc(0);
  }

  async diagnoseProject(rootPath) {
    return await this.request("inscape/diagnoseProject", {
      rootPath,
    });
  }

  async documentSymbolsFile(sourcePath) {
    return await this.request("inscape/documentSymbolsFile", {
      sourcePath,
    });
  }

  async dispose() {
    if (!this.child) {
      return;
    }

    try {
      await this.request("shutdown", {});
    } catch {
      // Best-effort shutdown for an optional spike path.
    }

    this.writeMessage({
      jsonrpc: "2.0",
      method: "exit",
    });
    this.child.kill();
    this.child = null;
  }

  async request(method, params = {}) {
    this.ensureStarted();
    const id = this.nextRequestId;
    this.nextRequestId += 1;
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`LanguageServer session request timed out: ${method}`));
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

  ensureStarted() {
    if (this.child) {
      return;
    }

    this.child = childProcess.spawn(this.invocation.command, this.invocation.args, {
      cwd: this.invocation.cwd,
      windowsHide: true,
    });
    this.child.stdout.on("data", (chunk) => {
      this.stdoutBuffer = Buffer.concat([this.stdoutBuffer, Buffer.from(chunk)]);
      this.consumeStdoutMessages();
    });
    this.child.stderr.on("data", (chunk) => {
      this.stderrChunks.push(Buffer.from(chunk));
    });
    this.child.on("error", (error) => {
      this.rejectPending(error);
    });
    this.child.on("exit", (code, signal) => {
      this.rejectPending(new Error(
        `LanguageServer session exited with code ${code ?? "unknown"}${signal ? ` and signal ${signal}` : ""}. ${this.getStderrPreview()}`.trim()
      ));
      this.child = null;
    });
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
        this.failSession(error instanceof Error
          ? error
          : new Error(String(error)));
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
      pending.reject(new Error(message.error.message || `LanguageServer session request failed: ${pending.method}`));
      return;
    }

    pending.resolve(message.result);
  }

  writeMessage(message) {
    const body = Buffer.from(JSON.stringify(message), "utf8");
    const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "ascii");
    this.child.stdin.write(Buffer.concat([header, body]));
  }

  rejectPending(error) {
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }

    this.pendingRequests.clear();
  }

  failSession(error) {
    this.rejectPending(error);
    this.stdoutBuffer = Buffer.alloc(0);
    if (this.child) {
      this.child.kill();
      this.child = null;
    }
  }

  getStderrPreview() {
    const text = Buffer.concat(this.stderrChunks).toString("utf8").trim();
    return text.length > 4000 ? `${text.slice(0, 4000)}...` : text;
  }
}

let sharedLanguageSessionBridge = null;

export function isSelfHostedEditorLanguageSessionEnabled() {
  return process.env.SELF_HOSTED_EDITOR_LANGUAGE_SESSION === "stdio";
}

export function getSharedSelfHostedEditorLanguageSessionBridge() {
  if (!sharedLanguageSessionBridge) {
    sharedLanguageSessionBridge = new SelfHostedEditorLanguageSessionBridge();
  }

  return sharedLanguageSessionBridge;
}

export async function disposeSharedSelfHostedEditorLanguageSessionBridge() {
  const bridge = sharedLanguageSessionBridge;
  sharedLanguageSessionBridge = null;
  await bridge?.dispose();
}

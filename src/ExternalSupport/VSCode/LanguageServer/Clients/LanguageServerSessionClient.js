"use strict";

class LanguageServerSessionClient {

    constructor(dependencies) {
        this.childProcess = dependencies.childProcess;
        this.fs = dependencies.fs;
        this.path = dependencies.path;
        this.vscode = dependencies.vscode;
        this.resolveLanguageServerProjectPath = dependencies.resolveLanguageServerProjectPath;
        this.logOutput = dependencies.logOutput;
        this.process = undefined;
        this.launchKey = undefined;
        this.buffer = Buffer.alloc(0);
        this.pending = new Map();
        this.nextId = 1;
        this.initializePromise = undefined;
    }

    async request(document, method, params) {
        await this.ensureSession(document);
        return this.sendRequest(method, params);
    }

    async ensureSession(document) {
        const workspaceFolderPath = this.getWorkspaceFolderPath(document);
        const configuration = this.vscode.workspace.getConfiguration("inscape", document ? document.uri : undefined);
        const defaultCommand = configuration.get("compiler.command", "dotnet");
        const languageServerProject = this.resolveLanguageServerProjectPath(workspaceFolderPath);
        const invocation = this.resolveSessionInvocation(defaultCommand, languageServerProject, workspaceFolderPath);
        const nextLaunchKey = invocation.command + "\n" + invocation.args.join("\n") + "\n" + invocation.cwd;

        if (this.process && this.launchKey === nextLaunchKey) {
            if (this.initializePromise) {
                await this.initializePromise;
            }
            return;
        }

        this.disposeProcess();
        this.launchKey = nextLaunchKey;
        await this.startSession(invocation);
    }

    async startSession(invocation) {
        const sessionProcess = this.childProcess.spawn(invocation.command, invocation.args, {
            cwd: invocation.cwd,
            windowsHide: true,
            stdio: ["pipe", "pipe", "pipe"]
        });

        this.process = sessionProcess;
        this.buffer = Buffer.alloc(0);
        this.pending.clear();

        sessionProcess.stdout.on("data", (chunk) => this.handleStdoutChunk(chunk));
        sessionProcess.stderr.on("data", (chunk) => this.writeLog("[LanguageServer stderr] " + String(chunk).trim()));
        sessionProcess.on("error", (error) => this.handleProcessFailure(error));
        sessionProcess.on("exit", (code, signal) => this.handleProcessExit(code, signal));

        this.initializePromise = this.sendRequest("initialize", {
            processId: process.pid,
            clientInfo: {
                name: "Inscape VSCode"
            }
        }).then((result) => {
            this.sendNotification("initialized", {});
            return result;
        }).catch((error) => {
            this.disposeProcess();
            throw error;
        });

        await this.initializePromise;
    }

    sendRequest(method, params) {
        if (!this.process || !this.process.stdin) {
            return Promise.reject(new Error("LanguageServer session is not running."));
        }

        const requestId = this.nextId++;
        const payload = {
            jsonrpc: "2.0",
            id: requestId,
            method,
            params: params || {}
        };

        return new Promise((resolve, reject) => {
            this.pending.set(requestId, {
                method,
                resolve,
                reject
            });

            try {
                this.writeMessage(payload);
            } catch (error) {
                this.pending.delete(requestId);
                reject(error);
            }
        });
    }

    sendNotification(method, params) {
        if (!this.process || !this.process.stdin) {
            return;
        }

        this.writeMessage({
            jsonrpc: "2.0",
            method,
            params: params || {}
        });
    }

    writeMessage(payload) {
        if (!this.process || !this.process.stdin) {
            throw new Error("LanguageServer session stdin is unavailable.");
        }

        const body = Buffer.from(JSON.stringify(payload), "utf8");
        const header = Buffer.from("Content-Length: " + body.length + "\r\n\r\n", "ascii");
        this.process.stdin.write(Buffer.concat([header, body]));
    }

    handleStdoutChunk(chunk) {
        this.buffer = Buffer.concat([this.buffer, Buffer.from(chunk)]);
        while (true) {
            const headerEnd = this.buffer.indexOf("\r\n\r\n");
            if (headerEnd < 0) {
                return;
            }

            const header = this.buffer.slice(0, headerEnd).toString("ascii");
            const contentLength = this.readContentLength(header);
            const bodyStart = headerEnd + 4;
            const messageEnd = bodyStart + contentLength;
            if (this.buffer.length < messageEnd) {
                return;
            }

            const body = this.buffer.slice(bodyStart, messageEnd).toString("utf8");
            this.buffer = this.buffer.slice(messageEnd);
            this.handleMessage(body);
        }
    }

    handleMessage(body) {
        const message = JSON.parse(body);
        if (typeof message.id !== "number") {
            return;
        }

        const pending = this.pending.get(message.id);
        if (!pending) {
            return;
        }

        this.pending.delete(message.id);
        if (message.error) {
            pending.reject(new Error(message.error.message || ("LanguageServer session request failed: " + pending.method)));
            return;
        }

        pending.resolve(message.result);
    }

    readContentLength(header) {
        const lines = header.split(/\r\n/);
        for (const line of lines) {
            const match = /^Content-Length:\s*(\d+)$/i.exec(line.trim());
            if (match) {
                return Number(match[1]);
            }
        }

        throw new Error("LanguageServer session message is missing Content-Length.");
    }

    handleProcessFailure(error) {
        this.rejectPending(error);
        this.process = undefined;
        this.launchKey = undefined;
        this.initializePromise = undefined;
    }

    handleProcessExit(code, signal) {
        if (this.process) {
            const detail = signal
                ? "signal " + signal
                : "exit code " + String(typeof code === "number" ? code : "unknown");
            this.writeLog("LanguageServer session exited with " + detail + ".");
        }

        this.rejectPending(new Error("LanguageServer session exited."));
        this.process = undefined;
        this.launchKey = undefined;
        this.initializePromise = undefined;
    }

    rejectPending(error) {
        for (const pending of this.pending.values()) {
            pending.reject(error);
        }

        this.pending.clear();
    }

    disposeProcess() {
        if (this.process) {
            try {
                this.sendNotification("exit", {});
            } catch {
            }

            try {
                this.process.kill();
            } catch {
            }
        }

        this.process = undefined;
        this.launchKey = undefined;
        this.initializePromise = undefined;
        this.buffer = Buffer.alloc(0);
        this.rejectPending(new Error("LanguageServer session was restarted."));
    }

    dispose() {
        this.disposeProcess();
    }

    resolveSessionInvocation(defaultCommand, languageServerProject, workspaceFolderPath) {
        const languageServerExecutable = this.resolveProjectExecutablePath(languageServerProject, "Inscape.LanguageServer");
        if (languageServerExecutable) {
            return {
                command: languageServerExecutable,
                args: ["--stdio"],
                cwd: workspaceFolderPath
            };
        }

        const languageServerAssembly = this.resolveProjectAssemblyPath(languageServerProject, "Inscape.LanguageServer.dll");
        if (languageServerAssembly && this.fs.existsSync(languageServerAssembly)) {
            return {
                command: defaultCommand,
                args: ["exec", languageServerAssembly, "--stdio"],
                cwd: workspaceFolderPath
            };
        }

        return {
            command: defaultCommand,
            args: ["run", "--project", languageServerProject, "--", "--stdio"],
            cwd: workspaceFolderPath
        };
    }

    resolveProjectExecutablePath(projectPath, executableBaseName) {
        const projectDirectory = this.path.dirname(projectPath);
        const candidateFrameworks = ["net10.0", "net9.0", "net8.0"];
        const candidateConfigurations = ["Debug", "Release"];
        const executableName = process.platform === "win32" ? executableBaseName + ".exe" : executableBaseName;

        for (const configuration of candidateConfigurations) {
            for (const framework of candidateFrameworks) {
                const candidate = this.path.join(projectDirectory, "bin", configuration, framework, executableName);
                if (this.fs.existsSync(candidate)) {
                    return candidate;
                }
            }
        }

        return undefined;
    }

    resolveProjectAssemblyPath(projectPath, assemblyName) {
        const projectDirectory = this.path.dirname(projectPath);
        const candidateFrameworks = ["net10.0", "net9.0", "net8.0"];
        const candidateConfigurations = ["Debug", "Release"];

        for (const configuration of candidateConfigurations) {
            for (const framework of candidateFrameworks) {
                const candidate = this.path.join(projectDirectory, "bin", configuration, framework, assemblyName);
                if (this.fs.existsSync(candidate)) {
                    return candidate;
                }
            }
        }

        return undefined;
    }

    getWorkspaceFolderPath(document) {
        if (document) {
            const folder = this.vscode.workspace.getWorkspaceFolder(document.uri);
            if (folder) {
                return folder.uri.fsPath;
            }
        }

        if (this.vscode.workspace.workspaceFolders && this.vscode.workspace.workspaceFolders.length > 0) {
            return this.vscode.workspace.workspaceFolders[0].uri.fsPath;
        }

        return this.path.resolve(__dirname, "..", "..", "..", "..", "..");
    }

    writeLog(message) {
        if (typeof this.logOutput === "function" && message) {
            this.logOutput(message);
        }
    }

}

module.exports = {
    LanguageServerSessionClient
};

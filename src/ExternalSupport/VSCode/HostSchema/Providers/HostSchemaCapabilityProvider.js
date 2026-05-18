"use strict";

class HostSchemaCapabilityProvider {

    constructor(dependencies) {
        this.childProcess = dependencies.childProcess;
        this.fs = dependencies.fs;
        this.path = dependencies.path;
        this.vscode = dependencies.vscode;
        this.resolveLanguageServerProjectPath = dependencies.resolveLanguageServerProjectPath;
        this.resolveCliProjectPath = dependencies.resolveCliProjectPath;
        this.logOutput = dependencies.logOutput;
        this.cache = new Map();
    }

    async collectCapabilityCatalog(document) {
        const workspaceFolder = this.vscode.workspace.getWorkspaceFolder(document.uri);
        if (!workspaceFolder) {
            return undefined;
        }

        const workspacePath = workspaceFolder.uri.fsPath;
        const cached = this.cache.get(workspacePath);
        const now = Date.now();
        if (cached && cached.expiresAt > now) {
            return cached.catalog;
        }

        const catalog = await this.invokeCapabilityEndpoint(document, workspacePath);
        this.cache.set(workspacePath, {
            expiresAt: now + 2000,
            catalog
        });
        return catalog;
    }

    async invokeCapabilityEndpoint(document, workspacePath) {
        const configuration = this.vscode.workspace.getConfiguration("inscape", document.uri);
        const languageServerProject = this.resolveLanguageServerProjectPath(workspacePath);
        const cliProject = this.resolveCliProjectPath(workspacePath);
        const command = configuration.get("compiler.command", "dotnet");
        const invocations = [
            this.resolveLanguageServerInvocation(command, languageServerProject, workspacePath),
            this.resolveCliInvocation(command, cliProject, workspacePath)
        ];
        const failures = [];

        for (const invocation of invocations) {
            try {
                const result = await this.execFile(invocation);
                if (result.exitCode !== 0 || !result.stdout.trim()) {
                    failures.push(this.createFailureDetail(invocation, result));
                    continue;
                }

                const parsed = JSON.parse(result.stdout);
                if (!parsed || parsed.format !== "inscape.host-schema.capabilities") {
                    failures.push(invocation.label + " returned an unexpected Host Schema capability payload.");
                    continue;
                }

                if (parsed.hostSchema && parsed.hostSchema.errorMessage) {
                    this.writeLog("Host Schema capability endpoint reported: " + parsed.hostSchema.errorMessage);
                }
                return parsed;
            } catch (error) {
                failures.push(invocation.label + " failed: " + (error && error.message ? error.message : String(error)));
            }
        }

        if (failures.length > 0) {
            this.writeLog("Host Schema capabilities unavailable. " + failures.join(" "));
        }
        return undefined;
    }

    resolveLanguageServerInvocation(defaultCommand, languageServerProject, workspaceFolderPath) {
        const languageServerExecutable = this.resolveProjectExecutablePath(languageServerProject, "Inscape.LanguageServer");
        if (languageServerExecutable) {
            return {
                label: "LanguageServer executable",
                command: languageServerExecutable,
                args: ["--host-schema-capabilities-project", workspaceFolderPath],
                cwd: workspaceFolderPath
            };
        }

        const languageServerAssembly = this.resolveProjectAssemblyPath(languageServerProject, "Inscape.LanguageServer.dll");
        if (languageServerAssembly && this.fs.existsSync(languageServerAssembly)) {
            return {
                label: "LanguageServer assembly",
                command: defaultCommand,
                args: ["exec", languageServerAssembly, "--host-schema-capabilities-project", workspaceFolderPath],
                cwd: workspaceFolderPath
            };
        }

        return {
            label: "LanguageServer project",
            command: defaultCommand,
            args: ["run", "--project", languageServerProject, "--", "--host-schema-capabilities-project", workspaceFolderPath],
            cwd: workspaceFolderPath
        };
    }

    resolveCliInvocation(defaultCommand, cliProject, workspaceFolderPath) {
        const cliExecutable = this.resolveProjectExecutablePath(cliProject, "Inscape.Cli");
        if (cliExecutable) {
            return {
                label: "CLI executable",
                command: cliExecutable,
                args: ["inspect-host-schema-project", workspaceFolderPath],
                cwd: workspaceFolderPath
            };
        }

        const cliAssembly = this.resolveProjectAssemblyPath(cliProject, "Inscape.Cli.dll");
        if (cliAssembly && this.fs.existsSync(cliAssembly)) {
            return {
                label: "CLI assembly",
                command: defaultCommand,
                args: ["exec", cliAssembly, "inspect-host-schema-project", workspaceFolderPath],
                cwd: workspaceFolderPath
            };
        }

        return {
            label: "CLI project",
            command: defaultCommand,
            args: ["run", "--project", cliProject, "--", "inspect-host-schema-project", workspaceFolderPath],
            cwd: workspaceFolderPath
        };
    }

    execFile(invocation) {
        return new Promise((resolve, reject) => {
            this.childProcess.execFile(invocation.command, invocation.args, {
                cwd: invocation.cwd,
                windowsHide: true,
                maxBuffer: 1024 * 1024 * 8
            }, (error, stdout, stderr) => {
                if (error && typeof error.code !== "number") {
                    reject(error);
                    return;
                }

                resolve({
                    exitCode: error ? error.code : 0,
                    stdout: stdout || "",
                    stderr: stderr || ""
                });
            });
        });
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

    createFailureDetail(invocation, result) {
        const detail = result.stderr && result.stderr.trim()
            ? result.stderr.trim()
            : (result.stdout && result.stdout.trim() ? result.stdout.trim() : "exit code " + result.exitCode);
        return invocation.label + " failed: " + detail;
    }

    writeLog(message) {
        if (typeof this.logOutput === "function") {
            this.logOutput(message);
        }
    }

}

module.exports = {
    HostSchemaCapabilityProvider
};

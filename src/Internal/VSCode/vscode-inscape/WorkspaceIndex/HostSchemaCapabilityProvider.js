"use strict";

class HostSchemaCapabilityProvider {

    constructor(dependencies) {
        this.childProcess = dependencies.childProcess;
        this.fs = dependencies.fs;
        this.path = dependencies.path;
        this.vscode = dependencies.vscode;
        this.resolveCliProjectPath = dependencies.resolveCliProjectPath;
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
        const cliProject = this.resolveCliProjectPath(workspacePath);
        const invocation = this.resolveCliInvocation(configuration.get("compiler.command", "dotnet"), cliProject, workspacePath);

        try {
            const result = await this.execFile(invocation);
            if (result.exitCode !== 0 || !result.stdout.trim()) {
                return undefined;
            }

            const parsed = JSON.parse(result.stdout);
            if (!parsed || parsed.format !== "inscape.host-schema.capabilities") {
                return undefined;
            }

            return parsed;
        } catch {
            return undefined;
        }
    }

    resolveCliInvocation(defaultCommand, cliProject, workspaceFolderPath) {
        const cliExecutable = this.resolveCliExecutablePath(cliProject);
        if (cliExecutable) {
            return {
                command: cliExecutable,
                args: ["inspect-host-schema-project", workspaceFolderPath],
                cwd: workspaceFolderPath
            };
        }

        const cliAssembly = this.resolveCliAssemblyPath(cliProject);
        if (cliAssembly && this.fs.existsSync(cliAssembly)) {
            return {
                command: defaultCommand,
                args: ["exec", cliAssembly, "inspect-host-schema-project", workspaceFolderPath],
                cwd: workspaceFolderPath
            };
        }

        return {
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

    resolveCliExecutablePath(cliProject) {
        const projectDirectory = this.path.dirname(cliProject);
        const candidateFrameworks = ["net10.0", "net9.0", "net8.0"];
        const candidateConfigurations = ["Debug", "Release"];
        const executableName = process.platform === "win32" ? "Inscape.Cli.exe" : "Inscape.Cli";

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

    resolveCliAssemblyPath(cliProject) {
        const projectDirectory = this.path.dirname(cliProject);
        const candidateFrameworks = ["net10.0", "net9.0", "net8.0"];
        const candidateConfigurations = ["Debug", "Release"];

        for (const configuration of candidateConfigurations) {
            for (const framework of candidateFrameworks) {
                const candidate = this.path.join(projectDirectory, "bin", configuration, framework, "Inscape.Cli.dll");
                if (this.fs.existsSync(candidate)) {
                    return candidate;
                }
            }
        }

        return undefined;
    }

}

module.exports = {
    HostSchemaCapabilityProvider
};

"use strict";

class PreviewInvocationProvider {

    constructor(dependencies) {
        this.fs = dependencies.fs;
        this.path = dependencies.path;
        this.vscode = dependencies.vscode;
        this.getWorkspaceFolder = dependencies.getWorkspaceFolder;
        this.resolveCliProjectPath = dependencies.resolveCliProjectPath;
    }

    createInvocation(context, document, tempPath, outputPath) {
        const workspaceFolder = this.vscode.workspace.getWorkspaceFolder(document.uri);
        const workspaceFolderPath = workspaceFolder ? workspaceFolder.uri.fsPath : this.getWorkspaceFolder(context, document);
        const configuration = this.vscode.workspace.getConfiguration("inscape", workspaceFolder ? workspaceFolder.uri : document.uri);
        const cliProject = this.resolveCliProjectPath(context, workspaceFolderPath);
        const invocation = this.resolveCliInvocation(configuration.get("compiler.command", "dotnet"), cliProject, workspaceFolderPath);
        const args = invocation.args.slice();

        if (document && tempPath) {
            args.push("--override", document.uri.fsPath, tempPath);
        }

        args.push("-o", outputPath);

        return {
            command: invocation.command,
            args,
            cwd: workspaceFolderPath
        };
    }

    resolveCliInvocation(defaultCommand, cliProject, workspaceFolderPath) {
        const cliExecutable = this.resolveCliExecutablePath(cliProject);
        if (cliExecutable) {
            return {
                command: cliExecutable,
                args: ["preview-project", workspaceFolderPath]
            };
        }

        const cliAssembly = this.resolveCliAssemblyPath(cliProject);
        if (cliAssembly && this.fs.existsSync(cliAssembly)) {
            return {
                command: defaultCommand,
                args: ["exec", cliAssembly, "preview-project", workspaceFolderPath]
            };
        }

        return {
            command: defaultCommand,
            args: ["run", "--project", cliProject, "--", "preview-project", workspaceFolderPath]
        };
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
    PreviewInvocationProvider
};

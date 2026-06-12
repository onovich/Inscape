import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentModulePath = fileURLToPath(import.meta.url);
const moduleRoot = path.resolve(path.dirname(currentModulePath), "..");
const repoRoot = path.resolve(moduleRoot, "..", "..", "..");
const languageServerProjectPath = path.join(
  repoRoot,
  "src",
  "Internal",
  "LanguageServer",
  "Inscape.LanguageServer.csproj"
);
const cliProjectPath = path.join(
  repoRoot,
  "src",
  "Internal",
  "Cli",
  "Inscape.Cli",
  "Inscape.Cli.csproj"
);
const cliBuildRoot = path.join(
  repoRoot,
  "src",
  "Internal",
  "Cli",
  "Inscape.Cli",
  "bin",
  "Debug",
  "net10.0"
);
const cliExecutablePath = path.join(cliBuildRoot, "Inscape.Cli.exe");
const cliAssemblyPath = path.join(cliBuildRoot, "Inscape.Cli.dll");
const languageServerBuildRoot = path.join(
  repoRoot,
  "src",
  "Internal",
  "LanguageServer",
  "bin",
  "Debug",
  "net10.0"
);
const languageServerExecutablePath = path.join(languageServerBuildRoot, "Inscape.LanguageServer.exe");
const languageServerAssemblyPath = path.join(languageServerBuildRoot, "Inscape.LanguageServer.dll");
const bridgeCommandTimeoutMilliseconds = 30000;

export function runLanguageServerProjectDiagnostics(rootPath) {
  return runLanguageServerCommand([
    "--diagnose-project",
    rootPath,
  ], "LanguageServer project diagnostics");
}

export function runLanguageServerDocumentSymbols(tempPath) {
  return runLanguageServerCommand([
    "--document-symbols-file",
    tempPath,
  ], "LanguageServer document symbols");
}

export function runLanguageServerProjectHover(rootPath, hoverKind, hoverName) {
  return runLanguageServerCommand([
    "--hover-project",
    rootPath,
    hoverKind,
    hoverName,
  ], "LanguageServer project hover");
}

export function runLanguageServerProjectDefinition(rootPath, definitionName) {
  return runLanguageServerCommand([
    "--definition-project",
    rootPath,
    definitionName,
  ], "LanguageServer project definition");
}

export function runLanguageServerProjectReferences(rootPath, referenceName) {
  return runLanguageServerCommand([
    "--references-project",
    rootPath,
    referenceName,
  ], "LanguageServer project references");
}

export function runLanguageServerProjectCompletions(rootPath) {
  return runLanguageServerCommand([
    "--completion-project",
    rootPath,
  ], "LanguageServer project completions");
}

export function runLanguageServerHostSchemaCapabilities(rootPath) {
  return runLanguageServerCommand([
    "--host-schema-capabilities-project",
    rootPath,
  ], "LanguageServer host schema capabilities");
}

export function runLanguageServerHostBindingCapabilities(rootPath) {
  return runLanguageServerCommand([
    "--host-binding-capabilities-project",
    rootPath,
  ], "LanguageServer host binding capabilities");
}

export function runCliCommand(cliArgs, label) {
  return runProcessCommand(resolveCliInvocation(cliArgs), label);
}

function runLanguageServerCommand(languageServerArgs, label) {
  return runProcessCommand(resolveLanguageServerInvocation(languageServerArgs), label);
}

function runProcessCommand(invocation, label) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const process = childProcess.spawn(invocation.command, invocation.args, {
      cwd: repoRoot,
      windowsHide: true,
    });
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      process.kill();
      reject(new Error(`${label} timed out after ${bridgeCommandTimeoutMilliseconds}ms.`));
    }, bridgeCommandTimeoutMilliseconds);

    const stdoutChunks = [];
    const stderrChunks = [];

    process.stdout.on("data", (chunk) => {
      stdoutChunks.push(Buffer.from(chunk));
    });

    process.stderr.on("data", (chunk) => {
      stderrChunks.push(Buffer.from(chunk));
    });

    process.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    process.on("exit", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      const stdout = decodeProcessOutput(stdoutChunks);
      const stderr = decodeProcessOutput(stderrChunks);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `${label} exited with code ${code}.`));
        return;
      }

      resolve({
        stderr,
        stdout,
      });
    });
  });
}

function decodeProcessOutput(chunks) {
  return Buffer.concat(chunks).toString("utf8");
}

function resolveCliInvocation(cliArgs) {
  if (fs.existsSync(cliExecutablePath)) {
    return {
      command: cliExecutablePath,
      args: cliArgs,
    };
  }

  if (fs.existsSync(cliAssemblyPath)) {
    return {
      command: "dotnet",
      args: ["exec", cliAssemblyPath, ...cliArgs],
    };
  }

  return {
    command: "dotnet",
    args: ["run", "--project", cliProjectPath, "--no-restore", "--", ...cliArgs],
  };
}

function resolveLanguageServerInvocation(languageServerArgs) {
  if (fs.existsSync(languageServerExecutablePath)) {
    return {
      command: languageServerExecutablePath,
      args: languageServerArgs,
    };
  }

  if (fs.existsSync(languageServerAssemblyPath)) {
    return {
      command: "dotnet",
      args: ["exec", languageServerAssemblyPath, ...languageServerArgs],
    };
  }

  return {
    command: "dotnet",
    args: ["run", "--project", languageServerProjectPath, "--", ...languageServerArgs],
  };
}

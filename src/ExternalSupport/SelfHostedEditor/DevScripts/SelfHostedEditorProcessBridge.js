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
export const defaultProcessCommandTimeoutMilliseconds = 30000;
export const defaultProcessErrorOutputPreviewCharacterLimit = 4000;

export class SelfHostedEditorProcessCommandError extends Error {
  constructor(label, outcome) {
    super(createProcessErrorMessage(label, outcome));
    this.name = "SelfHostedEditorProcessCommandError";
    this.details = {
      durationMilliseconds: outcome.durationMilliseconds,
      exitCode: outcome.exitCode,
      format: "inscape.self-hosted-editor.process-error",
      formatVersion: 1,
      label,
      signal: outcome.signal,
      stderr: outcome.stderrPreview,
      stdout: outcome.stdoutPreview,
      timedOut: outcome.timedOut,
    };
  }
}

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

export function runProcessCommand(invocation, label, options = {}) {
  const timeoutMilliseconds = normalizePositiveInteger(
    options.timeoutMilliseconds,
    defaultProcessCommandTimeoutMilliseconds
  );
  const outputPreviewCharacterLimit = normalizePositiveInteger(
    options.outputPreviewCharacterLimit,
    defaultProcessErrorOutputPreviewCharacterLimit
  );
  return new Promise((resolve, reject) => {
    let settled = false;
    const startedAt = Date.now();
    const child = childProcess.spawn(invocation.command, invocation.args, {
      cwd: repoRoot,
      windowsHide: true,
    });
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      child.kill();
      reject(createProcessCommandError(label, {
        durationMilliseconds: Date.now() - startedAt,
        exitCode: null,
        outputPreviewCharacterLimit,
        signal: null,
        stderr: decodeProcessOutput(stderrChunks),
        stdout: decodeProcessOutput(stdoutChunks),
        timedOut: true,
      }));
    }, timeoutMilliseconds);

    const stdoutChunks = [];
    const stderrChunks = [];

    child.stdout.on("data", (chunk) => {
      stdoutChunks.push(Buffer.from(chunk));
    });

    child.stderr.on("data", (chunk) => {
      stderrChunks.push(Buffer.from(chunk));
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      reject(createProcessCommandError(label, {
        durationMilliseconds: Date.now() - startedAt,
        exitCode: null,
        outputPreviewCharacterLimit,
        signal: null,
        stderr: error instanceof Error ? error.message : String(error),
        stdout: decodeProcessOutput(stdoutChunks),
        timedOut: false,
      }));
    });
    child.on("exit", (code, signal) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      const stdout = decodeProcessOutput(stdoutChunks);
      const stderr = decodeProcessOutput(stderrChunks);
      if (code !== 0) {
        reject(createProcessCommandError(label, {
          durationMilliseconds: Date.now() - startedAt,
          exitCode: code,
          outputPreviewCharacterLimit,
          signal,
          stderr,
          stdout,
          timedOut: false,
        }));
        return;
      }

      resolve({
        stderr,
        stdout,
      });
    });
  });
}

function createProcessCommandError(label, outcome) {
  return new SelfHostedEditorProcessCommandError(label, {
    ...outcome,
    stderrPreview: createProcessOutputPreview(outcome.stderr, outcome.outputPreviewCharacterLimit),
    stdoutPreview: createProcessOutputPreview(outcome.stdout, outcome.outputPreviewCharacterLimit),
  });
}

function createProcessErrorMessage(label, outcome) {
  const statusText = outcome.timedOut
    ? `timed out after ${outcome.durationMilliseconds}ms`
    : `failed with exit code ${outcome.exitCode ?? "unknown"}${outcome.signal ? ` and signal ${outcome.signal}` : ""}`;
  const stderrText = outcome.stderrPreview.text
    ? ` stderr: ${outcome.stderrPreview.text}`
    : "";
  const stdoutText = outcome.stdoutPreview.text
    ? ` stdout: ${outcome.stdoutPreview.text}`
    : "";
  return `${label} ${statusText}.${stderrText}${stdoutText}`.trim();
}

function createProcessOutputPreview(output, characterLimit) {
  const text = String(output || "").trim();
  if (text.length <= characterLimit) {
    return {
      text,
      truncated: false,
    };
  }

  return {
    text: `${text.slice(0, characterLimit)}... [truncated ${text.length - characterLimit} characters]`,
    truncated: true,
  };
}

function decodeProcessOutput(chunks) {
  return Buffer.concat(chunks).toString("utf8");
}

function normalizePositiveInteger(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }

  return Math.floor(numeric);
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

export function resolveLanguageServerInvocation(languageServerArgs) {
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

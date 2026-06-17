import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  SelfHostedEditorElectronLanguageServerSessionBridge,
  resolveSelfHostedEditorElectronLanguageServerInvocation,
} from "../Desktop/ElectronLanguageServerSessionBridge.js";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "inscape-electron-language-fallback-"));

try {
  const workspaceRoot = path.join(tempRoot, "workspace");
  await fs.mkdir(path.join(workspaceRoot, "story"), { recursive: true });
  await fs.writeFile(
    path.join(workspaceRoot, "story", "opening.inscape"),
    "# Opening\nNarrator: Start.\n-> Evidence",
    "utf8"
  );
  await fs.writeFile(
    path.join(workspaceRoot, "story", "evidence.inscape"),
    "# Evidence\nNarrator: Evidence.",
    "utf8"
  );

  const badProtocolScript = await writeScript("bad-protocol.js", `
process.stdout.write("X-Test: 1\\r\\n\\r\\n{}");
setInterval(() => {}, 1000);
`);
  const timeoutScript = await writeScript("timeout.js", `
setInterval(() => {}, 1000);
`);
  const exitScript = await writeScript("exit.js", `
process.exit(7);
`);

  await assertFallbackSucceeds({
    label: "protocol",
    stdioInvocation: nodeInvocation(badProtocolScript),
    workspaceRoot,
  });
  await assertFallbackSucceeds({
    label: "timeout",
    requestTimeoutMilliseconds: 100,
    stdioInvocation: nodeInvocation(timeoutScript),
    workspaceRoot,
  });
  await assertFallbackSucceeds({
    label: "start-exit",
    stdioInvocation: nodeInvocation(exitScript),
    workspaceRoot,
  });

  const missingBridge = new SelfHostedEditorElectronLanguageServerSessionBridge({
    invocationResolver: () => ({
      args: [],
      artifactHealth: "missing",
      artifactKind: "packaged-missing",
      available: false,
      command: "",
      cwd: workspaceRoot,
      message: "Packaged Inscape.LanguageServer artifact is missing from resources/language-server.",
      reason: "language-server-packaged-artifact-missing",
    }),
  });
  try {
    await missingBridge.run("diagnostics", buildLanguagePayload(workspaceRoot), {
      workspaceRoot,
    });
    throw new Error("Missing LanguageServer artifact should not produce diagnostics.");
  } catch (error) {
    assertIncludes(String(error.message || error), "LanguageServer", "missing artifact error message");
  }
  const missingStatus = missingBridge.getStatus({ latestDocumentRevision: 2 });
  assertEqual(missingStatus.health, "unavailable", "missing artifact status health");
  assertEqual(missingStatus.artifactKind, "packaged-missing", "missing artifact kind");
  assertEqual(missingStatus.fallbackKind, "process-per-request", "missing artifact fallback kind");
  assertEqual(missingStatus.fallbackCount, 1, "missing artifact fallback count");
  assertEqual(missingStatus.fallbackReason, "language-server-packaged-artifact-missing", "missing artifact fallback reason");
  await missingBridge.dispose();

  console.log("SelfHostedEditor Electron LanguageServer fallback contract ok");
} finally {
  await fs.rm(tempRoot, {
    force: true,
    recursive: true,
  });
}

async function assertFallbackSucceeds({
  label,
  requestTimeoutMilliseconds = 5000,
  stdioInvocation,
  workspaceRoot,
}) {
  const bridge = new SelfHostedEditorElectronLanguageServerSessionBridge({
    invocationResolver: (args, options = {}) => {
      if (args.includes("--stdio")) {
        return stdioInvocation;
      }

      return resolveSelfHostedEditorElectronLanguageServerInvocation(args, {
        ...options,
        packaged: false,
      });
    },
    requestTimeoutMilliseconds,
  });

  try {
    const diagnostics = await bridge.run("diagnostics", buildLanguagePayload(workspaceRoot), {
      workspaceRoot,
    });
    assertEqual(diagnostics.format, "inscape.language-server-project-diagnostics", `${label} fallback diagnostics format`);
    assertIncludesDiagnostic(diagnostics.diagnostics, "INS020", "story/opening.inscape");
    const status = bridge.getStatus({ latestDocumentRevision: 2 });
    assertEqual(status.health, "fallback", `${label} fallback status health`);
    assertEqual(status.fallbackKind, "process-per-request", `${label} fallback kind`);
    assertEqual(status.fallbackCount, 1, `${label} fallback count`);
    assertEqual(status.documentRevisionLag, 0, `${label} fallback revision lag`);
    assertEqual(bridge.getProcessId(), 0, `${label} fallback leaves no long-lived process`);
  } finally {
    await bridge.dispose();
  }
}

function buildLanguagePayload(workspaceRoot) {
  const dirtyText = "# Opening\nNarrator: Start.\n-> Evidence\n-> MissingFallbackTarget";
  return {
    activeRelativePath: "story/opening.inscape",
    documentRevision: 2,
    scriptText: "# Stale\nNarrator: stale renderer text",
    workspace: {
      activeRelativePath: "story/opening.inscape",
      documents: [
        {
          active: true,
          dirty: true,
          relativePath: "story/opening.inscape",
          revision: 2,
          text: dirtyText,
        },
        {
          active: false,
          dirty: false,
          relativePath: "story/evidence.inscape",
          revision: 1,
          text: "# Evidence\nNarrator: Evidence.",
        },
      ],
      revision: 2,
      workspaceRoot,
    },
  };
}

function nodeInvocation(scriptPath) {
  return {
    args: [scriptPath],
    artifactHealth: "available",
    artifactKind: "test-stdio",
    available: true,
    command: process.execPath,
    cwd: path.dirname(scriptPath),
  };
}

async function writeScript(fileName, text) {
  const scriptPath = path.join(tempRoot, fileName);
  await fs.writeFile(scriptPath, text.trimStart(), "utf8");
  return scriptPath;
}

function assertIncludesDiagnostic(diagnostics, code, sourcePath) {
  const found = Array.isArray(diagnostics) && diagnostics.some((diagnostic) =>
    diagnostic?.code === code
    && String(diagnostic.location?.sourcePath || "").replace(/\\/g, "/").endsWith(sourcePath)
  );
  if (!found) {
    throw new Error(`Missing diagnostic ${code} at ${sourcePath}`);
  }
}

function assertIncludes(text, expected, label) {
  if (!String(text).includes(expected)) {
    throw new Error(`${label}: expected to include ${expected}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

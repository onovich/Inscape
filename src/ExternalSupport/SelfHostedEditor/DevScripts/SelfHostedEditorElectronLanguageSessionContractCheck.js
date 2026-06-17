import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  dispatchSelfHostedEditorBackendCommand,
} from "../Desktop/ElectronBackendCommandDispatcher.js";
import {
  SelfHostedEditorElectronLanguageServerSessionBridge,
} from "../Desktop/ElectronLanguageServerSessionBridge.js";
import {
  createSelfHostedEditorElectronWorkspaceSessionStore,
} from "../Desktop/ElectronWorkspaceSessionStore.js";
import {
  EditorBackendTransportCommand,
} from "../Scripts/Backend/Clients/EditorBackendTransport.js";

const firstWorkspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "inscape-electron-language-first-"));
const secondWorkspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "inscape-electron-language-second-"));
const bridge = new SelfHostedEditorElectronLanguageServerSessionBridge({
  requestTimeoutMilliseconds: 60000,
});
let selectedWorkspaceRoot = firstWorkspaceRoot;

try {
  await writeText(path.join(firstWorkspaceRoot, "story", "opening.inscape"), `# Opening
Narrator: Start.
-> Evidence`);
  await writeText(path.join(firstWorkspaceRoot, "story", "evidence.inscape"), `# Evidence
Narrator: The evidence is ready.`);
  await writeText(path.join(secondWorkspaceRoot, "story", "second.inscape"), `# Second
Narrator: Second workspace.`);

  const sessionStore = createSelfHostedEditorElectronWorkspaceSessionStore({
    languageServerSessionBridge: bridge,
    selectWorkspaceRoot: async () => selectedWorkspaceRoot,
    sessionId: "electron-long-lived-language",
  });

  const openResult = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.WorkspaceOpenFolder,
    {},
    {
      sessionStore,
    }
  );
  assertEqual(openResult.ok, true, "long-lived language workspace opens");
  assertEqual(openResult.projectSession.languageSession.kind, "long-lived", "workspace status language kind");
  assertEqual(openResult.projectSession.languageSession.health, "ready", "workspace status language health");
  assertEqual(openResult.projectSession.languageSession.documentRevisionLag, 0, "workspace status initial language revision lag");
  const firstProcessId = bridge.getProcessId();
  assertEqual(firstProcessId > 0, true, "workspace open starts LanguageServer process");

  const readResult = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.DocumentBufferRead,
    {
      relativePath: "story/opening.inscape",
    },
    {
      sessionStore,
    }
  );
  const updateResult = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.DocumentBufferUpdateDraft,
    {
      baseRevision: readResult.document.revision,
      relativePath: "story/opening.inscape",
      text: `# Opening
Narrator: Start.
-> Evidence
-> MissingTarget

# DraftOnly
Narrator: Unsaved node.`,
    },
    {
      sessionStore,
    }
  );
  assertEqual(updateResult.ok, true, "long-lived language setup updates current buffer");

  const dirtyStatus = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.ProjectSessionStatus,
    {},
    {
      sessionStore,
    }
  );
  assertEqual(dirtyStatus.languageSession.kind, "long-lived", "dirty status language kind");
  assertEqual(dirtyStatus.languageSession.health, "ready", "dirty status language health");
  assertEqual(dirtyStatus.languageSession.documentRevisionLag > 0, true, "dirty status reports unsynced revision lag");
  assertEqual(JSON.stringify(dirtyStatus).includes("DraftOnly"), false, "dirty status is text-free");

  const diagnostics = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.LanguageDiagnostics,
    {
      activeRelativePath: "story/opening.inscape",
      scriptText: "# Stale\nNarrator: stale renderer text",
    },
    {
      sessionStore,
    }
  );
  assertEqual(diagnostics.format, "inscape.language-server-project-diagnostics", "long-lived diagnostics format");
  assertIncludesDiagnostic(diagnostics.diagnostics, "INS020", "story/opening.inscape");
  assertEqual(JSON.stringify(diagnostics).includes("stale renderer text"), false, "diagnostics ignore stale renderer text");

  const completions = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.LanguageCompletions,
    {
      activeRelativePath: "story/opening.inscape",
    },
    {
      sessionStore,
    }
  );
  assertEqual(completions.format, "inscape.language-server-project-completions", "long-lived completions format");
  assertEqual(Array.isArray(completions.completions), true, "long-lived completions array");

  const definition = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.LanguageDefinition,
    {
      activeRelativePath: "story/opening.inscape",
      definitionName: "Evidence",
    },
    {
      sessionStore,
    }
  );
  assertEqual(definition.format, "inscape.language-server-project-definition", "long-lived definition format");

  const references = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.LanguageReferences,
    {
      activeRelativePath: "story/opening.inscape",
      referenceName: "Evidence",
    },
    {
      sessionStore,
    }
  );
  assertEqual(references.format, "inscape.language-server-project-references", "long-lived references format");

  const hover = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.LanguageHover,
    {
      activeRelativePath: "story/opening.inscape",
      hoverKind: "node",
      hoverName: "Evidence",
    },
    {
      sessionStore,
    }
  );
  assertEqual(hover.format, "inscape.language-server-project-hover", "long-lived hover format");

  const symbols = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.LanguageDocumentSymbols,
    {
      activeRelativePath: "story/opening.inscape",
    },
    {
      sessionStore,
    }
  );
  assertEqual(symbols.format, "inscape.language-server-document-symbols", "long-lived document symbols format");
  assertIncludesSymbol(symbols.symbols, "DraftOnly", "story/opening.inscape");
  assertEqual(bridge.getProcessId(), firstProcessId, "language commands reuse the workspace process");

  const cleanStatus = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.ProjectSessionStatus,
    {},
    {
      sessionStore,
    }
  );
  assertEqual(cleanStatus.languageSession.documentRevisionLag, 0, "language request syncs dirty buffer revision");
  assertEqual(JSON.stringify(cleanStatus).includes("Unsaved node"), false, "language status remains text-free");

  selectedWorkspaceRoot = secondWorkspaceRoot;
  const switched = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.WorkspaceOpenFolder,
    {},
    {
      sessionStore,
    }
  );
  assertEqual(switched.ok, true, "workspace switch succeeds");
  const secondProcessId = bridge.getProcessId();
  assertEqual(secondProcessId > 0, true, "workspace switch starts replacement process");
  assertEqual(secondProcessId !== firstProcessId, true, "workspace switch replaces old LanguageServer process");
  assertEqual(switched.projectSession.languageSession.health, "ready", "switched workspace language health");

  await sessionStore.dispose({
    trigger: "contract-finished",
  });
  assertEqual(bridge.getProcessId(), 0, "session dispose stops LanguageServer process");

  console.log("SelfHostedEditor Electron long-lived LanguageServer contract ok");
} finally {
  await bridge.dispose();
  await fs.rm(firstWorkspaceRoot, {
    force: true,
    recursive: true,
  });
  await fs.rm(secondWorkspaceRoot, {
    force: true,
    recursive: true,
  });
}

async function writeText(filePath, text) {
  await fs.mkdir(path.dirname(filePath), {
    recursive: true,
  });
  await fs.writeFile(filePath, text, "utf8");
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

function assertIncludesSymbol(symbols, name, sourcePath) {
  const found = Array.isArray(symbols) && symbols.some((symbol) =>
    symbol?.name === name
    && String(symbol.location?.sourcePath || "").replace(/\\/g, "/").endsWith(sourcePath)
  );
  if (!found) {
    throw new Error(`Missing document symbol ${name} at ${sourcePath}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

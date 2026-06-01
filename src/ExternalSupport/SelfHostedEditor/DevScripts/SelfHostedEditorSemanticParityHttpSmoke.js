import {
  createSelfHostedEditorPreviewServer,
} from "./StartSelfHostedEditorPreview.js";

const openingText = `# Opening
Narrator: Start.
-> Evidence
-> MissingTarget

# DraftOnly
Narrator: Unsaved current draft node.`;

const workspace = {
  currentFilePath: "story/opening.inscape",
  documents: [
    {
      relativePath: "story/opening.inscape",
      text: openingText,
    },
    {
      relativePath: "story/evidence.inscape",
      text: `# Evidence
Narrator: The evidence is ready.`,
    },
  ],
};

async function main() {
  const server = createSelfHostedEditorPreviewServer(0);
  const address = await listen(server);

  try {
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const diagnostics = await postJson(baseUrl, "/api/diagnostics", {
      scriptText: openingText,
      workspace,
    });
    assertEqual(diagnostics.format, "inscape.language-server-project-diagnostics", "diagnostics format");
    assertIncludesDiagnostic(diagnostics.diagnostics, "INS020", "story/opening.inscape");
    assertNoTempSourcePaths(diagnostics.diagnostics, "diagnostics");

    const completions = await postJson(baseUrl, "/api/completions", {
      scriptText: openingText,
      workspace,
    });
    assertEqual(completions.format, "inscape.language-server-project-completions", "completions format");
    assertIncludesCompletion(completions.completions, "Evidence");
    assertIncludesCompletion(completions.completions, "DraftOnly");

    const definition = await postJson(baseUrl, "/api/definition", {
      definitionName: "Evidence",
      scriptText: openingText,
      workspace,
    });
    assertEqual(definition.format, "inscape.language-server-project-definition", "definition format");
    assertEqual(definition.definition?.location?.sourcePath, "story/evidence.inscape", "definition source path");
    assertNoTempSourcePaths([definition.definition], "definition");

    const references = await postJson(baseUrl, "/api/references", {
      referenceName: "Evidence",
      scriptText: openingText,
      workspace,
    });
    assertEqual(references.format, "inscape.language-server-project-references", "references format");
    assertEqual(references.references?.length, 1, "references count");
    assertEqual(references.references?.[0]?.location?.sourcePath, "story/opening.inscape", "reference source path");
    assertEqual(references.references?.[0]?.location?.line, 2, "reference line");
    assertNoTempSourcePaths(references.references, "references");

    const hover = await postJson(baseUrl, "/api/hover", {
      hoverKind: "jump",
      hoverName: "Evidence",
      scriptText: openingText,
      workspace,
    });
    assertEqual(hover.format, "inscape.language-server-project-hover", "hover format");
    assertEqual(hover.hover?.label, "Evidence", "hover label");
    assertEqual(hover.hover?.kind, "jump", "hover kind");
    assertEqual(hover.hover?.location?.sourcePath, "story/opening.inscape", "hover source path");
    assertNoTempSourcePaths([hover.hover], "hover");

    const symbols = await postJson(baseUrl, "/api/document-symbols", {
      scriptText: openingText,
      workspace,
    });
    assertEqual(symbols.format, "inscape.language-server-document-symbols", "document symbols format");
    assertIncludesSymbol(symbols.symbols, "Opening", "story/opening.inscape");
    assertIncludesSymbol(symbols.symbols, "DraftOnly", "story/opening.inscape");
    assertNoTempSourcePaths(symbols.symbols, "document symbols");

    console.log("SelfHostedEditor semantic parity HTTP smoke ok");
  } finally {
    await close(server);
  }
}

async function postJson(baseUrl, pathname, body) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const payload = JSON.parse(text);
  if (!response.ok) {
    throw new Error(`${pathname} failed with HTTP ${response.status}: ${text}`);
  }

  return payload;
}

function assertIncludesDiagnostic(diagnostics, code, sourcePath) {
  const found = Array.isArray(diagnostics) && diagnostics.some((diagnostic) =>
    diagnostic?.code === code
    && diagnostic.location?.sourcePath === sourcePath
  );
  if (!found) {
    throw new Error(`Missing diagnostic ${code} at ${sourcePath}`);
  }
}

function assertIncludesCompletion(completions, label) {
  const found = Array.isArray(completions) && completions.some((completion) => completion?.label === label);
  if (!found) {
    throw new Error(`Missing completion ${label}`);
  }
}

function assertIncludesSymbol(symbols, name, sourcePath) {
  const found = Array.isArray(symbols) && symbols.some((symbol) =>
    symbol?.name === name
    && symbol.location?.sourcePath === sourcePath
  );
  if (!found) {
    throw new Error(`Missing document symbol ${name} at ${sourcePath}`);
  }
}

function assertNoTempSourcePaths(items, label) {
  const found = (Array.isArray(items) ? items : []).find((item) =>
    String(item?.location?.sourcePath || "").includes("inscape-self-hosted-editor-")
  );
  if (found) {
    throw new Error(`${label} should expose workspace-relative source paths, got ${found.location.sourcePath}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve(server.address());
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});

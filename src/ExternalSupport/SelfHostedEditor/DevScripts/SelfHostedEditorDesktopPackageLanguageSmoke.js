import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSelfHostedEditorDesktopPackageReadiness } from "./SelfHostedEditorDesktopPackageContractCheck.js";

export const SelfHostedEditorDesktopPackageLanguageSmokeFormat = "inscape.self-hosted-editor.desktop-package-language-smoke";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = readJson("package.json");
const readiness = buildSelfHostedEditorDesktopPackageReadiness(packageJson, { moduleRoot });

assertEqual(readiness.windowsPackageGenerated, true, "desktop packaged language smoke requires generated package");
assertEqual(readiness.languageServerArtifactGenerated, true, "desktop packaged language smoke requires bundled LanguageServer artifact");
assertFileExists(readiness.expectedExecutablePath, "desktop package executable");
assertFileExists(readiness.expectedLanguageServerRuntimeConfigPath, "desktop package LanguageServer runtime config");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "inscape-packaged-language-smoke-"));
const resultPath = path.join(tempRoot, "packaged-language-smoke-result.json");
try {
  writeText(
    path.join(tempRoot, "story", "opening.inscape"),
    "# Opening\nNarrator: packaged original text"
  );
  writeText(
    path.join(tempRoot, "story", "evidence.inscape"),
    "# Evidence\nNarrator: packaged evidence target."
  );

  const smokeResult = spawnSync(readiness.expectedExecutablePath, [], {
    cwd: path.dirname(readiness.expectedExecutablePath),
    encoding: "utf8",
    env: {
      ...process.env,
      ELECTRON_ENABLE_LOGGING: "0",
      SELF_HOSTED_EDITOR_ELECTRON_PACKAGED_LANGUAGE_SMOKE: "true",
      SELF_HOSTED_EDITOR_ELECTRON_SMOKE_RESULT_PATH: resultPath,
      SELF_HOSTED_EDITOR_ELECTRON_SMOKE_WORKSPACE_ROOT: tempRoot,
    },
    timeout: 60000,
    windowsHide: true,
  });

  if (smokeResult.error) {
    throw new Error(`Desktop packaged language smoke failed to launch: ${smokeResult.error.message}.\nstdout:\n${smokeResult.stdout}\nstderr:\n${smokeResult.stderr}`);
  }

  if (smokeResult.status !== 0) {
    throw new Error(`Desktop packaged language smoke failed with exit code ${smokeResult.status}.\nstdout:\n${smokeResult.stdout}\nstderr:\n${smokeResult.stderr}\nresult:\n${readOptionalText(resultPath)}`);
  }

  const result = readJsonAbsolute(resultPath);
  assertEqual(result.format, "inscape.self-hosted-editor.electron-packaged-language-smoke", "packaged language smoke result format");
  assertEqual(result.ok, true, "packaged language smoke result ok");
  assertEqual(result.languageSession.kind, "long-lived", "packaged language smoke session kind");
  assertEqual(result.languageSession.health, "ready", "packaged language smoke session health");
  assertEqual(result.languageSession.artifactHealth, "available", "packaged language smoke artifact health");
  assertEqual(result.languageSession.artifactKind.startsWith("packaged-"), true, "packaged language smoke artifact kind");
  assertEqual(result.languageSession.documentRevisionLag, 0, "packaged language smoke revision lag");
  assertEqual(Object.keys(result.endpointFormats).length, 6, "packaged language smoke endpoint count");

  console.log(`${SelfHostedEditorDesktopPackageLanguageSmokeFormat} ok: ${readiness.expectedExecutableName}`);
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(moduleRoot, relativePath), "utf8"));
}

function readJsonAbsolute(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readOptionalText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function assertFileExists(filePath, label) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`${label} does not exist: ${filePath}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

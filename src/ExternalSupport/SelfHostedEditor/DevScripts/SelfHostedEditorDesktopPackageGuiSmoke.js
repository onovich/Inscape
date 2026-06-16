import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSelfHostedEditorDesktopPackageReadiness } from "./SelfHostedEditorDesktopPackageContractCheck.js";

export const SelfHostedEditorDesktopPackageGuiSmokeFormat = "inscape.self-hosted-editor.desktop-package-gui-smoke";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = readJson("package.json");
const readiness = buildSelfHostedEditorDesktopPackageReadiness(packageJson, { moduleRoot });

assertEqual(readiness.windowsPackageGenerated, true, "desktop package GUI smoke requires generated package");
assertFileExists(readiness.expectedExecutablePath, "desktop package executable");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "inscape-packaged-gui-smoke-"));
const resultPath = path.join(tempRoot, "packaged-gui-smoke-result.json");
try {
  writeText(
    path.join(tempRoot, "story", "opening.inscape"),
    "# Opening\nNarrator: packaged original text"
  );

  const smokeResult = spawnSync(readiness.expectedExecutablePath, [], {
    cwd: path.dirname(readiness.expectedExecutablePath),
    encoding: "utf8",
    env: {
      ...process.env,
      ELECTRON_ENABLE_LOGGING: "0",
      SELF_HOSTED_EDITOR_ELECTRON_PACKAGED_GUI_SMOKE: "true",
      SELF_HOSTED_EDITOR_ELECTRON_SMOKE_RESULT_PATH: resultPath,
      SELF_HOSTED_EDITOR_ELECTRON_SMOKE_WORKSPACE_ROOT: tempRoot,
    },
    timeout: 45000,
    windowsHide: true,
  });

  if (smokeResult.error) {
    throw new Error(`Desktop packaged GUI smoke failed to launch: ${smokeResult.error.message}.\nstdout:\n${smokeResult.stdout}\nstderr:\n${smokeResult.stderr}`);
  }

  if (smokeResult.status !== 0) {
    throw new Error(`Desktop packaged GUI smoke failed with exit code ${smokeResult.status}.\nstdout:\n${smokeResult.stdout}\nstderr:\n${smokeResult.stderr}\nresult:\n${readOptionalText(resultPath)}`);
  }

  const result = readJsonAbsolute(resultPath);
  assertEqual(result.format, "inscape.self-hosted-editor.electron-packaged-gui-smoke", "packaged GUI smoke result format");
  assertEqual(result.ok, true, "packaged GUI smoke result ok");
  assertEqual(result.languageCallCount, 2, "packaged GUI smoke language call count");
  assertEqual(
    fs.readFileSync(path.join(tempRoot, "story", "opening.inscape"), "utf8"),
    "# Opening\nNarrator: packaged restore text",
    "packaged GUI smoke restore wrote disk"
  );

  console.log(`${SelfHostedEditorDesktopPackageGuiSmokeFormat} ok: ${readiness.expectedExecutableName}`);
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

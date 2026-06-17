import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  resolveSelfHostedEditorElectronLanguageServerInvocation,
} from "../Desktop/ElectronLanguageServerSessionBridge.js";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "inscape-electron-language-artifact-"));

try {
  const packagedRoot = path.join(tempRoot, "packaged");
  const packagedArtifactRoot = path.join(packagedRoot, "resources", "language-server");
  await writeArtifact(packagedArtifactRoot, {
    exe: true,
  });
  const packagedExe = resolveSelfHostedEditorElectronLanguageServerInvocation(["--stdio"], {
    packaged: true,
    resourcesRoot: path.join(packagedRoot, "resources"),
  });
  assertEqual(packagedExe.available, true, "packaged exe artifact is available");
  assertEqual(packagedExe.artifactKind, "packaged-exe", "packaged exe artifact kind");
  assertEqual(packagedExe.artifactHealth, "available", "packaged exe artifact health");
  assertEqual(packagedExe.args.includes("--stdio"), true, "packaged exe preserves language args");
  assertEqual(packagedExe.command.endsWith("Inscape.LanguageServer.exe"), true, "packaged exe command");
  assertNotIncludes(packagedExe.command.replace(/\\/g, "/"), "/src/Internal/", "packaged exe does not resolve source path");

  const packagedDllRoot = path.join(tempRoot, "packaged-dll", "resources", "language-server");
  await writeArtifact(packagedDllRoot, {
    dll: true,
  });
  const packagedDll = resolveSelfHostedEditorElectronLanguageServerInvocation(["--stdio"], {
    packaged: true,
    resourcesRoot: path.join(tempRoot, "packaged-dll", "resources"),
  });
  assertEqual(packagedDll.available, true, "packaged dll artifact is available");
  assertEqual(packagedDll.artifactKind, "packaged-dll", "packaged dll artifact kind");
  assertEqual(packagedDll.command, "dotnet", "packaged dll command");
  assertEqual(packagedDll.args[0].endsWith("Inscape.LanguageServer.dll"), true, "packaged dll first arg");

  const packagedMissing = resolveSelfHostedEditorElectronLanguageServerInvocation(["--stdio"], {
    packaged: true,
    resourcesRoot: path.join(tempRoot, "packaged-missing", "resources"),
  });
  assertEqual(packagedMissing.available, false, "packaged missing artifact is unavailable");
  assertEqual(packagedMissing.artifactKind, "packaged-missing", "packaged missing artifact kind");
  assertEqual(packagedMissing.reason, "language-server-packaged-artifact-missing", "packaged missing reason");
  assertNotIncludes(packagedMissing.message, tempRoot, "packaged missing message is path-free");

  const devRepoRoot = path.join(tempRoot, "repo");
  const devArtifactRoot = path.join(devRepoRoot, "src", "Internal", "LanguageServer", "bin", "Debug", "net10.0");
  await writeArtifact(devArtifactRoot, {
    exe: true,
  });
  const devExe = resolveSelfHostedEditorElectronLanguageServerInvocation(["--stdio"], {
    packaged: false,
    repoRoot: devRepoRoot,
  });
  assertEqual(devExe.available, true, "dev exe artifact is available");
  assertEqual(devExe.artifactKind, "dev-build-exe", "dev exe artifact kind");

  const devProjectRoot = path.join(tempRoot, "repo-project");
  const devProjectPath = path.join(devProjectRoot, "src", "Internal", "LanguageServer", "Inscape.LanguageServer.csproj");
  await fs.mkdir(path.dirname(devProjectPath), { recursive: true });
  await fs.writeFile(devProjectPath, "<Project />", "utf8");
  const devProject = resolveSelfHostedEditorElectronLanguageServerInvocation(["--stdio"], {
    packaged: false,
    repoRoot: devProjectRoot,
  });
  assertEqual(devProject.available, true, "dev project fallback is available");
  assertEqual(devProject.artifactKind, "dev-project", "dev project artifact kind");
  assertEqual(devProject.command, "dotnet", "dev project command");
  assertEqual(devProject.args.includes("--project"), true, "dev project uses dotnet project");

  console.log("SelfHostedEditor Electron LanguageServer artifact resolver contract ok");
} finally {
  await fs.rm(tempRoot, {
    force: true,
    recursive: true,
  });
}

async function writeArtifact(artifactRoot, options = {}) {
  await fs.mkdir(artifactRoot, {
    recursive: true,
  });
  await fs.writeFile(path.join(artifactRoot, "Inscape.LanguageServer.runtimeconfig.json"), "{}", "utf8");
  await fs.writeFile(path.join(artifactRoot, "Inscape.LanguageServer.dll"), "dll", "utf8");
  if (options.exe) {
    await fs.writeFile(path.join(artifactRoot, "Inscape.LanguageServer.exe"), "exe", "utf8");
  }
  if (options.dll === false) {
    await fs.rm(path.join(artifactRoot, "Inscape.LanguageServer.dll"), {
      force: true,
    });
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertNotIncludes(text, unexpected, label) {
  if (String(text).includes(unexpected)) {
    throw new Error(`${label}: unexpected ${unexpected}`);
  }
}

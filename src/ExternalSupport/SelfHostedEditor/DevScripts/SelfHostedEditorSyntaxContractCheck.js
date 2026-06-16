import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const syntaxRoots = [
  "Desktop",
  "Scripts",
  "DevScripts",
];

function collectJavaScriptFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJavaScriptFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}

const syntaxTargets = syntaxRoots
  .flatMap((relativeRoot) => collectJavaScriptFiles(path.join(moduleRoot, relativeRoot)))
  .sort((left, right) => left.localeCompare(right));

let failed = false;
for (const target of syntaxTargets) {
  const result = spawnSync(process.execPath, ["--check", target], {
    cwd: moduleRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    failed = true;
    console.error(`SelfHostedEditor syntax check failed: ${path.relative(moduleRoot, target)}`);
    if (result.stdout) {
      console.error(result.stdout.trimEnd());
    }
    if (result.stderr) {
      console.error(result.stderr.trimEnd());
    }
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log(`SelfHostedEditor syntax ok (${syntaxTargets.length} files)`);
}

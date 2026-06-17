import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SelfHostedEditorDesktopPackageReadinessFormat = "inscape.self-hosted-editor.desktop-package-readiness";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = readJson("package.json");
const packageLock = readJson("package-lock.json");

assertEqual(packageJson.main, "Desktop/ElectronMain.js", "desktop package main entry");
assertEqual(packageJson.scripts?.["check:desktop-package"], "node DevScripts/SelfHostedEditorDesktopPackageContractCheck.js", "desktop package check script");
assertEqual(packageJson.scripts?.["package:windows"], "electron-builder --win dir --x64", "desktop package Windows script");
assertEqual(packageJson.scripts?.["smoke:desktop-package-gui"], "node DevScripts/SelfHostedEditorDesktopPackageGuiSmoke.js", "desktop package GUI smoke script");
assertEqual(packageJson.scripts?.["smoke:desktop-package-language"], "node DevScripts/SelfHostedEditorDesktopPackageLanguageSmoke.js", "desktop package LanguageServer smoke script");
assert(packageJson.devDependencies?.electron, "desktop package requires Electron dev dependency");
assert(packageJson.devDependencies?.["electron-builder"], "desktop package requires electron-builder dev dependency");

const lockfileRootPackage = packageLock.packages?.[""] || {};
assertEqual(lockfileRootPackage.devDependencies?.electron, packageJson.devDependencies.electron, "desktop package lockfile Electron range");
assertEqual(lockfileRootPackage.devDependencies?.["electron-builder"], packageJson.devDependencies["electron-builder"], "desktop package lockfile electron-builder range");

const buildConfig = packageJson.build || {};
assertEqual(buildConfig.appId, "dev.inscape.self-hosted-editor", "desktop package app id");
assertEqual(buildConfig.productName, "Inscape SelfHostedEditor", "desktop package product name");
assertEqual(buildConfig.asar, true, "desktop package asar setting");
assertEqual(buildConfig.electronDist, "node_modules/electron/dist", "desktop package local Electron dist");
assertEqual(buildConfig.electronVersion, "42.4.0", "desktop package Electron version");
assertEqual(buildConfig.directories?.output, "dist", "desktop package output directory");
assertArrayIncludes(buildConfig.files, "Desktop/**/*", "desktop package files");
assertArrayIncludes(buildConfig.files, "Resources/**/*", "desktop package files");
assertArrayIncludes(buildConfig.files, "Scripts/**/*", "desktop package files");
assertArrayIncludes(buildConfig.files, "package.json", "desktop package files");
assertArrayIncludes(buildConfig.files, "node_modules/monaco-editor/**/*", "desktop package files");
assertArrayExcludes(buildConfig.files, "DevScripts/**/*", "desktop package files");
const samplesResource = findResourceByTarget(buildConfig.extraResources, "samples");
assertEqual(samplesResource.from, "../../../samples", "desktop package samples resource source");
assertEqual(samplesResource.to, "samples", "desktop package samples resource target");
assertArrayIncludes(samplesResource.filter, "**/*", "desktop package samples resource filter");
const languageServerResource = findResourceByTarget(buildConfig.extraResources, "language-server");
assertEqual(languageServerResource.from, "../../../src/Internal/LanguageServer/bin/Debug/net10.0", "desktop package LanguageServer resource source");
assertEqual(languageServerResource.to, "language-server", "desktop package LanguageServer resource target");
assertEqual(path.isAbsolute(languageServerResource.from), false, "desktop package LanguageServer resource source is relative");
assertArrayIncludes(languageServerResource.filter, "Inscape.Compiler.dll", "desktop package LanguageServer resource filter");
assertArrayIncludes(languageServerResource.filter, "Inscape.LanguageServer.deps.json", "desktop package LanguageServer resource filter");
assertArrayIncludes(languageServerResource.filter, "Inscape.LanguageServer.dll", "desktop package LanguageServer resource filter");
assertArrayIncludes(languageServerResource.filter, "Inscape.LanguageServer.exe", "desktop package LanguageServer resource filter");
assertArrayIncludes(languageServerResource.filter, "Inscape.LanguageServer.runtimeconfig.json", "desktop package LanguageServer resource filter");
assertArrayIncludes(languageServerResource.filter, "Inscape.Tooling.dll", "desktop package LanguageServer resource filter");
assertArrayIncludes(languageServerResource.filter, "Resources/**/*", "desktop package LanguageServer resource filter");
assertArrayExcludes(languageServerResource.filter, "../../../src/Internal/LanguageServer/Inscape.LanguageServer.csproj", "desktop package LanguageServer resource filter");

const winTarget = buildConfig.win?.target?.[0] || {};
assertEqual(winTarget.target, "dir", "desktop package Windows target");
assertArrayIncludes(winTarget.arch, "x64", "desktop package Windows arch");

const readiness = buildSelfHostedEditorDesktopPackageReadiness(packageJson);
assertEqual(readiness.format, SelfHostedEditorDesktopPackageReadinessFormat, "desktop package readiness format");
assertEqual(readiness.windowsPackageScriptAvailable, true, "desktop package script availability");
assertEqual(readiness.expectedExecutableName, "Inscape SelfHostedEditor.exe", "desktop package expected executable name");
assertEqual(readiness.expectedLanguageServerDirectoryName, "language-server", "desktop package LanguageServer resource directory name");
if (!readiness.windowsPackageGenerated) {
  assertArrayIncludes(readiness.knownLimitations, "windows-package-not-generated", "desktop package known limitations");
}
if (readiness.windowsPackageGenerated && !readiness.languageServerArtifactGenerated) {
  assertArrayIncludes(readiness.knownLimitations, "language-server-artifact-not-generated", "desktop package known limitations");
}

console.log("SelfHostedEditor desktop package contract ok");

export function buildSelfHostedEditorDesktopPackageReadiness(packageManifest, options = {}) {
  const outputDirectoryName = packageManifest.build?.directories?.output || "dist";
  const productName = packageManifest.build?.productName || "Inscape SelfHostedEditor";
  const expectedExecutableName = `${productName}.exe`;
  const expectedPackageDirectory = path.join(options.moduleRoot || moduleRoot, outputDirectoryName, "win-unpacked");
  const expectedExecutablePath = path.join(expectedPackageDirectory, expectedExecutableName);
  const windowsPackageGenerated = fs.existsSync(expectedExecutablePath);
  const expectedLanguageServerDirectoryName = "language-server";
  const expectedLanguageServerDirectoryPath = path.join(expectedPackageDirectory, "resources", expectedLanguageServerDirectoryName);
  const expectedLanguageServerExecutablePath = path.join(expectedLanguageServerDirectoryPath, "Inscape.LanguageServer.exe");
  const expectedLanguageServerDllPath = path.join(expectedLanguageServerDirectoryPath, "Inscape.LanguageServer.dll");
  const expectedLanguageServerRuntimeConfigPath = path.join(expectedLanguageServerDirectoryPath, "Inscape.LanguageServer.runtimeconfig.json");
  const languageServerArtifactGenerated = windowsPackageGenerated
    && fs.existsSync(expectedLanguageServerRuntimeConfigPath)
    && (fs.existsSync(expectedLanguageServerExecutablePath) || fs.existsSync(expectedLanguageServerDllPath));

  return {
    expectedExecutableName,
    expectedExecutablePath,
    expectedLanguageServerDirectoryName,
    expectedLanguageServerDirectoryPath,
    expectedLanguageServerDllPath,
    expectedLanguageServerExecutablePath,
    expectedLanguageServerRuntimeConfigPath,
    format: SelfHostedEditorDesktopPackageReadinessFormat,
    knownLimitations: [
      ...(!windowsPackageGenerated ? ["windows-package-not-generated"] : []),
      ...(windowsPackageGenerated && !languageServerArtifactGenerated ? ["language-server-artifact-not-generated"] : []),
    ],
    languageServerArtifactGenerated,
    windowsPackageGenerated,
    windowsPackageScriptAvailable: packageManifest.scripts?.["package:windows"] === "electron-builder --win dir --x64",
  };
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(moduleRoot, relativePath), "utf8");
}

function assertArrayIncludes(values, expected, label) {
  if (!Array.isArray(values) || !values.includes(expected)) {
    throw new Error(`${label}: expected to include ${expected}`);
  }
}

function assertArrayExcludes(values, unexpected, label) {
  if (Array.isArray(values) && values.includes(unexpected)) {
    throw new Error(`${label}: expected to exclude ${unexpected}`);
  }
}

function findResourceByTarget(resources, target) {
  return (Array.isArray(resources) ? resources : []).find((resource) => resource?.to === target) || {};
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

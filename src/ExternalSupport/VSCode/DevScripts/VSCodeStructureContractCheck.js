"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const scriptsRoot = path.join(root, "Scripts");
const productRuntimeSemanticScanRoots = [
    scriptsRoot,
    path.join(root, "Resources"),
];
const productRuntimeSemanticScanExtensions = new Set([
    ".js",
    ".json",
    ".code-snippets",
]);
const requiredPaths = [
    "DevScripts/VSCodeSemanticParityContractCheck.js",
];
const allowedBusinessDirectories = new Set([
    "DslScript",
    "EditorAuthoring",
    "Entries",
    "HostBinding",
    "HostSchema",
    "Localization",
    "Preview",
]);
const allowedRoleDirectories = new Set([
    "Bridges",
    "Commands",
    "Controllers",
    "Entries",
    "Models",
    "Providers",
    "ViewModels",
]);
const allowedRoleSuffixes = [
    "Adapter",
    "Bridge",
    "Command",
    "Controller",
    "Entry",
    "Model",
    "Provider",
    "Scheduler",
];
const weakNameParts = [
    "Helper",
    "Manager",
    "Support",
    "Utils",
];
const forbiddenRuntimeSemanticMarkers = [
    ["Condition", "Evaluator"],
    ["Query", "Evaluator"],
    ["Action", "Dispatcher"],
    ["Runtime", "Log", "Builder"],
    ["Log", "Builder"],
    ["Sub", "state", "Importer"],
    ["Sub", "state", "Exporter"],
    ["Runtime", "Inspector"],
    ["Validate", "Sub", "state", "Against", "Current", "Script"],
    ["Export", "Sub", "state"],
    ["Import", "Sub", "state"],
    ["evaluate", "Condition"],
    ["evaluate", "Query"],
    ["dispatch", "Runtime", "Action"],
    ["import", "Sub", "state"],
    ["export", "Sub", "state"],
    ["validate", "Sub", "state", "Against", "Current", "Script"],
].map((parts) => parts.join(""));
const findings = [];

function walk(dir) {
    const result = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            result.push(...walk(fullPath));
        } else {
            result.push(fullPath);
        }
    }
    return result;
}

function relative(filePath) {
    return path.relative(root, filePath).replace(/\\/g, "/");
}

function report(filePath, message) {
    findings.push(`${relative(filePath)}: ${message}`);
}

function isWeakName(name) {
    return weakNameParts.some((part) => name.includes(part));
}

function hasAllowedRoleSuffix(name) {
    return allowedRoleSuffixes.some((suffix) => name.endsWith(suffix));
}

function checkTopLevelEntries() {
    for (const entry of fs.readdirSync(scriptsRoot, { withFileTypes: true })) {
        const fullPath = path.join(scriptsRoot, entry.name);
        if (entry.isDirectory() && !allowedBusinessDirectories.has(entry.name)) {
            report(fullPath, `unexpected Scripts business directory "${entry.name}"`);
        }

        if (entry.isFile() && entry.name !== "ExtensionManifestEntry.js") {
            report(fullPath, "only ExtensionManifestEntry.js should live directly under Scripts");
        }
    }
}

function checkDirectoryRoles(filePath) {
    const parts = path.relative(scriptsRoot, filePath).split(path.sep);
    for (let i = 1; i < parts.length - 1; i += 1) {
        if (!allowedRoleDirectories.has(parts[i])) {
            report(filePath, `unexpected role directory "${parts[i]}"`);
        }
    }
}

function checkFileName(filePath) {
    const baseName = path.basename(filePath, ".js");
    if (baseName === "ExtensionManifestEntry") {
        return;
    }

    if (isWeakName(baseName)) {
        report(filePath, `weak file name "${baseName}"`);
    }

    if (!hasAllowedRoleSuffix(baseName)) {
        report(filePath, `file name "${baseName}" does not end with an allowed role suffix`);
    }
}

function checkClassNames(filePath, text) {
    const classPattern = /\bclass\s+([A-Za-z0-9_]+)/g;
    let match = classPattern.exec(text);
    while (match) {
        const className = match[1];
        if (isWeakName(className)) {
            report(filePath, `weak class name "${className}"`);
        }

        if (!hasAllowedRoleSuffix(className)) {
            report(filePath, `class name "${className}" does not end with an allowed role suffix`);
        }

        match = classPattern.exec(text);
    }
}

function checkLocalRequires(filePath, text) {
    const requirePattern = /\brequire\(["'](\.{1,2}\/[^"']+)["']\)/g;
    let match = requirePattern.exec(text);
    while (match) {
        const requestedPath = match[1];
        const resolvedPath = path.resolve(path.dirname(filePath), requestedPath);
        const candidates = [
            resolvedPath,
            resolvedPath + ".js",
            path.join(resolvedPath, "index.js"),
        ];

        if (!candidates.some((candidate) => fs.existsSync(candidate))) {
            report(filePath, `local require "${requestedPath}" does not resolve to a packaged source file`);
        }

        match = requirePattern.exec(text);
    }
}

function checkRuntimeSemanticBoundary(filePath, text) {
    for (const marker of forbiddenRuntimeSemanticMarkers) {
        if (text.includes(marker)) {
            report(filePath, `runtime semantic implementation marker "${marker}" must stay out of VSCode host product code`);
        }
    }
}

checkTopLevelEntries();
for (const requiredPath of requiredPaths) {
    const fullPath = path.join(root, requiredPath);
    if (!fs.existsSync(fullPath)) {
        report(fullPath, "required VSCode package contract file is missing");
    }
}
for (const filePath of walk(scriptsRoot).filter((file) => file.endsWith(".js"))) {
    const text = fs.readFileSync(filePath, "utf8");
    checkDirectoryRoles(filePath);
    checkFileName(filePath);
    checkClassNames(filePath, text);
    checkLocalRequires(filePath, text);
}
for (const scanRoot of productRuntimeSemanticScanRoots) {
    if (!fs.existsSync(scanRoot)) {
        continue;
    }

    for (const filePath of walk(scanRoot)) {
        if (!productRuntimeSemanticScanExtensions.has(path.extname(filePath))) {
            continue;
        }

        checkRuntimeSemanticBoundary(filePath, fs.readFileSync(filePath, "utf8"));
    }
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (!packageJson.scripts["check:semantic-parity"]) {
    report(path.join(root, "package.json"), "package.json must expose check:semantic-parity");
}

if (findings.length > 0) {
    console.error("VSCode structure contract failed:");
    for (const finding of findings) {
        console.error(" - " + finding);
    }
    process.exit(1);
}

console.log("VSCode structure contract ok");

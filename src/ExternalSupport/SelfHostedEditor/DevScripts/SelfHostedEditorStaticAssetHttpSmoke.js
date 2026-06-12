import {
  createSelfHostedEditorPreviewServer,
} from "./StartSelfHostedEditorPreview.js";

async function main() {
  const server = createSelfHostedEditorPreviewServer(0);
  const address = await listen(server);

  try {
    const workbench = await fetchAsset(address.port, "/");
    assertEqual(workbench.status, 200, "workbench status");
    assertIncludes(workbench.headers.get("content-type"), "text/html; charset=utf-8", "workbench content type");
    assertIncludes(workbench.headers.get("cache-control"), "no-store", "workbench cache policy");
    assertEqual(workbench.headers.get("x-content-type-options"), "nosniff", "workbench nosniff header");
    assertEqual(workbench.headers.get("cross-origin-resource-policy"), "same-origin", "workbench CORP header");
    assertIncludes(workbench.headers.get("content-security-policy"), "object-src 'none'", "workbench CSP object boundary");
    assertIncludes(workbench.headers.get("content-security-policy"), "frame-ancestors 'none'", "workbench CSP framing boundary");

    const script = await fetchAsset(address.port, "/Scripts/Entries/SelfHostedEditorAppEntry.js");
    assertEqual(script.status, 200, "script status");
    assertIncludes(script.headers.get("content-type"), "text/javascript; charset=utf-8", "script content type");
    assertEqual(script.headers.get("content-security-policy"), null, "script response should not carry document CSP");

    const monacoLoader = await fetchAsset(address.port, "/node_modules/monaco-editor/min/vs/loader.js");
    assertEqual(monacoLoader.status, 200, "monaco loader status");
    assertIncludes(monacoLoader.headers.get("content-type"), "text/javascript; charset=utf-8", "monaco loader content type");

    const blockedDevScript = await fetchAsset(address.port, "/DevScripts/StartSelfHostedEditorPreview.js");
    assertEqual(blockedDevScript.status, 403, "dev script static exposure status");

    const blockedPackage = await fetchAsset(address.port, "/package.json");
    assertEqual(blockedPackage.status, 403, "package static exposure status");

    const unsupported = await fetchAsset(address.port, "/Resources/Styles/unknown.bin");
    assertEqual(unsupported.status, 415, "unsupported static asset status");

    console.log("SelfHostedEditor static asset HTTP smoke ok");
  } finally {
    await close(server);
  }
}

async function fetchAsset(port, pathname) {
  return await fetch(`http://127.0.0.1:${port}${pathname}`);
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve(server.address());
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertIncludes(text, expected, label) {
  if (!String(text || "").includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(text)} to include ${JSON.stringify(expected)}`);
  }
}

await main();

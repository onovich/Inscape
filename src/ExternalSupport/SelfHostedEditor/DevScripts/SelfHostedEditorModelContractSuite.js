const contractModules = [
  "./SelfHostedEditorModelContractCheck.js",
  "./SelfHostedEditorHttpBridgeContractCheck.js",
  "./SelfHostedEditorPayloadBridgeContractCheck.js",
  "./SelfHostedEditorStaticAssetBridgeContractCheck.js",
  "./SelfHostedEditorProcessBridgeContractCheck.js",
  "./SelfHostedEditorSessionCacheContractCheck.js",
  "./SelfHostedEditorProjectSessionContractCheck.js",
  "./SelfHostedEditorDesktopBackendContractCheck.js",
];

for (const contractModule of contractModules) {
  await import(contractModule);
}

console.log("SelfHostedEditor model contract suite ok");

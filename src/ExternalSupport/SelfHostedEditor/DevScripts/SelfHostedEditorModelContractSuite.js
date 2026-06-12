const contractModules = [
  "./SelfHostedEditorModelContractCheck.js",
  "./SelfHostedEditorHttpBridgeContractCheck.js",
  "./SelfHostedEditorStaticAssetBridgeContractCheck.js",
  "./SelfHostedEditorProcessBridgeContractCheck.js",
  "./SelfHostedEditorSessionCacheContractCheck.js",
];

for (const contractModule of contractModules) {
  await import(contractModule);
}

console.log("SelfHostedEditor model contract suite ok");

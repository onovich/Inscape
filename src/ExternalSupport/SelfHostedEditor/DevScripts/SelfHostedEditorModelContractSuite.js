const contractModules = [
  "./SelfHostedEditorModelContractCheck.js",
  "./SelfHostedEditorBackendServiceContractCheck.js",
  "./SelfHostedEditorBackendTransportContractCheck.js",
  "./SelfHostedEditorFakeEmbeddedTransportContractCheck.js",
  "./SelfHostedEditorPreloadTransportContractCheck.js",
  "./SelfHostedEditorHttpBridgeContractCheck.js",
  "./SelfHostedEditorPayloadBridgeContractCheck.js",
  "./SelfHostedEditorStaticAssetBridgeContractCheck.js",
  "./SelfHostedEditorProcessBridgeContractCheck.js",
  "./SelfHostedEditorSessionCacheContractCheck.js",
  "./SelfHostedEditorProjectSessionContractCheck.js",
  "./SelfHostedEditorDesktopBackendContractCheck.js",
  "./SelfHostedEditorWorkspaceFileSystemContractCheck.js",
  "./SelfHostedEditorElectronBoundaryContractCheck.js",
  "./SelfHostedEditorElectronShellContractCheck.js",
];

for (const contractModule of contractModules) {
  await import(contractModule);
}

console.log("SelfHostedEditor model contract suite ok");

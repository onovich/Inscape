export const SelfHostedEditorElectronIpcChannel = "inscape.self-hosted-editor.backend.invoke";

export function buildSelfHostedEditorElectronIpcEnvelope(command, payload = {}) {
  return {
    command,
    payload: payload || {},
  };
}

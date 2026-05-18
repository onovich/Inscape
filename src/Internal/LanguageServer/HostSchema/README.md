# HostSchema

Owns LanguageServer-facing Host Schema capability probes.

- `Domains` contains providers that adapt Internal Tooling Host Schema contracts to LanguageServer probe output.

Do not parse Host Schema JSON directly in this layer. Reuse `Inscape.Tooling` readers and capability models so VSCode, CLI, and future LSP transport see one shared contract.

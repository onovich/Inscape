# HostBinding

Owns LanguageServer-facing Host Bridge capability probes.

- `Domains` adapts Internal Tooling HostBinding contracts to LanguageServer probe output.
- This layer must not parse `.host.bridge.json` for a specific editor host; it delegates project config and capability catalog work to `Inscape.Tooling`.

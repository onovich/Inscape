# HostIntegrationAudit

Owns shared Host Integration Audit models and comparison logic.

Allowed contents: `inscape.host-integration.audit` models, Usage Manifest / Host Schema / Host Bridge comparison domains, and audit summary generation.

Do not own Compiler parser truth, Host Schema generation, Host Bridge host-specific payloads, or Runtime execution. CLI, LanguageServer, VSCode, and SelfHostedEditor should consume the shared audit payload instead of rebuilding integration checks independently.

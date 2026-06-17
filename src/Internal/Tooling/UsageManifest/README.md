# UsageManifest

Owns shared Usage / Requirement Manifest models and generation logic for scripts.

Allowed contents: `inscape.usage` models, project usage scanning domains, literal argument extraction, and Host Schema `idKind` projection into required Inscape ids.

Do not own Compiler syntax truth, Host Bridge mappings, or Runtime execution. CLI, LanguageServer, VSCode, and SelfHostedEditor should consume the shared payload instead of scanning usage independently.

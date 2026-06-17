# Cli

Owns command-line entries, routing, command implementations, terminal output, and command-specific argument adaptation.

Allowed business areas: `Routing`, `DslScript`, `StoryGraph`, `Preview`, `Localization`, `HostSchema`, `HostBinding`, and `UsageManifest`.

`Domains` are not allowed here by default. Shared logic should move to `Tooling`; compiler truth should remain in `Compiler`.

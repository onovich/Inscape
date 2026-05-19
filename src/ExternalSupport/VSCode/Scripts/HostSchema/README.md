# HostSchema

Owns VSCode authoring providers for Host Schema capability discovery.

- `Commands` contains VSCode command handlers for host schema capability inspection.
- `Providers` contains capability endpoint invocation and direct schema fallback used by query / event authoring hints and commands.

Shared Host Schema reading and normalization belongs in Internal `Tooling`; this directory adapts the capability data to VSCode authoring behavior.

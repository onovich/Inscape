# ToolConfig

Owns tool configuration models and config file reading shared across toolchain entry points.

Allowed roles: `Domains` and `Models`.

`hostSchema` and `hostBridge` are generic host integration config paths. `unitySample` fields are ExternalSupport sample-command inputs, not editor extension authoring fallbacks.

Do not include command output, VSCode settings UI, or host adapter implementation.

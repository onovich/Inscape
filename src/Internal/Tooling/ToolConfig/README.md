# ToolConfig

Owns tool configuration models and config file reading shared across toolchain entry points.

Allowed roles: `Domains` and `Models`.

`hostSchema` and `hostBridge` are generic host integration config paths. Legacy `unitySample` fields may remain as compatibility input for ExternalSupport until adapter commands migrate to Host Bridge.

Do not include command output, VSCode settings UI, or host adapter implementation.

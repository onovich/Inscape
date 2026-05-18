# Entries

Owns the VSCode `activate` / `deactivate` entry and extension-level registration order.

Keep this layer thin. Feature behavior should live in `DslScript`, `EditorAuthoring`, `HostBinding`, `HostSchema`, `Localization`, or `Preview`.

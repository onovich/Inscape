# UnityPlugin

Owns Unity-specific support, experiments, import flows, attribute scanning, generated bridge tables, and migration samples.

Allowed business areas: `PluginEntry`, `ScriptImport`, `AttributeScan`, `HostBinding`, `AssetConfigure`, and `ImportFlow`.

This layer may depend on Internal contracts but must not be part of the default Internal .NET solution build unless explicitly required by a focused validation task.

# Entries

Owns the UnitySample CLI executable entry point and process-level dispatch.

Keep this layer thin. UnitySample-specific command behavior belongs in `Commands`; reusable Internal behavior should stay in `src/Internal/Tooling`.

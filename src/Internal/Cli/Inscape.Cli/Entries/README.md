# Entries

Owns executable CLI entry points and process-level routing.

Keep this layer thin: parse only enough arguments to dispatch commands, then delegate to `Commands`, `Providers`, `Tooling`, or `Compiler`.

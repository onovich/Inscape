# Commands

Owns VSCode command handlers and command-specific UI flow.

Commands may coordinate providers, bridges, and Tooling/Compiler calls, but should not own reusable workspace indexing or compiler semantics.

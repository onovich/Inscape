# EditorExtensions

Owns editor-platform integrations that are maintained by Inscape but are not part of the core Internal toolchain.

Editor extensions may depend on Internal contracts such as Compiler, Tooling, LanguageServer, and Runtime-facing data models. They must not become the source of compiler semantics.

Keep each editor platform in its own project directory so it can be split into a separate repository later without dragging unrelated editor support along.

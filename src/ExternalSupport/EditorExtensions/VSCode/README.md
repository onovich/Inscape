# VSCode

Owns the VSCode extension package for Inscape authoring.

This is first-party maintained editor support, but it is still bound to the VSCode platform. Keep it outside `Internal` so a future first-party editor or other editor integration can evolve without carrying VSCode package code.

The extension should consume Compiler, Tooling, and LanguageServer contracts. It must not reimplement parser semantics or become a hidden source of DSL truth.

Package code, package resources, and development scripts should stay visibly separated inside the concrete extension package when that split is practical.

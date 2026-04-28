# Inscape VSCode Extension

This is the first lightweight authoring layer for `.inscape` scripts. It is intentionally declarative: syntax highlighting, language configuration, and snippets only.

## Capabilities

- Registers the `inscape` language ID for `.inscape` files.
- Highlights node headers, dialogue speakers, narration, choices, jumps, metadata lines, inline tags, and invalid node or jump target spellings.
- Provides basic snippets for nodes, dialogue, choices, jumps, metadata, and inline tags.
- Keeps metadata and inline tags on comment-like scopes so themes can visually soften them while prose remains readable.

## Development Use

Open this folder as an extension development host, or launch VSCode with:

```powershell
code --extensionDevelopmentPath=tools\vscode-inscape .
```

This package is not published yet. Later stages should add a language server that reuses `Inscape.Core` for diagnostics, completion, symbols, and definition/reference navigation.

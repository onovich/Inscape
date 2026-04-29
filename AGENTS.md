# AGENTS.md

This repository uses Chinese project documentation. Before making changes, read:

1. `docs/agent-handoff.md`
2. `docs/todo.md`
3. The task-specific document listed in `docs/agent-handoff.md`

Core rules:

- Treat `Inscape.Core` as the source of compiler truth. Do not reimplement parser semantics in CLI or VSCode.
- Keep `Inscape.Core` independent from Unity, VSCode, HTML rendering, and third-party packages.
- Update docs and TODO together with code. Add an ADR for long-lived decisions.
- Preserve uncertain syntax/editor/runtime ideas as drafts or open questions.
- Run validation before committing:

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check tools\vscode-inscape\extension.js
```

On this Windows workspace, use:

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

The current best next step is usually in `docs/todo.md` under “接力优先队列”.

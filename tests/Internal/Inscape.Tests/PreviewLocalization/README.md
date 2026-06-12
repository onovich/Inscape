# PreviewLocalization

Owns tests for preview and localization flows exposed through Internal CLI commands.

Shared implementation belongs in `src/Internal/Tooling`; these tests assert user-facing behavior.

`TestCore` is split by test capability here: Preview contracts, Localization CLI, Localization alignment, Localization line-map, VSCode localization contracts, and shared localization assertions. Keep the test registration list in `../Entries/TestCore.cs` as the stable entrypoint.

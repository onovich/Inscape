# Host Integration Package

Owns the reusable package assembly model for `export-host-integration-package-project`.

Round 2 scope is intentionally narrow:

- create the package manifest model and static artifact index;
- enforce package-relative manifest paths with `/` separators;
- write only `manifest.json`;
- reject output directories that contain files outside the package-owned `manifest.json`.

This module does not compile source, assemble graph / usage / audit / localization artifacts, generate Host Bridge candidates, call a host SDK, save host data, or add runtime / preview bridge behavior.

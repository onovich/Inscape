# Host Integration Package

Owns the reusable package assembly and package-reader model for Host
Integration Package workflows.

Current package export scope:

- assemble `manifest.json`, copied source files, graph IR, usage manifest,
  host schema capabilities, host integration audit, localization CSV,
  localization anchor map, source locations and readiness report;
- enforce package-relative manifest and artifact paths with `/` separators;
- reject output directories that contain files outside package-owned artifacts;
- read existing package artifacts for standalone report / candidate workflows.

Package export still does not generate `host/host-bridge-candidate.json` by
default. The standalone Host Bridge Candidate generator must use a separate
Tooling domain and command, and the candidate remains review-only evidence.

This module does not write confirmed Host Bridge data, run generated apply, call
a host SDK, save host data, or add runtime / preview bridge behavior.

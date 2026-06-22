# Host Bridge Candidate Tooling

`HostBridgeCandidate` turns an existing Host Integration Package into a
review-only candidate artifact for partner inspection.

Scope:

- Reads packaged artifacts only: `usage/usage.json`,
  `host/host-schema-capabilities.json`, and
  `host/host-integration-audit.json`.
- Produces `inscape.host-bridge-candidate` data with
  `generatedOwnership: "candidate-only"` and `writesHostData: false`.
- Reports package readiness states as `ready`, `empty`, `blocked`,
  `invalid`, or `incompatible`.
- Keeps unknown action/query usage as `schema-capability` review evidence
  until the Host Schema declares the capability.

Non-scope:

- Does not write or confirm `inscape.host.bridge` data.
- Does not apply generated mappings.
- Does not call Unity, a Host SDK, Runtime Preview, partner runtime, or partner
  services.
- Does not project POC-2 catalog entries.

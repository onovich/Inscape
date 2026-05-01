# Inscape.Adapters.UnitySample

This project is an experimental sample adapter.

It preserves the current Unity-style export spike outside `Inscape.Core`, but it is not the final Host Bridge implementation. The code intentionally demonstrates one possible mapping from Inscape Project IR to a host-specific manifest, CSV files, localization merge flow, and host hook bindings.

Do not treat these data structures as universal runtime contracts:

- `talkingId`, `roleId`, `L10N_Talking`, timeline assets, and generated manifest fields are sample host concepts.
- Real projects are expected to define their own host schema, bridge configuration, and generated adapter code.
- Long-term Unity support should be driven by Host Schema + Host Bridge + code generation rather than by hard-coded sample model classes.

Keep this adapter isolated from `Inscape.Core` so compiler semantics remain engine- and project-independent.

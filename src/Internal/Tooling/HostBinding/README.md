# HostBinding

Owns reusable host binding table reading, Host Bridge capability catalog building, validation, and host binding view models.

Allowed roles: `Domains`, `Controllers`, `Models`, and `ViewModels`.

`HostBindingCapabilityCatalogDomain` may expose generic host fields such as ids, GUIDs, addressable keys, asset paths, source positions, source labels, and per-capability locations for editor hints and navigation. It must not turn those fields into Compiler truth.

Do not hard-code UnitySample, Addressables, ScriptableObject, or Bird-specific behavior here.

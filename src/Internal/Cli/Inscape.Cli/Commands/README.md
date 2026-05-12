# Commands

Owns concrete CLI command implementations and command-specific argument adaptation.

Commands may call `Tooling` and `Compiler`, but should not contain reusable business logic that belongs in `Tooling`.

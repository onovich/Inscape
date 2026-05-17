# UnityPlugin

Owns Unity-specific support, experiments, import flows, attribute scanning, generated bridge tables, and migration samples.

Allowed business areas are Unity-specific package code, import flows, attribute scanning, host binding generation, asset configuration, and sample adapters. Do not create empty planning directories for these areas; keep them in docs until real files or package-level README rules exist.

This layer may depend on Internal contracts but must not be part of the default Internal .NET solution build unless explicitly required by a focused validation task.

Future Unity packages should separate their own code and resources at the package root, for example `Scripts` for Unity/C# source and `Resources` or Unity-native asset folders for package resources. Do this inside the concrete Unity package rather than as broad `ExternalSupport` top-level buckets.

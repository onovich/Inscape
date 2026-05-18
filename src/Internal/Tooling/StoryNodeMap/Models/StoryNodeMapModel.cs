using System.Collections.Generic;

namespace Inscape.Tooling {

    public sealed class StoryNodeMapModel {

        public string Format { get; set; } = "inscape.node-map";

        public int FormatVersion { get; set; } = 1;

        public List<StoryNodeMapEntryModel> Nodes { get; set; } = new List<StoryNodeMapEntryModel>();

        public List<StoryNodeMapTombstoneModel> Tombstones { get; set; } = new List<StoryNodeMapTombstoneModel>();

    }

    public sealed class StoryNodeMapEntryModel {

        public string Id { get; set; } = string.Empty;

        public string Title { get; set; } = string.Empty;

        public List<string> PreviousTitles { get; set; } = new List<string>();

        public string SourcePath { get; set; } = string.Empty;

        public int SourceLine { get; set; }

        public int SourceCharacter { get; set; }

        public string FirstContentFingerprint { get; set; } = string.Empty;

        public string NeighborFingerprint { get; set; } = string.Empty;

        public List<string> LineAnchorSamples { get; set; } = new List<string>();

        public string Status { get; set; } = string.Empty;

        public string CreatedAt { get; set; } = string.Empty;

        public string UpdatedAt { get; set; } = string.Empty;

    }

    public sealed class StoryNodeMapTombstoneModel {

        public string Id { get; set; } = string.Empty;

        public string LastTitle { get; set; } = string.Empty;

        public string LastSourcePath { get; set; } = string.Empty;

        public string DeletedAt { get; set; } = string.Empty;

    }

}

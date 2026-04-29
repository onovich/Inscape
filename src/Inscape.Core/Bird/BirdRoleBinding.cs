namespace Inscape.Core.Bird {

    public sealed class BirdRoleBinding {

        public string Speaker { get; set; }

        public int? RoleId { get; set; }

        public BirdRoleBinding() {
            Speaker = string.Empty;
            RoleId = null;
        }

    }

}

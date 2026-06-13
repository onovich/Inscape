export function requestSelfHostedEditorNodeRename(currentTitle, documentRef = document) {
  return new Promise((resolve) => {
    const overlay = documentRef.createElement("div");
    overlay.className = "rename-dialog-overlay";

    const dialog = documentRef.createElement("form");
    dialog.className = "rename-dialog";
    dialog.setAttribute("aria-label", "Rename node");

    const heading = documentRef.createElement("div");
    heading.className = "rename-dialog-heading";
    heading.textContent = "Rename node";

    const input = documentRef.createElement("input");
    input.className = "rename-dialog-input";
    input.type = "text";
    input.value = currentTitle;
    input.autocomplete = "off";
    input.spellcheck = false;

    const actions = documentRef.createElement("div");
    actions.className = "rename-dialog-actions";

    const cancelButton = documentRef.createElement("button");
    cancelButton.className = "rename-dialog-button";
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";

    const confirmButton = documentRef.createElement("button");
    confirmButton.className = "rename-dialog-button rename-dialog-confirm";
    confirmButton.type = "submit";
    confirmButton.textContent = "Rename";

    const close = (value) => {
      overlay.remove();
      resolve(value);
    };

    cancelButton.addEventListener("click", () => close(""));
    overlay.addEventListener("mousedown", (event) => {
      if (event.target === overlay) {
        close("");
      }
    });
    dialog.addEventListener("submit", (event) => {
      event.preventDefault();
      close(input.value.trim());
    });
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close("");
      }
    });

    actions.append(cancelButton, confirmButton);
    dialog.append(heading, input, actions);
    overlay.append(dialog);
    documentRef.body.append(overlay);
    input.focus();
    input.select();
  });
}

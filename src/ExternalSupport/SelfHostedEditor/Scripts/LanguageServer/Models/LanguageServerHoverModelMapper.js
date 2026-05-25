export class LanguageServerHoverModelMapper {
  static mapHover(payload) {
    if (!payload?.hover) {
      return null;
    }

    return {
      kind: payload.hover.kind || "",
      label: payload.hover.label || "",
      markdown: payload.hover.markdown || "",
    };
  }
}

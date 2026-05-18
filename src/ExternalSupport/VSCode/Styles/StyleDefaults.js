const defaultEditorStyle = Object.freeze({
    nodeNameColor: "#d7ba7d",
    speakerColor: "#569cd6",
    speakerFontWeight: "600",
    speakerTextDecoration: "",
    dialogueColor: "#dcdcaa",
    dialogueTextDecoration: "",
    narrationColor: "#dcdcaa",
    choicePromptColor: "#c586c0",
    choicePromptTextDecoration: "none",
    choiceTextColor: "#dcdcaa",
    choiceTextDecoration: "none",
    jumpTargetColor: "#4ec9b0",
    metadataColor: "#6a9955",
    inlineTagColor: "#6a9955"
});

const defaultPreviewStyle = Object.freeze({
    fontFamily: "Inter, \"Segoe UI\", sans-serif",
    pageBackground: "#f6f4ee",
    textColor: "#211d18",
    cardBackground: "#fbfaf6",
    nodeTitleColor: "#8d846f",
    mutedTextColor: "#8d8068",
    toolbarButtonBackground: "#ece7db",
    toolbarButtonHoverBackground: "#e1dacb",
    sourceButtonBackground: "#efeadf",
    sourceButtonHoverBackground: "#e2dccd",
    metaBackground: "#efeadf",
    metaTextColor: "#706754",
    speakerColor: "#7d5a34",
    choiceBackground: "#efeadf",
    choicePromptColor: "#807663",
    diagnosticBackground: "#f2e6de",
    diagnosticTextColor: "#7f2f18",
    storyFontSize: "28px",
    storyLineHeight: "1.84",
    cardRadius: "24px",
    choiceRadius: "16px"
});

module.exports = {
    defaultEditorStyle,
    defaultPreviewStyle
};

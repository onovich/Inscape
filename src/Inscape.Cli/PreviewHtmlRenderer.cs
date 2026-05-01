using System.Text;
using System.Text.Json;

namespace Inscape.Cli {

    public static class PreviewHtmlRenderer {

        public static string Render(CompileOutput output, JsonSerializerOptions jsonOptions) {
            return Render(output, jsonOptions, new PreviewStyleSheet());
        }

        public static string Render(CompileOutput output, JsonSerializerOptions jsonOptions, PreviewStyleSheet styleSheet) {
            return RenderSerializedOutput(output, jsonOptions, styleSheet);
        }

        public static string Render(ProjectCompileOutput output, JsonSerializerOptions jsonOptions) {
            return Render(output, jsonOptions, new PreviewStyleSheet());
        }

        public static string Render(ProjectCompileOutput output, JsonSerializerOptions jsonOptions, PreviewStyleSheet styleSheet) {
            return RenderSerializedOutput(output, jsonOptions, styleSheet);
        }

        static string RenderSerializedOutput(object output, JsonSerializerOptions jsonOptions, PreviewStyleSheet? styleSheet) {
            string json = JsonSerializer.Serialize(output, jsonOptions).Replace("</", "<\\/");
            PreviewStyleSheet style = styleSheet ?? new PreviewStyleSheet();
            StringBuilder html = new StringBuilder();

            html.AppendLine("<!doctype html>");
            html.AppendLine("<html lang=\"zh-CN\">");
            html.AppendLine("<head>");
            html.AppendLine("  <meta charset=\"utf-8\" />");
            html.AppendLine("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />");
            html.AppendLine("  <title>Inscape Preview</title>");
            html.AppendLine("  <style>");
            html.AppendLine("    :root { color-scheme: light dark;"
                + " --inscape-font-family: " + Css(style.FontFamily) + ";"
                + " --inscape-page-background: " + Css(style.PageBackground) + ";"
                + " --inscape-text-color: " + Css(style.TextColor) + ";"
                + " --inscape-card-background: " + Css(style.CardBackground) + ";"
                + " --inscape-node-title-color: " + Css(style.NodeTitleColor) + ";"
                + " --inscape-muted-text-color: " + Css(style.MutedTextColor) + ";"
                + " --inscape-toolbar-button-background: " + Css(style.ToolbarButtonBackground) + ";"
                + " --inscape-toolbar-button-hover-background: " + Css(style.ToolbarButtonHoverBackground) + ";"
                + " --inscape-source-button-background: " + Css(style.SourceButtonBackground) + ";"
                + " --inscape-source-button-hover-background: " + Css(style.SourceButtonHoverBackground) + ";"
                + " --inscape-meta-background: " + Css(style.MetaBackground) + ";"
                + " --inscape-meta-text-color: " + Css(style.MetaTextColor) + ";"
                + " --inscape-speaker-color: " + Css(style.SpeakerColor) + ";"
                + " --inscape-choice-background: " + Css(style.ChoiceBackground) + ";"
                + " --inscape-choice-prompt-color: " + Css(style.ChoicePromptColor) + ";"
                + " --inscape-diagnostic-background: " + Css(style.DiagnosticBackground) + ";"
                + " --inscape-diagnostic-text-color: " + Css(style.DiagnosticTextColor) + ";"
                + " --inscape-story-font-size: " + Css(style.StoryFontSize) + ";"
                + " --inscape-story-line-height: " + Css(style.StoryLineHeight) + ";"
                + " --inscape-card-radius: " + Css(style.CardRadius) + ";"
                + " --inscape-choice-radius: " + Css(style.ChoiceRadius) + "; }");
            html.AppendLine("    * { box-sizing: border-box; }");
            html.AppendLine("    body { margin: 0; min-height: 100vh; background: var(--inscape-page-background); color: var(--inscape-text-color); font-family: var(--inscape-font-family); }");
            html.AppendLine("    main { min-height: 100vh; display: flex; align-items: flex-start; justify-content: center; padding: 18px 22px 26px; }");
            html.AppendLine("    .shell { width: min(920px, 100%); }");
            html.AppendLine("    .toolbar { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }");
            html.AppendLine("    .toolbar-spacer { flex: 1; }");
            html.AppendLine("    .status { color: var(--inscape-muted-text-color); font-size: 13px; padding: 9px 2px 0; }");
            html.AppendLine("    button { cursor: pointer; border: 0; outline: none; box-shadow: none; background: var(--inscape-toolbar-button-background); color: inherit; padding: 9px 13px; border-radius: 999px; font-size: 14px; transition: background-color 120ms ease; }");
            html.AppendLine("    button:hover { background: var(--inscape-toolbar-button-hover-background); }");
            html.AppendLine("    button:disabled { opacity: 0.45; cursor: default; }");
            html.AppendLine("    .story-card { background: var(--inscape-card-background); border-radius: var(--inscape-card-radius); overflow: hidden; }");
            html.AppendLine("    .story-header { padding: 16px 18px 0; display: flex; align-items: flex-start; gap: 10px; flex-wrap: wrap; }");
            html.AppendLine("    .node-title { font-size: 12px; color: var(--inscape-node-title-color); letter-spacing: 0.08em; text-transform: uppercase; padding-top: 8px; }");
            html.AppendLine("    .source-link { border-radius: 999px; padding: 6px 11px; font-size: 12px; background: var(--inscape-source-button-background); }");
            html.AppendLine("    .source-link:hover { background: var(--inscape-source-button-hover-background); }");
            html.AppendLine("    .meta-strip { padding: 10px 18px 0; display: flex; flex-wrap: wrap; gap: 8px; }");
            html.AppendLine("    .meta-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 10px; background: var(--inscape-meta-background); color: var(--inscape-meta-text-color); font-size: 12px; font-family: \"Cascadia Mono\", Consolas, monospace; }");
            html.AppendLine("    .story-panel { padding: 34px 18px 12px; min-height: 320px; }");
            html.AppendLine("    .story-panel.can-continue { cursor: pointer; }");
            html.AppendLine("    .line { margin: 0 0 18px; line-height: var(--inscape-story-line-height); font-size: var(--inscape-story-font-size); letter-spacing: 0.005em; }");
            html.AppendLine("    .line:last-child { margin-bottom: 0; }");
            html.AppendLine("    .speaker { color: var(--inscape-speaker-color); font-weight: 700; margin-right: 10px; }");
            html.AppendLine("    .choices { padding: 6px 18px 24px; }");
            html.AppendLine("    .choice-prompt { margin: 0 0 12px; color: var(--inscape-choice-prompt-color); font-size: 14px; }");
            html.AppendLine("    .choice { display: block; width: 100%; text-align: left; margin: 0 0 10px; padding: 16px 18px; border-radius: var(--inscape-choice-radius); font-size: 18px; background: var(--inscape-choice-background); }");
            html.AppendLine("    .choice:last-child { margin-bottom: 0; }");
            html.AppendLine("    .continue-hint { padding: 0 18px 22px; color: var(--inscape-muted-text-color); font-size: 13px; }");
            html.AppendLine("    .ending { padding: 0 18px 22px; color: var(--inscape-muted-text-color); font-size: 13px; }");
            html.AppendLine("    .diagnostics { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }");
            html.AppendLine("    .diagnostic { background: var(--inscape-diagnostic-background); padding: 10px 12px; border-radius: 10px; color: var(--inscape-diagnostic-text-color); font-size: 13px; }");
            html.AppendLine("    @media (max-width: 760px) { main { padding: 12px 14px 22px; } .story-panel { min-height: 260px; } .line { font-size: 22px; } .toolbar { flex-wrap: wrap; } .toolbar-spacer { display: none; } .status { width: 100%; padding-top: 2px; } }");
            html.AppendLine("  </style>");
            html.AppendLine("</head>");
            html.AppendLine("<body>");
            html.AppendLine("  <main>");
            html.AppendLine("    <div class=\"shell\">");
            html.AppendLine("      <div class=\"toolbar\">");
            html.AppendLine("        <button id=\"restart\">Restart</button>");
            html.AppendLine("        <button id=\"back\">Back</button>");
            html.AppendLine("        <div class=\"toolbar-spacer\"></div>");
            html.AppendLine("        <div id=\"status\" class=\"status\"></div>");
            html.AppendLine("      </div>");
            html.AppendLine("      <section class=\"story-card\">");
            html.AppendLine("        <div class=\"story-header\">");
            html.AppendLine("          <div id=\"node-title\" class=\"node-title\"></div>");
            html.AppendLine("          <div class=\"toolbar-spacer\"></div>");
            html.AppendLine("          <div id=\"node-source\"></div>");
            html.AppendLine("        </div>");
            html.AppendLine("        <div id=\"meta-strip\" class=\"meta-strip\"></div>");
            html.AppendLine("        <div id=\"story-panel\" class=\"story-panel\"></div>");
            html.AppendLine("        <div id=\"choices\" class=\"choices\"></div>");
            html.AppendLine("        <div id=\"continue-hint\" class=\"continue-hint\"></div>");
            html.AppendLine("        <div id=\"ending\" class=\"ending\"></div>");
            html.AppendLine("      </section>");
            html.AppendLine("      <div id=\"diagnostics\" class=\"diagnostics\"></div>");
            html.AppendLine("    </div>");
            html.AppendLine("  </main>");
            html.AppendLine("  <script>");
            html.AppendLine("    const data = " + json + ";");
            html.AppendLine("    const graph = data.graph ?? data.document;");
            html.AppendLine("    const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined;");
            html.AppendLine("    const graphNodes = Array.isArray(graph?.nodes) ? graph.nodes : [];");
            html.AppendLine("    const nodes = new Map(graphNodes.map(node => [node.name, node]));");
            html.AppendLine("    const entryName = data.entryNodeName ?? '';");
            html.AppendLine("    const metadataEntry = graphNodes.find(node => (node.lines ?? []).some(line => line.kind === 'Metadata' && (line.text ?? '').trim() === '@entry'));");
            html.AppendLine("    const entry = entryName ? nodes.get(entryName) : metadataEntry;");
            html.AppendLine("    const initialCurrent = entry?.name ?? graphNodes[0]?.name ?? '';");
            html.AppendLine("    const previousState = vscode && typeof vscode.getState === 'function' ? vscode.getState() : undefined;");
            html.AppendLine("    let current = previousState?.current && nodes.has(previousState.current) ? previousState.current : initialCurrent;");
            html.AppendLine("    let path = Array.isArray(previousState?.path) ? previousState.path.filter(name => nodes.has(name)) : [];");
            html.AppendLine("    let focusedSource = undefined;");
            html.AppendLine("    if (!path.length || path[path.length - 1] !== current) { path = current ? [current] : []; }");
            html.AppendLine("    function clear(element) { while (element.firstChild) element.removeChild(element.firstChild); }");
            html.AppendLine("    function sourcePayload(source) { return source && source.sourcePath ? { sourcePath: source.sourcePath, line: Math.max(0, (source.line ?? 0)), column: Math.max(0, (source.column ?? 0)) } : undefined; }");
            html.AppendLine("    function openSource(source) { const payload = sourcePayload(source); if (!payload || !vscode) return; vscode.postMessage({ type: 'openSource', source: payload }); }");
            html.AppendLine("    function normalizeSourcePath(value) { return String(value ?? '').replace(/\\\\/g, '/').toLowerCase(); }");
            html.AppendLine("    function sameSourcePath(left, right) { return !!left && !!right && normalizeSourcePath(left) === normalizeSourcePath(right); }");
            html.AppendLine("    function sourceMatches(candidate, target) { return !!candidate && !!target && sameSourcePath(candidate.sourcePath, target.sourcePath) && Math.max(0, (candidate.line ?? 0)) === Math.max(0, (target.line ?? 0)); }");
            html.AppendLine("    function collectNodeSources(node) { const entries = []; if (node?.source) entries.push(node.source); (node?.lines ?? []).forEach(line => { if (line?.source) entries.push(line.source); }); (node?.choices ?? []).forEach(group => { if (group?.source) entries.push(group.source); (group?.options ?? []).forEach(option => { if (option?.source) entries.push(option.source); }); }); return entries; }");
            html.AppendLine("    function findNodeForSource(target) { if (!target) return undefined; let bestExact = undefined; let bestFallback = undefined; for (const node of graphNodes) { for (const source of collectNodeSources(node)) { if (!sameSourcePath(source?.sourcePath, target.sourcePath)) continue; const lineDelta = Math.abs(Math.max(0, (source.line ?? 0)) - Math.max(0, (target.line ?? 0))); const columnDelta = Math.abs(Math.max(0, (source.column ?? 0)) - Math.max(0, (target.character ?? 0))); const score = lineDelta * 1000 + columnDelta; if (lineDelta === 0 && (!bestExact || score < bestExact.score)) { bestExact = { name: node.name, score }; } if ((source.line ?? 0) <= (target.line ?? 0) && (!bestFallback || (target.line - source.line) < bestFallback.delta || ((target.line - source.line) === bestFallback.delta && columnDelta < bestFallback.columnDelta))) { bestFallback = { name: node.name, delta: target.line - source.line, columnDelta }; } } } return bestExact?.name ?? bestFallback?.name; }");
            html.AppendLine("    function focusCurrentSource() { const target = document.querySelector('.source-focus'); if (target && typeof target.scrollIntoView === 'function') { target.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }");
            html.AppendLine("    function text(value) { return document.createTextNode(value ?? ''); }");
            html.AppendLine("    function persistState() { if (vscode && typeof vscode.setState === 'function') { vscode.setState({ current, path }); } }");
            html.AppendLine("    function go(name) { if (!nodes.has(name)) return; current = name; path.push(name); persistState(); render(); }");
            html.AppendLine("    function renderSourceButton(source, label = '源码') { const payload = sourcePayload(source); if (!payload) return undefined; const button = document.createElement('button'); button.className = 'source-link'; button.textContent = label; button.title = `${payload.sourcePath}:${payload.line + 1}`; button.onclick = event => { event.stopPropagation(); openSource(payload); }; return button; }");
            html.AppendLine("    function currentNode() { return nodes.get(current); }");
            html.AppendLine("    function canContinue(node) { return !!node && (!Array.isArray(node.choices) || node.choices.length === 0) && !!node.defaultNext; }");
            html.AppendLine("    function continueStory() { const node = currentNode(); if (canContinue(node)) { go(node.defaultNext); } }");
            html.AppendLine("    function renderDiagnostics() { const el = document.getElementById('diagnostics'); clear(el); (data.diagnostics ?? []).forEach(d => { const row = document.createElement('div'); row.className = 'diagnostic'; row.textContent = `${d.severity} ${d.code} (${d.line}:${d.column}) ${d.message}`; if (d.sourcePath) { row.title = `${d.sourcePath}:${d.line}:${d.column}`; row.onclick = () => openSource({ sourcePath: d.sourcePath, line: Math.max(0, (d.line ?? 1) - 1), column: Math.max(0, (d.column ?? 1) - 1) }); row.style.cursor = 'pointer'; } el.appendChild(row); }); }");
            html.AppendLine("    function renderMeta(node) { const metaStrip = document.getElementById('meta-strip'); clear(metaStrip); (node.lines ?? []).filter(line => line.kind === 'Metadata' && !!line.text).forEach(line => { const pill = document.createElement('span'); pill.className = 'meta-pill'; if (sourceMatches(line.source, focusedSource)) { pill.classList.add('source-focus'); } pill.textContent = line.text; if (line.source?.sourcePath) { pill.style.cursor = 'pointer'; pill.onclick = () => openSource(line.source); } metaStrip.appendChild(pill); }); }");
            html.AppendLine("    function renderNodeSource(node) { const slot = document.getElementById('node-source'); clear(slot); const sourceButton = renderSourceButton(node?.source); if (sourceButton) { slot.appendChild(sourceButton); } }");
            html.AppendLine("    function renderStory(node) { const panel = document.getElementById('story-panel'); clear(panel); panel.classList.toggle('can-continue', canContinue(node)); panel.onclick = event => { if (event.target === panel || event.target.classList.contains('line')) { continueStory(); } }; (node.lines ?? []).filter(line => line.kind !== 'Metadata').forEach(line => { const paragraph = document.createElement('p'); paragraph.className = 'line'; if (sourceMatches(line.source, focusedSource)) { paragraph.classList.add('source-focus'); } if (line.speaker) { const speaker = document.createElement('span'); speaker.className = 'speaker'; speaker.textContent = line.speaker + '：'; paragraph.appendChild(speaker); } paragraph.appendChild(text(line.text)); panel.appendChild(paragraph); }); }");
            html.AppendLine("    function renderChoices(node) { const choices = document.getElementById('choices'); clear(choices); (node.choices ?? []).forEach(group => { if (group.prompt) { const prompt = document.createElement('p'); prompt.className = 'choice-prompt'; if (sourceMatches(group.source, focusedSource)) { prompt.classList.add('source-focus'); } prompt.appendChild(text(group.prompt)); choices.appendChild(prompt); } (group.options ?? []).forEach(option => { const button = document.createElement('button'); button.className = 'choice'; if (sourceMatches(option.source, focusedSource)) { button.classList.add('source-focus'); } button.textContent = option.text; button.onclick = () => go(option.target); choices.appendChild(button); }); }); }");
            html.AppendLine("    function renderHints(node) { const continueHint = document.getElementById('continue-hint'); const ending = document.getElementById('ending'); continueHint.textContent = canContinue(node) ? '点击正文继续' : ''; const hasChoices = Array.isArray(node?.choices) && node.choices.length > 0; ending.textContent = !hasChoices && !node?.defaultNext ? '流程到此为止。可点击 Restart 重新开始。' : ''; }");
            html.AppendLine("    function renderStatus(node) { document.getElementById('status').textContent = path.length > 0 ? `Step ${path.length}` : ''; document.getElementById('node-title').textContent = node?.name ?? '(empty)'; document.getElementById('back').disabled = path.length <= 1; }");
            html.AppendLine("    function render() { const node = currentNode(); if (!node) { current = initialCurrent; path = current ? [current] : []; persistState(); const fallbackNode = currentNode(); if (!fallbackNode) { document.getElementById('node-title').textContent = '(empty)'; return; } renderStatus(fallbackNode); renderNodeSource(fallbackNode); renderMeta(fallbackNode); renderStory(fallbackNode); renderChoices(fallbackNode); renderHints(fallbackNode); focusCurrentSource(); return; } renderStatus(node); renderNodeSource(node); renderMeta(node); renderStory(node); renderChoices(node); renderHints(node); focusCurrentSource(); }");
            html.AppendLine("    document.getElementById('restart').onclick = () => { current = initialCurrent; path = current ? [current] : []; persistState(); render(); };");
            html.AppendLine("    document.getElementById('back').onclick = () => { if (path.length > 1) { path.pop(); current = path[path.length - 1]; persistState(); render(); } };");
            html.AppendLine("    if (vscode) { window.addEventListener('message', event => { const message = event.data || {}; if (message.type === 'refresh') { persistState(); renderDiagnostics(); render(); } if (message.type === 'revealSource' && message.source) { focusedSource = { sourcePath: message.source.sourcePath, line: Math.max(0, (message.source.line ?? 0)), character: Math.max(0, (message.source.character ?? message.source.column ?? 0)) }; const targetNode = findNodeForSource(focusedSource); if (targetNode && nodes.has(targetNode)) { current = targetNode; path = [targetNode]; persistState(); } render(); } }); }");
            html.AppendLine("    persistState(); renderDiagnostics(); render();");
            html.AppendLine("  </script>");
            html.AppendLine("</body>");
            html.AppendLine("</html>");

            return html.ToString();
        }

        static string Css(string? value) {
            return string.IsNullOrWhiteSpace(value)
                ? "initial"
                : value.Replace("</", "<\\/").Replace("\r", " ").Replace("\n", " ").Trim();
        }

    }

}

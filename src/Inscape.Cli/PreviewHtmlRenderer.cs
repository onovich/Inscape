using System.Text;
using System.Text.Json;

namespace Inscape.Cli {

    public static class PreviewHtmlRenderer {

        public static string Render(CompileOutput output, JsonSerializerOptions jsonOptions) {
            return RenderSerializedOutput(output, jsonOptions);
        }

        public static string Render(ProjectCompileOutput output, JsonSerializerOptions jsonOptions) {
            return RenderSerializedOutput(output, jsonOptions);
        }

        static string RenderSerializedOutput(object output, JsonSerializerOptions jsonOptions) {
            string json = JsonSerializer.Serialize(output, jsonOptions).Replace("</", "<\\/");
            StringBuilder html = new StringBuilder();

            html.AppendLine("<!doctype html>");
            html.AppendLine("<html lang=\"zh-CN\">");
            html.AppendLine("<head>");
            html.AppendLine("  <meta charset=\"utf-8\" />");
            html.AppendLine("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />");
            html.AppendLine("  <title>Inscape Preview</title>");
            html.AppendLine("  <style>");
            html.AppendLine("    :root { color-scheme: light dark; font-family: Inter, \"Segoe UI\", sans-serif; }");
            html.AppendLine("    * { box-sizing: border-box; }");
            html.AppendLine("    body { margin: 0; min-height: 100vh; background: radial-gradient(circle at top, #f7f1e6 0%, #efe7d8 38%, #e7decc 100%); color: #211d18; }");
            html.AppendLine("    main { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 28px; }");
            html.AppendLine("    .shell { width: min(920px, 100%); }");
            html.AppendLine("    .toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }");
            html.AppendLine("    .toolbar-spacer { flex: 1; }");
            html.AppendLine("    .status { color: #6e665b; font-size: 13px; }");
            html.AppendLine("    button { cursor: pointer; border: 1px solid #c7b79d; background: rgba(255, 250, 240, 0.9); color: inherit; padding: 10px 14px; border-radius: 999px; font-size: 14px; }");
            html.AppendLine("    button:hover { background: #fff4de; border-color: #b79e72; }");
            html.AppendLine("    button:disabled { opacity: 0.45; cursor: default; }");
            html.AppendLine("    .story-card { background: rgba(255, 251, 245, 0.92); border: 1px solid rgba(176, 152, 120, 0.25); border-radius: 28px; box-shadow: 0 18px 48px rgba(77, 58, 30, 0.12); overflow: hidden; }");
            html.AppendLine("    .story-header { padding: 18px 22px 0; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }");
            html.AppendLine("    .node-title { font-size: 13px; color: #7f755f; letter-spacing: 0.08em; text-transform: uppercase; }");
            html.AppendLine("    .source-link { border-radius: 999px; padding: 6px 11px; font-size: 12px; background: transparent; }");
            html.AppendLine("    .meta-strip { padding: 10px 22px 0; display: flex; flex-wrap: wrap; gap: 8px; }");
            html.AppendLine("    .meta-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 10px; background: #eee4d0; color: #6c624d; font-size: 12px; font-family: \"Cascadia Mono\", Consolas, monospace; }");
            html.AppendLine("    .story-panel { padding: 28px 22px 10px; min-height: 320px; }");
            html.AppendLine("    .story-panel.can-continue { cursor: pointer; }");
            html.AppendLine("    .line { margin: 0 0 18px; line-height: 1.82; font-size: 27px; letter-spacing: 0.01em; }");
            html.AppendLine("    .line:last-child { margin-bottom: 0; }");
            html.AppendLine("    .speaker { color: #8a5521; font-weight: 700; margin-right: 10px; }");
            html.AppendLine("    .choices { padding: 6px 22px 24px; }");
            html.AppendLine("    .choice-prompt { margin: 0 0 12px; color: #7c715d; font-size: 14px; }");
            html.AppendLine("    .choice { display: block; width: 100%; text-align: left; margin: 0 0 10px; padding: 16px 18px; border-radius: 18px; font-size: 18px; background: #fffdf8; }");
            html.AppendLine("    .choice:last-child { margin-bottom: 0; }");
            html.AppendLine("    .continue-hint { padding: 0 22px 22px; color: #8d8068; font-size: 13px; }");
            html.AppendLine("    .ending { padding: 0 22px 22px; color: #8d8068; font-size: 13px; }");
            html.AppendLine("    .diagnostics { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }");
            html.AppendLine("    .diagnostic { border-left: 4px solid #b45635; background: rgba(255, 246, 240, 0.95); padding: 10px 12px; border-radius: 10px; color: #7f2f18; font-size: 13px; }");
            html.AppendLine("    @media (max-width: 760px) { main { padding: 14px; } .story-panel { min-height: 260px; } .line { font-size: 22px; } .toolbar { flex-wrap: wrap; } .toolbar-spacer { display: none; } }");
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
            html.AppendLine("    let current = entry?.name ?? graphNodes[0]?.name ?? '';");
            html.AppendLine("    let path = current ? [current] : [];");
            html.AppendLine("    function clear(element) { while (element.firstChild) element.removeChild(element.firstChild); }");
            html.AppendLine("    function sourcePayload(source) { return source && source.sourcePath ? { sourcePath: source.sourcePath, line: Math.max(0, (source.line ?? 0)), column: Math.max(0, (source.column ?? 0)) } : undefined; }");
            html.AppendLine("    function openSource(source) { const payload = sourcePayload(source); if (!payload || !vscode) return; vscode.postMessage({ type: 'openSource', source: payload }); }");
            html.AppendLine("    function text(value) { return document.createTextNode(value ?? ''); }");
            html.AppendLine("    function go(name) { if (!nodes.has(name)) return; current = name; path.push(name); render(); }");
            html.AppendLine("    function renderSourceButton(source, label = '源码') { const payload = sourcePayload(source); if (!payload) return undefined; const button = document.createElement('button'); button.className = 'source-link'; button.textContent = label; button.title = `${payload.sourcePath}:${payload.line + 1}`; button.onclick = event => { event.stopPropagation(); openSource(payload); }; return button; }");
            html.AppendLine("    function currentNode() { return nodes.get(current); }");
            html.AppendLine("    function canContinue(node) { return !!node && (!Array.isArray(node.choices) || node.choices.length === 0) && !!node.defaultNext; }");
            html.AppendLine("    function continueStory() { const node = currentNode(); if (canContinue(node)) { go(node.defaultNext); } }");
            html.AppendLine("    function renderDiagnostics() { const el = document.getElementById('diagnostics'); clear(el); (data.diagnostics ?? []).forEach(d => { const row = document.createElement('div'); row.className = 'diagnostic'; row.textContent = `${d.severity} ${d.code} (${d.line}:${d.column}) ${d.message}`; if (d.sourcePath) { row.title = `${d.sourcePath}:${d.line}:${d.column}`; row.onclick = () => openSource({ sourcePath: d.sourcePath, line: Math.max(0, (d.line ?? 1) - 1), column: Math.max(0, (d.column ?? 1) - 1) }); row.style.cursor = 'pointer'; } el.appendChild(row); }); }");
            html.AppendLine("    function renderMeta(node) { const metaStrip = document.getElementById('meta-strip'); clear(metaStrip); (node.lines ?? []).filter(line => line.kind === 'Metadata' && !!line.text).forEach(line => { const pill = document.createElement('span'); pill.className = 'meta-pill'; pill.textContent = line.text; if (line.source?.sourcePath) { pill.style.cursor = 'pointer'; pill.onclick = () => openSource(line.source); } metaStrip.appendChild(pill); }); }");
            html.AppendLine("    function renderNodeSource(node) { const slot = document.getElementById('node-source'); clear(slot); const sourceButton = renderSourceButton(node?.source); if (sourceButton) { slot.appendChild(sourceButton); } }");
            html.AppendLine("    function renderStory(node) { const panel = document.getElementById('story-panel'); clear(panel); panel.classList.toggle('can-continue', canContinue(node)); panel.onclick = event => { if (event.target === panel || event.target.classList.contains('line')) { continueStory(); } }; (node.lines ?? []).filter(line => line.kind !== 'Metadata').forEach(line => { const paragraph = document.createElement('p'); paragraph.className = 'line'; if (line.speaker) { const speaker = document.createElement('span'); speaker.className = 'speaker'; speaker.textContent = line.speaker + '：'; paragraph.appendChild(speaker); } paragraph.appendChild(text(line.text)); panel.appendChild(paragraph); }); }");
            html.AppendLine("    function renderChoices(node) { const choices = document.getElementById('choices'); clear(choices); (node.choices ?? []).forEach(group => { if (group.prompt) { const prompt = document.createElement('p'); prompt.className = 'choice-prompt'; prompt.appendChild(text(group.prompt)); choices.appendChild(prompt); } (group.options ?? []).forEach(option => { const button = document.createElement('button'); button.className = 'choice'; button.textContent = option.text; button.onclick = () => go(option.target); choices.appendChild(button); }); }); }");
            html.AppendLine("    function renderHints(node) { const continueHint = document.getElementById('continue-hint'); const ending = document.getElementById('ending'); continueHint.textContent = canContinue(node) ? '点击正文继续' : ''; const hasChoices = Array.isArray(node?.choices) && node.choices.length > 0; ending.textContent = !hasChoices && !node?.defaultNext ? '流程到此为止。可点击 Restart 重新开始。' : ''; }");
            html.AppendLine("    function renderStatus(node) { document.getElementById('status').textContent = path.length > 0 ? `Step ${path.length}` : ''; document.getElementById('node-title').textContent = node?.name ?? '(empty)'; document.getElementById('back').disabled = path.length <= 1; }");
            html.AppendLine("    function render() { const node = currentNode(); if (!node) { document.getElementById('node-title').textContent = '(empty)'; return; } renderStatus(node); renderNodeSource(node); renderMeta(node); renderStory(node); renderChoices(node); renderHints(node); }");
            html.AppendLine("    document.getElementById('restart').onclick = () => { current = entry?.name ?? graphNodes[0]?.name ?? ''; path = current ? [current] : []; render(); };");
            html.AppendLine("    document.getElementById('back').onclick = () => { if (path.length > 1) { path.pop(); current = path[path.length - 1]; render(); } };");
            html.AppendLine("    if (vscode) { window.addEventListener('message', event => { const message = event.data || {}; if (message.type === 'refresh') { render(); } }); }");
            html.AppendLine("    renderDiagnostics(); render();");
            html.AppendLine("  </script>");
            html.AppendLine("</body>");
            html.AppendLine("</html>");

            return html.ToString();
        }

    }

}

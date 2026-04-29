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
            html.AppendLine("    body { margin: 0; background: #f6f2ea; color: #20201d; }");
            html.AppendLine("    main { display: grid; grid-template-columns: 260px minmax(0, 1fr); min-height: 100vh; }");
            html.AppendLine("    aside { border-right: 1px solid #d8d0c2; padding: 18px; background: #eee7da; overflow: auto; }");
            html.AppendLine("    section { padding: 32px; max-width: 860px; }");
            html.AppendLine("    button { cursor: pointer; border: 1px solid #b8ad9a; background: #fffaf0; color: inherit; padding: 8px 10px; border-radius: 6px; text-align: left; }");
            html.AppendLine("    button:hover { background: #fff3d3; }");
            html.AppendLine("    .node-button { display: block; width: 100%; margin: 0 0 8px; }");
            html.AppendLine("    .line { margin: 0 0 14px; line-height: 1.7; font-size: 18px; }");
            html.AppendLine("    .speaker { color: #7a4c1f; font-weight: 700; margin-right: 8px; }");
            html.AppendLine("    .meta { color: #8d8679; font-family: \"Cascadia Mono\", Consolas, monospace; font-size: 13px; }");
            html.AppendLine("    .choice { display: block; margin: 10px 0; width: min(100%, 520px); }");
            html.AppendLine("    .diagnostic { border-left: 4px solid #b45635; padding-left: 10px; margin: 8px 0; color: #7f2f18; }");
            html.AppendLine("    .toolbar { display: flex; gap: 8px; margin: 16px 0 24px; flex-wrap: wrap; }");
            html.AppendLine("    .path { color: #69645d; font-size: 13px; line-height: 1.5; }");
            html.AppendLine("    @media (max-width: 760px) { main { grid-template-columns: 1fr; } aside { border-right: 0; border-bottom: 1px solid #d8d0c2; } section { padding: 20px; } }");
            html.AppendLine("  </style>");
            html.AppendLine("</head>");
            html.AppendLine("<body>");
            html.AppendLine("  <main>");
            html.AppendLine("    <aside>");
            html.AppendLine("      <h1>Inscape</h1>");
            html.AppendLine("      <div id=\"nodes\"></div>");
            html.AppendLine("      <h2>Path</h2>");
            html.AppendLine("      <div id=\"path\" class=\"path\"></div>");
            html.AppendLine("    </aside>");
            html.AppendLine("    <section>");
            html.AppendLine("      <div class=\"toolbar\">");
            html.AppendLine("        <button id=\"restart\">Restart</button>");
            html.AppendLine("        <button id=\"back\">Back</button>");
            html.AppendLine("      </div>");
            html.AppendLine("      <div id=\"diagnostics\"></div>");
            html.AppendLine("      <h2 id=\"node-title\"></h2>");
            html.AppendLine("      <div id=\"content\"></div>");
            html.AppendLine("      <div id=\"choices\"></div>");
            html.AppendLine("    </section>");
            html.AppendLine("  </main>");
            html.AppendLine("  <script>");
            html.AppendLine("    const data = " + json + ";");
            html.AppendLine("    const graph = data.graph ?? data.document;");
            html.AppendLine("    const nodes = new Map(graph.nodes.map(node => [node.name, node]));");
            html.AppendLine("    const entryName = data.entryNodeName ?? '';");
            html.AppendLine("    const metadataEntry = graph.nodes.find(node => node.lines.some(line => line.kind === 'Metadata' && (line.text ?? '').trim() === '@entry'));");
            html.AppendLine("    const entry = entryName ? nodes.get(entryName) : metadataEntry;");
            html.AppendLine("    let current = entry?.name ?? graph.nodes[0]?.name ?? '';");
            html.AppendLine("    let path = current ? [current] : [];");
            html.AppendLine("    const text = value => document.createTextNode(value ?? '');");
            html.AppendLine("    function clear(element) { while (element.firstChild) element.removeChild(element.firstChild); }");
            html.AppendLine("    function go(name) { if (!nodes.has(name)) return; current = name; path.push(name); render(); }");
            html.AppendLine("    function renderNodes() { const el = document.getElementById('nodes'); clear(el); graph.nodes.forEach(node => { const button = document.createElement('button'); button.className = 'node-button'; button.textContent = node.name; button.onclick = () => go(node.name); el.appendChild(button); }); }");
            html.AppendLine("    function renderDiagnostics() { const el = document.getElementById('diagnostics'); clear(el); data.diagnostics.forEach(d => { const row = document.createElement('div'); row.className = 'diagnostic'; row.textContent = `${d.severity} ${d.code} (${d.line}:${d.column}) ${d.message}`; el.appendChild(row); }); }");
            html.AppendLine("    function renderAnchor(parent, value) { if (!value) return; const anchor = document.createElement('div'); anchor.className = 'meta'; anchor.textContent = `#${value}`; parent.appendChild(anchor); }");
            html.AppendLine("    function render() { const node = nodes.get(current); document.getElementById('node-title').textContent = node ? node.name : '(empty)'; const content = document.getElementById('content'); clear(content); const choices = document.getElementById('choices'); clear(choices); if (!node) return; node.lines.forEach(line => { const p = document.createElement('p'); p.className = line.kind === 'Metadata' ? 'line meta' : 'line'; if (line.speaker) { const speaker = document.createElement('span'); speaker.className = 'speaker'; speaker.textContent = line.speaker + '：'; p.appendChild(speaker); } p.appendChild(text(line.text)); renderAnchor(p, line.anchor); content.appendChild(p); }); node.choices.forEach(group => { if (group.prompt) { const prompt = document.createElement('p'); prompt.className = 'meta'; prompt.appendChild(text(group.prompt)); renderAnchor(prompt, group.anchor); choices.appendChild(prompt); } group.options.forEach(option => { const row = document.createElement('div'); const button = document.createElement('button'); button.className = 'choice'; button.textContent = option.text + ' -> ' + option.target; button.onclick = () => go(option.target); row.appendChild(button); renderAnchor(row, option.anchor); choices.appendChild(row); }); }); if (node.defaultNext) { const button = document.createElement('button'); button.className = 'choice'; button.textContent = 'Continue -> ' + node.defaultNext; button.onclick = () => go(node.defaultNext); choices.appendChild(button); } document.getElementById('path').textContent = path.join(' / '); }");
            html.AppendLine("    document.getElementById('restart').onclick = () => { current = entry?.name ?? graph.nodes[0]?.name ?? ''; path = current ? [current] : []; render(); };");
            html.AppendLine("    document.getElementById('back').onclick = () => { if (path.length > 1) { path.pop(); current = path[path.length - 1]; render(); } };");
            html.AppendLine("    renderNodes(); renderDiagnostics(); render();");
            html.AppendLine("  </script>");
            html.AppendLine("</body>");
            html.AppendLine("</html>");

            return html.ToString();
        }

    }

}

"use strict";

class InscapeWorkspaceSpeakerProvider {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.fs = dependencies.fs;
        this.readProjectConfig = dependencies.readProjectConfig;
        this.resolveProjectConfigPath = dependencies.resolveProjectConfigPath;
        this.parseCsvRows = dependencies.parseCsvRows;
        this.collectWorkspaceTextSources = dependencies.collectWorkspaceTextSources;
        this.isLikelyDialogueSpeaker = dependencies.isLikelyDialogueSpeaker;
        this.formatDisplayPath = dependencies.formatDisplayPath;
    }

    getSpeakerAtPosition(document, position) {
        const line = document.lineAt(position).text;
        const match = /^\s*([^:\uFF1A]+?)[ \t]*[:\uFF1A]/.exec(line);
        if (!match) {
            return undefined;
        }

        const name = match[1].trim();
        if (!this.isLikelyDialogueSpeaker(name)) {
            return undefined;
        }

        const start = line.indexOf(match[1]);
        const end = start + match[1].length;
        if (position.character >= start && position.character <= end) {
            return {
                name,
                range: new this.vscode.Range(position.line, start, position.line, end)
            };
        }

        return undefined;
    }

    async collectWorkspaceSpeakers(document) {
        const speakers = [];
        const seen = new Set();

        const configured = await this.readConfiguredRoleMapSpeakerRows(document);
        for (const speaker of configured) {
            this.addSpeaker(speakers, seen, speaker);
        }

        const sources = await this.collectWorkspaceTextSources(document);
        for (const source of sources) {
            this.collectSpeakersFromText(source.text, source.sourcePath, speakers, seen);
        }

        return speakers.sort((left, right) => {
            if (left.sourceRank !== right.sourceRank) {
                return left.sourceRank - right.sourceRank;
            }
            return left.name.localeCompare(right.name, "zh-Hans-CN");
        });
    }

    async collectConfiguredDefinitions(document, speakerName) {
        const speakers = await this.readConfiguredRoleMapSpeakerRows(document);
        return speakers.filter((speaker) => speaker.name === speakerName && typeof speaker.line === "number");
    }

    async collectWorkspaceReferences(document, speakerName) {
        const references = [];
        const sources = await this.collectWorkspaceTextSources(document);

        for (const source of sources) {
            this.collectReferencesFromText(source.text, source.sourcePath, speakerName, references);
        }

        return references.sort((left, right) => {
            const pathCompare = left.sourcePath.localeCompare(right.sourcePath);
            if (pathCompare !== 0) {
                return pathCompare;
            }
            if (left.line !== right.line) {
                return left.line - right.line;
            }
            return left.character - right.character;
        });
    }

    createCompletionItem(speaker) {
        const item = new this.vscode.CompletionItem(speaker.name, this.vscode.CompletionItemKind.Class);
        item.insertText = speaker.name + "\uFF1A";
        item.detail = speaker.roleId
            ? "UnitySample roleId " + speaker.roleId
            : speaker.sourceLabel + " (unbound)";
        item.documentation = speaker.sourcePath;
        item.sortText = (speaker.sourceRank || 0) + "_" + speaker.name;
        return item;
    }

    createHoverMarkdown(speaker) {
        const markdown = new this.vscode.MarkdownString(undefined, true);
        markdown.isTrusted = false;
        markdown.appendMarkdown("**Inscape Speaker** `" + speaker.name + "`\n\n");

        if (speaker.roleId) {
            markdown.appendMarkdown("UnitySample roleId: `" + speaker.roleId + "`\n\n");
        } else {
            markdown.appendMarkdown("UnitySample roleId: unbound\n\n");
        }

        markdown.appendMarkdown("Source: `" + this.formatDisplayPath(speaker.sourcePath) + "`");
        return markdown;
    }

    async readConfiguredRoleMapSpeakerRows(document) {
        const roleMapPath = await this.getConfiguredRoleMapPath(document);
        if (!roleMapPath) {
            return [];
        }

        const text = await this.fs.promises.readFile(roleMapPath, "utf8");
        return this.parseRoleMapSpeakerRows(text, roleMapPath);
    }

    async getConfiguredRoleMapPath(document) {
        const projectConfig = await this.readProjectConfig(document);
        if (!projectConfig || !projectConfig.configPath || !projectConfig.config || !projectConfig.config.unitySample) {
            return undefined;
        }

        const roleMap = projectConfig.config.unitySample.roleMap;
        if (!roleMap) {
            return undefined;
        }

        const roleMapPath = this.resolveProjectConfigPath(projectConfig.configPath, roleMap);
        if (!this.fs.existsSync(roleMapPath)) {
            return undefined;
        }

        return roleMapPath;
    }

    parseRoleMapSpeakerRows(text, roleMapPath) {
        const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
        let headerLine = -1;
        let headers = [];

        for (let line = 0; line < lines.length; line += 1) {
            const trimmed = lines[line].trim();
            if (!trimmed || trimmed.startsWith("#")) {
                continue;
            }

            const parsed = this.parseCsvRows(lines[line]);
            if (parsed.length === 0) {
                continue;
            }

            headers = parsed[0].map((header) => header.trim());
            headerLine = line;
            break;
        }

        const speakerIndex = headers.indexOf("speaker");
        const roleIdIndex = headers.indexOf("roleId");
        if (headerLine < 0 || speakerIndex < 0) {
            return [];
        }

        const speakers = [];
        for (let line = headerLine + 1; line < lines.length; line += 1) {
            const trimmed = lines[line].trim();
            if (!trimmed || trimmed.startsWith("#")) {
                continue;
            }

            const parsed = this.parseCsvRows(lines[line]);
            if (parsed.length === 0) {
                continue;
            }

            const row = parsed[0];
            const name = (row[speakerIndex] || "").trim();
            if (!name) {
                continue;
            }

            speakers.push({
                name,
                roleId: roleIdIndex >= 0 ? (row[roleIdIndex] || "").trim() : "",
                sourcePath: roleMapPath,
                sourceLabel: "UnitySample role map",
                sourceRank: 0,
                line,
                character: this.findCsvFieldValueStart(lines[line], speakerIndex, name),
                length: name.length
            });
        }

        return speakers;
    }

    collectSpeakersFromText(text, sourcePath, speakers, seen) {
        const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
        for (let line = 0; line < lines.length; line += 1) {
            const match = /^\s*([^:\uFF1A\s][^:\uFF1A]{0,80}?)[ \t]*[:\uFF1A]/.exec(lines[line]);
            if (!match) {
                continue;
            }

            const name = match[1].trim();
            if (!this.isLikelyDialogueSpeaker(name)) {
                continue;
            }

            this.addSpeaker(speakers, seen, {
                name,
                roleId: "",
                sourcePath,
                sourceLabel: "Workspace speaker",
                sourceRank: 1,
                line,
                character: this.getTrimmedMatchStart(lines[line], match[1], name),
                length: name.length
            });
        }
    }

    collectReferencesFromText(text, sourcePath, speakerName, references) {
        const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
        for (let line = 0; line < lines.length; line += 1) {
            const match = /^\s*([^:\uFF1A\s][^:\uFF1A]{0,80}?)[ \t]*[:\uFF1A]/.exec(lines[line]);
            if (!match) {
                continue;
            }

            const name = match[1].trim();
            if (name !== speakerName || !this.isLikelyDialogueSpeaker(name)) {
                continue;
            }

            references.push({
                name,
                sourcePath,
                line,
                character: this.getTrimmedMatchStart(lines[line], match[1], name),
                length: name.length
            });
        }
    }

    getTrimmedMatchStart(line, rawMatch, trimmedMatch) {
        const rawStart = Math.max(0, line.indexOf(rawMatch));
        const trimOffset = Math.max(0, rawMatch.indexOf(trimmedMatch));
        return rawStart + trimOffset;
    }

    addSpeaker(speakers, seen, speaker) {
        const key = speaker.name;
        if (seen.has(key)) {
            return;
        }

        seen.add(key);
        speakers.push(speaker);
    }

    findCsvFieldValueStart(line, fieldIndex, fallbackValue) {
        let currentField = 0;
        let fieldStart = 0;
        let inQuotes = false;

        for (let index = 0; index <= line.length; index += 1) {
            const character = index < line.length ? line[index] : ",";
            if (inQuotes) {
                if (character === "\"") {
                    if (line[index + 1] === "\"") {
                        index += 1;
                    } else {
                        inQuotes = false;
                    }
                }
                continue;
            }

            if (character === "\"") {
                inQuotes = true;
            } else if (character === ",") {
                if (currentField === fieldIndex) {
                    let start = fieldStart;
                    while (start < index && /\s/.test(line[start])) {
                        start += 1;
                    }
                    if (line[start] === "\"") {
                        start += 1;
                    }
                    return start;
                }

                currentField += 1;
                fieldStart = index + 1;
            }
        }

        const fallback = line.indexOf(fallbackValue);
        return Math.max(0, fallback);
    }

}

module.exports = {
    InscapeWorkspaceSpeakerProvider
};

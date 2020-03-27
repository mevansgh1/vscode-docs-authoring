"use strict";

import * as fs from "fs";
import * as path from "path";

import { commands, Selection, TextEditor, window, workspace } from "vscode";
import { isMarkdownFileCheck, noActiveEditorMessage, sendTelemetryData, tryFindFile } from "../helper/common";

export function insertMetadataCommands() {
    return [
        { command: updateMetadataDate.name, callback: updateMetadataDate },
        { command: updateImplicitMetadataValues.name, callback: updateImplicitMetadataValues },
    ];
}

interface IDocFxMetadata {
    build: {
        fileMetadata?: {
            "author"?: {
                [glob: string]: string,
            };
            "manager"?: {
                [glob: string]: string,
            };
            "titleSuffix"?: {
                [glob: string]: string,
            };
            "ms.author"?: {
                [glob: string]: string,
            };
            "ms.service"?: {
                [glob: string]: string,
            };
            "ms.subservice"?: {
                [glob: string]: string,
            };
        };
    };
}

type MetadataType =
    "author" |
    "manager" |
    "titleSuffix" |
    "ms.author" |
    "ms.date" |
    "ms.service" |
    "ms.subservice";

interface IReplacement {
    selection: Selection;
    value: string;
}

type Replacements = IReplacement[];

class ReplacementFormat {
    constructor(
        readonly type: MetadataType,
        private readonly value: string) {
    }

    public toReplacementString() {
        return `${this.type}: ${this.value}`;
    }
}

const authorRegex = /^author:\s*\b(.+?)$/mi;
const managerRegex = /^manager:\s*\b(.+?)$/mi;
const titleSuffixRegex = /^titleSuffix:\s*\b(.+?)$/mi;
const msAuthorRegex = /ms.author:\s*\b(.+?)$/mi;
const msDateRegex = /ms.date:\s*\b(.+?)$/mi;
const msServiceRegex = /ms.service:\s*\b(.+?)$/mi;
const msSubserviceRegex = /ms.subservice:\s*\b(.+?)$/mi;

const metadataExpressions: Map<MetadataType, RegExp> = new Map([
    ["author", authorRegex],
    ["manager", managerRegex],
    ["titleSuffix", titleSuffixRegex],
    ["ms.author", msAuthorRegex],
    ["ms.date", msDateRegex],
    ["ms.service", msServiceRegex],
    ["ms.subservice", msSubserviceRegex],
]);

export async function updateImplicitMetadataValues() {
    const editor = window.activeTextEditor;
    if (!editor) {
        noActiveEditorMessage();
        return;
    }

    if (!isMarkdownFileCheck(editor, false)) {
        return;
    }

    const content = editor.document.getText();
    if (content) {
        const replacementFormats = await getMetadataReplacements(editor);
        if (replacementFormats) {
            const replacements: Replacements = [];
            for (let i = 0; i < replacementFormats.length; ++i) {
                const replacementFormat = replacementFormats[i];
                if (replacementFormat) {
                    const expression = metadataExpressions.get(replacementFormat.type);
                    const replacement = findReplacement(editor, content, replacementFormat.toReplacementString(), expression);
                    if (replacement) {
                        replacements.push(replacement);
                    }
                }
            }

            await applyReplacements(replacements, editor);
            await saveAndSendTelemetry();
        }
    }
}

function findReplacement(editor: TextEditor, content: string, value: string, expression?: RegExp): IReplacement | undefined {
    const result = expression ? expression.exec(content) : null;
    if (result !== null && result.length) {
        const match = result[0];
        if (match && match != value) {
            const index = result.index;
            const startPosition = editor.document.positionAt(index);
            const endPosition = editor.document.positionAt(index + match.length);
            const selection = new Selection(startPosition, endPosition);

            return { selection, value };
        }
    }

    return undefined;
}

async function applyReplacements(replacements: Replacements, editor: TextEditor) {
    if (replacements) {
        await editor.edit((builder) => {
            replacements.forEach((replacement) =>
                builder.replace(
                    replacement.selection,
                    replacement.value));
        });
    }
}

async function getMetadataReplacements(editor: TextEditor): Promise<ReplacementFormat[]> {
    const folder = workspace.getWorkspaceFolder(editor.document.uri);
    if (folder) {
        // Read the DocFX.json file, search for metadata defaults.
        const docFxJson = tryFindFile(folder.uri.fsPath, "docfx.json");
        if (!!docFxJson && fs.existsSync(docFxJson)) {
            const jsonBuffer = fs.readFileSync(docFxJson);
            const metadata = JSON.parse(jsonBuffer.toString()) as IDocFxMetadata;
            if (metadata && metadata.build && metadata.build.fileMetadata) {
                const replacements: ReplacementFormat[] = [];
                const fsPath = editor.document.uri.fsPath;
                const fileMetadata = metadata.build.fileMetadata;
                const tryAssignReplacement = (filePath: string, type: MetadataType, globs?: { [glob: string]: string }) => {
                    if (globs) {
                        const value = getReplacementValue(globs, filePath);
                        if (value) {
                            replacements.push(new ReplacementFormat(type, value));
                            return true;
                        }
                    }
                    return false;
                };

                // Fall back to templates config, if unable to find author and ms.author
                if (!tryAssignReplacement(fsPath, "author", fileMetadata.author)) {
                    const gitHubId = workspace.getConfiguration("docs.templates").githubid;
                    if (gitHubId) {
                        replacements.push(new ReplacementFormat("author", gitHubId));
                    }
                }
                if (!tryAssignReplacement(fsPath, "ms.author", fileMetadata["ms.author"])) {
                    const alias = workspace.getConfiguration("docs.templates").alias;
                    if (alias) {
                        replacements.push(new ReplacementFormat("ms.author", alias));
                    }
                }

                tryAssignReplacement(fsPath, "manager", fileMetadata["manager"]);
                tryAssignReplacement(fsPath, "titleSuffix", fileMetadata["titleSuffix"]);
                tryAssignReplacement(fsPath, "ms.service", fileMetadata["ms.service"]);
                tryAssignReplacement(fsPath, "ms.subservice", fileMetadata["ms.subservice"]);

                replacements.push(new ReplacementFormat("ms.date", toShortDate(new Date())));

                return replacements;
            }
        }
    }

    return [];
}

function getReplacementValue(globs: { [glob: string]: string }, fsPath: string): string | undefined {
    if (globs && fsPath) {
        let segments = fsPath.split(path.sep);
        const globKeys = Object.keys(globs).map((key) => ({ key, segments: key.split("/") }));
        const firstSegment = globKeys[0].segments[0];
        segments = segments.slice(segments.indexOf(firstSegment));
        const length = segments.length;
        for (let i = 0; i < globKeys.length; ++i) {
            const globKey = globKeys[i];
            if (length <= globKey.segments.length) {
                let equals = false;
                for (let f = 0; f < segments.length - 1; ++f) {
                    const left = segments[f];
                    const right = globKey.segments[f];
                    if (right.startsWith("*")) {
                        break;
                    }
                    equals = left.toLowerCase() === right.toLowerCase();
                }

                if (equals) {
                    return globs[globKey.key];
                }
            }
        }
    }

    return undefined;
}

export async function updateMetadataDate(nag?: Boolean) {
    const editor = window.activeTextEditor;
    let updateDate = true;
    if (!editor) {
        noActiveEditorMessage();
        return;
    }

    if (!isMarkdownFileCheck(editor, false)) {
        return;
    }

    const content = editor.document.getText();
    if (content) {
        const replacement = findReplacement(editor, content, `ms.date: ${toShortDate(new Date())}`, msDateRegex);
        if (replacement) {
            if (nag === true) {
                let syncDate = await synchDate()
                    .then(function (result) {
                        return result;
                    });
                if (syncDate === undefined) {
                    updateDate = false;
                }
            }
            if (updateDate === true) {
                await applyReplacements([replacement], editor);
                await saveAndSendTelemetry();
            }
        }
    }
    return updateDate;
}


async function saveAndSendTelemetry() {
    await commands.executeCommand("workbench.action.files.save");

    const telemetryCommand = "updateMetadata";
    sendTelemetryData(telemetryCommand, updateMetadataDate.name);
}

function toShortDate(date: Date) {
    const year = date.getFullYear();
    const month = (1 + date.getMonth()).toString();
    const monthStr = month.length > 1 ? month : `0${month}`;
    const day = date.getDate().toString();
    const dayStr = day.length > 1 ? day : `0${day}`;

    return `${monthStr}/${dayStr}/${year}`;
}

async function synchDate() {
    return await window.showInputBox({
        placeHolder: "Today's date: " + toShortDate(new Date()), prompt: 'Update date?'
    });

}
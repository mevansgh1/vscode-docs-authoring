"use strict";

import * as fs from "fs";
import * as dir from "node-dir";
import { homedir } from "os";
import { basename, extname, join, relative } from "path";
import { Uri, window, workspace, WorkspaceFolder } from "vscode";
import * as YAML from "yamljs";
import { output } from "../extension";
import { generateTimestamp, naturalLanguageCompare, postError, postWarning, sendTelemetryData, tryFindFile } from "../helper/common";
import * as yamlMetadata from "../helper/yaml-metadata";

const telemetryCommand: string = "masterRedirect";
const redirectFileName: string = ".openpublishing.redirection.json";

export function getMasterRedirectionCommand() {
    return [
        { command: generateMasterRedirectionFile.name, callback: generateMasterRedirectionFile },
        { command: sortMasterRedirectionFile.name, callback: sortMasterRedirectionFile },
    ];
}

export interface IMasterRedirections {
    redirections: IMasterRedirection[];
}

export interface IMasterRedirection {
    source_path: string;
    redirect_url: string;
    redirect_document_id?: boolean;
}

/* tslint:disable:max-classes-per-file variable-name*/

export class MasterRedirection implements IMasterRedirections {
    public redirections: RedirectionFile[];

    constructor(redirectionFiles: RedirectionFile[]) {
        this.redirections = redirectionFiles;
    }
}

export class RedirectionFile implements IMasterRedirection {
    public fileFullPath: string;
    public isAlreadyInMasterRedirectionFile: boolean = false;
    public resource: any;

    // Members mapping to JSON elements in master redirection file
    public source_path: string;
    public redirect_url: string;
    public redirect_document_id: boolean = false;

    constructor(filePath: string, redirectUrl: string, redirectDocumentId: boolean, folder: WorkspaceFolder | undefined) {
        this.fileFullPath = filePath;
        this.source_path = this.getRelativePathToRoot(filePath, folder);
        this.redirect_url = redirectUrl;
        this.redirect_document_id = redirectDocumentId;
    }

    public getRelativePathToRoot(filePath: any, folder: WorkspaceFolder | undefined): string {
        if (folder) {
            return relative(folder.uri.fsPath, filePath).replace(/\\/g, "/");
        } else {
            throw new Error("Failed to resolve relative path to repo root folder for file " + filePath + ". Original error: " + Error.toString());
        }
    }
}

function showStatusMessage(message: string) {
    const { msTimeValue } = generateTimestamp();
    output.appendLine(`[${msTimeValue}] - ` + message);
    output.show();
}

export async function sortMasterRedirectionFile() {
    const editor = window.activeTextEditor;
    if (!editor) {
        postWarning("Editor not active. Abandoning command.");
        return;
    }

    const folder = workspace.getWorkspaceFolder(editor.document.uri);
    if (folder) {
        const file = tryFindFile(folder.uri.fsPath, redirectFileName);
        if (!!file && fs.existsSync(file)) {
            const jsonBuffer = fs.readFileSync(file);
            const redirects = JSON.parse(jsonBuffer.toString()) as IMasterRedirections;
            if (redirects && redirects.redirections && redirects.redirections.length) {

                redirects.redirections.sort((a, b) => {
                    return naturalLanguageCompare(a.source_path, b.source_path);
                });

                fs.writeFileSync(
                    file,
                    JSON.stringify(redirects, ["redirections", "source_path", "redirect_url", "redirect_document_id"], 4));
            }
        }
    }
}

export function generateMasterRedirectionFile(rootPath?: string, resolve?: any) {
    const editor = window.activeTextEditor;
    let workspacePath: string;
    if (editor) {
        sendTelemetryData(telemetryCommand, "");
        const resource = editor.document.uri;
        let folder = workspace.getWorkspaceFolder(resource);
        if (!folder && rootPath) {
            folder = workspace.getWorkspaceFolder(Uri.file(rootPath));
        }
        if (folder) {
            const repoName = folder.name.toLowerCase();
            workspacePath = folder.uri.fsPath;

            const date = new Date(Date.now());

            if (workspacePath == null) {
                postError("No workspace is opened.");
                return;
            }

            // Check if the current workspace is the root folder of a repo by checking if the .git folder is present
            const gitDir = join(workspacePath, ".git");
            if (!fs.existsSync(gitDir)) {
                postError("Current workspace is not root folder of a repo.");
                return;
            }

            dir.files(workspacePath, (err: any, files: any) => {
                if (err) {
                    window.showErrorMessage(err);
                    return;
                }

                const redirectionFiles: RedirectionFile[] = [];
                const errorFiles: any[] = [];

                showStatusMessage("Generating Master Redirection file.");

                files.filter((file: any) => extname(file.toLowerCase()) === ".md").forEach((file: any) => {
                    const content = fs.readFileSync(file, "utf8");
                    const mdContent = new yamlMetadata.MarkdownFileMetadataContent(content, file);

                    try {
                        const metadataContent = mdContent.getYamlMetadataContent();

                        if (metadataContent !== "") {
                            const yamlHeader = YAML.parse(metadataContent.toLowerCase());

                            if (yamlHeader != null && yamlHeader.redirect_url != null) {
                                if (yamlHeader.redirect_document_id !== true) {
                                    yamlHeader.redirect_document_id = false;
                                }
                                redirectionFiles.push(new RedirectionFile(file, yamlHeader.redirect_url, yamlHeader.redirect_document_id, folder));
                            }
                        }
                    } catch (error) {
                        errorFiles.push({
                            errorMessage: error,
                            fileName: file,
                        });
                    }
                });

                if (redirectionFiles.length === 0) {
                    showStatusMessage("No redirection files found.");
                    if (resolve) {
                        resolve();
                    }
                }

                if (redirectionFiles.length > 0) {
                    let masterRedirection: MasterRedirection | null;
                    const masterRedirectionFilePath: string = join(workspacePath, redirectFileName);
                    // If there is already a master redirection file, read its content to load into masterRedirection variable
                    if (fs.existsSync(masterRedirectionFilePath)) {
                        // test for valid json
                        try {
                            masterRedirection = JSON.parse(fs.readFileSync(masterRedirectionFilePath, "utf8"));
                        } catch (error) {
                            showStatusMessage("Invalid JSON: " + error);
                            return;
                        }
                    } else {
                        masterRedirection = null;
                        showStatusMessage("Created new redirection file.");
                    }

                    if (masterRedirection == null) {
                        // This means there is no existing master redirection file, we will create master redirection file and write all scanned result into it
                        masterRedirection = new MasterRedirection(redirectionFiles);
                    } else {
                        const existingSourcePath: string[] = [];

                        masterRedirection.redirections.forEach((item) => {
                            if (!item.source_path) {
                                showStatusMessage("An array is missing the source_path value. Please check .openpublishing.redirection.json.");
                                return;
                            }
                            existingSourcePath.push(item.source_path.toLowerCase());
                        });

                        redirectionFiles.forEach((item) => {
                            if (existingSourcePath.indexOf(item.source_path.toLowerCase()) >= 0) {
                                item.isAlreadyInMasterRedirectionFile = true;
                            } else {
                                if (masterRedirection != null) {
                                    masterRedirection.redirections.push(item);
                                } else {
                                    showStatusMessage("No redirection files found to add.");
                                    if (resolve) {
                                        resolve();
                                    }
                                }
                            }
                        });
                    }
                    if (masterRedirection.redirections.length > 0) {
                        masterRedirection.redirections.sort((a, b) => {
                            return naturalLanguageCompare(a.source_path, b.source_path);
                        });

                        fs.writeFileSync(
                            masterRedirectionFilePath,
                            JSON.stringify(masterRedirection, ["redirections", "source_path", "redirect_url", "redirect_document_id"], 4));

                        const currentYear = date.getFullYear();
                        const currentMonth = (date.getMonth() + 1);
                        const currentDay = date.getDate();
                        const currentHour = date.getHours();
                        const currentMinute = date.getMinutes();
                        const currentMilliSeconds = date.getMilliseconds();
                        const timeStamp = currentYear + `-` + currentMonth + `-` + currentDay + `_` + currentHour + `-` + currentMinute + `-` + currentMilliSeconds;
                        const deletedRedirectsFolderName = repoName + "_deleted_redirects_" + timeStamp;
                        const docsAuthoringHomeDirectory = join(homedir(), "Docs Authoring");
                        const docsRedirectDirectory = join(docsAuthoringHomeDirectory, "redirects");
                        const deletedRedirectsPath = join(docsRedirectDirectory, deletedRedirectsFolderName);
                        if (fs.existsSync(docsRedirectDirectory)) {
                            fs.mkdirSync(deletedRedirectsPath);
                        } else {
                            if (!fs.existsSync(docsAuthoringHomeDirectory)) {
                                fs.mkdirSync(docsAuthoringHomeDirectory);
                            }
                            if (!fs.existsSync(docsRedirectDirectory)) {
                                fs.mkdirSync(docsRedirectDirectory);
                            }
                            if (!fs.existsSync(deletedRedirectsPath)) {
                                fs.mkdirSync(deletedRedirectsPath);
                            }
                        }

                        redirectionFiles.forEach((item) => {
                            const source = fs.createReadStream(item.fileFullPath);
                            const dest = fs.createWriteStream(join(deletedRedirectsPath, basename(item.source_path)));

                            source.pipe(dest);
                            source.on("close", () => {
                                fs.unlink(item.fileFullPath, (err) => {
                                    if (err) {
                                        postError(`Error: ${err}`);
                                    }
                                });
                            });
                        });

                        redirectionFiles.forEach((item) => {
                            if (item.isAlreadyInMasterRedirectionFile) {
                                showStatusMessage("Already in master redirection file: " + item.fileFullPath);
                            } else {
                                showStatusMessage("Added to master redirection file. " + item.fileFullPath);
                            }
                        });

                        showStatusMessage("Redirected files copied to " + deletedRedirectsPath);
                        showStatusMessage("Done");
                        if (resolve) {
                            resolve();
                        }
                    }
                }
            });
        }
    }
}

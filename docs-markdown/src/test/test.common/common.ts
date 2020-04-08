import * as path from "path";
import { v4 as uuid } from "uuid";
import { commands, Position, Uri, window, workspace, WorkspaceEdit } from "vscode";
import { noActiveEditorMessage } from "../../helper/common";

export function sleep(ms: number): Promise<void> {
    return new Promise((r) => {
        setTimeout(r, ms);
    });
}

export async function loadDocumentAndGetItReady(filePath: string) {
    const docUri = Uri.file(filePath);
    const document = await workspace.openTextDocument(docUri);
    await window.showTextDocument(document);
}

export async function openTestRepository() {
    const filePath = path.resolve(__dirname, "../../../../src/test/data/repo");
    const repoUri = Uri.file(filePath);
    await commands.executeCommand("vscode.openFolder", repoUri);
}

export async function createDocumentAndGetItReady() {
    await commands.executeCommand("workbench.action.files.newUntitledFile");
}

export async function createMarkdownAndSetMetadata() {
    const filePath = path.join(`${workspace.rootPath}`, `${uuid()}.md`);
    const docUri = Uri.parse("untitled:" + filePath);
    const document = await workspace.openTextDocument(docUri);
    const edit = new WorkspaceEdit();
    const msdate = "01/01/2020";
    const metadata =
        "---\n" +
        "ms.date: " + msdate + "\n" +
        "---\n";
    edit.insert(docUri, new Position(0, 0), metadata);
    await workspace.applyEdit(edit).then(async success => {
        if (success) {
            await document.save().then(async saved => {
                if (saved) {
                    const doc = Uri.parse("file:" + filePath);
                    await workspace.openTextDocument(doc).then(async openedDocument => {
                        await window.showTextDocument(openedDocument);
                    });
                }
            });
        }
    });
    return docUri;
}

export async function deleteFile(file: string) {
    // attempt to offset concurrent calls to prevent files from not getting deleted
    const offset = Math.floor(Math.random() * (100 - 25 + 1)) + 25;
    await sleep(offset);
    const uri = Uri.parse(file);
    workspace.fs.delete(uri);
}

export async function getMsDate(filePath: string) {
    const docUri = Uri.file(filePath);
    await workspace.openTextDocument(docUri);
    const editor = window.activeTextEditor;
    const msDateRegex = /ms.date:\s*\b(.+?)$/mi;
    if (!editor) {
        noActiveEditorMessage();
        return;
    }
    const content = editor.document.getText();
    const msDate = msDateRegex ? msDateRegex.exec(content) : null;
    if (msDate !== null && msDate.length) {
        return msDate[0];
    }
}

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

export async function CreateDocumentAndSetMetadata() {
    const fileName = path.join(`${workspace.rootPath}`, `${uuid()}.md`);
    const newFile = Uri.parse("untitled:" + fileName);
    await workspace.openTextDocument(newFile).then(document => {
        const edit = new WorkspaceEdit();
        edit.insert(newFile, new Position(0, 0), "ms.date: 01/01/2020");
        return workspace.applyEdit(edit).then(async success => {
            if (success) {
                await window.showTextDocument(document);
                return fileName;
            } else {
                await window.showInformationMessage("Error!");
            }
        });
    });
    return fileName;
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

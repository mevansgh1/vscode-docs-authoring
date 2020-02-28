import * as path from "path";
const vscode = require("../../__mocks__/vscode");
import { isBold } from "../../src/helper/format-styles";

const testFolderLocation = "/../../test/test-content/";
const bolded = `**This is sample text in markdown bold format.**`;

// for posterity
describe("Format style type checking", () => {
    describe("isBold function", () => {
        const uri = vscode.Uri.file(
            path.join(__dirname + testFolderLocation + "format-single-line.md"),
        );
        const document = vscode.workspace.openTextDocument(uri);
        // const editor = vscode.window.showTextDocument(document);
        // const sampleString = editor.document.getText();
        console.log(`uri: ${uri}`);
        console.log(`document: ${document}`);
        console.log(`vscode: ${vscode}`);
        // const bolded = `**${sampleString}**`;
        sleep(500);
        it("returns true if text is bold in any way.", () => {
            expect(isBold(bolded)).toBe(true);
        });
    });
});

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

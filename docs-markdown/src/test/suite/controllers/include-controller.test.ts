import * as chai from "chai";
import * as spies from "chai-spies";
import * as glob from "glob";
import * as os from "os";
import { posix, resolve, sep } from "path";
import { commands, window, workspace } from "vscode";
import * as includeController from "../../../controllers/include-controller";
import * as common from "../../../helper/common";
import * as telemetry from "../../../helper/telemetry";
import { loadDocumentAndGetItReady, sleep } from "../../test.common/common";

chai.use(spies);
// tslint:disable-next-line: no-var-requires
const sinon = require("sinon");
const expect = chai.expect;

const root = workspace.workspaceFolders![0].uri;
const testFile = "../../../../../src/test/data/repo/articles/includes.md";
const testFilePath = resolve(__dirname, testFile);
const qpSelectionItems = [
    { description: root.fsPath + sep + "includes", label: "1.md" },
    { description: root.fsPath + sep + "includes", label: "2.md" },
    { description: root.fsPath + sep + "includes", label: "3.md" },
];

// create incluldes folder
async function createIncludes() {
    const folder = root.with({ path: posix.join(root.path, "includes") });
    await workspace.fs.createDirectory(folder);
}
// delete includes folder and everything inside the folder
async function deleteIncludes() {
    const folder = root.with({ path: posix.join(root.path, "includes") });
    await workspace.fs.delete(folder, { recursive: true, useTrash: false });
}
async function addMarkdownFile(fileCount: number) {
    while (fileCount > 0) {
        const filePath = "includes/" + fileCount + ".md";
        const fileUri = root.with({ path: posix.join(root.path, filePath) });
        await workspace.fs.writeFile(fileUri, Buffer.from("# This is a include page " + fileCount));
        fileCount--;
    }
}
suite("Include Controller", () => {
    suiteSetup(async () => {
        sinon.stub(telemetry, "sendTelemetryData");
        await commands.executeCommand("workbench.action.closeAllEditors");
        await createIncludes();
    });
    // Reset and tear down the spies
    teardown(async () => {
        chai.spy.restore(common);
        chai.spy.restore(window);
    });
    suiteTeardown(async () => {
        await commands.executeCommand("workbench.action.closeAllEditors");
        deleteIncludes();
        sinon.restore();
    });
    test("insertIncludeCommand", () => {
        const controllerCommands = [
            { command: includeController.insertInclude.name, callback: includeController.insertInclude },
        ];
        expect(includeController.insertIncludeCommand()).to.deep.equal(controllerCommands);
    });
    test("noActiveEditorMessage", () => {
        const spy = chai.spy.on(common, "noActiveEditorMessage");
        includeController.insertInclude();
        expect(spy).to.have.been.called();
    });
    test("isMarkdownFileCheck", async () => {
        const spy = chai.spy.on(common, "isMarkdownFileCheck");
        const stub = sinon.stub(glob, "glob");
        await loadDocumentAndGetItReady(testFilePath);
        await includeController.insertInclude();
        expect(spy).to.have.been.called();
        stub.restore();
    });
    test("hasValidWorkSpaceRootPath", async () => {
        const spy = chai.spy.on(common, "hasValidWorkSpaceRootPath");
        const stub = sinon.stub(glob, "glob");
        await loadDocumentAndGetItReady(testFilePath);
        await includeController.insertInclude();
        expect(spy).to.have.been.called();
        stub.restore();
    });
    test("Window NT - insertInclude", async () => {
        const stub = sinon.stub(os, "type").callsFake(() => "Windows_NT");
        await addMarkdownFile(1);
        const markdown = qpSelectionItems[0].description + sep + qpSelectionItems[0].label;
        await loadDocumentAndGetItReady(markdown);
        let editor = window.activeTextEditor;
        const originalText = editor?.document.getText();
        const expectedText = "[!INCLUDE [1](1.md)]" + originalText;

        window.showQuickPick = (items: string[] | Thenable<string[]>) => {
            return Promise.resolve(qpSelectionItems[0]) as Thenable<any>;
        };

        await includeController.insertInclude();
        await sleep(300);
        editor = window.activeTextEditor;
        const actualText = editor?.document.getText();
        expect(actualText).to.equal(expectedText);
        stub.restore();
    });
    test("Darwin - insertInclude", async () => {
        const stub = sinon.stub(os, "type").callsFake(() => "Darwin");
        await addMarkdownFile(1);
        const markdown = qpSelectionItems[0].description + sep + qpSelectionItems[0].label;
        await loadDocumentAndGetItReady(markdown);
        let editor = window.activeTextEditor;
        const originalText = editor?.document.getText();
        const expectedText = "[!INCLUDE [1](1.md)]" + originalText;

        window.showQuickPick = (items: string[] | Thenable<string[]>) => {
            return Promise.resolve(qpSelectionItems[0]) as Thenable<any>;
        };

        await includeController.insertInclude();
        await sleep(300);
        editor = window.activeTextEditor;
        const actualText = editor?.document.getText();
        expect(actualText).to.equal(expectedText);
        stub.restore();
    });
    test("Window NT - includeMultipleFiles", async () => {
        const stub = sinon.stub(os, "type").callsFake(() => "Windows_NT");
        await addMarkdownFile(3);
        const markdown = qpSelectionItems[1].description + sep + qpSelectionItems[1].label;
        await loadDocumentAndGetItReady(markdown);
        let editor = window.activeTextEditor;
        const originalText = editor?.document.getText();
        const expectedText = "[!INCLUDE [1](1.md)][!INCLUDE [2](2.md)][!INCLUDE [3](3.md)]" + originalText;

        window.showQuickPick = (items: string[] | Thenable<string[]>) => {
            return Promise.resolve(qpSelectionItems[0]) as Thenable<any>;
        };
        await includeController.insertInclude();
        await sleep(300);

        window.showQuickPick = (items: string[] | Thenable<string[]>) => {
            return Promise.resolve(qpSelectionItems[1]) as Thenable<any>;
        };

        await includeController.insertInclude();
        await sleep(300);
        window.showQuickPick = (items: string[] | Thenable<string[]>) => {
            return Promise.resolve(qpSelectionItems[2]) as Thenable<any>;
        };

        await includeController.insertInclude();
        await sleep(300);
        editor = window.activeTextEditor;
        const actualText = editor?.document.getText();
        expect(actualText).to.equal(expectedText);
        stub.restore();
    });
});

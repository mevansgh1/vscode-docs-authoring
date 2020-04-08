import * as assert from "assert";
import * as chai from "chai";
import * as spies from "chai-spies";
import { commands, MessageItem, window, workspace, TextEdit } from "vscode";
import { nagToUpdateMetaData, toShortDate } from "../../../controllers/metadata-controller";
import * as common from "../../../helper/common";
import { createMarkdownAndSetMetadata, deleteFile, getMsDate } from "../../test.common/common";

chai.use(spies);

const expect = chai.expect;

suite("Metadata Controller", () => {
    const sinon = require("sinon");
    let stub = sinon.stub();

    suiteSetup(() => {
        //stub = sinon.stub(workspace, "onWillSaveTextDocument");
    });
    // Reset and tear down the spies
    teardown(async () => {
        await commands.executeCommand("workbench.action.closeAllEditors");
        chai.spy.restore(common);
        //stub.restore();
    });
    suiteTeardown(async () => {
        await commands.executeCommand("workbench.action.closeAllEditors");
        // stub.restore();
    });
    test("noActiveEditorMessage", () => {
        const spy = chai.spy.on(common, "noActiveEditorMessage");
        nagToUpdateMetaData();
        expect(spy).to.have.been.called();
    });
    test("nagToUpdateMetaData => update ms.date", async () => {
        const syncDate = "Update";
        window.showInformationMessage = (<T extends MessageItem>(message: string, ...items: T[]) => {
            return Promise.resolve(syncDate) as Thenable<any>;
        });
        const markdown = await createMarkdownAndSetMetadata();
        const date = await getMsDate(markdown.fsPath);
        await nagToUpdateMetaData();
        const updatedDate = await getMsDate(markdown.fsPath);
        deleteFile(markdown.fsPath);
        assert.notEqual(date, updatedDate);
        assert.equal("ms.date: " + toShortDate(new Date()), updatedDate);
    });
    test("nagToUpdateMetaData => don't update ms.date", async () => {
        const syncDate = undefined;
        window.showInformationMessage = (<T extends MessageItem>(message: string, ...items: T[]) => {
            return Promise.resolve(syncDate) as Thenable<any>;
        });
        const markdown = await createMarkdownAndSetMetadata();
        const date = await getMsDate(markdown.fsPath);
        await nagToUpdateMetaData();
        const updatedDate = await getMsDate(markdown.fsPath);
        deleteFile(markdown.fsPath);
        assert.equal(date, updatedDate);
        assert.notEqual("ms.date: " + toShortDate(new Date()), updatedDate);
    });
    test("nagToUpdateMetaData::don't nag to update ms.date", async () => {
        const config = workspace.getConfiguration("markdown");
        await config.update("metadataNag", false, false);
        const updatedConfig = workspace.getConfiguration("markdown");
        const metadataNag = await updatedConfig.get("metadataNag");
        const spy = chai.spy.on(common, "noActiveEditorMessage");
        await nagToUpdateMetaData();
        assert.equal(metadataNag, false);
        expect(spy).to.not.have.been.called();
    });
    test("nagToUpdateMetaData::nag to update ms.date", async () => {
        const config = workspace.getConfiguration("markdown");
        await config.update("metadataNag", true, false);
        const updatedConfig = workspace.getConfiguration("markdown");
        const metadataNag = await updatedConfig.get("metadataNag");
        const spy = chai.spy.on(common, "noActiveEditorMessage");
        await nagToUpdateMetaData();
        assert.equal(metadataNag, true);
        expect(spy).to.have.been.called();
    });
    test("nagToUpdateMetaData::don't nag saved files", async () => {
        // disable date update
        window.showInformationMessage = (<T extends MessageItem>(message: string, ...items: T[]) => {
            return Promise.resolve(undefined) as Thenable<any>;
        });
        const markdown = await createMarkdownAndSetMetadata();
        const expectedDate = "ms.date: 01/01/2020";
        let actualDate = await getMsDate(markdown.fsPath);
        await nagToUpdateMetaData();
        // date should not have changed
        assert.equal(expectedDate, actualDate);
        // enable date update
        window.showInformationMessage = (<T extends MessageItem>(message: string, ...items: T[]) => {
            return Promise.resolve("Update") as Thenable<any>;
        });
        await nagToUpdateMetaData();
        actualDate = await getMsDate(markdown.fsPath);
        // since the file was already saved, the date still should not have changed.
        assert.equal(expectedDate, actualDate);
        deleteFile(markdown.fsPath);
    });
});

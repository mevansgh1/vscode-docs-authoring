import * as assert from "assert";
import * as chai from "chai";
import * as spies from "chai-spies";
import { commands, window } from "vscode";
import * as metadata from "../../../controllers/metadata-controller";
import { updateMetadataDate } from "../../../controllers/metadata-controller";
import * as common from "../../../helper/common";
//import * as telemetry from "../../../helper/telemetry";
import * as utility from "../../../helper/utility";
import { CreateDocumentAndSetMetadata, deleteFile, sleep, loadDocumentAndGetItReady } from "../../test.common/common";
import { resolve } from "path";

chai.use(spies);

const sinon = require("sinon");

const expect = chai.expect;

suite("Metadata Controller", () => {
    // Reset and tear down the spies
    teardown(() => {
        chai.spy.restore(common);
        sinon.restore();
    });
    suiteTeardown(async () => {
        await commands.executeCommand("workbench.action.closeAllEditors");
    });/*
    test("noActiveEditorMessage", async () => {
        const spy = chai.spy.on(common, "noActiveEditorMessage");
        await commands.executeCommand("workbench.action.closeAllEditors");
        metadata.updateMetadataDate();
        expect(spy).to.have.been.called();
    });/*
    test("syncDate === undefined", async () => {
        const syncDate = undefined;
        const spy = chai.spy.on(utility, "findReplacement");
        const showInformationMessage = sinon.stub(window, "showInformationMessage");
        showInformationMessage.resolves(syncDate);
        const markdown = await CreateDocumentAndSetMetadata();
        deleteFile(markdown);
        assert.ok(showInformationMessage.calledOnce);
        expect(spy).to.have.been.called();
    });*/
    test("syncDate === Update", async () => {
        const syncDate = "Update";
        const spyOnUpdateMetadataDate = chai.spy.on(metadata, "updateMetadataDate");
        const showInformationMessage = sinon.stub(window, "showInformationMessage");
        // const applyReplacements = sinon.stub(utility, "applyReplacements");
        // applyReplacements.resolves("");
        showInformationMessage.resolves(syncDate);
        let markdown = await CreateDocumentAndSetMetadata();
        let foo = "bar";
        await commands.executeCommand('workbench.action.files.save');
        // await loadDocumentAndGetItReady(markdown);
        //const filePath = resolve(__dirname, "../../../../../src/test/data/repo/articles/docs-markdown.md");
        //await commands.executeCommand("workbench.action.files.save");
        //metadata.nagToUpdateMetaData();
        //deleteFile(markdown);
        //assert.ok(showInformationMessage.called);
        expect(spyOnUpdateMetadataDate).to.have.been.called();
    });


    /*
    test("sync date is true", async () => {
        let syncDate = 'Update';
        let markdown = await CreateDocumentAndSetMetadata();
        let currMsdate = await getMsDate(markdown);
        const spy = chai.spy.on(utility, "applyReplacements");
        const showInformationMessage = sinon.stub(window, "showInformationMessage");
        showInformationMessage.resolves(syncDate);
        await updateMetadataDate(true);
        assert.ok(showInformationMessage.calledOnce);
        expect(spy).to.have.been.called();
        commands.executeCommand('workbench.action.files.save');
        let updatedMsdate = await getMsDate(markdown);
        //check to make sure the date was updated
        assert.equal('ms.date: ' + toShortDate(new Date()), updatedMsdate);
        assert.notEqual(currMsdate, updatedMsdate);
        deleteFile(markdown);
    });
    test("sync date is false", async () => {
        let syncDate = undefined;
        let markdown = await CreateDocumentAndSetMetadata();
        let currMsdate = await getMsDate(markdown);
        const spyOnApply = chai.spy.on(utility, "applyReplacements");
        const showInformationMessage = sinon.stub(window, "showInformationMessage");
        showInformationMessage.resolves(syncDate);
        await updateMetadataDate(true);
        assert.ok(showInformationMessage.calledOnce);
        expect(spyOnApply).to.not.have.been.called();
        commands.executeCommand('workbench.action.files.save');
        let updatedMsdate = await getMsDate(markdown);
        //check to make sure the date was NOT updated
        assert.notEqual('ms.date: ' + toShortDate(new Date()), updatedMsdate);
        assert.equal(currMsdate, updatedMsdate);
        deleteFile(markdown);
    });*/

});

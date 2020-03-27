import * as chai from "chai";
import * as spies from "chai-spies";
import { window, commands } from "vscode";
import { updateMetadataDate, toShortDate } from "../../../controllers/metadata-controller";
import * as common from "../../../helper/common";
import { CreateDocumentAndSetMetadata, getMsDate, deleteFile } from "../../test.common/common";
import * as utility from "../../../helper/utility";
import * as telemetry from "../../../helper/telemetry";
import * as assert from "assert";

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
        await commands.executeCommand('workbench.action.closeAllEditors');
    });
    test("noActiveEditorMessage", async () => {
        const spy = chai.spy.on(common, "noActiveEditorMessage");
        await commands.executeCommand('workbench.action.closeAllEditors');
        updateMetadataDate();
        expect(spy).to.have.been.called();
    });
    test("findReplacement", async () => {
        let markdown = await CreateDocumentAndSetMetadata();
        const spy = chai.spy.on(utility, "findReplacement");
        sinon.stub(utility, "applyReplacements")
        sinon.stub(telemetry, "sendTelemetryData");
        await updateMetadataDate();
        expect(spy).to.have.been.called();
        deleteFile(markdown);
    });
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
    });

});
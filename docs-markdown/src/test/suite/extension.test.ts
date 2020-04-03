
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
//import { commands, EventEmitter, TextDocumentSaveReason, TextDocumentWillSaveEvent, window, workspace, WorkspaceEdit, extensions, } from "vscode";
import { commands, window } from "vscode";
import { deactivate, installedExtensionsCheck } from "../../extension";
import * as metadata from "../../controllers/metadata-controller";
import * as chai from "chai";
import * as spies from "chai-spies";
import * as assert from "assert";
//import { CreateDocumentAndSetMetadata, deleteFile } from "../test.common/common";

chai.use(spies);
//const expect = chai.expect;
const sinon = require("sinon");

suite("Extension Test Suite", () => {
	window.showInformationMessage("Start all tests.");
	    // Reset and tear down the spies
    teardown(() => {
        chai.spy.restore(metadata);
        sinon.restore();
    });
    suiteTeardown(async () => {
        await commands.executeCommand('workbench.action.closeAllEditors');
    });

	test("Sample test", () => {
		deactivate();

		installedExtensionsCheck();

		assert.equal(-1, [1, 2, 3].indexOf(5));
		assert.equal(-1, [1, 2, 3].indexOf(0));

	});/*
	test('metadataNag is false', async () => {
		let config = workspace.getConfiguration('markdown');
		await config.update('metadataNag', false, false);
		let updatedConfig = workspace.getConfiguration('markdown');
		let metadataNag = await updatedConfig.get('metadataNag');
		assert.equal(metadataNag, false);
		const spy = chai.spy.on(metadata, "updateMetadataDate");
		let markdown = await CreateDocumentAndSetMetadata();
		expect(spy).to.not.have.been.called();
        deleteFile(markdown);
	});
	test('metadataNag is true', async () => {
		let config = workspace.getConfiguration('markdown');
		await config.update('metadataNag', true, false);
		let updatedConfig = workspace.getConfiguration('markdown');
		let metadataNag = await updatedConfig.get('metadataNag');
		assert.equal(metadataNag, true);
		const spy = chai.spy.on(metadata, "updateMetadataDate");
		let markdown = await CreateDocumentAndSetMetadata();
		expect(spy).to.have.been.called();
		deleteFile(markdown);
	});
	/*
	test('autosave is enabled', async () => {
		let event = new EventEmitter();
		event.event = workspace.onWillSaveTextDocument;
		event.fire(TextDocumentSaveReason.Manual);
		const spy = chai.spy.on(metadata, "updateMetadataDate");
		expect(spy).to.have.been.called();
	});*/
});

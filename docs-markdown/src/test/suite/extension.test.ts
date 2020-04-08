
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as chai from "chai";
import * as spies from "chai-spies";
import { commands, MessageItem, window, workspace } from "vscode";
import * as metadata from "../../controllers/metadata-controller";
import { createMarkdownAndSetMetadata, deleteFile, sleep } from "../test.common/common";

chai.use(spies);
const expect = chai.expect;

suite("Extension Test Suite", async function () {
	window.showInformationMessage("Start all tests.");
	setup(async function () {
		await commands.executeCommand("workbench.action.closeAllEditors");
	});
	teardown(() => {
		chai.spy.restore(metadata);
	});
	test("onWillSaveTextDocument", async () => {
		const spy = chai.spy.on(metadata, "nagToUpdateMetaData");
		window.showInformationMessage = (<T extends MessageItem>(message: string, ...items: T[]) => {
			return Promise.resolve(undefined) as Thenable<any>;
		});
		const markdown = await createMarkdownAndSetMetadata();
		deleteFile(markdown.fsPath);
		expect(spy).to.have.been.called();
	});
});
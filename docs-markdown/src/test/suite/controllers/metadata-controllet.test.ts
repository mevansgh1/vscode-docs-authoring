import * as assert from "assert";
import * as chai from "chai";
import * as spies from "chai-spies";
import { resolve } from "path";
import { commands, window } from "vscode";
import * as metadataController from "../../../controllers/metadata-controller";
import * as common from "../../../helper/common";
import * as telemetry from "../../../helper/telemetry";
import { loadDocumentAndGetItReady } from "../../test.common/common";

chai.use(spies);

// tslint:disable-next-line: no-var-requires
const sinon = require("sinon");

const expect = chai.expect;

suite("Metadata Controller", () => {
    // Reset and tear down the spies
    teardown(() => {
        chai.spy.restore(common);
    });
    suiteTeardown(async () => {
        await commands.executeCommand("workbench.action.closeAllEditors");
    });
    test("insertMetadataCommands", () => {
        const controllerCommands = [
            { command: metadataController.updateMetadataDate.name, callback: metadataController.updateMetadataDate },
            { command: metadataController.updateImplicitMetadataValues.name, callback: metadataController.updateImplicitMetadataValues },
        ];
        expect(metadataController.insertMetadataCommands()).to.deep.equal(controllerCommands);
    });
    test("updateImplicitMetadataValues().noActiveEditorMessage()", async () => {
        await commands.executeCommand("workbench.action.closeAllEditors");
        const spy = chai.spy.on(common, "noActiveEditorMessage");
        metadataController.updateImplicitMetadataValues();
        expect(spy).to.have.been.called();
    });
    test("updateImplicitMetadataValues().isMarkdownFileCheck()", async () => {
        // pass in a non-markdown file
        const filePath = resolve(__dirname, "../../../../../src/test/data/repo/docfx.json");
        await loadDocumentAndGetItReady(filePath);

        const spy = chai.spy.on(common, "isMarkdownFileCheck");
        await metadataController.updateImplicitMetadataValues();
        expect(spy).to.have.been.called();
    });
    test("updateImplicitMetadataValues()", async () => {
        const stub = sinon.stub(telemetry, "sendTelemetryData");
        const filePath = resolve(__dirname, "../../../../../src/test/data/repo/articles/test/metadata.md");
        await loadDocumentAndGetItReady(filePath);

        const expectedText =
            "---\n" +
            "author: bar\n" +
            "manager: bar\n" +
            "titleSuffix: bar\n" +
            "ms.author: bar\n" +
            "ms.date: " + common.toShortDate(new Date()) + "\n" +
            "ms.service: bar\n" +
            "ms.subservice: bar\n" +
            "---\n";

        await metadataController.updateImplicitMetadataValues();
        const actualText = window.activeTextEditor?.document.getText();

        assert.equal(expectedText, actualText);
        stub.restore();
        // cleanup the modified metadata.md to prevent false positives for future tests.
        const { exec } = require("child_process");
        exec("cd " + __dirname + " && git checkout " + filePath);
    });
    test("updateMetadataDate().noActiveEditorMessage()", async () => {
        await commands.executeCommand("workbench.action.closeAllEditors");
        const spy = chai.spy.on(common, "noActiveEditorMessage");
        metadataController.updateMetadataDate();
        expect(spy).to.have.been.called();
    });
    test("updateMetadataDate().isMarkdownFileCheck()", async () => {
        // pass in a non-markdown file
        const filePath = resolve(__dirname, "../../../../../src/test/data/repo/docfx.json");
        await loadDocumentAndGetItReady(filePath);

        const spy = chai.spy.on(common, "isMarkdownFileCheck");
        await metadataController.updateMetadataDate();
        expect(spy).to.have.been.called();
    });
    test("updateMetadataDate()", async () => {
        const stub = sinon.stub(telemetry, "sendTelemetryData");
        const filePath = resolve(__dirname, "../../../../../src/test/data/repo/articles/test/metadata.md");
        await loadDocumentAndGetItReady(filePath);

        const expectedText =
            "---\n" +
            "author: foo\n" +
            "manager: foo\n" +
            "titleSuffix: foo\n" +
            "ms.author: foo\n" +
            "ms.date: " + common.toShortDate(new Date()) + "\n" +
            "ms.service: foo\n" +
            "ms.subservice: foo\n" +
            "---\n";

        await metadataController.updateMetadataDate();
        const actualText = window.activeTextEditor?.document.getText();

        assert.equal(expectedText, actualText);
        stub.restore();
        // cleanup the modified metadata.md to prevent false positives for future tests.
        const { exec } = require("child_process");
        exec("cd " + __dirname + " && git checkout " + filePath);
    });
});

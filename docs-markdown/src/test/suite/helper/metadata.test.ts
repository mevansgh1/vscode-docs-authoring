import * as assert from 'assert';
import * as chai from 'chai';
import * as spies from 'chai-spies';
import { commands, MessageItem, window, workspace } from 'vscode';
import * as metadata from '../../../controllers/metadata-controller';
import * as common from '../../../helper/common';
import * as metadataHelper from '../../../helper/metadata';
import * as telemetry from '../../../helper/telemetry';
import * as utility from '../../../helper/utility';
import { loadDocumentAndGetItReady } from '../../test.common/common';
import { resolve } from 'path';

chai.use(spies);

const expect = chai.expect;

suite('Metadata Helper', () => {
    const sinon = require('sinon');

    setup(async () => {
        sinon.stub(workspace, 'onWillSaveTextDocument');
        sinon.stub(telemetry, 'sendTelemetryData');
        const config = workspace.getConfiguration('markdown');
        await config.update('metadataNag', true, false);
    });

    // Reset and tear down the spies
    teardown(async () => {
        await commands.executeCommand('workbench.action.closeAllEditors');
        chai.spy.restore(common);
        chai.spy.restore(metadata);
        sinon.restore();
    });

    test('noActiveEditorMessage', async () => {
        const spy = chai.spy.on(common, 'noActiveEditorMessage');
        await metadataHelper.nag();
        expect(spy).to.have.been.called();
    });
    test('nag => user selects to update ms.date', async () => {
        const stub = sinon.stub(metadata, 'updateMetadataDate');
        // create user response choosing to update the ms.date
        window.showInformationMessage = (<T extends MessageItem>(message: string, ...items: T[]) => {
            return Promise.resolve('Update') as Thenable<any>;
        });
		const filePath = resolve(__dirname, '../../../../../src/test/data/repo/articles/test/metadata2.md');
        await loadDocumentAndGetItReady(filePath);
        await metadataHelper.nag();
        assert.equal(stub.callCount, 1);
        stub.restore();
    });
    test('nag => user selects not to update ms.date', async () => {
        const stub = sinon.stub(metadata, 'updateMetadataDate');
        // creates user response choosing not to update the ms.date
        window.showInformationMessage = (<T extends MessageItem>(message: string, ...items: T[]) => {
            return Promise.resolve(undefined) as Thenable<any>;
        });
		const filePath = resolve(__dirname, '../../../../../src/test/data/repo/articles/test/metadata3.md');
        await loadDocumentAndGetItReady(filePath);        
        await metadataHelper.nag();
        assert.equal(stub.callCount, 0);
        stub.restore();
    });
    test('nag => ms.date nag is disabled', async () => {
        const spy = chai.spy.on(common, 'noActiveEditorMessage');
        const stub = sinon.stub(utility, 'findReplacement');
        const config = workspace.getConfiguration('markdown');
        // disable the ms.date nag
        await config.update('metadataNag', false);
        const updatedConfig = workspace.getConfiguration('markdown');
        const metadataNag = await updatedConfig.get('metadataNag');
        await metadataHelper.nag();
        assert.equal(metadataNag, false);
        expect(spy).to.not.have.been.called();
        assert.equal(stub.callCount, 0);
        stub.restore();
    });
    test('nag => ms.date nag is enabled', async () => {
        const config = workspace.getConfiguration('markdown');
        // make sure the ms.date nag is enabled
        await config.update('metadataNag', true);
        const updatedConfig = workspace.getConfiguration('markdown');
        const metadataNag = await updatedConfig.get('metadataNag');
        const spy = chai.spy.on(common, 'noActiveEditorMessage');
        await metadataHelper.nag();
        assert.equal(metadataNag, true);
        expect(spy).to.have.been.called();
    });
    test('nag => only nag once', async () => {
        const stub = sinon.stub(utility, 'findReplacement');
        window.showInformationMessage = (<T extends MessageItem>(message: string, ...items: T[]) => {
            return Promise.resolve(undefined) as Thenable<any>;
        });
		const filePath = resolve(__dirname, '../../../../../src/test/data/repo/articles/test/metadata4.md');
        await loadDocumentAndGetItReady(filePath);        
        await metadataHelper.nag();
        assert.equal(stub.callCount, 1);
        await metadataHelper.nag();
        // method should not have been called again as file was already nagged
        assert.equal(stub.callCount, 1);
        stub.restore();
    });
});
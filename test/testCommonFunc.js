'use strict';

const assert = require('assert');
const importUUDB = require('../importUDIDataToDB');

describe('importUUDataToDB', function () {
    describe('#common function test', function () {
        it('isUDIDBFile用于判断传入的文件名是否是UDI数据库文件名', function () {
            assert.equal(importUUDB.isUDBFile('G_10_880'), false);
            assert.equal(importUUDB.isUDBFile('g_10_880'), true);
            assert.equal(importUUDB.isUDBFile('m_1004'), true);
        });

        it('clear sys db import reacords', function () {
            importUUDB.setSysDBFolder('./assets/');
            importUUDB.clearSysImptRecs();
        });
    });
});
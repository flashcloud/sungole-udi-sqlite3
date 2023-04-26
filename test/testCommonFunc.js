'use strict';

const assert = require('assert');

const {resolve} = require("path");
const path = require('path');
const fs = require('fs');
const moment = require('moment');

const importUUDB = require('../importUDIDataToDB');
const myconfig = require('../config');
const Database = require("better-sqlite3");

describe('importUUDataToDB', function () {
    describe('#common function test', function () {
        it('isUDIDBFile用于判断传入的文件名是否是UDI数据库文件名', function () {
                assert.equal(importUUDB.isUDBFile('G_10_880'), false);
            assert.equal(importUUDB.isUDBFile('g_10_880'), true);
                assert.equal(importUUDB.isUDBFile('m_1004'), true);
        });

        it('crateIndexForDI', function () {
            //const sqliteDB = new Database(importUUDB.getDBPath('g_10_690'));
            //const ret1 =  importUUDB.crateIndexForDI(sqliteDB, 'ud_2')
            //assert.equal(ret1, true);
            //const ret2 =  importUUDB.crateIndexForDI(sqliteDB, 'ud_2')
            //assert.equal(ret2, false);
        });
    });
});
'use strict';

const assert = require('assert');

const {resolve} = require("path");
const path = require('path');
const fs = require('fs');

const importUUDB = require('../importUDIDataToDB');

describe('importUUDataToDB', function () {
    describe('#extractGS1DBAandTbName()', function () {
        it('不是规范的GTN编码(1234567890123)这一类产品统一存放在一个数据库"：g_00_000', function () {
            let ret = importUUDB.extractGS1DBAandTbName('0012345678901');
            assert.equal(ret.dbName, 'g_00_000');
            assert.equal(ret.tbName, 'ud_1');
        });

        it('extractDBAndTbName For GS1码', function () {
            let di = '16947040920881'
            let ret = importUUDB.extractDBAndTbName(di, 'GS1')
            assert.equal(ret.dbName, 'g_10_694_7');
            assert.equal(ret.tbName, 'ud_04');
        });

        it('GTN-8编码的GS1-DI码的产品(00000078901234)UDI数据库名取DI码的N6N7N8三位：g_08_078(08代表GTN-8), 表名为数据库名的下一位数字：ud_9', function () {
            let ret = importUUDB.extractGS1DBAandTbName('00000078901234');
            assert.equal(ret.dbName, 'g_08_078');
            assert.equal(ret.tbName, 'ud_9');
        });

        it('GTN-12、13、14编码的GS1-DI码的产品(12345678901234)UDI数据库名取DI码的N2N3N4三位：g_10_234, 表名为数据库名的下一位数字：ud_5', function () {
            let ret = importUUDB.extractGS1DBAandTbName('12345678901234');
            assert.equal(ret.dbName, 'g_10_234_5');
            assert.equal(ret.tbName, 'ud_67');
        });

        it('GTN-12编码的GS1-DI码的产品(00942040920881)UDI数据库名取DI码的N2N3N4三位：g_10_094, 表名为数据库名的下一位数字：ud_2', function () {
            let ret = importUUDB.extractGS1DBAandTbName('00942040930881');
            assert.equal(ret.dbName, 'g_10_094_2');
            assert.equal(ret.tbName, 'ud_04');
        });

        it('GTN-13编码的GS1-DI码的产品(06942040920881)UDI数据库名取DI码的N2N3N4三位：g_10_694, 表名为数据库名的下一位数字：ud_7', function () {
            let ret = importUUDB.extractGS1DBAandTbName('06947040920881');
            assert.equal(ret.dbName, 'g_10_694_7');
            assert.equal(ret.tbName, 'ud_04');
        });

        it('GTN-14编码的GS1-DI码的产品(16942040920881)UDI数据库名取DI码的N2N3N4三位：g_10_694, 表名为数据库名的下一位数字：ud_7', function () {
            let ret = importUUDB.extractGS1DBAandTbName('16947040920881');
            assert.equal(ret.dbName, 'g_10_694_7');
            assert.equal(ret.tbName, 'ud_04');
        });
    });

    describe('#getFirstNotZeroChar()', function () {
        it('从"0000058901234"字符串中取出第一个非零的字符应该是5', function () {
            let ret = importUUDB.getFirstNotZeroChar('0000058901234');
            assert.equal(ret, '5')
        });
    });
});
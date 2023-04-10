'use strict';

const assert = require('assert');

const {resolve} = require("path");
const path = require('path');
const fs = require('fs');

const importUUDB = require('../importUDIDataToDB');

describe('importUUDataToDB', function () {
    describe('#extractMADBAandTbName()', function () {
        it('中国发行机构标识是MA.156', function () {
            let maCode = 'MA.156.M0.100204.13351764'
            let maObj = importUUDB.getMACodeObj(maCode);
            assert.equal(maObj.ISSUER_OF_CHINA, 'MA.156');
            assert.equal(maObj.issuerOfContry, 'MA.156');
        });

        it('extractDBAndTbName For MA码', function () {
            let maCode = 'MB.234.M0.123456.01234567'
            let ret = importUUDB.extractDBAndTbName(maCode, 'MA')
            assert.equal(ret.dbName, 'm_000');
            assert.equal(ret.tbName, 'ud_2');
        });

        it('国外的产品都统一放到数据库 m_000 中，存放的数据表是MA码的国家代码第1位，如"MB.234.M0.123456.01234567"编码生成的表名(国家代码为234)为：ud_2', function () {
            let maCode = 'MB.234.M0.123456.01234567'
            let ret = importUUDB.extractMADBAandTbName(maCode);
            assert.equal(ret.dbName, 'm_000');
            assert.equal(ret.tbName, 'ud_2');
        });

        it('国内产品的MA码，如"MA.156.M0.100274.13360111"，放到数据库"m_1002" 表名"ud_7"', function () {
            let maCode = 'MA.156.M0.100274.13360111'
            let ret = importUUDB.extractMADBAandTbName(maCode);
            assert.equal(ret.dbName, 'm_1002');
            assert.equal(ret.tbName, 'ud_7');
        });
    });

    describe('#test', function () {
        it('testSplit', function () {
            let udiDI = 'MA.156.M0.100204.13351764';
            const udiDIAry = udiDI.split('.');
            const MACodeParty = {
                issuer: udiDIAry[0], //MA发行机构：MA(2位)
                contry: udiDIAry[1], //国家代码：156(3位)
                trade:  udiDIAry[2], //行业代码：M0(2位)
                registrant: udiDIAry[3], //注册人(6位)
                goodsCode: udiDIAry[4].substring(1, 7)  //产品编码
            }

            assert.equal(MACodeParty.goodsCode, '335176');
        });
    });
});
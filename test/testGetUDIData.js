'use strict';

const assert = require('assert');
const importUUDB = require('../importUDIDataToDB');

describe('Get Data From UDI DB', function () {
    describe('#1', function () {
        it('返回正确的UDI产品数据', function () {
            importUUDB.setDataFolder('./test/assets/db/');
            const goods = importUUDB.getUDIData('04054596877153', 'GS1');
            assert.equal(goods == null, false);
            assert.equal(goods.minDI, '04054596877153');
        });

        it('无效的SQLit3数据文件，返回的UDI产品值是NULL', function () {
            importUUDB.setDataFolder('./test/assets/db/');
            const goods = importUUDB.getUDIData('38711428074568', 'GS1');
            assert.equal(goods, null);
        });

        it('数据文件不存在时，返回null', function () {
            importUUDB.setDataFolder('./test/assets/db/');
            const goods = importUUDB.getUDIData('06934269339455', 'GS1');
            assert.equal(goods, null)
        });
    });
});
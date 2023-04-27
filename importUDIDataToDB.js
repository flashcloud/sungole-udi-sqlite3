/**
 * Created by sungole on 20/3/2023
 */
'use strict';

const {resolve} = require("path");
const path = require('path');
const fs = require('fs');

const XLSX = require("xlsx");
const Database = require('better-sqlite3');

const myconfig = require('./config');
const moment = require("moment/moment");
const logger = require('./assets/js/MyLog').logger;
const MA = require('ma-parser');
const dns = require("dns");

const schema = myconfig.uuXlsToUUDbTbMapper;  //从配置文件加载数据库表结构与UDI-EXCEL表结构映射
let sysDB = null;

/**
 * 动态创建数据库
 */
function createNewDB(dbFile, callback) {
    //创建指定路径及文件名的SQLite数据库
    let db = new Database(dbFile, Database.OPEN_READWRITE, (err) => {
        if (err) {
            console.error(err.message);
        }
        verbose: console.log
    });
    return db;
}

/**
 * 导入Excel中的UDI数据到SQLite数据库的表
 * @param xlsxFile
 */
function importUDIDataToSourceTb(xlsxFile) {
    let db = null;
    const dbFile = getDBPath(myconfig.common.importSourceDbName)
    if (!fs.existsSync(dbFile)) {
        db = createNewDB(dbFile);    //创建数据库
        let createTable = fs.readFileSync(resolve(myconfig.common.udiTableStructFilePath)).toString();  //读取创建Goods表的SQL文件
        createTable = createTable.replace(myconfig.common.importSourceTbSQLV, myconfig.common.importSourceTbName);
        db.exec(createTable);   //创建表Goods
    } else
        db = new Database(dbFile, {verbose: console.log});

    const workbook = XLSX.readFile(xlsxFile);

    let first_sheet_name = workbook.SheetNames[0]; //读取sheet1工作单的名称
    let sheet_data = workbook.Sheets[first_sheet_name]; //获取sheet1工作单的数据

    const imptFileColName = myconfig.common.imptFileColName; //UDI表的imptFile列，存储导入此条数据的EXCEL文件名
    const paramsPrefix = '@';

    //生成要导入的数据
    const xlsxRows = XLSX.utils.sheet_to_json(sheet_data, {raw: true});
    let dbRows = new Array();
    let i = 0;
    for (const goods of xlsxRows) {
        i++;
        let dbRow = {};
        for (const key in schema) {
            dbRow[key] = goods[schema[key]]
        }
        dbRow[imptFileColName] = path.basename(xlsxFile); //插入导入的EXCEL文件名
        dbRows.push(dbRow);
    }

    //动态构建插入语句
    let sqlOfCols = new Array();
    let sqlOfValues = new Array();
    for (const key in schema) {
        sqlOfCols.push(key);
        sqlOfValues.push(paramsPrefix + key);
    }
    sqlOfCols.push(imptFileColName);    //插入导入的EXCEL文件名列
    sqlOfValues.push(paramsPrefix + imptFileColName);
    let insertSql = `INSERT INTO ${myconfig.common.importSourceTbName} (${sqlOfCols.join(', ')}) VALUES (${sqlOfValues.join(', ')})`;

    //创建批量插入过程
    const insert = db.prepare(insertSql);
    const insertMany = db.transaction((cats) => {
        for (const cat of cats) {
            insert.run(cat);
        }
    });
    insertMany(dbRows);
}

/**
 * 导入./data/tmp文件夹下所有的UDI-EXCEL数据到指定的SQLite数据库表中
 */
function importUDIFielsToDB(unzipPath, zipFileName, zipMD5, callback) {
    const requireImpt = isRequiredDownloadFile(zipFileName, zipMD5);
    //当前指定的filesFingerprint是否已经导入过，如果导入过，则不再执行导入
    if (!requireImpt) return;

    const sysDB1 = getSysDB();
    if (sysDB1 == null) return;

    let importTotal = {dbs: 0, tbs:0, newTbs: 0, files: 0, insert:0, update: 0, ignore: 0}; //导入，新增，没有被导入的结果统计

    fs.readdir(unzipPath, function (err, files) {
        try {
            //找到/data/tmp/目录下所有的"xlsx"文件
            let xlsxFiles = files.filter(function (e) {
                return path.extname(e).toLowerCase() === myconfig.common.udiExcelFileExt
            });

            let startAt = new Date().getTime();
            let endAt = startAt;
            startAt = process.uptime();

            if (xlsxFiles.length > 0)
                logger.info('本次导入开始...')

            //插入该目录下的每个xlsx文件中的UDI数据到SQLite数据库
            for (const xlsxFile of xlsxFiles) {
                let xlsxFilePath = path.join(unzipPath, xlsxFile)
                //importUUDB.importUToSourceTbData(xlsxFilePath);
                let result = importSingleUDIFileToDB(xlsxFilePath);
                logger.info(`从文件 ${xlsxFilePath} 导入 ${result.insert} 条数据；更新 ${result.update} 条数据；忽略 ${result.ignore} 条数据。涉及数据库 ${result.dbs} 个，表 ${result.tbs} 个，其中新建表 ${result.newTbs} 个`);

                importTotal.files += 1;
                importTotal.dbs += result.dbs;
                importTotal.tbs += result.tbs;
                importTotal.newTbs += result.newTbs;
                importTotal.insert += result.insert;
                importTotal.update += result.update;
                importTotal.ignore += result.ignore;
            }

            if (importTotal.files > 0) {
                //记录日志
                logger.info(`从 ${importTotal.files} 个文件中共计导入 ${importTotal.insert} 条数据；更新 ${importTotal.update} 条数据；忽略 ${importTotal.ignore} 条数据。涉及数据库 ${importTotal.dbs} 个，表 ${importTotal.tbs} 个，其中新建表 ${importTotal.newTbs} 个`);
                endAt = process.uptime();
                let interval = endAt - startAt;
                let usedTime = interval + '秒';
                if (interval > 60) {
                    usedTime = (interval / 60) + '分';
                }
                logger.info(`本次导入结束。共计耗时 ${usedTime}`);

                //在sys数据库中记录本次导入情况
                if (requireImpt) {
                    const insertImpportRec = sysDB1.prepare('INSERT INTO imptRec (importTime, zipFile, zipMD5) VALUES (@importTime, @zipFile, @zipMD5)');
                    insertImpportRec.run({
                        "importTime": moment().format("YYYY-MM-DD HH:mm:ss"),
                        "zipFile": zipFileName,
                        "zipMD5": zipMD5
                    });
                }
            }

            if (callback !== undefined & callback !== null)
                callback(true, zipFileName, importTotal.files);
        } catch (e) {
            logger.error(`Failed to import data from the data file extracted from the compressed package ${zipFileName}`)
            if (callback !== undefined & callback !== null)
                callback(false, zipFileName, 0);
        }
    });
}

/**
 * 导入国家药监管理局下载的Excel中的UDI数据到SQLite数据库的表
 * @param xlsxFile
 */
function importSingleUDIFileToDB(xlsxFile) {
    let importTotal = {dbs: 0, tbs:0, newTbs: 0, insert:0, update: 0, ignore: 0}; //导入，新增，没有被导入的结果统计
    const workbook = XLSX.readFile(xlsxFile);

    let first_sheet_name = workbook.SheetNames[0]; //读取sheet1工作单的名称
    let sheet_data = workbook.Sheets[first_sheet_name]; //获取sheet1工作单的数据

    //生成要导入的数据
    const imptFileColName = myconfig.common.imptFileColName; //UDI表的imptFile列，存储导入此条数据的EXCEL文件名
    let importData = {};   //{'g_10_694': {'ud_1': [], 'ud_7': []}, 'g_10_695': {'ud_3': []}}，'g_10_694':要插入的数据库名，"ud_1":要插入的数据表名，[]:数组是各行要插入的JSON数据
    const xlsxRows = XLSX.utils.sheet_to_json(sheet_data, {raw: true});
    if (xlsxRows.length == 0) {
        return importTotal; //如果没有数据则退出
    }

    let i = 0;
    for (const goodsInXls of xlsxRows) {
        //根据EXCEL表到DB数据库表的结构映射动态将EXCEL中的数据转换成JSON数据结构
        i++;
        let dbRow = {};
        for (const key in schema) {
            dbRow[key] = goodsInXls[schema[key]]
        }
        dbRow[imptFileColName] = path.basename(xlsxFile); //插入导入的EXCEL文件名

        let udiDI = goodsInXls[schema.minDI];
        let udiType = goodsInXls[schema.DIType];
        let importLocate = extractDBAndTbName(udiDI, udiType)
        if (importLocate !== null) {
            //如果对应的数据库项不存在，则添加该该数据库的键值项
            const dbName = importLocate.dbName;
            let dbTables = importData[dbName];
            if ( dbTables === undefined) {
                importData[dbName] = {};
                dbTables = importData[dbName];
            }
            //如果对应的数据表项不存在，则添加该该数据表的键值项
            const tbName = importLocate.tbName;
            let tbRows = dbTables[tbName];
            if (tbRows === undefined) {
                dbTables[tbName] = new Array();
                tbRows = dbTables[tbName];
            }
            //在数据表项的数组中push当前数据行
            tbRows.push(dbRow);
        }
    }

    sheet_data = null;

    //动态构建Insert及Update的SQL语句
    const paramsPrefix = '@';
    let sqlOfCols = new Array();
    let sqlOfValues = new Array();
    let sqlOfUpate = new Array();
    for (const key in schema) {
        sqlOfCols.push(key);
        sqlOfValues.push(paramsPrefix + key);
        sqlOfUpate.push(`${key}=${paramsPrefix}${key}`);
    }
    sqlOfCols.push(imptFileColName);    //插入导入的EXCEL文件名列
    sqlOfValues.push(paramsPrefix + imptFileColName);
    sqlOfUpate.push(`${imptFileColName}=${paramsPrefix}${imptFileColName}`);
    const sqlTmplTableName = '{tbKey}';
    let insertSQLTmpl = `INSERT INTO ${sqlTmplTableName} (${sqlOfCols.join(', ')}) VALUES (${sqlOfValues.join(', ')})`;
    let updateSQLTmpl = `UPDATE ${sqlTmplTableName} SET ${sqlOfUpate.join(', ')} WHERE ID = @ID`
    let createTableTmpl = fs.readFileSync(resolve(__dirname, myconfig.common.udiTableStructFilePath)).toString();  //读取创建表的SQL文件

    const dbOptions = {};
    const isDev = myconfig.isDevMode();
    //if (isDev) dbOptions.verbose = console.log;

    //插入新增的，或者更新数据库中已有的
    for (const dbName in importData) {
        //如果没有数据库则创建
        let db = new Database(getDBPath(dbName), dbOptions);
        importTotal.dbs += 1;

        let dbTables = importData[dbName];
        for (const tbName in dbTables) {
            //如果没有这个表，则创建
            let createTable = createTableTmpl.replace(myconfig.common.importSourceTbSQLV, tbName);
            db.exec(createTable);   //如果当前数据库中不存在变量值tbName的表，则动态创建该表
            importTotal.tbs += 1;

            //如果是新建的表，则为新建的表在minDI(UDI条码DI)创建索引
            const isNewTb = crateIndexForDI(db, tbName);
            if (isNewTb) importTotal.newTbs += 1;

            //当前行数据
            let tbRows = dbTables[tbName];
            let requirRemoveRowsIndex = new Array();

            //在表中是否已经存在ID相同的记录
            let i = 0;
            for(let goods of tbRows) {
                //如果已经有该ID的记录，则更新该记录;
                const stmt = db.prepare(`SELECT ID, version FROM ${tbName} WHERE ID = ?`);
                const goodsRow = stmt.get(goods.ID);
                if (goodsRow != undefined) {
                    if (goods.version > goodsRow.version) {
                        //如果要导入的产品版本比数据为串已有记录的版本要大，则更新数据库中的记录
                        const updateSQL = updateSQLTmpl.replace(sqlTmplTableName, tbName)
                        const updata_stmt = db.prepare(updateSQL)
                        updata_stmt.run(goods);
                        importTotal.update += 1;
                    } else
                        importTotal.ignore += 1;

                    //在数据库表中存在的记录行都不能INSERT
                    requirRemoveRowsIndex.push(i);
                }
                i++;
            }
            //只要是已经存在的记录，则从当前的tbRows中移除该项，不再需要INSERT一条新的记录到数据库中
            let k = 0;
            for (const j of requirRemoveRowsIndex) {
                tbRows.splice(j - k, 1);
                k++;
            }

            if (tbRows.length > 0) {
                //余下的所有数据行都插入到各表中；
                let insertSql = insertSQLTmpl.replace(sqlTmplTableName, tbName);
                const insert = db.prepare(insertSql);
                const insertMany = db.transaction((cats) => {
                    for (const cat of cats) {
                        insert.run(cat);
                    }
                });
                insertMany(tbRows);
                importTotal.insert += tbRows.length;
            }
        }
    }

    return importTotal;
}

/**
 * 根据指定的DI获取对应的产品数据
 * @param udiDI 产品的DI
 * @param udiTypeKey UDI类型，目前支持"GS1"和"MA码（IDcode）"
 * @return {*|null}
 */
function getUDIData(udiDI, udiTypeKey) {
    const importLocate = extractDBAndTbName(udiDI, udiTypeKey);
    if (importLocate === null) return null;
    const dbName = importLocate.dbName;
    const tbName = importLocate.tbName;

    const dbFile = getDBPath(dbName);
    if (!fs.existsSync(dbFile)) return null;    //如果数据文件不存在，则返回NULL
    let db = null;
    try {
        db = new Database(dbFile);
    } catch (e) {
        logger.error(`Error retrieving data from database. The location of the data file is ${dbFile}, and db name is ${dbName}, table name is ${tbName}. err: ${e.message}。udiDI="${udiDI}", udiTypeKey="${udiTypeKey}"`);
        return null;
    }

    try {
        const stmt = db.prepare(`SELECT * FROM ${tbName} WHERE minDI = ?`);
        const goodsRow = stmt.get(udiDI);
        if (goodsRow != undefined) {
            return goodsRow;
        } else {
            //TODO: 如果是扫描的"使用单元产品标识"呢，要不要作处理？
            return null;
        }
    } catch (e) {
        logger.error(`Error retrieving data from table. The location of the data file is ${dbFile}, and db name is ${dbName}, table name is ${tbName}. err: ${e.message}。udiDI="${udiDI}", udiTypeKey="${udiTypeKey}"`);
        return null;
    }
}

/**
 * 根据产品条码DI, 插入或更新及查找操作时，找到其对应的数据库名及表名。
 * @param udiDI： udi码的DI部分
 * @param udiTypeKey udi码关键字：产品标识编码体系名称(目前支持"GS1"和"MA码（IDcode）"两种值)
 * @return Object
 */
function extractDBAndTbName(udiDI, udiTypeKey) {
    let ret = {dbName: '', tbName: ''};
    ret = null;

    const key = udiTypeKey.toLowerCase();

    if (key === myconfig.common.udiType.GS1.name.toLowerCase())
        ret = extractGS1DBAandTbName(udiDI);
    else if (myconfig.common.udiType.MA.name.toLowerCase().indexOf(key) > -1)
        ret = extractMADBAandTbName(udiDI);

    let isRetIsNull = false;
    if (ret == null) {
        isRetIsNull = true;
        ret = {};
    }

    ret.dataDBPath = isRetIsNull ? getDBPath() : getDBPath(ret.dbName).replace(ret.dbName, "");
    ret.sysDBPath = '';
    const sysDB = getSysDB();
    if (sysDB != null)
        ret.sysDBPath = sysDB.name;
    return ret;
}

/**
 * 解析GS1的DI码，确定指定GS1码的产品应存放的数据库名称和表名称.
 * GS1编码规则请见：《医疗器械唯一标识( UDI) 系统实施探讨》，https://udid.nmpa.gov.cn/attachments/attachment/download.html?path=4213183A94D948BA5BDE71683E61CA7B01221BE036C38AC813129E91585AA0E742222BBDEF7C489F8BAB06A3DEC62EB43C894EA0F8E5B40BFC00691ADDB03177BE9BC92CDCF34E5C
 * @param udiDI
 * @return Object: {dbName: '', tbName: ''}
 */
function extractGS1DBAandTbName(udiDI) {
    let returned = {dbName: '', tbName: ''};

    const GTNType = {noGTN: '00', GTN8: '08', GTN8Other: '10'}
    let GTNTypeValue = '';

    const dbPrefix = myconfig.common.udiType.GS1.dbPrefix;
    const tbPrefix = myconfig.common.importTbNamePrefix;
    let dbCode = '';
    let tbCode = '';

    //提取数据库名：
    if (udiDI.length < 14) {
        //不是规范的GTN编码，目前公布的官方UDI数据库没有，但如果有，则把这一类可能存在的产品统一存放在一个数据库"g_0"
        dbCode = '000'
        GTNTypeValue = GTNType.noGTN;
        tbCode = getFirstNotZeroChar(udiDI);
    } else {
        //N1: 包装代码，N2-N7：厂商代码，N8-N13：产品代码，N14：校验位
        if (udiDI.substring(1, 6) == '00000') {
            //GTN-8编码：取N6N7N8这三位为数据库名
            dbCode = udiDI.substring(5, 8);
            GTNTypeValue = GTNType.GTN8;
            tbCode = udiDI.substring(8, 9);
        } else {
            //GTN-12、13、14编码：取N2N3N4这三位为数据库名
            dbCode = udiDI.substring(1, 4) + '_' + udiDI.substring(4, 5);
            GTNTypeValue = GTNType.GTN8Other;
            tbCode = udiDI.substring(5, 7);
        }
    }

    let dbName = dbPrefix + GTNTypeValue + '_' + dbCode;
    let tbName = tbPrefix + tbCode;
    returned.dbName = dbName;
    returned.tbName = tbName;

    return returned;
}

/**
 * 解析MA制式的DI码，确定指定MA码的产品应存放的数据库名称和表名称.
 * MA码编码规则请见：《工信部医疗器械唯一标识 MA(IDcode)编码手册》，https://max.book118.com/html/2021/0126/5042333312003114.shtm
 * @param udiDI，如"MA.156.M0.100204.13351764"
 */
function extractMADBAandTbName(udiDI) {
    let returned = {dbName: '', tbName: ''};

    const dbPrefix = myconfig.common.udiType.MA.dbPrefix;
    const tbPrefix = myconfig.common.importTbNamePrefix;
    let dbCode = '';
    let tbCode = '';

    const maCodeObj = getMACodeObj(udiDI);

    if (maCodeObj && maCodeObj.issuerOfContry == maCodeObj.ISSUER_OF_CHINA) {
        //国内的编码：国内产品的MA码，如"MA.156.M0.100274.13360111"，放到数据库"m_1002" 表名"ud_7"
        dbCode = maCodeObj.registrant.substring(0, 4);
        tbCode = maCodeObj.registrant.substring(4, 5);
    } else {
        //按MA码编码规则，目前MA.156应该都是中国的编码，将此类编码以外的所有产品单独存放在一个数据库
        //国外的产品都统一放到数据库 m_000 中，存放的数据表是MA码的国家代码第1位，如"MB.234.M0.123456.01234567"编码生成的表名(国家代码为234)为：ud_2
        dbCode = '000';
        tbCode = maCodeObj == null ? '000' : maCodeObj.contry.substring(0, 1);
    }

    returned.dbName = `${dbPrefix}${dbCode}`;
    returned.tbName = `${tbPrefix}${tbCode}`;
    return returned;
}

/**
 * 获取MA码对象
 * @param maCode MA.156.M0.100204.13351764
 * @return {{trade: *, contry: *, ISSUER_OF_CHINA: string, registrant: *, goodsCode: string, issuer: *, issuerOfContry: string}}
 */
function getMACodeObj(maCode){
    return MA.getMACodeObj(maCode)
}

/**
 * 获取指定数据库名的数据库路径
 * @param dbname
 * @returns {*}
 */
function getDBPath(dbname) {
    return resolve(myconfig.common.dataPath + (dbname == null || dbname == undefined ? '' : dbname));
}

function getSysDB() {
    if (sysDB == null) {
        const sysFile = resolve(myconfig.common.sysDBPath, 'sys');
        if (!fs.existsSync(sysFile)) {
            logger.error(`Unable to find the "sys" db file in the specified path(${sysFile})`)
            return null;
        }
        sysDB = new Database(sysFile);
    }
    return sysDB;
}

/**
 * 为UDI数据库在指定的表tbName，在UDI码的DI列(minDI)上创建一个索引
 * @param sqliteDB
 * @param tbName
 * @return {boolean} 如果是新表，则需要创建一次索引，返回TRUE, 如果已经有该索引了，表示不是建的新表
 */
function crateIndexForDI(sqliteDB, tbName) {
    //如果是新建的表，则为新建的表在minDI(UDI条码DI)创建索引
    const indexName = `minDI_${tbName}_myIndex0`;
    const indexExistsSQL = `SELECT * FROM sqlite_master WHERE type='index' AND tbl_name = '${tbName}' AND name = '${indexName}';`
    const stmt = sqliteDB.prepare(indexExistsSQL);
    const indexRec = stmt.all();
    if (indexRec.length == 0) {
        const indexSQL = `CREATE INDEX "main"."${indexName}"
                              ON "${tbName}" ("minDI" COLLATE NOCASE ASC);`
        sqliteDB.exec(indexSQL);
        return true;
    } else {
        return false;
    }
}

/**
 * 清空导入记录
 */
function clearSysImptRecs() {
    const sysDB1 = getSysDB();
    if (sysDB1 == null) return;

    const del = sysDB1.prepare('DELETE FROM imptRec');
    del.run();
}

function isRequiredDownloadFile(fileName, zipMD5) {
    let requireImpt = false;
    //当前指定的filesFingerprint是否已经导入过，如果导入过，则不再执行导入
    if (zipMD5 !== undefined) {
        const stmt = getSysDB().prepare(`SELECT * FROM imptRec WHERE zipMD5 = ?`);
        const rec = stmt.get(zipMD5);
        if (rec == undefined)
            requireImpt = true;
    } else {
        requireImpt = true; //如果没有传入MD5值，则不检查该文件，直接导入
    }

    return requireImpt;
}

//=============================PRIVATE FUNCTION =================================
/**
 * 传入的数据文件名是否是有效的UDI数据库文件
 * @param dbFile
 */
function isUDIDBFile(dbFile) {
    for(const udiTypeKey in myconfig.common.udiType) {
        const dbPrefix = myconfig.common.udiType[udiTypeKey].dbPrefix;
        if (dbFile.indexOf(dbPrefix) == 0) return true;
    }
    return false;
}

/**
 * 获取字符串中第一个不是零的char
 * @param str
 * @return {string}
 */
function getFirstNotZeroChar(str) {
    let strAry = str.split('');

    let i = 0;
    for (const char of strAry) {
        if (char !== '0')
            break;
        i++;
    }

    return str.charAt(i);
}

//================================PRIVATE FUNCTION========================

module.exports = {
    importUDIDataToSourceTb: importUDIDataToSourceTb,
    importUDIDataToDB: importUDIFielsToDB,
    getDBPath: getDBPath,
    udiExcelFilesPath: myconfig.common.udiExcelFilesPath,
    createNewDB: createNewDB,
    crateIndexForDI: crateIndexForDI,
    isUDBFile: isUDIDBFile,
    isRequiredDownloadFile: isRequiredDownloadFile,
    getUDIData: getUDIData,
    clearSysImptRecs: clearSysImptRecs,

    //TODO： 以下只是为了单元测试，生产环境需要删除！！
    extractDBAndTbName: extractDBAndTbName,
    extractGS1DBAandTbName: extractGS1DBAandTbName,
    getFirstNotZeroChar: getFirstNotZeroChar,

    //MA码部分
    getMACodeObj: getMACodeObj,
    extractMADBAandTbName: extractMADBAandTbName
};
//要导入的数据库SQLite表Goods结构(./struct/g.stc文件中定义)与EXCEL文件中的UDI表结构映射
const uuXlsToUUDbTbMapper = {
    ID: '主键编号',
    version: '公开的版本号',
    vDate: '版本的发布时间',
    vStatus: '版本的状态',
    minDI: '最小销售单元产品标识',
    DIType: '产品标识编码体系名称',
    DIDate: '产品标识发布日期',
    minQty: '最小销售单元中使用单元的数量',
    usedDI: '使用单元产品标识',
    DIPrintType: '标识载体',
    withRegSame: '是否与注册/备案产品标识一致',
    regDI: '注册/备案产品标识',
    isSelfDI: '是否有本体标识',
    selfAndMinSame: '本体产品标识与最小销售单元产品标识一致',
    selfDI: '本体产品标识',
    proName: '产品名称/通用名称',
    goodsName: '商品名称',
    std: '规格型号',
    isPkg: '是否为包类/组套类产品',
    des: '产品描述',
    proCode: '产品货号或编号',
    stdCatCode: '原分类编码',
    medType: '器械类别',
    newStdCatCode: '分类编码',
    manuName: '医疗器械注册人/备案人名称',
    manuEn: '医疗器械注册人/备案人英文名称',
    orgUID: '统一社会信息代码',
    regCode: '注册证编号或者备案凭证编号',
    cat: '产品类别',
    mrSecInfo: '磁共振（MR）安全相关信息',
    isOneUsed: '是否标记为一次性使用',
    maxUsed: '最大重复使用次数',
    isAsePkg: '是否为无菌包装',
    isNeedAse: '使用前是否需要进行灭菌',
    aseType: '灭菌方式',
    otherInfoUrl: '其他信息的网址链接',
    ybhcCatCode: '医保耗材分类编码',
    DIHasLot: '生产标识是否包含批号',
    DIHasSerial: '生产标识是否包含序列号',
    DIHasManuDate: '生产标识是否包含生产日期',
    DIHasExp: '生产标识是否包含失效日期',
    saveEnv: '特殊储存或操作条件',
    sizeDes: '特殊尺寸说明',
    exitDate: '退市日期',
    DIStatus: '产品标识状态'
};

const  common = {
    //TODO：生产环境下，下面两变量值要更换
    //udiExcelFilesPath: '/Volumes/KingstonHyperX 1/UDIData/tmp/', //测试用：要导入的UDI-EXCEL文件存放目录
    //dataPath: '/Volumes/KingstonHyperX 1/UDIData/db/',   //测试用：导入的SQLite数据库目录
    udiExcelFilesPath: './data/tmp/', //生产环境：要导入的UDI-EXCEL文件存放目录
    dataPath: './data/db/',   //生产环境：导入的SQLite数据库目录

    udiExcelFileExt: '.xlsx',    //要导入的UDI-EXCEL文件扩展名

    importSourceDbName: 'uu_source_db', //UDI-EXCEL导进的原始数据库名
    importSourceTbName: 'uu_source',    //UDI-EXCEL导进的原始数据表名
    udiTableStructFilePath: './assets/struct/g.stc',    //UDI数据表SQL结构语句
    importSourceTbSQLV: "${TbName}",    //UDI数据表结构定义文件./struct/g.stc中的表变量字符串
    importTbNamePrefix: 'ud_',          //UDI数据导入SQLite动态生成的表名前缀

    imptFileColName: 'imptFile', //上面的原始导入表的imptFile列名，存储导入此条数据的EXCEL文件名

    //udi码类型，目前支持"GS1"和"MA码（IDcode）"两种值，此值必须与UDI-EXCEL表的"产品标识编码体系名称"列完全一致)
    udiType: {
        GS1: {name: 'GS1',           dbPrefix: 'g_'},
        MA:  {name: 'MA码（IDcode）', dbPrefix: 'm_'}}
};

//exports.uuXlsToUUDbTbMapper = uuXlsToUUDbTbMapper;
//exports.common = common
module.exports.uuXlsToUUDbTbMapper = uuXlsToUUDbTbMapper;
module.exports.common = common;
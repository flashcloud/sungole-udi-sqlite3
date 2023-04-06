const cheerio = require('cheerio');
const superagent = require('superagent');

/**
 * 用 superagent 去抓取 国家药监局官网上的"医疗器械唯一标识数据库"的页面内容
 * @param callback
 */
function extractDownloadFileLinks(callback) {
    superagent.get('https://udi.nmpa.gov.cn/download.html')
        .end(function (err, sres) {
            // 常规的错误处理
            if (err) {
                return next(err);
            }
            // sres.text 里面存储着网页的 html 内容，将它传给 cheerio.load 之后
            // 就可以得到一个实现了 jquery 接口的变量，我们习惯性地将它命名为 `$`
            // 剩下就都是 jquery 的内容了
            const $ = cheerio.load(sres.text);
            let $fileGroup = $('.els-down-con-info');
            let sortedFileGroup = $fileGroup.toArray().reverse();   //从最早的数据开始导入
            let files = [];

            for (const fileEl of sortedFileGroup) {
                const $fleEl = $(fileEl);
                let fileInfo = {
                    fileUrl: '', fileName: '', createDate: '', goodsQty: 0, size: 0, md5: ''
                };
                //1：文件下载链接及文件名
                const $downFile = $($fleEl.children()[0]);
                fileInfo.fileUrl = $downFile.attr('href');
                fileInfo.fileName = $downFile.attr('download');

                //文件信息组Div
                const $fileDiv = $($fleEl.children()[1]);

                //2:其他文件信息
                fileInfo.createDate = $($fileDiv.children()[1]).text();
                fileInfo.goodsQty = $($fileDiv.children()[3]).text();
                fileInfo.size = $($fileDiv.children()[5]).text();

                //md5Div
                const $md5Div = $($fleEl.children()[2]);

                //3:文件MD5
                fileInfo.md5 = $($md5Div.children()[1]).text();

                //对结构进行验证，以免该网站的结构发生变化
                const md5NotExists = fileInfo.md5 == '' || fileInfo.md5 == undefined || fileInfo.md5 == null;
                //TODO:记录到日志
                if (fileInfo.fileName.indexOf('.zip') > 0 && fileInfo.fileUrl.indexOf('https://udid.nmpa.gov.cn/') > -1 && !md5NotExists) {
                    //添加到文件数组
                    files.push(fileInfo);
                }
            }

            callback(files);
        });
}

module.exports = {
    extractDownloadFileLinks: extractDownloadFileLinks
}

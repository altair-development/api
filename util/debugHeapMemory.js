/* 
*  ヒープメモリ調査用関数（強制ガベージ・メモリサイズログ・ヒープダンプ）
*  デフォルト設定で全て実行              : node --expose-gc app --checkHeap
*  強制ガベージコレクションの実行なし     : node --expose-gc app --checkHeap --noGc
*  ヒープメモリサイズのログ取得無し       : node --expose-gc app --checkHeap --noMemorySizeLog
*  ヒープダンプファイルの取得無し         : node --expose-gc app --checkHeap --noHeapdump
*  強制ガベージコレクションの実行間隔(ms) : node --expose-gc app --checkHeap --delayGc=1000
*  ヒープメモリサイズのログ取得間隔(ms)   : node --expose-gc app --checkHeap --delayMemorySizeLog=1000
*  ヒープダンプファイルの保存ディレクトリ  : node --expose-gc app --checkHeap --dirHeapDump=C:\dev\altair-leaky\heapdump
*  メモリサイズログはコンソールに出力されるので、
*  ファイルに出力したい場合は node --expose-gc app --checkHeap > heapsize.txt とかにする
*/
const heapdump = require('heapdump');

module.exports = () => {
    if (global.argv.checkHeap) {
        function executeGC() {
            try {
                global.gc();
            } catch (e) {
                console.log('You have to run this program as `node --expose-gc app.js`');
                process.exit();
            }
        }
        function checkMemory() {
            const now = Date.now();

            if (!global.argv.noMemorySizeLog) {
                const heapUsed = process.memoryUsage().heapUsed;
                console.log(now + ': ', heapUsed);
            }
            
            if (!global.argv.noHeapdump) heapdump.writeSnapshot(global.argv.dirHeapDump + '/' + now + '.heapsnapshot');
        }
        switch (true) {
            case !global.argv.noGc:
                setInterval(executeGC, global.argv.delayGc);
            case !global.argv.noMemorySizeLog || !global.argv.noHeapdump:
                setInterval(checkMemory, global.argv.delayMemorySizeLog);
        }
    }
};
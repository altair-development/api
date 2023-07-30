const mongoose = require('mongoose'),
      Schema = mongoose.Schema;

const ProjectWatcherHistoryInstance = Schema({
    history_id: {
        type: Schema.Types.ObjectId,
        ref: 'TicketHistory'
    },
    dml: {
        type: String,
        default: null
    },
    created: Date,
    modified: {
        type: Date,
        default: function(){
            // 新規作成時はcreatedの値
            // それ以外は現在時刻
            if(this.created) return this.created;
            const date = new Date;
            return date.setTime(date.getTime() + 1000*60*60*9);
        }
    }
}, {
    collection: 'project_watcher_histories',
    read: 'nearest',
    writeConcern: {
        w: 'majority',
        j: true
    }
});

/* 
*  ウォッチャー履歴情報を新規登録する
*  @param1 data      リクエストデータ                       object
*  @param2 sessionDb トランザクション用セッションオブジェクト object
*  @return 登録情報
*/
ProjectWatcherHistoryInstance.statics.saveData = function (data, sessionDb) {
    return new Promise((resolve, reject) => {
        this.create(data, { session: sessionDb })
            .then(watchers => {
                // 保存成功
                resolve(watchers);
            })
            .catch(err => {
                // エラーがあれば失敗
                reject(err);
            });
    });
};

module.exports = mongoose.model('ProjectWatcherHistoryInstance', ProjectWatcherHistoryInstance)

const mongoose = require('mongoose'),
      Schema = mongoose.Schema;

const TicketWatcherHistoryInstance = Schema({
    history_id: {
        type: Schema.Types.ObjectId,
        ref: 'TicketHistory'
    },
    clan_id: {
        type: Schema.Types.ObjectId,
        ref: 'Clan'
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
    collection: 'ticket_watcher_histories',
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
TicketWatcherHistoryInstance.statics.saveData = function (data, sessionDb) {
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

/* 
*  チケット履歴に登録されたウォッチャーを取得する
*  @param1 historyId  チケット履歴ID
*  @param1 sessionDb セッションオブジェクト
*  @return クランごとのウォッチャー情報をもつオブジェクト
*/
TicketWatcherHistoryInstance.statics.list = function (historyId, sessionDb) {
    return new Promise((resolve, reject) => {
        let conditions = {
            history_id: historyId
        };
        const findWatcherHistoriesObj = sessionDb ? this.find(conditions).session(sessionDb).read('primary') : this.find(conditions);

        findWatcherHistoriesObj
            .exec()
            .then(watcherHistory => {
                let tmpWatcherHistory = {};
                if (watcherHistory.length > 0) {
                    let clanId = watcherHistory[0].clan_id;
                    tmpWatcherHistory[clanId] = {
                        dml: watcherHistory[0].dml
                    };
                }
                resolve(tmpWatcherHistory);
            })
            .catch(err => {
                reject(err);
            });
    });
}

module.exports = mongoose.model('TicketWatcherHistoryInstance', TicketWatcherHistoryInstance)

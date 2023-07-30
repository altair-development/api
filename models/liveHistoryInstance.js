const mongoose = require('mongoose'),
      Schema = mongoose.Schema;

const LiveHistoryInstance = Schema({
    history_id: {
        type: Schema.Types.ObjectId,
        ref: 'TicketHistory'
    },
    clan_id: {
        type: Schema.Types.ObjectId,
        ref: 'Clan'
    },
    live: {
        type: Number,
        default: null
    },
    live_url: {
        type: String,
        default: null
    },
    created: Date,
    modified: {
        type: Date,
        default: function(){
            // 新規作成時はcreatedの値
            if(this.created) return this.created;
            const date = new Date;
            return date.setTime(date.getTime() + 1000*60*60*9);
        }
    }
}, {
    collection: 'live_histories',
    read: 'nearest',
    writeConcern: {
        w: 'majority',
        j: true
    }
});

/* 
*  配信可否履歴情報を新規登録する
*  @param1 data      リクエストデータ                       object
*  @param2 sessionDb トランザクション用セッションオブジェクト object
*  @return 登録情報
*/
LiveHistoryInstance.statics.saveData = function (data, sessionDb) {
    return new Promise((resolve, reject) => {
        this.create(data, { session: sessionDb })
            .then(live => {
                // 保存成功
                resolve(live);
            })
            .catch(err => {
                // エラーがあれば失敗
                reject(err);
            });
    });
};

/* 
*  チケット履歴に登録された配信可否情報を取得する
*  @param1 ticketId  チケット履歴ID
*  @param1 sessionDb セッションオブジェクト
*  @return クランごとの配信可否情報をもつオブジェクト
*/
LiveHistoryInstance.statics.list = function (historyId, sessionDb) {
    return new Promise((resolve, reject) => {
        let conditions = {
            history_id: historyId
        };
        const findLiveHistoriesObj = sessionDb ? this.find(conditions).session(sessionDb).read('primary') : this.find(conditions);

        findLiveHistoriesObj
            .exec()
            .then(liveHistories => {
                let clanId = null;
                let tmpLiveHistories = {};
                for (let idx in liveHistories) {
                    clanId = liveHistories[idx].clan_id;
                    tmpLiveHistories[clanId] = {
                        live: liveHistories[idx].live,
                        live_url: liveHistories[idx].live_url
                    };
                }
                resolve(tmpLiveHistories);
            })
            .catch(err => {
                reject(err);
            });
    });
}

module.exports = mongoose.model('LiveHistory', LiveHistoryInstance)

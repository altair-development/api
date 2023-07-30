const mongoose = require('mongoose'),
      Schema = mongoose.Schema;

const EntryMemberHistoryInstance = Schema({
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
    collection: 'entry_member_histories',
    read: 'nearest',
    writeConcern: {
        w: 'majority',
        j: true
    }
});

/* 
*  参加メンバー履歴情報を新規登録する
*  @param1 data      リクエストデータ                       object
*  @param2 sessionDb トランザクション用セッションオブジェクト object
*  @return 登録情報
*/
EntryMemberHistoryInstance.statics.saveData = function (data, sessionDb) {
    return new Promise((resolve, reject) => {
        this.create(data, { session: sessionDb })
            .then(entryMembers => {
                // 保存成功
                resolve(entryMembers);
            })
            .catch(err => {
                // エラーがあれば失敗
                reject(err);
            });
    });
};

/* 
*  チケット履歴に登録された参加メンバーを取得する
*  @param1 ticketId  チケット履歴ID
*  @param1 sessionDb セッションオブジェクト
*  @return クランごとの参加メンバー情報をもつオブジェクト
*/
EntryMemberHistoryInstance.statics.list = function (historyId, sessionDb) {
    return new Promise((resolve, reject) => {
        let conditions = {
            history_id: historyId
        };
        const findEntryMemberHistoriesObj = sessionDb ? this.find(conditions).session(sessionDb).read('primary') : this.find(conditions);

        findEntryMemberHistoriesObj
            .exec()
            .then(entryMemberHistory => {
                let tmpEntryMemberHistory = {};
                if (entryMemberHistory.length > 0) {
                    let clanId = entryMemberHistory[0].clan_id;
                    tmpEntryMemberHistory[clanId] = {
                        dml: entryMemberHistory[0].dml
                    };
                }
                resolve(tmpEntryMemberHistory);
            })
            .catch(err => {
                reject(err);
            });
    });
}

module.exports = mongoose.model('EntryMemberHistory', EntryMemberHistoryInstance)

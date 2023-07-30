const mongoose = require('mongoose'),
      Schema = mongoose.Schema,
      async = require('async'),
      constant = require('../config/constant'),
      memberInstance = require('./memberInstance.js');

const TicketWatcherInstance = Schema({
    ticket_id: {
        type: Schema.Types.ObjectId,
        ref: 'Ticket'
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    clan_id: {
        type: Schema.Types.ObjectId,
        ref: 'Clan'
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
    collection: 'ticket_watchers',
    read: 'nearest',
    writeConcern: {
        w: 'majority',
        j: true
    }
});

/* 
*  チケット情報の新規作成時のバリデーションを行う
*  @param1 data    リクエストデータ array
*  @return 登録情報
*/
TicketWatcherInstance.statics.validateCr = function (data) {
    return new Promise( async (resolve, reject) => {
        try {
            for (let idx in data) {
                const watcher = data[idx];
                const userId = watcher.user_id;

                // ユーザー必須
                if (!userId) throw new Error('invalid userId');

                // メンバーの存在確認
                const conditions = {
                    clan_id: watcher.clan_id,
                    user_id: userId,
                    agreement: constant.FLG_YES
                }

                let member = await memberInstance.findOne(conditions);
                if (!member) throw new Error('invalid userId');
            }
            resolve();
        }
        catch (err) {
            // エラー発生
            reject(err);
        }
    });
};

/* 
*  ウォッチャーリストを新規登録する
*  @param1 data      リクエストデータ                       object
*  @param2 sessionDb トランザクション用セッションオブジェクト object
*  @return 登録情報
*/
TicketWatcherInstance.statics.saveData = function (data, sessionDb) {
    return new Promise((resolve, reject) => {
        try {
            async.waterfall([
                callback => {
                    // メンバーの存在確認
                    this.validateCr(data)
                        .then(() => {
                            callback(null, true);
                        })
                        .catch(err => {
                            callback(err);
                        });
                },
                (bool, callback) => {
                    try{
                        // 保存処理
                        this.create(data, { session: sessionDb })
                        .then(watcher => {
                            // 保存成功
                            callback(null, watcher);
                        })
                        .catch(err => {
                            // エラーがあれば失敗
                            callback(err);
                        });
                    }
                    catch(err){
                        // エラー発生
                        callback(err);
                    }
                }
            ], (err, result) => {
                if(err){ // 保存失敗
                    reject(err);
                }else{ // 保存成功
                    resolve(result);
                }
            });
        }
        catch(err) {
            reject(err);
        }
    });
};

/* 
*  ウォッチャーを1件削除する
*  @param1 data      リクエストデータ                       object
*  @param2 sessionDb トランザクション用セッションオブジェクト object
*  @return 登録情報
*/
TicketWatcherInstance.statics.deleteOne = function (data, sessionDb) {
    return new Promise((resolve, reject) => {
        try {
            async.waterfall([
                callback => {
                    // メンバーの存在確認
                    this.validateCr(data)
                        .then(() => {
                            callback(null, true);
                        })
                        .catch(err => {
                            callback(err);
                        });
                },
                (bool, callback) => {
                    try {
                        // 削除対象データを検索
                        const conditions = {
                            ticket_id: data[0].ticket_id,
                            clan_id: data[0].clan_id,
                            user_id: data[0].user_id
                        };
    
                        this.findOne(conditions)
                            .session(sessionDb)
                            .read('primary')
                            .exec()
                            .then(watcher => {
                                // 存在しなければエラー
                                if (!watcher) throw new Error('未登録のウォッチャーです。');
                                callback(null, watcher);
                            })
                            .catch(err => {
                                // DBエラー
                                callback(err);
                            });
                    }
                    catch (err) {
                        // エラー発生
                        callback(err);
                    }
                },
                (watcher, callback) => {
                    try {
                        // ウォッチャーを削除
                        watcher.remove()
                            .then(watcher => {
                                callback(null, watcher);
                            })
                            .catch(err => {
                                // DBエラー
                                callback(err);
                            });
                    }
                    catch (err) {
                        // エラー発生
                        callback(err);
                    }
                }
            ], (err, result) => {
                if(err){ // 保存失敗
                    reject(err);
                }else{ // 保存成功
                    resolve(result);
                }
            });
        }
        catch(err) {
            reject(err);
        }
    });
};

/* 
*  チケットに登録されたウォッチャーを取得する
*  @param1 ticketId  チケットID
*  @param1 sessionDb セッションオブジェクト
*  @return クランごとのウォッチャー情報をもつオブジェクト
*/
TicketWatcherInstance.statics.list = function (ticketId, sessionDb) {
    return new Promise((resolve, reject) => {
        try {
            const findObj = sessionDb ? this.getAggList(ticketId).session(sessionDb).read('primary') : this.getAggList(ticketId);
    
            findObj
                .then(watchers => {
                    let clanId = null;
                    let tmpWatchers = {};
                    for (let idx in watchers) {
                        let watcher = watchers[idx];
                        // オブジェクト展開をする
                        watcher = this.unwindObj(watcher);
                        clanId = watchers[idx].clan_id;
                        delete watcher.clan_id;
                        if (Object.keys(tmpWatchers).indexOf(clanId + '') === -1) {
                            tmpWatchers[clanId] = [];
                        }
                        tmpWatchers[clanId].push(watcher);
                    }
                    resolve(tmpWatchers);
                })
                .catch(err => {
                    reject(err);
                });
        }
        catch (err) {
            reject(err);
        }
    });
}

/* 
*  集計用インスタンスを返す
*  @return 登録情報
*/
TicketWatcherInstance.statics.getAggList = function (ticketId) {
    const conditions = {
        ticket_id: ticketId
    };
    const projections = [
        '-_id',
        'clan_id',
        'user_id._id',
        'user_id.name'
    ].join(' ');

    return this.aggregate()
        .match(conditions)
        .lookup({
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user_id'
        })
        .project(projections)
        .unwind('user_id');
}

module.exports = mongoose.model('TicketWatcherInstance', TicketWatcherInstance)

const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    async = require('async'),
    constant = require('../config/constant'),
    utils = require('./utils'),
    projectWatcherHistoryInstance = require('./projectWatcherHistoryInstance.js');

const ProjectHistoryInstance = Schema({
    project_id: {
        type: Schema.Types.ObjectId,
        ref: 'Project'
    },
    name: String,
    clan_id: {
        type: Schema.Types.ObjectId,
        ref: 'Clan'
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    writer: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    start_date: {
        type: String
    },
    end_date: {
        type: String
    },
    deleted: {
        type: Number
    },
    created: Date,
    modified: {
        type: Date,
        default: function () {
            // 新規作成時はcreatedの値
            return this.created;
        }
    }
}, {
    collection: 'project_histories',
    read: 'nearest',
    writeConcern: {
        w: 'majority',
        j: true
    }
});

/* 
*  プロジェクト履歴を登録する
*  @param1 data      リクエストデータ                       object
*  @param2 sessionDb トランザクション用セッションオブジェクト object
*  @return 登録情報
*/
ProjectHistoryInstance.statics.saveData = function (data, sessionDb) {
    return new Promise((resolve, reject) => {
        async.waterfall([
            callback => {
                try {
                    // 保存処理
                    this.create([data.common], { session: sessionDb })
                        .then(project => {
                            // 保存成功
                            callback(null, project[0].id);
                        })
                        .catch(err => {
                            // エラーがあれば失敗
                            callback(err);
                        });
                }
                catch (err) {
                    // エラー発生
                    callback(err);
                }
            },
            (historyId, callback) => {
                try {
                    // ウォッチャーヒストリの作成
                    const watcherHistories = data.watcherHistories;
                    for (let idx in watcherHistories) {
                        watcherHistories[idx].history_id = historyId;
                    }

                    if (watcherHistories.length === 0) return callback(null, historyId);

                    projectWatcherHistoryInstance.saveData(watcherHistories, sessionDb)
                        .then(watcher => {
                            callback(null, historyId);
                        })
                        .catch(err => {
                            callback(err);
                        });
                }
                catch (err) {
                    // エラー発生
                    callback(err);
                }
            }
        ], (err, historyId) => {
            if (err) {
                // 保存失敗
                reject(err);
            } else {
                // 保存成功
                resolve(historyId);
            }
        });
    });
};

/* 
*  履歴IDをキーにして全件取得する
*  結果が空でもそのまま返す
*  @param1 ticketId  チケットID            string
*  @param2 sessionDb セッションオブジェクト object
*  @param3 object    検索結果
*/
ProjectHistoryInstance.statics.list = function (projectId, sessionDb) {
    return new Promise((resolve, reject) => {
        try {
            const conditions = {
                project_id: projectId,
                deleted: null
            };
            const findObj = sessionDb ? this.getAggList(conditions).session(sessionDb).read('primary') : this.getAggList(conditions);
            findObj
                .then( async histories => {
                    let tmpHistory = {};
                    for (let idx in histories) {
                        // オブジェクト展開をする
                        const history = this.unwindObj(histories[idx], [constant.TBL_MATCH, constant.TBL_WORK, constant.TBL_NOTIFICATE]);
                        const historyId = history._id;
                        delete history._id;
    
                        tmpHistory[historyId] = history;
                    }
                    resolve(tmpHistory);
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
ProjectHistoryInstance.statics.getAggList = function (conditions) {
    const projections = [
        '_id',
        'name',
        'clan_id._id',
        'clan_id.name',
        'author._id',
        'author.name',
        'writer._id',
        'writer.name',
        'start_date',
        'end_date',
        'created',
        'modified'
    ].join(' ');
    const projections2 = [
        'clan_id.user_id',
    ].join(' ');
    const projections3 = [
        'clan_id.user_id._id',
        'clan_id.user_id.name',
    ].join(' ');

    return this.aggregate()
        .match(conditions)
        .lookup({
            from: 'clans',
            localField: 'clan_id',
            foreignField: '_id',
            as: 'clan_id'
        })
        .lookup({
            from: 'users',
            localField: 'author',
            foreignField: '_id',
            as: 'author'
        })
        .lookup({
            from: 'users',
            localField: 'writer',
            foreignField: '_id',
            as: 'writer'
        })
        .project([projections, projections2].join(' '))
        .unwind({
            path: '$clan_id',
            preserveNullAndEmptyArrays: true
        })
        .unwind({
            path: '$author',
            preserveNullAndEmptyArrays: true
        })
        .unwind({
            path: '$writer',
            preserveNullAndEmptyArrays: true
        })
        .lookup({
            from: 'users',
            localField: 'clan_id.user_id',
            foreignField: '_id',
            as: 'clan_id.user_id'
        })
        .project([projections, projections3].join(' '))
        .unwind({
            path: '$clan_id.user_id',
            preserveNullAndEmptyArrays: true
        });
}

module.exports = mongoose.model('ProjectHistory', ProjectHistoryInstance)

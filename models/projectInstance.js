const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    async = require('async'),
    constant = require('../config/constant'),
    utils = require('./utils'),
    ticketInstance = require('./ticketInstance.js'),
    projectHistoryInstance = require('./projectHistoryInstance.js'),
    projectWatcherInstance = require('./projectWatcherInstance.js');

const ProjectInstance = Schema({
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
        type: Date,
        default: ''
    },
    end_date: {
        type: Date,
        default: ''
    },
    deleted: {
        type: Number,
        default: 0
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
    read: 'nearest',
    writeConcern: {
        w: 'majority',
        j: true
    }
});

/* 
*  クランIDのバリデーションを行う
*  @param1 clanId クランID      string       
*  @param2 authId ログインユーザ string
*  return  bool    判定結果
*/
ProjectInstance.statics.validateClanId = function (clanId, authId) {
    return new Promise((resolve, reject) => {
        // 値必須
        if (!clanId) return reject(new Error('invalid clanId'));
        // ユーザーが保有・所属するクランか
        this.isBelongToClanId(clanId, authId)
            .then(bool => {
                if (!bool) {
                    throw new Error('invalid clanId');
                } else {
                    resolve();
                }
            })
            .catch(err => {
                // エラー発生
                reject(err);
            });
    });
};

/* 
*  チケット情報の新規作成時のバリデーションを行う
*  @param1 data    対象データ object       
*  @param2 tracker トラッカー int
*  return  bool    判定結果
*/
ProjectInstance.statics.validateCr = function (data, authId) {
    return new Promise((resolve, reject) => {
        try {
            const clanId = data.clan_id;
            const patternDate = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
            const patternTitle = /^[^\x00-\x1F\x7F-\x9F]{0,255}$/;
            async.parallel({
                name: callback => {
                    // 制御文字以外
                    // 255文字以下
                    if (!data.name.match(patternTitle)) {
                        callback(new Error('invalid name'));
                    } else {
                        callback(null, true);
                    }
                },
                clanId: callback => {
                    // ユーザーが保有するクランかどうか
                    this.validateClanId(clanId, authId)
                        .then(() => {
                            callback(null, true);
                        })
                        .catch(err => {
                            // エラー発生
                            callback(err);
                        });
                },
                startDate: callback => {
                    const startDate = data.start_date;
                    // yyyy-mm-dd
                    if (startDate === '' || startDate.match(patternDate) != null) {
                        return callback(null, true);
                    }
                    // エラー発生
                    callback(new Error('invalid startDate'));
                },
                endDate: callback => {
                    const endDate = data.end_date;
                    // yyyy-mm-dd
                    if (endDate === '' || endDate.match(patternDate) != null) {
                        // 開始日以降か
                        if (data.start_date === '' || data.start_date <= endDate) {
                            return callback(null, true);
                        }
                    }
                    // エラー発生
                    callback(new Error('invalid endDate'));
                }
            }, (err, result) => {
                if (err) {
                    // エラー発生
                    reject(err);
                } else {
                    resolve();
                }
            });
        }
        catch (err) {
            // エラー発生
            reject(err);
        }
    });
};

/* 
*  プロジェクトを新規登録する
*  @param1 data      リクエストデータ                       object
*  @param1 authId    ログインユーザID                       object
*  @param2 sessionDb トランザクション用セッションオブジェクト object
*  @return 登録情報
*/
ProjectInstance.statics.saveData = function (data, authId, sessionDb) {
    return new Promise((resolve, reject) => {
        // 保存データの作成
        async.waterfall([
            callback => {
                try {
                    // バリデーション
                    this.validateCr(data.common, authId)
                        .then(() => {
                            callback(null, true);
                        })
                        .catch(err => {
                            // バリデーション失敗
                            callback(err);
                        });
                }
                catch (err) {
                    // エラー発生
                    callback(err);
                }
            },
            (bool, callback) => {
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
            (projectId, callback) => {
                try {
                    // ウォッチャーの保存
                    const watchers = data.watchers;

                    if (watchers.length === 0) return callback(null, projectId);

                    for (let idx in watchers) {
                        watchers[idx].project_id = projectId;
                    }
                    projectWatcherInstance.saveData(data.common.clan_id, watchers, sessionDb)
                        .then(watcher => {
                            callback(null, projectId);
                        })
                        .catch(err => {
                            callback(err);
                        });
                }
                catch (e) {
                    callback(err);
                }
            }
        ], (err, projectId) => {
            if (err) {
                // 保存失敗
                reject(err);
            } else {
                // 保存成功
                resolve(projectId);
            }
        });
    });
};

/* 
*  _idをキーにして取得する
*  結果が空でもそのまま返す
*  @param1 ticketId  チケットID            string
*  @param2 sessionDb セッションオブジェクト object
*  @param3 object    検索結果
*/
ProjectInstance.statics.list = function (clanId, projectId, sessionDb) {
    return new Promise((resolve, reject) => {
        let list = {};

        // プロジェクトを1件検索する関数を定義
        const getList = (id, list, sessionDb) => {
            return new Promise((resolve2, reject2) => {
                async.parallel({
                    info: callback => {
                        this.findInfo(id, sessionDb)
                            .then(info => {
                                callback(null, info);
                            })
                            .catch(err => {
                                callback(err);
                            });
                    },
                    tickets: callback => {
                        ticketInstance.getAllList(id, null, sessionDb)
                            .then(list => {
                                callback(null, list);
                            })
                            .catch(err => {
                                callback(err);
                            });
                    },
                    histories: callback => {
                        projectHistoryInstance.list(id, sessionDb)
                            .then(list => {
                                callback(null, list);
                            })
                            .catch(err => {
                                callback(err);
                            });
                    }
                }, (err, result) => {
                    if (err) {
                        reject2(err);
                    } else {
                        list[id] = {};
                        list[id].info = result.info;
                        list[id].tickets = result.tickets;
                        list[id].histories = result.histories;
                        resolve2();
                    }
                });
            });
        };

        if (projectId) {
            projectId = mongoose.Types.ObjectId(projectId);
            getList(projectId, list, sessionDb)
                .then(result => {
                    resolve(list);
                })
                .catch(err => {
                    reject(err);
                });
        } else {
            const conditions = {
                clan_id: clanId
            };
            this.find(conditions, '_id')
                .then(async projects => {
                    if (projects.length > 0) {
                        for (let idx in projects) {
                            await getList(projects[idx]._id, list);
                        }
                    }
                    resolve(list);
                })
                .catch(err => {
                    reject(err);
                });
        }
    });
}

/* 
*  履歴IDをキーにして全件取得する
*  結果が空でもそのまま返す
*  @param1 ticketId  チケットID            string
*  @param2 sessionDb セッションオブジェクト object
*  @param3 object    検索結果
*/
ProjectInstance.statics.findInfo = function (projectId, sessionDb) {
    return new Promise((resolve, reject) => {
        try {
            const conditions = {
                _id: projectId,
                deleted: constant.FLG_NO
            };
            const findObj = sessionDb ? this.getAggList(conditions).session(sessionDb).read('primary') : this.getAggList(conditions);
            findObj
                .then( async project => {
                    // オブジェクト展開をする
                    const info = this.unwindObj(project[0]);
                    resolve(info);
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
ProjectInstance.statics.getAggList = function (conditions) {
    const projections = [
        '-_id',
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

module.exports = mongoose.model('Project', ProjectInstance)

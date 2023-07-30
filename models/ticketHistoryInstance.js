const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    async = require('async'),
    constant = require('../config/constant'),
    ticketWatcherHistoryInstance = require('./ticketWatcherHistoryInstance.js'),
    entryMemberHistoryInstance = require('./entryMemberHistoryInstance.js'),
    liveHistoryInstance = require('./liveHistoryInstance.js');

const TicketHistoryInstance = Schema({
    id: {
        type: String,
        default: function () {
            return this._id;
        }
    },
    clan_id: {
        type: Schema.Types.ObjectId,
        ref: 'Clan'
    },
    project_id: {
        type: Schema.Types.ObjectId,
        ref: 'Project'
    },
    writer_clan: {
        type: Schema.Types.ObjectId,
        ref: 'Clan'
    },
    ticket_id: {
        type: Schema.Types.ObjectId,
        ref: 'Ticket'
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    writer: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    limit_date: {
        type: String
    },
    shoulder: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    tracker: {
        type: String
    },
    status: {
        type: String
    },
    description: {
        type: String
    },
    start_date: {
        type: String
    },
    end_date: {
        type: String
    },
    fight_tickets: {},
    work_tickets: {},
    notification_tickets: {},
    created: Date,
    modified: {
        type: Date,
        default: function () {
            // 新規作成時はcreatedの値
            return this.created;
        }
    }
}, {
    collection: 'ticket_histories',
    read: 'nearest',
    writeConcern: {
        w: 'majority',
        j: true
    }
});

/* 
*  チケットを新規登録する（チケット更新時）
*  @param1 data      リクエストデータ                       object
*  @param2 tracker   トラッカー object                      int
*  @param3 authId    ログインユーザID                       string
*  @param4 sessionDb トランザクション用セッションオブジェクト object
*  @return 登録情報
*/
TicketHistoryInstance.statics.updateData = function (data, tracker, authId, sessionDb) {
    return new Promise( async (resolve, reject) => {
        try {
            // データ更新
            const fightTickets = data['fight_tickets'];
            const workTickets = data['work_tickets'];
            const notificationTickets = data['notification_tickets'];
            const created = data['modified'];
            let upData = {
                common: {},
                watcherHistories: [],
                entryMemberHistories:[],
                liveHistories:[]
            };

            upData.common.writer = authId;
            upData.common.tracker = data['tracker'];
            upData.common.ticket_id = data['ticket_id'];
            upData.common.writer_clan = data['clan_id'];
            upData.common.created = created;
            if (data['start_date'] || data['start_date'] === '') {
                upData.common.start_date = data['start_date'] ? data['start_date'] : constant.date_blank;
                upData.common.end_date = data['end_date'] ? data['end_date'] : constant.date_blank;
            } else if (data['limit_date']) {
                upData.common.limit_date = data['limit_date'] ? data['limit_date'] : constant.date_blank;
            } else if (data['status']) {
                upData.common.status = data['status'];
                if (fightTickets) {
                    isDraw = fightTickets['draw'] > 0;
                    upData.common.fight_tickets = {};
                    upData.common.fight_tickets.winner = isDraw ? null : mongoose.Types.ObjectId(fightTickets['winner']);
                    upData.common.fight_tickets.loser = isDraw ? null : mongoose.Types.ObjectId(fightTickets['loser']);
                    upData.common.fight_tickets.draw = isDraw ? 1 : 0;
                }
            } else if (data['shoulder']) {
                upData.common.shoulder = data['shoulder'];
            } else if (fightTickets && fightTickets['play_title']) {
                upData.common.fight_tickets = {};
                upData.common.fight_tickets.play_title = mongoose.Types.ObjectId(fightTickets['play_title']);
            } else if (data['description'] || (data['description'] === '')) {
                upData.common.description = data['description'];
            } else if (workTickets) {
                upData.common.work_tickets = {};
                if (workTickets['progress_rate']) {
                    upData.common.work_tickets.progress_rate = workTickets['progress_rate'];
                } else if (workTickets['title']) {
                    upData.common.work_tickets.title = workTickets['title'];
                }
            } else if (notificationTickets && notificationTickets['title']) {
                upData.common.notification_tickets = {};
                upData.common.notification_tickets.title = notificationTickets['title'];
            } else if (data['watchers']) {
                upData.watcherHistories = [
                    {
                        clan_id: data['clan_id'],
                        dml: 'i',
                        created: created
                    }
                ];
            } else if (data['entry_members']) {
                upData.entryMemberHistories = [
                    {
                        clan_id: data['clan_id'],
                        dml: 'i',
                        created: created
                    }
                ];
            } else if (data['lives']) {
                upData.liveHistories = data['lives'];
                upData.liveHistories[0]['clan_id'] = data['clan_id'];
                upData.liveHistories[0]['created'] = created;
            }

            this.saveData(upData, tracker, sessionDb)
                .then(historyId => {
                    resolve(historyId);
                })
                .catch(err => {
                    // エラー発生
                    reject(err);
                });
        }
        catch (err) {
            // エラー発生
            reject(err);
        }
    });
}

/* 
*  チケットを新規登録する（項目削除時）
*  @param1 data      リクエストデータ                       object
*  @param2 tracker   トラッカー object                      int
*  @param3 authId    ログインユーザID                       string
*  @param4 sessionDb トランザクション用セッションオブジェクト object
*  @return 登録情報
*/
TicketHistoryInstance.statics.deleteData = function (data, tracker, authId, sessionDb) {
    return new Promise( async (resolve, reject) => {
        try {
            // データ更新
            const created = data['modified'];
            let upData = {
                common: {},
                watcherHistories: [],
                entryMemberHistories:[]
            };

            upData.common.writer = authId;
            upData.common.tracker = data['tracker'];
            upData.common.ticket_id = data['ticket_id'];
            upData.common.writer_clan = data['clan_id'];
            upData.common.created = created;
            if (data['watchers']) {
                upData.watcherHistories = [
                    {
                        clan_id: data['clan_id'],
                        dml: 'd',
                        created: created
                    }
                ];
            } else if (data['entry_members']) {
                upData.entryMemberHistories = [
                    {
                        clan_id: data['clan_id'],
                        dml: 'd',
                        created: created
                    }
                ];
            }

            this.saveData(upData, tracker, sessionDb)
                .then(historyId => {
                    resolve(historyId);
                })
                .catch(err => {
                    // エラー発生
                    reject(err);
                });
        }
        catch (err) {
            // エラー発生
            reject(err);
        }
    });
}

/* 
*  チケットを新規登録する
*  @param1 data      リクエストデータ                       object
*  @param2 sessionDb トランザクション用セッションオブジェクト object
*  @return 登録情報
*/
TicketHistoryInstance.statics.saveData = function (data, tracker, sessionDb) {
    return new Promise((resolve, reject) => {
        async.waterfall([
            callback => {
                try {
                    // 保存処理
                    this.create([data.common], { session: sessionDb })
                        .then(ticket => {
                            // 保存成功
                            callback(null, ticket[0].id);
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
                    if (tracker === constant.tracker_match) {
                        // 保存データの作成
                        let callbacks = {};
                        const watcherHistories = data.watcherHistories;
                        const entryMemberHistories = data.entryMemberHistories;
                        const liveHistories = data.liveHistories;
                        for (let idx in watcherHistories) {
                            watcherHistories[idx].history_id = historyId;
                        }
                        for (let idx in entryMemberHistories) {
                            entryMemberHistories[idx].history_id = historyId;
                        }
                        for (let idx in liveHistories) {
                            liveHistories[idx].history_id = historyId;
                        }

                        // コールバック関数の作成
                        const watchersFunc = callback2 => {
                            ticketWatcherHistoryInstance.saveData(watcherHistories, sessionDb)
                                .then(watcher => {
                                    callback2(null, watcher);
                                })
                                .catch(err => {
                                    callback2(err);
                                });
                        };
                        const entryMembersFunc = callback2 => {
                            entryMemberHistoryInstance.saveData(entryMemberHistories, sessionDb)
                                .then(entryMember => {
                                    callback2(null, entryMember);
                                })
                                .catch(err => {
                                    callback2(err);
                                });
                        };
                        const livesFunc = callback2 => {
                            liveHistoryInstance.saveData(liveHistories, sessionDb)
                                .then(live => {
                                    callback2(null, live);
                                })
                                .catch(err => {
                                    callback2(err);
                                });
                        };

                        // コールバック関数のリストを作成
                        if (watcherHistories && watcherHistories.length > 0) {
                            callbacks.watchers = watchersFunc;
                        }
                        if (entryMemberHistories && entryMemberHistories.length > 0) {
                            callbacks.entryMembers = entryMembersFunc;
                        }
                        if (liveHistories && liveHistories.length > 0) {
                            callbacks.lives = livesFunc;
                        }

                        if (Object.keys(callbacks).length > 0) {
                            return async.parallel(callbacks, (err, result) => {
                                if (err) {
                                    callback(err);
                                } else {
                                    callback(null, historyId);
                                }
                            });
                        }
                    } else {
                        // 保存データの作成
                        let callbacks = {};
                        const watcherHistories = data.watcherHistories;
                        for (let idx in watcherHistories) {
                            watcherHistories[idx].history_id = historyId;
                        }

                        // コールバック関数の作成
                        const watchersFunc = callback2 => {
                            ticketWatcherHistoryInstance.saveData(watcherHistories, sessionDb)
                                .then(watcher => {
                                    callback2(null, watcher);
                                })
                                .catch(err => {
                                    callback2(err);
                                });
                        };

                        // コールバック関数のリストを作成
                        if (watcherHistories && watcherHistories.length > 0) {
                            callbacks.watchers = watchersFunc;
                        }

                        if (Object.keys(callbacks).length > 0) {
                            return async.parallel(callbacks, (err, result) => {
                                if (err) {
                                    callback(err);
                                } else {
                                    callback(null, historyId);
                                }
                            });
                        }
                    }
                    callback(null, historyId);
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
TicketHistoryInstance.statics.list = function (ticketId, sessionDb) {
    return new Promise((resolve, reject) => {
        try {
            ticketId = mongoose.Types.ObjectId(ticketId);
            const conditions = {
                ticket_id: ticketId
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
                        const relations = await this.getRelationsData(historyId, history.tracker, sessionDb);
    
                        tmpHistory[historyId] = history;
                        for (let key in relations) {
                            tmpHistory[historyId][key] = relations[key];
                        }
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
TicketHistoryInstance.statics.getAggList = function (conditions) {
    const projections = [
        '_id',
        'ticket_id.project_id',
        'clan_id._id',
        'clan_id.name',
        'project_id._id',
        'project_id.name',
        'writer_clan._id',
        'writer_clan.name',
        'author._id',
        'author.name',
        'writer._id',
        'writer.name',
        'limit_date',
        'shoulder._id',
        'shoulder.name',
        'tracker',
        'status',
        'description',
        'start_date',
        'end_date',
        'created',
        'modified',
        'fight_tickets.play_title._id',
        'fight_tickets.play_title.name',
        'fight_tickets.opponent._id',
        'fight_tickets.opponent.name',
        'fight_tickets.winner._id',
        'fight_tickets.winner.name',
        'fight_tickets.loser._id',
        'fight_tickets.loser.name',
        'fight_tickets.draw',
        'work_tickets.title',
        'work_tickets.progress_rate',
        'notification_tickets.title'
    ].join(' ');
    const projections2 = [
        'clan_id.user_id',
        'writer_clan.user_id',
        'fight_tickets.opponent.user_id'
    ].join(' ');
    const projections3 = [
        'clan_id.user_id._id',
        'clan_id.user_id.name',
        'writer_clan.user_id._id',
        'writer_clan.user_id.name',
        'fight_tickets.opponent.user_id._id',
        'fight_tickets.opponent.user_id.name'
    ].join(' ');

    return this.aggregate()
        .match(conditions)
        .lookup({
            from: 'tickets',
            localField: 'ticket_id',
            foreignField: '_id',
            as: 'ticket_id'
        })
        .lookup({
            from: 'clans',
            localField: 'clan_id',
            foreignField: '_id',
            as: 'clan_id'
        })
        .lookup({
            from: 'projects',
            localField: 'project_id',
            foreignField: '_id',
            as: 'project_id'
        })
        .lookup({
            from: 'clans',
            localField: 'writer_clan',
            foreignField: '_id',
            as: 'writer_clan'
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
        .lookup({
            from: 'users',
            localField: 'shoulder',
            foreignField: '_id',
            as: 'shoulder'
        })
        .lookup({
            from: 'game_titles',
            localField: 'fight_tickets.play_title',
            foreignField: '_id',
            as: 'fight_tickets.play_title'
        })
        .lookup({
            from: 'clans',
            localField: 'fight_tickets.opponent',
            foreignField: '_id',
            as: 'fight_tickets.opponent'
        })
        .lookup({
            from: 'clans',
            localField: 'fight_tickets.winner',
            foreignField: '_id',
            as: 'fight_tickets.winner'
        })
        .lookup({
            from: 'clans',
            localField: 'fight_tickets.loser',
            foreignField: '_id',
            as: 'fight_tickets.loser'
        })
        .project([projections, projections2].join(' '))
        .unwind({
            path: '$ticket_id',
            preserveNullAndEmptyArrays: true
        })
        .unwind({
            path: '$clan_id',
            preserveNullAndEmptyArrays: true
        })
        .unwind({
            path: '$project_id',
            preserveNullAndEmptyArrays: true
        })
        .unwind({
            path: '$writer_clan',
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
        .unwind({
            path: '$shoulder',
            preserveNullAndEmptyArrays: true
        })
        .unwind({
            path: '$fight_tickets.play_title',
            preserveNullAndEmptyArrays: true
        })
        .unwind({
            path: '$fight_tickets.opponent',
            preserveNullAndEmptyArrays: true
        })
        .unwind({
            path: '$fight_tickets.winner',
            preserveNullAndEmptyArrays: true
        })
        .unwind({
            path: '$fight_tickets.loser',
            preserveNullAndEmptyArrays: true
        })
        .lookup({
            from: 'users',
            localField: 'clan_id.user_id',
            foreignField: '_id',
            as: 'clan_id.user_id'
        })
        .lookup({
            from: 'users',
            localField: 'writer_clan.user_id',
            foreignField: '_id',
            as: 'writer_clan.user_id'
        })
        .lookup({
            from: 'users',
            localField: 'fight_tickets.opponent.user_id',
            foreignField: '_id',
            as: 'fight_tickets.opponent.user_id'
        })
        .project([projections, projections3].join(' '))
        .unwind({
            path: '$clan_id.user_id',
            preserveNullAndEmptyArrays: true
        })
        .unwind({
            path: '$writer_clan.user_id',
            preserveNullAndEmptyArrays: true
        })
        .unwind({
            path: '$fight_tickets.opponent.user_id',
            preserveNullAndEmptyArrays: true
        });
}

/* 
*  履歴IDをキーにして1件取得する
*  結果が空でもそのまま返す
*  @param1 historyId  チケット履歴ID            string
*  @param2 sessionDb  セッションオブジェクト object
*  @param3 object     検索結果
*/
TicketHistoryInstance.statics.getListFirst = function (historyId, sessionDb) {
    return new Promise((resolve, reject) => {
        historyId = mongoose.Types.ObjectId(historyId);
        const conditions = {
            _id: historyId
        };
        const findObj = sessionDb ? this.getAggList(conditions).session(sessionDb).read('primary') : this.getAggList(conditions);
        findObj
            .then( async history => {
                // オブジェクト展開をする
                history = this.unwindObj(history[0], [constant.TBL_MATCH, constant.TBL_WORK, constant.TBL_NOTIFICATE]);
                // project_idがなければチケットテーブルのproject_idを流用する
                if (!history.project_id) {
                    history.project_id = history.ticket_project_id;
                }
                delete history.ticket_project_id;
                
                let tmpHistory = {};
                delete history._id;
                const relations = await this.getRelationsData(historyId, history.tracker, sessionDb);

                tmpHistory[historyId] = history;
                for (let key in relations) {
                    tmpHistory[historyId][key] = relations[key];
                }
                
                resolve(tmpHistory);
            })
            .catch(err => {
                reject(err);
            });
    });
}

/* 
*  関連するテーブル情報を取得する
*  結果が空でもそのまま返す
*  @param1 historyId  チケット履歴ID            string
*  @param2 sessionDb  セッションオブジェクト object
*  @param3 object     検索結果
*/
TicketHistoryInstance.statics.getRelationsData = function (historyId, tracker, sessionDb) {
    return new Promise((resolve, reject) => {
        try {
            let callbacks = null;

            switch (tracker + '') {
                case constant.tracker_match:
                    callbacks = {
                        watcher_histories: callback => {
                            ticketWatcherHistoryInstance.list(historyId, sessionDb)
                                .then(watcherHistory => {
                                    callback(null, watcherHistory);
                                })
                                .catch(err => {
                                    callback(err);
                                });
                        },
                        entry_member_histories: callback => {
                            entryMemberHistoryInstance.list(historyId, sessionDb)
                                .then(entryMemberHistory => {
                                    callback(null, entryMemberHistory);
                                })
                                .catch(err => {
                                    callback(err);
                                });
                        },
                        live_histories: callback => {
                            liveHistoryInstance.list(historyId, sessionDb)
                                .then(liveHistories => {
                                    callback(null, liveHistories);
                                })
                                .catch(err => {
                                    callback(err);
                                });
                        }
                    };
                    break;
                default:
                    callbacks = {
                        watcher_histories: callback => {
                            ticketWatcherHistoryInstance.list(historyId, sessionDb)
                                .then(watcherHistory => {
                                    callback(null, watcherHistory);
                                })
                                .catch(err => {
                                    callback(err);
                                });
                        }
                    };
                    break;
            }
            async.parallel(callbacks, (err, result) => {
                if (err) return reject(err);

                resolve(result);
            });
        }
        catch (err) {
            // エラー発生
            reject(err);
        }
    });
}

module.exports = mongoose.model('TicketHistory', TicketHistoryInstance)

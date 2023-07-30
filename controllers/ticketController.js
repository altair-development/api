const mongoose = require('mongoose'),
    async = require('async'),
    constant = require('../config/constant'),
    Controller = require('./controller.js'),
    ticketInstance = require('../models/ticketInstance.js'),
    ticketHistoryInstance = require('../models/ticketHistoryInstance.js'),
    userInstance  = require('../models/userInstance.js');

class ticketController extends Controller {
    /* 
    *  チケットを更新する
    *  @param1 socket       ソケットインスタンス           string
    *  @param2 data         リクエストデータ               string
    */
    update(socket, data) {
        return new Promise(async (resolve, reject) => {
            try {
                const authId = socket.request.session.passport.user._id;
                const tracker = data['tracker'];
                const sessionDb = await mongoose.connection.startSession();
                const date = new Date;
                
                data['writer'] = authId;
                data['modified'] = date.setTime(date.getTime());
                data['id'] = data['ticket_id']; // フロント側のコールバック内で使用

                // トラッカーのバリデーション
                if (!tracker || Object.keys(constant.tracker).indexOf(tracker) === -1) {
                    throw new Error('tracker is required');
                }
                sessionDb.startTransaction();
                async.parallel({
                    ticket: callback => {
                        // データ更新
                        ticketInstance.updateData(JSON.parse(JSON.stringify(data)), data['tracker'], authId, sessionDb)
                            .then(ticket => {
                                callback(null, ticket);
                            })
                            .catch(err => {
                                callback(err);
                            });
                    },
                    ticketHistory: callback => {
                        // チケット履歴を登録
                        ticketHistoryInstance.updateData(JSON.parse(JSON.stringify(data)), data['tracker'], authId, sessionDb)
                            .then( async historyId => {
                                let history = await ticketHistoryInstance.getListFirst(historyId, sessionDb);
                                history =  history[historyId];
                                history.id = historyId;
                                history.ticket_id = data['id'];
                                // ウォッチャーあるいは参加者の更新時は追加のオプションデータを渡す
                                const watcherHistories = history.watcher_histories;
                                const watcherHistoriesLength = watcherHistories ? Object.keys(watcherHistories).length : null;
                                const entryMemberHistories = history.entry_member_histories;
                                const entryMemberHistoriesLength = entryMemberHistories ? Object.keys(entryMemberHistories).length : null;
                                if (watcherHistoriesLength || entryMemberHistoriesLength) {
                                    if (watcherHistoriesLength) {
                                        watcherHistories[data['clan_id']].user_id = data['watchers'][0]['user_id'];
                                    } else {
                                        entryMemberHistories[data['clan_id']].user_id = data['entry_members'][0]['user_id'];
                                    }
                                }
                                callback(null, history);
                            })
                            .catch(err => {
                                callback(err);
                            });
                    }
                }, (err, result) => {
                    if (err) {
                        // 保存失敗。ロールバック。
                        sessionDb.abortTransaction();
                        reject(err);
                    } else {
                        // 保存成功。コミット。
                        sessionDb.commitTransaction();
                        resolve(result.ticketHistory);
                    }
                });
            }
            catch (err) {
                // エラー発生
                reject(err);
            }
        });
    }

    /* 
    *  チケット情報から項目を削除する
    *  @param1 socket       ソケットインスタンス           string
    *  @param2 data         リクエストデータ               string
    */
    delete(socket, data) {
        return new Promise(async (resolve, reject) => {
            try {
                const authId = socket.request.session.passport.user._id;
                const tracker = data['tracker'];
                const sessionDb = await mongoose.connection.startSession();
                const date = new Date;
                
                data['writer'] = authId;
                data['modified'] = date.setTime(date.getTime());
                data['id'] = data['ticket_id']; // フロント側のコールバック内で使用

                // トラッカーのバリデーション
                if (!tracker || Object.keys(constant.tracker).indexOf(tracker) === -1) {
                    throw new Error('tracker is required');
                }
                sessionDb.startTransaction();
                async.parallel({
                    ticket: callback => {
                        // データ更新
                        ticketInstance.deleteData(JSON.parse(JSON.stringify(data)), data['tracker'], authId, sessionDb)
                            .then(ticket => {
                                callback(null, ticket);
                            })
                            .catch(err => {
                                callback(err);
                            });
                    },
                    ticketHistory: callback => {
                        // チケット履歴を登録
                        ticketHistoryInstance.deleteData(JSON.parse(JSON.stringify(data)), data['tracker'], authId, sessionDb)
                            .then( async historyId => {
                                let history = await ticketHistoryInstance.getListFirst(historyId, sessionDb);
                                history =  history[historyId];
                                history.id = historyId;
                                history.ticket_id = data['id'];
                                // ウォッチャーあるいは参加者の更新時は追加のオプションデータを渡す
                                const watcherHistories = history.watcher_histories;
                                const watcherHistoriesLength = watcherHistories ? Object.keys(watcherHistories).length : null;
                                const entryMemberHistories = history.entry_member_histories;
                                const entryMemberHistoriesLength = entryMemberHistories ? Object.keys(entryMemberHistories).length : null;
                                if (watcherHistoriesLength || entryMemberHistoriesLength) {
                                    if (watcherHistoriesLength) {
                                        watcherHistories[data['clan_id']].user_id = data['watchers'][0]['user_id'];
                                    } else {
                                        entryMemberHistories[data['clan_id']].user_id = data['entry_members'][0]['user_id'];
                                    }
                                }
                                callback(null, history);
                            })
                            .catch(err => {
                                callback(err);
                            });
                    }
                }, (err, result) => {
                    if (err) {
                        // 保存失敗。ロールバック。
                        sessionDb.abortTransaction();
                        reject(err);
                    } else {
                        // 保存成功。コミット。
                        sessionDb.commitTransaction();
                        resolve(result.ticketHistory);
                    }
                });
            }
            catch (err) {
                // エラー発生
                reject(err);
            }
        });
    }

    /* 
    *  チケットを新規作成する
    *  @param1 socket       ソケットインスタンス           string
    *  @param2 data         リクエストデータ               string
    */
    create(socket, data) {
        return new Promise(async (resolve, reject) => {
            try {
                const clanId = data['clan_id'];
                const authId = socket.request.session.passport.user._id;
                const tracker = data['tracker'];
                data['writer'] = data['author'] = authId;
                const ticket = this.createTicketDataCr(data, tracker);

                // トラッカーのバリデーション
                if (!tracker || Object.keys(constant.tracker).indexOf(tracker) === -1) {
                    throw new Error('tracker is required');
                }

                // DB保存
                const sessionDb = await mongoose.connection.startSession();
                sessionDb.startTransaction();
                async.waterfall([
                    callback => {
                        ticketInstance.saveData(ticket, tracker, authId, sessionDb)
                            .then(insertId => {
                                callback(null, insertId);
                            })
                            .catch(err => {
                                // エラー
                                callback(err);
                            });
                    },
                    (insertId, callback) => {
                        try {
                            const ticketHistory = this.createTicketHistoryDataCr(ticket, tracker, insertId);
                            ticketHistoryInstance.saveData(ticketHistory, tracker, sessionDb)
                                .then(historyId => {
                                    callback(null, insertId);
                                })
                                .catch(err => {
                                    // エラー
                                    callback(err);
                                });
                        }
                        catch (err) {
                            // エラー発生
                            callback(err);
                        }
                    },
                    (ticketId, callback) => {
                        (async (ticketId, callback) => {
                            try {
                                let list = await ticketInstance.getAllList(clanId, ticketId, sessionDb);
                                callback(null, {
                                    ticket: list,
                                    clan_id: ticket.common.clan_id
                                });
                            }
                            catch (err) {
                                // エラー発生
                                callback(err);
                            }
                        })(ticketId, callback);
                    }
                ], (err, result) => {
                    if (err) {
                        // 保存失敗。ロールバック。
                        sessionDb.abortTransaction();
                        reject(err);
                    } else {
                        // 保存成功。コミット。
                        sessionDb.commitTransaction();
                        resolve(result);
                    }
                });
            }
            catch (err) {
                // エラー発生
                reject(err);
            }
        });
    }

    /* 
    *  チケットの新規登録に必要なデータをリクエストデータからコピーする
    *  @param1 data    リクエストデータ object
    *  @param2 tracker トラッカー      int
    *  return  object
    */
    createTicketDataCr(data, tracker) {
        const date = new Date;
        const created = date.setTime(date.getTime());

        switch (tracker) {
            case constant.tracker_match:
                const common = {
                    clan_id: data.clan_id,
                    project_id: data.project_id,
                    writer_clan: data.clan_id,
                    author: data.author,
                    writer: data.writer,
                    limit_date: data.limit_date,
                    shoulder: data.shoulder,
                    tracker: data.tracker,
                    status: data.status,
                    description: data.description,
                    start_date: data.start_date,
                    end_date: data.end_date,
                    fight_tickets: {
                        play_title: mongoose.Types.ObjectId(data['fight_tickets'].play_title),
                        opponent: mongoose.Types.ObjectId(data['fight_tickets'].opponent)
                    },
                    created: created
                };
                const watchers = [];
                for (let idx in data['watchers']) {
                    watchers[idx] = {
                        clan_id: data.clan_id,
                        user_id: data['watchers'][idx].user_id,
                        created: created
                    };
                }
                const entryMembers = [];
                for (let idx in data['entry_members']) {
                    entryMembers[idx] = {
                        clan_id: data.clan_id,
                        user_id: data['entry_members'][idx].user_id,
                        created: created
                    };
                }
                const lives = [
                    { // 登録クラン側
                        clan_id: data.clan_id,
                        live: data['lives'][0]['live'],
                        live_url: data['lives'][0]['live'] === constant.live_no ? '' : data['lives'][0]['live_url'],
                        created: created
                    },
                    { // 対戦相手側（デフォルト値を格納）
                        clan_id: data['fight_tickets']['opponent'],
                        live: constant.live_no,
                        live_url: '',
                        created: created
                    }
                ];

                return {
                    common: common,
                    watchers: watchers,
                    entryMembers: entryMembers,
                    lives: lives
                };
            case constant.tracker_work:
                return {
                    common: {
                        clan_id: data.clan_id,
                        project_id: data.project_id,
                        writer_clan: data.clan_id,
                        author: data.author,
                        writer: data.writer,
                        tracker: data.tracker,
                        status: 0,
                        work_tickets: {
                            title: data['work_tickets'].title
                        },
                        created: created
                    }
                };
            case constant.tracker_notification:
                return {
                    common: {
                        clan_id: data.clan_id,
                        project_id: data.project_id,
                        writer_clan: data.clan_id,
                        author: data.author,
                        writer: data.writer,
                        tracker: data.tracker,
                        status: 0,
                        notification_tickets: {
                            title: data['notification_tickets'].title
                        },
                        created: created
                    }
                };
        }
    }

    /* 
    *  チケット履歴の新規登録に必要なデータをリクエストデータからコピーする
    *  @param1 data     リクエストデータ   object
    *  @param2 tracker  トラッカー         int
    *  @param3 insertId 登録したチケットID string
    *  return  object
    */
    createTicketHistoryDataCr(ticket, tracker, insertId) {
        const date = new Date;
        const created = date.setTime(date.getTime());
        let history = Object.assign({}, JSON.parse(JSON.stringify(ticket)));
        history['common']['ticket_id'] = insertId;
        history['common']['created'] = created;
        // 更新データをチケット履歴にコピー
        switch (tracker) {
            case constant.tracker_match:
                delete history['entryMembers'];
                delete history['watchers'];
                delete history['lives'];
                history['common']['fight_tickets']['play_title'] = mongoose.Types.ObjectId(history['common']['fight_tickets'].play_title);
                history['common']['fight_tickets']['opponent'] = mongoose.Types.ObjectId(history['common']['fight_tickets'].opponent);
                history['watcherHistories'] = [];
                history['entryMemberHistories'] = [];
                if (ticket['watchers'] && ticket['watchers'].length > 0) {
                    history['watcherHistories'].push({
                        clan_id: ticket['common']['clan_id'],
                        dml: 'i',
                        created: created
                    });
                }
                if (ticket['entryMembers'] && ticket['entryMembers'].length > 0) {
                    history['entryMemberHistories'].push({
                        clan_id: ticket['common']['clan_id'],
                        dml: 'i',
                        created: created
                    });
                }
                history['liveHistories'] = ticket.lives;
                for (let idx in history['liveHistories']) {
                    delete history['liveHistories'][idx]['ticket_id'];
                    history['liveHistories'][idx]['created'] = created;
                }

                break;

        }
        return history;
    }

    /* 
    *  チケットの説明を表示する画面を読み込む
    *  @param1 req    リクエストオブジェクト  object
    *  @param2 res    レスポンスオブジェクト  object
    *  @param3 next   nextコールバック関数   function
    */
    getDescription(req, res, next) {
        try {
            const id = req.query.ticket;
            const authId = req.session.passport.user._id;
            if (id && authId) {
                ticketInstance.getDescription(id, req.session.passport.user._id)
                    .then(description => {
                        res.render('ticket/description', {
                            description: description
                        });
                    })
                    .catch(err => {
                        next(Object.assign(err, {
                            ticketId: id,
                            authId: authId
                        }));
                    });
            } else {
                next();
            }
        }
        catch(err) {
            // エラー発生
            next(Object.assign(err, {
                ticketId: id,
                authId: authId
            }));
        }
    }
}

module.exports = () => {
    return new ticketController();
};
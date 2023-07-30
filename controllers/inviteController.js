const mongoose = require('mongoose'),
    async = require('async'),
    constant = require('../config/constant'),
    Controller = require('./controller.js'),
    memberInstance = require('../models/memberInstance.js'),
    memberInviteInstance = require('../models/memberInviteInstance.js'),
    memberInviteHistoryInstance = require('../models/memberInviteHistoryInstance.js'),
    admissionInstance = require('../models/admissionInstance.js');

class inviteController extends Controller {
    /* 
    *  招待を承諾する
    *  @param1 socket       ソケットインスタンス           string
    *  @param2 data         リクエストデータ               string
    */
    async agree(socket, data) {
        return new Promise(async (resolve, reject) => {
            try {
                const userId = socket.request.session.passport.user._id;
                const sessionDb = await mongoose.connection.startSession();
                sessionDb.startTransaction();
                async.waterfall([
                    callback => {
                        const conditions = {
                            clan_id: data.clan_id,
                            user_id: userId,
                            agreement: constant.FLG_NO
                        };
                        // メンバーを登録する
                        memberInstance.findOne(conditions)
                            .session(sessionDb)
                            .read('primary')
                            .then(member => {
                                callback(null, member);
                            })
                            .catch(err => {
                                // DBエラー
                                callback(err);
                            });
                    },
                    (member, callback) => {
                        try {
                            if (!member) throw new Error('invalid clanId');
                            const date = new Date;
                            member.agreement = constant.FLG_YES;
                            member.modified = date.setTime(date.getTime());
                            // メンバー情報を更新する
                            member.save()
                                .then(member => {
                                    // 更新成功
                                    callback(null, member);
                                })
                                .catch(err => {
                                    // 更新失敗
                                    callback(err);
                                });
                        }
                        catch (err) {
                            // エラー発生
                            callback(err);
                        }
                    },
                    (member, callback) => {
                        try {
                            // メンバーの招待を更新する
                            const param = {
                                user_id: userId,
                                clan_id: data.clan_id,
                                agree: constant.FLG_YES,
                                disagree: constant.FLG_NO,
                                deleted: constant.FLG_NO
                            };
    
                            memberInviteInstance.update(param, sessionDb)
                                .then(insertId => {
                                    // 更新成功
                                    callback(null, insertId);
                                })
                                .catch(err => {
                                    // 更新失敗
                                    callback(err);
                                });
                        }
                        catch (err) {
                            // エラー発生
                            callback(err);
                        }
                    },
                    (insertId, callback) => {
                        try {
                            // メンバーの招待履歴を作成する
                            const date = new Date;
                            data = {
                                user_id: userId,
                                clan_id: data.clan_id,
                                invite_id: insertId,
                                agree: constant.FLG_YES,
                                created: date.setTime(date.getTime())
                            };
    
                            memberInviteHistoryInstance.saveData(data, sessionDb)
                                .then(history => {
                                    // 保存成功
                                    callback(null, history);
                                })
                                .catch(err => {
                                    // 保存失敗
                                    callback(err);
                                });
                        }
                        catch (err) {
                            // エラー発生
                            callback(err);
                        }
                    },
                    (history, callback) => {
                        try {
                            // 入・退会履歴を作成する
                            const date = new Date;
                            data = {
                                user_id: userId,
                                clan_id: data.clan_id,
                                entry: constant.FLG_YES,
                                created: date.setTime(date.getTime())
                            };
    
                            admissionInstance.saveData(data, sessionDb)
                                .then(admission => {
                                    // 保存成功
                                    callback(null, admission);
                                })
                                .catch(err => {
                                    // 保存失敗
                                    callback(err);
                                });
                        }
                        catch (err) {
                            // エラー発生
                            callback(err);
                        }
                    }
                ], (err, result) => {
                    if (err) {
                        // 更新失敗。ロールバック。
                        sessionDb.abortTransaction();
                        reject(err);
                    } else {
                        // 更新成功。コミット。
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
    *  招待を拒否する
    *  @param1 socket       ソケットインスタンス           string
    *  @param2 data         リクエストデータ               string
    */
    async disAgree(socket, data) {
        return new Promise(async (resolve, reject) => {
            try {
                const userId = socket.request.session.passport.user._id;
                const sessionDb = await mongoose.connection.startSession();
                sessionDb.startTransaction();
                async.waterfall([
                    callback => {
                        const conditions = {
                            clan_id: data.clan_id,
                            user_id: userId,
                            agreement: constant.FLG_NO
                        };
                        // メンバーを検索する
                        memberInstance.findOne(conditions)
                            .session(sessionDb)
                            .read('primary')
                            .then(member => {
                                callback(null, member);
                            })
                            .catch(err => {
                                // DBエラー
                                callback(err);
                            });
                    },
                    (member, callback) => {
                        try {
                            if (!member) throw new Error('invalid clanId');
                            // メンバー情報を削除する
                            member.remove()
                                .then(member => {
                                    // 更新成功
                                    callback(null, member);
                                })
                                .catch(err => {
                                    // 更新失敗
                                    callback(err);
                                });
                        }
                        catch (err) {
                            // エラー発生
                            callback(err);
                        }
                    },
                    (member, callback) => {
                        try {
                            // メンバーの招待を更新する
                            const param = {
                                user_id: userId,
                                clan_id: data.clan_id,
                                agree: constant.FLG_NO,
                                disagree: constant.FLG_YES,
                                deleted: constant.FLG_NO
                            };
    
                            memberInviteInstance.update(param, sessionDb)
                                .then(insertId => {
                                    // 更新成功
                                    callback(null, insertId);
                                })
                                .catch(err => {
                                    // 更新失敗
                                    callback(err);
                                });
                        }
                        catch (err) {
                            // エラー発生
                            callback(err);
                        }
                    },
                    (insertId, callback) => {
                        try {
                            // メンバーの招待履歴を作成する
                            const date = new Date;
                            data = {
                                user_id: userId,
                                clan_id: data.clan_id,
                                invite_id: insertId,
                                agree: constant.FLG_NO,
                                disagree: constant.FLG_YES,
                                created: date.setTime(date.getTime())
                            };
    
                            memberInviteHistoryInstance.saveData(data, sessionDb)
                                .then(history => {
                                    // 保存成功
                                    callback(null, history);
                                })
                                .catch(err => {
                                    // 保存失敗
                                    callback(err);
                                });
                        }
                        catch (err) {
                            // エラー発生
                            callback(err);
                        }
                    }
                ], (err, result) => {
                    if (err) {
                        // 更新失敗。ロールバック。
                        sessionDb.abortTransaction();
                        reject(err);
                    } else {
                        // 更新成功。コミット。
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
}

module.exports = () => {
    return new inviteController();
};
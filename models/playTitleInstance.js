const async = require('async'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    customValidator = require('./validator');

const PlayTitleInstance = Schema({
    clan_id: {
        type: Schema.Types.ObjectId,
        ref: 'Clan'
    },
    title_id: {
        type: Schema.Types.ObjectId,
        ref: 'GameTitle'
    },
    created: Date,
    modified: {
        type: Date,
        default: function () {
            // 新規作成時はcreatedの値
            // それ以外は現在時刻
            if (this.created) return this.created;
            const date = new Date;
            return date.setTime(date.getTime());
        }
    }
}, {
    collection: 'play_titles',
    read: 'nearest',
    writeConcern: {
        w: 'majority',
        j: true
    }
});

/* 
*  削除時のバリデーション
*  @return boolean
*/
PlayTitleInstance.statics.validationRemove = function (param, userId) {
    return new Promise((resolve, reject) => {
        try {
            if (param.clan_id) {
                // 存在確認・利用可能なクランか確認
                this.isOwnerClanId(param.clan_id, userId)
                    .then(clan => {
                        // クランが存在しなければエラー
                        if (!clan) throw new Error('invalid clanId');
                        resolve(clan);
                    })
                    .catch(err => {
                        // DBエラー
                        reject(err);
                    });
            } else {
                // クランIDがなければエラー
                reject(new Error('clan_id is required'));
            }
        }
        catch (err) {
            // エラー発生
            reject(err);
        }
    });
};

/* 
*  プレイタイトルを保存する
*  @param1 name      ゲームタイトル              string
*  @return title_id  タイトルID
*/
PlayTitleInstance.statics.saveData = function (titleId, clanId, userId, sessionDb) {
    return new Promise((resolve, reject) => {
        async.waterfall([
            callback => {
                try {
                    // 存在確認・利用可能なクランか確認
                    this.isOwnerClanId(clanId, userId)
                        .then(clan => {
                            callback(null, clan);
                        })
                        .catch(err => {
                            // DBエラー
                            callback(err);
                        });
                }
                catch (err) {
                    // DBエラー
                    callback(err);
                }
            },
            (clan, callback) => {
                try {
                    // 利用可能なクランが存在しなければ失敗
                    if (!clan) {
                        throw new Error('invalid clanId');
                    } else {
                        // 既に登録済みのタイトルでないか確認
                        let conditions = {
                            clan_id: clanId,
                            title_id: titleId
                        };
                        this.find(conditions)
                            .exec()
                            .then(playTitle => {
                                callback(null, playTitle);
                            })
                            .catch(err => {
                                // DBエラー
                                callback(err);
                            });
                    }
                }
                catch (err) {
                    // DBエラー
                    callback(err);
                }
            },
            (playTitle, callback) => {
                try {
                    // 登録済みのタイトルが存在すれば失敗
                    if (playTitle.length > 0) throw new Error('タイトルIDが既に登録済みです。');
                    // 保存処理
                    const date = new Date;
                    const data = {
                        clan_id: clanId,
                        title_id: titleId,
                        created: date.setTime(date.getTime())
                    };

                    this.create([data], { session: sessionDb })
                        .then(result => {
                            // 保存成功
                            callback(null, result[0]);
                        })
                        .catch(err => {
                            // エラーがあれば失敗
                            callback(err);
                        });
                }
                catch (err) {
                    // DBエラー
                    callback(err);
                }
            }
        ], (err, result) => {
            if (err) {
                // 保存失敗
                reject(err);
            } else {
                // 保存成功
                resolve();
            }
        });
    });
};

/* 
*  プレイタイトルを削除する
*  @param1 data      削除対象          object
*  @param2 userId    ログインユーザID   string
*  @return title_id  タイトルID
*/
PlayTitleInstance.statics.deleteTitle = function (data, userId, sessionDb) {
    return new Promise((resolve, reject) => {
        async.waterfall([
            callback => {
                try {
                    // 削除時のバリデーション
                    this.validationRemove(data, userId)
                        .then(noUse => {
                            // 異常なし
                            callback(null, {});
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
            (noUse, callback) => {
                try {
                    // タイトルの存在確認
                    const conditions = {
                        clan_id: data.clan_id,
                        title_id: data.title_id
                    };

                    this.findOne(conditions)
                        .session(sessionDb)
                        .read('primary')
                        .exec()
                        .then(playTitle => {
                            // 存在しなければエラー
                            if (!playTitle) throw new Error('未登録のプレイタイトルです。');
                            callback(null, playTitle);
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
            (playTitle, callback) => {
                try {
                    // タイトルを削除
                    playTitle.remove()
                        .then(playTitle => {
                            callback(null, playTitle);
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
            if (err) { // 保存失敗
                reject(err);
            } else { // 保存成功
                resolve(result.title_id);
            }
        });
    });
};

module.exports = mongoose.model('PlayTitle', PlayTitleInstance)

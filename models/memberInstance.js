const async = require('async'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    customValidator = require('./validator');

const MemberInstance = Schema({
    clan_id: {
        type: Schema.Types.ObjectId,                // 参照制限
        ref: 'Clan'
    },
    user_id: {
        type: Schema.Types.ObjectId,                // 参照制限
        ref: 'User'
    },
    agreement: {
        type: Number,
        default: 0
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
    read: 'nearest',
    writeConcern: {
        w: 'majority',
        j: true
    }
});

/* 
*  新規作成時のバリデーション
*  @param1 リクエストデータ object
*  @return boolean
*/
MemberInstance.statics.validationCreate = function (data, authId) {
    return new Promise((resolve, reject) => {
        try {
            const clanId = data.clan_id;
            const userId = data.user_id;
            // クランID必須
            if (!clanId) throw new Error('clan_id is required');
            // ユーザID必須
            if (!userId) throw new Error('user_id is required');

            async.waterfall([
                // user_id
                callback => {
                    try {
                        // ユーザの存在確認
                        mongoose.model('User').findById(userId)
                            .exec()
                            .then(user => {
                                // 存在しなければエラー
                                if (!user) throw new Error('ユーザが存在しません');
                                callback(null, user);
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
                (user, callback) => {
                    try {
                        // 非オーナー確認（登録するクランのオーナー以外であること）
                        const conditions = {
                            user_id: userId
                        };
                        mongoose.model('Clan').find(conditions)
                            .exec()
                            .then(clan => {
                                // 登録するクランIDと一致すればエラー
                                for (let idx in clan) {
                                    if ((clan[idx].id + '') === clanId) throw new Error('登録されるクランのオーナーです');
                                }
                                callback(null, null);
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
                // clan_id
                (noUse, callback) => {
                    try {
                        // 存在確認・利用可能なクランか確認
                        this.isOwnerClanId(clanId, authId)
                            .then(clan => {
                                if (!clan) throw new Error('invalid clanId');
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
                }
            ], (err, result) => {
                if (err) {
                    // エラー発生（失敗）
                    reject(err);
                } else {
                    // 成功
                    resolve(true);
                }
            });
        }
        catch (err) {
            // エラー発生（失敗）
            reject(err);
        }
    });
};

/* 
*  削除時のバリデーション
*  @return boolean
*/
MemberInstance.statics.validationRemove = function (param, userId) {
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
            // エラー発生・処理失敗
            reject(err);
        }
    });
};

/* 
*  指定されたカラムの値だけを含む配列にして返す
*  @param1 conditions 検索条件    array
*  @param2 projection 取得カラム名 array
*/
MemberInstance.statics.toList = function (conditions, projection) {
    return new Promise((resolve, reject) => {
        this.find(conditions, projection)
            .lean()
            .exec()
            .then(members => {
                let list = [];
                let key = '';

                // カラム名を取得する
                for (let k in projection) {
                    if (projection[k] === 1) key = k;
                }
                // 指定したカラムの値を配列に格納する
                members.forEach(val => {
                    list.push(val[key]);
                }, list);
                resolve(list);
            }
            )
            .catch(err => {
                reject(err);
            });
    });
};

/* 
*  メンバーを登録する
*  @param1 data      リクエストデータ object
*  @return 登録情報
*/
MemberInstance.statics.saveData = function (data, userId, sessionDb) {
    return new Promise((resolve, reject) => {
        async.waterfall([
            callback => {
                try {
                    // バリデーション
                    this.validationCreate(data, userId)
                        .then(bool => {
                            // バリデーション成功
                            callback(null, bool);
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
                    const date = new Date;
                    const saveData = {
                        clan_id: data.clan_id,
                        user_id: data.user_id,
                        created: date.setTime(date.getTime())
                    };

                    this.create([saveData], { session: sessionDb })
                        .then(member => {
                            // 保存成功
                            callback(null, member[0]);
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
            }
        ], (err, result) => {
            if (err) {
                // 保存失敗
                reject(err);
            } else {
                // 保存成功
                resolve(result);
            }
        });
    });
};

/* 
*  メンバーを削除する
*  @param1 data      削除対象          object
*  @param2 userId    ログインユーザID   string
*  @return title_id  タイトルID
*/
MemberInstance.statics.deleteMember = function (data, userId, sessionDb) {
    return new Promise((resolve, reject) => {
        async.waterfall([
            callback => {
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
            },
            (noUse, callback) => {
                try {
                    // メンバーの存在確認
                    const conditions = {
                        clan_id: data.clan_id,
                        user_id: data.user_id
                    };

                    this.findOne(conditions)
                        .session(sessionDb)
                        .read('primary')
                        .exec()
                        .then(member => {
                            // 存在しなければエラー
                            if (!member) throw new Error('メンバーが存在しません。');
                            callback(null, member);
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
            (member, callback) => {
                // メンバーを削除
                member.remove()
                    .then(result => {
                        callback(null, result);
                    })
                    .catch(err => {
                        // DBエラー
                        callback(err);
                    });
            }
        ], (err, result) => {
            if (err) { // 削除失敗
                reject(err);
            } else { // 削除成功
                resolve(result);
            }
        });
    });
};

module.exports = mongoose.model('Member', MemberInstance)

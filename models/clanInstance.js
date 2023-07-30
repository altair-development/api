const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    async = require('async'),
    constant = require('../config/constant'),
    customValidator = require('./validator'),
    Member = require('./memberInstance.js');

const ClanInstance = Schema({
    id: {
        type: String,
        default: function () {
            return this._id;
        }
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    name: String,
    description: {
        type: String,
        default: '',
        maxlength: [9999, '説明は9999文字以下で入力してください。']
    },
    prof_ext: {
        type: String,
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
*  指定されたカラムの値だけを含む配列にして返す
*  @param1 conditions 検索条件    array
*  @param2 projection 取得カラム名 array
*/
ClanInstance.statics.toList = function(conditions, projection) {
    return new Promise((resolve, reject) => {
        this.find(conditions, projection)
        .lean()
        .exec()
        .then(members => {
                let list = [];
                let key = '';

                // カラム名を取得する
                for(let k in projection){
                    if(projection[k] === 1) key = k;
                }
                // 指定したカラムの値を配列に格納する
                members.forEach(val => {
                    list.push(val[key] + ''); // 値を文字列に変換
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
*  _idをキーにして取得する
*  結果が空でもそのまま返す
*  @param1 conditions 検索条件              array
*  @param2 projection 取得するカラム名       array
*  @param3 id         キーに使用するカラム名  string
*/
ClanInstance.statics.list = function (conditions, projection, id) {
    return new Promise((resolve, reject) => {
        this.find(conditions, projection)
            .lean()
            .exec()
            .then(clan => {
                let list = {};

                // キーを変更する
                clan.forEach(val => {
                    let key = val[id];

                    delete val[id];
                    list[key] = val;
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
*  オーナーあるいはメンバー（未承諾も含む）になっているクランをオプション情報付きで返す
*  オプション情報：オーナーか否か、承諾済みかどうか
*  @param1 conditions 検索条件              array
*  @param2 projection 取得するカラム名       array
*  @param3 id         キーに使用するカラム名  string
*/
ClanInstance.statics.getTrueMyclanWithStatus = function (userId, noAgree) {
    return new Promise((resolve, reject) => {
        const ownerClan = (callback) => {
            this.find({
                user_id: userId,
                deleted: constant.FLG_NO
            }, {
                'id': 1,
                'name': 1
            }).exec()
                .then(clans => {
                    let result = [];
                    for (let idx in clans) {
                        result.push(Object.assign(clans[idx], {
                            is_owner: true,
                            agreement: constant.FLG_YES
                        }));
                    }
                    callback(null, result);
                })
                .catch(err => {
                    callback(err);
                });
        }
        const memberClanAgree = (callback) => {
            Member.toList({
                user_id: userId,
                agreement: constant.FLG_YES
            }, {
                'clan_id': 1
            })
                .then(clanIds => {
                    this.find({
                        _id: {
                            $in: clanIds
                        }
                    }, {
                        'id': 1,
                        'name': 1
                    }).exec()
                        .then((clans) => {
                            let result = [];
                            for (let idx in clans) {
                                result.push(Object.assign(clans[idx], {
                                    is_owner: false,
                                    agreement: constant.FLG_YES
                                }));
                            }
                            callback(null, result);
                        })
                        .catch(err => {
                            callback(err);
                        });
                })
                .catch(err => {
                    callback(err);
                });
        }
        const memberClanNoAgree = (callback) => {
            Member.toList({
                user_id: userId,
                agreement: {
                    $in: [null, constant.FLG_NO]
                }
            }, {
                'clan_id': 1
            })
                .then(clanIds => {
                    this.find({
                        _id: {
                            $in: clanIds
                        }
                    }, {
                        'id': 1,
                        'name': 1
                    }).exec()
                        .then((clans) => {
                            let result = [];
                            for (let idx in clans) {
                                result.push(Object.assign(clans[idx], {
                                    is_owner: false,
                                    agreement: constant.FLG_NO
                                }));
                            }
                            callback(null, result);
                        })
                        .catch(err => {
                            callback(err);
                        });
                })
                .catch(err => {
                    callback(err);
                });
        }

        if (noAgree) {
            let methods = {
                owner_clan: ownerClan,
                member_clan_agree: memberClanAgree,
                member_clan_no_agree: memberClanNoAgree
            };
            async.parallel(methods, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    let clans = result.owner_clan.concat(result.member_clan_agree, result.member_clan_no_agree);
                    resolve(clans);
                }
            });
        } else {
            let methods = {
                owner_clan: ownerClan,
                member_clan_agree: memberClanAgree
            };
            async.parallel(methods, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    let clans = result.owner_clan.concat(result.member_clan_agree);
                    resolve(clans);
                }
            });
        }
    });
};

/* 
*  クラン情報を更新する
*  @param1 userId 　　　　ログインユーザID                                string
*  @param2 clanId 　　　　更新するクランID                                string
*  @param3 saveData      keyに更新対象,valueに更新値を格納したオブジェクト  object
*  @return promiseObject
*/
ClanInstance.statics.update = function (userId, clanId, saveData, validate) {
    return new Promise((resolve, reject) => {
        async.waterfall([
            callback => {
                if (!validate) {
                    callback(null, true);
                } else {
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
            },
            (clan, callback) => {
                try {
                    // 利用可能なクランが存在しなければ失敗
                    if (!clan) {
                        throw new Error('invalid clanId');
                    } else {
                        // 更新対象のクランを取得する
                        this.findById(clanId)
                            .readConcern('majority')
                            .exec()
                            .then(clan => {
                                callback(null, clan);
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
            (clan, callback) => {
                try {
                    for (let key in saveData) {
                        clan[key] = saveData[key];
                    }
                    clan.save()
                        .then(result => {
                            // 更新成功
                            callback(null, result);
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
*  所有するクランの説明を取得する
*  @param1 userId 　　　　ログインユーザID                                string
*  @param2 clanId 　　　　更新するクランID                                string
*  @param3 saveData      keyに更新対象,valueに更新値を格納したオブジェクト  object
*  @return promiseObject
*/
ClanInstance.statics.getDescription = function (clanId, userId) {
    return new Promise((resolve, reject) => {
        try {
            // メンバーの存在を確認
            let conditions = {
                clan_id: clanId,
                user_id: userId,
                agreement: constant.FLG_YES
            };
            Member.findOne(conditions)
                .exec()
                .then(member => {
                    // 存在しなければエラー
                    if (!member) {
                        throw new Error('invalid clanId');
                    }
                    let conditions = {
                        _id: clanId,
                        deleted: constant.FLG_NO - 0
                    };

                    this.findOne(conditions, 'description')
                        .exec()
                        .then(clan => {
                            resolve(clan.description);
                        })
                        .catch(err => {
                            // DBエラー
                            reject(err);
                        });
                })
                .catch(err => {
                    // DBエラー
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
*  クランのオーナー・メンバーを取得する
*  @param1 clanId 　　　　クランID string
*  @return ユーザ配列
*/
ClanInstance.statics.getRelatedUser = function (clanId) {
    return new Promise((resolve, reject) => {
        async.waterfall([
            callback => {
                try {
                    const conditions = {
                        _id: clanId,
                        deleted: constant.FLG_NO
                    };
                    this.findOne(conditions, 'user_id')
                        .then(clan => {
                            callback(null, clan);
                        })
                        .catch(err => {
                            // エラー発生
                            callback(err);
                        });
                }
                catch (err) {
                    // エラー発生
                    callback(err);
                }
            },
            (clan, callback) => {
                try {
                    const conditions = {
                        clan_id: clanId,
                        agreement: constant.FLG_YES
                    };
                    const projection = {
                        user_id: 1
                    };
                    Member.toList(conditions, projection)
                        .then(members => {
                            members.push(clan.user_id);
                            callback(null, members);
                        })
                        .catch(err => {
                            // エラー発生
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
                // エラー発生
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

/* 
*  参照先テーブルと結合したクラン情報を取得する
*  @param1 conditions 　 検索条件          string
*  @param2 projection 　 取得するプロパティ string
*  @return promiseObject
*/
ClanInstance.statics.aggClanProfile = function (conditions, projection) {
    return new Promise((resolve, reject) => {
        try{
            this.aggregate()
                .match(conditions)
                .lookup({
                    from: 'users',
                    localField: 'user_id',
                    foreignField:'_id',
                    as: 'user_id'
                })
                .project(projection)
                .unwind('user_id')
                .then((clans) => {
                    // 参照先のオブジェクトを展開する
                    let tmpClans = [];
                    for (let idx in clans) {
                        tmpClans.push(this.unwindObj(clans[idx]));
                    }
                    resolve(tmpClans);
                })
                .catch((err) => {
                    reject(err);
                });
        }
        catch(err) {
            reject(err);
        }
    });
}

module.exports = mongoose.model('Clan', ClanInstance)

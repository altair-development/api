const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    async = require('async'),
    constant = require('../config/constant');

const LiveInstance = Schema({
    ticket_id: {
        type: Schema.Types.ObjectId,
        ref: 'Ticket'
    },
    clan_id: {
        type: Schema.Types.ObjectId,
        ref: 'Clan'
    },
    live: {
        type: String,
        enum: Object.keys(constant.live),
        required: true
    },
    live_url: {
        type: String,
        default: '',
        required: function () {
            // liveの値が1の場合
            return this.live && this.live == constant.FLG_YES;
        },
        validate: {
            validator: function (v) {
                if (this.live && this.live === constant.FLG_YES) {
                    var pattern = /^https?(:\/\/[-_.!~*\'()a-zA-Z0-9;\/?:\@&=+\$,%#]+)$/;
                    return pattern.test(v);
                }
            },
            message: '正しいライブURLを入力してください。'
        }
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
*  ライブ配信情報の新規作成時のバリデーションを行う
*  @param1 data    リクエストデータ array
*  @return 判定結果
*/
LiveInstance.statics.validateCr = function (data) {
    return new Promise(async (resolve, reject) => {
        // 配信可否必須・配信URL項目必須
        if (!data[0]['live'] || ((data[0]['live_url'] !== '') && !data[0]['live_url'])) {
            reject(new Error('invalid liveUrl'));
        } else {
            resolve(true);
        }
    });
};

/* 
*  配信可否情報を更新する
*  @param1 data      リクエストデータ                       object
*  @param2 sessionDb トランザクション用セッションオブジェクト object
*  @return 登録情報
*/
LiveInstance.statics.updateData = function (data, sessionDb) {
    return new Promise((resolve, reject) => {
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
                    // 保存処理
                    const conditions = {
                        'ticket_id': data[0].ticket_id,
                        'clan_id': data[0].clan_id
                    };
                    this.findOne(conditions)
                        .session(sessionDb)
                        .read('primary')
                        .then(lives => {
                            lives.live = data[0].live;
                            lives.live_url = data[0].live_url;
                            lives.modified = data[0].modified;
                            lives.save()
                                .then(live => {
                                    callback(null, live);
                                })
                                .catch(err => {
                                    // エラー発生
                                    callback(err);
                                });
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
            if (err) { // 保存失敗
                reject(err);
            } else { // 保存成功
                resolve(result);
            }
        });
    });
}

/* 
*  配信可否情報を新規登録する
*  @param1 data      リクエストデータ                       object
*  @param2 sessionDb トランザクション用セッションオブジェクト object
*  @return 登録情報
*/
LiveInstance.statics.saveData = function (data, sessionDb) {
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
                        // 保存処理
                        this.create(data, { session: sessionDb })
                            .then(live => {
                                // 保存成功
                                callback(null, live);
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
                if (err) { // 保存失敗
                    reject(err);
                } else { // 保存成功
                    resolve(result);
                }
            });
        }
        catch (err) {
            reject(err);
        }
    });
}

/* 
*  チケットに登録された配信可否情報を取得する
*  @param1 ticketId  チケットID
*  @param1 sessionDb セッションオブジェクト
*  @return クランごとの配信可否情報をもつオブジェクト
*/
LiveInstance.statics.list = function (ticketId, sessionDb) {
    return new Promise((resolve, reject) => {
        try {
            let conditions = {
                ticket_id: ticketId
            };
            const findObj = sessionDb ? this.find(conditions).session(sessionDb).read('primary') : this.find(conditions);

            findObj
                .then(lives => {
                    let clanId = null;
                    let tmpLives = {};
                    for (let idx in lives) {
                        clanId = lives[idx].clan_id;
                        tmpLives[clanId] = {
                            live: lives[idx].live,
                            live_url: lives[idx].live_url
                        };
                    }
                    resolve(tmpLives);
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

module.exports = mongoose.model('Live', LiveInstance)

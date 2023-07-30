const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const MemberInviteInstance = Schema({
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
    clan_id: {
        type: Schema.Types.ObjectId,
        ref: 'Clan'
    },
    agree: {
        type: Number,
        default: 0
    },
    disagree: {
        type: Number,
        default: 0
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
    collection: 'member_invites',
    read: 'nearest',
    writeConcern: {
        w: 'majority',
        j: true
    }
});

/* 
*  メンバーの招待情報を登録する
*  @param1 userId      ユーザID              string
*  @param2 clanId      クランID              string
*  @param3 param      更新情報              object
*  @return 登録情報
*/
MemberInviteInstance.statics.update = function (data, sessionDb) {
    return new Promise((resolve, reject) => {
        try {
            // 既にデータが存在すれば更新・なければ作成する
            const conditions = {
                clan_id: data.clan_id,
                user_id: data.user_id
            };

            this.findOne(conditions)
                .session(sessionDb)
                .read('primary')
                .exec()
                .then(memberInvite => {
                    if (memberInvite) {
                        // 更新
                        const date = new Date;
                        memberInvite.agree = data.agree;
                        memberInvite.disagree = data.disagree;
                        memberInvite.deleted = data.deleted;
                        memberInvite.modified = date.setTime(date.getTime());
                        memberInvite.save()
                            .then(result => {
                                // 保存成功
                                resolve(result.id);
                            })
                            .catch(err => {
                                // エラーがあれば失敗
                                reject(err);
                            });
                    } else {
                        // 新規作成
                        this.create([data], { session: sessionDb })
                            .then(result => {
                                // 保存成功
                                resolve(result[0].id);
                            })
                            .catch(err => {
                                // エラーがあれば失敗
                                reject(err);
                            });
                    }
                })
                .catch(err => {
                    // DBエラー
                    reject(err);
                });
        } catch (err) {
            // エラー発生・処理失敗
            reject(err);
        }
    });
};

module.exports = mongoose.model('MemberInvite', MemberInviteInstance)

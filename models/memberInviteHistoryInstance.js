const mongoose = require('mongoose'),
      Schema = mongoose.Schema;

const MemberInviteHistoryInstance = Schema({
    id: {
        type: String,
        default: function(){
            return this._id;
        }
    },
    invite_id: {
        type: Schema.Types.ObjectId,
        ref: 'MemberInvite'
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
        default: function(){
            // 新規作成時はcreatedの値
            // それ以外は現在時刻
            if(this.created) return this.created;
            const date = new Date;
            return date.setTime(date.getTime() + 1000*60*60*9);
        }
    }
}, {
    collection: 'member_invite_histories',
    read: 'nearest',
    writeConcern: {
        w: 'majority',
        j: true
    }
});

/* 
*  メンバーの招待履歴を作成する
*  @param1 data      登録データ             string
*  @return 登録情報
*/
MemberInviteHistoryInstance.statics.saveData = function(data, sessionDb) {
    return new Promise((resolve, reject) => {
        this.create([data], {session: sessionDb})
        .then(result => {
            // 保存成功
            resolve(result[0]);
        })
        .catch(err => {
            // DBエラー
            reject(err);
        });
    });
};

module.exports = mongoose.model('MemberInviteHistory', MemberInviteHistoryInstance)

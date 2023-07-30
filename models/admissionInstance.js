const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const AdmissionInstance = Schema({
    id: {
        type: String,
        default: function(){
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
    entry: {
        type: Number,
        default: 0
    },
    withdraw: {
        type: Number,
        default: 0
    },
    master_withdraw: {
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
    read: 'nearest',
    writeConcern: {
        w: 'majority',
        j: true
    }
});

/* 
*  入・退会履歴を作成
*  @param1 data      登録データ                            string
*  @param2 sessionDb トランザクション用セッションオブジェクト object
*  @return 登録情報
*/
AdmissionInstance.statics.saveData = function(data, sessionDb) {
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

module.exports = mongoose.model('Admission', AdmissionInstance)

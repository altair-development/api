const mongoose = require('mongoose'),
      Schema = mongoose.Schema,
      async = require('async'),
      constant = require('../config/constant'),
      memberInstance = require('./memberInstance.js');

const ProjectWatcherInstance = Schema({
    project_id: {
        type: Schema.Types.ObjectId,
        ref: 'Ticket'
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User'
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
    collection: 'project_watchers',
    read: 'nearest',
    writeConcern: {
        w: 'majority',
        j: true
    }
});

/* 
*  プロジェクト新規作成時のバリデーションを行う
*  @param1 data    リクエストデータ array
*  @return 登録情報
*/
ProjectWatcherInstance.statics.validateCr = function (clanId, data) {
    return new Promise( async (resolve, reject) => {
        try {
            for (let idx in data) {
                const watcher = data[idx];
                const userId = watcher.user_id;

                // ユーザー必須
                if (!userId) throw new Error('invalid userId');

                // メンバーの存在確認
                const conditions = {
                    clan_id: clanId,
                    user_id: userId,
                    agreement: constant.FLG_YES
                }

                let member = await memberInstance.findOne(conditions);
                if (!member) throw new Error('invalid userId');
            }
            resolve();
        }
        catch (err) {
            // エラー発生
            reject(err);
        }
    });
};

/* 
*  ウォッチャーリストを新規登録する
*  @param1 data      リクエストデータ                       object
*  @param2 sessionDb トランザクション用セッションオブジェクト object
*  @return 登録情報
*/
ProjectWatcherInstance.statics.saveData = function (clanId, data, sessionDb) {
    return new Promise((resolve, reject) => {
        try {
            async.waterfall([
                callback => {
                    // メンバーの存在確認
                    this.validateCr(clanId, data)
                        .then(() => {
                            callback(null, true);
                        })
                        .catch(err => {
                            callback(err);
                        });
                },
                (bool, callback) => {
                    try{
                        // 保存処理
                        this.create(data, { session: sessionDb })
                        .then(watcher => {
                            // 保存成功
                            callback(null, watcher);
                        })
                        .catch(err => {
                            // エラーがあれば失敗
                            callback(err);
                        });
                    }
                    catch(err){
                        // エラー発生
                        callback(err);
                    }
                }
            ], (err, result) => {
                if(err){ // 保存失敗
                    reject(err);
                }else{ // 保存成功
                    resolve(result);
                }
            });
        }
        catch(err) {
            reject(err);
        }
    });
};

module.exports = mongoose.model('ProjectWatcherInstance', ProjectWatcherInstance)
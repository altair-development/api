const mongoose = require('mongoose'),
      Schema = mongoose.Schema;

const UserInstance = Schema({
    id: {
        type: String,
        default: function(){
            return this._id;
        }
    },
    name: {
        type: String,
        default: ''
    },
    password: {
        type: String
    },
    email: {
        type: String
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
});

/* 
*  _idをキーにして取得する
*  結果が空でもそのまま返す
*  @param1 conditions 検索条件              array
*  @param2 projection 取得するカラム名       array
*  @param3 id         キーに使用するカラム名  string
*/
UserInstance.statics.list = function(conditions, projection, id) {
    return new Promise((resolve, reject) => {
        this.find(conditions, projection)
        .lean()
        .exec()
        .then(user => {
                let list = {};

                // キーを変更する
                user.forEach(val => {
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

module.exports = mongoose.model('User', UserInstance)

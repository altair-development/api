const async = require('async'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const GameTitleInstance = Schema({
    id: {
        type: String,
        default: function () {
            return this._id;
        }
    },
    name: {
        type: String,
        default: '',
        required: [true, 'name is required'],
        maxlength: [255, '名前は255文字以下で入力してください'],
        match: [/^[^\x00-\x1F\x7F]+$/, '名前に制御文字は使用できません。']
    },
    no_space_name: {
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
        collection: 'game_titles',
        read: 'nearest',
        writeConcern: {
            w: 'majority',
            j: true,
            wtimeout: 500
        }
    });

/* 
*  _idをキーにして取得する
*  結果が空でもそのまま返す
*  @param1 conditions 検索条件              array
*  @param2 projection 取得するカラム名       array
*  @param3 id         キーに使用するカラム名  string
*/
GameTitleInstance.statics.list = function (conditions, projection, id) {
    return new Promise((resolve, reject) => {
        this.find(conditions, projection)
            .lean()
            .exec()
            .then(result => {
                let list = {};

                // キーを変更する
                result.forEach(val => {
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
*  ゲームタイトルを保存する
*  既に存在する場合は保存せずそのidを返す
*  @param1 name ゲームタイトル              string
*/
GameTitleInstance.statics.saveData = function (name, sessionDb) {
    return new Promise((resolve, reject) => {
        async.waterfall([
            callback => {
                try {
                    // タイトルを検索
                    let conditions = {
                        name: name
                    };
                    let projection = {
                        _id: 0,
                        id: 1
                    };
                    this.findOne(conditions, projection)
                        .exec()
                        .then(row => {
                            callback(null, row);
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
            (row, callback) => {
                try {
                    // 存在すればIDを返す
                    if (row) {
                        callback(null, row.id);
                    } else {
                        // 保存処理
                        const date = new Date;
                        const data = {
                            name: name,
                            no_space_name: sanitize(name),
                            created: date.setTime(date.getTime())
                        };

                        this.create([data], { session: sessionDb })
                            .then(result => {
                                // 保存成功
                                callback(null, result[0].id);
                            })
                            .catch(err => {
                                // エラーがあれば失敗
                                callback(err);
                            });
                    }
                }
                catch (err) {
                    // エラー発生
                    callback(err);
                }
            }
        ], (err, id) => {
            if (err) { // 保存失敗
                reject(err);
            } else { // 保存成功
                resolve(id);
            }
        });
    });
};

// スペースを削除し全角文字を半角に変換
function sanitize(str) {
    str = toHalfZenkana(toHalfWidth(str));
    return str.replace(/\s+/g, "").toLowerCase();
}

// アルファベット・数字を半角に変換
function toHalfWidth(str) {
    return str.replace(/[Ａ-Ｚａ-ｚ０-９！-～]/g, function (s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
}

// 全角カタカナを半角に変換
function toHalfZenkana(str) {
    const beforeStr = new Array('ァ', 'ィ', 'ゥ', 'ェ', 'ォ', 'ャ', 'ュ', 'ョ', 'ッ', 'ー', 'ヴ', 'ガ', 'ギ', 'グ', 'ゲ', 'ゴ', 'ザ', 'ジ', 'ズ', 'ゼ', 'ゾ', 'ダ', 'ヂ', 'ヅ', 'デ', 'ド', 'バ', 'ビ', 'ブ', 'ベ', 'ボ', 'パ', 'ピ', 'プ', 'ペ', 'ポ', 'ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク', 'ケ', 'コ', 'サ', 'シ', 'ス', 'セ', 'ソ', 'タ', 'チ', 'ツ', 'テ', 'ト', 'ナ', 'ニ', 'ヌ', 'ネ', 'ノ', 'ハ', 'ヒ', 'フ', 'ヘ', 'ホ', 'マ', 'ミ', 'ム', 'メ', 'モ', 'ヤ', 'ユ', 'ヨ', 'ラ', 'リ', 'ル', 'レ', 'ロ', 'ワ', 'ヲ', 'ン');
    const afterStr = new Array('ｧ', 'ｨ', 'ｩ', 'ｪ', 'ｫ', 'ｬ', 'ｭ', 'ｮ', 'ｯ', 'ｰ', 'ｳﾞ', 'ｶﾞ', 'ｷﾞ', 'ｸﾞ', 'ｹﾞ', 'ｺﾞ', 'ｻﾞ', 'ｼﾞ', 'ｽﾞ', 'ｾﾞ', 'ｿﾞ', 'ﾀﾞ', 'ﾁﾞ', 'ﾂﾞ', 'ﾃﾞ', 'ﾄﾞ', 'ﾊﾞ', 'ﾋﾞ', 'ﾌﾞ', 'ﾍﾞ', 'ﾎﾞ', 'ﾊﾟ', 'ﾋﾟ', 'ﾌﾟ', 'ﾍﾟ', 'ﾎﾟ', 'ｱ', 'ｲ', 'ｳ', 'ｴ', 'ｵ', 'ｶ', 'ｷ', 'ｸ', 'ｹ', 'ｺ', 'ｻ', 'ｼ', 'ｽ', 'ｾ', 'ｿ', 'ﾀ', 'ﾁ', 'ﾂ', 'ﾃ', 'ﾄ', 'ﾅ', 'ﾆ', 'ﾇ', 'ﾈ', 'ﾉ', 'ﾊ', 'ﾋ', 'ﾌ', 'ﾍ', 'ﾎ', 'ﾏ', 'ﾐ', 'ﾑ', 'ﾒ', 'ﾓ', 'ﾔ', 'ﾕ', 'ﾖ', 'ﾗ', 'ﾘ', 'ﾙ', 'ﾚ', 'ﾛ', 'ﾜ', 'ｦ', 'ﾝ');
    for (let i = 0; i < beforeStr.length; i++) {
        str = str.replace(new RegExp(beforeStr[i], 'g'), afterStr[i]);
    }
    return str;
}

module.exports = mongoose.model('GameTitle', GameTitleInstance)

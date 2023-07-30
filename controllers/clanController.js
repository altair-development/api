const mongoose = require('mongoose'),
    async = require('async'),
    fs = require('fs'),
    constant = require('../config/constant'),
    imgIo = require('../util/ImgIo'),
    Controller = require('./controller.js'),
    gameTitleInstance = require('../models/gameTitleInstance.js'),
    playTitleInstance = require('../models/playTitleInstance.js'),
    memberInstance = require('../models/memberInstance.js'),
    memberInviteInstance = require('../models/memberInviteInstance.js'),
    memberInviteHistoryInstance = require('../models/memberInviteHistoryInstance.js'),
    userInstance = require('../models/userInstance.js'),
    admissionInstance = require('../models/admissionInstance.js'),
    clanInstance = require('../models/clanInstance.js');

class ClanController extends Controller {

    create(req, res) {
        try {
            const result = {
                success: false,
                data: []
            };
            const param = req.body.param;
            const date = new Date;
            const newClan = new clanInstance({
                user_id: req.session.passport.user._id,
                name: param.name,
                created: date.setTime(date.getTime())
            });

            // 保存
            newClan.save()
                .then((data) => {
                    userInstance.findById(data.user_id, 'name')
                        .exec()
                        .then(user => {
                            result.success = true;
                            result.data = {
                                id: data.id,
                                name: data.name,
                                user_id: data.user_id,
                                user_name: user.name,
                                created: data.created,
                                description: data.description,
                                modified: data.created
                            };
                            res.send({ result: result });
                        })
                        .catch((err) => {
                            res.send({ result: result });
                        });
                }, (err) => {
                    res.send({ result: result });
                });
        }
        catch (err) {
            // エラー発生
            this.errorLogger.info(err);
        }
    }

    /* 
    *  プレイタイトルを登録する
    *  @param1 socket       ソケットインスタンス           string
    *  @param2 data         リクエストデータ               string
    *  @param3 clientFunc   クライアント側コールバック関数  string
    */
    async createGameTitles(socket, data, clientFunc) {
        try {
            const sessionDb = await mongoose.connection.startSession();
            sessionDb.startTransaction();
            async.waterfall([
                callback => {
                    try {
                        // ゲームタイトルを保存
                        gameTitleInstance.saveData(data.name, sessionDb)
                            .then(insertId => {
                                // 保存成功
                                callback(null, insertId);
                            })
                            .catch(err => {
                                // 保存失敗
                                callback(err);
                            });
                    }
                    catch (err) {
                        // エラー発生
                        callback(err);
                    }
                },
                (id, callback) => {
                    try {
                        // プレイタイトルを保存
                        playTitleInstance.saveData(id, data.clan_id, socket.request.session.passport.user._id, sessionDb)
                            .then(() => {
                                // 保存に成功
                                callback(null, {
                                    id: id,
                                    name: data.name
                                });
                            })
                            .catch(err => {
                                // 保存失敗
                                // 登録済みのゲームタイトルを削除
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
                    // 保存失敗。ロールバック。
                    this.errorLogger.info(err);
                    sessionDb.abortTransaction();
                    clientFunc(err.message, {});
                } else {
                    // 保存成功。コミット。
                    sessionDb.commitTransaction();
                    clientFunc(null, result);
                }
            });
        }
        catch (err) {
            // エラー発生
            this.errorLogger.info(err);
            clientFunc(err.message, {});
        }
    }

    /* 
    *  プレイタイトルを削除する
    *  @param1 socket       ソケットインスタンス           string
    *  @param2 data         リクエストデータ               string
    *  @param3 clientFunc   クライアント側コールバック関数  string
    */
    async deletePlayTitles(socket, data, clientFunc) {
        try {
            const sessionDb = await mongoose.connection.startSession();
            sessionDb.startTransaction();
            playTitleInstance.deleteTitle(data, socket.request.session.passport.user._id, sessionDb)
                .then(titleId => {
                    // 保存成功。コミット。
                    sessionDb.commitTransaction();
                    clientFunc(null, {
                        id: titleId
                    });
                })
                .catch(err => {
                    // 削除失敗。ロールバック。
                    this.errorLogger.info(err);
                    sessionDb.abortTransaction();
                    clientFunc(err.message, {});
                });
        }
        catch (err) {
            // エラー発生
            this.errorLogger.info(err);
            clientFunc(err.message, {});
        }
    }

    /* 
    *  プレイタイトルを登録する
    *  @param1 socket       ソケットインスタンス           string
    *  @param2 data         リクエストデータ               string
    *  @param3 clientFunc   クライアント側コールバック関数  function
    */
    updatePlayTitles(socket, data) {
        return new Promise(async (resolve, reject) => {
            try {
                const sessionDb = await mongoose.connection.startSession();
                sessionDb.startTransaction();
                playTitleInstance.saveData(data.title_id, data.clan_id, socket.request.session.passport.user._id, sessionDb)
                    .then((result) => {
                        // タイトル情報を取得する
                        gameTitleInstance.findOne({ id: data.title_id })
                            .exec()
                            .then(gameTitle => {
                                // 処理成功。コミット。
                                sessionDb.commitTransaction();
                                resolve({
                                    id: gameTitle.id,
                                    name: gameTitle.name
                                });
                            })
                            .catch(err => {
                                // DBエラーロールバック。
                                sessionDb.abortTransaction();
                                reject(err);
                            });
                    })
                    .catch(err => {
                        // DBエラーロールバック。
                        sessionDb.abortTransaction();
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
    *  メンバーを作成し招待する
    *  @param1 socket       ソケットインスタンス           string
    *  @param2 data         リクエストデータ               string
    *  @param3 clientFunc   クライアント側コールバック関数  function
    */
    async updateMember(socket, data, clientFunc) {
        try {
            const sessionDb = await mongoose.connection.startSession();
            sessionDb.startTransaction();
            async.waterfall([
                callback => {
                    try {
                        // メンバーを登録する
                        memberInstance.saveData(data, socket.request.session.passport.user._id, sessionDb)
                            .then(member => {
                                // 保存成功
                                callback(null, member);
                            })
                            .catch(err => {
                                // 保存失敗
                                callback(err);
                            });
                    }
                    catch (err) {
                        // エラー発生
                        callback(err);
                    }
                },
                (member, callback) => {
                    try {
                        // メンバーの招待を作成する
                        const date = new Date;
                        const param = {
                            user_id: data.user_id,
                            clan_id: data.clan_id,
                            agree: 0,
                            disagree: 0,
                            deleted: 0,
                            created: date.setTime(date.getTime())
                        };

                        memberInviteInstance.update(param, sessionDb)
                            .then(insertId => {
                                // 保存成功
                                callback(null, insertId);
                            })
                            .catch(err => {
                                // 保存失敗
                                callback(err);
                            });
                    }
                    catch (err) {
                        // エラー発生
                        callback(err);
                    }
                },
                (insertId, callback) => {
                    try {
                        // メンバーの招待履歴を作成する
                        const date = new Date;
                        data = {
                            user_id: data.user_id,
                            clan_id: data.clan_id,
                            invite_id: insertId,
                            created: date.setTime(date.getTime())
                        };

                        memberInviteHistoryInstance.saveData(data, sessionDb)
                            .then(history => {
                                // 保存成功
                                callback(null, history);
                            })
                            .catch(err => {
                                // 保存失敗
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
                    // 保存失敗。ロールバック。
                    this.errorLogger.info(err);
                    sessionDb.abortTransaction();
                    clientFunc(err.message, {});
                } else {
                    // ユーザ情報を返す
                    userInstance.findById(data.user_id)
                        .exec()
                        .then(user => {
                            // 保存成功。コミット。
                            sessionDb.commitTransaction();
                            clientFunc(null, {
                                id: data.user_id,
                                name: user.name
                            });
                        })
                        .catch(err => {
                            // DBエラーロールバック。
                            this.errorLogger.info(err);
                            sessionDb.abortTransaction();
                            clientFunc(err.message, {});
                        });
                }
            });
        }
        catch (err) {
            // エラー発生
            this.errorLogger.info(err);
            clientFunc(err.message, {});
        }
    }

    /* 
    *  メンバーを削除する
    *  @param1 socket       ソケットインスタンス           string
    *  @param2 data         リクエストデータ               string
    *  @param3 clientFunc   クライアント側コールバック関数  string
    */
    async deleteMember(socket, data, clientFunc) {
        try {
            const sessionDb = await mongoose.connection.startSession();
            sessionDb.startTransaction();
            async.waterfall([
                callback => {
                    try {
                        // メンバーを削除する
                        memberInstance.deleteMember(data, socket.request.session.passport.user._id, sessionDb)
                            .then(member => {
                                // 削除成功
                                callback(null, member);
                            })
                            .catch(err => {
                                // 削除失敗
                                callback(err);
                            });
                    }
                    catch (err) {
                        // エラー発生
                        callback(err);
                    }
                },
                (member, callback) => {
                    try {
                        // メンバーの入退会情報を取得
                        const conditions = {
                            clan_id: data.clan_id,
                            user_id: data.user_id
                        };

                        admissionInstance.findOne(conditions)
                            .session(sessionDb)
                            .read('primary')
                            .exec()
                            .then(admission => {
                                if (!admission || admission.withdraw === constant.FLG_YES || admission.master_withdraw === constant.FLG_YES) {
                                    // admissionsにデータが存在しないか最新のデータが脱退である
                                    async.waterfall([
                                        callback2 => {
                                            try {
                                                // メンバーの招待（削除）を作成する
                                                const param = {
                                                    user_id: data.user_id,
                                                    clan_id: data.clan_id,
                                                    agree: 0,
                                                    disagree: 0,
                                                    deleted: constant.FLG_YES
                                                };
                                                memberInviteInstance.update(param, sessionDb)
                                                    .then(insertId => {
                                                        // 保存成功
                                                        callback2(null, insertId);
                                                    })
                                                    .catch(err => {
                                                        // 保存失敗
                                                        callback2(err);
                                                    });
                                            }
                                            catch (err) {
                                                // エラー発生
                                                callback2(err);
                                            }
                                        },
                                        (insertId, callback2) => {
                                            try {
                                                // メンバーの招待履歴（削除）を作成する
                                                const date = new Date;
                                                data = {
                                                    user_id: data.user_id,
                                                    clan_id: data.clan_id,
                                                    invite_id: insertId,
                                                    deleted: constant.FLG_YES,
                                                    created: date.setTime(date.getTime())
                                                };

                                                memberInviteHistoryInstance.saveData(data, sessionDb)
                                                    .then(history => {
                                                        // 保存成功
                                                        callback2(null, history);
                                                    })
                                                    .catch(err => {
                                                        // 保存失敗
                                                        callback2(err);
                                                    });
                                            }
                                            catch (err) {
                                                // エラー発生
                                                callback2(err);
                                            }
                                        }
                                    ], (err, result) => {
                                        if (err) {
                                            // 削除失敗
                                            callback(err);
                                        } else {
                                            // 削除成功
                                            callback(null, result);
                                        }
                                    });
                                } else {
                                    // admissionsの最後のデータが入会である
                                    try {
                                        // 更新
                                        const date = new Date;
                                        const created = date.setTime(date.getTime());
                                        admission.entry = constant.FLG_NO;
                                        admission.withdraw = constant.FLG_NO;
                                        admission.master_withdraw = constant.FLG_YES;
                                        admission.modified = created;
                                        admission.save()
                                            .then(result => {
                                                callback(null, result);
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
                if (err) {
                    // 削除失敗。ロールバック。
                    this.errorLogger.info(err);
                    sessionDb.abortTransaction();
                    clientFunc(err.message, {});
                } else {
                    // 削除成功。コミット。
                    sessionDb.commitTransaction();
                    clientFunc(null, {
                        id: data.user_id
                    });
                }
            });
        }
        catch (err) {
            // エラー発生
            this.errorLogger.info(err);
            clientFunc(err.message, {});
        }
    }

    /* 
    *  クラン情報を更新する
    *  @param1 socket       ソケットインスタンス           string
    *  @param2 data         リクエストデータ               string
    *  @param3 clientFunc   クライアント側コールバック関数  string
    */
    update(socket, data, clientFunc) {
        try {
            let param = {};
            const date = new Date;

            if (data.description) {
                param.description = data.description;
                param.modified = date.setTime(date.getTime());
            }
            // クラン情報を更新する
            clanInstance.update(socket.request.session.passport.user._id, data.id, param)
                .then(result => {
                    // 更新成功
                    clientFunc(null, result);
                })
                .catch(err => {
                    // 更新失敗
                    this.errorLogger.info(err);
                    clientFunc(err.message, {});
                });
        }
        catch (err) {
            // エラー発生
            this.errorLogger.info(err);
            clientFunc(err.message, {});
        }
    }

    /* 
    *  プロフィール画像を登録する
    *  @param1 socket       ソケットインスタンス           string
    *  @param2 data         リクエストデータ               string
    *  @param3 clientFunc   クライアント側コールバック関数  string
    */
    uploadProfImage(socket, data, clientFunc) {
        try {
            let clanId = data.id;
            let userId = socket.request.session.passport.user._id;
            async.waterfall([
                callback => {
                    try {
                        // クランの存在を確認する
                        clanInstance.isOwnerClanId(clanId, userId)
                            .then(clan => {
                                callback(null, clan);
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
                (clan, callback) => {
                    try {
                        // 利用可能なクランが存在しなければ失敗
                        if (!clan) throw new Error('invalid clanId');

                        const imgIoInstance = new imgIo();

                        // 画像を保存する
                        imgIoInstance.uploadClanProfile(clanId, data.name, data.file)
                            .then((ext) => {
                                // 保存成功
                                callback(null, ext);
                            })
                            .catch(err => {
                                // 保存失敗
                                callback(err);
                            });
                    }
                    catch (err) {
                        // エラー発生
                        callback(err);
                    }
                },
                (ext, callback) => {
                    try {
                        // クラン情報を更新する
                        const date = new Date;
                        let param = {
                            prof_ext: ext,
                            modified: date.setTime(date.getTime())
                        }

                        clanInstance.update(null, clanId, param, false)
                            .then(result => {
                                // 更新成功
                                callback(null, null);
                            })
                            .catch(err => {
                                // 更新失敗
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
                    this.errorLogger.info(err);
                    clientFunc(err.message);
                } else {
                    // 保存成功
                    clientFunc(null, {
                        url: '/Clans/getProfileImage?clan=' + clanId + '&reload=' + Math.floor(Math.random() * 100000000)
                    });
                }
            });
        }
        catch (err) {
            // エラー発生
            this.errorLogger.info(err);
            clientFunc(err);
        }
    }

    getProfileImage(req, res) {

        function imageNotFound(res, err, self) {
            self.errorLogger.info(err);
            res.writeHead(404, { 'Content-Type': 'text/plain;charset=utf-8' });
            res.end();
        }

        try {
            let clanId = req.query.clan;

            if (!clanId) throw new Error('clanId is required');

            async.waterfall([
                callback => {
                    try {
                        // 登録済みの拡張子を取得する
                        clanInstance.findById(clanId, 'prof_ext')
                            .exec()
                            .then(clan => {
                                callback(null, clan.prof_ext);
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
                (ext, callback) => {
                    try {
                        // 読み込むファイルの情報を取得する
                        const imgIoInstance = new imgIo();

                        imgIoInstance.getProfileInfo(clanId, ext, constant.IDENTIFIER_CLAN)
                            .then(fileInfo => {
                                callback(null, fileInfo);
                            })
                            .catch(err => {
                                callback(err);
                            });
                    }
                    catch (err) {
                        // エラー発生
                        callback(err);
                    }
                }
            ], (err, fileInfo) => {
                try {
                    if (err) {
                        // 不明なエラー発生
                        throw err;
                    } else {
                        // ファイルを読み込む
                        let mimeTypes = {
                            png: constant.TYPE_PNG,
                            gif: constant.TYPE_GIF,
                            jpg: constant.TYPE_JPEG
                        };
                        let headers = { 'Content-Type': mimeTypes[fileInfo.ext] + ';charset=utf-8' };
                        let s = fs.createReadStream(fileInfo.filePath)
                            .once('open', () => {
                                res.writeHead(200, headers);
                                s.pipe(res);
                            })
                            .once('error', (err) => {
                                imageNotFound(res, err, this);
                            });
                    }
                }
                catch (err) {
                    imageNotFound(res, err, this);
                }
            });
        }
        catch (err) {
            imageNotFound(res, err, this);
        }
    }

    /* 
    *  クランの説明を表示する画面を読み込む
    *  @param1 req    リクエストオブジェクト  object
    *  @param2 res    レスポンスオブジェクト  object
    *  @param3 next   nextコールバック関数   function
    */
    getDescription(req, res, next) {
        try {
            let clanId = req.query.clan;
            if (clanId) {
                clanInstance.getDescription(clanId, req.session.passport.user._id)
                    .then(description => {
                        res.render('clan/description', {
                            description: description
                        });
                    })
                    .catch(err => {
                        // エラー発生
                        next();
                    });
            }
        }
        catch(err) {
            // エラー発生
            next();
        }
    }
}

module.exports = () => {
    return new ClanController();
};
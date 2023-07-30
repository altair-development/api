const mongoose = require('mongoose'),
    async = require('async'),
    constant = require('../config/constant'),
    Controller = require('./controller.js'),
    projectInstance = require('../models/projectInstance.js'),
    projectHistoryInstance = require('../models/projectHistoryInstance.js');

class ProjectController extends Controller {

    /* 
    *  プロジェクトを新規登録する
    *  @param1 socket       ソケットインスタンス           string
    *  @param2 data         リクエストデータ               string
    */
    async create(socket, data) {
        return new Promise(async (resolve, reject) => {
            try {
                const authId = socket.request.session.passport.user._id;
                const clanId = data['clan_id'];
                const date = new Date;
                const created = date.setTime(date.getTime());
                let saveData = {
                    common: {
                        name: data['name'],
                        clan_id: data['clan_id'],
                        author: authId,
                        writer: authId,
                        start_date: data['start_date'],
                        end_date: data['end_date'],
                        created: created
                    },
                    watchers: []
                };

                for (let idx in data['watchers']) {
                    saveData.watchers.push({
                        user_id: data['watchers'][idx].user_id,
                        created: created
                    });
                }

                // DB保存
                const sessionDb = await mongoose.connection.startSession();
                sessionDb.startTransaction();
                async.waterfall([
                    callback => {
                        projectInstance.saveData(saveData, authId, sessionDb)
                            .then(insertId => {
                                callback(null, insertId);
                            })
                            .catch(err => {
                                // エラー
                                callback(err);
                            });
                    },
                    (insertId, callback) => {
                        try {
                            saveData.common.project_id = insertId;
                            saveData.watcherHistories = [];
                            for (let idx in data['watchers']) {
                                saveData.watcherHistories.push({
                                    dml: 'i',
                                    created: created
                                });
                            }
                            projectHistoryInstance.saveData(saveData, sessionDb)
                                .then(historyId => {
                                    callback(null, insertId);
                                })
                                .catch(err => {
                                    // エラー
                                    callback(err);
                                });
                        }
                        catch (err) {
                            // エラー発生
                            callback(err);
                        }
                    },
                    (projectId, callback) => {
                        (async (projectId, callback) => {
                            try {
                                let list = await projectInstance.list(clanId, projectId, sessionDb);
                                callback(null, {
                                    project: list,
                                    clan_id: saveData.common.clan_id
                                });
                            }
                            catch (err) {
                                // エラー発生
                                callback(err);
                            }
                        })(projectId, callback);
                    }
                ], (err, result) => {
                    if (err) {
                        // 保存失敗。ロールバック。
                        sessionDb.abortTransaction();
                        reject(err);
                    } else {
                        // 保存成功。コミット。
                        sessionDb.commitTransaction();
                        resolve(result);
                    }
                });
            }
            catch (err) {
                // エラー発生
                reject(err);
            }
        });
    }
}

module.exports = () => {
    return new ProjectController();
};
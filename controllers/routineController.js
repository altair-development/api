const mongoose = require('mongoose'),
    async = require('async'),
    constant = require('../config/constant'),
    Controller = require('./controller.js'),
    Clan = require('../models/clanInstance.js'),
    Member = require('../models/memberInstance.js'),
    PlayTitle = require('../models/playTitleInstance.js'),
    Project = require('../models/projectInstance.js');

class RoutineController extends Controller {

   /* 
    *  マイクランの情報を取得する
    *  @param1 socket       ソケットインスタンス           string
    *  @param2 data         リクエストデータ               string
    *  @param3 clientFunc   クライアント側コールバック関数  string
    */
    async selectRelatedClan(socket, data, clientFunc) {
        try {
            const authId = mongoose.Types.ObjectId(socket.request.session.passport.user._id);
            // メンバーになっているクランIDのリストを取得する
            let conditions = {
                user_id: authId,
                agreement: 1
            };
            let projections = {
                clan_id: 1
            }
            let members = await Member.toList(conditions, projections);

            // マイクラン情報を取得する
            conditions = {
                $or: [
                    { user_id: authId },
                    { _id: { $in: members } }
                ]
            };
            let projection = '_id name user_id._id user_id.name description created modified';
            const clans = await Clan.aggClanProfile(conditions, projection);

            // クランごとに各種情報を取得する
            const myPromise = () => {
                return new Promise((resolve, reject) => {
                    const tmpMyClans = {};
                    const length = clans.length;
                    // マイクランがなければ空オブジェクトを返す
                    if (length == 0) {
                        return resolve();
                    }
                    // 全情報を取得し最後にresolveする
                    let count = 1;
                    for (let idx in clans) {
                        const id = clans[idx]._id;
                        delete clans[idx]._id;
                        tmpMyClans[id] = {};
                        async.parallel({
                            playTitles: (callback) => {
                                const conditions = {
                                    clan_id: id
                                };
                                const projection = '-_id title_id._id title_id.name';
                                PlayTitle.aggregate()
                                    .match(conditions)
                                    .lookup({
                                        from: 'game_titles',
                                        localField: 'title_id',
                                        foreignField:'_id',
                                        as: 'title_id'
                                    })
                                    .project(projection)
                                    .unwind('title_id')
                                    .then((playTitles) => {
                                        // 参照先のオブジェクトを展開する
                                        for (let idx in playTitles) {
                                            const playTitle = Object.assign({}, playTitles[idx]);
                                            playTitles[idx] = {
                                                title_id: playTitle.title_id._id,
                                                title_name: playTitle.title_id.name
                                            };
                                        }
                                        callback(null, playTitles);
                                    })
                                    .catch((err) => {
                                        callback(err);
                                    });
                            },
                            members: (callback) => {
                                const conditions = {
                                    clan_id:id
                                };
                                const projection = '-_id user_id._id user_id.name agreement';
                                Member.aggregate()
                                    .match(conditions)
                                    .lookup({
                                        from: 'users',
                                        localField: 'user_id',
                                        foreignField:'_id',
                                        as: 'user_id'
                                    })
                                    .project(projection)
                                    .unwind('user_id')
                                    .then((members) => {
                                        // 参照先のオブジェクトを展開する
                                        for (let idx in members) {
                                            const member = Object.assign({}, members[idx]);
                                            members[idx] = {
                                                user_id: member.user_id._id,
                                                user_name: member.user_id.name,
                                                agreement: member.agreement
                                            };
                                        }
                                        callback(null, members);
                                    })
                                    .catch((err) => {
                                        callback(err);
                                    });
                            },
                            projects: (callback) => {
                                Project.list(id)
                                    .then(projects => {
                                        callback(null, projects);
                                    })
                                    .catch(err => {
                                        callback(err);
                                    });
                            },
                        }, (err, result) => {
                            try {
                                if (err) return reject(err);
                                tmpMyClans[id].profile = clans[idx];
                                tmpMyClans[id].profile.agreement = constant.FLG_YES;
                                tmpMyClans[id].profile.is_owner = clans[idx].user_id.equals(authId);
                                tmpMyClans[id].play_titles = result.playTitles;
                                tmpMyClans[id].members = result.members;
                                tmpMyClans[id].projects = result.projects;
                                if (count == length) {
                                    resolve(tmpMyClans);
                                }
                                count++;
                            }
                            catch (err) {
                                reject(err);
                            }
                        });
                    }
                });
            };

            let myClans = clans.length > 0 ? await myPromise() : {};

            // メンバー未承諾になっているクランIDのリストを取得する
            conditions = {
                user_id: authId,
                agreement: constant.FLG_NO
            };
            projections = {
                clan_id: 1
            }
            members = await Member.toList(conditions, projections);

            // 未承諾クラン情報を取得する
            conditions = {
                _id: { $in: members }
            };
            projection = '_id name user_id._id user_id.name description created modified';
            const notMyClans = await Clan.aggClanProfile(conditions, projection);
            
            // マイクランにマージする
            for (let idx in notMyClans) {
                const notMyClan = notMyClans[idx];

                notMyClan.agreement = constant.FLG_NO;
                notMyClan.is_owner = false;

                myClans[notMyClan._id] = {
                    profile: notMyClan
                };

                delete notMyClan._id;
            }
            clientFunc(null, myClans);
        }
        catch (err) {
            this.errorLogger.info(err);
            clientFunc(err);
        }
    }
}

module.exports = () => {
    return new RoutineController();
};
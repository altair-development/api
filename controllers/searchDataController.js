const mongoose = require('mongoose'),
    async = require('async'),
    constant = require('../config/constant'),
    Controller = require('./controller.js'),
    gameTitleInstance = require('../models/gameTitleInstance.js'),
    userInstance = require('../models/userInstance.js'),
    clanInstance = require('../models/clanInstance.js');

class SearchDataController extends Controller {

    searchMembers(socket, data) {
        return new Promise((resolve, reject) => {
            try {
                const members = data.members;
                const conditions = {
                    _id: {$nin: members},
                    deleted: constant.FLG_NO,
                    name: new RegExp("^" + data.searchStr, "i")
                };
                userInstance.find(conditions, 'id name')
                    .then(users => {
                        resolve(users);
                    })
                    .catch(err => {
                        // DBエラー
                        reject(err);
                    });
            }
            catch (err) {
                // エラー発生
                reject(err);
            }
        });
    }

    searchPlayTitles(socket, data) {
        return new Promise((resolve, reject) => {
            try {
                const playTitles = data.playTitles;
                const conditions = {
                    _id: {$nin: playTitles},
                    deleted: constant.FLG_NO,
                    no_space_name: new RegExp("^" + data.searchStr, "i")
                };
                gameTitleInstance.find(conditions, 'id name')
                    .then(titles => {
                        resolve(titles);
                    })
                    .catch(err => {
                        // DBエラー
                        reject(err);
                    });
            }
            catch (err) {
                // エラー発生
                reject(err);
            }
        });
    }

    searchOpponent(socket, data) {
        return new Promise((resolve, reject) => {
            try {
                const notIn = [];
                for (let idx in data.clans) {
                    notIn.push(mongoose.Types.ObjectId(data.clans[idx]));
                }
                const conditions = {
                    _id: {$nin: notIn},
                    deleted: constant.FLG_NO,
                    name: new RegExp("^" + data.searchStr, "i")
                };
                const projections = [
                    'id',
                    'name',
                    'user_id._id',
                    'user_id.name'
                ].join(' ');
                clanInstance.aggregate()
                    .match(conditions)
                    .lookup({
                        from: 'users',
                        localField: 'user_id',
                        foreignField: '_id',
                        as: 'user_id'
                    })
                    .project(projections)
                    .unwind({
                        path: '$user_id',
                        preserveNullAndEmptyArrays: true
                    })
                    .then(clans => {
                        // オブジェクト展開をする
                        let tmpClans = [];
                        for (let idx in clans) {
                            tmpClans.push(clanInstance.unwindObj(clans[idx]));
                        }
                        resolve(tmpClans);
                    })
                    .catch(err => {
                        // DBエラー
                        reject(err);
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
    return new SearchDataController();
};
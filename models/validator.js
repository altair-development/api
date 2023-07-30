const mongoose = require('mongoose'),
    constant = require('../config/constant'),
    async = require('async');

/* 
*  ユーザーが保有するクランかどうか確認
*  @param1 clanId    クランID               string
*  @param2 userId    ユーザID               string
*  @return クラン情報 キーに使用するカラム名  object
*/
mongoose.Model.isOwnerClanId = function (clanId, userId) {
    return new Promise((resolve, reject) => {
        let conditions = {
            _id: clanId,
            user_id: userId,
            deleted: constant.FLG_NO
        };

        mongoose.model('Clan').findOne(conditions)
            .exec()
            .then(clan => {
                resolve(clan);
            })
            .catch(err => {
                reject(err);
            });
    });
};

/* 
*  ログインユーザーが保有・所属するクランかどうか確認
*  @param1 clanId    クランID               string
*  @param2 userId    ユーザID               string
*  @return bool
*/
mongoose.Model.isBelongToClanId = function (clanId, userId) {
    return new Promise((resolve, reject) => {
        async.waterfall([
            callback => {
                try {
                    let conditions = {
                        _id: clanId,
                        deleted: constant.FLG_NO
                    };
            
                    mongoose.model('Clan').findOne(conditions, 'user_id')
                        .exec()
                        .then(clan => {
                            callback(null, clan);
                        })
                        .catch(err => {
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
                    if (!clan) {
                        // 失敗：クランが存在しない
                        callback(null, false);
                    } else if (clan.user_id + '' === userId) {
                        // 成功：クランのオーナー
                        callback(null, true);
                    } else {
                        let conditions = {
                            clan_id: clanId
                        };
                        let projection = {
                            'user_id': 1
                        };
                        mongoose.model('Member').toList(conditions, projection)
                        .then(members => {
                            if (members.indexOf(userId) !== -1) {
                                // 成功：クランのメンバー
                                callback(null, true);
                            } else {
                                // 失敗：メンバーに存在しない
                                callback(null, false);
                            }
                        })
                        .catch(err => {
                            callback(err);
                        });
                    }
                }
                catch (err) {
                    // エラー発生
                    callback(err);
                }
            }
        ], (err, bool) => {
            if (err) {
                // エラー発生
                reject(err);
            } else {
                // 確認成功
                resolve(bool);
            }
        });
    });
};

/* 
*  マッチング：保有・所属するクランのチケットかあるいは対戦相手のクランのオーナー・メンバーか
*  上記以外：保有・所属するクランのチケットか
*  @param1 ticketId  チケットID             string
*  @param2 userId    ユーザID               string
*  @return クラン情報 キーに使用するカラム名  object
*/
mongoose.Model.isRelatedUserForTicket = function (ticketId, userId) {
    return new Promise((resolve, reject) => {
        let conditions = {
            _id: ticketId
        };
        const ticketInstance = mongoose.model('Ticket');

        ticketInstance.findOne(conditions)
            .then( async ticket => {
                if (ticket) {
                    if (await ticketInstance.isRelatedUserForClan(userId, ticket.clan_id)) {
                        return resolve(true);
                    } else if (ticket.fight_tickets && ticket.fight_tickets.opponent && await ticketInstance.isRelatedUserForClan(userId, ticket.fight_tickets.opponent)) {
                        return resolve(true);
                    }
                }

                resolve(false);
            })
            .catch(err => {
                reject(err);
            });
    });
};
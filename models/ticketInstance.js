const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    async = require('async'),
    constant = require('../config/constant'),
    utils = require('./utils'),
    ticketWatcherInstance = require('./ticketWatcherInstance.js'),
    entryMemberInstance = require('./entryMemberInstance.js'),
    liveInstance = require('./liveInstance.js'),
    ticketHistoryInstance = require('./ticketHistoryInstance.js'),
    clanInstance = require('./clanInstance.js'),
    playTitleInstance = require('./playTitleInstance.js');

const TicketInstance = Schema({
    id: {
        type: String,
        default: function () {
            return this._id;
        }
    },
    clan_id: {
        type: Schema.Types.ObjectId,
        ref: 'Clan'
    },
    project_id: {
        type: Schema.Types.ObjectId,
        ref: 'Project'
    },
    writer_clan: {
        type: Schema.Types.ObjectId,
        ref: 'Clan'
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    writer: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    limit_date: {
        type: Date,
        default: ''
    },
    shoulder: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    tracker: {
        type: Number,
        required: [true, 'tracker is required']
    },
    status: {
        type: Number,
        required: [true, 'tracker is status']
    },
    description: {
        type: String,
        default: '',
        maxlength: [9999, '説明は9999文字以下で入力してください。']
    },
    start_date: {
        type: Date,
        default: ''
    },
    end_date: {
        type: Date,
        default: '',
        validate: {
            validator: function (v) {
                if (this.start_date && this.start_date !== '' && v) {
                    return this.start_date <= v;
                }
                return true;
            },
            message: '終了日は開始日以降を入力してください。'
        }
    },
    fight_tickets: {},
    work_tickets: {},
    notification_tickets: {},
    created: Date,
    modified: {
        type: Date,
        default: function () {
            // 新規作成時はcreatedの値
            return this.created;
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
*  起票したクランかどうかを確認する
*  @param1 clanId チケットID  string       
*  @param2 clanId クランID    string
*  return  bool    判定結果
*/
TicketInstance.statics.checkIsAuthorClan = function (ticketId, clanId) {
    return new Promise(async (resolve, reject) => {
        try {
            const ticket = await this.findById(ticketId, 'clan_id').exec();
            resolve(clanId === ticket.clan_id + '');
        }
        catch (err) {
            reject(err);
        }
    });
};

/* 
*  チケットIDのバリデーションを行う
*  @param1 clanId チケットID      string       
*  @param2 authId ログインユーザ string
*  return  bool    判定結果
*/
TicketInstance.statics.validateTicketId = function (ticketId, userId) {
    return new Promise((resolve, reject) => {
        // マッチング：保有・所属するクランのチケットかあるいは対戦相手のクランのオーナー・メンバーか
        // 上記以外：保有・所属するクランのチケットか
        this.isRelatedUserForTicket(ticketId, userId)
            .then(bool => {
                if (!bool) {
                    throw new Error('invalid ticketId');
                }
                resolve(true);
            })
            .catch(err => {
                // エラー発生
                reject(err);
            });
    });
};

/* 
*  トラッカーのバリデーションを行う
*  @param1 ticketId チケットID string       
*  @param2 tracker  トラッカー string
*  return  bool    判定結果
*/
TicketInstance.statics.validateTracker = function (ticketId, tracker) {
    return new Promise((resolve, reject) => {
        // 更新対象チケットのトラッカーと同一か
        const conditions = {
            _id: ticketId
        };
        this.findOne(conditions)
            .then(ticket => {
                if (ticket && (ticket.tracker + '') !== tracker) {
                    throw new Error('invalid tracker');
                } else {
                    resolve();
                }
            })
            .catch(err => {
                // エラー発生
                reject(err);
            });
    });
};

/* 
*  クランIDのバリデーションを行う
*  @param1 clanId クランID      string       
*  @param2 authId ログインユーザ string
*  return  bool    判定結果
*/
TicketInstance.statics.validateClanId = function (clanId, authId) {
    return new Promise((resolve, reject) => {
        // 値必須
        if (!clanId) return reject(new Error('invalid clanId'));
        // ユーザーが保有するクランかどうか
        this.isBelongToClanId(clanId, authId)
            .then(bool => {
                if (!bool) {
                    throw new Error('invalid clanId');
                } else {
                    resolve();
                }
            })
            .catch(err => {
                // エラー発生
                reject(err);
            });
    });
};

/* 
*  プロジェクトIDのバリデーションを行う
*  @param1 clanId    クランID      string       
*  @param2 projectId プロジェクトID string
*  return  bool       判定結果
*/
TicketInstance.statics.validateProjectId = function (clanId, projectId) {
    return new Promise((resolve, reject) => {
        // 値必須
        if (!projectId) return reject(new Error('invalid projectId'));
        // クランに存在するプロジェクトか
        const projectInstance = mongoose.model('Project');
        const conditions = {
            _id: projectId,
            clan_id: clanId,
            deleted: constant.FLG_NO
        };
        
        projectInstance.findOne(conditions)
            .exec()
            .then(project => {
                if (!project) {
                    throw new Error('invalid project');
                } else {
                    resolve();
                }
            })
            .catch(err => {
                // エラー発生
                reject(err);
            });
    });
};

/* 
*  担当者のバリデーションを行う
*  @param1 tracker トラッカー  int       
*  @param2 clanId  クランID    string
*  @param3 data    保存データ  object
*  return  bool    判定結果
*/
TicketInstance.statics.validateShoulder = function (tracker, clanId, data) {
    return new Promise((resolve, reject) => {
        try {
            const shoulder = data.shoulder;
            // 値必須
            if (!shoulder) throw new Error('invalid shoulder');
            switch (tracker) {
                // マッチング
                case constant.tracker_match:
                    // どちらかのクランのオーナーである
                    let ticketId = null;
                    let clans = null;
                    if (data.id) {
                        ticketId = data.id;
                    } else {
                        clans = [
                            clanId,
                            data.fight_tickets.opponent
                        ];
                    }
                    this.isSomeOwner(shoulder, ticketId, clans)
                        .then(bool => {
                            if (!bool) {
                                throw new Error('invalid shoulder');
                            } else {
                                return resolve();
                            }
                        })
                        .catch(err => {
                            // エラー発生
                            return reject(err);
                        });
                // 作業依頼
                default:
                    // クランのオーナーあるいはメンバーであるか
                    this.findById(data.id)
                        .then(ticket => {
                            this.isRelatedUserForClan(shoulder, clanId)
                                .then(bool => {
                                    if (!bool) {
                                        throw new Error('invalid shoulder');
                                    } else {
                                        return resolve();
                                    }
                                })
                                .catch(err => {
                                    // エラー発生
                                    return reject(err);
                                });
                        })
                        .catch(err => {
                            // エラー発生
                            return reject(err);
                        });
                    break;
            }
        }
        catch (err) {
            // エラー発生
            reject(err);
        }
    });
};

/* 
*  期間のバリデーションを行う
*  @param1 tracker トラッカー  int       
*  @param3 data    保存データ  object
*  return  bool    判定結果
*/
TicketInstance.statics.validatePeriod = function (tracker, data) {
    return new Promise(async (resolve, reject) => {
        try {
            if (tracker === constant.tracker_match) {
                // 権限確認
                if (!(await this.checkIsAuthorClan(data['ticket_id'], data['clan_id']))) {
                    throw new Error('invalid authority for period');
                }
            }

            const pattern = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

            if (data['start_date'] && !data['start_date'].match(pattern)) {
                throw new Error('invalid start_date');
            }
            if (data['end_date'] || data['end_date'] === '') {
                if (data['end_date'] && !data['end_date'].match(pattern)) {
                    throw new Error('invalid end_date');
                }
            } else {
                throw new Error('invalid end_date');
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
*  担当者のバリデーションを行う
*  @param1 tracker トラッカー  int       
*  @param2 clanId  クランID    string
*  @param3 data    保存データ  object
*  return  bool    判定結果
*/
TicketInstance.statics.validateStatus = function (tracker, data) {
    return new Promise((resolve, reject) => {
        try {
            const status = data.status;
            // 値必須
            if (!status) throw new Error('invalid status');
            // リスト確認
            switch (tracker) {
                case constant.tracker_match:
                    let statuses = null;
                    if (data.ticket_id) {
                        statuses = constant.status_matching;
                    } else {
                        statuses = constant.status_matching_create;
                    }
                    if (Object.keys(statuses).indexOf(status) === -1) {
                        throw new Error('invalid status');
                    } else {
                        return resolve();
                    }
                case constant.tracker_work:
                    if (data.ticket_id) {
                        let statuses = constant.status_working;
                        if (Object.keys(statuses).indexOf(status) === -1) {
                            throw new Error('invalid status');
                        } else {
                            return resolve();
                        }
                    } else {
                        return resolve();
                    }
                default:
                    if (data.ticket_id) {
                        let statuses = constant.status_notification;
                        if (Object.keys(statuses).indexOf(status) === -1) {
                            throw new Error('invalid status');
                        } else {
                            return resolve();
                        }
                    } else {
                        return resolve();
                    }
            }
        }
        catch (err) {
            // エラー発生
            reject(err);
        }
    });
};

/* 
*  プレイタイトルのバリデーションを行う
*  @param1 tracker     トラッカー          int       
*  @param2 clanId      クランID            string
*  @param3 fightTicket 登録マッチングデータ object
*  return  bool        判定結果
*/
TicketInstance.statics.validatePlayTitle = function (clanId, data) {
    return new Promise(async (resolve, reject) => {
        try {
            const fightTicket = data['fight_tickets'];
            // 権限を確認
            if (data['ticket_id'] && !(await this.checkIsAuthorClan(data['ticket_id'], clanId))) {
                throw new Error('invalid authority for playTitle');
            }

            // 値必須
            const title = fightTicket.play_title;
            if (!title) throw new Error('invalid title');

            // クランが登録済みのタイトルかどうか
            let conditions = {
                clan_id: clanId,
                title_id: title
            };
            playTitleInstance.findOne(conditions)
                .exec()
                .then(playTitle => {
                    if (!playTitle) {
                        throw new Error('invalid title');
                    } else {
                        resolve();
                    }
                })
                .catch(err => {
                    // エラー発生
                    reject(err);
                });
        }
        catch (err) {
            // エラー発生
            reject(err);
        }
    });
};

/* 
*  対戦相手のバリデーションを行う
*  @param1 tracker     トラッカー          int       
*  @param2 clanId      クランID            string
*  @param3 fightTicket 登録マッチングデータ object
*  return  bool        判定結果
*/
TicketInstance.statics.validateOpponent = function (tracker, clanId, fightTicket) {
    return new Promise((resolve, reject) => {
        try {
            // 値が存在しないか自クランと同一なら失敗
            const opponent = fightTicket.opponent;
            if (!opponent || clanId === fightTicket.opponent) throw new Error('invalid opponent');

            // 自クラン以外に存在するか
            let conditions = {
                _id: fightTicket.opponent,
                deleted: constant.FLG_NO
            };
            clanInstance.findOne(conditions)
                .exec()
                .then(clan => {
                    if (!clan) {
                        throw new Error('invalid opponent');
                    } else {
                        resolve();
                    }
                })
                .catch(err => {
                    // エラー発生
                    reject(err);
                });
        }
        catch (err) {
            // エラー発生
            reject(err);
        }
    });
};

/* 
*  勝者のバリデーションを行う
*  @param1 clanId   クランID   string       
*  @param2 ticketId チケットID string
*  return  bool     判定結果
*/
TicketInstance.statics.validateWinner = function (clanId, ticketId) {
    return new Promise((resolve, reject) => {
        try {
            // 項目必須
            if (clanId !== '' && !clanId) throw new Error('invalid winner');

            // 登録クランIDと対戦相手の何れか
            this.isSomeClan(clanId, ticketId)
                .then(bool => {
                    if (!bool) {
                        throw new Error('invalid winner');
                    } else {
                        resolve();
                    }
                })
                .catch(err => {
                    // エラー発生
                    reject(err);
                });
        }
        catch (err) {
            // エラー発生
            reject(err);
        }
    });
};

/* 
*  進捗率のバリデーションを行う
*  @param1 progressRate   進捗率   string       
*  return  bool           判定結果
*/
TicketInstance.statics.validateProgressRate = function (progressRate) {
    return new Promise((resolve, reject) => {
        try {
            progressRate = progressRate - 0;
            if ((typeof progressRate === 'number') && (isFinite(progressRate))) {
                if (0 <= progressRate && progressRate <= 100) {
                    return resolve();
                }
            }
            throw new Error('invalid progressRate');
        }
        catch (err) {
            // エラー発生
            reject(err);
        }
    });
};

/* 
*  進捗率のバリデーションを行う
*  @param1 progressRate   進捗率   string       
*  return  bool           判定結果
*/
TicketInstance.statics.validateTitle = function (title) {
    return new Promise((resolve, reject) => {
        try {
            const pattern = /^[^\x00-\x1F\x7F]+$/;
            if (!title.match(pattern)) {
                throw new Error('invalid title');
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
*  敗者のバリデーションを行う
*  @param1 clanId   クランID   string       
*  @param2 ticketId チケットID string
*  return  bool     判定結果
*/
TicketInstance.statics.validateLoser = function (clanId, ticketId) {
    return new Promise((resolve, reject) => {
        try {
            // 項目必須
            if (clanId !== '' && !clanId) throw new Error('invalid loser');

            // 登録クランIDと対戦相手の何れか
            this.isSomeClan(clanId, ticketId)
                .then(bool => {
                    if (!bool) {
                        throw new Error('invalid loser');
                    } else {
                        resolve();
                    }
                })
                .catch(err => {
                    // エラー発生
                    reject(err);
                });
        }
        catch (err) {
            // エラー発生
            reject(err);
        }
    });
};

/* 
*  チケット情報の新規作成時のバリデーションを行う
*  @param1 data    対象データ object       
*  @param2 tracker トラッカー int
*  return  bool    判定結果
*/
TicketInstance.statics.validateCr = function (data, tracker, authId) {
    return new Promise((resolve, reject) => {
        try {
            const clanId = data.clan_id;
            const patternDate = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
            const patternTitle = /^[^\x00-\x1F\x7F-\x9F]{0,255}$/;
            const fightTicket = data.fight_tickets;
            const workTicket = data.work_tickets;
            const notificationTicket = data.notification_tickets;
            async.parallel({
                clanId: callback => {
                    // ユーザーが保有するクランかどうか
                    this.validateClanId(clanId, authId)
                        .then(() => {
                            callback(null, true);
                        })
                        .catch(err => {
                            // エラー発生
                            callback(err);
                        });
                },
                projectId: callback => {
                    // クランに存在するプロジェクトか
                    this.validateProjectId(clanId, data.project_id)
                        .then(() => {
                            callback(null, true);
                        })
                        .catch(err => {
                            // エラー発生
                            callback(err);
                        });
                },
                other: callback => {
                    switch (tracker) {
                        case constant.tracker_match:
                            async.parallel({
                                limitDate: callback => {
                                    const limitDate = data.limit_date;
                                    if (limitDate !== '' && (!limitDate || !limitDate.match(patternDate))) {
                                        // エラー発生
                                        callback(new Error('invalid limitDate'));
                                    } else {
                                        callback(null, true);
                                    }
                                },
                                shoulder: callback => {
                                    // どちらかのクランのオーナーである
                                    this.validateShoulder(tracker, clanId, data)
                                        .then(() => {
                                            callback(null, true);
                                        })
                                        .catch(err => {
                                            // エラー発生
                                            callback(err);
                                        });
                                },
                                status: callback => {
                                    // リスト確認
                                    this.validateStatus(tracker, data)
                                        .then(() => {
                                            callback(null, true);
                                        })
                                        .catch(err => {
                                            // エラー発生
                                            callback(err);
                                        });
                                },
                                description: callback => {
                                    const description = data.description;
                                    if (description !== '' && !description) {
                                        // エラー発生
                                        callback(new Error('invalid description'));
                                    } else {
                                        callback(null, true);
                                    }
                                },
                                startDate: callback => {
                                    const startDate = data.start_date;
                                    if (startDate !== '' && (!startDate || !startDate.match(patternDate))) {
                                        // エラー発生
                                        callback(new Error('invalid startDate'));
                                    } else {
                                        callback(null, true);
                                    }
                                },
                                endDate: callback => {
                                    const endDate = data.end_date;
                                    if (endDate !== '' && (!endDate || !endDate.match(patternDate))) {
                                        // エラー発生
                                        callback(new Error('invalid endDate'));
                                    } else {
                                        callback(null, true);
                                    }
                                },
                                playTitle: callback2 => {
                                    // クランが登録済みのタイトルかどうか
                                    this.validatePlayTitle(clanId, data)
                                        .then(() => {
                                            callback2(null, true);
                                        })
                                        .catch(err => {
                                            // エラー発生
                                            callback2(err);
                                        });
                                },
                                opponent: callback2 => {
                                    // 自クラン以外に存在するか
                                    this.validateOpponent(tracker, clanId, fightTicket)
                                        .then(() => {
                                            callback2(null, true);
                                        })
                                        .catch(err => {
                                            // エラー発生
                                            callback2(err);
                                        });
                                }
                            }, (err, result) => {
                                if (err) {
                                    // エラー発生
                                    callback(err);
                                } else {
                                    callback(null, result);
                                }
                            });
                            break;
                        case constant.tracker_work:
                            // 制御文字以外
                            // 255文字以下
                            if (!workTicket.title.match(patternTitle)) {
                                callback(new Error('invalid title'));
                            } else {
                                callback(null, true);
                            }
                            break;
                        case constant.tracker_notification:
                            // 制御文字以外
                            // 255文字以下
                            if (!notificationTicket.title.match(patternTitle)) {
                                callback(new Error('invalid title'));
                            } else {
                                callback(null, true);
                            }
                            break;
                    }
                }
            }, (err, result) => {
                if (err) {
                    // エラー発生
                    reject(err);
                } else {
                    resolve();
                }
            });
        }
        catch (err) {
            // エラー発生
            reject(err);
        }
    });
};

/* 
*  チケット情報の更新時に共通のバリデーションを行う
*  @param1 data    対象データ object       
*  @param2 tracker トラッカー int
*  return  bool    判定結果
*/
TicketInstance.statics.validateUpCommon = function (data, tracker, authId) {
    return new Promise((resolve, reject) => {
        try {
            const clanId = data.clan_id;
            async.parallel({
                ticketId: callback => {
                    this.validateTicketId(data['ticket_id'], authId)
                        .then(() => {
                            callback(null, true);
                        })
                        .catch(err => {
                            // エラー発生
                            callback(err);
                        });
                },
                clanId: callback => {
                    this.validateClanId(clanId, authId)
                        .then(() => {
                            callback(null, true);
                        })
                        .catch(err => {
                            // エラー発生
                            callback(err);
                        });
                },
                tracker: callback => {
                    this.validateTracker(data['ticket_id'], tracker)
                        .then(() => {
                            callback(null, true);
                        })
                        .catch(err => {
                            // エラー発生
                            callback(err);
                        });
                }
            }, (err, result) => {
                if (err) {
                    // エラー発生
                    reject(err);
                } else {
                    resolve();
                }
            });
        }
        catch (err) {
            // エラー発生
            reject(err);
        }
    });
};

/* 
*  チケット情報の更新時のバリデーションを行う
*  @param1 data    対象データ object       
*  @param2 tracker トラッカー int
*  return  bool    判定結果
*/
TicketInstance.statics.validateUp = function (data, tracker, authId) {
    return new Promise((resolve, reject) => {
        try {
            const clanId = data.clan_id;
            async.parallel({
                common: callback => {
                    // 更新時共通のバリデーション
                    this.validateUpCommon(data, tracker, authId)
                        .then(() => {
                            callback(null, true);
                        })
                        .catch(err => {
                            // エラー発生
                            callback(err);
                        });
                },
                someone: callback => {
                    (async (callback) => {
                        try {
                            const fightTickets = data['fight_tickets'];
                            const workTickets = data['work_tickets'];
                            const notificationTickets = data['notification_tickets'];

                            if (data['start_date'] || data['start_date'] === '') {
                                await this.validatePeriod(tracker, data);
                            } else if (data['description'] || data['description'] === '') {
                                // 権限の確認
                                if ((tracker === constant.tracker_match) && !(await this.checkIsAuthorClan(data['ticket_id'], data['clan_id']))) {
                                    throw new Error('invalid authority for description');
                                }
                            } else if (data['limit_date'] || data['limit_date'] === '') {
                                const pattern = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
                                if (data['limit_date'] && !data['limit_date'].match(pattern)) {
                                    throw new Error('invalid limit_date');
                                }
                            } else if (data['status']) {
                                // リスト確認
                                await this.validateStatus(tracker, data);
                                if (fightTickets) {
                                    const draw = fightTickets['draw'];
                                    const winner = fightTickets['winner'];
                                    const loser = fightTickets['loser'];

                                    // [0,1]のいずれか
                                    if (['0', '1'].indexOf(draw) === -1) {
                                        throw new Error('invalid draw');
                                    }
                                    if (draw == 0) {
                                        // 勝者と敗者必須
                                        if (!winner || !loser) {
                                            throw new Error('invalid winner or loser');
                                        } else if (winner === loser) {
                                            // loserと異なる値が設定されているか
                                            throw new Error('invalid winner');
                                        }
                                        await this.validateWinner(winner, data['ticket_id']);
                                        await this.validateLoser(loser, data['ticket_id']);
                                    }
                                }
                            } else if (data['shoulder']) {
                                // どちらかのクランのオーナーである
                                await this.validateShoulder(tracker, clanId, data);
                            } else if (fightTickets) {
                                if (fightTickets['play_title']) {
                                    // クランが登録済みのタイトルかどうか
                                    await this.validatePlayTitle(clanId, data);
                                }
                            } else if (workTickets) {
                                if (workTickets['progress_rate']) {
                                    await this.validateProgressRate(workTickets['progress_rate']);
                                } else if (workTickets['title']) {
                                    await this.validateTitle(workTickets['title']);
                                }
                            } else if (notificationTickets) {
                                if (notificationTickets['title']) {
                                    await this.validateTitle(notificationTickets['title']);
                                }
                            }
                            callback(null, true);
                        }
                        catch (err) {
                            // エラー発生
                            callback(err);
                        }
                    })(callback);
                },
            }, (err, result) => {
                if (err) {
                    // エラー発生
                    reject(err);
                } else {
                    resolve();
                }
            });
        }
        catch (err) {
            // エラー発生
            reject(err);
        }
    });
};

/* 
*  _idをキーにして取得する
*  結果が空でもそのまま返す
*  @param1 conditions 検索条件              array
*  @param2 projection 取得するカラム名       array
*  @param3 id         キーに使用するカラム名  string
*/
TicketInstance.statics.getAllList = function (projectId, ticketId, sessionDb) {
    return new Promise((resolve, reject) => {
        let list = {};

        // チケットを1件検索する関数を定義
        const getList = (id, list, sessionDb) => {
            return new Promise((resolve2, reject2) => {
                async.parallel({
                    ticket: callback => {
                        this.list(id, sessionDb)
                            .then(list => {
                                callback(null, list);
                            })
                            .catch(err => {
                                callback(err);
                            });
                    },
                    history: callback => {
                        ticketHistoryInstance.list(id, sessionDb)
                            .then(list => {
                                callback(null, list);
                            })
                            .catch(err => {
                                callback(err);
                            });
                    }
                }, (err, result) => {
                    if (err) {
                        reject2(err);
                    } else {
                        list[id] = result.ticket;
                        list[id].ticket_histories = result.history;
                        resolve2();
                    }
                });
            });
        };

        if (ticketId) {
            getList(ticketId, list, sessionDb)
                .then(result => {
                    resolve(list);
                })
                .catch(err => {
                    reject(err);
                });
        } else {
            const conditions = {
                project_id: projectId
            };
            this.find(conditions, 'id')
                .then(async tickets => {
                    if (tickets.length > 0) {
                        for (let idx in tickets) {
                            await getList(tickets[idx].id, list);
                        }
                    }
                    resolve(list);
                })
                .catch(err => {
                    reject(err);
                });
        }
    });
};

/* 
*  _idをキーにして取得する
*  結果が空でもそのまま返す
*  @param1 ticketId  チケットID            string
*  @param2 sessionDb セッションオブジェクト object
*  @param3 object    検索結果
*/
TicketInstance.statics.list = function (ticketId, sessionDb) {
    return new Promise((resolve, reject) => {
        try {
            ticketId = mongoose.Types.ObjectId(ticketId);
            const findTicketsObj = sessionDb ? this.getAggList(ticketId).session(sessionDb).read('primary') : this.getAggList(ticketId);
            findTicketsObj
                .then(ticket => {
                    // オブジェクト展開をする
                    ticket = this.unwindObj(ticket[0], [constant.TBL_MATCH, constant.TBL_WORK, constant.TBL_NOTIFICATE]);

                    let callbacks = null;
                    switch (ticket.tracker + '') {
                        case constant.tracker_match:
                            callbacks = {
                                watchers: callback => {
                                    ticketWatcherInstance.list(ticketId, sessionDb)
                                        .then(watchers => {
                                            callback(null, watchers);
                                        })
                                        .catch(err => {
                                            callback(err);
                                        });
                                },
                                entry_members: callback => {
                                    entryMemberInstance.list(ticketId, sessionDb)
                                        .then(entryMembers => {
                                            callback(null, entryMembers);
                                        })
                                        .catch(err => {
                                            callback(err);
                                        });
                                },
                                lives: callback => {
                                    liveInstance.list(ticketId, sessionDb)
                                        .then(lives => {
                                            callback(null, lives);
                                        })
                                        .catch(err => {
                                            callback(err);
                                        });
                                }
                            };
                            break;
                        default:
                            callbacks = {
                                watchers: callback => {
                                    ticketWatcherInstance.list(ticketId, sessionDb)
                                        .then(watchers => {
                                            callback(null, watchers);
                                        })
                                        .catch(err => {
                                            callback(err);
                                        });
                                }
                            };
                            break;
                    }
                    async.parallel(callbacks, (err, result) => {
                        if (err) return reject(err);

                        for (let key in result) {
                            ticket[key] = result[key];
                        }

                        resolve(ticket);
                    });
                })
                .catch(err => {
                    reject(err);
                });
        }
        catch (err) {
            reject(err);
        }
    });
}

/* 
*  集計用インスタンスを返す
*  @return 登録情報
*/
TicketInstance.statics.getAggList = function (ticketId) {
    const conditions = {
        _id: ticketId
    };
    const projections = [
        '-_id',
        'clan_id._id',
        'clan_id.name',
        'project_id._id',
        'project_id.name',
        'writer_clan._id',
        'writer_clan.name',
        'author._id',
        'author.name',
        'writer._id',
        'writer.name',
        'limit_date',
        'shoulder._id',
        'shoulder.name',
        'tracker',
        'status',
        'description',
        'start_date',
        'end_date',
        'created',
        'modified',
        'fight_tickets.play_title._id',
        'fight_tickets.play_title.name',
        'fight_tickets.opponent._id',
        'fight_tickets.opponent.name',
        'fight_tickets.winner._id',
        'fight_tickets.winner.name',
        'fight_tickets.loser._id',
        'fight_tickets.loser.name',
        'fight_tickets.draw',
        'work_tickets.title',
        'work_tickets.progress_rate',
        'notification_tickets.title'
    ].join(' ');
    const projections2 = [
        'clan_id.user_id',
        'writer_clan.user_id',
        'fight_tickets.opponent.user_id'
    ].join(' ');
    const projections3 = [
        'clan_id.user_id._id',
        'clan_id.user_id.name',
        'writer_clan.user_id._id',
        'writer_clan.user_id.name',
        'fight_tickets.opponent.user_id._id',
        'fight_tickets.opponent.user_id.name'
    ].join(' ');

    return this.aggregate()
        .match(conditions)
        .lookup({
            from: 'clans',
            localField: 'clan_id',
            foreignField: '_id',
            as: 'clan_id'
        })
        .lookup({
            from: 'projects',
            localField: 'project_id',
            foreignField: '_id',
            as: 'project_id'
        })
        .lookup({
            from: 'clans',
            localField: 'writer_clan',
            foreignField: '_id',
            as: 'writer_clan'
        })
        .lookup({
            from: 'users',
            localField: 'author',
            foreignField: '_id',
            as: 'author'
        })
        .lookup({
            from: 'users',
            localField: 'writer',
            foreignField: '_id',
            as: 'writer'
        })
        .lookup({
            from: 'users',
            localField: 'shoulder',
            foreignField: '_id',
            as: 'shoulder'
        })
        .lookup({
            from: 'game_titles',
            localField: 'fight_tickets.play_title',
            foreignField: '_id',
            as: 'fight_tickets.play_title'
        })
        .lookup({
            from: 'clans',
            localField: 'fight_tickets.opponent',
            foreignField: '_id',
            as: 'fight_tickets.opponent'
        })
        .lookup({
            from: 'clans',
            localField: 'fight_tickets.winner',
            foreignField: '_id',
            as: 'fight_tickets.winner'
        })
        .lookup({
            from: 'clans',
            localField: 'fight_tickets.loser',
            foreignField: '_id',
            as: 'fight_tickets.loser'
        })
        .project([projections, projections2].join(' '))
        .unwind('clan_id')
        .unwind('project_id')
        .unwind('writer_clan')
        .unwind({
            path: '$author',
            preserveNullAndEmptyArrays: true
        })
        .unwind({
            path: '$writer',
            preserveNullAndEmptyArrays: true
        })
        .unwind({
            path: '$shoulder',
            preserveNullAndEmptyArrays: true
        })
        .unwind({
            path: '$fight_tickets.play_title',
            preserveNullAndEmptyArrays: true
        })
        .unwind({
            path: '$fight_tickets.opponent',
            preserveNullAndEmptyArrays: true
        })
        .unwind({
            path: '$fight_tickets.winner',
            preserveNullAndEmptyArrays: true
        })
        .unwind({
            path: '$fight_tickets.loser',
            preserveNullAndEmptyArrays: true
        })
        .lookup({
            from: 'users',
            localField: 'clan_id.user_id',
            foreignField: '_id',
            as: 'clan_id.user_id'
        })
        .lookup({
            from: 'users',
            localField: 'writer_clan.user_id',
            foreignField: '_id',
            as: 'writer_clan.user_id'
        })
        .lookup({
            from: 'users',
            localField: 'fight_tickets.opponent.user_id',
            foreignField: '_id',
            as: 'fight_tickets.opponent.user_id'
        })
        .project([projections, projections3].join(' '))
        .unwind({
            path: '$clan_id.user_id',
            preserveNullAndEmptyArrays: true
        })
        .unwind({
            path: '$writer_clan.user_id',
            preserveNullAndEmptyArrays: true
        })
        .unwind({
            path: '$fight_tickets.opponent.user_id',
            preserveNullAndEmptyArrays: true
        });
}

/* 
*  チケットを新規登録する
*  @param1 data      リクエストデータ                       object
*  @param2 tracker   トラッカー object                      int
*  @param3 authId    ログインユーザID                       string
*  @param4 sessionDb トランザクション用セッションオブジェクト object
*  @return 登録情報
*/
TicketInstance.statics.updateData = function (data, tracker, authId, sessionDb) {
    return new Promise((resolve, reject) => {
        async.waterfall([
            callback => {
                try {
                    // バリデーション
                    this.validateUp(data, tracker, authId)
                        .then(() => {
                            callback(null, true);
                        })
                        .catch(err => {
                            // バリデーション失敗
                            callback(err);
                        });
                }
                catch (err) {
                    // エラー発生
                    callback(err);
                }
            },
            (bool, callback) => {
                try {
                    const conditions = {
                        '_id': data['ticket_id']
                    };

                    this.findOne(conditions)
                        .session(sessionDb)
                        .read('primary')
                        .then(ticket => {
                            callback(null, ticket);
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
            (ticket, callback) => {
                (async (ticket, callback) => {
                    try {
                        // データ更新
                        const fightTickets = data['fight_tickets'];
                        const workTickets = data['work_tickets'];
                        const notificationTickets = data['notification_tickets'];
                        const created = data['modified'];

                        ticket.writer_clan = data['clan_id'];
                        ticket.writer = data['writer'];
                        ticket.modified = created;
                        if (data['start_date'] || data['start_date'] === '') {
                            ticket.start_date = data['start_date'];
                            ticket.end_date = data['end_date'];
                        } else if (data['limit_date']) {
                            ticket.limit_date = data['limit_date'];
                        } else if (data['status']) {
                            ticket.status = data['status'];
                            if (fightTickets) {
                                // 引き分けの場合は勝者と敗者はnulll
                                // それ以外は引き分けが0
                                isDraw = fightTickets['draw'] > 0;
                                ticket.fight_tickets.winner = isDraw ? null : mongoose.Types.ObjectId(fightTickets['winner']);
                                ticket.fight_tickets.loser = isDraw ? null : mongoose.Types.ObjectId(fightTickets['loser']);
                                ticket.fight_tickets.draw = isDraw ? 1 : 0;
                                ticket.markModified('fight_tickets');
                            }
                        } else if (data['shoulder']) {
                            ticket.shoulder = data['shoulder'];
                        } else if (fightTickets && fightTickets['play_title']) {
                            ticket.fight_tickets.play_title = mongoose.Types.ObjectId(fightTickets['play_title']);
                            ticket.markModified('fight_tickets');
                        } else if (data['description'] || (data['description'] === '')) {
                            ticket.description = data['description'];
                        } else if (workTickets) {
                            if (workTickets['progress_rate']) {
                                ticket.work_tickets.progress_rate = workTickets['progress_rate'];
                            } else if (workTickets['title']) {
                                ticket.work_tickets.title = workTickets['title'];
                            } else {
                                throw new Error('invalid data');
                            }
                            ticket.markModified('work_tickets');
                        } else if (notificationTickets && notificationTickets['title']) {
                            ticket.notification_tickets.title = notificationTickets['title'];
                            ticket.markModified('notification_tickets');
                        } else if (data['watchers']) {
                            let watchers = data['watchers'];

                            watchers[0]['ticket_id'] = data['ticket_id'];
                            watchers[0]['clan_id'] = data['clan_id'];
                            watchers[0]['created'] = created;
                            await ticketWatcherInstance.saveData(watchers, sessionDb);
                        } else if (data['entry_members']) {
                            let entryMembers = data['entry_members'];

                            entryMembers[0]['ticket_id'] = data['ticket_id'];
                            entryMembers[0]['clan_id'] = data['clan_id'];
                            entryMembers[0]['created'] = created;
                            await entryMemberInstance.saveData(entryMembers, sessionDb);
                        } else if (data['lives']) {
                            if (data['lives'][0]['live'] === constant.live_no) {
                                data['lives'][0]['live_url'] = '';
                            }
                            data['lives'][0]['ticket_id'] = data['ticket_id'];
                            data['lives'][0]['clan_id'] = data['clan_id'];
                            data['lives'][0]['modified'] = created;
                            await liveInstance.updateData(data['lives'], sessionDb);
                        } else {
                            throw new Error('invalid data');
                        }
                        ticket.save()
                            .then(ticket => {
                                callback(null, ticket);
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
                })(ticket, callback);
            }
        ], (err, result) => {
            if (err) {
                // 保存失敗。
                reject(err);
            } else {
                // 保存成功。
                resolve(result);
            }
        });
    });
}

/* 
*  チケット情報から項目を削除する
*  @param1 data      リクエストデータ                       object
*  @param2 tracker   トラッカー object                      int
*  @param3 authId    ログインユーザID                       string
*  @param4 sessionDb トランザクション用セッションオブジェクト object
*  @return 登録情報
*/
TicketInstance.statics.deleteData = function (data, tracker, authId, sessionDb) {
    return new Promise((resolve, reject) => {
        async.waterfall([
            callback => {
                try {
                    // バリデーション
                    this.validateUpCommon(data, tracker, authId)
                        .then(() => {
                            callback(null, true);
                        })
                        .catch(err => {
                            // バリデーション失敗
                            callback(err);
                        });
                }
                catch (err) {
                    // エラー発生
                    callback(err);
                }
            },
            (bool, callback) => {
                try {
                    const conditions = {
                        '_id': data['ticket_id']
                    };

                    this.findOne(conditions)
                        .session(sessionDb)
                        .read('primary')
                        .then(ticket => {
                            callback(null, ticket);
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
            (ticket, callback) => {
                (async (ticket, callback) => {
                    try {
                        // データ更新
                        ticket.writer = data['writer'];
                        ticket.modified = data['modified'];
                        if (data['watchers']) {
                            let watchers = data['watchers'];

                            watchers[0]['ticket_id'] = data['ticket_id'];
                            watchers[0]['clan_id'] = data['clan_id'];
                            await ticketWatcherInstance.deleteOne(watchers, sessionDb);
                        } else if (data['entry_members']) {
                            let entryMembers = data['entry_members'];

                            entryMembers[0]['ticket_id'] = data['ticket_id'];
                            entryMembers[0]['clan_id'] = data['clan_id'];
                            await entryMemberInstance.deleteOne(entryMembers, sessionDb);
                        } else {
                            throw new Error('invalid data');
                        }
                        ticket.save()
                            .then(ticket => {
                                callback(null, ticket);
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
                })(ticket, callback);
            }
        ], (err, result) => {
            if (err) {
                // 保存失敗。
                reject(err);
            } else {
                // 保存成功。
                resolve(result);
            }
        });
    });
}

/* 
*  チケットを新規登録する
*  @param1 data      リクエストデータ                       object
*  @param2 sessionDb トランザクション用セッションオブジェクト object
*  @return 登録情報
*/
TicketInstance.statics.saveData = function (data, tracker, authId, sessionDb) {
    return new Promise((resolve, reject) => {
        // 保存データの作成
        async.waterfall([
            callback => {
                try {
                    // バリデーション
                    this.validateCr(data.common, tracker, authId)
                        .then(() => {
                            callback(null, true);
                        })
                        .catch(err => {
                            // バリデーション失敗
                            callback(err);
                        });
                }
                catch (err) {
                    // エラー発生
                    callback(err);
                }
            },
            (bool, callback) => {
                try {
                    // 保存処理
                    this.create([data.common], { session: sessionDb })
                        .then(ticket => {
                            // 保存成功
                            callback(null, ticket[0].id);
                        })
                        .catch(err => {
                            // エラーがあれば失敗
                            callback(err);
                        });
                }
                catch (err) {
                    // エラー発生
                    callback(err);
                }
            },
            (ticketId, callback) => {
                // リレーション
                try {
                    if (tracker === constant.tracker_match) {
                        let callbacks = {};
                        // 保存データの作成
                        const watchers = data.watchers;
                        const entryMembers = data.entryMembers;
                        const lives = data.lives;
                        for (let idx in watchers) {
                            watchers[idx].ticket_id = ticketId;
                        }
                        for (let idx in entryMembers) {
                            entryMembers[idx].ticket_id = ticketId;
                        }
                        for (let idx in lives) {
                            lives[idx].ticket_id = ticketId;
                        }

                        // コールバック関数の作成
                        const watchersFunc = callback2 => {
                            ticketWatcherInstance.saveData(watchers, sessionDb)
                                .then(watcher => {
                                    callback2(null, watcher);
                                })
                                .catch(err => {
                                    callback2(err);
                                });
                        };
                        const entryMembersFunc = callback2 => {
                            entryMemberInstance.saveData(entryMembers, sessionDb)
                                .then(entryMember => {
                                    callback2(null, entryMember);
                                })
                                .catch(err => {
                                    callback2(err);
                                });
                        };
                        const livesFunc = callback2 => {
                            liveInstance.saveData(lives, sessionDb)
                                .then(live => {
                                    callback2(null, live);
                                })
                                .catch(err => {
                                    callback2(err);
                                });
                        };

                        // コールバック関数のリストを作成
                        if (watchers.length > 0) {
                            callbacks.watchers = watchersFunc;
                        }
                        if (entryMembers.length > 0) {
                            callbacks.entryMembers = entryMembersFunc;
                        }
                        callbacks.lives = livesFunc;

                        async.parallel(callbacks, (err, result) => {
                            if (err) {
                                callback(err);
                            } else {
                                callback(null, ticketId);
                            }
                        });
                    } else {
                        callback(null, ticketId);
                    }
                }
                catch (err) {
                    // エラー発生
                    callback(err);
                }
            }
        ], (err, ticketId) => {
            if (err) {
                // 保存失敗
                reject(err);
            } else {
                // 保存成功
                resolve(ticketId);
            }
        });
    });
};

/* 
*  どちらかのクランのオーナーであるか確認
*  @param1 value    ユーザID       string
*  @param2 ticketId チケットID     string
*  @param3 clans    クランIDリスト  array
*  @return bool
*/
TicketInstance.statics.isSomeOwner = function (value, ticketId, clans) {
    return new Promise((resolve, reject) => {
        async.waterfall([
            callback => {
                try {
                    // 更新時は対象チケットからクランIDリストを作成する
                    if (ticketId) {
                        let conditions = {
                            _id: ticketId
                        };

                        this.findOne(conditions)
                            .exec()
                            .then(ticket => {
                                if (!ticket) throw new Error('ticket not found');
                                callback(null, [
                                    ticket.clan_id,
                                    ticket.fight_tickets.opponent
                                ]);
                            })
                            .catch(err => {
                                callback(err);
                            });
                    } else {
                        // 新規登録時
                        callback(null, clans);
                    }
                }
                catch (err) {
                    // エラー発生
                    callback(err);
                }
            },
            (clans, callback) => {
                try {
                    let conditions = {
                        _id: {
                            $in: clans
                        },
                        deleted: constant.FLG_NO
                    };
                    let projection = {
                        'user_id': 1
                    };
                    clanInstance.toList(conditions, projection)
                        .then(owners => {
                            callback(null, owners.indexOf(value) !== -1);
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
        ], (err, bool) => {
            if (err) {
                // 確認失敗
                reject(err);
            } else {
                // 確認成功
                resolve(bool);
            }
        });
    });
};

/* 
*  クランのオーナーあるいはメンバーであるか判定する
*  @param1 userId ユーザID  string       
*  @param2 clanId クランID  string
*  return  bool   判定結果
*/
TicketInstance.statics.isRelatedUserForClan = function (userId, clanId) {
    return new Promise((resolve, reject) => {
        clanInstance.getRelatedUser(clanId)
            .then(users => {
                users = users.map(user => {
                    return user + '';
                });
                resolve(users.indexOf(userId) !== -1);
            })
            .catch(err => {
                // エラー発生
                reject(err);
            });
    });
};

/* 
*  登録クランIDと対戦相手の何れかであることを確認する
*  @param1 clanId   クランID       string
*  @param2 ticketId チケットID     string
*  @return bool
*/
TicketInstance.statics.isSomeClan = function (clanId, ticketId) {
    return new Promise((resolve, reject) => {
        try {
            const clans = [];
            this.findById(ticketId)
                .then(ticket => {
                    clans.push(ticket.clan_id + '');
                    clans.push(ticket.fight_tickets.opponent + '');
                    resolve(clans.indexOf(clanId) !== -1);
                })
                .catch(err => {
                    // エラー発生
                    reject(err);
                });
        }
        catch (err) {
            // エラー発生
            reject(err);
        }
    });
};

/* 
*  チケット情報の説明を取得する
*  @param1 id 　　　　    取得するチケットID string
*  @param2 userId 　　　　ログインユーザID   string
*  @return promiseObject
*/
TicketInstance.statics.getDescription = function (id, userId) {
    return new Promise((resolve, reject) => {
        async.waterfall([
            callback => {
                // バリデーション
                this.validateTicketId(id, userId)
                    .then(bool => {
                        callback(null, bool);
                    })
                    .catch(err => {
                        // エラー発生
                        callback(err);
                    });
            },
            (bool, callback) => {
                this.findById(id, 'description')
                    .exec()
                    .then(ticket => {
                        callback(null, ticket.description);
                    })
                    .catch(err => {
                        // エラー発生
                        callback(err);
                    });
            }
        ], (err, result) => {
            if (err) {
                // エラー発生
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

module.exports = mongoose.model('Ticket', TicketInstance)

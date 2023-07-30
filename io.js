const express = require('express'),
    app = express(),
    config = require('./config/config')[app.get('env')],
    Server = require('socket.io'),
    Redis = require('./util/myIoredis'),
    csrf = require('./config/middlewares/io/csrf'),
    sessionMiddleware = require('./config/middlewares/sessionMiddleware'),
    Log4js = require('log4js'),
    searchDataController = require('./controllers/searchDataController')(),
    clanController = require('./controllers/clanController')(),
    projectController = require('./controllers/projectController')(),
    routineController = require('./controllers/routineController')(),
    inviteController = require('./controllers/inviteController')(),
    ticketController = require('./controllers/ticketController')(),
    clanInstance = require('./models/clanInstance.js');

class Io {

    constructor(http) {
        this.systemLogger = Log4js.getLogger('system');
        this.accessLogger = Log4js.getLogger('access');
        this.errorLogger = Log4js.getLogger('error');
        this.subscribers = {};                          // クランごとのサブスクライブユーザリスト
        this.subscribes = {};                           // ユーザごとのサブスクライブリスト
        this.io = new Server(http);
        this.initializeRedis();
    }

    initializeRedis() {
        this.pub = new Redis();
        this.sub = new Redis();
        
        this.pub.on('connect', () => { 
            this.systemLogger.info({
                message: 'connect ioRedis'
            });
        });
        this.sub.on('message', (channel, message) => {
            try {
                for (let id in this.subscribers[channel]) {
                    let clientIo = this.subscribers[channel][id];
                    clientIo.emit('update', JSON.parse(message));
                }
            }
            catch (err) {
                this.errorLogger.info(err);
            }
        });
    }

    emitIoError(err) {
        this.errorLogger.info(err);
        this.io.sockets.emit('ioError', {
            message: err.message,
            stack: err.stack
        });
    }

    /* 
    *  指定されたクランのサブスクライバ―にデータをパブリッシュする
    *  @param1 clanIds 対象クランリスト   array
    *  @param2 data    パブリッシュデータ object
    */
    publish(clanIds, data) {
        for (let idx in clanIds) {
            let clanId = clanIds[idx];
            this.pub.publish(clanId, JSON.stringify(data));
        }
    }

    /* 
    *  所属クランごとにサブスクライブする
    *  承諾済みでないクランは含まない
    *  @param1 socket socket.ioインスタンス object
    */
    subscribe(socket) {
        // クラン情報の取得
        clanInstance.getTrueMyclanWithStatus(socket.request.session.passport.user._id)
        .then(clans => {
            for (let idx in clans) {
                let clanId = clans[idx].id;
                // サブスクライブクライアントが存在しなければ作成する
                if (!this.subscribers[clanId]) {
                    this.sub.subscribe(clanId);
                    this.subscribers[clanId] = {};
                }
                this.subscribers[clanId][socket.id] = socket;
                this.subscribes[socket.id].push(clanId);
            }
        })
        .catch(err => {
            // エラー発生
            this.emitIoError(err);
        });
    }

    /* 
    *  所属するクランのサブスクライバ―が存在しなければクライアントインスタンスを削除する
    *  ユーザのサブスクライブ情報も削除する
    *  @param1 socket socket.ioインスタンス object
    */
    unsubscribe(socket) {
        try {
            for (let idx in this.subscribes[socket.id]) {
                let clanId = this.subscribes[socket.id][idx];
    
                // サブスクライバ―の最後の一人の場合はクライアントインスタンスを削除する
                if (Object.keys(this.subscribers[clanId]).length == 1) {
                    this.sub.unsubscribe(clanId);
                    delete this.subscribers[clanId];
                } else {
                    // クランのサブスクライバ―から削除
                    delete this.subscribers[clanId][socket.id];
                }
            }
            // ユーザのサブスクライブ情報を削除
            delete this.subscribes[socket.id];
        }
        catch (err) {
            // エラー発生
            this.emitIoError(err);
        }
    }

    listen() {
        try {
            this.io.use(function (socket, next) {
                sessionMiddleware(socket.request, socket.request.res, next);
            });
            this.io.use(csrf);
            this.io.on('connection', (socket) => {
                try {
                    this.systemLogger.info({
                        user: socket.request.session.passport.user._id,
                        message: 'connect "/"'
                    });
                    this.subscribes[socket.id] = [];

                    // 所属クランごとにサブスクライブする
                    this.subscribe(socket);
                    
                    // 切断
                    socket.on('disconnect', () => {
                        try {
                            // サブスクライブの解除
                            this.unsubscribe(socket);
                            this.systemLogger.info({
                                user: socket.request.session.passport.user._id,
                                message: 'io disconnect'
                            });
                        }
                        catch (err) {
                            this.emitIoError(err);
                        }
                    });
                }
                catch (err) {
                    this.emitIoError(err);
                }
            });
            this.io.of('/searchData').use(csrf);
            this.io.of('/searchData').on('connection', function (searchDataSock) {
                // console.log('searchData connected');
                searchDataSock.on('searchMembers', (data, func) => {
                    // メンバー候補を検索する
                    searchDataController.searchMembers(searchDataSock, data)
                        .then(result => {
                            func(null, result);
                        })
                        .catch(err => {
                            this.errorLogger.info(Object.assign(err, {data: data}));
                            func(err.message);
                        });
                });
                searchDataSock.on('searchPlayTitles', (data, func) => {
                    // ゲームタイトルを検索する
                    searchDataController.searchPlayTitles(searchDataSock, data)
                        .then(result => {
                            func(null, result);
                        })
                        .catch(err => {
                            this.errorLogger.info(Object.assign(err, {data: data}));
                            func(err.message);
                        });
                });
                searchDataSock.on('searchOpponent', (data, func) => {
                    // ゲームタイトルを検索する
                    searchDataController.searchOpponent(searchDataSock, data)
                        .then(result => {
                            func(null, result);
                        })
                        .catch(err => {
                            this.errorLogger.info(Object.assign(err, {data: data}));
                            func(err.message);
                        });
                });
            });
            this.io.of('/routine').use(csrf);
            this.io.of('/routine').on('connection', function (routineSock) {
                // console.log('routine connected');
                // routineSock.on('selectAll', (data, func) => {
                //     // 所属するクラン情報と各種マスタデータの取得
                //     routineController.selectAll(routineSock, data, func);
                // });
                routineSock.on('selectRelatedClan', (data, func) => {
                    // マイクランの情報を取得する
                    routineController.selectRelatedClan(routineSock, data, func);
                });
            });
            this.io.of('/clans').use(csrf);
            this.io.of('/clans').on('connection', clanSock => {
                // console.log('clans connected');
                clanSock.on('createGameTitles', (data, func) => {
                    // ゲームタイトル・プレイタイトルの登録
                    clanController.createGameTitles(clanSock, data, func);
                });
                clanSock.on('deletePlayTitles', (data, func) => {
                    // プレイタイトルの削除
                    clanController.deletePlayTitles(clanSock, data, func);
                });
                clanSock.on('updatePlayTitles', (data, func) => {
                    // プレイタイトルの削除
                    clanController.updatePlayTitles(clanSock, data)
                        .then(result => {
                            this.publish([data.clan_id], Object.assign(result, {
                                user: clanSock.request.session.passport.user._id
                            }));
                            func(null, result);
                        })
                        .catch(err => {
                            this.errorLogger.info(err);
                            func(err.message);
                        });
                });
                clanSock.on('updateMember', (data, func) => {
                    // メンバーの作成と招待
                    clanController.updateMember(clanSock, data, func);
                });
                clanSock.on('deleteMember', (data, func) => {
                    // プレイタイトルの削除
                    clanController.deleteMember(clanSock, data, func);
                });
                clanSock.on('update', (data, func) => {
                    // プレイタイトルの削除
                    clanController.update(clanSock, data, func);
                });
                clanSock.on('uploadProfImage', (data, func) => {
                    // プロフィール画像を保存する
                    clanController.uploadProfImage(clanSock, data, func);
                });
            });
            this.io.of('/projects').use(csrf);
            this.io.of('/projects').on('connection', projectSock => {
                try {
                    // プロジェクトを作成する
                    projectSock.on('create', (data, func) => {
                        projectController.create(projectSock, data)
                            .then(result => {
                                this.publish([data.clan_id], Object.assign(result, {
                                    user: projectSock.request.session.passport.user._id
                                }));
                                func(null, result);
                            })
                            .catch(err => {
                                this.errorLogger.info(err);
                                func(err.message);
                            });
                    });
                }
                catch (err) {
                    this.emitIoError(err);
                }
            });
            this.io.of('/invites').use(csrf);
            this.io.of('/invites').on('connection', inviteSock => {
                try {
                    // this.systemLogger.info({
                    //     user: inviteSock.request.session.passport.user._id,
                    //     message: 'connect "/invites"'
                    // });
                    // 招待を承諾する
                    inviteSock.on('agree', (data, func) => {
                        // 招待を承諾する
                        inviteController.agree(inviteSock, data)
                            .then(result => {
                                this.publish([data.clan_id], Object.assign(result, {
                                    user: inviteSock.request.session.passport.user._id
                                }));
                                func(null, result);
                            })
                            .catch(err => {
                                this.errorLogger.info(err);
                                func(err.message);
                            });
                    });
                    //招待を拒否する
                    inviteSock.on('disAgree', (data, func) => {
                        // 招待を承諾する
                        inviteController.disAgree(inviteSock, data)
                            .then(result => {
                                this.publish([data.clan_id], Object.assign(result, {
                                    user: inviteSock.request.session.passport.user._id
                                }));
                                func(null, result);
                            })
                            .catch(err => {
                                this.errorLogger.info(err);
                                func(err.message);
                            });
                    });
                }
                catch (err) {
                    this.emitIoError(err);
                }
            });
            this.io.of('/tickets').use(csrf);
            this.io.of('/tickets').on('connection', ticketSock => {
                // console.log('tickets connected');
                ticketSock.on('create', (data, func) => {
                    // チケットを新規登録する
                    ticketController.create(ticketSock, data)
                        .then(result => {
                            this.publish([data.clan_id], {
                                user: ticketSock.request.session.passport.user._id,
                                ticket: result.ticket
                            });
                            func(null, result);
                        })
                        .catch(err => {
                            this.errorLogger.info(Object.assign(err, {data: data}));
                            func(err.message);
                        });
                });
                ticketSock.on('update', (data, func) => {
                    // チケットを新規登録する
                    ticketController.update(ticketSock, data)
                        .then(result => {
                            this.publish([data.clan_id], {
                                user: ticketSock.request.session.passport.user._id,
                                ticket: result
                            });
                            func(null, result);
                        })
                        .catch(err => {
                            this.errorLogger.info(Object.assign(err, {data: data}));
                            func(err.message);
                        });
                });
                ticketSock.on('delete', (data, func) => {
                    // チケットを新規登録する
                    ticketController.delete(ticketSock, data)
                        .then(result => {
                            this.publish([data.clan_id], {
                                user: ticketSock.request.session.passport.user._id,
                                ticket: result
                            });
                            func(null, result);
                        })
                        .catch(err => {
                            this.errorLogger.info(Object.assign(err, {data: data}));
                            func(err.message);
                        });
                });
            });
        }
        catch (err) {
            this.emitIoError(err);
        }
    }
}

module.exports = (http) => {
    return new Io(http);
};
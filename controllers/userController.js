const Controller = require('./controller.js'),
    async = require('async'),
    fs = require('fs'),
    constant = require('../config/constant'),
    imgIo = require('../util/ImgIo');

class UserController extends Controller {
    index(req, res) {
        this.setAccessLog(req, 'login');
        res.render('User/index', { title: 'ログイン', message: req.flash('message') });
    }

    logout(req, res) {
        this.setAccessLog(req, 'logout');
        req.logout();
        res.redirect('/Users/login');
    }

    getProfileImage(req, res) {

        function imageNotFound(res, err, self) {
            self.errorLogger.info(err);
            res.writeHead(404, { 'Content-Type': 'text/plain;charset=utf-8' });
            res.end();
        }

        try {
            let userId = req.query.user;

            if (!userId) throw new Error('userId is required');

            async.waterfall([
                callback => {
                    // try {
                    //     // 登録済みの拡張子を取得する
                    //     userInstance.findById(userId, 'prof_ext')
                    //         .exec()
                    //         .then(user => {
                    //             callback(null, user.prof_ext);
                    //         })
                    //         .catch(err => {
                    //             // DBエラー
                    //             callback(err);
                    //         });
                    // }
                    // catch (err) {
                    //     // エラー発生
                    //     callback(err);
                    // }
                    callback(null, null);
                },
                (ext, callback) => {
                    try {
                        // 読み込むファイルの情報を取得する
                        const imgIoInstance = new imgIo();

                        imgIoInstance.getProfileInfo(userId, ext, constant.IDENTIFIER_USER)
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
}

module.exports = () => {
    return new UserController();
};

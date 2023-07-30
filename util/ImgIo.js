const async = require('async'),
    constant = require('../config/constant'),
    fs = require('fs'),
    fsPromises = fs.promises,
    path = require('path'),
    imageType = require('image-type'),
    readChunk = require('read-chunk'),
    utilFunc = require('./functions');

/*
*  画像を保存する
*/
class ImgIo {
    /* 
    *  画像の形式が正しいか確認する
    *  @param1 ext 保存する画像の拡張子 string
    *  @param2 file 保存する画像       FileObject
    *  @return promise
    */
    checkImage(ext, file) {
        return new Promise((resolve, reject) => {
            try {
                const typeCombination = {
                    png: constant.TYPE_PNG,
                    gif: constant.TYPE_GIF,
                    jpg: constant.TYPE_JPEG
                };

                // ファイルがバッファではない（画像ファイル）の場合はバッファに変換
                if (!Buffer.isBuffer(file)) {
                    file = readChunk.sync(file, 0, fs.statSync(file).size);
                }
                let type = imageType(file);

                for (let key in typeCombination) {
                    if (ext === key && type.mime === typeCombination[key]) {
                        return resolve(true);
                    }
                }
                reject(new Error('invalid image'));
            }
            catch (err) {
                reject(err);
            }
        });
    }

    /* 
    *  クランのプロフィール画像を登録する
    *  @param1 clanId 保存するクランのID      string
    *  @return ext    保存したファイルの拡張子 string
    */
    uploadClanProfile(clanId, fileName, writeFile) {
        return new Promise((resolve, reject) => {
            try {
                let ext = utilFunc.getExtension(fileName);
                async.waterfall([
                    callback => {
                        // 画像の形式が正しか確認する
                        this.checkImage(ext, writeFile)
                            .then(noUse => {
                                // 画像の形式が正しい
                                callback(null, null);
                            })
                            .catch(err => {
                                // 画像の形式が正しくない
                                callback(err);
                            });
                    }, (noUse, callback) => {
                        try {
                            let writePath = path.join(constant.CLANPROFIMGDIR, path.format({
                                name: clanId,
                                ext: '.' + ext
                            }));

                            fsPromises.writeFile(writePath, writeFile)
                                .then(() => {
                                    // 保存成功
                                    callback(null, null);
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
                ], (err, result) => {
                    if (err) {
                        // 保存失敗
                        reject(err);
                    } else {
                        // 保存成功
                        resolve(ext);
                    }
                });
            }
            catch (err) {
                // エラー発生
                reject(err);
            }
        });
    }

    /* 
    *  クランのプロフィール画像の情報を返す
    *  拡張子存在すれば登録済みの画像情報を返し、未登録あるいは画像が存在しない場合にはデフォルトの画像情報を返す
    *  @param1 clanId   保存するクランのID          string
    *  @param2 ext      登録済みの拡張子            string
    *  @return fileInfo ファイルパスと拡張子のセット object
    */
    getProfileInfo(id, ext,  identifier) {
        return new Promise((resolve, reject) => {
            try {
                async.waterfall([
                    callback => {
                        try {
                            let tmpDir = ''; // アップロード先ディレクトリ
                            let defaultImgNm = ''; // デフォルト画像名
                            if (identifier === constant.IDENTIFIER_USER) {
                                tmpDir = constant.USERPROFIMGDIR;
                                defaultImgNm = constant.USERPROFIMG;
                            } else if (identifier === constant.IDENTIFIER_CLAN) {
                                tmpDir = constant.CLANPROFIMGDIR;
                                defaultImgNm = constant.CLANPROFIMG;
                            }
                            let defaultFilePath = path.join('public/images', defaultImgNm); //デフォルト画像のフルパス
                            let defaultExt = path.extname(defaultFilePath).slice(1); // //デフォルト画像の拡張子
                            let filePath = '';

                            // 拡張子が存在しない（画像未登録）場合はデフォルト画像を読み込む
                            if (!ext) {
                                ext = defaultExt;
                                filePath = defaultFilePath;
                            } else {
                                filePath = path.join(tmpDir, path.format({
                                    name: id,
                                    ext: '.' + ext
                                }));
                            }

                            // ファイルの存在を確認する
                            fs.open(filePath, 'r', (err, fd) => {
                                try{
                                    if (err) {
                                        // ファイルが存在しなければデフォルト画像を読み込む
                                        if (err.code === 'ENOENT') {
                                            return callback(null, {
                                                ext: defaultExt,
                                                filePath: defaultFilePath
                                            });
                                        }
                                        // 不明なエラー
                                        callback(err);
                                    } else {
                                        // ファイルが存在すれば読み込む
                                        callback(null, {
                                            ext: ext,
                                            filePath: filePath
                                        });
                                    }
                                }
                                catch(err){
                                    // 不明なエラー
                                    callback(err);
                                }
                            });
                        }
                        catch (err) {
                            // エラー発生
                            callback(err);
                        }
                    }
                ], (err, fileInfo) => {
                    try{
                        if (err) {
                            // エラー発生
                            reject(err);
                        } else {
                            // 画像の形式を確認する
                            this.checkImage(fileInfo.ext, fileInfo.filePath)
                                .then(bool => {
                                    // 正しい形式
                                    resolve(fileInfo);
                                })
                                .catch(err => {
                                    // 画像の形式が不正か不明なエラーが発生
                                    reject(err);
                                });
                        }
                    }
                    catch(err){
                        // エラー発生
                        reject(err);
                    }
                });
            }
            catch (err) {
                reject(err);
            }
        });
    }
}

module.exports = ImgIo;
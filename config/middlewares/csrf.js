/*
 * csrf認証用ミドルウェア
 */
const csrf = require('csrf');

module.exports = (req, res, next) => {
    let tokens = new csrf();
    let method = req.method.toLowerCase(); // メソッド名をキャッシュしておく
    // POSTならトークンを確認
    if(method === 'post'){
        let token = req.body._csrf;
        let secret = req.session._csrf;

        // ミスマッチならGETに変更
        const dateObj = new Date;
        let date = dateObj.setTime(dateObj.getTime() + 1000*60*60*9);
        console.log('/** This is a normal http request **/');
        console.log('secret='+secret);
        console.log('token='+token);
        console.log('invalid csrf='+(tokens.verify(secret, token) === false));
        console.log('request path='+req.path);
        console.log('time='+new Date(date));
        if(tokens.verify(secret, token) === false){
            req.method = 'GET';
        }else{
            return next();
        }
    }

    // トークンを再生成
    let secret = tokens.secretSync();
    let token = tokens.create(secret);
    req.session._csrf = secret;
    res.locals._csrf = token;
    next();
};
/*
 * csrf認証用ミドルウェア
 */
const csrf = require('csrf');

module.exports = (socket, next) => {
    try {
        const tokens = new csrf();
        let token = socket.request._query.tkn;
        let secret = socket.request.session._csrf;
        const dateObj = new Date;
        let date = dateObj.setTime(dateObj.getTime());
        console.log('/** This is a socket.io request **/');
        console.log('secret='+secret);
        console.log('token='+token);
        console.log('invalid csrf=' + (tokens.verify(secret, token) === false));
        console.log('name space=' + socket.nsp.name);
        console.log('time=' + new Date(date));
        if (tokens.verify(secret, token) === false) {
            next(new Error('invalid token'));
        }
        next();
    }
    catch (err) {
        next(err);
    }
};
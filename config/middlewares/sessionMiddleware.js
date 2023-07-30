/*
 * csrf認証用ミドルウェア
 */
const session = require('express-session'),
      RedisStore = require('connect-redis')(session),
      myIoredis = require('../../util/myIoredis'),
      redis = new myIoredis();

module.exports = session({
    store: new RedisStore({ client: redis }),
    secret: 'HogeFuga',
    saveUninitialized : true,
    rolling : true
});
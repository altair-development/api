/*
 * viewテンプレート変数への受け渡し
 */
const constant = require('../constant');

module.exports = (req, res, next) => {
    res.locals.constant = constant;

    next();
};
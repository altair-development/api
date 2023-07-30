const Log4js = require('log4js');

module.exports = (err, req, res, next) => {
    if (!req.xhr) {
        const errorLogger = Log4js.getLogger('error');
        errorLogger.info(err);
    }
    next()
};
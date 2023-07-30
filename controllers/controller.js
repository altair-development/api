const Log4js = require('log4js');

class Controller {

    constructor() {
        this.systemLogger = Log4js.getLogger('system');
        this.accessLogger = Log4js.getLogger('access');
        this.errorLogger = Log4js.getLogger('error');
    }

    setAccessLog(req, page) {
        let userAgent = req.headers['user-agent'];

        this.accessLogger.info(userAgent + ' ' + page);
    }
}

module.exports = Controller;
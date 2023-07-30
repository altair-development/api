const express = require('express'),
      app = express(),
      auth = require('basic-auth');

const admins = {
  'altair-dev': { password: '0zfMFZ7P' },
};

module.exports = (req, res, next) => {
    let user = auth(req);
    
    if (!req.headers['user-agent'] !== 'ELB-HealthChecker/2.0') {
        if (app.get('env') === 'staging' && (!user || !admins[user.name] || admins[user.name].password !== user.pass)) {
            res.set('WWW-Authenticate', 'Basic realm="altair-dev"');
            return res.status(401).send();
        }
    }
    
    return next();
};
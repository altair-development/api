let User = require('../models/userInstance.js');
let passport = require('passport');

module.exports = () => {

    passport.serializeUser((user, done) => {
        done(null, {
            _id: user._id,
            name: user.name
        });
    });

    passport.deserializeUser((id, done) => {
        User.findOne({_id: id}, (err, user) => {
            done(err, {
                _id: user._id,
                name: user.name
            });
        });
    });

    // 利用するstrategyを設定
    passport.use(require('./passport/local'));
};
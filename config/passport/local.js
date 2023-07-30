const User = require('../../models/userInstance.js');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

module.exports = new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
    },
    (req, username, password, done) => {
        User.findOne({ email: username })
            .exec()
            .then((user) => {
                    if (!user) {
                        return done(null, false, req.flash('message', 'Invalid username or password.'));
                    }
                    bcrypt.compare(password, user.password, (err, res) => {
                        if(res === true) {
                            return done(null, user);
                        }else{
                            return done(null, false, req.flash('message', 'Invalid username or password.'));
                        }
                    });
                }, (err) => {
                    return done(err);
                }
            );
    }
);
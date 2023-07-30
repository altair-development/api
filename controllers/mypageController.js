const Clan = require('../models/clanInstance.js');

exports.index = (req, res) => {
    Clan.getTrueMyclanWithStatus(req.session.passport.user, true)
    .then(clans => {
        res.render('Mypage/index', {
            clans: clans,
            auth_id: req.session.passport.user._id,
            auth_name: req.session.passport.user.name
        });
    })
    .catch(err => {
        res.render('Mypage/index', {clans: null, message: err.message});
    });
};
const express = require('express'),
    router = express.Router(),
    passport = require('passport'),
    user_controller = require('../controllers/userController')();

router.get('/login', (req, res) => {
    user_controller.index(req, res);
});
router.post('/login', passport.authenticate('local', { successRedirect: '/Mypages', failureRedirect: '/Users/login', failureFlash: true }));
router.get('/logout', (req, res) => {
    user_controller.logout(req, res);
});
router.get('/getProfileImage', (req, res) => {
    user_controller.getProfileImage(req, res);
});

module.exports = router;
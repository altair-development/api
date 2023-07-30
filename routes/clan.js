const express = require('express');
const router = express.Router();
const clanController = require('../controllers/clanController')();

router.post('/create', clanController.create);
router.get('/getProfileImage', (req, res) => {
    clanController.getProfileImage(req, res);
});
router.get('/getDescription', (req, res, next) => {
    clanController.getDescription(req, res, next);
});

module.exports = router;
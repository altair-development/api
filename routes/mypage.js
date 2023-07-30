const express = require('express');
const router = express.Router();
const mypage_controller = require('../controllers/mypageController');

router.get(/\/(index)?/, mypage_controller.index);

module.exports = router;
const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController')();

router.get('/getDescription', (req, res, next) => {
    ticketController.getDescription(req, res, next);
});

module.exports = router;
let express = require('express');
let router = express.Router();

let index_controller = require('../controllers/indexController')();

router.get('/', (req, res) => {
    index_controller.index(req, res);
});
router.post('/', (req, res) => {
    index_controller.index(req, res);
});

module.exports = router;
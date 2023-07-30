module.exports = (req, res, next) => {
    res.status(404);
    if (!req.xhr) {
        res.render('404');
    }
};
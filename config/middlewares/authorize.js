module.exports = (req, res, next) => {

    if(req.isAuthenticated())
        return next();  // ログイン済み
    // ログインしてなかったらログイン画面に飛ばす
    req.flash('message', 'ログインが必要です。');
    res.redirect("/Users/login");
};
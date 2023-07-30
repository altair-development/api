const User = require('../models/userInstance.js'),
    Controller = require('./controller.js'),
    bcrypt = require('bcrypt'),
    saltRounds = 10;

class IndexController extends Controller {

    redirectTop(req, res) {
        req.flash('fail', 'アカウントの作成に失敗しました。');
        return res.redirect('/');
    }

    index(req, res) {
        if (req.method == 'POST') { // ユーザ登録 => マイページトップ
            bcrypt.hash(req.body.password, saltRounds)
                .then((hash) => {
                    const date = new Date;
                    const newUser = new User({
                        email: req.body.email,
                        password: hash,
                        created: date.setTime(date.getTime())
                    });

                    newUser.save()
                        .then((data) => {
                            req.login(newUser, (err) => {
                                if (err) {
                                    throw err;
                                }
                                // TODO なぜかすぐにredirectするとmypageのisAuthenticatedが失敗する
                                setTimeout(() => {
                                    return res.redirect('/Mypages');
                                }, 1000);
                                // return res.redirect('/Mypages');
                            });
                        }, (err) => {
                            throw err;
                        }
                        )
                        .catch((err) => {
                            this.redirectTop(req, res, 'アカウントの作成に失敗しました。');
                        });
                })
                .catch((err) => {
                    this.redirectTop(req, res, 'アカウントの作成に失敗しました。');
                });
        } else { // ユーザ登録画面表示
            this.setAccessLog(req, 'home');
            res.render('index', {
                title: 'ホーム',
                expressFlash: req.flash('fail')
            });
        }
    }
}

module.exports = () => {
    return new IndexController();
};
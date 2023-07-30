const express = require('express'),
    app = express(),
    http = require('http').Server(app),
    path = require('path'),
    bodyparser = require('body-parser'),
    mongoose = require('mongoose'),
    flash = require('express-flash'),
    passport = require('passport'),
    config = require('./config/config')[app.get('env')],
    log4js = require('log4js'),
    initializeCmlArgs = require('./util/initializeCmlArgs'),
    debugHeapMemory = require('./util/debugHeapMemory'),
    PORT = process.env.PORT || config.port,
    sessionMiddleware = require('./config/middlewares/sessionMiddleware'),
    myPassport = require('./config/passport'),
    ioInstance = require('./io')(http),
    responseHeader = require('./config/middlewares/responseHeader'),
    locals = require('./config/middlewares/locals'),
    csrf = require('./config/middlewares/csrf'),
    authorize = require('./config/middlewares/authorize'),
    basicAuth = require('./config/middlewares/basicAuth'),
    pageNotFound = require('./config/middlewares/404'),
    errorHandler = require('./config/middlewares/errorHandler'),
    indexRouter = require('./routes/index'),
    userRouter = require('./routes/user'),
    mypageRouter = require('./routes/mypage'),
    clanRouter = require('./routes/clan'),
    ticketRouter = require('./routes/ticket');

// グローバル変数
global.appRoot = path.resolve(__dirname);
global.argv = initializeCmlArgs();

// DB接続
const mongo_db_host = process.env.MONGO_DB_HOST ? process.env.MONGO_DB_HOST : "mongodb://localhost:20000,localhost:20001,localhost:20002/altair",
      mongo_db_user = process.env.MONGO_DB_USER_ALTAIR ? process.env.MONGO_DB_USER_ALTAIR : "",
      mongo_db_pass = process.env.MONGO_DB_PASS_ALTAIR ? process.env.MONGO_DB_PASS_ALTAIR : "",
      mongo_db_replset = process.env.MONGO_DB_REPLSET ? process.env.MONGO_DB_REPLSET : "repl";      

mongoose.connect(
    mongo_db_host,
    {
        useFindAndModify: config.mongodb.replication.useFindAndModify,
        replicaSet: mongo_db_replset,
        readConcern: {
            level: config.mongodb.replication.readConcern.level
        },
        user: mongo_db_user,
        pass: mongo_db_pass
    },
    (err) => {
        if (err) {
            console.error(err);
        } else {
            console.log("successfully connected to MongoDB.");
        }
    }
);

debugHeapMemory();
log4js.configure(config.log4js.configure);

app.set('views', __dirname + '/views');
app.set('view engine', 'pug');
app.use(basicAuth);
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyparser());
app.use(sessionMiddleware);
app.use(csrf);
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(locals);
app.use(responseHeader);
app.use('/', indexRouter);
app.use('/Users', userRouter);
app.use('/Mypages', authorize, mypageRouter);
app.use('/Clans', authorize, clanRouter);
app.use('/Tickets', authorize, ticketRouter);
app.use(errorHandler);
app.use(pageNotFound);

myPassport();
ioInstance.listen();

http.listen(PORT, () => {
    console.log('env:' + app.get('env'));
    console.log('server listening. Port:' + PORT);
});
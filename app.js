var express = require('express'),
	partials = require('express-partials'),
	app = express(),
	routes = require('./routes'),
	errorHandlers = require('./middleware/errorhandlers'),
	log = require('./middleware/log'),
	cookieParser = require('cookie-parser'),
	bodyParser = require('body-parser'),
	csrf = require('csurf'),
	session = require('express-session'),
	RedisStore = require('connect-redis')(session),
	mUtil = require('./middleware/utilities'),
	flash = require('connect-flash'),
	config = require('./config'),
	io = require('./socket.io'),
	passport = require('./passport'),
	morgan = require('morgan');

app.set('view engine', 'ejs');
app.set('view options', {defaultLayout: 'layout'});

app.use(partials());
app.use(log.logger);
app.use(express.static(__dirname + '/static'));
app.use(express.static(__dirname + '/bower_components'));
app.use(cookieParser(config.secret));
app.use(session({
	secret: config.secret,
	saveUninitialized: true,
	resave: true,
	store: new RedisStore(
		{url: config.redisUrl})
	})
);
app.use(passport.passport.initialize());
app.use(passport.passport.session());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
//app.use(csrf());
//app.use(mUtil.csrf);
app.use(mUtil.authenticated);
app.use(flash());
app.use(mUtil.templateRoutes);
//routes
app.get('/', routes.index);
app.get(config.routes.login, routes.login);
app.get(config.routes.logout, routes.logOut);
app.get(config.routes.register, routes.register);
app.post(config.routes.register, routes.registerProcess);
app.get(config.routes.chat, [mUtil.requireAuthentication], routes.chat);
app.get('/error', function(req, res, next){
	next(new Error('A contrived error'));
});
passport.routes(app);	//함수는 앱으로 실행되고, 이 앱은 익스프레스 서버 오브젝트이다. 익스프레스는 앱이 실행되면 두 페이스북 라우트(인증 절차)들을 알게 된다.

app.use('/page', require('./routes/pageRouter'));// /page/xxx로 접속
//app.use('/board', [mUtil.checkPage], require('./routes/boardRouter'));// /board/xxx로 접속
app.use('/board', require('./routes/boardRouter'));// /board/xxx로 접속
app.use(require('./routes/migrationRouter'));	//testing for PHP Server migration
app.use(require('./routes/univRouter'));	
app.use(require('./routes/deptRouter'));	
app.use(require('./routes/imageRouter'));	//for image upload tests
app.use(require('./routes/friendRouter'));
app.use(require('./routes/commentRouter'));
app.use(require('./routes/userRouter'));
app.use(require('./routes/reportRouter'));

app.use(errorHandlers.error);
app.use(errorHandlers.notFound);

var server = app.listen(config.port, function(){
	console.log('Server listening at port %d', config.port);
});
io.startIo(server);

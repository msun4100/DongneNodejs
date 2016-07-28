var util = require('../middleware/utilities'),
	config = require('../config'),
	user = require('../passport/user');
var User = require('../db_models/userModel');

module.exports.index = index;
module.exports.login = login;
module.exports.logOut = logOut;
module.exports.chat = chat;
module.exports.register = register;
module.exports.registerProcess = registerProcess;

function index(req, res){
	res.render('index', {title: 'Index'});
};

function login(req, res){
	res.render('login', {title: 'Login', message: req.flash('error')});
};

function register(req, res){
	res.render('register', {title: 'Register', message: req.flash('error')});
};

function registerProcess(req, res, next){
	console.log("index.js->registerProccess->req.body", req.body);
	if (req.body.email && req.body.password)
	{
		var info = {
				email: req.body.email,
				password: req.body.password,
				pushId: req.body.pushId,
				username: req.body.username,
				univ: [req.body.univ],
				job: req.body.job,
				desc:[],
				sns:[],
				pic: "",
//				salt:
				work: config.crypto.workFactor,
				provider: 'local',
				location: req.body.location
		};
		User.addUser(info, function(err, profile){
			if (err) {
//				return next(err);	//addUser 실패한 경우 === 같은 유저가 있음
				console.log("index.err1:", err);
				res.send({error: true, message: 'register failure..'});		
				return; 
			}else{
				req.login(profile, function(err){
					//profile === session에 저장된 user
					var newUser = {
							univ: profile.univ,
							job: profile.job,
							desc: profile.desc,
							sns: profile.sns,
							temp: profile.temp,
							pic: profile.pic,
							username: profile.username,
							email: profile.email,
							user_id: profile.userId
					}
					console.log("index.success: newUser", newUser);
//					res.send({error: false, messsage: 'register complete'}); 
					//클라이언트는 에러false리턴받으면 바로 로그인url요청, 아니다 userId보내줘야함.
					res.send({error: false, messsage: 'register complete', user: newUser});
				});
			}
		});
	}else{
		//flash: please fill out all the field.
		console.log("index.err2:", err);
		res.send({error: true, messsage: 'register failure'});
	}
};

function logOut(req, res){
	util.logOut(req);
	res.send({error: false, messsage: 'Logout Successfully Complete'});
//	res.redirect('/');
};

function chat(req, res){
	res.render('chat', {title: 'Chat'});
};

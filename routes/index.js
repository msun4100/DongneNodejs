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
//	var user = new User();
	if (req.body.username && req.body.password)
	{
		User.addUser(req.body.username, req.body.password, config.crypto.workFactor, function(err, profile){
			if (err) {
				return next(err);	//addUser 실패한 경우 === 같은 유저가 있음
			}else{
				req.login(profile, function(err){
					res.send({success: 1, msg: 'register complete', result: profile});
				});
			}
		});
	}else{
		res.send({success: 0, msg: 'register failure', result: null});
	}
};

function logOut(req, res){
	util.logOut(req);
	res.send({success: 1, msg:'logout', result: null});
//	res.redirect('/');
};

function chat(req, res){
	res.render('chat', {title: 'Chat'});
};

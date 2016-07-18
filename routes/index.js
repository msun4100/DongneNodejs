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

//	var data = req.body.univ;
//	var univInfo = {
//		univId: data[0],
//		deptId: data[1],
//		enterYear: data[2],
//		isGraduate: data[3],
//	};
////	job: { name:String, team:String }
//	var data2 = req.body.job;
//	var jobInfo = {
//			name: data2[0],
//			team: data2[1]
//	};
	console.log("index.js->req.body", req.body);
//	console.log("index.js->univ:", univInfo);
//	console.log("index.js->job:", jobInfo);
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
				pic: "temPicture",
//				salt:
				work: config.crypto.workFactor,
				provider: 'local'
		};
		User.addUser(info, function(err, profile){
			if (err) {
				res.send({error: true, messsage: 'register failure..'});		
				return; 
//				return next(err);	//addUser 실패한 경우 === 같은 유저가 있음
			}else{
				req.login(profile, function(err){
					res.send({error: false, messsage: 'register complete', user: profile});
				});
			}
		});
	}else{
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

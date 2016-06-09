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
//	userId: {type: Number, unique: true },
//	email: {type: String, unique: true },
//	password: String,
//	pushId: String,
//	username: String,
//	univ: [{univId:Number, name:String, dept:String, enterYear:Number, isGraduate:{ type: Number, default: 0 }}],
//	job: { name:String, team:String },
//	desc: [ String ],
//	sns: [ String ],
//	pic: String,
//	createdAt: { type: Date, default: Date.now },
//	salt: {type: String},
//	work: {type: Number},
//	provider: {type: String}
	if (req.body.email && req.body.password)
	{
		var info = {
//				userId:
				email: req.body.email,
				password: req.body.password,
				pushId: req.body.pushId,
				username: req.body.username,
				univ:[],
				job: "tempJob",
				desc:[],
				sns:[],
				pic: "temPicture",
//				salt:
				work: config.crypto.workFactor,
				provider: 'local'
		};
		User.addUser(info, function(err, profile){
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

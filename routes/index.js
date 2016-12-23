var util = require('../middleware/utilities'),
	config = require('../config'),
	user = require('../passport/user');
var User = require('../db_models/userModel'),
	Univ = require('../db_models/universityModel');

module.exports.index = index;
module.exports.login = login;
module.exports.logOut = logOut;
module.exports.chat = chat;
module.exports.register = register;
module.exports.registerProcess = registerProcess;

function index(req, res) {
	res.render('index', { title: 'Index' });
};

function login(req, res) {
	res.render('login', { title: 'Login', message: req.flash('error') });
};

function register(req, res) {
	res.render('register', { title: 'Register', message: req.flash('error') });
};

function registerProcess(req, res, next) {
	// console.log("index.js->registerProccess->req.body", req.body);
	if (req.body.email && req.body.password) {
		var lon = parseFloat(req.body.location.lon), lat = parseFloat(req.body.location.lat);
		if (!lon) lon = 0; if (!lat) lat = 0;
		var info = {
			email: req.body.email,
			password: req.body.password,
			pushId: req.body.pushId,
			username: req.body.username,
			univ: [req.body.univ],
			job: req.body.job,
			desc: [],
			sns: [],
			pic: { small: "0", large: "0" },
			//				salt:
			work: config.crypto.workFactor,
			provider: 'local',
			location: {
				type: "Point",
				coordinates: [lon, lat]
			}
		};
		User.addUser(info, function (err, profile) {
			if (err) {
				//				return next(err);	//addUser 실패한 경우 === 같은 유저가 있음
				console.log("index.err1:", err);
				res.send({ error: true, message: 'register failure..' });
				return;
			} else {
				var sUser = {	//세션에 저장될 유저를 리턴하니까 비번 워크팩터 등은 제외하고 리턴함
						univ: profile.univ,
						job: profile.job,
						desc: profile.desc,
						sns: profile.sns,
						pic: profile.pic,
						createdAt: profile.createdAt,
						updatedAt: profile.updatedAt,
						location: profile.location,
						temp: profile.temp,
						status: profile.status,
						provider: profile.provider,
						username: profile.username,
						pushId: profile.pushId,
						email: profile.email,
						userId: profile.userId,
						_id: profile._id
				}

				req.login(sUser, function (err) {
					// profile === 몽고디비에서 검색한 session에 저장될 user
					var newUser = {
						user_id: profile.userId,
						name: profile.username,
						email: profile.email,
						created_at: profile.createdAt,
						univId: profile.univ[0].univId,
						provider: profile.provider
					}
					// console.log("1111111111111111index.success: profile", profile);
					// console.log("2222222222222222index.success: newUser", newUser);
					// console.log("3333333333333333index.success: req.user", req.user);
					//					res.send({error: false, messsage: 'register complete'}); 
					//클라이언트에는 뉴유저를 보내고 세션에는 sUser(프로필에서 워크팩터등을 제외한 객체) 저장.
					res.send({ error: false, messsage: 'register complete', result: newUser });
				});
			}
		});
	} else {
		//flash: please fill out all the field.
		console.log("index.err2:", err);
		res.send({ error: true, messsage: 'register failure' });
	}
};

function logOut(req, res) {
	util.logOut(req);
	res.send({ error: false, messsage: 'Logout Successfully Complete' });
	//	res.redirect('/');
};

function chat(req, res) {
	res.render('chat', { title: 'Chat' });
};

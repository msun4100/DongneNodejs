var passport = require('passport'),
	facebook = require('passport-facebook').Strategy,
	google = require('passport-google-oauth').OAuth2Strategy,
	local = require('passport-local').Strategy,
	passwordUtils = require('./password'),
//	user = require('./user'),
	config = require('../config'),
	log = require('../middleware/log');
var User = require('../db_models/userModel');

var dbHandler = require('../db_models/dbHandler')();

passport.use(new facebook({
	clientID: config.facebook.appID,
	clientSecret: config.facebook.appSecret,
	callbackURL: config.host + config.routes.facebookAuthCallback
},
function(accessToken, refreshToken, profile, done){
	done(null, profile);
}));

passport.use(new google({
    clientID: config.google.clientID,
    clientSecret: config.google.clientSecret,
    callbackURL: config.host + config.routes.googleAuthCallback
},
function(accessToken, refreshToken, profile, done) {
	done(null, profile);
}));

//=========================================
passport.use(new local({
	usernameField: 'email',
	passwordField: 'password',
	passReqToCallback:true}, function(req, email, password, done){
		User.findOne({email: email}, function(err, profile){
			if(profile)	{
				passwordUtils.passwordCheck(password, profile.password, profile.salt, profile.work, function(err, isAuth){
					if(isAuth) {
						if (profile.work < config.crypto.workFactor) {
							User.updatePassword(email, password, config.crypto.workFactor, function(err, profile){
								console.log('password Changed on workFactor');
							});
						}
						if (req.body.pushId !== profile.pushId) {
							profile.pushId = req.body.pushId;
							profile.save().then(function fulfilled(result) {
								console.log('pushId Changed');
							}, function rejected(err) {
								log.debug({message: 'PushId Change callback error', pushId: req.body.pushId});
								console.log('pushId Change Error');
							});
						}
						if(req.body.univId !== null || req.body.univId !== undefined){
							profile.univId = req.body.univId;
						}
						done(null, profile);
					} else {
						log.debug({message: 'Wrong Username or Password', username: email});
						done(null, false, {message: 'Wrong Username or Password'});
					}
				});
			} else {
				done(null, false, {message: 'Wrong Username or Password'});
			}			
		});
//	User.find({email: email}, function(err, docs){
//		if(err || docs.length !== 1) 
//			return done(null, false, {message: 'Wrong Username or Password'});
//		passwordUtils.passwordCheck(password, docs[0].password, docs[0].salt, docs[0].work, function(err, isAuth){
//		if(isAuth)	{
////			if (docs[0].work < config.crypto.workFactor){
////				user.updatePassword(username, password, config.crypto.workFactor);
////			}
//			if (req.body.pushId !== docs[0].pushId) {
//				docs[0].pushId = req.body.pushId;
//				docs[0].save().then(function fulfilled(result) {
//					console.log('pushId Changed');
//				}, function rejected(err) {
//					log.debug({message: 'PushId Change callback error', pushId: req.body.pushId});
//					console.log('pushId Change Error');
//				});
//			}
//			return done(null, docs[0]);
//		} else {
//			log.debug({message: 'Wrong Username or Password', email: email});
//			return done(null, false, {message: 'Wrong Username or Password'});
//		}
//		});
//	});
}));	//passport.use()
//passport.use(new local(function(username, password, done){
//	user.findByUsername(username, function(err, profile){
//		if(profile)
//		{
//			passwordUtils.passwordCheck(password, profile.password, profile.salt, profile.work, function(err,isAuth){
//				if(isAuth)
//				{
//					if (profile.work < config.crypto.workFactor)
//					{
//						user.updatePassword(username, password, config.crypto.workFactor);
//					}
//					done(null, profile);
//				}
//				else
//				{
//					log.debug({message: 'Wrong Username or Password', username: username});
//					done(null, false, {message: 'Wrong Username or Password'});
//				}
//			});
//		}
//		else
//		{
//			done(null, false, {message: 'Wrong Username or Password'});
//		}
//	});
//}));

passport.serializeUser(function(user, done){
	done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

var routes = function routes(app){
	app.get(config.routes.facebookAuth, passport.authenticate('facebook'));
	app.get(config.routes.facebookAuthCallback, passport.authenticate('facebook',
		{ failureRedirect: config.routes.login, failureFlash: true}),
		function(req, res){
			res.redirect(config.routes.chat);
	});
	app.get(config.routes.googleAuth, passport.authenticate('google',
		{ scope: ['https://www.googleapis.com/auth/userinfo.profile','https://www.googleapis.com/auth/userinfo.email'] }));
	app.get(config.routes.googleAuthCallback, passport.authenticate('google',
		{failureRedirect: config.routes.login, failureFlash: true}),
		function(req, res){
			req.user.username = req.user.emails[0].value;
			res.redirect(config.routes.chat);
		});
//	app.post(config.routes.login, passport.authenticate('local',
//		{successRedirect: config.routes.chat, failureRedirect: config.routes.login, failureFlash: true}));
	app.post(config.routes.login, function(req, res, next){
		passport.authenticate('local',{failureFlash: true}, function(err, user, info) { 
			if(err) {
				return next(err); }
			if(!user) {
				console.log("info.message:", info.message);
				return res.send({
					error: true,
					message:"Oops! An error occurred while login auth."
//					user: {}	//client에서 error===true일시 받아서 쓰는 코드를 사용안하면 nullpointer Exception 안뜸.
				});
			}
			/*
			 * Note: passport.authenticate() middleware invokes req.login() automatically. 
			 * This function is primarily used when users sign up, during which req.login() can be invoked to automatically log 
			 * in the newly registered user.
			*/			 
			req.login(user, function(err) {
				//req.login --> 전달된 loginInfo를 세션에 저장
				if(err) { 
					console.log('req.login() Error!');
					return next(err); 
				}
				dbHandler.createUser(user.userId, user.username, user.email, user.univ[0].univId)
				.then(function (datas) {
					res.send( datas );
				},function (error) {
					//chat은 response type이 다르기 때문에 next사용해서 에러 미들웨어로 보내면 에러 생길 듯, 대신 console로 로그 출력해서 확인
					//나중에 컨피그 파일에 에러메시지 다 정해서 입력해서 컨피그 파일로 대체하고 에러 발생시 래빗큐로 로그 찍도록 수정
					console.log(error);
					res.send({
						error:true, 
						message:"Oops! An error occurred while registereing"
					});
				}).finally(function () {
					console.log('finally functions');
				});
				//=================
//				console.log("req.user: ", req.user);
//				return res.send({ 
//					error: false,
//					user:{
//						user_id: user.userId,
//						name: user.username,
//						email: user.email,
//						created_at: user.createdAt
//					}
//				});
				//=================
			});
		})(req, res, next);
	});
};

exports.passport = passport;
exports.routes = routes;

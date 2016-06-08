var passport = require('passport'),
	facebook = require('passport-facebook').Strategy,
	google = require('passport-google-oauth').OAuth2Strategy,
	local = require('passport-local').Strategy,
	passwordUtils = require('./password'),
//	user = require('./user'),
	config = require('../config'),
	log = require('../middleware/log');
var User = require('../db_models/userModel');

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
						done(null, profile);
					} else {
						log.debug({message: 'Wrong Username or Password', username: username});
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
			if(err) { return next(err); }
			if(!user) {
				console.log("info.message:", info.message);
				return res.send({
					success: 0,
					msg: ""+info.message,
					result: { lastLogin: 0}
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
				console.log("req.user: ", req.user);
				return res.send({
					success: 1,
					msg: "user.email: "+ user.email,
					result: { lastLogin: 1 }
				});
			});
		})(req, res, next);
	});
};

exports.passport = passport;
exports.routes = routes;

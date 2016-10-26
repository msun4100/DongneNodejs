var express = require('express'),
	router = express.Router(),
	async = require('async'),
	mUtil = require('../middleware/utilities');

var User = require('../db_models/userModel'),
	Friend = require('../db_models/friendModel');

var gpsProvider = require('../gpsProvider')();
var config = require('../config'),
	request = require('request'),
	passwordUtils = require('../passport/password'),
	log = require('../middleware/log');

router.post('/users/email', getUser);
router.put('/users', editUser);
router.put('/users/pw', editPassword);
function editPassword(req, res, next){
	var email = req.body.email;
	var password = req.body.password;
	var value = req.body.value;	//바꿀 비번
	if(!email || !password || !value) {return res.send({error: true, message: 'args undefined error'});}
	User.findOne({email: email}, function(err, profile){
		if(profile)	{
			passwordUtils.passwordCheck(password, profile.password, profile.salt, profile.work, function(err, isAuth){
				if(isAuth) {
					User.updatePassword(email, value, config.crypto.workFactor, function(err, profile){
						profile.save().then(function fulfilled(result) {
							console.log('password Changed on workFactor');
							return res.send({error: false, message: 'PW successfully changed'});
						}, function rejected(err) {
							log.debug({message: 'PW Change callback error', pushId: req.body.pushId});
							return res.send({error: true, message: 'PW change callback error'});
						});
					});
				} else {
					log.debug({message: 'Wrong Username or Password', username: email});
					return res.send({error: true, message: 'Email or Password'});
				}
			});
		} else {
			return res.send({error: true, message: 'Email or Password'});
		}			
	});
}


function editUser(req, res, next) {
	var email = req.body.email;
	if(!email){
		return res.send({error: true, message:'email undefined error'});
	}
	var desc1 = req.body.desc1;
	var desc2 = req.body.desc2;
	var jobname = req.body.jobname;
	var jobteam = req.body.jobteam;
	var fb = req.body.fb;
	var insta = req.body.insta;
	
	User.findByEmail(email, function(err, doc){
		if(err){
			err.code = 500;
			return next(err);
		}
		if(!doc){
			return res.send({error: true, message: 'email not exists'});
		}
		if(desc1){ 
			doc.desc = [];
			doc.desc.push(desc1);
		}
		if(desc2){
			if(!desc1){ doc.desc = []; }
			doc.desc.push(desc2);
		}
		if(jobname){
			doc.job.name = jobname;
		}
		if(jobteam){
			doc.job.team = jobteam;
		}
		if(fb){
			doc.sns = [];
			var info = { url: fb, sns: "fb"};
			doc.sns.push(info);
		}
		if(insta){
			if(!fb) doc.sns = [];
			var info = { url: insta, sns: "insta"};
			doc.sns.push(info);
		}
		doc.updatedAt = Date.now();
		doc.save().then(function fulfilled(result) {
			res.send({
				error: false,
				message: 'user info has Successfully edited',
//				result: [result]
			});
		}, function rejected(err) {
			res.send({
				error: true,
				message: 'An error occurred while user info editing'
			});
		});
	});
}
function getUser(req, res, next){
	var email = req.body.email;
	User.find({"email": email},{_id:1, userId:1, email:1 }).then(function fulfilled(docs) {
		if(docs.length > 0){
			res.send({ error: false, message: 'DUP_EMAIL' });
		} else {
			res.send({ error: false, message: 'AVAILABLE_EMAIL' });
		}
	}, function rejected(err) {
	    res.send({ error: true, message: 'FIND_EMAIL_ERROR' });
	});
};



module.exports = router;

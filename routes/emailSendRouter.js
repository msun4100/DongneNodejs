var express = require('express'),
	router = express.Router(),
	async = require('async'),
	mUtil = require('../middleware/utilities'),
	config = require('../config'),
	fs = require('fs');

var User = require('../db_models/userModel'),
	Friend = require('../db_models/friendModel'),
	passwordUtils = require('../passport/password'),
	log = require('../middleware/log');

var Univ = require('../db_models/universityModel');

var nodemailer = require('nodemailer');
var randomstring = require("randomstring");
var auth = { 
		user: 'schooler.service',
		pass: 'djemalstmznffj'
};
var transporter = nodemailer.createTransport('smtps://'+ auth.user +'%40gmail.com:'+ auth.pass +'@smtp.gmail.com');
//var imgUrl = config.host +"/getPic/user/10000/small";
var imgUrl = "http://ec2-52-78-76-64.ap-northeast-2.compute.amazonaws.com:3000/getPic/user/10000/small"; //ec2-52-78-76-64.ap-northeast-2.compute.amazonaws.com

router.post('/findID', findID);
function findID(req, res, next){
	if(!req.body.univ || !req.body.dept || !req.body.username || !req.body.enterYear){
		return res.send({error: true, message: 'args undfined error'});
	}
	var univ = req.body.univ;
	var username = req.body.username;
	var dept = req.body.dept;
	var enterYear = req.body.enterYear;
	
	Univ.find({"univname": univ}, {_id: 0, univId: 1, univname: 1, total: 1})
	.then(function fulfilled(docs) {
		if(docs.length !== 0){
			var univId = docs[0].univId;
			User.find({"username": username, "univ.univId": univId, "univ.deptname": dept, "univ.enterYear": enterYear}, { _id: 0, password: 0, salt: 0, work: 0, createdAt: 0, __v: 0, "univ._id": 0 })
//			User.find({"univ.univId": univId, "univ.deptname": dept, "univ.enterYear": enterYear}, { _id: 0, password: 0, salt: 0, work: 0, createdAt: 0, __v: 0, "univ._id": 0 })
//			.limit(10)	//테스트 용
			.exec(function(err, users){
				if(err) { return next(err); }
				else {
					var data = { error: false, message: ''};
					switch(users.length){
					case 0:
						data.error = true;
						data.message = 'email not found; 0';
						break;
						default:
							data.error = false;
							data.message = 'email list length '+users.length;
							data.result = [];
							console.log('id_length', users.length);
							var i=0;
							for(i=0; i<users.length; i++){
								data.result.push(users[i].email);
							}
							break;
					}
					res.send(data);
				}
			});			
		} else {
			res.send({
				error: true,
				message: 'univ find error'
			});
		}
	}, function rejected(err) {
		res.send({
			error: true,
			message: err.message
		});
	});
	
}

router.post('/findPW', findPW);
function findPW(req, res, next){
	var temp = randomstring.generate({
		  length: 12,
		  charset: 'alphanumeric'
		});
	var html = '<html>';
	html += '<head>';
	html += '<meta charset="UTF8">';
	html += '<style>';
	html += 'form label { width:100px; display:inline-block; }';
	html += 'li img { height:100px }';
	html += '</style>';
	html += '</head>';
	html += '<body>';
	html += '<h1>';
	html += '임시 비밀번호: ' + temp;
	html += '</h1></p>';
	html += '<img src='+ imgUrl +'/></p>';
	html += '<h1>로그인 후 비밀번호를 변경해주세요.</h1><p></html>';
	html += '</body>';
	html += '</html>';

	if(!req.body.email){
		return res.send({error: true, message: 'args undefined error'});
	}
	
	var email = req.body.email;
//	var password = docs[0].password;
	var value = temp;
	if(!email || !value) {return res.send({error: true, message: 'args undefined error'});}
	User.findOne({email: email}, function(err, profile){
		if(profile)	{
			User.updatePassword(email, value, config.crypto.workFactor, function(err, profile){
				profile.updatedAt = Date.now();
				profile.save().then(function fulfilled(result) {
//					console.log('password Changed on workFactor: ' + temp);
					var mailOptions = {
							from: '학교사람들 <schooler.service@gmail.com>',
							to: email,
							subject: '[학교사람들] 비밀번호 변경 안내',
							// text: 'test to send a plain text'
							html: html
						};
						transporter.sendMail(mailOptions, function(error, info){
							if (error){
								res.send({error: true, message: 'failed to send email to ' + req.body.email});
							} else {
//								console.log("Message sent: " + info.response);
								res.send({error: false, message: 'Send email to '+req.body.email});
							}
							transporter.close();
						});
				}, function rejected(err) {
					log.debug({message: 'PW Change callback error', pushId: req.body.pushId});
					return res.send({error: true, message: 'PW change callback error'});
				});
			});			
			
		} else {
			return res.send({error: true, message: 'find Email error'});
		}			
	});
	
}	//findPW

module.exports = router;
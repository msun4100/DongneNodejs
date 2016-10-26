var express = require('express'),
	router = express.Router(),
	async = require('async'),
	mUtil = require('../middleware/utilities');

var User = require('../db_models/userModel'),
	Report = require('../db_models/reportModel'),
	Friend = require('../db_models/friendModel');

var gpsProvider = require('../gpsProvider')();
var config = require('../config'),
	request = require('request');

router.post('/report/:userId', updateReport);
//router.put('/report', editReport);
function updateReport(req, res, next) {
	var user = req.user;
	var to = req.params.userId;
//	var from = req.body.from;
	var type;
	var msg = "";
	if(req.body.msg){
		msg = req.body.msg;
	}
	if(req.body.type){
		type = req.body.type;
	} else {
		return res.send({error: true, message: 'type undefined error'});
	}
	var reqDate = req.body.reqDate;

	
	var info = {"from": user.userId, "to": to, "actionUser": user.userId, "type": type, "msg": msg};
	var report = new Report(info);
	
	var query = Report.find({"from": user.userId, "to": to});
//	query.or([{"from": user.userId, "to": to}, {"from": to, "to": user.userId}]);
	query.select({__v: 0});
	query.exec(function(err, docs){
		if(err){
			err.code = 500;
			next(err);
		} 
//		반대 케이스 처리는? showUserDetail에서 처리
		if(docs.length === 1){	//이미 있으면
			docs[0].type = type;
			docs[0].updatedAt = Date.now();
			docs[0].actionUser = user.userId;
			docs[0].msg = msg;
			docs[0].save(function(err, doc){
				if(err) return next(err);
				res.send({
			    	error: false,
			    	message:'report type changed',
			    	result: docs[0]
			    });	
			});
		} else if( docs.length === 0 ){
			//위에서 생성해둔 객체
			report.save().then(function fulfilled(result) {
				res.send({
					error : false,
					message : 'add reports by update func',
					result : result
				});
			}, function rejected(err) {
				//"E11000 duplicate key error collection: dongne.users index: email_1 dup key: { : \"adduser@gmail.com\" }"
				//case of {from-->to} or {to-->from} duplicate
				err.code = 500;
				next(err);
			});
		} else {
			res.send({error:false, message: 'report item find error'}); 
			return;
		}
	});
}



module.exports = router;

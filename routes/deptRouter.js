var express = require('express');
var User = require('../db_models/userModel');
var Univ = require('../db_models/universityModel');
var Dept = require('../db_models/departmentModel');
var router = express.Router();
var async = require('async');

router.get('/dept', showAllDepts);
router.get('/dept/:univId', showDepts);
function showDepts(req, res, next){
	var univId = req.params.univId;
	if(univId === null){
		return next(new Error('dept univId error'));
	}
	Dept.find({"univId": univId}, {_id: 0, univId:1, deptId: 1, deptname: 1, total: 1}).then(function fulfilled(docs) {
		res.send({
			error: false,
			message: ""+docs.length,	//client에 message를 String으로 받음
			result: docs
		});
	}, function rejected(err) {
		res.send({
			error: true,
			message: err.message
		});
	});
}



function showAllDepts(req, res, next){
//	res.send('showUnivs');
	Dept.find({}, {_id: 0, univId:1, deptId: 1, deptname: 1, total: 1}).then(function fulfilled(docs) {
		res.send({
			error: false,
			message: ""+ docs.length,
			result: docs
		});
	}, function rejected(err) {
		res.send({
			error: true,
			message: err.message
		});
	});
}


module.exports = router;

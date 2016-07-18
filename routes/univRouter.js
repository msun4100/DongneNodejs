var express = require('express');
var User = require('../db_models/userModel');
var Univ = require('../db_models/universityModel');
var Dept = require('../db_models/departmentModel');
var router = express.Router();
var async = require('async');


//router.post('/friends/:friend', addFriends); //deprecated
router.get('/univ/fs1', fsTest1);
router.get('/univ/fs2', fsTest2);
router.get('/univ', showUnivs);
//router.get('/univ/update', update);
//router.get('/univ/:univId', showUnivs);
//router.post('/friends/:status', updateFriends);
router.post('/univ', addUnivs);

function fsTest1(req, res, next){
	User.emit('modifyUnivList');
}
function fsTest2(req, res, next){
	User.emit('getUnivList', req, res, next);
}

//router.get('/univ/find', findTest);
//function findTest(req, res, next){
//Univ.findOneAndUpdate(
//		{ univname: "인하대학교", univId: 0 }, //query
//		{ 
//			$inc:{ total: 1 },
//			$set:{
//			univId: 0,
//			univname: "인하대학교",
//			updatedAt: Date.now()
//			} 
//		}, //updates
//		{ "new": true, upsert: true}, //options
//		function(err, newDoc){
//			if(err){
//				res.send("error");
//			}
//			res.send({success:1, msg:'test', result: newDoc} );
//		});
//}

function addUnivs(req, res, next){
	var univname = req.body.univname;
	
	var info = {};
	info.univname = univname;
	info.total = 1;
	
	var univ = new Univ(info);
	univ.save().then(function fulfilled(result){
		   console.log(result);
		   res.send({msg:'success', id:result._id});
		}, function rejected(err) {
		   err.code = 500;
		   next(err);      
		});
}

function showUnivs(req, res, next){
//	res.send('showUnivs');
	Univ.find({}, {_id: 0, univId: 1, univname: 1, total: 1}).then(function fulfilled(docs) {
		if(docs.length !== 0){
			res.send({
				error: false,
				result: docs
			});
		}
	}, function rejected(err) {
		res.send({
			error: true,
			message: err.message
		});
	});
}

function showUnivsList(req, res, next){
	
	async.waterfall([ function(callback) {
		Univ.find({}).then(function fulfilled(docs) {
			callback(null, docs);
		}, function rejected(err) {
			callback(err, null);
		});
	}, function(collection, callback) {
		var idx = 0;
		var coll = collection.slice(0); // clone collection
		(function findOne() {
			var record = coll.splice(0, 1)[0]; // get the first record of coll
			User.count({"univ.name" : record.univname}, function(err, count) {
				if (err) {callback(err); return;	}
				if (coll.length === 0) {
					callback(null, collection);					
				} else {
					console.log("record", record.univname, "count:", count);
					collection[idx++].total = count;
					findOne();
				}
			});
		})();
	}], function(err, result) {
		res.send(result);
	});
}

module.exports = router;

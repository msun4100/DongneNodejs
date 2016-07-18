var express = require('express'),
	router = express.Router(),
	async = require('async'),
	mUtil = require('../middleware/utilities'),
	ObjectID = require('mongodb').ObjectID,
	config = require('../config'),
	fs = require('fs');

var User = require('../db_models/userModel'),
	Friend = require('../db_models/friendModel'),
	CommentThread = require('../db_models/commentModel').CommentThread,
	Reply = require('../db_models/commentModel').Reply,
	Board = require('../db_models/boardModel'),
	Main = require('../db_models/pageModel'),
	Movie = require('../db_models/movieModel');

var multer  = require('multer'),
	connection = require('../db_models/mongodbConfig'),
	dbService = require('../db_models/dbService')(connection);

var uploadDir = __dirname + '/uploads',
	imageDir = __dirname + '/images';

router.post('/updatePic/:userId', multer({dest:'./uploads'}).single('photo'),function (req,res,next) {
	console.log("req.file:", req.file);
	console.log("req.body", req.body);
	var userId = req.params.userId;
	dbService.writeFileToDb({
		readStream: fs.createReadStream(req.file.path),
		fileName:req.file.originalname,
		collection:'photos'
	}).then(function (objectId) {
		User.update({"userId": userId}, { "$set": {"pic": objectId}}, function(err, doc){
			if(err) { return next(err); }
			if(doc.n === 1){
				res.send({ error: false, message: ""+objectId, result: ""+objectId });
			} else {
				res.send({ error: true, message: "Failed to User's profile update" });
			}
		});
	},function (error) {
		res.status(500).send({ error: true, message: error.message });
	}).finally(function () {
		fs.unlink(req.file.path);	//uploads 폴더에 올라간 임시파일 삭제
	});
});
router.get('/getPic/:userId',function (req, res, next) {
	var userId = req.params.userId;
	User.find({"userId": userId}).then(function(docs){
		var pic = docs[0].pic;
		dbService.readFileFromDb({
			objectId: pic,
			writeStream: res,	//res가 아니라 docs[i].img/pic에 스트림연결 하면??
			collection:'photos'
		})//configurations
		.then(function (objectId) {
			res.end();
		},function (error) {
			res.send({
				error: true,
				message: error.message
			});
		});	
	}, function(err){
		res.status(500).send({ error: true, message: 'User not found error' });
	});
//	dbService.readFileFromDb({
//		objectId:req.params.objectId,
//		writeStream:res,	//res가 아니라 docs[i].img/pic에 스트림연결 하면??
//		collection:'photos'
//	})//configurations
//	.then(function (objectId) {
//		res.end();
//	},function (error) {
//		res.send({
//			error: true,
//			message: error.message
//		});
//	});
});

module.exports = router;
var express = require('express'),
	router = express.Router(),
	async = require('async'),
	mUtil = require('../middleware/utilities'),
	ObjectID = require('mongodb').ObjectID,
	config = require('../config');

var User = require('../db_models/userModel'),
	Friend = require('../db_models/friendModel'),
	CommentThread = require('../db_models/commentModel').CommentThread,
	Reply = require('../db_models/commentModel').Reply,
	Board = require('../db_models/boardModel'),
	Main = require('../db_models/pageModel');


router.post('/write', function(req, res, next) {
	console.log('req.session.pageId: ', req.session.pageId);
	var info = {
			admin: [req.body.admin],
			univId: req.body.univId,
			type: req.body.type,
			pagename: req.body.pagename,
			followers: [],
			requests: [],
		};
	var page = new Main(info);
	page.save(function(err, doc) {
		if (err) return next(err);
		console.log("saved doc: ", doc);
		res.send({ success:1, msg:'page saved', result: doc});
	});		
			
});

router.get('/list', function (req, res, next) {
//  res.redirect('/list/1');
	req.url = "/list/1";
	router.handle(req, res, next);
});

router.get('/list/:pagename', function(req, res, next) {
	
	var pagename = req.params.pagename;
	var regex = new RegExp(pagename, "i");
	console.log('req.user.userId', req.user.userId);
	console.log('req.session.passport.userId', req.session.passport.user.userId);
	var testArr= [0,1,2,10];
	
	Main.find({pagename: regex}, function(err, docs){
		if(err)	return next(err);
		else {
			var join = [];
			for(i=0; i<docs.length; i++){
//				if(docs[i].inArray(req.user.userId)){
				if(docs[i].inArray(1)){
//					console.log('Are we there yet!');
					docs[i].type = 1;
					join.push(1);
				} else {
//					console.log('Thanks God!');
					docs[i].type = -1;
					join.push(-1);
				}
			}
			res.send({success:1, 
				msg:'page list', 
//				join: join, 
				result: docs
			});
		}
	});
	/*inArray(userId) 함수를 돌려서 팔로우 중이면 1을, 해당 없으면 -1을 넣어서
	join Array를 만듬. 검색된 페이지를 팔로우중인지 아닌지 구분하기 위해.
	docs[i].inJoined = 1 이렇게 추가해서 res.send()하면 이상하게 .isJoined 변수가 undefined된체로 전송됨.
	살짝 변형해서 docs[i].type의 값을 바꿔서 보내면 또 보내짐.. 왜지?
	어차피 docs[i].save를 하는게 아니기때문에 type 값에 -1,1 을 넣어서 보내도 상관은 없음
	*/
});


router.get('/write300', function (req, res, next) {
  for(var i = 0; i<300; i++) {
	  var info = {
				admin: [i],
				univId: i,
				type: 1,
				pagename: 'pagename '+ i,
				followers: [],
				requests: [],
			};
	  var page = new Main(info);

	  page.save(function (err, doc) {
		  if(err) console.error('err', err);
	  });
  }
  	res.send({msg:'300개 저장성공'});
});

//router.get('/read/:page/:boardId', function (req, res, next) {
//	//현재 구조상 req.params.page#은 아무거나 넣어도상관없음.
//	var page = req.params.page;
//	var boardId = req.params.boardId;
//
//	Board.update( {"boardId" : boardId}, {"$inc" : {"viewCount" : 1}}, function (err, doc) {
//		if (err) return next(err);
//
//		Board.find({"boardId" : boardId} , function (err, docs) {
//			if (err) return next(err);
//			res.send({success:1, msg:'read board', result: docs[0]});
//		});
//	});
//
//});
//
//
//router.get('/update/:page/:boardId', function (req, res, next) {
//	var page = req.params.page;
//	var boardId = req.params.boardId;
//
//	Board.findOne({"boardId" : boardId}, function (err, doc) {
//		if (err) return next(err);
//		console.log('doc', doc);
//		res.send({success:1, msg: 'update get request', result: doc});
//	});
//});

router.post('/update', function (req, res, next) {
	console.log('req.body:', req.body);
	var pageId = req.body.pageId;
	var info = { updatedAt: Date.now() };
	if(req.body.admin)	info.admin = req.body.admin;
	if(req.body.univId)	info.univId = req.body.univId;
	if(req.body.type)	info.type = req.body.type;
	if(req.body.pagename)	info.pagename = req.body.pagename;
	
	var page = info;

	Main.update({ "pageId" : pageId }, {$set : page}, function (err, doc) {
		if (err) return next(err);
		if (doc.n == 1){
			res.send({success:1, msg: 'updates complete', result: doc});
		} else {
			res.send({success:0, msg: 'failed to updates', result: null});
		}
	});
});

//follow confirm
router.post('/confirm', function (req, res, next) {
	console.log('/confirm req.body:', req.body);
	var pageId = req.body.pageId;
	var userId = req.body.userId;
	var admin = [req.body.admin];
	if( pageId !== undefined && userId !== undefined && admin !== undefined){
		console.log("admin: ",admin);
		Main.update(
				{
					"pageId" : pageId,
					"followers":{"$ne": userId},
					"requests": userId,
					"admin": {"$in": admin}
				},
				{
					"$inc" : {"fCount": 1, "rCount": -1}, 
					"$push": {"followers": userId},
					"$pull": {"requests": userId},
					"$set": {"updatedAt": Date.now()}
				}, function (err, doc) {
			if (err) return next(err);
			if (doc.n == 1){
				res.send({success:1, msg: 'confirm inc complete', result: doc});
			} else {
				res.send({success:0, msg: 'failed to confirm updates', result: null});
			}
		});	
		
	} else {
		res.send({success:0, msg: 'args undefined', result: null});
	}
});

//follow requests
router.post('/request', function (req, res, next) {
	console.log('/request req.body:', req.body);
	var pageId = req.body.pageId;
	var userId = req.body.userId;
//	console.log('/like args:', userId);
	if( pageId != undefined && userId != undefined){
		Main.update(
				{
					"pageId" : pageId,
					"followers":{"$ne": userId},
					"requests":{"$ne": userId}
				},
				{
					"$inc" : {"rCount": 1}, 
					"$push": {"requests": userId},
					"$set": {"updatedAt": Date.now()}
				}, function (err, doc) {
			if (err) return next(err);
			if (doc.n == 1){
				res.send({success:1, msg: 'requests inc complete', result: doc});
			} else {
				res.send({success:0, msg: 'failed to requests updates', result: null});
			}
		});
	} else {
		res.send({success:0, msg: 'args undefined', result: null});
	}
});

router.post('/follow/:status', function (req, res, next) {
	var status = req.params.status;
	var pageId = req.body.pageId;
//	var userId = req.body.userId;
	if( pageId != undefined && status != undefined){
		
		
		Board.update(
				{
					"boardId" : boardId, 
					"likes": userId 
				},
				{
					"$inc" : {"likeCount": -1}, 
					"$pull": {"likes": userId},
					"$set": {"updatedAt": Date.now()}
				}, function (err, doc) {
			if (err) return next(err);
			if (doc.n == 1){
				res.send({success:1, msg: 'dislike inc complete', result: doc});
			} else {
				res.send({success:0, msg: 'failed to dislike updates', result: null});
			}
		});
	} else {
		res.send({success:0, msg: 'args undefined', result: null});
	}
});

router.post('/delete', function (req, res, next) {
	var page = req.body.page;
	var pageId = req.body.pageId;
	var admin = [req.body.admin]
	Board.remove({"pageId" : pageId, "admin":{"$in":admin}}, function (err, doc) {
		if (err) {return next(err);}
		console.log('doc', doc);
		if (doc.result.n === 1 ){
			res.send({success:1, msg: 'remove complete', result: doc});
		} else {
			res.send({success:0, msg: 'failed to remove', result: null});
		}
	});
});

module.exports = router;
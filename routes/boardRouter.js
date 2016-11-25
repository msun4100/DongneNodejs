var express = require('express'),
	router = express.Router(),
	async = require('async'),
	mUtil = require('../middleware/utilities'),
	ObjectID = require('mongodb').ObjectID,
	config = require('../config'),
	request = require('request');

var User = require('../db_models/userModel'),
	Friend = require('../db_models/friendModel'),
	CommentThread = require('../db_models/commentModel').CommentThread,
	Reply = require('../db_models/commentModel').Reply,
	Board = require('../db_models/boardModel'),
	Main = require('../db_models/pageModel'),
	TimeStamp = require('../gcm/timeStamp');

router.post('/test/list/:univId/:tab', function(req, res, next){
	var univId = parseInt(req.params.univId),
	tab = parseInt(req.params.tab);	//0:재학생 글들 00~01, 1: 졸업생 글 10~11
	var start = parseInt(req.body.start),
		display = parseInt(req.body.display),
		reqDate = req.body.reqDate;
	var total = 0;
	var typeArr = [];
if(tab !== undefined && tab === 0){ 
	typeArr.push("00"); typeArr.push("01");
} else {
	typeArr.push("10"); typeArr.push("11");
}
if(typeArr === null || typeArr === undefined) {return next(new Error('TYPE_ARR_UNDEFINED_ERROR'));}
//var user = req.user;
// console.log("list/:univId/:tab", req.body);
console.log(start+"   "+display);
//console.log(reqDate.toISOString());
var query = Board.find();
query.and([ {"univId": univId}, {type: {"$in": typeArr}}, {createdAt: {"$lte": reqDate}} ]);
query.exec(function(err, docs){
			res.send({msg: docs.length, result:docs});
		});
});

router.get('/list', function (req, res, next) {
//  res.redirect('/list/1');
	req.url = "/list/1";
	router.handle(req, res, next);
});


router.get('/list/:page', function(req, res, next) {
	var page = req.params.page;
	page = parseInt(page, 10);

	Board.count(function(err, cnt) {
		var size = 10; // 한 페이지에 보여줄 개수
		var begin = (page - 1) * size; // 시작 글
		var totalPage = Math.ceil(cnt / size); // 전체 페이지의 수 (75 / 10 = 7.5(X)
												// -> 8(O))
		var pageSize = config.board.pageSize; // 페이지 링크의 개수

		// 1~10페이지는 1로, 11~20페이지는 11로 시작되어야하기 때문에 숫자 첫째자리의 수를 고정시키기 위한 계산법
		var startPage = Math.floor((page - 1) / pageSize) * pageSize + 1;
		var endPage = startPage + (pageSize - 1);

		if (endPage > totalPage) {
			endPage = totalPage;
		}
		// 전체 글이 존재하는 개수
		var max = cnt - ((page - 1) * size);
		Board.find({}).sort("-boardId")
		.skip(begin).limit(size).exec( function(err, docs) {
				if(err) return next(err); 
				console.log('docs', docs);
				var datas = {
						"title" : "게시판 리스트",
						"data" : docs,
						"page" : page,
						"pageSize" : pageSize,
						"startPage" : startPage,
						"endPage" : endPage,
						"totalPage" : totalPage,
						"max" : max
					};
				res.send({success:1, msg: 'board list', result: datas});
		});
	});	//count()
});

router.post('/list/:univId/:tab', function(req, res, next) {
	var univId = parseInt(req.params.univId),
		tab = parseInt(req.params.tab);	//0:재학생 글들 00~01, 1: 졸업생 글 10~11
	var start = parseInt(req.body.start),
		display = parseInt(req.body.display),
		reqDate = req.body.reqDate;
	var total = 0;
	var typeArr = [];
	if(tab !== undefined && tab === 0){ 
		typeArr.push("00"); typeArr.push("01");
	} else {
		typeArr.push("10"); typeArr.push("11");
	}
	if(typeArr === null || typeArr === undefined) return next(new Error('TYPE_ARR_UNDEFINED_ERROR'));
//	var user = req.user;
	// console.log("list/:univId/:tab", req.body);
	async.waterfall([ function(callback){ 
		//total리턴을 위한 카운트 연산. count()콜백안에 async를 넣어도 되지만 가독성이 떨어져서 async 첫 번째 콜에 둠.
		console.time('TIMER-mycount');
		var query = Board.count();
		query.and([ {"univId": univId}, {type: {"$in": typeArr}}, {createdAt: {"$lte":new Date(reqDate)}} ]);
//		query.and([ {"univId": univId}, {type: {"$in": typeArr}} ]);
		query.exec(function(err, count){
			if(err) callback(err, null);
			if(count === 0) {
				console.log("board_count_is_zero");
				console.timeEnd('TIMER-mycount');
				callback(new Error('HAS_NO_BOARD_ITEM'), null);
			} else {
				console.timeEnd('TIMER-mycount');
				total = count;
				callback(null, count);	
			}
		});
	}, function(count, callback){
		console.time("AGGREGATE");
	    Board.aggregate(
	    	    [
				{"$match": { "univId": univId, type: {"$in": typeArr}, "createdAt": {"$lte": new Date(reqDate) }  }},
//				{"$match": { "univId": univId, type: {"$in": typeArr}  }},
	    	    {"$lookup":{"from": "users","localField":"writer", "foreignField":"userId", "as":"mUser"}}, 
	    	    {"$project": {_id:1, boardId:1, univId:1, writer:1, pageId:1, title:1, commentId:1, preReplies:1,
	    	    	"mUser.username":1,
	    	    	"mUser.univ":1,
	    	    	"mUser.updatedAt":1,
	    	    	"mUser.pic":1,
//	    	    	mUser: "$mUser",
	    	    	updatedAt:1,
	    	    	createdAt:1,
	    	    	pic:1,
	    	    	likes:1,
	    	    	likeCount:1,
	    	    	viewCount:1,
	    	    	body:1,
	    	    	type:1
	    	    	}
	    	    },
	    	    {"$sort": {"_id": -1}},	//sort가 skip&&limit보다 먼저 와야 함.
	    	    {"$skip": start * display },
	    	    {"$limit": display}	
	    	    ], function(err, results){
	    	    	if(err) {return callback(err, null);}
	    			if(results.length === 0) {return callback(new Error('HAS_NO_BOARD_ITEM'), null);}
	    			var i, ids = [];
	    			for(i=0; i< results.length; i++){
	    				results[i].user = {};
	    				results[i].user.username = results[i].mUser[0].username;
	    				results[i].user.pic = results[i].mUser[0].pic;
	    				results[i].user.updatedAt = results[i].mUser[0].updatedAt;
	    				results[i].user.deptname = results[i].mUser[0].univ[0].deptname;
	    				results[i].user.enterYear = results[i].mUser[0].univ[0].enterYear;
	    				results[i].mUser = undefined;
	    				ids.push(results[i].commentId);
	    			}
	    			console.timeEnd("AGGREGATE");
	    			callback(null, results, ids);    	
	    	    });		
	}, function(results, ids, callback){
		//======
//		console.log("commentIds:", ids);
		var query = CommentThread.find();
//		query.and([ {_id: {"$in": ids}}, {"updatedAt": {"$lte": reqDate}} ]);
		query.and([ {_id: {"$in": ids}}]);
		query.select({__v:0, title:0});
		query.sort({ "_id": -1});
//		query.sort({ "replies.updatedAt": -1});
//		query.skip(start * display);
//	 	query.limit(3);
		query.exec(function(err, docs){
			//검색된 보드 중 코멘트가 하나도 없으면 docs === [];
//			console.log("docs", docs);
			callback(null, results, docs);
		});
		//===================
		
	}], function(err, results, comments){
		if(err){
			if(err.message === 'HAS_NO_BOARD_ITEM'){
				return res.send({ error: false, message: err.message});
			} else { 
				return next(err); 
			}
		}
//		프로필 수정하면 사진이 반영 안되는 버그 있음. --> 유저가 사진 업데이트 할때 보드의 모든 게시물도 업데이트 되도록 하자. 
//		유저 하나씩 전부 찾아서 보드에 붙이기엔 좀 무리가 있음.. 아 조인연산이 개아쉽네 진짜. 나중에 몽고디비 조인좀 알아보자.
		// console.log("result:", results);
		// console.log("total", total);
		res.send({
			error:false, 
			message: 'univId: '+univId+' board List: '+ results.length,
			total: total,
			result: results,
			comment: comments
		});
		//finally...
	});	
});

router.post('/list/:univId/:tab/search', function(req, res, next) {
	var univId = parseInt(req.params.univId),
		tab = parseInt(req.params.tab);	//0:재학생 글들 00~01, 1: 졸업생 글 10~11
	var start = parseInt(req.body.start),
		display = parseInt(req.body.display),
		reqDate = req.body.reqDate;
	var total = 0;
	var typeArr = [];
	if(tab !== undefined && tab === 0){ 
		typeArr.push("00"); typeArr.push("01");
	} else {
		typeArr.push("10"); typeArr.push("11");
	}
	if(typeArr === null || typeArr === undefined) return next(new Error('TYPE_ARR_UNDEFINED_ERROR'));

	var word = req.body.word;
	console.log("req.body", req.body);
	async.waterfall([ function(callback){ 
		//total리턴을 위한 카운트 연산. count()콜백안에 async를 넣어도 되지만 가독성이 떨어져서 async 첫 번째 콜에 둠.
		console.time('TIMER-mycount');
		var query = Board.count();
//		query.and([ {"univId": univId}, {type: {"$in": typeArr}}, {"createdAt": {"$lte": reqDate}} ]);
		query.and([ {"univId": univId}, {type: {"$in": typeArr}} ]);
		if(req.body.word){
			query.or( [{"user.username": {"$regex": new RegExp(req.body.word, 'i')}}, {"body": {"$regex": new RegExp(req.body.word, 'i')}}, {"user.deptname": {"$regex": new RegExp(req.body.word, 'i')}} ]);
		}
		query.exec(function(err, count){
			if(err) callback(err, null);
			if(count === 0) {
				console.log("board_count_is_zero");
				console.timeEnd('TIMER-mycount');
				callback(new Error('HAS_NO_BOARD_ITEM'), null);
			} else {
				console.timeEnd('TIMER-mycount');
				total = count;
				callback(null, count);	
			}
		});
	}, function(count, callback){
		var query = Board.find();
//		query.and([ {"univId": univId}, {type: {"$in": typeArr}}, {"createdAt": {"$lte": reqDate}} ]);
		query.and([ {"univId": univId}, {type: {"$in": typeArr}} ]);
		if(req.body.word){
			query.or( [{"user.username": {"$regex": new RegExp(req.body.word, 'i')}}, {"body": {"$regex": new RegExp(req.body.word, 'i')}}, {"user.deptname": {"$regex": new RegExp(req.body.word, 'i')}} ]);
		}
		query.select({__v:0});
		query.sort({ "_id": -1});
		query.skip(start * display);
	 	query.limit(display);
		query.exec(function(err, results){
			if(err) callback(err, null);
//			console.log(results);
			if(results.length === 0) callback(new Error('HAS_NO_BOARD_ITEM'), null);
			var ids = [];
			for(i=0; i< results.length; i++){
				ids.push(results[i].commentId);
			}
			callback(null, results, ids);
		});		
	}, function(results, ids, callback){
		//======
//		console.log("commentIds:", ids);
		var query = CommentThread.find();
//		query.and([ {_id: {"$in": ids}}, {"updatedAt": {"$lte": reqDate}} ]);
		query.and([ {_id: {"$in": ids}}]);
		query.select({__v:0, title:0});
		query.sort({ "_id": -1});
//		query.sort({ "replies.updatedAt": -1});
//		query.skip(start * display);
//	 	query.limit(3);
		query.exec(function(err, docs){
			//검색된 보드 중 코멘트가 하나도 없으면 docs === [];
//			console.log("docs", docs);
			callback(null, results, docs);
		});
		//===================
		
	}], function(err, results, comments){
		if(err){
			if(err.message === 'HAS_NO_BOARD_ITEM'){
				return res.send({ error: false, message: err.message});
			} else { 
				return next(err); 
			}
		}
		res.send({
			error:false, 
			message: 'univId: '+univId+' board List: '+ results.length,
			total: total,
			result: results,
			comment: comments
		});
		//finally...
		
	});	
});

router.post('/myinterest', function(req, res, next) {
	var univId = parseInt(req.body.univId);
//	var	tab = parseInt(req.params.tab);	//0:재학생 글들 00~01, 1: 졸업생 글 10~11
	var start = parseInt(req.body.start),
		display = parseInt(req.body.display),
		reqDate = req.body.reqDate;
	var total = 0;
	var word = req.body.word;
	var userId = parseInt(req.body.userId);
	if(!req.body.userId || !req.body.univId) {return res.send({error:true, message:'args undefined error'});}
	async.waterfall([ function(callback){ 
		//total리턴을 위한 카운트 연산. count()콜백안에 async를 넣어도 되지만 가독성이 떨어져서 async 첫 번째 콜에 둠.
		console.time('TIMER-mycount');
		var query = Board.count();
		query.and([ {"univId": univId}, {"likes": userId} ]);
		if(req.body.word){
			query.or( [{"user.username": {"$regex": new RegExp(req.body.word, 'i')}}, {"body": {"$regex": new RegExp(req.body.word, 'i')}} ]);
		}
		query.exec(function(err, count){
			if(err) callback(err, null);
			if(count === 0) {
				console.log("board_count_is_zero");
				console.timeEnd('TIMER-mycount');
				callback(new Error('HAS_NO_BOARD_ITEM'), null);
			} else {
				console.timeEnd('TIMER-mycount');
				total = count;
				callback(null, count);	
			}
		});
	}, function(count, callback){
		var query = Board.find();
		query.and([ {"univId": univId}, {"likes": userId} ]);
		if(req.body.word){
			query.or( [{"user.username": {"$regex": new RegExp(req.body.word, 'i')}}, {"body": {"$regex": new RegExp(req.body.word, 'i')}} ]);
		}
		query.select({__v:0});
		query.sort({ "_id": -1});
		query.skip(start * display);
	 	query.limit(display);
		query.exec(function(err, results){
			if(err) callback(err, null);
//			console.log(results);
			if(results.length === 0) callback(new Error('HAS_NO_BOARD_ITEM'), null);
			var ids = [];
			for(i=0; i< results.length; i++){
				ids.push(results[i].commentId);
			}
			callback(null, results, ids);
		});		
	}, function(results, ids, callback){
		//======
//		console.log("commentIds:", ids);
		var query = CommentThread.find();
//		query.and([ {_id: {"$in": ids}}, {"updatedAt": {"$lte": reqDate}} ]);
		query.and([ {_id: {"$in": ids}}]);
		query.select({__v:0, title:0});
		query.sort({ "_id": -1});
		query.exec(function(err, docs){
			callback(null, results, docs);
		});
		//===================
		
	}], function(err, results, comments){
		if(err){
			if(err.message === 'HAS_NO_BOARD_ITEM'){
				return res.send({ error: false, message: err.message});
			} else { 
				return next(err); 
			}
		}
		res.send({
			error:false, 
			message: 'univId: '+univId+' myInterest List: '+ results.length,
			total: total,
			result: results,
			comment: comments
		});
	});	
});

router.post('/myinterest/search', function(req, res, next) {
	var univId = parseInt(req.body.univId);	//parseInt한건 routing이 꼬여서 에러 찾다가 수정함. /list/mywriting/search하면 라우팅 꼬임
//	var	tab = parseInt(req.params.tab);	//0:재학생 글들 00~01, 1: 졸업생 글 10~11
	var start = parseInt(req.body.start),
		display = parseInt(req.body.display),
		reqDate = req.body.reqDate;
	var total = 0;
	var word = req.body.word;
	var userId = parseInt(req.body.userId);
	if(!req.body.userId || !req.body.univId) {return res.send({error:true, message:'args undefined error'});}
	async.waterfall([ function(callback){ 
		//total리턴을 위한 카운트 연산. count()콜백안에 async를 넣어도 되지만 가독성이 떨어져서 async 첫 번째 콜에 둠.
		console.time('TIMER-mycount');
		var query = Board.count();
		query.and([ {"univId": univId}, {"likes": userId} ]);
		if(req.body.word){
			query.or( [{"user.username": {"$regex": new RegExp(req.body.word, 'i')}}, {"body": {"$regex": new RegExp(req.body.word, 'i')}} ]);
		}
		query.exec(function(err, count){
			if(err) callback(err, null);
			if(count === 0) {
				console.log("board_count_is_zero");
				console.timeEnd('TIMER-mycount');
				callback(new Error('HAS_NO_BOARD_ITEM'), null);
			} else {
				console.timeEnd('TIMER-mycount');
				total = count;
				callback(null, count);	
			}
		});
	}, function(count, callback){
		var query = Board.find();
		query.and([ {"univId": univId}, {"likes": userId} ]);
		if(req.body.word){
			query.or( [{"user.username": {"$regex": new RegExp(req.body.word, 'i')}}, {"body": {"$regex": new RegExp(req.body.word, 'i')}} ]);
		}
		query.select({__v:0});
		query.sort({ "_id": -1});
		query.skip(start * display);
	 	query.limit(display);
		query.exec(function(err, results){
			if(err) callback(err, null);
			if(results.length === 0) callback(new Error('HAS_NO_BOARD_ITEM'), null);
			var ids = [];
			for(i=0; i< results.length; i++){
				ids.push(results[i].commentId);
			}
			callback(null, results, ids);
		});		
	}, function(results, ids, callback){
		var query = CommentThread.find();
		query.and([ {_id: {"$in": ids}}]);
		query.select({__v:0, title:0});
		query.sort({ "_id": -1});
		query.exec(function(err, docs){
			callback(null, results, docs);
		});
	}], function(err, results, comments){
		if(err){
			if(err.message === 'HAS_NO_BOARD_ITEM'){
				return res.send({ error: false, message: err.message});
			} else { 
				return next(err); 
			}
		}
		res.send({
			error:false, 
			message: 'univId: '+univId+' myInterest List: '+ results.length,
			total: total,
			result: results,
			comment: comments
		});
	});	
});


router.post('/mywriting', function(req, res, next) {
	var univId = parseInt(req.body.univId);
//	var	tab = parseInt(req.params.tab);	//0:재학생 글들 00~01, 1: 졸업생 글 10~11
	var start = parseInt(req.body.start),
		display = parseInt(req.body.display),
		reqDate = req.body.reqDate;
	var total = 0;
//	var typeArr = [];
//	if(tab !== undefined && tab === 0){ 
//		typeArr.push("00"); typeArr.push("01");
//	} else {
//		typeArr.push("10"); typeArr.push("11");
//	}
//	if(typeArr === null || typeArr === undefined) return next(new Error('TYPE_ARR_UNDEFINED_ERROR'));
	var word = req.body.word;
	var userId = parseInt(req.body.userId);
//	console.log("req.body", req.body);
	if(!req.body.userId || !req.body.univId) {return res.send({error:true, message:'args undefined error'});}
	async.waterfall([ function(callback){ 
		//total리턴을 위한 카운트 연산. count()콜백안에 async를 넣어도 되지만 가독성이 떨어져서 async 첫 번째 콜에 둠.
		console.time('TIMER-mycount');
		var query = Board.count();
//		query.and([ {"univId": univId}, {type: {"$in": typeArr}} ]);
		query.and([ {"univId": univId}, {"writer": userId} ]);
		if(req.body.word){
			query.or( [{"user.username": {"$regex": new RegExp(req.body.word, 'i')}}, {"body": {"$regex": new RegExp(req.body.word, 'i')}} ]);
		}
		query.exec(function(err, count){
			if(err) callback(err, null);
			if(count === 0) {
				console.log("board_count_is_zero");
				console.timeEnd('TIMER-mycount');
				callback(new Error('HAS_NO_BOARD_ITEM'), null);
			} else {
				console.timeEnd('TIMER-mycount');
				total = count;
				callback(null, count);	
			}
		});
	}, function(count, callback){
		var query = Board.find();
//		query.and([ {"univId": univId}, {type: {"$in": typeArr}}, {"createdAt": {"$lte": reqDate}} ]);
//		query.and([ {"univId": univId}, {type: {"$in": typeArr}} ]);
		query.and([ {"univId": univId}, {"writer": userId} ]);
		if(req.body.word){
			query.or( [{"user.username": {"$regex": new RegExp(req.body.word, 'i')}}, {"body": {"$regex": new RegExp(req.body.word, 'i')}} ]);
		}
		query.select({__v:0});
		query.sort({ "_id": -1});
		query.skip(start * display);
	 	query.limit(display);
		query.exec(function(err, results){
			if(err) callback(err, null);
//			console.log(results);
			if(results.length === 0) callback(new Error('HAS_NO_BOARD_ITEM'), null);
			var ids = [];
			for(i=0; i< results.length; i++){
				ids.push(results[i].commentId);
			}
			callback(null, results, ids);
		});		
	}, function(results, ids, callback){
		//======
//		console.log("commentIds:", ids);
		var query = CommentThread.find();
//		query.and([ {_id: {"$in": ids}}, {"updatedAt": {"$lte": reqDate}} ]);
		query.and([ {_id: {"$in": ids}}]);
		query.select({__v:0, title:0});
		query.sort({ "_id": -1});
//		query.sort({ "replies.updatedAt": -1});
//		query.skip(start * display);
//	 	query.limit(3);
		query.exec(function(err, docs){
			//검색된 보드 중 코멘트가 하나도 없으면 docs === [];
//			console.log("docs", docs);
			callback(null, results, docs);
		});
		//===================
		
	}], function(err, results, comments){
		if(err){
			if(err.message === 'HAS_NO_BOARD_ITEM'){
				return res.send({ error: false, message: err.message});
			} else { 
				return next(err); 
			}
		}
		res.send({
			error:false, 
			message: 'univId: '+univId+' myWriting List: '+ results.length,
			total: total,
			result: results,
			comment: comments
		});
		//finally...
		
	});	
});

router.post('/mywriting/search', function(req, res, next) {
	var univId = parseInt(req.body.univId);	//parseInt한건 routing이 꼬여서 에러 찾다가 수정함. /list/mywriting/search하면 라우팅 꼬임
//	var	tab = parseInt(req.params.tab);	//0:재학생 글들 00~01, 1: 졸업생 글 10~11
	var start = parseInt(req.body.start),
		display = parseInt(req.body.display),
		reqDate = req.body.reqDate;
	var total = 0;
	var word = req.body.word;
	var userId = parseInt(req.body.userId);
	if(!req.body.userId || !req.body.univId) {return res.send({error:true, message:'args undefined error'});}
	async.waterfall([ function(callback){ 
		//total리턴을 위한 카운트 연산. count()콜백안에 async를 넣어도 되지만 가독성이 떨어져서 async 첫 번째 콜에 둠.
		console.time('TIMER-mycount');
		var query = Board.count();
		query.and([ {"univId": univId}, {"writer": userId} ]);
		if(req.body.word){
			query.or( [{"user.username": {"$regex": new RegExp(req.body.word, 'i')}}, {"body": {"$regex": new RegExp(req.body.word, 'i')}} ]);
		}
		query.exec(function(err, count){
			if(err) callback(err, null);
			if(count === 0) {
				console.log("board_count_is_zero");
				console.timeEnd('TIMER-mycount');
				callback(new Error('HAS_NO_BOARD_ITEM'), null);
			} else {
				console.timeEnd('TIMER-mycount');
				total = count;
				callback(null, count);	
			}
		});
	}, function(count, callback){
		var query = Board.find();
		query.and([ {"univId": univId}, {"writer": userId} ]);
		if(req.body.word){
			query.or( [{"user.username": {"$regex": new RegExp(req.body.word, 'i')}}, {"body": {"$regex": new RegExp(req.body.word, 'i')}} ]);
		}
		query.select({__v:0});
		query.sort({ "_id": -1});
		query.skip(start * display);
	 	query.limit(display);
		query.exec(function(err, results){
			if(err) callback(err, null);
			if(results.length === 0) callback(new Error('HAS_NO_BOARD_ITEM'), null);
			var ids = [];
			for(i=0; i< results.length; i++){
				ids.push(results[i].commentId);
			}
			callback(null, results, ids);
		});		
	}, function(results, ids, callback){
		var query = CommentThread.find();
		query.and([ {_id: {"$in": ids}}]);
		query.select({__v:0, title:0});
		query.sort({ "_id": -1});
		query.exec(function(err, docs){
			callback(null, results, docs);
		});
	}], function(err, results, comments){
		if(err){
			if(err.message === 'HAS_NO_BOARD_ITEM'){
				return res.send({ error: false, message: err.message});
			} else { 
				return next(err); 
			}
		}
		res.send({
			error:false, 
			message: 'univId: '+univId+' myWriting List: '+ results.length,
			total: total,
			result: results,
			comment: comments
		});
	});	
});



router.post('/write', function(req, res, next) {
//	console.log('req.session.pageId: ', req.session.pageId);
//	일단 pageId도 univId로 똑같이 대체
	console.log("req.body", req.body);
	if(req.body.univId === undefined || req.body.writer === undefined || req.body.pageId === undefined ||
			req.body.type === undefined || req.body.title === undefined || req.body.body === undefined){
		return next(new Error('board args undefined error'));
	} 
	var type = "";
	async.waterfall([function(callback){
		User.find({ userId : req.body.writer }, function(err, users) {
			if(!users[0]){ return callback(new Error('writer not found error'), null);}
			var newUser = {
				username : users[0].username,
				deptname : users[0].univ[0].deptname,
				enterYear : users[0].univ[0].enterYear
				// pic : users[0].pic
			};
			type = ""+req.body.type;
			console.log("write type", type);
			var info = {
				univId : req.body.univId,
				writer : req.body.writer,
				pageId : req.body.univId,
				type : type,
				title : req.body.title,
				body : req.body.body,
				likes : [],
				commentId : ObjectID(),
				user : newUser,
				pic : []
			};
			if(req.body.pic){
				info.pic.push(req.body.pic);
			}
			callback(null, info);
		});
	}, function(info, callback){
		var board = new Board(info);
		board.save(function(err, doc) {
			if(err) callback(err, null);
			else callback(null, doc);
		});
	}], function(err, doc){
		if(err){return next(err);}
		console.log("savedItem:", doc);
		res.send({
			error: false,
			message: "saved "+doc.boardId,
			result: doc
		});
	});
});



router.get('/write300', function(req, res, next) {
	var typeArr = [ "00", "01", "10", "11" ];
	for (var i = 0; i < 300; i++) {
		async.waterfall([ function(callback){
			var mUnivId = Math.floor(Math.random() * 2);
			var mUserId = Math.floor(Math.random() * 10);
			var idx = i;
			User.find({ userId : mUserId }, function(err, users) {
				var newUser = {
					username : users[0].username,
					deptname : users[0].univ[0].deptname,
					enterYear : users[0].univ[0].enterYear,
					pic : users[0].pic
				};
				var info = {
					univId : mUnivId,
					writer : mUserId,
					pageId : mUnivId,
					type : typeArr[Math.floor(Math.random() * 4)],
					title : 'Title ' + idx,
					body : 'body content' + idx,
					likes : [],
					commentId : ObjectID(),
					user : newUser
				};
				callback(null,info);
			});
		}, function(info, callback){
			var board = new Board(info);
			board.save(function(err, doc) {
				callback(null, doc);
			});
		}], function(err, doc){
			console.log(doc.boardId +" saved");
		});
	}
	res.send({msg:" 저장 성공"});
});
// url /board/:boardId
router.get('/:boardId', function(req, res, next) {
	var boardId = req.params.boardId;
	Board.update( {"boardId": boardId}, {"$inc": {"viewCount": 1}}, function (err, doc) {
		if (err) return next(err);
		Board.find({"boardId": boardId},{__v: 0}, function (err, docs) {
			if(err) return next(err);
			if(docs.length !== 1){
				console.log("length error");
				return res.send({error: false, message: 'DOCS_LENGTH_ERROR'});
			}
			var query = CommentThread.find();
			query.and([ {_id: docs[0].commentId}]);
			query.select({__v:0, title:0});
			query.sort({ "_id": -1});
			query.exec(function(err, comment){
				if(err) return next(err);
				res.send({
					error: false,
					message: 'univ:'+ docs[0].univId + ', Board: ' + docs[0].boardId,
					result: docs,
					comment: comment
				});
			});
		});
	});
	
});

router.get('/read/:page/:boardId', function (req, res, next) {
	//현재 구조상 req.params.page#은 아무거나 넣어도상관없음.
	var page = req.params.page;
	var boardId = req.params.boardId;

	Board.update( {"boardId" : boardId}, {"$inc" : {"viewCount" : 1}}, function (err, doc) {
		if (err) return next(err);

		Board.find({"boardId" : boardId} , function (err, docs) {
			if (err) return next(err);
			res.send({success:1, msg:'read board', result: docs[0]});
		});
	});
});


router.get('/update/:page/:boardId', function (req, res, next) {
	var page = req.params.page;
	var boardId = req.params.boardId;

	Board.findOne({"boardId" : boardId}, function (err, doc) {
		if (err) return next(err);
		console.log('doc', doc);
		res.send({success:1, msg: 'update get request', result: doc});
	});
});

router.put('/write', function (req, res, next) {
	console.log('req.body:', req.body);
	var boardId = req.body.boardId;
	if(!boardId){
		return res.send({error: true, message:'boardId undefined error'});
	}
	var pageId = req.body.pageId;
	var univId = req.body.univId;
	var writer = req.body.writer;
	var type = req.body.type;
	var title = req.body.title;
	var body = req.body.body;
	var pic = req.body.pic;
	
	Board.find({"boardId": boardId}, function(err, docs){
		if(err){
			err.code = 500;
			return next(err);
		}
		if(!docs){
			return res.send({error: true, message: 'board is not exists'});
		}
		if(pageId){
			docs[0].pageId = pageId;
		}
		if(univId){
			docs[0].pageId = univId;
		}
		if(writer){
			docs[0].writer = writer;
		}
		if(type){
			docs[0].type = type;
		}
		if(title){
			docs[0].title = title;
		}
		if(body){
			docs[0].body = body;
		}
		if(pic){
			docs[0].pic[0] = pic;
		} else { 
			docs[0].pic = [];
		}
		docs[0].updatedAt = Date.now();
		docs[0].save().then(function fullfilled(result){
			console.log("writeResult", result);
			res.send({
				error: false,
				message: 'board info has Successfully updated',
				result: result
			});
		}, function rejected(err){
			res.send({
				error: true,
				message: 'An error occurred while board updating'
			});
		});
	});
	
//	var boardId = req.body.boardId;
//	var info = { updatedAt: Date.now() };
//	if(req.body.pageId)	info.pageId = req.body.pageId;
//	if(req.body.univId)	info.univId = req.body.univId;
//	if(req.body.writer)	info.writer = req.body.writer;
//	if(req.body.type)	info.type = req.body.type;
//	if(req.body.title)	info.title = req.body.title;
//	if(req.body.body)	info.body = req.body.body;
//	if(req.body.likes)	info.likes = req.body.likes;
//	var board = info;
//	Board.update({ "boardId" : boardId }, {$set : board}, function (err, doc) {
//		if (err) return next(err);
//		if (doc.n == 1){
//			res.send({error:false, message: 'updates complete', result: doc});
//		} else {
//			res.send({error:true, message: 'failed to updates'});
//		}
//	});
});

router.post('/like', function (req, res, next) {
//	console.log('/like req.body:', req.body);
	var boardId = req.body.boardId;
	var userId = req.body.userId;
	
	var reqDate = req.body.reqDate;
	var to = req.body.to;	//푸쉬받을 상대
	if( boardId != undefined && userId != undefined){
		Board.update(
				{
					"boardId" : boardId, 
					"likes":{"$ne": userId} 
				},
				{
					"$inc" : {"likeCount": 1}, 
					"$push": {"likes": userId},
					"$set": {"updatedAt": Date.now()}
				}, function (err, doc) {
			if (err) return next(err);
			if (doc.n == 1){
				request({
					method: 'POST',
					uri: config.host + '/users/' + to + '/message',
					headers: { 'Content-Type' : 'application/json; charset=utf-8' },
					body: JSON.stringify({
						reqDate: reqDate,
						user_id: userId,
						message: config.gcm.MSG_PUSH_LIKE,
						message_id: 1,	//id === 1 이면 클라이언트 컨피그 파일의 게시글을 좋아합니다..
						chat_room_id: boardId,	//chat_room_id 게시글의 아이디를 넣어서 바로 열어 볼 수 있게
						pushType: config.gcm.PUSH_FLAG_NOTIFICATION,
						to: to	
					})
				}, function(error, resp, body) {
//					시간차이 기존 8ms --> 200ms 응답시간 차이를 보임(200ms는 푸시 요청 응답시간)
//					푸시가 가든 안가든 확인할 필요 없다고 치면
//					에러 났을 때 로그 처리만하고 그 외는 아무것도 안하면 됨.
//					res.setHeader('content-type', 'application/json; charset=utf-8');
//					if(error){
//						console.log("error:", error);
//						return res.send({ error: true, message: 'gcm push error occuerred' });
//					}
//					res.send({error: false, message: 'like inc complete'});
					if(error){ console.log("like push error:", error);}
				});		//request
				res.send({error: false, message: 'like inc complete'}); //gcm 적용전 기존 코드 한줄
			} else {
				res.send({error: true, message: 'failed to like updates'});
			}
		});
	} else {
		res.send({error: true, message: 'args undefined'});
	}
});



router.post('/dislike', function (req, res, next) {
//	console.log('/dislike req.body:', req.body);
	var boardId = req.body.boardId;
	var userId = req.body.userId;
//	console.log('/like args:', userId);
	if( boardId != undefined && userId != undefined){
		Board.update( { "boardId" : boardId, "likes": userId },
				{ "$inc" : {"likeCount": -1},
					"$pull": {"likes": userId},
					"$set": {"updatedAt": Date.now()}
				}, function (err, doc) {
			if (err) return next(err);
			if (doc.n == 1){
				res.send({error: false, message: 'dislike inc complete'});
			} else {
				res.send({error: true, message: 'failed to dislike updates'});
			}
		});
	} else {
		res.send({error: true, message: 'args undefined'});
	}
});

router.post('/remove', function (req, res, next) {
//	var page = req.body.page;
	var boardId = req.body.boardId;
	var writer = req.body.writer;
	
	CommentThread.remove({"boardId" : boardId}, function(err, doc){
		if(err) {return res.send({error: true, message: 'error occuerred while removing commentthread item'});}
		if (doc.result.n === 1 ){
			Board.remove({"boardId" : boardId, "writer": writer}, function (err, doc) {
				if (err) {return res.send({error: true, message: 'error occuerred while removing board item'});}
//				console.log('doc', doc);
				if (doc.result.n === 1 ){
					res.send({error: false, message: 'remove complete'});
				} else {
					res.send({error: true, message: 'failed to remove'});
				}
			});
		} else {//코멘트쓰레드가 없는경우
//			res.send({error: true, message: 'failed to remove thread'});
			Board.remove({"boardId" : boardId, "writer": writer}, function (err, doc) {
				if (err) {return res.send({error: true, message: 'error occuerred while removing board item'});}
//				console.log('doc', doc);
				if (doc.result.n === 1 ){
					res.send({error: false, message: 'remove complete'});
				} else {
					res.send({error: true, message: 'failed to remove'});
				}
			});
		}
	});
});




module.exports = router;
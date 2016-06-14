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
			univId: req.body.univId,
			writer: req.body.writer,
			pageId: req.body.pageId,
			type: req.body.type,
			title: req.body.title,
			body: req.body.body,
//			viewCount: 0,
//			likeCount: 0,
			likes: [],
		};
	
	var board = new Board(info);
	board.save(function(err, doc) {
		if (err) return next(err);
		console.log("saved doc: ", doc);
//		res.redirect('/board/list/1');
		res.send({ success:1, msg:'board saved', result: doc});
	});			
});

router.get('/list', function (req, res, next) {
  res.redirect('/list/1');
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
		Board.find({}).sort("-num")
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

router.get('/write300', function (req, res, next) {
  for(var i = 1; i<300; i++) {
	  var info = {
				univId: 0,
				writer: 0,
				pageId: 0,
				type: 1,
				title: 'Title '+i,
				body: 'body '+i,
				likes: [],
			};
	  var board = new Board(info);

	  board.save(function (err, doc) {
		  if(err) console.error('err', err);
	  });
  }
  	res.send({msg:'300개 저장성공'});
//  res.send('<head><meta charset="utf-8"><script>alert("300개의 글 저장 성공");location.href="/board/list/1"</script></head>');
});

router.get('/read/:page/:num', function (req, res, next) {
	var page = req.params.page;
	var num = req.params.num;

	Board.update( {"num" : num}, {"$inc" : {"hit" : 1}}, function (err, doc) {
		if (err) return next(err);

		Board.find({"num" : num} , function (err, docs) {
			if (err) return next(err);
			console.log('docs', docs);
//			res.render('board/read', {"title" : "글 읽기", "data" : docs[0], "page" : page});
			res.send({success:1, msg:'read board', result: docs[0]});
		});
	});

});


router.get('/update/:page/:num', function (req, res, next) {
	var page = req.params.page;
	var num = req.params.num;

	Board.findOne({"num" : num}, function (err, doc) {
		if (err) return next(err);
		console.log('doc', doc);
		res.send({msg: 'update get request'});
//    	res.render('board/updateform', {"title" : "글 수정", "data" : doc, "page" : page});
	});
});

router.post('/update', function (req, res, next) {
	console.log('req.body', req.body);
	var info = {};
	if(req.body.univId)	info.univId = req.body.univId;
	if(req.body.writer)	info.writer = req.body.writer;
	if(req.body.pageId)	info.pageId = req.body.pageId;
	if(req.body.type)	info.type = req.body.type;
	if(req.body.title)	info.title = req.body.title;
	if(req.body.body)	info.body = req.body.body;
	if(req.body.likes)	info.likes = req.body.likes;
	
	var board = info;

	Board.update({ "num" : num }, {$set : board}, function (err, doc) {
		if (err) return next(err);
		console.log("doc", doc);
		if (doc.n == 1){
//			res.redirect('/board/list/' + page);
			res.send({success:1, msg: 'updates complete', result: doc});
		} else {
			res.send({success:0, msg: 'updates failure', result: null});
		}
	});
});

router.post('/delete', function (req, res, next) {
	var page = req.body.page;
	var num = req.body.num;

	Board.remove({"num" : num}, function (err, doc) {
		if (err) console.error('err', err);
		console.log('doc', doc);
		if (doc.result.n ==1 ){
			res.send({success:1, msg: 'remove complete', result: doc});
		} else {
			res.send({success:0, msg: 'remove failure', result: null});
		}
	});
});

module.exports = router;
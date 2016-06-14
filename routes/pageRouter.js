var express = require('express'),
	router = express.Router(),
	async = require('async'),
	mUtil = require('../middleware/utilities'),
	ObjectID = require('mongodb').ObjectID;

var User = require('../db_models/userModel'),
	Friend = require('../db_models/friendModel'),
	CommentThread = require('../db_models/commentModel').CommentThread,
	Reply = require('../db_models/commentModel').Reply,
	Board = require('../db_models/boardModel'),
	Page = require('../db_models/pageModel');


router.get('/page', getPageList);
router.post('/page', addPageRoutes);

function getPageList(req, res, next) {
	Page.find().exec(function(err, docs) {
		if (err)
			return next(err);
		if (docs.length === 0) {
			res.send({
				success : 1,
				msg : 'Page Not Found',
				result : null
			});
		} else {
			res.send({
				success : 1,
				msg : 'Page Found',
				result : docs
			});
		}
	});

}
function getPageRoutes(req, res, next) {
	var pageId = req.params.pageId
	if(pageId){
		Page.findOne({pageId: pageId})
		.exec(function(err, doc){
			if(err) return next(err);
			if(!docs){
				res.send({success: 1, msg:'Page Not Found', result: null});
			} else {
				res.send({success: 1, msg:'Page Found', result: doc});
			}
		});	
	} else {
		res.send({msg: 'params undefined'});
	}
}	//getPageRoutes

function addPageRoutes(req, res, next) {

	var pageId = parseInt(req.body.pageId);
	console.log(pageId);
//	Page.find({pageId: pageId}).exec(function(err, doc){
	Page.findOne({pageId: pageId}).exec(function(err, doc){
		if(err) return next(err);
		if(doc){
			return res.send({
				success: 1,
				msg: 'already exists',
				result: null
			}); 
		} else {
			var info = {
					admin: [req.body.admin],
					univId: req.body.univId,
					pagename: req.body.pagename,
					type: req.body.type,
					followers:[],
					requests:[]					
			};
			var page = new Page(info);
			addPage(req, res, next, page);
		}
	});
}

function addPage(req, res, next, page) {
	if(!page){
		//case of undefined
		return res.json(404, { msg : 'page undefined.' });
	} else {
		page.save(function(err, doc){
			if(err) return next(err);
			res.send({success: 1, msg:'page successfully saved', result: doc});
		});
	}
};

function updatePage(req, res, next, page) {
	Page.update({ pageId : page.pageId }, 
			{ $set: { replies : commentThread.replies }
	}).exec(function(err, savedPage) {
		if (err) {
			res.json(404, {
				msg : 'Failed to update Page.'
			});
		} else {
			res.json({
				success: 1,
				msg : "Update page success",
				result: savedPage
			});
		}
	});	
}


//findById를 쓰면 createFrom... 안하고 그냥 스트링 넣을 수 있음
//이 함수가 처음엔 해당글(photo나 page 등이 코멘트쓰레드에 해당하는 commentId 를 갖고 있음
//init.js에서 commentThread 생성해서 그 아이디를 photo나 page가 각각 갖고 있음
//그래서 _id로 검색하는 것 
//근데 나는 인풋으로 받은 글넘버랑 코멘트쓰레드 스키마의 boardId랑 비교해서 같으면 보내려 함

function getBoardRoutes(req, res, next) {
	Board.find({pageId:req.params.boardId})
	.exec(function(err, boards){
		if(err) return next(err);
		if(!boards){
			res.send({success: 1, msg:'Boards Not Found', result: null});
		} else {
			res.send({success: 1, msg:'Boards Found', result: boards});
		}
	});
};

/*
--postman 요청시--
boardId: board.id,
body: 댓글 내용
parentCommentId: board.commentId //대댓글의 경우 해당 댓글의 ObjectId
*/
function addBoardRoutes(req, res, next) {
	
	Page.findOne({univId:req.body.univId, pageId: req.body.pageId}).exec(function(err, page){
		if(err) return next(err);
		if(!page){
			return res.send({success:1, msg:'Page Not Found', result: null});
		} else {
			var info = {
				univId: req.body.univId,
				writer: req.body.writer,
				pageId: req.body.pageId,
				type: req.body.type,
				title: req.body.title,
				body: req.body.body,
//				viewCount: 0,
//				likeCount: 0,
				likes: [],
			};
			var board = new Board(info);
			board.save(function(err, doc){
				if(err) return next(err);
				else {
					res.send({success:1, msg:'Board saved', result: doc});
				}
			});
		}
	});
};	

function updateCommentThread(req, res, commentThread) {
	CommentThread.update({ _id : commentThread.id }, 
			{ $set: { replies : commentThread.replies }
	}).exec(function(err, savedComment) {
		if (err) {
			res.json(404, {
				msg : 'Failed to update CommentThread.'
			});
		} else {
			res.json({
				success: 1,
				msg : "Update Comment success",
				result: savedComment
			});
		}
	});
}

function addComment(req, res, commentThread, currentComment, parentId, newComment) {
	console.log("parentId:", parentId);
	if(!parentId){
		//case of undefined
		return res.json(404, { msg : 'parentId undefined.' });
	}
	if (commentThread.id == parentId) {
		commentThread.replies.push(newComment);
		updateCommentThread(req, res, commentThread);
	} else {
		for (var i = 0; i < currentComment.replies.length; i++) {
			var c = currentComment.replies[i];
			if (c._id == parentId) {
				c.replies.push(newComment);
				var replyThread = commentThread.replies.toObject();
				updateCommentThread(req, res, commentThread);
				break;
			} else {
				addComment(req, res, commentThread, c, parentId, newComment);
			}
		}
	}
};
function updateCommentThread(req, res, commentThread) {
	CommentThread.update({ _id : commentThread.id }, 
			{ $set: { replies : commentThread.replies }
	}).exec(function(err, savedComment) {
		if (err) {
			res.json(404, {
				msg : 'Failed to update CommentThread.'
			});
		} else {
			res.json({
				success: 1,
				msg : "Update Comment success",
				result: savedComment
			});
		}
	});
}
function generateRandomUsername() {
	// typically the username would come from an authenticated session
	var users = [ 'DaNae', 'Brad', 'Brendan', 'Caleb', 'Aedan', 'Taeg' ];
	return users[Math.floor((Math.random() * 5))];
}

module.exports = router;
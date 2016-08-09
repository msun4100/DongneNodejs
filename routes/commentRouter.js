var express = require('express'),
	router = express.Router(),
	async = require('async'),
	mUtil = require('../middleware/utilities'),
	ObjectID = require('mongodb').ObjectID;

var User = require('../db_models/userModel'),
	Friend = require('../db_models/friendModel'),
	CommentThread = require('../db_models/commentModel').CommentThread,
	Reply = require('../db_models/commentModel').Reply,
	Board = require('../db_models/boardModel');

router.get('/comments/get/:objectId', getCommentRoutes);
router.post('/comments/add', addCommentRoutes);

//findById를 쓰면 createFrom... 안하고 그냥 스트링 넣을 수 있음
function getCommentRoutes(req, res, next) {
	var objectIdString = req.params.objectId;
//	CommentThread.findOne({_id : ObjectID.createFromHexString("57591fa5894418fc1d2d2326")
//	CommentThread.find({ boardId: 299})
	CommentThread.findById({ _id : objectIdString })
	.exec(function(err, comment) {
		if(err) return next(err);
		if (!comment) {
			res.json(404, {
				error: true,
				message : 'CommentThread Not Found.'
			});
		} else {
			res.send({
				error: false, 
				message: 'CommentThread Found.'+comment.replies.length,
				total: comment.replies.length,
				result: comment
			});
		}
	});
};

/*
--postman 요청시--
parentCommentId: board.commentId //대댓글의 경우 해당 댓글의 ObjectId
*/
function addCommentRoutes(req, res, next) {
	var boardId = req.body.boardId,
		username = req.body.username,
		userId = parseInt(req.body.userId),
		body = req.body.body,
		parentCommentId = ""+req.body.parentCommentId;
		
	Board.findOne({ "boardId": boardId}).exec(function(err, board){
		if(err) return next(err);
		if(!board){ 
			return res.json(200, {
				error: false,
				message : 'BOARD_NOT_FOUND',
			}); 
		}
		//board.commentId가 null인 경우 === 첫 댓글이 작성되어 호출된 경우 === req.body.parentCommentId === board.commentId 가 null 
		if(board.commentId === null || board.commentId === undefined){
			console.log("null||undefined");
			var comment = new CommentThread({title: 'title:'+req.body.boardId});
			comment.save(function(err, comment){
				board.commentId = comment.id;
		        board.save(function(err){
		        	//newComment's info
		        	var info = {
		        			boardId: board.boardId,
			        		body: req.body.body
			        };
//					var newComment = Reply(req.body.newComment); //newComment를 var info{subject, body} 식으러 만들어
			        var newComment = new Reply(info); 
//					newComment.username = generateRandomUsername();
					addComment(req, res, comment, comment, comment._id, newComment);
//					addComment(req, res, commentThread, currentComment, parentCommentId, newComment);
//					parentId는 새로 생성한거니까 같은 코멘트쓰레드의 아이디를 넣음
		        }); //없던 board.comment.id를 추가하고, 코멘트쓰레드를 하나 생성해 댓글을 저장.
			});			
		} else {
			console.log("이미 board에 commentId가 있는 경우", board.commentId);
			CommentThread.findOne({ _id: board.commentId })
			.exec(function(err, commentThread) {
				var info = {
						userId: userId,
						username: username,
		        		body: body
		        };
				if(!commentThread) {
//						return res.json(404, {
//							msg : 'CommentThread Not Found.'
//						});
					var comment = new CommentThread({
//						_id: ObjectID.createFromHexString(board.commentId),
						_id: board.commentId,
						title: 'title:'+board.boardId,
						boardId: board.boardId});
					comment.save(function(err, comment){
						var newComment = new Reply(info);
//						newComment.username = generateRandomUsername();
						addComment(req, res, comment, comment, comment._id, newComment);	
					});
				} else {
			        var newComment = new Reply(info);
//					newComment.username = generateRandomUsername();
					addComment(req, res, commentThread, commentThread, parentCommentId, newComment);
				}
			});			
		} //else
	});
};	

router.post('/comments/like', function (req, res, next) {
	var boardId = req.body.boardId,
	username = req.body.username,
	userId = parseInt(req.body.userId),
	body = req.body.body,
	parentCommentId = ""+req.body.parentCommentId;
	
Board.findOne({ "boardId": boardId}).exec(function(err, board){
	if(err) return next(err);
	if(!board){ 
		return res.json(200, {
			error: false,
			message : 'BOARD_NOT_FOUND',
		}); 
	}
	//board.commentId가 null인 경우 === 첫 댓글이 작성되어 호출된 경우 === req.body.parentCommentId === board.commentId 가 null 
	if(board.commentId === null || board.commentId === undefined){
		console.log("null||undefined");
		var comment = new CommentThread({title: 'title:'+req.body.boardId});
		comment.save(function(err, comment){
			board.commentId = comment.id;
	        board.save(function(err){
	        	//newComment's info
	        	var info = {
	        			boardId: board.boardId,
		        		body: req.body.body
		        };
//				var newComment = Reply(req.body.newComment); //newComment를 var info{subject, body} 식으러 만들어
		        var newComment = new Reply(info); 
//				newComment.username = generateRandomUsername();
				likeComment(req, res, comment, comment, comment._id, newComment, userId);
//				addComment(req, res, commentThread, currentComment, parentCommentId, newComment);
//				parentId는 새로 생성한거니까 같은 코멘트쓰레드의 아이디를 넣음
	        }); //없던 board.comment.id를 추가하고, 코멘트쓰레드를 하나 생성해 댓글을 저장.
		});			
	} else {
		console.log("이미 board에 commentId가 있는 경우", board.commentId);
		CommentThread.findOne({ _id: board.commentId })
		.exec(function(err, commentThread) {
			var info = {
					userId: userId,
					username: username,
	        		body: body
	        };
			if(!commentThread) {
					return res.json(404, {
						error: true, message : 'CommentThread Not Found.'
					});
//				var comment = new CommentThread({
////					_id: ObjectID.createFromHexString(board.commentId),
//					_id: board.commentId,
//					title: 'title:'+board.boardId,
//					boardId: board.boardId});
//				comment.save(function(err, comment){
//					var newComment = new Reply(info);
////					newComment.username = generateRandomUsername();
//					likeComment(req, res, comment, comment, comment._id, newComment, userId);	
//				});
			} else {
		        var newComment = new Reply(info);
//				newComment.username = generateRandomUsername();
				likeComment(req, res, commentThread, commentThread, parentCommentId, newComment, userId);
			}
		});			
	} //else
});
});

router.post('/comments/dislike', function (req, res, next) {
	console.log('/dislike req.body:', req.body);
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


function addComment(req, res, commentThread, currentComment, parentId, newComment) {
//	console.log("parentId:", parentId);
	if(!parentId){
		//case of undefined
		return res.json(404, { error: true, message : 'parentId undefined.' });
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
	}).exec(function(err, result) {
		if (err) {
			res.json(404, {
				error: true,
				message : 'Failed to update CommentThread.'
			});
		} else {
			res.json({
				error: false,
				message : " Successfully Comment updated",
//				result: result //update result보내면 클라이언트 모델이랑 매칭 안됨
			});
		}
	});
}

function likeComment(req, res, commentThread, currentComment, parentId, newComment, userId) {
//	console.log("parentId:", parentId);
	if(!parentId){
		//case of undefined
		return res.json(404, { error: true, message : 'parentId undefined.' });
	}
	if (commentThread.id == parentId) {
		commentThread.replies.push(newComment);
		likeUpdateCommentThread(req, res, commentThread, userId);
	} else {
		for (var i = 0; i < currentComment.replies.length; i++) {
			var c = currentComment.replies[i];
			if (c._id == parentId) {
				c.replies.push(newComment);
				var replyThread = commentThread.replies.toObject();
				likeUpdateCommentThread(req, res, commentThread, userId);
				break;
			} else {
				likeComment(req, res, commentThread, c, parentId, newComment, userId);
			}
		}
	}
};

function likeUpdateCommentThread(req, res, commentThread, userId) {
	console.log("ct :", commentThread);
	//대소문자 주의! 대문자로 하면 메인코멘트 쓰레드고 소문자로하면 찾은 코멘트 쓰레드
	commentThread.update({ 
		"replies._id" : "57a028fd4cba655002bffc4b"
//		, "replies.likes":{"$ne": userId}
	},
	{
	"$inc" : {"replies.likeCount": 1}, 
	"$push": {"replies.likes": userId},
	"$set": {"replies.updatedAt": Date.now()}
	}).exec(function(err, result) {
		console.log("result:", result);
		if (err) {
			res.send({ error: true, message: 'Failed to update CommentThread.' });
		} else {
			if(result.n === 1 ){
				res.send({ error: false, message: "Successfully Comment updated" });
			} else {
				res.send({ error: true, message: 'failed to like updates'});
			}
		}
	});
}

function generateRandomUsername() {
	// typically the username would come from an authenticated session
	var users = [ 'DaNae', 'Brad', 'Brendan', 'Caleb', 'Aedan', 'Taeg' ];
	return users[Math.floor((Math.random() * 5))];
}

module.exports = router;
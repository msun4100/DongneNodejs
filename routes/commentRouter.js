var express = require('express'),
	router = express.Router(),
	async = require('async'),
	mUtil = require('../middleware/utilities'),
	ObjectID = require('mongodb').ObjectID,
	config = require('../config'),
	request = require('request'),
	TimeStamp = require('../gcm/timeStamp');

var User = require('../db_models/userModel'),
	Friend = require('../db_models/friendModel'),
	CommentThread = require('../db_models/commentModel').CommentThread,
	Reply = require('../db_models/commentModel').Reply,
	Board = require('../db_models/boardModel');

router.get('/comments/get/:objectId', getCommentRoutes);
router.post('/comments/add', addCommentRoutes);

router.post('/comments', getMyComments);
function getMyComments(req, res, next) {
	var userId = parseInt(req.body.userId);
	var start = req.body.start;
	var display = req.body.display;

	console.time('find replies');
	CommentThread.find({ "replies.userId": userId})
	.sort({"replies.updatedAt": -1})
	.exec(function(err, comment) {
		if(err) {return next(err);}
		if (!comment) {
			res.json(404, {
				error: true,
				message : 'CommentThread Not Found.'
			});
		} else {
			var list = [];
			var i,j;
			comment.forEach(function(value, index){
//				console.log(""+index+":");
				if(value.replies){
					var reps = value.replies;
					for(i=0; i<reps.length; i++){
						if(reps[i].userId === userId){
							var copy = JSON.parse(JSON.stringify( reps[i] ));	//deep copy
							copy.boardId = value.boardId;
							list.push(copy);
						} 
					}
				}
			});
			var newList = [];
			if(start && display && list){
				var skip = start * display;
				var len = 0;
				while(len < display){
					var index = skip + len;
					if(index >= list.length){ break; }
					newList.push(list[index]);
					len++;
				}
				console.log(newList);
			}
			if(newList.length === 0){
				res.send({
					error: false, 
					message: 'HAS_NO_REPLIES_ITEM',
					total: list.length
				});
			} else {
				res.send({
					error: false, 
					message: 'CommentThread Found.',
					total: list.length,
					result: newList
				});	
			}
			
			console.timeEnd('find replies');

		}
	});
}


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
		type = req.body.type,
		parentCommentId = ""+req.body.parentCommentId;
	
	//gcm push위해 새로 추가
	var reqDate = req.body.reqDate,
		to = req.body.to;
	
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
			        		body: req.body.body,
			        		type: type
			        };
//					var newComment = Reply(req.body.newComment); //newComment를 var info{subject, body} 식으러 만들어
			        var newComment = new Reply(info); 
//					newComment.username = generateRandomUsername();
			        gcmInfo.to = board.writer;
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
		        		body: body,
		        		type: type
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
//		updateCommentThread(req, res, commentThread);
		updateCommentThread(req, res, commentThread, newComment);	
		//newComment 오버라이딩한이유는 새로추가된 댓글_id 확인 위해
	} else {
		for (var i = 0; i < currentComment.replies.length; i++) {
			var c = currentComment.replies[i];
			if (c._id == parentId) {
				c.replies.push(newComment);
				var replyThread = commentThread.replies.toObject();
				updateCommentThread(req, res, commentThread, newComment);
				break;
			} else {
				addComment(req, res, commentThread, c, parentId, newComment);
			}
		}
	}
};
function updateCommentThread(req, res, commentThread, newComment) {
	CommentThread.update({ _id : commentThread.id }, 
			{ $set: { replies : commentThread.replies }
	}).exec(function(err, result) {
		if (err) {
			res.json(404, {
				error: true,
				message : 'Failed to update CommentThread.'
			});
		} else {
			var msg = config.gcm.MSG_PUSH_REPLY;
			var msg_id = 2;
			if(newComment.type === "00" || newComment.type === "10"){
				msg = config.gcm.MSG_PUSH_REPLY_ANONYMOUS;
				msg_id = 3;
			}
			request({
				method: 'POST',
				uri: config.host + '/users/' + req.body.to + '/message',
				headers: { 'Content-Type' : 'application/json' },
				body: JSON.stringify({
					reqDate: req.body.reqDate,
					user_id: req.body.userId,
					message: msg,
					message_id: msg_id,	//id===2 면 클라이언트 스트링밸류 2 댓글이 달렸습니다.
					chat_room_id: req.body.boardId,
					pushType: config.gcm.PUSH_FLAG_NOTIFICATION,
					to: req.body.to	
					//to는 필요 없는 것 같은데 sendAll 할때 쓰고선 계속 복붙한듯, 코멘트는 to가 있어야 하나?
				})
			}, function(error, resp, body) {
				if(error){ console.log("addComment push error:", error);}
			});		//request
			//request(writer에게 푸시)와는 별개로 글쓴이에게 성공 응답
			console.log("newComment:", newComment);
			res.json({
				error: false,
				message : " Successfully Comment updated",
				result: newComment
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
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

router.get('/comments/get', getCommentRoutes);
router.post('/comments/add', addCommentRoutes);

//findById를 쓰면 createFrom... 안하고 그냥 스트링 넣을 수 있음
//이 함수가 처음엔 해당글(photo나 page 등이 코멘트쓰레드에 해당하는 commentId 를 갖고 있음
//init.js에서 commentThread 생성해서 그 아이디를 photo나 page가 각각 갖고 있음
//그래서 _id로 검색하는 것 
//근데 나는 인풋으로 받은 글넘버랑 코멘트쓰레드 스키마의 postId랑 비교해서 같으면 보내려 함

function getCommentRoutes(req, res, next) {

//	CommentThread.findOne({
//		_id : ObjectID.createFromHexString("57591fa5894418fc1d2d2326")
	CommentThread.findById({ _id : "57591fa5894418fc1d2d232b" })
	.exec(function(err, comment) {
		if(err) return next(err);
		if (!comment) {
			res.json(404, {
				msg : 'CommentThread Not Found.'
			});
		} else {
			res.send({success: 1, msg: 'CommentThread Found.', result: comment});
		}
	});
};

/*
--postman 요청시--
boardId: board.id,
subject: 댓글 제목,
body: 댓글 내용
parentCommentId: board.commentId //대댓글의 경우 해당 댓글의 ObjectId
*/
function addCommentRoutes(req, res, next) {
//	parentCommentId = req.body.parentCommentId;
//	Board.findById({ _id: req.body.boardId}).exec(function(err, board){
	Board.findById({ _id: ObjectID.createFromHexString(req.body.boardId)}).exec(function(err, board){
		if(err) return next(err);
		if(!board){ 
			return res.json(200, {
				msg : 'Board Not Found.'
			}); 
		}
		//board.commentId가 null인 경우 === 첫 댓글이 작성되어 호출된 경우 === req.body.parentCommentId === board.commentId 가 null 
		if(board.commentId === null || board.commentId === undefined){
//			console.log("null||undefined");
			var comment = new CommentThread({title: 'title'+req.body.subject});
			comment.save(function(err, comment){
				board.commentId = comment.id;
		        board.save(function(err){
		        	var info = {
			        		subject: req.body.subject,
			        		body: req.body.body
			        };
//					var newComment = Reply(req.body.newComment); //newComment를 var info{subject, body} 식으러 만들어
			        var newComment = new Reply(info); 
					newComment.username = generateRandomUsername();
					addComment(req, res, comment, comment, comment._id, newComment);
//					addComment(req, res, commentThread, currentComment, parentCommentId, newComment);
//					parentId는 새로 생성한거니까 같은 코멘트쓰레드의 아이디를 넣음
		        }); //없던 board.comment.id를 추가하고, 코멘트쓰레드를 하나 생성해 댓글을 저장.
			});			
		} else {
//			console.log("이미 board에 commentId가 있는 경우");
			CommentThread.findOne({ _id: board.commentId })
			.exec( function(err, commentThread) {
				if (!commentThread) {
						res.json(404, {
							msg : 'CommentThread Not Found.'
						});
				} else {
					var info = {
			        		subject: req.body.subject,
			        		body: req.body.body
			        };
			        var newComment = new Reply(info);
					newComment.username = generateRandomUsername();
					addComment(req, res, commentThread, commentThread, req.body.parentCommentId, newComment);
				}
			});			
		} //else
	});
};	

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
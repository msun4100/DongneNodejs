var express = require('express'),
	router = express.Router(),
	async = require('async'),
	mUtil = require('../middleware/utilities');

var User = require('../db_models/userModel'),
	Friend = require('../db_models/friendModel');

//router.post('/friends/:friend', addFriends); //deprecated
router.get('/friends/:status', [mUtil.requireAuthentication], showFriends);
router.post('/friends/:status', [mUtil.requireAuthentication], updateFriends);



function updateFriends(req, res, next) {
	var status = req.params.status;

	var user = req.user;
	var to = req.body.to;
//	if (user) {
//	} else {
//		next(new Error({code : 500,message : 'do not login'}));
//	}
	
	var info = {"from": user.userId, "to": to, "actionUser": user.userId, "status": status};
	var friend = new Friend(info);
//	console.log('friend: ', friend);
	var query = Friend.find();
	query.or([{"from": user.userId, "to": to}, {"from": to, "to": user.userId}]);
	query.exec(function(err, docs){
		if(err){
			err.code = 500;
			next(err);
		} 
//		반대 케이스 처리는? showUserDetail에서 처리
		if(docs.length === 1){
			if( status && status < 4){
				docs[0].status = status;
				docs[0].updatedAt = Date.now();
				docs[0].actionUser = user.userId;
			} else {
				res.send({success:0, msg:'wrong status', result: {} }); 
				return;
			}
			docs[0].save(function(err, doc){
				if(err) return next(err);
				res.send({
			    	success:1,
			    	msg:'friends status changed',
			    	result:docs
			    });	
			});
		} else if( docs.length === 0 ){
			friend.save().then(function fulfilled(result) {
				res.send({
					success : 1,
					msg : 'add Friends by update func',
					result : result
				});
			}, function rejected(err) {
				//"E11000 duplicate key error collection: dongne.users index: email_1 dup key: { : \"adduser@gmail.com\" }"
				//case of {from-->to} or {to-->from} duplicate
				err.code = 500;
				next(err);
			});
		} else {
			res.send({success:0, msg:'find error', result: {} }); 
			return;
		}
		
	});
}

function addFriends(req, res, next) {
    var user = req.user;	//session에 user가 저장되어 있는지
    var reqFriend = req.params.friend;
    console.log('reqeusted friends', reqFriend);
//    if( user ){
//    	
//    } else {
//    	var err={ code: 500, message: 'do not login'};
//		next(err);
//    }
    var info = {from: user.userId, to: reqFriend, actionUser: user.userId};
    var friend = new Friend(info);
    console.log('friend: ', friend);
    
    //3번이 0번한테 걸고나서( from:3, to:0, actionId:3, status:0 )
    //0번이 comfirm을 안하고 또 3번한테 친구추가를 하는 등의 예외 처리 후
    //friends 컬렉션에 추가. + 중복처리는 rejected에서
    var query = Friend.find();
	query.and([{from: reqFriend},{to: user.userId }]);//반대 case가 있는 경우
	query.exec(function(err, docs){
		if(err){
			next(err);
		} 
		if(docs.length > 0){
			res.send({
				success : 1,
				msg : 'already requests',
				result : docs
			});	
		} else {
			friend.save().then(function fulfilled(result) {
				console.log('result:', result);
				res.send({
					success : 1,
					msg : 'add Friends',
					result : result
				});
			}, function rejected(err) {
				//"E11000 duplicate key error collection: dongne.users index: email_1 dup key: { : \"adduser@gmail.com\" }"
				//case of {from-->to} or {to-->from} duplicate
				err.code = 500;
				next(err);
			});
		}
	});
}

function showFriends(req, res, next){
	
//	status
//	0 pending .and({from:3, status:0})	//요청한
//	00 pending .and({to:3, status:0})	//요청받은
//	1 accepted .and([ {$or:[{from: 3},{to: 3}]}, {status:1} ])	//일촌상태
//	2 declined .and({from:3, status:2})	//거절한
//	3 blocked .and({from:3, status:3})	//차단한
	
	var status = req.params.status;

	var user = req.user;
//	if( user ){
//		
//	} else {
//		var err={ code: 500, message: 'do not login'};
//		next(err);
//	}	

	switch(status){
	case "0":
		var list = [];
		var query = Friend.find();
		query.and({from:user.userId, status:0});
		query.select({_id:0});
		query.exec().then(function fulfilled(results) {
			var ids = [];
			for(i=0; i< results.length; i++){
				if(results[i].from === user.userId){
					ids.push(results[i].to);	
				} else if(results[i].to === user.userId){
					ids.push(results[i].from);	
				}
			}
			User.find({ "userId":{$in: ids} }, function(err, users){
				if(users.length != 0){
					res.send({
						success : 1,
						msg:'pending-0 friends: ' + users.length,
						result : users
					});		
				} else {
					res.send({
						success : 0,
						msg:'has no pending-0 friends',
						result : []
					});	
				}
			});
		}, function rejected(err) {
			err.code = 500;
			next(err);
		});
//		var query = Friend.find({$or:[{"from": user.userId}, {"to": user.userId}]});
//		var list = [];
//		query.exec(function(err, docs){
//			if(err) callback(err, null);
//			for(i = 0; i < docs.length; i++){
//				if(docs[i].from === user.userId){
//					User.findOne({userId: docs[i].to}, function(err, user){
//						list.push(user);
//					});
//				} else if(docs[i].to === user.userId){
//					User.findOne({userId: docs[i].from}, function(err, user){
//						list.push(user);
//					});
//				}
//			}
//			callback(null, list);
//		});
		
		break;
	case "00":
		var query = Friend.find();
		query.and({to:user.userId, status:0});
		query.select({_id:0});
		query.exec().then(function fulfilled(results) {
			var ids = [];
			for(i=0; i< results.length; i++){
				if(results[i].from === user.userId){
					ids.push(results[i].to);	
				} else if(results[i].to === user.userId){
					ids.push(results[i].from);	
				}
			}
			User.find({ "userId":{$in: ids} }, function(err, users){
				if(users.length != 0){
					res.send({
						success : 1,
						msg:'pending-00 friends',
						result : users
					});		
				} else {
					res.send({
						success : 0,
						msg:'has no pending-00 friends',
						result : []
					});	
				}
			});
		}, function rejected(err) {
			err.code = 500;
			next(err);
		});
		break;
	case "1":
		var query = Friend.find();
//	 	query.mod('size',2,0);
//	 	query.where('friends').gt(6);
//		query.or([{from: 3},{to: 3}]);
		query.and([ {$or:[{from: user.userId},{to: user.userId}]}, {status: 1} ])
//		query.where('userId').in( friends );
//	 	query.limit(10);
		query.select({_id:0, from:1, to:1, status:1, actionUser:1, updatedAt:0});
//		query.sort({ userId: 1});
		query.exec().then(function fulfilled(results) {
			var ids = [];
			for(i=0; i< results.length; i++){
				if(results[i].from === user.userId){
					ids.push(results[i].to);	
				} else if(results[i].to === user.userId){
					ids.push(results[i].from);	
				}
			}
			User.find({ "userId":{$in: ids} }, function(err, users){
				if(users.length != 0){
					res.send({
						success : 1,
						msg:'accepted friends',
						result : users
					});		
				} else {
					res.send({
						success : 0,
						msg:'has no accepted friends',
						result : []
					});	
				}
			});
		}, function rejected(err) {
			err.code = 500;
			next(err);
		});
		
		
//		query.exec(function(err, docs){
//			if(err){
////				err.code = 500;
//				next(err);
//			} 
//			if(docs.length != 0){
//				res.send({
//			    	success:1,
//			    	msg:'accepted friends',
//			    	result:docs
//			    });	
//			} else {
//				res.send({
//			    	success:0,
//			    	msg:'has no accepted friends',
//			    	result:[]
//			    });
//			}
//		});
		break;
	case "2":
		var ids = [];
		var query = Friend.find();
		query.and([ {$or:[{from: user.userId}, {to: user.userId}]}, {actionUser: user.userId}, {status: 2}  ])
//		var query = Friend.find({$or:[{"from": user.userId, "status": 2, "actionUser": user.userId}, {"to": user.userId, "status": 2, "actionUser": user.userId}]});
//		query.and({from: user.userId, status:2})
		query.select({_id:0});
		query.exec().then(function fulfilled(results) {
			for(i=0; i< results.length; i++){
				if(results[i].from === user.userId){
					ids.push(results[i].to);	
				} else if(results[i].to === user.userId){
					ids.push(results[i].from);	
				}
			}
			User.find({ "userId":{$in: ids} }, function(err, users){
				if(users.length != 0){
					res.send({
						success : 1,
						msg:'declined friends',
						result : users
					});		
				} else {
					res.send({
						success : 0,
						msg:'has no declined friends',
						result : []
					});	
				}
			});
		}, function rejected(err) {
			err.code = 500;
			next(err);
		});
		break;
	case "3":
		var ids = [];
		var query = Friend.find();
		query.and([ {$or:[{from: user.userId}, {to: user.userId}]}, {actionUser: user.userId}, {status: 3} ])
//		query.and({from: user.userId, status:2})
		query.select({_id:0});
		query.exec().then(function fulfilled(results) {
			for(i=0; i< results.length; i++){
				if(results[i].from === user.userId){
					ids.push(results[i].to);	
				} else if(results[i].to === user.userId){
					ids.push(results[i].from);	
				}
			}
			User.find({ "userId":{$in: ids} }, function(err, users){
				if(users.length != 0){
					res.send({
						success : 1,
						msg:'blocked friends',
						result : users
					});		
				} else {
					res.send({
						success : 0,
						msg:'has no blocked friends',
						result : []
					});	
				}
			});
		}, function rejected(err) {
			err.code = 500;
			next(err);
		});
		break;
		default:
			break;
	} //sw

}

function showFriendsList(req, res, next){	//수정전. friends collection들의 값 불 러옴
	
//	status
//	0 pending .and({from:3, status:0})	//요청한
//	00 pending .and({to:3, status:0})	//요청받은
//	1 accepted .and([ {$or:[{from: 3},{to: 3}]}, {status:1} ])	//일촌상태
//	2 declined .and({from:3, status:2})	//거절한
//	3 blocked .and({from:3, status:3})	//차단한
	
	var status = req.params.status;

	var user = req.user;
//	if( user ){
//		
//	} else {
//		var err={ code: 500, message: 'do not login'};
//		next(err);
//	}	

	switch(status){
	case "0":
		var query = Friend.find();
		query.and({from:user.userId, status:0});
		query.select({_id:0});
		query.exec(function(err, docs){
			if(err){
				err.code = 500;
				next(err);
			}
			if(docs.length != 0){
				res.send({
			    	success:1,
			    	msg:'pending-0 friends',
			    	result:docs
			    });	
			} else {
				res.send({
			    	success:0,
			    	msg:'has no pending-0 friends',
			    	result:[]
			    });
			}
		    
		});
		break;
	case "00":
		var query = Friend.find();
		query.and({to:user.userId, status:0});
		query.select({_id:0});
		query.exec(function(err, docs){
			if(err){
				err.code = 500;
				next(err);
			}
			if(docs.length != 0 ){
				res.send({
			    	success:1,
			    	msg:'pending-00 friends',
			    	result:docs
			    });	
			} else {
				res.send({
			    	success:0,
			    	msg:'has no pending-00 friends',
			    	result:[]
			    });
			}
		    
		});
		break;
	case "1":
		var query = Friend.find();
//	 	query.mod('size',2,0);
//	 	query.where('friends').gt(6);
//		query.or([{from: 3},{to: 3}]);
		query.and([ {$or:[{from: user.userId},{to: user.userId}]}, {status: 1} ])
//		query.where('userId').in( friends );
//	 	query.limit(10);
		query.select({_id:0, from:1, to:1, status:1, actionUser:1, updatedAt:1});
//		query.sort({ userId: 1});
		query.exec(function(err, docs){
			if(err){
//				err.code = 500;
				next(err);
			} 
			if(docs.length != 0){
				res.send({
			    	success:1,
			    	msg:'accepted friends',
			    	result:docs
			    });	
			} else {
				res.send({
			    	success:0,
			    	msg:'has no accepted friends',
			    	result:[]
			    });
			}
		});
		break;
	case "2":
		var query = Friend.find();
		query.and({from: user.userId, status:2})
		query.select({_id:0});
		query.exec(function(err, docs){
			if(err){
				err.code = 500;
				next(err);
			}
			if(docs.length != 0){
				res.send({
			    	success:1,
			    	msg:'declined friends',
			    	result:docs
			    });	
			} else {
				res.send({
			    	success:0,
			    	msg:'has no declined friends',
			    	result:[]
			    });
			}
		    
		});
		break;
	case "3":
		var query = Friend.find();
		query.and({from: user.userId, status:3})
		query.select({_id:0});
		query.exec(function(err, docs){
			if(err){
				err.code = 500;
				next(err);
			} 
			if(docs.length != 0){
				res.send({
			    	success:1,
			    	msg:'blocked friends',
			    	result:docs
			    });	
			} else {
				res.send({
			    	success:0,
			    	msg:'has no blocked friends',
			    	result:[]
			    });
			}
		});
		break;
		default:
			break;
	} //sw

}	  

module.exports = router;

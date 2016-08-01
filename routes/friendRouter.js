var express = require('express'),
	router = express.Router(),
	async = require('async'),
	mUtil = require('../middleware/utilities');

var User = require('../db_models/userModel'),
	Friend = require('../db_models/friendModel');

var gpsProvider = require('../gpsProvider')();


//router.post('/friends/:friend', addFriends); //deprecated
router.get('/friends/:status', [mUtil.requireAuthentication], showFriends);
router.post('/friends/:status', [mUtil.requireAuthentication], updateFriends);
router.get('/friends/univ/:univId', [mUtil.requireAuthentication], showUnivUsers);
router.post('/friends/univ/:univId', [mUtil.requireAuthentication], postUnivUsers);
router.post('/friends/univ/:univId/my', [mUtil.requireAuthentication], postMyFriends);
router.post('/friends/test/reqdate', function(req,res,next){
	var univId = 1;
	var start = parseInt(req.body.start);
	var display = parseInt(req.body.display);
	var reqDate = req.body.reqDate;
	console.log(req.body);
//	4990번째 유저보다 늦게 가입한 친구들 찾기 --> 9명 검색 됨 4991~ 4999
//	userId: 4990의 updatedAt --> 2016-07-21T09:01:51.564Z
	User.find({"updatedAt": {"$gt": '2016-07-21T09:01:51.564Z'}}, { _id: 0, password: 0, salt: 0, work: 0, updatedAt: 0, createdAt: 0, __v: 0, "univ._id": 0 })
	.sort({username: 1})
	.skip(start * display)
	.limit(display).exec(function(err, users){
		if(err) res.send(error);
		else res.send({
			error : false,
			message : ':univ all friends',
			result : users
		});
	});
});
function updateFriends(req, res, next) {
	var status = req.params.status;

	var user = req.user;
	var to = req.body.to;
//	if (user) {
//	} else {
//		next(new Error({code : 500,message : 'do not login'}));
//	}
	if(to === undefined || to === null || to === ""){
		res.send({
			error: true,
	    	message:'from or to userId is null',
		});
		return;
	}
	
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

var inArray = function(value) {
	// Returns true if the passed value is found in the array. Returns false if it is not.
	var i;
	for (i = 0; i < this.followers.length; i++) {
		console.log("this.followers["+i+"]", this.followers[i]);
		if (this.followers[i] === value) {
			return true;
		}
	}
	return false;
};

function showUnivUsers(req, res, next) {
	var univId = req.params.univId;
	var user = req.user;
//	console.log(req.user);
	async.waterfall([ 
	        function (callback) {
	        	//전체 대학교 유저리스트
	        	console.time('TIMER');	//실행시간 체크 스타트
	        	User.find({"univ.univId": univId}, { _id: 0, password: 0, salt: 0, work: 0, updatedAt: 0, createdAt: 0, __v: 0, "univ._id": 0 })
	        	.sort({username: 1}).limit(30).exec(function(err, users){
	        		if(err) callback(err, null);
	        		else callback(null, users);
	        	});
	        },
	        function (users, callback) {
	        	//find accepted friends and fetch isFriend
	        	var query = Friend.find();
	    		query.and([ {$or:[{from: user.userId}, {to: user.userId}]}, {status: 1} ])
	    		query.select({_id:0});
//	    		query.sort({ userId: 1});
	    		query.exec().then(function fulfilled(results) {
	    			console.time('TIMER-ISFRIEND');
	    			var ids = [];
	    			var i, j;
	    			for(i=0; i < results.length; i++){
	    				if(results[i].from === user.userId){
	    					ids.push(results[i].to);	
	    				} else if(results[i].to === user.userId){
	    					ids.push(results[i].from);	
	    				}
	    			}
	    			for(i=0; i < ids.length; i++){
	    				for (j = 0; j < users.length; j++) {
	    					if (users[j].userId === ids[i]) {
	    						users[j].isFriend = true;
	    						break;
	    					}
	    				}
	    			}
	    			console.timeEnd('TIMER-ISFRIEND');
	    			callback(null, users);
	    		}, function rejected(err) {
	    			callback(err, null);
	    		});
	        },
	        function (users, callback) {
	        	fetchDistance(user.location, users, function(err, list) {
					if (err) callback(err, null);
					else {
						callback(null, list);
					}
				});
			}],
			function (err, list) { 
				if(err) { res.send({ error: true, message: err.message}); }
				else{
					console.timeEnd('TIMER');
					res.send({
						error : false,
						message : list.length + ':univ all friends',
						result : list
					});
				} 
			});
}

function postUnivUsers(req, res, next) {
	var univId = req.params.univId;
	var start = parseInt(req.body.start);
	var display = parseInt(req.body.display);
	var reqDate = req.body.reqDate;
	var user = req.user;
	console.log(req.body);
	
	var total = 0;
	async.waterfall([
	        function(callback) {
	        	//전체 대학교 유저리스트
	        	console.time('TIMER');	//실행시간 체크 스타트
//	        	User.find({"univ.univId": univId, "updatedAt": {"$lte": reqDate}}, { _id: 0, password: 0, salt: 0, work: 0, updatedAt: 0, createdAt: 0, __v: 0, "univ._id": 0 })
	        	User.find({"univ.univId": univId}, { _id: 0, password: 0, salt: 0, work: 0, updatedAt: 0, createdAt: 0, __v: 0, "univ._id": 0 })
	        	.sort({username: 1})
	        	.skip(start * display)
	        	.limit(display).exec(function(err, users){
	        		if(err) callback(err, null);
	        		else callback(null, users);
	        	});
	        },
	        function(users, callback){
//	        	console.time('TIMER-COUNT');
//	        	User.find({"univ.univId": univId}, function(err, docs){
//	        		if(err) callback(err, null);
//	        		total = docs.length;
//	        		console.log("total:", total);
//	        		console.timeEnd('TIMER-COUNT');
//	        		callback(null, users);
//	        	});
	        	//find로 할때랑 count로 할때랑 1초 이상 가량의 속도차이가 남. users.length가 5000 일때
	        	console.time('TIMER-COUNT');
	        	User.count({"univ.univId": univId}, function(err, count){
	        		if(err) callback(err, null);
	        		total = count;
	        		console.log("total:", count);
	        		console.timeEnd('TIMER-COUNT');
	        		callback(null, users);
	        	});
	        },
	        function (users, callback) {
	        	//find accepted friends and fetch isFriend
	        	var query = Friend.find();
	    		query.and([ {$or:[{from: user.userId}, {to: user.userId}]}, {status: 1} ])
	    		query.select({_id:0});
//	    		query.sort({ userId: 1});
	    		query.exec().then(function fulfilled(results) {
	    			console.time('TIMER-ISFRIEND');
	    			var ids = [];
	    			var i, j;
	    			for(i=0; i < results.length; i++){
	    				if(results[i].from === user.userId){
	    					ids.push(results[i].to);	
	    				} else if(results[i].to === user.userId){
	    					ids.push(results[i].from);	
	    				}
	    			}
	    			for(i=0; i < ids.length; i++){
	    				for (j = 0; j < users.length; j++) {
	    					if (users[j].userId === ids[i]) {
	    						users[j].isFriend = true;
	    						break;
	    					}
	    				}
	    			}
	    			console.timeEnd('TIMER-ISFRIEND');
	    			callback(null, users);
	    		}, function rejected(err) {
	    			callback(err, null);
	    		});
	        },
	        function (users, callback) {
	        	fetchDistance(user.location, users, function(err, list) {
					if (err) callback(err, null);
					else {
						callback(null, list);
					}
				});
			}],
			function (err, list) { 
				if(err) { res.send({ error: true, message: err.message}); }
				else{
					console.timeEnd('TIMER');
					res.send({
						error : false,
						total : total,
						message : 'univ all friends total:'+list.length,
						result : list
					});
				} 
			});
}

function postMyFriends(req, res, next) {
	var univId = req.params.univId;
	var start = parseInt(req.body.start);
	var display = parseInt(req.body.display);
	var reqDate = req.body.reqDate;
	var user = req.user;
	console.log(req.body);
	var total = 0;
	//==================
	async.waterfall([ function(callback){ 
		console.time('TIMER-mycount');
		var query = Friend.count();
		query.and([ {$or:[{from: user.userId}, {to: user.userId}]}, {status: 1} ]);
		query.exec(function(err, count){
			if(err) callback(err, null);
			if(count === 0) { console.log("postMyFriends_count_is_zero");}
			console.timeEnd('TIMER-mycount');
			callback(null, count);
		});
	}], function(err, count){
		//여기에 count === 0 일때 error: false 지만 리스트.length === 0 이기때문에 따로 처리해주는 코드 추가
		var query = Friend.find();
		query.and([ {$or:[{from: user.userId}, {to: user.userId}]}, {status: 1} ])
		query.select({_id:0});
		query.sort({ username: 1});
		query.skip(start * display);
	 	query.limit(display);
		query.exec().then(function fulfilled(results) {
			var ids = [];
			for(i=0; i< results.length; i++){
				if(results[i].from === user.userId){
					ids.push(results[i].to);	
				} else if(results[i].to === user.userId){
					ids.push(results[i].from);	
				}
			}
			User.find({ "userId": {$in: ids} }, { _id: 0, password: 0, salt: 0, work: 0, updatedAt: 0, createdAt: 0, __v: 0, "univ._id": 0 }, function(err, users){
				if(users.length !== 0){
					for (i = 0; i < ids.length; i++) {
						users[i].isFriend = true;
					}
					fetchDistance(user.location, users, function(err, list) {
						if (err) return next(err);
						res.send({
							error : false,
							message : 'accepted friends ' + users.length,
							total : count,
							result : list
						});
					});
				} else {
					res.send({
						error : false,
						message:'has no more accepted friends',
					});	
				}
			});
		}, function rejected(err) {
			console.log("reject");
			err.code = 500;
			next(err);
		});
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
			User.find({ "userId":{$in: ids} }, {_id:0, password:0, salt:0, work:0, updatedAt:0, createdAt:0, __v:0, "univ._id":0 },function(err, users){
				if(users.length != 0){
					fetchDistance(user.location, users, function(err, list){
						if(err) return next(err);
						res.send({
							error : false,
							message:'pending-0 friends: ' + users.length,
							result : list
						});						
					});
				} else {
					res.send({
						error : true,
						message:'has no pending-0 friends',
					});	
				}
			});
		}, function rejected(err) {
			err.code = 500;
			next(err);
		});
		break;
	case "00":
		var query = Friend.find();
		query.and({to:user.userId, status:0});
		query.select({_id:0});
		query.exec().then(function fulfilled(results) {
			var ids = [];
			for(i=0; i< results.length; i++){
				if(results[i].from === undefined || results[i].to === undefined){
					continue;
				}
				if(results[i].from === user.userId){
					ids.push(results[i].to);	
				} else if(results[i].to === user.userId){
					ids.push(results[i].from);	
				}
			}
			User.find({ "userId":{$in: ids} }, function(err, users){
				if(users.length != 0){
					res.send({
						error : false,
						message:'pending-00 friends',
						result : users
					});		
				} else {
					res.send({
						error : true,
						message:'has no pending-00 friends',
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
//		query.and([ {$or:[{from: user.userId}, {to: user.userId}]}, {actionUser: user.userId}, {status: 2}  ])
		query.and([ {$or:[{from: user.userId}, {to: user.userId}]}, {status: 1} ])
//		query.where('userId').in( friends );
//	 	query.limit(10);
		query.select({_id:0});
//		query.sort({ userId: 1});
		query.exec().then(function fulfilled(results) {
			var ids = [];
			var total = 0;
			for(i=0; i< results.length; i++){
				if(results[i].from === user.userId){
					ids.push(results[i].to);	
				} else if(results[i].to === user.userId){
					ids.push(results[i].from);	
				}
			}
			User.find({ "userId": {$in: ids} }, { _id: 0, password: 0, salt: 0, work: 0, updatedAt: 0, createdAt: 0, __v: 0, "univ._id": 0 }, function(err, users){
				if(users.length !== 0){
					for(i=0; i < ids.length; i++){
						users[i].isFriend = true;
	    			}
					fetchDistance(user.location, users, function(err, list){
						if(err) return next(err);
						res.send({
							error : false,
							message:'accepted friends ' + users.length,
							total: users.length,
							result : list
						});						
					});
							
				} else {
					res.send({
						error : true,
						message:'has no accepted friends',
					});	
				}
			});
		}, function rejected(err) {
			console.log("reject");
			err.code = 500;
			next(err);
		});
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
						error : false,
						message:'declined friends',
						result : users
					});		
				} else {
					res.send({
						error : true,
						message:'has no declined friends',
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
						error : false,
						message:'blocked friends',
						result : users
					});		
				} else {
					res.send({
						error : true,
						message:'has no blocked friends',
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

function fetchDistance(refPoint, users, cb){
	
	var defaultValue = "somewhere";
	var list= [];
	var i, sum=0;
	if(refPoint.lat === null || refPoint.lon === null || refPoint.lat === 99999 || refPoint.lon === 99999 || refPoint.lat === "" || refPoint.lon === ""){
		for(i=0; i<users.length; i++){
			users[i].temp = defaultValue;
			list.push(users[i]);
		}
	} else {
		for(i=0; i<users.length; i++){
			if(users[i].location.lat === null || users[i].location.lon === null){
				users[i].temp = defaultValue;
			} else {
				users[i].temp = gpsProvider.getDistance( refPoint.lat, refPoint.lon, users[i].location.lat, users[i].location.lon);
			}
			list.push(users[i]);
		}	
	}
	return cb(null, list);
}

module.exports = router;

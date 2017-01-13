var express = require('express'),
	router = express.Router(),
	async = require('async'),
	mUtil = require('../middleware/utilities');

var User = require('../db_models/userModel'),
	Friend = require('../db_models/friendModel');

var gpsProvider = require('../gpsProvider')();
var config = require('../config'),
	request = require('request');

//router.post('/friends/:friend', addFriends); //deprecated, update로 대체

router.get('/friends/:status', showFriends);
router.post('/friends/:status', updateFriends);

router.delete('/friends/:userId', removeFriends);
router.get('/friends/univ/:univId', showUnivUsers);
router.post('/friends/univ/:univId', postUnivUsers);
router.post('/friends/univ/:univId/my', postMyFriends);

router.get('/friends/status/:userId', getStatus);
router.post('/friends/univ/:univId/search', postSearchUnivUsers);
router.post('/friends/univ/:univId/search/my', postSearchMyFriends);
router.get('/chat_rooms/list', getMyAllFriendsList);


function removeFriends(req, res, next) {
	var userId = req.params.userId;
	var user = req.user;
	//	query.and([ {$or:[{"from": user.userId, "to": userId}, {"from": userId, "to": user.userId}]}, {"status": status} ])
	Friend.findOneAndRemove(
		{ "$or": [{ "from": user.userId, "to": userId }, { "from": userId, "to": user.userId }] })
		.then(function fulfilled(result) {
			res.send({ error: false, message: 'successfully removed' });
		}, function rejected(err) {
			res.send({ error: true, message: 'remove error occurred' });
		});
}


function getStatus(req, res, next) {

	var userId = req.params.userId;
	var user = req.user;

	if (userId === undefined) {
		res.send({
			error: true,
			message: 'userId params undefined error',
		});
		return;
	}

	var query = Friend.find();
	query.or([{ "from": user.userId, "to": userId }, { "from": userId, "to": user.userId }]);
	//	select({ name: 1, occupation: 1 }).
	query.select({ __v: 0, _id: 0 });
	//	query.and([ {$or:[{"from": user.userId, "to": userId}, {"from": userId, "to": user.userId}]}, {"status": status} ])
	query.exec(function (err, docs) {
		if (err) {
			err.code = 500;
			return next(err);
		}
		// console.log("find status docs", docs);
		// console.log("find status docs.length", docs.length);
		if (docs.length === 1) {
			res.send({ error: false, message: 'FIND_STATUS', result: docs[0] });
		} else if (docs.length === 0) {
			var obj = {
				from: user.userId, to: userId, status: -1, actionUser: user.userId, updatedAt: new Date(), msg: ""
			}
			res.send({ error: false, message: 'STATUS_NOT_FOUND', result: obj });
		} else { //0 or 1 이외의 length가 존재하면 안됨. 래빗큐로 에러로그 전송.
			res.send({ error: true, message: 'STATUS_LENGTH_ERROR' });
		}
	});
}
router.post('/friends/test/reqdate', function (req, res, next) {
	var univId = 1;
	var start = parseInt(req.body.start);
	var display = parseInt(req.body.display);
	var reqDate = req.body.reqDate;
	console.log(req.body);
	//	4990번째 유저보다 늦게 가입한 친구들 찾기 --> 9명 검색 됨 4991~ 4999
	//	userId: 4990의 updatedAt --> 2016-07-21T09:01:51.564Z
	User.find({ "updatedAt": { "$gt": '2016-07-21T09:01:51.564Z' } }, { _id: 0, password: 0, salt: 0, work: 0, __v: 0, "univ._id": 0 })
		.sort({ username: 1 })
		.skip(start * display)
		.limit(display).exec(function (err, users) {
			if (err) res.send(error);
			else res.send({
				error: false,
				message: ':univ all friends',
				result: users
			});
		});
});
function updateFriends(req, res, next) {
	var status = req.params.status;

	var user = req.user;
	var to = req.body.to;
	var msg = "";
	if (req.body.msg) {
		msg = req.body.msg;
	}
	var reqDate = req.body.reqDate;
	//	if (user) {
	//	} else {
	//		next(new Error({code : 500,message : 'do not login'}));
	//	}
	if (to === undefined || to === null || to === "") {
		res.send({ error: true, message: 'from or to userId is null', });
		return;
	}

	var info = { "from": user.userId, "to": to, "actionUser": user.userId, "status": status, "msg": msg };
	var friend = new Friend(info);

	var query = Friend.find();
	query.or([{ "from": user.userId, "to": to }, { "from": to, "to": user.userId }]);
	query.select({ __v: 0 });
	query.exec(function (err, docs) {
		if (err) {
			err.code = 500;
			next(err);
		}
		//		반대 케이스 처리는? showUserDetail에서 처리
		if (docs.length === 1) {
			if (status && status < 4) {
				docs[0].status = status;
				docs[0].updatedAt = Date.now();
				docs[0].actionUser = user.userId;
				docs[0].msg = msg;
			} else {
				res.send({ error: true, message: 'wrong status' });
				return;
			}
			docs[0].save(function (err, doc) {
				if (err) return next(err);
				//				//insertId 객체로 표시되는지 확인
				//				console.log("doc", doc );	//doc도 docs[0]과 같음
				//				console.log("docs[0]", docs[0] );

				//새로 만들어지고, status == 0일때 to에게 푸시를 보냄.
				// status == 1이 되면 message_id == 4, from에게 푸시를 보냄.
				if (parseInt(docs[0].status) === 1) {
					request({
						method: 'POST',
						uri: config.host + '/users/' + docs[0].from + '/message',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							reqDate: reqDate,
							user_id: docs[0].to,
							message: config.gcm.MSG_PUSH_CONFIRM,
							message_id: 4,	//id === 4 to님이 회원님의 친구신청을 수락했습니다.
							chat_room_id: -1000,	// -1000 == intent statusActivity
							pushType: config.gcm.PUSH_FLAG_NOTIFICATION,
							to: docs[0].from
						})
					}, function (error, resp, body) {
						if (error) { console.log("add Friends by update func push error", error); }
					});		//request					
				}//if

				res.send({
					error: false,
					message: 'friends status changed',
					result: docs[0]
				});
			});
		} else if (docs.length === 0) {
			//위에서 생성해둔 객체
			friend.save().then(function fulfilled(result) {
				//새로 만들어지고, status == 0일때 to에게 푸시를 보냄.
				// status == 1이 되면 message_id == 4, from에게 푸시를 보냄.
				if (parseInt(friend.status) === 0) {
					request({
						method: 'POST',
						uri: config.host + '/users/' + friend.to + '/message',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							reqDate: reqDate,
							user_id: friend.from,
							message: config.gcm.MSG_PUSH_RECEIVE,
							message_id: 5,	//id === 5 님의 친구신청이 도착했습니다.
							chat_room_id: -1000,	// -1000 == intent statusActivity
							pushType: config.gcm.PUSH_FLAG_NOTIFICATION,
							to: friend.to
						})
					}, function (error, resp, body) {
						if (error) { console.log("add Friends by update func push error", error); }
					});		//request					
				}//if
				res.send({
					error: false,
					message: 'add Friends by update func',
					result: result
				});
			}, function rejected(err) {
				//"E11000 duplicate key error collection: dongne.users index: email_1 dup key: { : \"adduser@gmail.com\" }"
				//case of {from-->to} or {to-->from} duplicate
				err.code = 500;
				next(err);
			});
		} else {
			res.send({ error: false, message: 'find error' });
			return;
		}

	});
}

function addFriends(req, res, next) {
	var user = req.user;	//session에 user가 저장되어 있는지
	var reqFriend = req.params.friend;
	var msg = "";
	if (req.body.msg) {
		msg = req.body.msg;
	}
	console.log('reqeusted friends', reqFriend);
	//    if( user ){
	//    	 
	//    } else {
	//    	var err={ code: 500, message: 'do not login'};
	//		next(err);
	//    }
	var info = { from: user.userId, to: reqFriend, actionUser: user.userId, msg: "" };
	var friend = new Friend(info);
	console.log('friend: ', friend);

	//3번이 0번한테 걸고나서( from:3, to:0, actionId:3, status:0 )
	//0번이 comfirm을 안하고 또 3번한테 친구추가를 하는 등의 예외 처리 후
	//friends 컬렉션에 추가. + 중복처리는 rejected에서
	var query = Friend.find();
	query.and([{ from: reqFriend }, { to: user.userId }]);//반대 case가 있는 경우
	query.select({ __v: 0 });
	query.exec(function (err, docs) {
		if (err) {
			next(err);
		}
		if (docs.length > 0) {
			res.send({
				error: false,
				message: 'already requests',
				result: docs[0].msg

			});
		} else {
			friend.save().then(function fulfilled(result) {
				console.log('result:', result);
				res.send({
					error: false,
					message: 'add Friends',
					result: result
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

var inArray = function (value) {
	// Returns true if the passed value is found in the array. Returns false if it is not.
	var i;
	for (i = 0; i < this.followers.length; i++) {
		console.log("this.followers[" + i + "]", this.followers[i]);
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
			User.find({ "univ.univId": univId }, { _id: 0, password: 0, salt: 0, work: 0, __v: 0, "univ._id": 0 })
				.sort({ username: 1 }).limit(30).exec(function (err, users) {
					if (err) callback(err, null);
					else callback(null, users);
				});
		},
		function (users, callback) {
			//find accepted friends and fetch isFriend
			var query = Friend.find();
			query.and([{ $or: [{ from: user.userId }, { to: user.userId }] }, { status: 1 }])
			query.select({ __v: 0, _id: 0 });
			//	    		query.sort({ userId: 1});
			query.exec().then(function fulfilled(results) {
				console.time('TIMER-ISFRIEND');
				var ids = [];
				var i, j;
				for (i = 0; i < results.length; i++) {
					if (results[i].from === user.userId) {
						ids.push(results[i].to);
					} else if (results[i].to === user.userId) {
						ids.push(results[i].from);
					}
				}
				for (i = 0; i < ids.length; i++) {
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
			var locObj = { lat: user.location.coordinates[1], lon: user.location.coordinates[0] }
			fetchDistance(locObj, users, function (err, list) {
				if (err) callback(err, null);
				else {
					callback(null, list);
				}
			});
		}],
		function (err, list) {
			if (err) { res.send({ error: true, message: err.message }); }
			else {
				console.timeEnd('TIMER');
				res.send({
					error: false,
					message: list.length + ':univ all friends',
					result: list
				});
			}
		});
}

function postUnivUsers(req, res, next) {
	var univId = req.params.univId;
	var start = parseInt(req.body.start);
	var display = parseInt(req.body.display);
	var reqDate = req.body.reqDate;

	var sort = req.body.sort;
	if (sort === "3") {
		require('../geoNear').locationsListByDistance(req, res);
		return;
	}
	var sortObj;
	switch (sort) {
		case "1":	//학번순 정렬(오름차순)
			sortObj = { "univ.enterYear": 1 };
			break;
		case "2":	//학번순 정렬(내림차순)
			sortObj = { "univ.enterYear": -1 };
			break;
		case "3":	//가까이 있는 동문
		//		break;
		case "0":	//기본 정렬
		default:
			sortObj = { "username": 1 };
			break;
	}

	var user = req.user;
	var total = 0;
	async.waterfall([
		function (callback) {
			//전체 대학교 유저리스트
			//	        	console.time('TIMER');	//실행시간 체크 스타트
			//	        	User.find({"univ.univId": univId, "updatedAt": {"$lte": reqDate}}, { _id: 0, password: 0, salt: 0, work: 0, __v: 0, "univ._id": 0 })
			//	        	console.time('TIMER-ne');
			User.find({ "userId": { "$ne": user.userId }, "univ.univId": univId }, { _id: 0, password: 0, salt: 0, work: 0, __v: 0, "univ._id": 0 })
				//	        	.sort({username: 1})
				.sort(sortObj)
				.skip(start * display)
				.limit(display).exec(function (err, users) {
					//	        		console.timeEnd('TIMER-ne');
					if (err) { return callback(err, null); }
					if (users.length === 0) {
						callback(new Error('HAS_NO_MORE_ITEMS'), null);
					} else {
						callback(null, users);
					}
				});
		},
		function (users, callback) {
			//	        	console.time('TIMER-COUNT');
			//count 쿼리에 위에서 전체 유저 쿼리 하듯이 
			//"userId": {"$ne": user.userId} <-- 이조건을 넣으면 기존 total-1 카운트를 찾을 수 있지만.
			//컨솔로 찍어보는 TIMER-COUNT가 3ms~5ms 나오던 것이 5~7ms 로 늘어남.
			//조건 추가한 것 때문에 근사한 차이를 보이는 듯함. 그래서 그냥 count-1 리턴 하기로.
			User.count({ "univ.univId": univId }, function (err, count) {
				if (err) callback(err, null);
				total = count - 1;
				//	        		console.log("total:", total);
				//	        		console.timeEnd('TIMER-COUNT');
				callback(null, users);
			});
		},
		function (users, callback) {
			//find accepted friends and fetch isFriend
			var query = Friend.find();
			query.or([{ from: user.userId }, { to: user.userId }])
			query.select({ __v: 0, _id: 0 });
			query.exec().then(function fulfilled(results) {
				//	    			console.time('TIMER-ISFRIEND');
				var ids = [];
				var status = [];
				var i, j;
				for (i = 0; i < results.length; i++) {
					if (results[i].from === user.userId) {
						ids.push(results[i].to);
						status.push(results[i].status);
					} else if (results[i].to === user.userId) {
						ids.push(results[i].from);
						status.push(results[i].status);
					}
				}
				for (i = 0; i < ids.length; i++) {
					for (j = 0; j < users.length; j++) {
						if (users[j].userId === ids[i]) {
							users[j].isFriend = true;
							users[j].status = status[i];
							break;
						}
					}
				}
				//	    			console.timeEnd('TIMER-ISFRIEND');
				callback(null, users);
			}, function rejected(err) {
				callback(err, null);
			});
		},
		function (users, callback) {
			var locObj = { lat: user.location.coordinates[1], lon: user.location.coordinates[0] }
			fetchDistance(locObj, users, function (err, list) {
				if (err) callback(err, null);
				else {
					callback(null, list);
				}
			});
		}],
		function (err, list) {
			var msg = '';
			if (err) {
				if (err.message === 'HAS_NO_MORE_ITEMS') {
					msg = err.message;	//return은 하지 않고 메세지만 바꿈..
					list = [];
				} else {
					return res.send({ error: true, message: err.message });
				}
			}
			User.find({ userId: user.userId }, { _id: 0, password: 0, salt: 0, work: 0, __v: 0, "univ._id": 0 }, function (err, users) {
				//						console.timeEnd('TIMER');
				if (err) { res.send({ error: true, message: err.message }); }
				else {
					if (list.length > 0) msg = 'current list length: ' + list.length;
					res.send({
						error: false,
						total: total,
						message: msg,
						result: list,
						user: users[0]
					});
				}
			});

		});
}

function postMyFriends(req, res, next) {
	var univId = req.params.univId;
	var start = parseInt(req.body.start);
	var display = parseInt(req.body.display);
	var reqDate = req.body.reqDate;

	var sort = req.body.sort;
	var sortObj;
	switch (sort) {
		case "1":	//학번순 정렬(오름차순)
			sortObj = { "univ.enterYear": 1 };
			break;
		case "2":	//학번순 정렬(내림차순)
			sortObj = { "univ.enterYear": -1 };
			break;
		case "3":	//가까이 있는 동문
		//		break;
		case "0":	//기본 정렬
		default:
			sortObj = { "username": 1 };
			break;
	}
	// console.log("SortObj", sortObj);
	// console.log("reqBody", req.body);
	var user = req.user;
	var total = 0;
	var target_user_id;
	if (req.body.userId) {
		target_user_id = parseInt(req.body.userId);
	} else {
		target_user_id = user.userId;
	}
	var sameCnt = 0;	//함께아는 친구 카운트. start === 0일때만
	//==================
	async.waterfall([function (callback) {
		console.time('postMyFriends');
		var query = Friend.count();
		query.and([{ $or: [{ from: target_user_id }, { to: target_user_id }] }, { status: 1 }]);
		query.exec(function (err, count) {
			if (err) callback(err, null);
			if (count === 0) {
				// console.log(""+target_user_id+"'s postMyFriends_count_zero");
				return callback(new Error('postMyFriends_count_zero'), null);
			}
			callback(null, count);
		});
	}, function (count, callback) {
		//여기에 count === 0 일때 error: false 지만 리스트.length === 0 이기때문에 따로 처리해주는 코드 추가
		var query = Friend.find();
		query.and([{ $or: [{ from: target_user_id }, { to: target_user_id }] }, { status: 1 }]);
		query.select({ __v: 0, _id: 0 });
		// query.skip(start * display);
		// query.limit(display);
		query.exec().then(function fulfilled(results) {
			var ids = [];	//타겟유저 친구리스트
			for (i = 0; i < results.length; i++) {
				if (results[i].from === target_user_id) {
					ids.push(results[i].to);
				} else if (results[i].to === target_user_id) {
					ids.push(results[i].from);
				}
			}
			User.find({ "userId": { $in: ids } }, { _id: 0, password: 0, salt: 0, work: 0, __v: 0, "univ._id": 0 })
				.sort(sortObj)
				.skip(start * display)
				.limit(display)
				.exec(function (err, users) {
					//users === target_user_id와 친구인. 리스트
					//이제 나랑 친구인 유저를 구분
					callback(null, count, users);
				});
		}, function rejected(err) {
			err.code = 500;
			callback(err, null, null);
		});
	}, function (count, users, callback) {
		//내친구 리스트 찾기.
		var query = Friend.find();
		//		query.and([ {$or:[{from: user.userId}, {to: user.userId}]}, {status: 1} ]);
		query.or([{ from: user.userId }, { to: user.userId }]);	//status조건을 넣지 않는건 나한텐 친구가 아닐수도 있고, 블락 등 상태가 다를 수 도 있기 때문에
		query.select({ __v: 0, _id: 0 });
		query.exec().then(function fulfilled(results) {
			var ids = [];
			var status = [];
			var i, j;
			//results == 나랑 관계가 생성된 리스트
			for (i = 0; i < results.length; i++) {
				if (results[i].from === user.userId) {
					ids.push(results[i].to);
					status.push(results[i].status);
				} else if (results[i].to === user.userId) {
					ids.push(results[i].from);
					status.push(results[i].status);
				}
			}
			//ids == results에서 추출한 내 친구 리스트
			//users에서 ids에 있는 아이디와 같은 user들은 내친구가 됨
			for (i = 0; i < ids.length; i++) {
				for (j = 0; j < users.length; j++) {
					if (users[j].userId === ids[i]) {
						users[j].isFriend = true;
						users[j].status = status[i];
						break;
					}
				}
			}
			callback(null, count, users);
		}, function rejected(err) {
			callback(err, null, null);
		});
	}, function (count, users, callback) {
		//함께아는 친구 카운팅...
		if (start === 0) {
			console.time('T1');
			sameCnt = 0;
			var query = Friend.find();
			query.and([{ $or: [{ from: user.userId }, { to: user.userId }] }, { status: 1 }]);
			query.select({ __v: 0, _id: 0 });
			query.exec().then(function fulfilled(mDocs) {
				if (mDocs.length !== 0) {
					var query = Friend.find();
					query.and([{ $or: [{ from: target_user_id }, { to: target_user_id }] }, { status: 1 }]);
					query.select({ __v: 0, _id: 0 });
					query.exec().then(function fulfilled(tDocs) {
						var i, j;
						var mIds = [];
						if (tDocs.length !== 0) {
							for (i = 0; i < mDocs.length; i++) {
								if (mDocs[i].from === user.userId) {
									mIds.push(mDocs[i].to);
								} else if (mDocs[i].to === user.userId) {
									mIds.push(mDocs[i].from);
								}
							}
							var tIds = [];
							for (i = 0; i < tDocs.length; i++) {
								if (tDocs[i].from === target_user_id) {
									tIds.push(tDocs[i].to);
								} else if (tDocs[i].to === target_user_id) {
									tIds.push(tDocs[i].from);
								}
							}
							//맥시멈 타겟친구 갯수만큼만 루프를 돌면 되니까
							for (i = 0; i < tIds.length; i++) {
								for (j = 0; j < mIds.length; j++) {
									if (tIds[i] === mIds[j]) {
										sameCnt++;
										break;
									}
								}
							}
							//							console.log("tIds:", tIds);
							//							console.log("mIds:", mIds);
							//							console.log("sameCnt: ", sameCnt);
							console.timeEnd('T1');
							callback(null, count, users, sameCnt);
						} else {
							callback(null, count, users, sameCnt);	//타겟유저의 친구리스트가 없는경우 0으로 초기화된 sameCnt 리턴
						}
					});
				} else {
					callback(null, count, users, sameCnt); //내 친구가 없는 경우 0으로 초기화된 sameCnt리턴		
				}
			});
		} else {
			callback(null, count, users, sameCnt);
		}
	}], function (err, count, users, sameCnt) {
		if (err) { return res.send({ error: true, message: err.message }); }

		User.find({ userId: target_user_id }, { _id: 0, password: 0, salt: 0, work: 0, __v: 0, "univ._id": 0 }, function (err, mUser) {
			if (err) { return res.send({ error: true, message: err.message }); }
			if (!mUser || mUser.length === 0) { return res.send({ error: true, message: 'target_user_find_error' }); }
			if (users.length !== 0) {
				var locObj = { lat: user.location.coordinates[1], lon: user.location.coordinates[0] };
				// var locObj = { lat: mUser[0].location.coordinates[1], lon: mUser[0].location.coordinates[0] };
				fetchDistance(locObj, users, function (err, list) {
					if (err) { return next(err); }
					console.timeEnd('postMyFriends');
					res.send({
						error: false,
						message: 'accepted friends ' + users.length,
						total: count,
						sameCnt: sameCnt,
						result: list,
						user: mUser[0]
					});
				});
			} else {
				res.send({
					error: false,
					message: 'has no more accepted friends',
					user: user[0]
				});
			}
		});
	});
}

function getMyAllFriendsList(req, res, next) {
	var user = req.user;
	//==================
	async.waterfall([function (callback) {
		var query = Friend.find();
		query.and([{ $or: [{ from: user.userId }, { to: user.userId }] }, { status: 1 }]);
		query.select({ __v: 0, _id: 0 });
		query.exec().then(function fulfilled(results) {
			var ids = [];
			var status = [];
			var i, j;
			//results == 나랑 status가 1인 생성된 리스트
			for (i = 0; i < results.length; i++) {
				if (results[i].from === user.userId) {
					ids.push(results[i].to);
				} else if (results[i].to === user.userId) {
					ids.push(results[i].from);
				}
			}
			callback(null, ids);
		}, function rejected(err) {
			callback(err, null);
		});
	}], function (err, ids) {
		if (err) { return res.send({ error: true, message: err.message }); }
		User.find({ userId: { "$in": ids } }, { _id: 0, password: 0, salt: 0, work: 0, __v: 0, "univ._id": 0 }, function (err, users) {
			if (err) { return res.send({ error: true, message: err.message }); }
			if (!users || users.length === 0) { return res.send({ error: true, message: 'ids_find_error' }); }
			if (users.length !== 0) {
				console.timeEnd('postAllMyFriends');
				res.send({
					error: false,
					message: 'accepted all friends ' + users.length,
					total: users.length,
					result: users
				});
			} else {
				res.send({
					error: false,
					message: 'has no more accepted friends'
				});
			}
		});
	});
}


function postSearchUnivUsers(req, res, next) {
	var univId = req.params.univId;
	var start = parseInt(req.body.start);
	var display = parseInt(req.body.display);
	var reqDate = req.body.reqDate;

	var sort = req.body.sort;
	var sortObj;
	switch (sort) {
		case "1":	//학번순 정렬(오름차순)
			sortObj = { "univ.enterYear": 1 };
			break;
		case "2":	//학번순 정렬(내림차순)
			sortObj = { "univ.enterYear": -1 };
			break;
		case "3":	//가까이 있는 동문
		//		break;
		case "0":	//기본 정렬
		default:
			sortObj = { "username": 1 };
			break;
	}
	console.log("sortObj", sortObj);
	var user = req.user;
	console.log("/friends/univ/:univId/search", req.body);

	console.log("start*display", start * display);
	var total = 0;
	async.waterfall([
		function (callback) {
			//검색조건에 만족하는 유저리스트
			console.time('TIMER');	//실행시간 체크 스타트
			console.time('TIMER-ne');
			//	                query.where('username').regex(new RegExp("\/"+req.query.username+"\/"));	//regexp에 대해 찾아볼 것, 인덱스랑 표현법 등등
			var query = User.find({ "userId": { "$ne": user.userId }, "univ.univId": univId });
			if (req.body.username) {
				query.where('username').regex(new RegExp(req.body.username, 'i'));
			}
			if (req.body.enterYear) {
				query.where('univ.enterYear', req.body.enterYear);	//number는 RegExp사용 못함
			}
			if (req.body.deptname) {
				query.where('univ.deptname').regex(new RegExp(req.body.deptname, 'i'));
			}
			// if (req.body.job){query.or([{ "job.name": { "$regex": new RegExp(req.body.job, 'i') } }, { "job.team": { "$regex": new RegExp(req.body.job, 'i') } }]);}
			if (req.body.jobname) {
				query.where('job.name').regex(new RegExp(req.body.jobname, 'i'));
			}
			if (req.body.jobteam) {
				query.where('job.team').regex(new RegExp(req.body.jobteam, 'i'));
			}
			query.select({ _id: 0, password: 0, salt: 0, work: 0, __v: 0, "univ._id": 0 });
			query.sort(sortObj);
			query.skip(start * display);
			query.limit(display);
			query.exec(function (err, users) {
				console.timeEnd('TIMER-ne');
				if (err) callback(err, null);
				else callback(null, users);
			});
		},
		function (users, callback) {
			console.time('TIMER-COUNT');
			var query = User.count({ "userId": { "$ne": user.userId }, "univ.univId": univId });
			if (req.body.username) {
				query.where('username').regex(new RegExp(req.body.username, 'i'));
			}
			if (req.body.enterYear) {
				query.where('univ.enterYear', req.body.enterYear);	//number는 RegExp사용 못함
			}
			if (req.body.deptname) {
				query.where('univ.deptname').regex(new RegExp(req.body.deptname, 'i'));
			}
			// if (req.body.job) {
			// 	query.or([{ "job.name": { "$regex": new RegExp(req.body.job, 'i') } },
			// 	{ "job.team": { "$regex": new RegExp(req.body.job, 'i') } }]);
			// }
			if (req.body.jobname) {
				query.where('job.name').regex(new RegExp(req.body.jobname, 'i'));
			}
			if (req.body.jobteam) {
				query.where('job.team').regex(new RegExp(req.body.jobteam, 'i'));
			}
			query.exec(function (err, count) {
				if (err) callback(err, null);
				total = count;
				console.log("total:", total);
				console.timeEnd('TIMER-COUNT');
				callback(null, users);
			});
		},
		function (users, callback) {
			//find accepted friends and fetch isFriend
			var query = Friend.find();
			//	    		query.and([ {$or:[{from: user.userId}, {to: user.userId}]}, {status: 1} ])
			query.or([{ from: user.userId }, { to: user.userId }])
			//	    		query.and([ {$or:[{from: user.userId}, {to: user.userId}]}, {status: {"$lt":3} } ])
			query.select({ __v: 0, _id: 0 });
			query.exec().then(function fulfilled(results) {
				console.time('TIMER-ISFRIEND');
				var ids = [];
				var status = [];
				var i, j;
				for (i = 0; i < results.length; i++) {
					if (results[i].from === user.userId) {
						ids.push(results[i].to);
						status.push(results[i].status);
					} else if (results[i].to === user.userId) {
						ids.push(results[i].from);
						status.push(results[i].status);
					}
				}
				for (i = 0; i < ids.length; i++) {
					for (j = 0; j < users.length; j++) {
						if (users[j].userId === ids[i]) {
							users[j].isFriend = true;
							users[j].status = status[i];
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
			var locObj = { lat: user.location.coordinates[1], lon: user.location.coordinates[0] }
			fetchDistance(locObj, users, function (err, list) {
				if (err) callback(err, null);
				else {
					callback(null, list);
				}
			});
		}],
		function (err, list) {
			if (err) { res.send({ error: true, message: err.message }); }
			else {
				User.find({ userId: user.userId }, { _id: 0, password: 0, salt: 0, work: 0, __v: 0, "univ._id": 0 }, function (err, users) {
					console.timeEnd('TIMER');
					if (err) { res.send({ error: true, message: err.message }); }
					if (!list || list.length === 0) {
						return res.send({ error: false, total: total, message: 'has no more friends', user: users[0] });
					}
					if (list.length !== 0) {
						res.send({
							error: false,
							total: total,
							message: 'univ search list:' + list.length,
							result: list,
							user: users[0]
						});
					}
				});
			} //else
		});
}

function postSearchMyFriends(req, res, next) {
	var univId = req.params.univId;
	var start = parseInt(req.body.start);
	var display = parseInt(req.body.display);
	var reqDate = req.body.reqDate;

	var sort = req.body.sort;
	var sortObj;
	switch (sort) {
		case "1":	//학번순 정렬(오름차순)
			sortObj = { "univ.enterYear": 1 };
			break;
		case "2":	//학번순 정렬(내림차순)
			sortObj = { "univ.enterYear": -1 };
			break;
		case "3":	//가까이 있는 동문
		//		break;
		case "0":	//기본 정렬
		default:
			sortObj = { "username": 1 };
			break;
	}
	console.log("sortObj", sortObj);
	console.log("/friends/univ/:univId/my/search", req.body);
	var user = req.user;

	var total = 0;
	async.waterfall([
		function (callback) {
			//find accepted friends and fetch isFriend
			var query = Friend.find();
			query.and([{ $or: [{ from: user.userId }, { to: user.userId }] }, { status: 1 }]);
			query.select({ __v: 0, _id: 0 });
			query.exec().then(function fulfilled(results) {
				console.time('TIMER');
				console.time('TIMER_FIND_FRIEND');
				var ids = [];
				// var status = [];
				var i, j;
				total = 0;
				if (!results || results.length === 0) {
					console.log("postMyFriends_count_zero ", results.length);
					return callback(new Error('MyFriendsSearch_count_zero'), null);
				}
				for (i = 0; i < results.length; i++) {
					if (results[i].from === user.userId) {
						ids.push(results[i].to);
					} else if (results[i].to === user.userId) {
						ids.push(results[i].from);
					}
				}
				total = ids.length;
				console.timeEnd('TIMER_FIND_FRIEND');
				callback(null, ids);
			}, function rejected(err) {
				callback(err, null);
			});
		}, function (ids, callback) {
			var query = User.find({ "userId": { $in: ids } });
			if (req.body.username) {
				query.where('username').regex(new RegExp(req.body.username, 'i'));
			}
			if (req.body.enterYear) {
				query.where('univ.enterYear', req.body.enterYear);	//number는 RegExp사용 못함
			}
			if (req.body.deptname) {
				query.where('univ.deptname').regex(new RegExp(req.body.deptname, 'i'));
			}
			// if (req.body.job) {
			// 	query.or([{ "job.name": { "$regex": new RegExp(req.body.job, 'i') } }, { "job.team": { "$regex": new RegExp(req.body.job, 'i') } }]);
			// }
			if (req.body.jobname) {
				query.where('job.name').regex(new RegExp(req.body.jobname, 'i'));
			}
			if (req.body.jobteam) {
				query.where('job.team').regex(new RegExp(req.body.jobteam, 'i'));
			}
			query.select({ _id: 0, password: 0, salt: 0, work: 0, __v: 0, "univ._id": 0 });
			query.sort(sortObj);
			query.skip(start * display);
			query.limit(display);
			query.exec(function (err, users) {
				// var i=0;
				// if(users && users.length > 0){ }
				for (i = 0; i < users.length; i++) {
					users[i].status = 1;	//찾은 애들은 모두 status === 1
				}
				// console.log("find users", users);
				callback(null, users);
				// err 발생시킬 필요없이 빈 배열 리턴
				// else {
				// 	callback(new Error('MyFriendsSearch_count_zero_case 2'), null);
				// }
			});
		}, function (users, callback) {
			var locObj = { lat: user.location.coordinates[1], lon: user.location.coordinates[0] }
			fetchDistance(locObj, users, function (err, list) {
				if (err) callback(err, null);
				else {
					callback(null, list);
				}
			});
		}],
		function (err, list) {
			if (err) { res.send({ error: true, message: err.message }); }
			else {
				User.find({ userId: user.userId }, { _id: 0, password: 0, salt: 0, work: 0, __v: 0, "univ._id": 0 }, function (err, users) {
					console.timeEnd('TIMER');
					if (err) { res.send({ error: true, message: err.message }); }
					if (!list || list.length === 0) {
						return res.send({ error: false, total: total, message: 'has no more friends', user: users[0] });
					}
					console.log("total", total);
					if (list.length !== 0) {
						res.send({
							error: false,
							total: total,
							message: 'univ search list:' + list.length,
							result: list,
							user: users[0]
						});
					}

				});
			} //else
		});
}



function showFriends(req, res, next) {

	//	status
	//	0 pending .and({from:3, status:0})	//요청한
	//	00 pending .and({to:3, status:0})	//요청받은
	//	1 accepted .and([ {$or:[{from: 3},{to: 3}]}, {status:1} ])	//일촌상태
	//	2 declined .and({from:3, status:2})	//거절한
	//	3 blocked .and({from:3, status:3})	//차단한
	var status = req.params.status;
	var user = req.user;

	switch (status) {
		case "0":
			var query = Friend.find();
			query.and({ from: user.userId, status: 0 });
			query.select({ __v: 0, _id: 0 });
			query.sort({ updatedAt: -1 });
			query.exec().then(function fulfilled(results) {
				var i = 0;
				var ids = [];
				for (i = 0; i < results.length; i++) {
					if (results[i].from === undefined || results[i].to === undefined) {
						continue;
					}
					if (results[i].from === user.userId) {
						ids.push(results[i].to);
					} else if (results[i].to === user.userId) {
						ids.push(results[i].from);
					}
				}
				User.find({ "userId": { $in: ids } },
					{ _id: 0, password: 0, salt: 0, work: 0, __v: 0, "univ._id": 0 },
					//					{ sort: {"updatedAt": -1}}, 
					function (err, users) {
						if (users.length !== 0) {
							for (i = 0; i < users.length; i++) {
								users[i].status = 0;	//00이지만 어차피나오는 건 0
							}
							var locObj = { lat: user.location.coordinates[1], lon: user.location.coordinates[0] }
							fetchDistance(locObj, users, function (err, list) {
								if (err) { return next(err); }
								//						console.log(list);
								res.send({
									error: false,
									message: 'pending-0 friends: ' + users.length,
									result: list
								});
							});
						} else {
							res.send({
								error: true,
								message: 'has no pending-0 friends',
							});
						}
					});
			}, function rejected(err) {
				err.code = 500;
				next(err);
			});
			break;
		case "00":
			console.time('TIMER-status');	//실행시간 체크 스타트
			var query = Friend.find();
			query.and({ to: user.userId, status: 0 });
			query.select({ __v: 0, _id: 0 });
			query.sort({ updatedAt: -1 });
			query.exec().then(function fulfilled(results) {
				var i = 0;
				var ids = [];
				//			console.log(results);
				for (i = 0; i < results.length; i++) {
					if (results[i].from === undefined || results[i].to === undefined) {
						continue;
					}
					if (results[i].from === user.userId) {
						ids.push(results[i].to);
					} else if (results[i].to === user.userId) {
						ids.push(results[i].from);
					}
				}
				User.find({ "userId": { $in: ids } },
					{ _id: 0, password: 0, salt: 0, work: 0, __v: 0, "univ._id": 0 },
					//					{ sort: {"updatedAt": -1}}, 
					function (err, users) {
						if (users.length !== 0) {
							for (i = 0; i < users.length; i++) {
								users[i].status = 0;	//00이지만 어차피나오는 건 0
							}
							var locObj = { lat: user.location.coordinates[1], lon: user.location.coordinates[0] }
							fetchDistance(locObj, users, function (err, list) {
								if (err) { return next(err); }
								//						console.log(list);
								res.send({
									error: false,
									message: 'pending-00 friends: ' + users.length,
									result: list
								});
								console.timeEnd('TIMER-status');	//실행시간 체크 스타트
							});
						} else {
							res.send({
								error: true,
								message: 'has no pending-00 friends',
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
			query.and([{ $or: [{ from: user.userId }, { to: user.userId }] }, { status: 1 }]);
			//		query.where('userId').in( friends );
			//	 	query.limit(10);
			query.select({ __v: 0, _id: 0 });
			//		query.sort({ username: 1});
			query.exec().then(function fulfilled(results) {
				var i = 0;
				var ids = [];
				var total = 0;
				for (i = 0; i < results.length; i++) {
					if (results[i].from === user.userId) {
						ids.push(results[i].to);
					} else if (results[i].to === user.userId) {
						ids.push(results[i].from);
					}
				}
				User.find({ "userId": { $in: ids } }, { _id: 0, password: 0, salt: 0, work: 0, __v: 0, "univ._id": 0 }, function (err, users) {
					if (users.length !== 0) {
						for (i = 0; i < users.length; i++) {
							users[i].isFriend = true;
							users[i].status = 1;
						}
						//					fetchDistance(user.location, users, function(err, list){
						//						if(err) {return next(err);}
						//						res.send({
						//							error : false,
						//							message:'accepted friends ' + users.length,
						//							total: users.length,
						//							result : list
						//						});						
						//					});
						res.send({
							error: false,
							message: 'accepted friends ' + users.length,
							total: users.length,
							result: users
						});
					} else {
						res.send({
							error: true,
							message: 'has no accepted friends',
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
			var i = 0;
			var ids = [];
			var query = Friend.find();
			query.and([{ $or: [{ from: user.userId }, { to: user.userId }] }, { actionUser: user.userId }, { status: 2 }])
			//		var query = Friend.find({$or:[{"from": user.userId, "status": 2, "actionUser": user.userId}, {"to": user.userId, "status": 2, "actionUser": user.userId}]});
			//		query.and({from: user.userId, status:2})
			query.select({ __v: 0, _id: 0 });
			query.exec().then(function fulfilled(results) {
				for (i = 0; i < results.length; i++) {
					if (results[i].from === user.userId) {
						ids.push(results[i].to);
					} else if (results[i].to === user.userId) {
						ids.push(results[i].from);
					}
				}
				User.find({ "userId": { $in: ids } }, function (err, users) {
					if (users.length != 0) {
						res.send({
							error: false,
							message: 'declined friends',
							result: users
						});
					} else {
						res.send({
							error: true,
							message: 'has no declined friends',
						});
					}
				});
			}, function rejected(err) {
				err.code = 500;
				next(err);
			});
			break;
		case "3":
			console.time('TIMER-status');	//실행시간 체크 스타트
			var query = Friend.find();
			query.and([{ $or: [{ from: user.userId }, { to: user.userId }] }, { actionUser: user.userId }, { status: 3 }])
			// query.and([{ from: user.userId }, { actionUser: user.userId }, { status: 3 }])
			query.select({ __v: 0, _id: 0 });
			query.sort({ updatedAt: -1 });
			query.exec().then(function fulfilled(results) {
				var i = 0;
				var ids = [];
				for (i = 0; i < results.length; i++) {
					if (results[i].from === undefined || results[i].to === undefined) {
						continue;
					}
					if (results[i].from === user.userId) {
						ids.push(results[i].to);
					} else if (results[i].to === user.userId) {
						ids.push(results[i].from);
					}
				}
				console.log("case 3", ids);
				User.find({ "userId": { $in: ids } },
					{ _id: 0, password: 0, salt: 0, work: 0, __v: 0, "univ._id": 0 },
					//					{ sort: {"updatedAt": -1}}, 
					function (err, users) {
						if (users.length !== 0) {
							for (i = 0; i < users.length; i++) {
								users[i].status = 3;	//blocked === 3
							}
							var locObj = { lat: user.location.coordinates[1], lon: user.location.coordinates[0] }
							fetchDistance(locObj, users, function (err, list) {
								if (err) { return next(err); }
								//						console.log(list);
								res.send({
									error: false,
									message: 'blocked-3 friends: ' + users.length,
									result: list
								});
								console.timeEnd('TIMER-status');	//실행시간 체크 스타트
							});
						} else {
							res.send({
								error: true,
								message: 'has no blocked-3 friends',
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

function showFriendsList(req, res, next) {	//수정전. friends collection들의 값 불 러옴

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

	switch (status) {
		case "0":
			var query = Friend.find();
			query.and({ from: user.userId, status: 0 });
			query.select({ __v: 0, _id: 0 });
			query.exec(function (err, docs) {
				if (err) {
					err.code = 500;
					next(err);
				}
				if (docs.length != 0) {
					res.send({
						success: 1,
						msg: 'pending-0 friends',
						result: docs
					});
				} else {
					res.send({
						success: 0,
						msg: 'has no pending-0 friends',
						result: []
					});
				}

			});
			break;
		case "00":
			var query = Friend.find();
			query.and({ to: user.userId, status: 0 });
			query.select({ __v: 0, _id: 0 });
			query.exec(function (err, docs) {
				if (err) {
					err.code = 500;
					next(err);
				}
				if (docs.length != 0) {
					res.send({
						success: 1,
						msg: 'pending-00 friends',
						result: docs
					});
				} else {
					res.send({
						success: 0,
						msg: 'has no pending-00 friends',
						result: []
					});
				}

			});
			break;
		case "1":
			var query = Friend.find();
			//	 	query.mod('size',2,0);
			//	 	query.where('friends').gt(6);
			//		query.or([{from: 3},{to: 3}]);
			query.and([{ $or: [{ from: user.userId }, { to: user.userId }] }, { status: 1 }])
			//		query.where('userId').in( friends );
			//	 	query.limit(10);
			query.select({ _id: 0, from: 1, to: 1, status: 1, actionUser: 1, updatedAt: 1 });
			//		query.sort({ userId: 1});
			query.exec(function (err, docs) {
				if (err) {
					//				err.code = 500;
					next(err);
				}
				if (docs.length != 0) {
					res.send({
						success: 1,
						msg: 'accepted friends',
						result: docs
					});
				} else {
					res.send({
						success: 0,
						msg: 'has no accepted friends',
						result: []
					});
				}
			});
			break;
		case "2":
			var query = Friend.find();
			query.and({ from: user.userId, status: 2 })
			query.select({ __v: 0, _id: 0 });
			query.exec(function (err, docs) {
				if (err) {
					err.code = 500;
					next(err);
				}
				if (docs.length != 0) {
					res.send({
						success: 1,
						msg: 'declined friends',
						result: docs
					});
				} else {
					res.send({
						success: 0,
						msg: 'has no declined friends',
						result: []
					});
				}

			});
			break;
		case "3":
			var query = Friend.find();
			query.and({ from: user.userId, status: 3 })
			query.select({ __v: 0, _id: 0 });
			query.exec(function (err, docs) {
				if (err) {
					err.code = 500;
					next(err);
				}
				if (docs.length != 0) {
					res.send({
						success: 1,
						msg: 'blocked friends',
						result: docs
					});
				} else {
					res.send({
						success: 0,
						msg: 'has no blocked friends',
						result: []
					});
				}
			});
			break;
		default:
			break;
	} //sw

}

function fetchDistance(refPoint, users, cb) {

	var defaultValue = config.geoNear.defaultMsg;
	var list = [];
	var i, sum = 0;
	if (refPoint.lat === 0 || refPoint.lon === 0 || refPoint.lat === undefined || refPoint.lon === undefined) {
		for (i = 0; i < users.length; i++) {
			users[i].temp = defaultValue;
			list.push(users[i]);
		}
	} else {
		for (i = 0; i < users.length; i++) {
			if (users[i].location.coordinates[1] === 0 || users[i].location.coordinates[0] === 0 || users[i].location.coordinates[1] === undefined || users[i].location.coordinates[0] === undefined) {
				users[i].temp = defaultValue;
			} else {
				//0인덱스가 lng
				users[i].temp = gpsProvider.getDistance(refPoint.lat, refPoint.lon, users[i].location.coordinates[1], users[i].location.coordinates[0]);
			}
			list.push(users[i]);
		}
	}
	return cb(null, list);
}

module.exports = router;
